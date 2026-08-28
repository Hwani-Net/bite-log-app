import { test, expect } from '@playwright/test';
import fs from 'fs';

// 4차 GOAL-3 — 설정 정직화. 토글은 실제 저장소에 쓰고, 초기화는 열거한
// 키를 진짜 지우고, 내려받기는 진짜 파일을 만든다.
test.describe('Settings honesty — /settings', () => {
  test('toggles write to the enforced prefs store, quiet hours persist', async ({
    page,
  }) => {
    await page.goto('/settings');
    const seasonToggle = page.getByRole('checkbox', {
      name: '금어기 해제 임박 알림',
    });
    await expect(seasonToggle).toBeVisible({ timeout: 15000 });
    await expect(seasonToggle).toBeChecked(); // 기본 on

    // sr-only(clip) 체크박스는 물리 좌표 클릭이 닿지 않는다 — 요소에
    // 직접 click()을 보내 토글+change 이벤트를 발생시킨다.
    await seasonToggle.evaluate((el) => (el as HTMLInputElement).click());
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('fishlog_notification_prefs') ?? '{}',
            ).seasonOpenAlert,
        ),
      )
      .toBe(false);
    // 죽은 키(biteLog_notif_*)에는 아무것도 쓰지 않는다.
    expect(
      await page.evaluate(() => localStorage.getItem('biteLog_notif_biteTime')),
    ).toBeNull();

    await page.getByLabel('방해 금지 시작').selectOption('21');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('fishlog_notification_prefs') ?? '{}',
            ).quietHoursStart,
        ),
      )
      .toBe(21);
  });

  test('reset really deletes every enumerated key (logged-out path)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // 초기화가 reload로 끝나는데 init script는 매 내비게이션마다 돌므로,
      // 1회만 시딩(가드 키는 초기화 대상이 아니라 살아남는다).
      if (localStorage.getItem('__e2e_seeded')) return;
      localStorage.setItem('__e2e_seeded', '1');
      localStorage.setItem('fishlog_catches', JSON.stringify([{ id: 'r1', date: '2026-08-01', species: '우럭', count: 1, photos: [], visibility: 'private', location: { name: '오천항' }, createdAt: 'x' }]));
      localStorage.setItem('bitelog_alert_subscriptions', '[]');
      localStorage.setItem('biteLog_tripAlert', '{"tripDate":"2026-09-01"}');
      localStorage.setItem('biteLog_seasonOpenNotified', '["주꾸미|2026-09-01"]');
      localStorage.setItem('fishlog_likes', '["a"]');
    });
    await page.goto('/settings');
    page.on('dialog', (d) => d.accept());
    await page.locator('[data-testid="reset-data"]').click();
    // 초기화는 reload로 끝난다 — poll 도중 내비게이션으로 컨텍스트가
    // 파괴될 수 있으므로 예외는 재시도로 흡수한다.
    await expect
      .poll(async () => {
        try {
          return await page.evaluate(() =>
            [
              'fishlog_catches',
              'bitelog_alert_subscriptions',
              'biteLog_tripAlert',
              'biteLog_seasonOpenNotified',
              'fishlog_likes',
            ].map((k) => localStorage.getItem(k)),
          );
        } catch {
          return 'navigating';
        }
      }, { timeout: 15000 })
      .toEqual([null, null, null, null, null]);
  });

  test('export downloads one JSON with the actual records inside', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'fishlog_catches',
        JSON.stringify([
          { id: 'ex1', date: '2026-08-01', species: '우럭', count: 3, photos: [], visibility: 'private', location: { name: '오천항' }, createdAt: 'x' },
        ]),
      );
    });
    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-all"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^bitelog-data-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const data = JSON.parse(fs.readFileSync(path!, 'utf-8'));
    expect(data.records).toHaveLength(1);
    expect(data.records[0].species).toBe('우럭');
    expect(data.exportedAt).toBeTruthy();
    expect(data.notificationPreferences).toBeTruthy();
  });
});
