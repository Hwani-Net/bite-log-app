// Bite Index (바다낚시지수) client service.
// Wraps `/api/bite-index` server proxy. On 503 (missing key / upstream failure)
// falls back to a small local mock so the UI stays functional during API
// provisioning (key traffic propagation, quota lockouts, etc.).
//
// Upstream spec summary (see src/app/api/bite-index/route.ts for details):
//   Endpoint: apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2
//   Forecast window: today + 7 days
//   Daily quota: 10,000 calls
//   Gubun: 갯바위 (shore) | 선상 (boat)

export type BiteIndexGubun = "shore" | "boat";

export interface FishingIndex {
  /** 장소명 (예: 김녕) */
  placeName: string;
  /** 대상 어종 */
  targetFish: string;
  /** 낚시지수 1~5 (1 매우나쁨 ~ 5 매우좋음) */
  indexScore: 1 | 2 | 3 | 4 | 5;
  /** 수온(°C) */
  waterTemp?: number;
  /** 파고(m) */
  waveHeight?: number;
  /** 물때 */
  tideInfo?: string;
  /** 위도 */
  lat?: number;
  /** 경도 */
  lon?: number;
  /** 예보일자 YYYYMMDD */
  forecastDate: string;
  /** 구분 */
  gubun: "갯바위" | "선상";
}

export interface FetchBiteIndexParams {
  gubun?: BiteIndexGubun;
  placeName?: string;
  /** YYYYMMDD. Defaults to today on server. */
  reqDate?: string;
  numOfRows?: number;
  pageNo?: number;
}

/** Five-step 1..5 score → design meta (color token + label). */
export const BITE_INDEX_CONFIG: Record<
  1 | 2 | 3 | 4 | 5,
  { label: string; textClass: string; barClass: string; hex: string }
> = {
  1: {
    label: "매우나쁨",
    textClass: "text-red-500",
    barClass: "bg-red-500",
    hex: "#ef4444",
  },
  2: {
    label: "나쁨",
    textClass: "text-orange-400",
    barClass: "bg-orange-400",
    hex: "#fb923c",
  },
  3: {
    label: "보통",
    textClass: "text-yellow-400",
    barClass: "bg-yellow-400",
    hex: "#facc15",
  },
  4: {
    label: "좋음",
    textClass: "text-emerald-400",
    barClass: "bg-emerald-400",
    hex: "#34d399",
  },
  5: {
    label: "매우좋음",
    textClass: "text-cyan-400",
    barClass: "bg-cyan-400",
    hex: "#22d3ee",
  },
};

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

// @mock-data — Bite Index fallback when API key is absent or upstream fails.
// Five representative Korean coastal points × one primary target species each.
// Values are illustrative (not live); used only while the real API is offline.
const MOCK_BITE_INDEX: FishingIndex[] = [
  {
    placeName: "제주 김녕",
    targetFish: "참돔",
    indexScore: 4,
    waterTemp: 18.2,
    waveHeight: 0.6,
    tideInfo: "사리 물때",
    lat: 33.5568,
    lon: 126.7704,
    forecastDate: todayYYYYMMDD(),
    gubun: "갯바위",
  },
  {
    placeName: "통영 욕지도",
    targetFish: "감성돔",
    indexScore: 5,
    waterTemp: 17.4,
    waveHeight: 0.4,
    tideInfo: "중사리",
    lat: 34.6241,
    lon: 128.2704,
    forecastDate: todayYYYYMMDD(),
    gubun: "갯바위",
  },
  {
    placeName: "포항 구룡포",
    targetFish: "볼락",
    indexScore: 3,
    waterTemp: 15.1,
    waveHeight: 1.0,
    tideInfo: "조금",
    lat: 35.9939,
    lon: 129.5535,
    forecastDate: todayYYYYMMDD(),
    gubun: "갯바위",
  },
  {
    placeName: "태안 안면도",
    targetFish: "우럭",
    indexScore: 2,
    waterTemp: 14.0,
    waveHeight: 1.6,
    tideInfo: "무시",
    lat: 36.5067,
    lon: 126.3308,
    forecastDate: todayYYYYMMDD(),
    gubun: "갯바위",
  },
  {
    placeName: "부산 오륙도",
    targetFish: "돌돔",
    indexScore: 4,
    waterTemp: 17.8,
    waveHeight: 0.8,
    tideInfo: "사리",
    lat: 35.0956,
    lon: 129.1239,
    forecastDate: todayYYYYMMDD(),
    gubun: "갯바위",
  },
];

interface BiteIndexApiResponse {
  ok: boolean;
  data?: FishingIndex[];
  count?: number;
  timestamp?: string;
  mock?: boolean;
  error?: string;
}

/**
 * Fetch bite index forecast. Never throws — returns mock on any failure
 * (503 key missing, upstream 4xx/5xx, network error, malformed payload).
 * Callers can inspect `mock` on each item via `BITE_INDEX_META.mocked` if
 * needed in the future; for now the boolean is surfaced via a separate
 * `fetchBiteIndexWithMeta` helper.
 */
export async function fetchBiteIndex(
  params: FetchBiteIndexParams = {},
): Promise<FishingIndex[]> {
  const { items } = await fetchBiteIndexWithMeta(params);
  return items;
}

/** Same as fetchBiteIndex but exposes whether the mock fallback was used. */
export async function fetchBiteIndexWithMeta(
  params: FetchBiteIndexParams = {},
): Promise<{ items: FishingIndex[]; mocked: boolean }> {
  const qs = new URLSearchParams();
  if (params.gubun) qs.set("gubun", params.gubun);
  if (params.placeName) qs.set("placeName", params.placeName);
  if (params.reqDate) qs.set("reqDate", params.reqDate);
  if (params.pageNo != null) qs.set("pageNo", String(params.pageNo));
  if (params.numOfRows != null) qs.set("numOfRows", String(params.numOfRows));

  const url = `/api/bite-index${qs.toString() ? `?${qs.toString()}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.warn("[biteIndexService] network error, using mock:", err);
    return { items: filterMock(params), mocked: true };
  }

  // Key missing or upstream failure → graceful mock fallback.
  if (res.status === 503) {
    console.warn(
      "[biteIndexService] upstream unavailable (HTTP 503), using mock",
    );
    return { items: filterMock(params), mocked: true };
  }

  if (!res.ok) {
    // Surface non-503 failures (400 validation, 5xx server bug) visibly —
    // no silent swallow. Still return mock so UI remains usable.
    const preview = await res.text().catch(() => "");
    console.error(
      `[biteIndexService] unexpected HTTP ${res.status}:`,
      preview.slice(0, 200),
    );
    return { items: filterMock(params), mocked: true };
  }

  let json: BiteIndexApiResponse;
  try {
    json = (await res.json()) as BiteIndexApiResponse;
  } catch (err) {
    console.error("[biteIndexService] failed to parse JSON:", err);
    return { items: filterMock(params), mocked: true };
  }

  if (!json.ok || !Array.isArray(json.data) || json.data.length === 0) {
    return { items: filterMock(params), mocked: true };
  }

  return { items: json.data, mocked: !!json.mock };
}

function filterMock(params: FetchBiteIndexParams): FishingIndex[] {
  let list = MOCK_BITE_INDEX;
  const desiredGubun =
    params.gubun === "boat"
      ? "선상"
      : params.gubun === "shore"
        ? "갯바위"
        : undefined;
  if (desiredGubun)
    list = list.map((x) => ({
      ...x,
      gubun: desiredGubun as "갯바위" | "선상",
    }));
  if (params.placeName)
    list = list.filter((x) => x.placeName.includes(params.placeName!));
  return list;
}
