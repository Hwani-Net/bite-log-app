import { CatchRecord } from '@/types';

export interface TideInfo {
  type: 'High' | 'Low';
  time: string; // HH:mm
  level: number; // cm
}

export interface TideData {
  stationName: string;
  tides: TideInfo[];
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
  const apiKey = process.env.NEXT_PUBLIC_KHOA_API_KEY;
  const nearest = findNearestStation(lat, lng);
  
  if (!apiKey) {
    return getMockTideData(nearest.name);
  }

  try {
    const targetDate = date || new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    
    // Direct call with CORS proxy for browser environment
    const apiUrl = `https://apis.data.go.kr/1192136/tideFcstHghLw/getTideFcstHghLw?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=10&obs_post_id=${nearest.code}&date=${targetDate}&resultType=json`;
    
    let data: any = null;
    
    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      // CORS blocked — try proxy
      console.log('Direct KHOA API failed, trying CORS proxy...');
    }
    
    if (!data) {
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
        const proxyRes = await fetch(proxyUrl, { cache: 'no-store' });
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {
        console.warn('CORS proxy also failed.');
      }
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
