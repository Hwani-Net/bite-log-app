import { test, expect } from '@playwright/test';

// These hit the real /api/boat-listings and /api/boat-calendar routes,
// which proxy thefishing.kr live (same pattern as news.spec.ts's YouTube
// RSS route) — timeouts are generous to absorb that external round trip.

test.describe('Booking search — /booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking');
  });

  // The date/species filters are duplicated on this page — once in the
  // date-search grid, once in the unrelated 예약 어시스턴트 checklist card
  // further down — so every filter locator here is scoped to the first
  // glass-morphism card (the search grid).
  const searchCard = (page: import('@playwright/test').Page) =>
    page.locator('.glass-morphism').first();

  test('loads with a default search date and boat grid', async ({ page }) => {
    await expect(searchCard(page).locator('input[type="date"]')).toBeVisible();
    // The grid resolves to either boats or the explicit empty-state copy —
    // never a silent blank area.
    await expect(
      page.locator('a[href^="/booking/boat/"]').first().or(
        page.getByText('이 조건으로 출조하는 선박이 없습니다'),
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test('region filter narrows the result count', async ({ page }) => {
    const countLabel = page.locator('text=/\\d+척/');
    await expect(countLabel).toBeVisible({ timeout: 15000 });
    const before = await countLabel.textContent();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/boat-listings') && r.url().includes('region=1'),
      { timeout: 15000 },
    );
    await searchCard(page).getByRole('button', { name: '서해', exact: true }).click();
    await responsePromise;
    await page.waitForTimeout(300);

    // A real filter changed the query — the count text updated (same value
    // would mean the click was a no-op).
    await expect(countLabel).not.toHaveText(before ?? '');
  });

  test('species filter also narrows results', async ({ page }) => {
    const countLabel = page.locator('text=/\\d+척/');
    await expect(countLabel).toBeVisible({ timeout: 15000 });
    const before = await countLabel.textContent();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/boat-listings') && r.url().includes('species=4'),
      { timeout: 15000 },
    );
    await searchCard(page).getByRole('button', { name: '우럭', exact: true }).click();
    await responsePromise;
    await page.waitForTimeout(300);

    await expect(countLabel).not.toHaveText(before ?? '');
  });

  test('clicking a boat card navigates to its calendar page', async ({ page }) => {
    const card = page.locator('a[href^="/booking/boat/"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const href = await card.getAttribute('href');
    await card.click();
    await page.waitForURL(/\/booking\/boat\/\d+/, { timeout: 10000 });
    expect(page.url()).toContain(href!.split('?')[0]);
  });
});

test.describe('Boat calendar — /booking/boat/[uid]', () => {
  // uid 4247 is a real, stable listing (오이도 몬스터호) used in the unit
  // fixtures too.
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking/boat/4247?date=2026-09-01');
  });

  test('renders boat meta and a month grid', async ({ page }) => {
    await expect(page.getByRole('link', { name: /홈페이지 예약/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/\d{4}년 \d{1,2}월/)).toBeVisible();
  });

  test('the 홈페이지 예약 button points at the boat operator, not thefishing.kr', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: /홈페이지 예약/ }).first();
    await expect(link).toBeVisible({ timeout: 15000 });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toContain('thefishing.kr');
  });

  test('clicking a bookable day shows remaining seats and a per-day reserve link', async ({
    page,
  }) => {
    // No ?date= this time — day 1 (or whichever day the query param names)
    // starts pre-selected on that route, and clicking an already-selected
    // day toggles it off instead of opening the detail panel.
    await page.goto('/booking/boat/4247');
    const availableDay = page
      .locator('button')
      .filter({ hasText: /남은 \d+명/ })
      .first();
    await expect(availableDay).toBeVisible({ timeout: 15000 });
    await availableDay.click();

    await expect(page.getByText(/남은인원 \d+명/)).toBeVisible();
    const reserveLink = page.getByRole('link', { name: /\d+일 예약하기/ });
    await expect(reserveLink).toBeVisible();
    const href = await reserveLink.getAttribute('href');
    expect(href).not.toContain('thefishing.kr');
  });

  test('month navigation changes the displayed month', async ({ page }) => {
    const monthLabel = page.locator('text=/\\d{4}년 \\d{1,2}월/').first();
    await expect(monthLabel).toBeVisible({ timeout: 15000 });
    const before = await monthLabel.textContent();

    await page.getByLabel('다음 달').click();
    await page.waitForTimeout(1000);

    const after = await monthLabel.textContent();
    expect(after).not.toBe(before);
  });
});
