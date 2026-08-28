import { test, expect } from '@playwright/test';

// 3차 GOAL-3 — 나의 조건표. 조건 데이터가 있는 기록을 주입하면 구간별
// 평균이 실제 수치로 렌더되고, 조건 없는 기록만 있으면 축별 빈 상태가
// 나오는지 검증한다.
test.describe('My condition table — /stats', () => {
  const base = {
    location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
    species: '우럭',
    photos: [],
    visibility: 'private',
    createdAt: '2026-09-01T09:00:00.000Z',
  };

  test('renders per-bucket averages from seeded condition data', async ({
    page,
  }) => {
    const records = [
      { ...base, id: 'c1', date: '2026-08-01', count: 5, weather: { condition: 'clear', tempC: 18, windSpeed: 2 } },
      { ...base, id: 'c2', date: '2026-08-02', count: 4, weather: { condition: 'clear', tempC: 20, windSpeed: 3 } },
      { ...base, id: 'c3', date: '2026-08-03', count: 3, weather: { condition: 'clear', tempC: 22, windSpeed: 2.5 } },
      { ...base, id: 'c4', date: '2026-08-04', count: 4, weather: { condition: 'clear', tempC: 19, windSpeed: 9 } },
    ];
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, records);
    await page.goto('/stats');

    const table = page.locator('[data-testid="condition-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    // 기온 축: 17~24°C 4회 평균 4마리 — 실제 수치를 단언한다.
    await expect(table).toContainText('17~24°C 평균 4마리');
    await expect(table).toContainText('표본 4회');
    // 풍속 축: 약(2/3/2.5) 3회 평균 4마리가 best — 9m/s 1회는 표본 부족.
    await expect(table).toContainText('바람 약(4m/s 미만) 평균 4마리');
    // 물때 축: phase 없는 기록뿐 → 빈 상태 문구.
    await expect(table).toContainText('기록이 쌓이면');
  });

  test('sampled-but-below-minimum axes list buckets without crowning a best', async ({
    page,
  }) => {
    // 기온 표본 2회 — 구간 칩은 보이되 best는 안 뽑히고 안내가 나온다.
    const records = [
      { ...base, id: 'p1', date: '2026-08-01', count: 5, weather: { condition: 'clear', tempC: 18 } },
      { ...base, id: 'p2', date: '2026-08-02', count: 4, weather: { condition: 'clear', tempC: 20 } },
    ];
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, records);
    await page.goto('/stats');

    const table = page.locator('[data-testid="condition-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table).toContainText('17~24°C · 4.5마리/2회'); // 칩은 공개
    await expect(table).toContainText('구간당 3회 이상 쌓이면'); // best 없음 안내
    await expect(table).not.toContainText('평균 4.5마리'); // best 승격은 안 됨
  });

  test('all axes show the honest empty state when records carry no conditions', async ({
    page,
  }) => {
    const records = [
      { ...base, id: 'n1', date: '2026-08-01', count: 2 },
      { ...base, id: 'n2', date: '2026-08-02', count: 3 },
    ];
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, records);
    await page.goto('/stats');

    const table = page.locator('[data-testid="condition-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    const emptyMsgs = table.getByText(/기록이 쌓이면/);
    await expect(emptyMsgs).toHaveCount(3); // 세 축 전부
  });
});
