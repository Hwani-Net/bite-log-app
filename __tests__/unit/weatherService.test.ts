import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWeather } from '@/services/weatherService';

// wind_speed_unit=ms 회귀 고정 — open-meteo 기본은 km/h라, 이 파라미터가
// 빠지면 앱 전체가 km/h 크기를 m/s로 표기·저장하는 단위 버그가 재발한다.
describe('fetchWeather', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests wind speed in m/s explicitly', async () => {
    let requested = '';
    vi.stubGlobal('fetch', (url: string) => {
      requested = String(url);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current: {
              temperature_2m: 19,
              relative_humidity_2m: 60,
              wind_speed_10m: 2.4,
              weather_code: 0,
              pressure_msl: 1013,
            },
          }),
      });
    });
    const w = await fetchWeather(36.3, 126.5);
    expect(requested).toContain('wind_speed_unit=ms');
    expect(w?.windSpeed).toBe(2.4);
  });
});
