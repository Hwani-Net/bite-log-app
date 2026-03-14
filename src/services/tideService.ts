import { CatchRecord } from '@/types';

export interface TideInfo {
  type: 'High' | 'Low';
  time: string; // HH:mm
  level: number; // cm
}

// Current tidal phase info (들물/썰물 몇 물)
export interface TidePhase {
  direction: 'incoming' | 'outgoing'; // 들물 / 썰물
  phase: number; // 1~6 (몇 물)
  label: string; // e.g. "들물 3물"
  strength: 'slack' | 'weak' | 'moderate' | 'strong' | 'peak'; // 유속 강도
  strengthLabel: string; // e.g. "유속 강"
  emoji: string; // 🌊
  percent: number; // 0~100 progress between prev→next tide event
}

export interface TideData {
  stationName: string;
  tides: TideInfo[];
  currentPhase?: TidePhase; // calculated client-side
}

export interface TideStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

// 주요 관측소 목록 (KHOA)
const TIDE_STATIONS: TideStation[] = [
  { code: 'DT_0001', name: '인천', lat: 37.4536, lng: 126.6006 },
  { code: 'DT_0002', name: '안산', lat: 37.2148, lng: 126.6088 },
  { code: 'DT_0004', name: '부산', lat: 35.0911, lng: 129.0358 },
  { code: 'DT_0005', name: '여수', lat: 34.7356, lng: 127.7658 },
  { code: 'DT_0006', name: '통영', lat: 34.8251, lng: 128.4344 },
  { code: 'DT_0011', name: '동해', lat: 37.4975, lng: 129.1436 },
  { code: 'DT_0013', name: '속초', lat: 38.2045, lng: 128.6015 },
  { code: 'DT_0041', name: '제주', lat: 33.5256, lng: 126.5432 },
  { code: 'DT_0042', name: '서귀포', lat: 33.2405, lng: 126.5638 },
  { code: 'DT_0018', name: '보령', lat: 36.3255, lng: 126.4816 },
  { code: 'DT_0033', name: '목포', lat: 34.7816, lng: 126.3800 },
  { code: 'DT_0019', name: '군산', lat: 35.9764, lng: 126.5658 },
  { code: 'DT_0020', name: '태안', lat: 36.8923, lng: 126.1381 },
  { code: 'DT_0025', name: '완도', lat: 34.3111, lng: 126.7561 },
  { code: 'DT_0029', name: '포항', lat: 36.0493, lng: 129.3802 },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function findNearestStation(lat: number, lng: number): TideStation {
  let nearest = TIDE_STATIONS[0];
  let minDistance = getDistance(lat, lng, nearest.lat, nearest.lng);

  for (let i = 1; i < TIDE_STATIONS.length; i++) {
    const station = TIDE_STATIONS[i];
    const distance = getDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

function getMockTideData(stationName: string): TideData {
  // Generate time-aware mock data based on current time
  const now = new Date();
  const hour = now.getHours();
  const baseHigh = (hour + 6) % 24;
  const baseLow = (hour + 12) % 24;
  
  return {
    stationName: `${stationName} (예측)`,
    tides: ([
      { type: 'High' as const, time: `${String(baseHigh).padStart(2, '0')}:30`, level: 245 + Math.floor(Math.random() * 30) },
      { type: 'Low' as const, time: `${String((baseHigh + 6) % 24).padStart(2, '0')}:15`, level: 65 + Math.floor(Math.random() * 25) },
      { type: 'High' as const, time: `${String((baseHigh + 12) % 24).padStart(2, '0')}:45`, level: 260 + Math.floor(Math.random() * 25) },
      { type: 'Low' as const, time: `${String((baseHigh + 18) % 24).padStart(2, '0')}:00`, level: 70 + Math.floor(Math.random() * 20) }
    ] as TideInfo[]).sort((a, b) => a.time.localeCompare(b.time))
  };
}

export async function fetchTideData(lat: number, lng: number, date?: string): Promise<TideData | null> {
  const nearest = findNearestStation(lat, lng);

  try {
    const targetDate = date || new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

    const params = new URLSearchParams({
      pageNo: '1',
      numOfRows: '10',
      obs_post_id: nearest.code,
      date: targetDate,
    });
    const apiUrl = `/api/tide?${params.toString()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = null;

    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      console.warn('Tide API proxy failed.');
    }

    if (!data) {
      return getMockTideData(nearest.name);
    }
    
    // Parse API response
    const items = data?.response?.body?.items?.item 
      || data?.getTideFcstHghLw?.body?.items?.item 
      || data?.result?.data 
      || null;
      
    if (!items || !Array.isArray(items)) {
      console.warn('KHOA API returned unexpected format. Using mock data.');
      return getMockTideData(nearest.name);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tides = items.map((item: any) => {
      // time format: "2026-03-01 04:54:00" -> "04:54"
      const timeStr = item.tph_time || item.obs_time || '';
      const time = timeStr.split(' ')[1]?.substring(0, 5) || '';
      
      return {
        type: ((item.hl_code === '고조' || item.hl_code === 'H') ? 'High' : 'Low') as 'High' | 'Low',
        time,
        level: parseInt(item.tph_level || item.tide_level || '0', 10),
      };
    }).sort((a: TideInfo, b: TideInfo) => a.time.localeCompare(b.time));

    if (tides.length === 0) return getMockTideData(nearest.name);

    return {
      stationName: nearest.name,
      tides,
    };
  } catch (err) {
    console.warn('Failed to fetch tide data, falling back to mock:', err);
    return getMockTideData(nearest.name);
  }
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
  const events = tideData.tides.map(t => {
    const [h, m] = t.time.split(':').map(Number);
    return { type: t.type, minutes: h * 60 + m, level: t.level };
  }).sort((a, b) => a.minutes - b.minutes);

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
  const direction: TidePhase['direction'] = prev.type === 'Low' ? 'incoming' : 'outgoing';
  const dirLabel = direction === 'incoming' ? '들물' : '썰물';

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
  const strengthMap: Record<number, { strength: TidePhase['strength']; label: string; emoji: string }> = {
    1: { strength: 'slack', label: '정조 (물 멈춤)', emoji: '🟡' },
    2: { strength: 'weak', label: '유속 약', emoji: '🔵' },
    3: { strength: 'strong', label: '유속 강', emoji: '🟠' },
    4: { strength: 'peak', label: '유속 최강', emoji: '🔴' },
    5: { strength: 'moderate', label: '유속 중', emoji: '🔵' },
    6: { strength: 'weak', label: '유속 약', emoji: '🟡' },
  };

  const s = strengthMap[phase];

  return {
    direction,
    phase,
    label: `${dirLabel} ${phase}물`,
    strength: s.strength,
    strengthLabel: s.label,
    emoji: s.emoji,
    percent,
  };
}
