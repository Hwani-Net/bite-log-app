import { test, expect } from '@playwright/test';

// 4차 GOAL-6 — PWA 정합. manifest 색·sw 프리캐시 목록은 정적 파일을
// 직접 fetch해 단언하고, A2HS 버튼은 beforeinstallprompt를 시뮬레이션해
// 노출·prompt() 호출까지 검증한다.
test.describe('PWA integrity', () => {
  test('manifest uses the real dark palette — no white install splash', async ({
    request,
  }) => {
    const manifest = await (await request.get('/manifest.json')).json();
    expect(manifest.background_color).toBe('#080d14');
    expect(manifest.theme_color).toBe('#080d14');
  });

  test('sw pre-cache covers the routes that were missing', async ({
    request,
  }) => {
    const sw = await (await request.get('/sw.js')).text();
    expect(sw).toContain('bitelog-v4'); // 캐시 버전 증가
    for (const route of ['/booking', '/trip-plan', '/catch-value', '/fishdex', '/alerts']) {
      expect(sw, route).toContain(`"${route}"`);
    }
  });

  test('the install button appears on beforeinstallprompt and calls prompt()', async ({
    page,
  }) => {
    await page.goto('/settings');
    // 이벤트 없는 기본 상태 — 버튼이 없다.
    await expect(page.locator('[data-testid="a2hs-install"]')).toHaveCount(0);

    // beforeinstallprompt 시뮬레이션(캡처 리스너는 AppInitializer가 등록).
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true });
      (e as unknown as { prompt: () => Promise<void> }).prompt = () => {
        (window as unknown as { __promptCalled: boolean }).__promptCalled = true;
        return Promise.resolve();
      };
      (e as unknown as { userChoice: Promise<unknown> }).userChoice =
        Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });

    const btn = page.locator('[data-testid="a2hs-install"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __promptCalled?: boolean }).__promptCalled,
        ),
      )
      .toBe(true);
    // 소진 후엔 버튼이 사라진다.
    await expect(btn).toHaveCount(0);
  });
});
