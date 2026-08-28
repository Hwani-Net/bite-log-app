import { test, expect } from '@playwright/test';

// 5차 GOAL-2 — 채비·미끼 필드. 입력→저장→상세 표시→조건표 축 합류까지
// 한 줄로 잇는다.
test.describe('Tackle field — /record → detail → stats', () => {
  test('a tackle entry saves, shows on the detail page, and is searchable', async ({
    page,
  }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();
    await page.getByLabel('어종').selectOption('우럭');
    await page.getByLabel('채비·미끼').fill('지그헤드 5g + 웜');
    await page.getByRole('button', { name: '기록 저장' }).click();
    await page.waitForURL('/', { timeout: 15000 });

    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]'),
    );
    expect(saved[0].tackle).toBe('지그헤드 5g + 웜');

    await page.goto(`/records/detail?id=${saved[0].id}`);
    await expect(page.getByText('지그헤드 5g + 웜')).toBeVisible({
      timeout: 10000,
    });

    // 자유 검색이 채비도 훑는다(5차 GOAL-1에서 넓힌 범위).
    await page.goto('/records');
    await page.locator('input[placeholder]').first().fill('지그헤드');
    await expect(page.locator('a[href^="/records/detail"]')).toHaveCount(1);
  });

  test('the tackle axis joins the condition table once three records share one', async ({
    page,
  }) => {
    const base = {
      location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
      species: '우럭',
      photos: [],
      visibility: 'private',
      createdAt: '2026-09-01T09:00:00.000Z',
    };
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, [
      { ...base, id: 't1', date: '2026-08-01', count: 6, tackle: '지그헤드 5g' },
      { ...base, id: 't2', date: '2026-08-02', count: 4, tackle: '지그헤드 5g' },
      { ...base, id: 't3', date: '2026-08-03', count: 5, tackle: '지그헤드 5g' },
      { ...base, id: 't4', date: '2026-08-04', count: 9, tackle: '에기 2.5호' },
    ]);
    await page.goto('/stats');

    const table = page.locator('[data-testid="condition-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table).toContainText('채비');
    await expect(table).toContainText('지그헤드 5g 평균 5마리');
    // 1회짜리 에기는 칩으로만 보이고 최고 조건이 되지 않는다.
    await expect(table).toContainText('에기 2.5호 · 9마리/1회');
  });

  test('the tackle input offers species-aware suggestions', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();
    await page.getByLabel('어종').selectOption('주꾸미');
    const options = await page
      .locator('#tackle-suggestions option')
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(options.length).toBeGreaterThan(3);
    expect(options[0]).toMatch(/에기/); // 주꾸미 어휘가 선두
  });
});
