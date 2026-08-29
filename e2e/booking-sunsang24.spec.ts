import { test, expect } from '@playwright/test';

// 2026-08-29 — 선상24를 세 번째 검색 소스로 연동(사용자 지시로 조사 후
// 진행). 날짜별 실제 스케줄이 있는 게 낚시뚜와 다른 점이라, 지역·날짜가
// 바뀌면 이전 조건의 결과가 남지 않아야 한다 — searchBoats·directoryBoats
// 에 이미 적용한 것과 같은 원칙.

const schedule = (no: number, shipName: string, fishType: string) => ({
  scheduleNo: no,
  shipNo: no,
  shipName,
  areaMain: '충남',
  areaSub: '태안',
  seaRegion: '서해권',
  portName: '마검포항',
  imageUrl: '',
  sdate: '2026-08-31',
  stime: '05:00:00',
  etime: '16:00:00',
  price: 100000,
  fishType,
  fishingMethod: null,
  remainSeats: 3,
  totalSeats: 20,
  statusName: '예약가능',
  detailUrl: `https://www.sunsang24.com/ship/detail/${no}`,
});

test.describe('선상24 — /booking', () => {
  test('선상24 스케줄이 별도 섹션에 렌더된다', async ({ page }) => {
    await page.route('**/api/sunsang24-listings*', (r) =>
      r.fulfill({
        json: {
          ok: true,
          schedules: [schedule(1, '자연피싱호', '백조기')],
          total: 1,
          page: 1,
        },
      }),
    );
    await page.goto('/booking');
    await expect(page.getByText('선상24 실시간 예약')).toBeVisible({ timeout: 15000 });
    const results = page.locator('[data-testid="sunsang24-results"]');
    await expect(results.getByText('자연피싱호')).toBeVisible();
    await expect(results.getByText('백조기')).toBeVisible();
  });

  test('지역을 바꾸면 이전 지역의 선상24 결과가 남지 않는다', async ({
    page,
  }) => {
    let region = '';
    await page.route('**/api/sunsang24-listings*', (r) => {
      region = new URL(r.request().url()).searchParams.get('region') ?? '';
      const list =
        region === '3'
          ? [schedule(2, '남해호', '갈치')]
          : [schedule(1, '서해호', '백조기')];
      return r.fulfill({ json: { ok: true, schedules: list, total: 1, page: 1 } });
    });
    await page.goto('/booking');
    await expect(
      page.locator('[data-testid="sunsang24-results"]').getByText('서해호'),
    ).toBeVisible({ timeout: 15000 });

    await page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '남해', exact: true })
      .click();

    await expect
      .poll(() => region, { timeout: 10000 })
      .toBe('3');
    await expect(
      page.locator('[data-testid="sunsang24-results"]').getByText('남해호'),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('서해호')).toHaveCount(0);
  });

  test('요청이 실패하면 실패 문구가 뜨고 이전 결과가 남지 않는다', async ({
    page,
  }) => {
    await page.route('**/api/sunsang24-listings*', (r) =>
      r.fulfill({ status: 503, json: { ok: false, error: 'fetch_failed' } }),
    );
    await page.goto('/booking');
    await expect(
      page
        .locator('section', { has: page.getByText('선상24 실시간 예약') })
        .getByText('선박 목록을 지금 불러오지 못했습니다'),
    ).toBeVisible({ timeout: 15000 });
  });
});
