import { test, expect } from '@playwright/test';

// 5차 GOAL-4 — 랭킹이 공개 피드만 집계한다는 사실과 내 미반영 건수를
// 화면에서 말하는지.
test.describe('Ranking honesty — /ranking', () => {
  const base = {
    location: { name: '오천항' },
    species: '우럭',
    photos: [],
    createdAt: '2026-08-01T09:00:00.000Z',
  };

  test('tells the user their private records are not counted, with the number', async ({
    page,
  }) => {
    const now = new Date();
    const d = (day: number) =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await page.addInitScript((records) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(records));
    }, [
      { ...base, id: 'p1', date: d(1), count: 3, visibility: 'private' },
      { ...base, id: 'p2', date: d(2), count: 2, visibility: 'private' },
      { ...base, id: 'p3', date: d(3), count: 1, visibility: 'public' },
    ]);
    await page.goto('/ranking');

    const disclosure = page.locator('[data-testid="ranking-disclosure"]');
    await expect(disclosure).toBeVisible({ timeout: 20000 });
    await expect(disclosure).toContainText('공개된 조과만 집계');
    // 비공개 2건만 세고, 공개 1건은 빼야 한다.
    await expect(disclosure).toContainText('비공개 기록 2건');
    await expect(
      disclosure.getByRole('link', { name: /기록에서 공개하기/ }),
    ).toBeVisible();
  });

  test('states the rule even when nothing is private — no fake count', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('fishlog_catches', '[]');
    });
    await page.goto('/ranking');
    const disclosure = page.locator('[data-testid="ranking-disclosure"]');
    await expect(disclosure).toBeVisible({ timeout: 20000 });
    await expect(disclosure).toContainText('공개된 조과만 집계');
    await expect(disclosure).not.toContainText('비공개 기록');
  });
});
