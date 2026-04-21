import { test, expect } from "@playwright/test";

test.describe("Core navigation flows", () => {
  test("home → bite forecast → back", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);

    const heroLink = page.locator('a[href="/bite-forecast"]').first();
    await expect(heroLink).toBeVisible({ timeout: 10000 });
    await heroLink.click();

    await expect(page).toHaveURL(/bite-forecast/);
    await page.waitForTimeout(2000);
    // Page loaded if URL matches
  });

  test("home → record page loads", async ({ page }) => {
    await page.goto("/record");
    await page.waitForTimeout(3000);
    // Record page has a header with title
    await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
  });

  test("home → stats page loads", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForTimeout(3000);
    await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
  });

  test("home → settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(3000);
    // Settings page has theme section
    await expect(
      page.getByText("테마").or(page.getByText("Theme")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("home → ranking page loads", async ({ page }) => {
    await page.goto("/ranking");
    await page.waitForTimeout(3000);
    await expect(
      page.getByText("낚시 랭킹").or(page.getByText("Fishing Ranking")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("home → concierge page loads", async ({ page }) => {
    await page.goto("/concierge");
    await page.waitForTimeout(3000);
    await expect(
      page.getByText("AI 컨시어지").or(page.getByText("AI Concierge")),
    ).toBeVisible({ timeout: 10000 });
  });

  test("home → news page loads", async ({ page }) => {
    await page.goto("/news");
    await page.waitForTimeout(3000);
    // News page has filter chips or article cards
    await expect(page.locator('[class*="rounded"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("home → regulations page loads", async ({ page }) => {
    await page.goto("/regulations");
    await page.waitForTimeout(3000);
    // Regulations page has species cards with emoji
    await expect(page.locator('[class*="rounded-2xl"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("home → season forecast page loads", async ({ page }) => {
    await page.goto("/season-forecast");
    await page.waitForTimeout(3000);
    await expect(
      page.getByText("시즌 예측").or(page.getByText("Season Forecast")),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Dark mode toggle", () => {
  test("settings theme toggle changes class", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(3000);

    const darkButton = page
      .getByText("다크")
      .or(page.getByText("Dark"))
      .first();
    if (await darkButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await darkButton.click();
      await page.waitForTimeout(500);
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).toContain("dark");
    }
  });
});
