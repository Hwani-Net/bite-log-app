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

  test('the v4 cache actually forms in the browser — old v3 gone', async ({
    page,
  }) => {
    await page.goto('/settings');
    // SW 등록·activate 후 캐시 이름을 실측 — 버전 문자열 리터럴 검사가
    // 아니라 행위 검증(교차검수 지적 반영).
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            if (!('caches' in window)) return ['no-cache-api'];
            return caches.keys();
          }),
        { timeout: 30000 },
      )
      .toContain('bitelog-v4');
    const keys = await page.evaluate(() => caches.keys());
    expect(keys).not.toContain('bitelog-v3');
  });

  test('an early beforeinstallprompt (before hydration) is not lost', async ({
    page,
  }) => {
    // 페이지 스크립트 평가 직후·앱 마운트 전에 이벤트를 쏜다 — 모듈 로드
    // 시점 리스너가 없으면 유실되는 레이스의 회귀 고정.
    await page.addInitScript(() => {
      const fire = () => {
        const e = new Event('beforeinstallprompt', { cancelable: true });
        (e as unknown as { prompt: () => Promise<void> }).prompt = () =>
          Promise.resolve();
        (e as unknown as { userChoice: Promise<unknown> }).userChoice =
          Promise.resolve({ outcome: 'dismissed' });
        window.dispatchEvent(e);
      };
      // DOMContentLoaded 직전후 두 번 — 번들 평가 타이밍 어느 쪽이든 커버.
      document.addEventListener('DOMContentLoaded', fire);
      setTimeout(fire, 0);
    });
    await page.goto('/settings');
    await expect(page.locator('[data-testid="a2hs-install"]')).toBeVisible({
      timeout: 15000,
    });
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
