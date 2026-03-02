import { WeatherInfo } from '@/types';

/**
 * WMO Weather interpretation codes → readable condition string
 * https://open-meteo.com/en/docs
 */
const WMO_CODES: Record<number, { ko: string; en: string; icon: string }> = {
  0: { ko: '맑음', en: 'Clear', icon: 'wb_sunny' },
  1: { ko: '대체로 맑음', en: 'Mainly clear', icon: 'wb_sunny' },
  2: { ko: '구름 조금', en: 'Partly cloudy', icon: 'partly_cloudy_day' },
  3: { ko: '흐림', en: 'Overcast', icon: 'cloud' },
  45: { ko: '안개', en: 'Fog', icon: 'foggy' },
  48: { ko: '짙은 안개', en: 'Rime fog', icon: 'foggy' },
  51: { ko: '약한 이슬비', en: 'Light drizzle', icon: 'grain' },
  53: { ko: '이슬비', en: 'Moderate drizzle', icon: 'grain' },
  55: { ko: '강한 이슬비', en: 'Dense drizzle', icon: 'grain' },
  61: { ko: '약한 비', en: 'Light rain', icon: 'rainy' },
  63: { ko: '비', en: 'Moderate rain', icon: 'rainy' },
  65: { ko: '강한 비', en: 'Heavy rain', icon: 'rainy' },
  66: { ko: '약한 진눈깨비', en: 'Light freezing rain', icon: 'weather_mix' },
  67: { ko: '강한 진눈깨비', en: 'Heavy freezing rain', icon: 'weather_mix' },
  71: { ko: '약한 눈', en: 'Light snow', icon: 'ac_unit' },
  73: { ko: '눈', en: 'Moderate snow', icon: 'ac_unit' },
  75: { ko: '강한 눈', en: 'Heavy snow', icon: 'ac_unit' },
  77: { ko: '싸락눈', en: 'Snow grains', icon: 'ac_unit' },
  80: { ko: '약한 소나기', en: 'Light showers', icon: 'rainy' },
  81: { ko: '소나기', en: 'Moderate showers', icon: 'rainy' },
  82: { ko: '강한 소나기', en: 'Violent showers', icon: 'thunderstorm' },
  85: { ko: '약한 눈보라', en: 'Light snow showers', icon: 'weather_snowy' },
  86: { ko: '강한 눈보라', en: 'Heavy snow showers', icon: 'weather_snowy' },
  95: { ko: '뇌우', en: 'Thunderstorm', icon: 'thunderstorm' },
  96: { ko: '우박 뇌우', en: 'Thunderstorm with hail', icon: 'thunderstorm' },
  99: { ko: '강한 우박 뇌우', en: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
};

export interface WeatherData extends WeatherInfo {
  icon: string;
  conditionKo: string;
  conditionEn: string;
}

/**
 * Fetch current weather for given coordinates using Open-Meteo API
 * Free, no API key required, non-commercial use
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

    const data = await res.json();
    const current = data.current;

    if (!current) return null;

    const code = current.weather_code ?? 0;
    const wmo = WMO_CODES[code] ?? WMO_CODES[0];

    return {
      condition: wmo.en,
      conditionKo: wmo.ko,
      conditionEn: wmo.en,
      icon: wmo.icon,
      tempC: Math.round(current.temperature_2m * 10) / 10,
      windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
      humidity: Math.round(current.relative_humidity_2m),
    };
  } catch (err) {
    console.error('Weather fetch failed:', err);
    return null;
  }
}
