import { test, expect } from '@playwright/test';

// 4차 GOAL-5 — 거짓 문구·조용한 가짜 정리 검증.
test.describe('Dead-code & honesty cleanup', () => {
  test('/alerts no longer describes the never-run notice parser', async ({
    page,
  }) => {
    await page.goto('/alerts');
    await expect(page.getByText('어떻게 작동하나요?')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/공지 파서/)).toHaveCount(0);
    await expect(page.getByText(/금어기 해제 임박/)).toBeVisible();
  });

  test('a mock tide announces itself and never reaches the saved record', async ({
    page,
    context,
  }) => {
    await context.setGeolocation({ latitude: 36.33, longitude: 126.51 });
    await context.grantPermissions(['geolocation']);
    // KHOA 경로 차단 → tideService가 mock 폴백으로 떨어진다.
    await page.route('**/api/tide**', (r) =>
      r.fulfill({ status: 503, json: { error: 'blocked' } }),
    );

    // bite-forecast: 조석 시간표에 "예시" 배지.
    await page.goto('/bite-forecast');
    await expect(
      page.locator('[data-testid="tide-mock-badge"]'),
    ).toBeVisible({ timeout: 25000 });

    // record: 자동 감지된 mock 물때가 표시엔 "예시"로 뜨고, 저장된
    // 기록에는 tide가 아예 없다(가짜가 통계·조건표를 오염시키지 않음).
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();
    await expect(page.getByText(/예시 — 기록엔 저장 안 됨/)).toBeVisible({
      timeout: 20000,
    });
    await page.getByLabel('어종').selectOption('우럭');
    await page.getByRole('button', { name: '기록 저장' }).click();
    await page.waitForURL('/', { timeout: 15000 });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]'),
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].tide).toBeUndefined();
    expect(saved[0].weather).toBeTruthy(); // 날씨(실 API)는 정상 저장
  });
});
