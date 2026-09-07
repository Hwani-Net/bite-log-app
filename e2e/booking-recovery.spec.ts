import { test, expect, type Page } from '@playwright/test';

const boat = (uid: string, port = '대천항', capacity = '10인승') => ({
  uid, name: `테스트선박${uid}`, areaPath: `서해권 > 충남 > ${port}`,
  seaRegion: '서해권', capacity, fishTypes: '주꾸미', imageUrl: '', detailUrl: '',
});

const calendar = (uid: string, ym: string, status = 'available') => ({
  ok: true, ym,
  meta: { uid, name: `테스트선박${uid}`, areaPath: '서해권 > 홍원항', imageUrl: '',
    fishTags: ['주꾸미'], capacity: '20인승', detailUrl: `https://thefishing.kr/reservation/schedule.php?uid=${uid}`,
    bookingUrl: 'https://operator.example/reservation' },
  days: [{ day: 25, date: `${ym.slice(0, 4)}-${ym.slice(4)}-25`, tide: '조금', status, remainingSeats: 3 }],
});

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-25T03:00:00Z'));
  await page.route('**/api/boat-directory*', r => r.fulfill({ json: {
    ok: true, totalCached: 2, boats: ['오천항', '홍원항'].map((harbor, i) => ({
      shipId: String(i), name: `디렉터리${i}`, harbor, seaRegion: '서해권',
      province: '', area: '', imageUrl: '', detailUrl: '',
    })),
  } }));
  await page.route('**/api/sunsang24*', r => r.fulfill({ json: { ok: true, schedules: [], total: 0 } }));
  await page.route('**/api/boat-calendar*', r => {
    const p = new URL(r.request().url()).searchParams;
    return r.fulfill({ json: calendar(p.get('uid')!, p.get('ym')!, p.get('uid') === '1' ? 'full' : 'available') });
  });
});

async function listings(page: Page, pages = [[boat('1')], [boat('2', '오천항', '20인승')]]) {
  await page.route('**/api/boat-listings*', r => {
    const n = Number(new URL(r.request().url()).searchParams.get('page'));
    const boats = pages[n - 1] ?? [];
    return r.fulfill({ json: { ok: true, boats, rawCount: boats.length, total: 40, page: n } });
  });
}

for (const filter of ['항구', '정원', '검색어', '예약가능']) {
  test(`첫 페이지 0건이어도 ${filter} 필터의 다음 페이지 선박을 찾는다`, async ({ page }) => {
    await listings(page);
    await page.goto('/booking');
    await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(1);
    if (filter === '항구') await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '오천항', exact: true }).click();
    if (filter === '정원') await page.getByRole('group', { name: '정원 필터', exact: true }).getByRole('button', { name: /대형/ }).click();
    if (filter === '검색어') await page.getByRole('textbox', { name: '선박 통합 검색' }).fill('테스트선박2');
    if (filter === '예약가능') await page.getByRole('button', { name: '예약 가능만', exact: true }).click();
    await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(0);
    await page.getByRole('button', { name: '다음 페이지 확인', exact: true }).click();
    await expect(page.getByTestId('search-results').getByText('테스트선박2', { exact: true })).toBeVisible();
  });
}

test('중복 UID를 합치고 원본 빈 페이지에서 더보기를 종료한다', async ({ page }) => {
  await listings(page, [[boat('1')], [boat('1'), boat('2')]]);
  await page.goto('/booking');
  await page.getByRole('button', { name: /^더 보기/ }).click();
  await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(2);
  await page.getByRole('button', { name: /^더 보기/ }).click();
  await expect(page.getByRole('button', { name: /^더 보기/ })).toHaveCount(0);
  await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(2);
});

test('디렉터리 캐시가 비어도 홍원항을 선택하고 다음 페이지 배를 찾는다', async ({ page }) => {
  await page.route('**/api/boat-directory*', r => r.fulfill({ json: { ok: true, boats: [], totalCached: 0 } }));
  await listings(page, [[boat('1')], [boat('2', '홍원항')]]);
  await page.goto('/booking');
  await page.getByRole('group', { name: '지역 필터', exact: true }).getByRole('button', { name: '서해', exact: true }).click();
  await expect(page.getByTestId('boat-search')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '홍원항', exact: true }).click();
  await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(0);
  await page.getByRole('button', { name: '다음 페이지 확인', exact: true }).click();
  await expect(page.getByTestId('search-results').getByText('테스트선박2', { exact: true })).toBeVisible();
});

test('0건 필터에서 실패한 페이지를 건너뛰지 않고 다시 시도한다', async ({ page }) => {
  const requests: number[] = [];
  let failing = true;
  await page.route('**/api/boat-listings*', r => {
    const n = Number(new URL(r.request().url()).searchParams.get('page'));
    requests.push(n);
    if (n === 2 && failing) return r.fulfill({ status: 503, json: { ok: false } });
    const boats = n === 1 ? [boat('1')] : [boat('2', '오천항')];
    return r.fulfill({ json: { ok: true, boats, total: 40, page: n, rawCount: 1 } });
  });
  await page.goto('/booking');
  await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(1);
  await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '오천항', exact: true }).click();
  await page.getByRole('button', { name: '다음 페이지 확인', exact: true }).click();
  await expect(page.getByTestId('search-retry')).toBeVisible({ timeout: 10000 });
  failing = false;
  await page.getByTestId('search-retry').click();
  await expect(page.getByTestId('search-results').getByText('테스트선박2', { exact: true })).toBeVisible();
  expect(requests.filter(n => n > 1)).toEqual([2, 2, 2]);
});

test('목록의 일시 503은 한 번 자동 재시도해 복구한다', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/boat-listings*', r => ++requests === 1
    ? r.fulfill({ status: 503, json: { ok: false } })
    : r.fulfill({ json: { ok: true, boats: [boat('1')], rawCount: 1, total: 1, page: 1 } }));
  await page.goto('/booking');
  await expect(page.getByTestId('search-results').getByTestId('boat-card')).toHaveCount(1, { timeout: 10000 });
  expect(requests).toBe(2);
});

test('월이 달라도 hydration 오류가 없고 실제 클라이언트 날짜를 쓴다', async ({ page }) => {
  await listings(page);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2030-12-15T03:00:00Z'));
  await page.goto('/booking');
  await expect(page.getByText('12월 추천 포인트', { exact: true })).toBeVisible();
  await expect(page.locator('input[type="date"]').first()).toHaveValue('2030-12-15');
  expect(errors.filter(e => /hydration|#418/i.test(e))).toEqual([]);
});

test('모바일 필터가 잘리지 않고 초기화 후 전체 선택을 유지한다', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 36.35, longitude: 126.58 });
  await page.setViewportSize({ width: 390, height: 844 });
  await listings(page);
  await page.goto('/booking');
  await expect(page.getByRole('group', { name: '지역 필터', exact: true }).getByRole('button', { name: '서해', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '오천항', exact: true }).click();
  const date = await page.locator('input[type="date"]').first().inputValue();
  await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
  for (const name of ['지역 필터', '어종 필터', '항구 필터', '정원 필터']) {
    await expect(page.getByRole('group', { name, exact: true }).getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.locator('input[type="date"]').first()).toHaveValue(date);
  expect(await page.getByTestId('port-filter').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.getByTestId('capacity-filter').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('상세 장애는 무한 skeleton 대신 재시도와 원본 링크를 제공한다', async ({ page }) => {
  let failing = true;
  await page.route('**/api/boat-calendar*', r => failing
    ? r.fulfill({ status: 503, json: { ok: false } })
    : r.fulfill({ json: calendar('2', '202609') }));
  await page.goto('/booking/boat/2?date=2026-09-25');
  await expect(page.getByRole('button', { name: '예약 현황 다시 시도' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: '더피싱에서 직접 보기' })).toHaveAttribute('href', /uid=2/);
  await expect(page.getByTestId('boat-header-loading')).toHaveCount(0);
  failing = false;
  await page.getByRole('button', { name: '예약 현황 다시 시도' }).click();
  await expect(page.getByRole('heading', { name: '테스트선박2', exact: true })).toBeVisible();
  await expect(page.getByLabel('탄 날짜')).toHaveValue('2026-09-25');
  await expect(page.getByRole('link', { name: '25일 예약하기' })).toBeVisible();
});

test('월 이동 중 이전 달 예약 버튼을 보여주지 않는다', async ({ page }) => {
  let release: (() => void) | undefined;
  await page.route('**/api/boat-calendar*', async r => {
    const ym = new URL(r.request().url()).searchParams.get('ym')!;
    if (ym === '202610') await new Promise<void>(resolve => { release = resolve; });
    return r.fulfill({ json: calendar('2', ym) });
  });
  await page.goto('/booking/boat/2?date=2026-09-25');
  await expect(page.getByRole('link', { name: '25일 예약하기' })).toBeVisible();
  await page.getByRole('button', { name: '다음 달', exact: true }).click();
  await expect.poll(() => !!release).toBe(true);
  await expect(page.getByRole('link', { name: '25일 예약하기' })).toHaveCount(0);
  await expect(page.locator('button[data-bite-grade]')).toHaveCount(0);
  release?.();
  await expect(page.locator('button[data-bite-grade]')).toHaveCount(1);
});

test('달력의 잘못된 성공 응답을 빈 달력으로 표시하지 않는다', async ({ page }) => {
  await page.route('**/api/boat-calendar*', r => r.fulfill({ json: { ok: true, meta: { name: '잘못된 응답' } } }));
  await page.goto('/booking/boat/2?date=2026-09-25');
  await expect(page.getByRole('button', { name: '예약 현황 다시 시도' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '잘못된 응답' })).toHaveCount(0);
});

test('요청한 월과 다른 달력을 거부하고 상세 첫 렌더의 날짜 불일치도 없다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2030-12-15T03:00:00Z'));
  await page.route('**/api/boat-calendar*', r => r.fulfill({ json: calendar('2', '202609') }));
  await page.goto('/booking/boat/2');
  await expect(page.getByText('2030년 12월', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '예약 현황 다시 시도' })).toBeVisible();
  await expect(page.locator('button[data-bite-grade]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
