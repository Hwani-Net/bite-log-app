// Marine Data Service — SST, Wave Height, Wave Period
// Source: Open-Meteo Marine API (free, no API key required)
// https://open-meteo.com/en/docs/marine-weather-api

export interface MarineData {
  seaSurfaceTemp: number;     // °C — 해수면 수온
  waveHeight: number;         // m — 유의파고
  wavePeriod: number;         // seconds — 파주기
  currentVelocity?: number;   // m/s — 해류 속도 (실측)
  currentDirection?: number;  // degrees — 해류 방향
}

/**
 * Fetch current marine conditions from Open-Meteo Marine API
 * Returns SST, wave height, and wave period for fishing forecast
 */
export async function fetchMarineData(lat: number, lng: number): Promise<MarineData | null> {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature,wave_height,wave_period,ocean_current_velocity,ocean_current_direction&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Marine API error: ${res.status}`);

    const data = await res.json();
    const current = data.current;

    if (!current) return null;

    return {
      seaSurfaceTemp: Math.round(current.sea_surface_temperature * 10) / 10,
      waveHeight: Math.round(current.wave_height * 100) / 100,
      wavePeriod: Math.round(current.wave_period * 10) / 10,
      currentVelocity: current.ocean_current_velocity != null
        ? Math.round(current.ocean_current_velocity * 100) / 100 : undefined,
      currentDirection: current.ocean_current_direction != null
        ? Math.round(current.ocean_current_direction) : undefined,
    };
  } catch (err) {
    console.error('Marine data fetch failed:', err);
    return null;
  }
}
