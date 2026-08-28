import { test, expect } from '@playwright/test';

// 2026-08-28 전수조사: 노량진/부산공동/제주 시장 탭을 눌러도 시세가 전혀
// 안 바뀌었다. KAMIS 도매가격 API는 시장별 데이터를 주지 않고(전국 단일
// 피드), 모의 데이터도 전부 노량진 하나로 고정돼 있어 탭 자체가 처음부터
// 기능이 없었다 — 있지만 아무 것도 안 하는 필터라 탭을 제거했다.

test('가짜였던 시장 탭이 사라지고, 정렬은 실제로 동작한다', async ({
  page,
}) => {
  await page.goto('/catch-value');
  await expect(page.getByText('수산물 시세')).toBeVisible({ timeout: 15000 });

  await expect(page.getByRole('button', { name: '노량진', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '부산공동', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '가격순' }).click();
  await page.waitForTimeout(300);
  const byPrice = await page.locator('h3, h4, p').allTextContents();

  await page.getByRole('button', { name: '어종명순' }).click();
  await page.waitForTimeout(300);
  const byName = await page.locator('h3, h4, p').allTextContents();

  expect(byPrice.join('|')).not.toBe(byName.join('|'));
});
