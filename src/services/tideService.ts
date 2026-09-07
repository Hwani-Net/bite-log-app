import { localISODate, parseLocalISODate } from "@/lib/localDate";
import { haversineKm } from "@/lib/portDistance";
import { apiFetch } from "@/lib/apiClient";

export interface TideInfo {
  type: "High" | "Low";
  time: string; // HH:mm
  level: number; // cm
}

// Current tidal phase info (들물/썰물 몇 물)
export interface TidePhase {
  direction: "incoming" | "outgoing"; // 들물 / 썰물
  phase: number; // 1~6 (몇 물)
  label: string; // e.g. "들물 3물"
  strength: "slack" | "weak" | "moderate" | "strong" | "peak"; // 유속 강도
  strengthLabel: string; // e.g. "유속 강"
  percent: number; // 0~100 progress between prev→next tide event
}

export interface TideData {
  stationName: string;
  tides: TideInfo[];
  currentPhase?: TidePhase; // calculated client-side
  // @mock-data — KHOA 키 부재·요청 실패 시 시간 형태만 흉내낸 가짜가
  // 4개 경로에서 반환된다. 이 플래그가 true면 UI는 "예시"를 표시하고
  // 기록 저장은 물때를 저장하지 않아야 한다(가짜가 통계·조건표를
  // 오염시키지 않게 — 4차 GOAL-5에서 무표시 반환을 정직화).
  mocked?: boolean;
}

export interface TideStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

// Codes, names and coordinates verified against KHOA responses on 2026-09-07.
// https://www.data.go.kr/data/15156018/openapi.do
export const TIDE_STATIONS: TideStation[] = [
  { code: "DT_0001", name: "인천", lat: 37.45194, lng: 126.59222 },
  { code: "DT_0002", name: "평택", lat: 36.96694, lng: 126.82277 },
  { code: "DT_0018", name: "군산", lat: 35.97555, lng: 126.56305 },
  { code: "DT_0025", name: "보령", lat: 36.40638, lng: 126.48611 },
  { code: "DT_0003", name: "영광", lat: 35.42611, lng: 126.42055 },
  { code: "DT_0014", name: "통영", lat: 34.82777, lng: 128.43472 },
  { code: "DT_0027", name: "완도", lat: 34.31555, lng: 126.75972 },
  { code: "DT_0029", name: "거제도", lat: 34.80138, lng: 128.69916 },
  { code: "DT_0031", name: "거문도", lat: 34.02833, lng: 127.30888 },
  { code: "DT_0005", name: "부산", lat: 35.09638, lng: 129.03527 },
  { code: "DT_0020", name: "울산", lat: 35.50194, lng: 129.38722 },
  { code: "DT_0011", name: "후포", lat: 36.6775, lng: 129.45305 },
  { code: "DT_0006", name: "묵호", lat: 37.55027, lng: 129.11638 },
  { code: "DT_0012", name: "속초", lat: 38.20722, lng: 128.59416 },
  { code: "DT_0013", name: "울릉도", lat: 37.49138, lng: 130.91361 },
  { code: "DT_0004", name: "제주", lat: 33.5275, lng: 126.54305 },
];

export function findNearestStation(lat: number, lng: number): TideStation {
  return TIDE_STATIONS.reduce((nearest, station) =>
    haversineKm(lat, lng, station.lat, station.lng) < haversineKm(lat, lng, nearest.lat, nearest.lng)
      ? station : nearest,
  );
}

// @mock-data — 실측이 아니라 현재 시각 기반으로 지어낸 물때. mocked
// 플래그로 소비자가 구분한다.
function getMockTideData(stationName: string): TideData {
  // Generate time-aware mock data based on current time
  const now = new Date();
  const hour = now.getHours();
  const baseHigh = (hour + 6) % 24;

  return {
    stationName: `${stationName} (예측)`,
    tides: (
      [
        {
          type: "High" as const,
          time: `${String(baseHigh).padStart(2, "0")}:30`,
          level: 245 + Math.floor(Math.random() * 30),
        },
        {
          type: "Low" as const,
          time: `${String((baseHigh + 6) % 24).padStart(2, "0")}:15`,
          level: 65 + Math.floor(Math.random() * 25),
        },
        {
          type: "High" as const,
          time: `${String((baseHigh + 12) % 24).padStart(2, "0")}:45`,
          level: 260 + Math.floor(Math.random() * 25),
        },
        {
          type: "Low" as const,
          time: `${String((baseHigh + 18) % 24).padStart(2, "0")}:00`,
          level: 70 + Math.floor(Math.random() * 20),
        },
      ] as TideInfo[]
    ).sort((a, b) => a.time.localeCompare(b.time)),
    mocked: true,
  };
}

/** Parse only complete, same-date observations. Missing heights are not zero. */
export function parseTideResponse(data: unknown, date: string): TideData | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const root = (payload.response ?? payload.getTideFcstHghLw ?? payload) as {
    header?: { resultCode?: string };
    body?: { items?: { item?: unknown } };
  };
  if (root.header?.resultCode && !["00", "0000"].includes(root.header.resultCode)) return null;
  const raw = root.body?.items?.item;
  const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  if (!/^\d{8}$/.test(date) || !parseLocalISODate(iso)) return null;
  let stationName = "";
  const tides: TideInfo[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const { predcDt, predcTdlvVl, extrSe, obsvtrNm } = item;
    const code = Number(extrSe);
    const time = typeof predcDt === "string" ? predcDt.slice(11, 16) : "";
    if (typeof predcDt !== "string" || !predcDt.startsWith(iso + " ") ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
        typeof predcTdlvVl !== "number" || !Number.isFinite(predcTdlvVl) ||
        ![1, 2, 3, 4].includes(code) || typeof obsvtrNm !== "string" || !obsvtrNm.trim()) return null;
    if (stationName && stationName !== obsvtrNm) return null;
    stationName = obsvtrNm;
    tides.push({ type: code === 1 || code === 3 ? "High" : "Low", time, level: predcTdlvVl });
  }
  return tides.length ? { stationName, tides: tides.sort((a, b) => a.time.localeCompare(b.time)) } : null;
}

/** Daily max high minus min low, cm. Not a measured current velocity. */
export function tideRangeCm(data: TideData | null): number | null {
  if (!data || data.mocked) return null;
  const high = data.tides.filter(t => t.type === "High").map(t => t.level);
  const low = data.tides.filter(t => t.type === "Low").map(t => t.level);
  if (!high.length || !low.length || [...high, ...low].some(v => !Number.isFinite(v))) return null;
  const range = Math.max(...high) - Math.min(...low);
  return range >= 0 ? Math.round(range) : null;
}

/** Booking calendar: failures stay unavailable; never returns sample tides. */
export async function fetchStationTides(code: string, date: string, signal?: AbortSignal): Promise<TideData | null> {
  const station = TIDE_STATIONS.find(s => s.code === code);
  if (!station) return null;
  try {
    const params = new URLSearchParams({ obsCode: code, reqDate: date });
    const response = await apiFetch(`/api/tide?${params}`, {
      signal, timeout: 10000, retries: 0, context: "Tide forecast",
    });
    const result = parseTideResponse(response, date);
    return result?.stationName === station.name ? result : null;
  } catch {
    return null;
  }
}

export async function fetchTideData(lat: number, lng: number, date?: string): Promise<TideData | null> {
  const nearest = findNearestStation(lat, lng);
  const result = await fetchStationTides(nearest.code, date || localISODate(new Date()).replaceAll("-", ""));
  // Existing forecast/record screens explicitly mark samples and exclude them from records.
  // Booking calls fetchStationTides directly and never uses this legacy preview fallback.
  return result ?? getMockTideData(nearest.name);
}

/**
 * Calculate "지금 몇 물" based on tide data.
 * Between Low→High = 들물 (incoming) 1~6물
 * Between High→Low = 썰물 (outgoing) 1~6물
 * Phase 3~4 = peak current (유속 최강, 입질 최고)
 */
export function getCurrentPhase(tideData: TideData | null): TidePhase | null {
  if (!tideData || tideData.tides.length < 2) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Build timeline of tide events in minutes
  const events = tideData.tides
    .map((t) => {
      const [h, m] = t.time.split(":").map(Number);
      return { type: t.type, minutes: h * 60 + m, level: t.level };
    })
    .sort((a, b) => a.minutes - b.minutes);

  // Find which two events we are between
  let prev = events[events.length - 1]; // wrap around
  let next = events[0];

  for (let i = 0; i < events.length; i++) {
    if (events[i].minutes > currentMinutes) {
      next = events[i];
      prev = i > 0 ? events[i - 1] : events[events.length - 1];
      break;
    }
    // If we passed all events, prev = last, next = first (next day)
    if (i === events.length - 1) {
      prev = events[i];
      next = events[0];
    }
  }

  // Direction: Low→High = incoming (들물), High→Low = outgoing (썰물)
  const direction: TidePhase["direction"] =
    prev.type === "Low" ? "incoming" : "outgoing";
  const dirLabel = direction === "incoming" ? "들물" : "썰물";

  // Calculate progress (0~1) between prev and next
  let duration = next.minutes - prev.minutes;
  if (duration <= 0) duration += 24 * 60; // wrap midnight
  let elapsed = currentMinutes - prev.minutes;
  if (elapsed < 0) elapsed += 24 * 60;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  const percent = Math.round(progress * 100);

  // Convert progress to 1~6물 (6 equal phases within one tide cycle)
  const phase = Math.min(6, Math.max(1, Math.ceil(progress * 6)));

  // Current strength follows a sine curve: peak at phase 3~4
  const strengthMap: Record<
    number,
    { strength: TidePhase["strength"]; label: string }
  > = {
    1: { strength: "slack", label: "정조 (물 멈춤)" },
    2: { strength: "weak", label: "유속 약" },
    3: { strength: "strong", label: "유속 강" },
    4: { strength: "peak", label: "유속 최강" },
    5: { strength: "moderate", label: "유속 중" },
    6: { strength: "weak", label: "유속 약" },
  };

  const s = strengthMap[phase];

  return {
    direction,
    phase,
    label: `${dirLabel} ${phase}물`,
    strength: s.strength,
    strengthLabel: s.label,
    percent,
  };
}
