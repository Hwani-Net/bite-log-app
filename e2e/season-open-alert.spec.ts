import { test, expect } from '@playwright/test';

// 4차 GOAL-2 — 금어기 해제 D-3 알림. Notification을 스텁으로 갈아끼워
// 실제 발화 횟수를 세고(권한 프롬프트 없이 결정적), dedupe 마커까지
// 검증한다. 시계는 주꾸미 해제(9/1) D-2로 고정.
test.describe('Season-open alert — app boot', () => {
  const FIXED_NOW = new Date(2026, 7, 30, 10, 0, 0); // 2026-08-30

  const seed = (page: import('@playwright/test').Page) =>
    page.addInitScript(() => {
      // Notification 스텁 — 생성 호출을 기록한다.
      class FakeNotification {
        static permission = 'granted';
        static requestPermission() {
          return Promise.resolve('granted');
        }
        constructor(title: string) {
          (window as unknown as { __notifs: string[] }).__notifs ??= [];
          (window as unknown as { __notifs: string[] }).__notifs.push(title);
        }
      }
      Object.defineProperty(window, 'Notification', {
        value: FakeNotification,
        configurable: true,
      });
      const base = {
        location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
        count: 3,
        photos: [],
        visibility: 'private',
        createdAt: '2026-08-01T09:00:00.000Z',
      };
      localStorage.setItem(
        'fishlog_catches',
        JSON.stringify([
          { ...base, id: 'j1', date: '2026-04-01', species: '주꾸미' },
          { ...base, id: 'j2', date: '2026-04-05', species: '주꾸미' },
        ]),
      );
    });

  test('fires once on boot inside the window, and never again on reload', async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await seed(page);
    await page.goto('/');

    // 발화 1회 + dedupe 마커 기록.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as unknown as { __notifs?: string[] }).__notifs ?? [],
          ),
        { timeout: 15000 },
      )
      .toContain('주꾸미 금어기 해제 임박');
    const marker = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('biteLog_seasonOpenNotified') ?? '[]'),
    );
    expect(marker).toContain('주꾸미|2026-09-01');

    // 재로드 — 마커가 있으므로 이번 로드에선 발화 0회.
    await page.clock.setFixedTime(FIXED_NOW);
    await page.reload();
    await page.waitForTimeout(3000);
    const secondLoad = await page.evaluate(
      () => (window as unknown as { __notifs?: string[] }).__notifs ?? [],
    );
    expect(secondLoad).toEqual([]);
  });

  // 교차검수가 잡은 버그의 회귀 고정: 권한이 거부돼 발화가 생략되면
  // 마커를 찍지 않아야 다음 앱 오픈에서 재시도된다. (수정 전 코드는
  // 미발화도 마킹해 그 해 내내 침묵하는 버그였다.)
  test('denied permission — no firing AND no marker, so the retry window stays open', async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await seed(page);
    await page.addInitScript(() => {
      (window.Notification as unknown as { permission: string }).permission =
        'denied';
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    expect(
      await page.evaluate(
        () => (window as unknown as { __notifs?: string[] }).__notifs ?? [],
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(() =>
        localStorage.getItem('biteLog_seasonOpenNotified'),
      ),
    ).toBeNull();
  });

  test('no records — no alert, no marker', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await page.addInitScript(() => {
      class FakeNotification {
        static permission = 'granted';
        static requestPermission() {
          return Promise.resolve('granted');
        }
        constructor(title: string) {
          (window as unknown as { __notifs: string[] }).__notifs ??= [];
          (window as unknown as { __notifs: string[] }).__notifs.push(title);
        }
      }
      Object.defineProperty(window, 'Notification', {
        value: FakeNotification,
        configurable: true,
      });
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    expect(
      await page.evaluate(
        () => (window as unknown as { __notifs?: string[] }).__notifs ?? [],
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(() =>
        localStorage.getItem('biteLog_seasonOpenNotified'),
      ),
    ).toBeNull();
  });
});
