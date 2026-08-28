import { test, expect } from '@playwright/test';

// 3차 GOAL-4 — 예보×내 기록. 오늘 조건(mock)과 내 기록(주입)이 같은
// 구간이면 bite-forecast에 "내 기록 기준" 스트립이 실수치로 뜨고,
// 기록 없는 사용자에겐 안 뜬다. 홈 배너의 개인 결합 줄도 검증.
test.describe('Personal forecast strip — /bite-forecast + home banner', () => {
  test.use({
    geolocation: { latitude: 36.33, longitude: 126.51 },
    permissions: ['geolocation'],
  });

  const base = {
    location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
    species: '우럭',
    photos: [],
    visibility: 'private',
    createdAt: '2026-09-01T09:00:00.000Z',
  };
  const history = [
    { ...base, id: 'h1', date: '2026-08-01', count: 5, weather: { condition: 'clear', tempC: 18, windSpeed: 2 } },
    { ...base, id: 'h2', date: '2026-08-02', count: 4, weather: { condition: 'clear', tempC: 20, windSpeed: 3 } },
    { ...base, id: 'h3', date: '2026-08-03', count: 3, weather: { condition: 'clear', tempC: 22, windSpeed: 2.5 } },
  ];

  const mockWeather = (page: import('@playwright/test').Page) =>
    page.route('**/api.open-meteo.com/**', (r) =>
      r.fulfill({
        json: {
          current: {
            temperature_2m: 19, // 17~24°C 구간 — 주입 기록과 같은 구간
            relative_humidity_2m: 60,
            wind_speed_10m: 2, // m/s(wind_speed_unit=ms) — 바람 약 구간
            weather_code: 0,
            pressure_msl: 1013,
          },
        },
      }),
    );

  test('the strip shows my averages for today-matching buckets', async ({
    page,
  }) => {
    await mockWeather(page);
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, history);
    await page.goto('/bite-forecast');

    const strip = page.locator('[data-testid="my-record-strip"]');
    await expect(strip).toBeVisible({ timeout: 20000 });
    await expect(strip).toContainText('기온 구간(17~24°C)');
    await expect(strip).toContainText('평균 4마리');
    await expect(strip).toContainText('3회 기록');
    await expect(strip).toContainText('바람 약(4m/s 미만)');
  });

  test('no records — no strip, and no fabricated numbers', async ({ page }) => {
    await mockWeather(page);
    await page.goto('/bite-forecast');
    // 페이지 본문이 렌더된 뒤에도 스트립은 없어야 한다.
    await expect(page.getByText('7가지 요소를 종합 분석한 결과입니다')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('[data-testid="my-record-strip"]')).toHaveCount(0);
  });

  test('the home banner composes 주력 어종 with today score', async ({
    page,
  }) => {
    await mockWeather(page);
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, history);
    await page.goto('/');

    const line = page.locator('[data-testid="personal-forecast-line"]');
    await expect(line).toBeVisible({ timeout: 20000 });
    await expect(line).toContainText('주력 우럭');
  });
});
