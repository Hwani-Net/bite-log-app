// Marine Data Service — SST, Wave Height, Wave Period
// Source: Open-Meteo Marine API (free, no API key required)
// https://open-meteo.com/en/docs/marine-weather-api

export interface MarineData {
  seaSurfaceTemp: number;     // °C — 해수면 수온
  waveHeight: number;         // m — 유의파고
  wavePeriod: number;         // seconds — 파주기
  currentVelocity?: number;   // m/s — 해류 속도 (실측)
  currentDirection?: number;  // degrees — 해류 방향
  isCoastalFallback?: boolean; // true if coords were snapped to nearest coastline
}

// Korean coastline reference points for inland fallback
// When user is inland, snap to nearest coastal fishing area
const COASTAL_POINTS: { name: string; lat: number; lng: number }[] = [
  { name: '인천 앞바다', lat: 37.45, lng: 126.40 },
  { name: '태안 서해', lat: 36.75, lng: 126.10 },
  { name: '군산 앞바다', lat: 35.95, lng: 126.55 },
  { name: '목포 앞바다', lat: 34.75, lng: 126.30 },
  { name: '여수·통영', lat: 34.60, lng: 128.00 },
  { name: '부산 앞바다', lat: 35.05, lng: 129.10 },
  { name: '울산 앞바다', lat: 35.50, lng: 129.45 },
  { name: '포항 앞바다', lat: 36.05, lng: 129.55 },
  { name: '속초 동해', lat: 38.18, lng: 128.60 },
  { name: '제주 서귀포', lat: 33.25, lng: 126.55 },
];

/**
 * Detect if coordinates are likely inland (far from coastline)
 * Uses elevation from API response — if > 10m, likely inland
 * Also checks if wave_height is null (Open-Meteo returns null for land points)
 */
function findNearestCoast(lat: number, lng: number): { lat: number; lng: number; name: string } {
  let minDist = Infinity;
  let nearest = COASTAL_POINTS[0];

  for (const pt of COASTAL_POINTS) {
    const dLat = pt.lat - lat;
    const dLng = pt.lng - lng;
    const dist = dLat * dLat + dLng * dLng; // squared distance is fine for comparison
    if (dist < minDist) {
      minDist = dist;
      nearest = pt;
    }
  }

  return nearest;
}

/**
 * Fetch current marine conditions from Open-Meteo Marine API
 * Returns SST, wave height, and wave period for fishing forecast
 *
 * If the user is inland (wave_height is null), automatically retries
 * with the nearest Korean coastline point for more relevant data.
 */
export async function fetchMarineData(lat: number, lng: number): Promise<MarineData | null> {
  try {
    const result = await fetchMarineDataRaw(lat, lng);

    // If wave_height is null, user is likely inland → retry with nearest coast
    if (result && (result.waveHeight === undefined || isNaN(result.waveHeight))) {
      const coast = findNearestCoast(lat, lng);
      console.info(`[Marine] Inland detected (no wave data). Snapping to ${coast.name} (${coast.lat}, ${coast.lng})`);
      const coastResult = await fetchMarineDataRaw(coast.lat, coast.lng);
      if (coastResult) {
        coastResult.isCoastalFallback = true;
        return coastResult;
      }
    }

    return result;
  } catch (err) {
    console.error('Marine data fetch failed:', err);
    return null;
  }
}

async function fetchMarineDataRaw(lat: number, lng: number): Promise<MarineData | null> {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature,wave_height,wave_period,ocean_current_velocity,ocean_current_direction&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Marine API error: ${res.status}`);

  const data = await res.json();
  const current = data.current;

  if (!current) return null;

  // Safely handle null values from API (inland coordinates return null for wave data)
  const sst = current.sea_surface_temperature;
  const waveH = current.wave_height;
  const waveP = current.wave_period;

  return {
    seaSurfaceTemp: sst != null ? Math.round(sst * 10) / 10 : 0,
    waveHeight: waveH != null ? Math.round(waveH * 100) / 100 : undefined as unknown as number,
    wavePeriod: waveP != null ? Math.round(waveP * 10) / 10 : undefined as unknown as number,
    currentVelocity: current.ocean_current_velocity != null
      ? Math.round(current.ocean_current_velocity * 100) / 100 : undefined,
    currentDirection: current.ocean_current_direction != null
      ? Math.round(current.ocean_current_direction) : undefined,
  };
}
