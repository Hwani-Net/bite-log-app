import { test, expect } from '@playwright/test';

// 3차 GOAL-6 — 기록 저장 직전 규정 검사. 날짜를 고정 입력해 실행 시점과
// 무관하게 결정적이다. 어종은 폼 선택지(FISH_SPECIES)에 실제로 있는
// 것이어야 한다 — 감성돔(금어기 5/1~6/30), 우럭(체장 23cm 미만 금지).
test.describe('Catch legality guard — /record', () => {
  test('a closed-season catch warns first, then saves via 그래도 저장', async ({
    page,
  }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();

    await page.getByLabel('어종').selectOption('감성돔');
    await page.locator('input[type="date"]').fill('2026-05-15'); // 금어기 안
    await page.getByRole('button', { name: '기록 저장' }).click();

    const warning = page.locator('[data-testid="legality-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('금어기');
    await expect(warning).toContainText('과태료');
    await expect(warning).toContainText('수산자원관리법');

    // 방류했을 수 있으니 저장은 열려 있다 — 그래도 저장하면 실제 저장된다.
    await warning.getByRole('button', { name: '그래도 저장' }).click();
    await page.waitForURL('/', { timeout: 15000 });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]'),
    );
    expect(saved.some((r: { species: string }) => r.species === '감성돔')).toBe(true);
  });

  test('an undersized fish warns; fixing the size clears the path', async ({
    page,
  }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();

    await page.getByLabel('어종').selectOption('우럭');
    await page.locator('input[type="date"]').fill('2026-10-15');
    await page.getByLabel('사이즈(cm)').fill('10');
    await page.getByRole('button', { name: '기록 저장' }).click();

    const warning = page.locator('[data-testid="legality-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('체장');

    // 다시 확인 → 사이즈 수정 → 재제출: 경고 없이 저장(합법 경로 회귀).
    await warning.getByRole('button', { name: '다시 확인' }).click();
    await expect(warning).toHaveCount(0);
    await page.getByLabel('사이즈(cm)').fill('30');
    await page.getByRole('button', { name: '기록 저장' }).click();
    await page.waitForURL('/', { timeout: 15000 });
  });
});
