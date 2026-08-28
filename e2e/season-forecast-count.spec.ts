import { test, expect } from '@playwright/test';

// 2026-08-28 전수조사: 헤더 "N개 어종"이 지역 탭을 바꿔도 "5개 어종"으로
// 고정돼 있었다. 동해를 고르면 실제 카드가 0개인데도 헤더는 그대로였다.

test('지역 탭을 바꾸면 헤더 어종 수가 실제 카드 수와 같이 바뀐다', async ({
  page,
}) => {
  await page.goto('/season-forecast');
  const header = page.getByText(/개 어종$/);
  await expect(header).toBeVisible({ timeout: 15000 });

  const countFromHeader = async () => {
    const text = await header.textContent();
    return Number(text?.match(/(\d+)개 어종/)?.[1]);
  };

  const wholeCount = await countFromHeader();

  await page.getByRole('button', { name: '동해', exact: true }).click();
  await page.waitForTimeout(500);
  const eastCount = await countFromHeader();
  // 동해 탭은 실제로 훨씬 적은 어종을 가진다 — 전국 탭과 같은 숫자면
  // 하드코딩이 되살아난 것이다.
  expect(eastCount).toBeLessThan(wholeCount);

  await page.getByRole('button', { name: '전국', exact: true }).click();
  await page.waitForTimeout(500);
  expect(await countFromHeader()).toBe(wholeCount);
});
