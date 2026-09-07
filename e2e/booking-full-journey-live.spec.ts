import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 2026-09-06 사용자 지적 — "실제 예약 및 날짜 선택 후 메인화면 돌아가기등도 다
// 테스트 해본거야?" 기존 booking.spec.ts는 각 화면을 조각조각(검색·필터·달력·
// 링크 목적지)으로만 검증했고, 홈 → 검색 → 상세 → 날짜선택 → 예약 링크 →
// 뒤로가기 → 홈까지 실사용자처럼 하나로 이어서 확인하는 테스트가 없었다.
//
// 이 테스트는 라이브 배포(mock 없음, 실제 thefishing.kr 데이터)에서 그 전체
// 여정을 검증한다(BOOKING_LIVE_URL로 로컬 빌드도 지정 가능). "실제 예약"은 BITE Log가 처리하지 않는다 — 예약·결제는
// 선사 홈페이지(제3자 사이트)에서 이루어진다(boat/[uid]/page.tsx 마지막 안내
// 문구 참고). 그래서 여기서는 그 경계까지: 예약 링크가 올바른 목적지(선사
// 사이트; aceho.thefishing.kr 같은 선사 전용 서브도메인 포함)를 가리키고 새 탭(target=_blank)으로 열려 BiteLog
// 세션을 잃지 않는지까지만 확인하고, 실제로 제3자 사이트에 들어가 결제하지는
// 않는다 — 그건 진짜 돈이 오가는 행위라 자동화 테스트의 대상이 될 수 없다.
const LIVE = process.env.BOOKING_LIVE_URL || 'https://bite-log-three.vercel.app';
const DATE = process.env.BOOKING_DATE || '2026-09-25';

for (const { port, width, height } of [
  { port: '홍원항', width: 1280, height: 900 },
  { port: '오천항', width: 1280, height: 900 },
  { port: '홍원항', width: 390, height: 844 },
]) {
test(`${port} ${width}px: 홈 → ${DATE} 서해 → 항구 → 더보기 → 상세 → 예약 링크 → 뒤로 → 홈`, async ({
  page,
}) => {
  test.setTimeout(180_000);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const evidence = path.resolve('.codex/visual-evidence', `${stamp}-${port === '홍원항' ? 'hongwon' : 'ocheon'}-${width}`);
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width, height });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  // 1) 홈
  await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page).toHaveTitle(/BITE Log|바이트로그/);
  await expect(page.getByText('조과 (마리)')).toBeVisible({ timeout: 10000 });

  // 2) 하단 네비 "예약" 탭을 실제로 클릭해 이동 (직접 goto가 아니라 실사용
  //    내비게이션 경로 그대로).
  await page.locator('nav').getByRole('link', { name: '예약' }).click();
  await page.waitForURL(/\/booking$/, { timeout: 15000 });
  const search = page.getByTestId('boat-search');
  await expect(search).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
  await page.locator('input[type="date"]').first().fill(DATE);

  // 3) 지역 필터로 좁힌다 — 서해가 보통 표본이 가장 많다.
  await page
    .locator('[role="group"][aria-label="지역 필터"]')
    .getByRole('button', { name: '서해', exact: true })
    .click();
  await expect(search).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
  await expect(page.getByTestId('search-retry')).toHaveCount(0);
  await page.getByRole('group', { name: '항구 필터', exact: true })
    .getByRole('button', { name: port, exact: true }).click({ timeout: 20000 });

  // The trip picker also uses real KHOA data in this journey (no route mocks).
  await page.getByRole('button', { name: '물때·고저차 달력 보기', exact: true }).click();
  const tideCalendar = page.getByRole('region', { name: '출조 물때 달력', exact: true });
  const tideDay = tideCalendar.locator(`[data-date="${DATE}"]`);
  await expect(tideDay.getByTestId('tide-range')).toHaveText(/^\d+$/, { timeout: 90000 });
  const stationCode = await page.getByRole('combobox', { name: '고저차 기준 지점' }).inputValue();
  const tideResponse = await page.request.get(`${LIVE}/api/tide?obsCode=${stationCode}&reqDate=${DATE.replaceAll('-', '')}`);
  expect(tideResponse.ok()).toBe(true);
  const tideRaw = await tideResponse.json();
  const tideItems = tideRaw.body.items.item as { extrSe: string; predcTdlvVl: number }[];
  const high = tideItems.filter(t => ['1', '3'].includes(String(t.extrSe))).map(t => t.predcTdlvVl);
  const low = tideItems.filter(t => ['2', '4'].includes(String(t.extrSe))).map(t => t.predcTdlvVl);
  const rangeCm = Math.round(Math.max(...high) - Math.min(...low));
  await expect(tideDay.getByTestId('tide-range')).toHaveText(String(rangeCm));
  await tideDay.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, 'tides.png') });
  await tideDay.click();
  await expect(page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: port, exact: true })).toHaveAttribute('aria-pressed', 'true');

  // A first-page zero is not an empty search. Follow real UI pagination,
  // bounded to seven pages, and verify UID uniqueness after every append.
  const cards = page.getByTestId('search-results').getByTestId('boat-card');
  for (let n = 0; n < 6; n++) {
    if (n >= 2 && await cards.count()) break;
    const more = search.getByRole('button', { name: /^더 보기|^다음 페이지 확인$/ });
    if (await more.count() === 0) break;
    await more.click();
    await expect(search).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
    await expect(page.getByTestId('search-retry')).toHaveCount(0);
    const hrefs = await cards.locator('a[href^="/booking/boat/"]').evaluateAll(els => els.map(el => el.getAttribute('href')));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  }

  const card = cards.first();
  await expect(card).toBeVisible({ timeout: 20000 });
  const names = await cards.locator('h4').allTextContents();
  const observed = { target: LIVE, date: DATE, port, width, names, checkedAt: new Date().toISOString() };
  expect(await page.getByTestId('port-filter').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByTestId('capacity-filter').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, 'filters.png') });

  // 4) 카드를 실제로 클릭해 배 상세/달력 페이지로 이동.
  await card.locator('a[href^="/booking/boat/"]').click();
  await page.waitForURL(/\/booking\/boat\/\d+/, { timeout: 15000 });
  const calendar = page.getByRole('region', { name: '예약 달력' });
  await expect(calendar).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
  await expect(page.getByRole('button', { name: '예약 현황 다시 시도' })).toHaveCount(0);
  await expect(page.getByLabel('탄 날짜')).toHaveValue(DATE);
  await expect(page.getByText(`${DATE.slice(0, 4)}년 ${Number(DATE.slice(5, 7))}월`, { exact: true })).toBeVisible();

  // 5) 예약 가능일을 찾는다 — 이번 달에 없으면 최대 3개월 앞까지 넘겨본다
  //    (라이브 데이터라 특정 달에 마감/출조없음만 있을 수 있다).
  await expect(calendar.getByText('남은 0명', { exact: true })).toHaveCount(0);
  let availableDay = page.locator('button').filter({ hasText: /남은 [1-9]\d*명/ }).first();
  for (let i = 0; i < 3 && (await availableDay.count()) === 0; i++) {
    await page.getByLabel('다음 달').click();
    await expect(calendar).toHaveAttribute('aria-busy', 'false', { timeout: 40000 });
    await expect(page.getByRole('button', { name: '예약 현황 다시 시도' })).toHaveCount(0);
    availableDay = page.locator('button').filter({ hasText: /남은 [1-9]\d*명/ }).first();
  }
  await expect(availableDay).toBeVisible({ timeout: 10000 });
  // Exercise an actual date click, including the already-selected-day toggle.
  const availableDate = await availableDay.innerText();
  const alreadySelected = (await availableDay.getAttribute('class'))?.includes('ring-2');
  await availableDay.click();
  if (alreadySelected) await availableDay.click();

  // 6) 날짜 선택 후 예약 링크 — 목적지만 확인하고 클릭(=제3자 실결제)은 하지 않는다.
  await expect(page.getByText(/남은인원 [1-9]\d*명/)).toBeVisible();
  const reserveLink = page.getByRole('link', { name: /\d+일 예약하기/ });
  await expect(reserveLink).toBeVisible();
  const href = await reserveLink.getAttribute('href');
  expect(href).toBeTruthy();
  const reservationUrl = new URL(href!);
  expect(['http:', 'https:']).toContain(reservationUrl.protocol);
  // The central directory is not an operator site, but thefishing hosts
  // genuine operator homepages on subdomains (e.g. aceho.thefishing.kr).
  expect(reservationUrl.hostname).not.toMatch(/^(www\.)?thefishing\.kr$/);
  expect(reservationUrl.origin).not.toBe(new URL(LIVE).origin);
  await expect(reserveLink).toHaveAttribute('target', '_blank');
  await reserveLink.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(evidence, 'calendar.png') });
  const detail = { target: page.url(), name: await page.locator('h1').innerText(), availableDate, reserveLink: await reserveLink.innerText(), href };

  // 7) 뒤로가기 — /booking으로 돌아오고, 골랐던 서해 필터가 남아 있어야 한다
  //    (2026-08-31 세션필터복원 수정이 라이브에서도 실제로 유지되는지).
  await page.goBack();
  await page.waitForURL(/\/booking$/, { timeout: 15000 });
  await expect(
    page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '서해', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 });
  await expect(page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: port, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('input[type="date"]').first()).toHaveValue(DATE);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // 8) 메인화면(홈)으로 완전히 복귀 — 하단 네비 "홈"을 클릭.
  await page.locator('nav').getByRole('link', { name: '홈' }).click();
  await page.waitForURL(`${LIVE}/`, { timeout: 15000 });
  await expect(page.getByText('조과 (마리)')).toBeVisible({ timeout: 10000 });
  // 여정 끝에서도 화면이 깨지지 않고 정상 인터랙티브 상태인지 — 하단 네비가
  // "홈" 탭을 활성으로 표시하는지까지 확인한다.
  await expect(
    page.locator('nav').getByRole('link', { name: '홈' }),
  ).toHaveClass(/text-\[#c9a84c\]/);
  expect(errors).toEqual([]);
  const result = { ...observed, detail, tides: { stationCode, rangeCm, raw: tideRaw }, mockedApis: false, errors, completeJourney: true, externalReservationSubmitted: false };
  await writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ evidence, ...result }));
});
}
