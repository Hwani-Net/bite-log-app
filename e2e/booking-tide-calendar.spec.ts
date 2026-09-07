import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const makeTides = (date: string, station = '군산', offset = 0) => ({ header: { resultCode: '00' }, body: { items: { item:
  [['03:49', 679, '1'], ['10:32', 48, '2'], ['16:11', 708 + offset, '3'], ['22:56', 65, '4']]
    .map(([time, level, code]) => ({ obsvtrNm: station, predcDt: `${date} ${time}`, predcTdlvVl: level, extrSe: code })),
} } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-07T03:00:00Z'));
  await page.route('**/api/boat-listings*', r => r.fulfill({ json: { ok: true, boats: [], rawCount: 0, total: 0, page: 1 } }));
  await page.route('**/api/sunsang24*', r => r.fulfill({ json: { ok: true, schedules: [] } }));
  await page.route('**/api/boat-directory*', r => r.fulfill({ json: { ok: true, boats: [
    { shipId: 'test', name: '검증선', harbor: '홍원항', seaRegion: '서해권', province: '', area: '', imageUrl: '', detailUrl: '' },
  ] } }));
});

for (const width of [390, 1280]) {
  test(`${width}px: custom date calendar, every selectable day, station, month and keyboard`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const requests: string[] = [];
    await page.route('**/api/tide?*', r => {
      const p = new URL(r.request().url()).searchParams;
      const rawDate = p.get('reqDate')!;
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6)}`;
      const station = p.get('obsCode') === 'DT_0004' ? '제주' : '군산';
      requests.push(`${p.get('obsCode')}:${date}`);
      return r.fulfill({ json: makeTides(date, station, station === '제주' ? 10 : 0) });
    });
    await page.goto('/booking');
    await page.getByRole('group', { name: '지역 필터', exact: true }).getByRole('button', { name: '서해', exact: true }).click();
    await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '홍원항', exact: true }).click();
    const input = page.getByLabel('출조 날짜', { exact: true });
    await input.click();
    const calendar = page.getByRole('region', { name: '출조 물때 달력' });
    await expect(calendar).toBeVisible();
    await expect(calendar.locator('[data-date="2026-09-28"]')).toHaveAttribute('aria-label', /9물 조류 강함 추정 고저차 660cm/);
    await expect(calendar.locator('[data-date="2026-09-06"]')).toBeDisabled();
    await expect(page.getByRole('button', { name: '물때 이전 달' })).toBeDisabled();
    // Every future September day is clicked, and reopening reuses successful data.
    for (let day = 7; day <= 30; day++) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      await calendar.locator(`[data-date="${date}"]`).click();
      await expect(input).toHaveValue(date);
      await expect(calendar).toHaveCount(0);
      await expect(page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '홍원항', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await input.press('Enter');
    }
    expect(requests.filter(s => s.startsWith('DT_0018:2026-09')).length).toBe(30);
    await page.getByLabel('고저차 기준 지점', { exact: true }).selectOption('DT_0004');
    await expect(calendar.locator('[data-date="2026-09-28"]')).toHaveAttribute('aria-label', /10물.*670cm/);
    await page.getByRole('button', { name: '물때 다음 달' }).click();
    await expect(calendar.locator('[data-date="2026-10-01"]')).toHaveAttribute('aria-label', /670cm/);
    await expect(calendar.locator('[data-date^="2026-09"]')).toHaveCount(0);
    await page.getByRole('button', { name: '물때 이전 달' }).click();
    await page.getByRole('button', { name: '물때 달력 닫기' }).click();
    await expect(input).toBeFocused();
    await input.press('Enter');
    await input.press('Escape');
    await expect(calendar).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('failed tide request stays missing, retries, and does not block date selection', async ({ page }) => {
  let failing = true;
  await page.route('**/api/tide?*', r => {
    const p = new URL(r.request().url()).searchParams;
    const day = p.get('reqDate')!.slice(6);
    if (day === '28' && failing) return r.fulfill({ status: 503, json: { error: 'tide_fetch_failed' } });
    return r.fulfill({ json: makeTides(`2026-09-${day}`) });
  });
  await page.goto('/booking');
  await page.getByRole('group', { name: '지역 필터', exact: true }).getByRole('button', { name: '서해', exact: true }).click();
  await page.getByLabel('출조 날짜', { exact: true }).fill('2026-09-28');
  await page.getByRole('button', { name: '물때·고저차 달력 보기' }).click();
  await expect(page.getByRole('button', { name: '고저차 다시 시도' })).toBeVisible();
  await expect(page.getByTestId('selected-tide-summary')).toContainText('고저차 미제공');
  await expect(page.locator('[data-date="2026-09-28"] [data-testid="tide-range"]')).toHaveText('—');
  failing = false;
  await page.getByRole('button', { name: '고저차 다시 시도' }).click();
  await expect(page.getByTestId('selected-tide-summary')).toContainText('660cm');
  await page.locator('[data-date="2026-09-28"]').click();
  await expect(page.getByLabel('출조 날짜', { exact: true })).toHaveValue('2026-09-28');
});

test('real KHOA data: Hongwon September 28 calendar agrees with upstream response', async ({ page, request }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await request.get('/api/tide?obsCode=DT_0018&reqDate=20260928');
  expect(response.ok()).toBe(true);
  const raw = await response.json();
  const items = raw.body.items.item;
  expect(items.every((i: { obsvtrNm: string; predcDt: string }) => i.obsvtrNm === '군산' && i.predcDt.startsWith('2026-09-28'))).toBe(true);
  const highs = items.filter((i: { extrSe: string }) => ['1', '3'].includes(String(i.extrSe))).map((i: { predcTdlvVl: number }) => i.predcTdlvVl);
  const lows = items.filter((i: { extrSe: string }) => ['2', '4'].includes(String(i.extrSe))).map((i: { predcTdlvVl: number }) => i.predcTdlvVl);
  const range = Math.round(Math.max(...highs) - Math.min(...lows));
  await page.goto('/booking');
  await page.getByRole('group', { name: '지역 필터', exact: true }).getByRole('button', { name: '서해', exact: true }).click();
  await page.getByRole('group', { name: '항구 필터', exact: true }).getByRole('button', { name: '홍원항', exact: true }).click();
  await page.getByLabel('출조 날짜', { exact: true }).fill('2026-09-28');
  await page.getByRole('button', { name: '물때·고저차 달력 보기' }).click();
  const calendar = page.getByRole('region', { name: '출조 물때 달력' });
  await expect(calendar.locator('[data-date="2026-09-28"]')).toHaveAttribute('aria-label', new RegExp(`9물.*${range}cm`), { timeout: 30000 });
  await expect(calendar.getByTestId('tide-range').filter({ hasText: '…' })).toHaveCount(0, { timeout: 30000 });
  const directory = path.resolve('.codex/visual-evidence', `${Date.now()}-booking-tides-390`);
  await mkdir(directory, { recursive: true });
  // Taller capture after the 390×844 checks keeps the fixed navigation from
  // obscuring the attribution at the bottom of the full calendar element.
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.getByTestId('booking-date-picker').screenshot({ path: path.join(directory, 'calendar.png') });
  await writeFile(path.join(directory, 'result.json'), JSON.stringify({ url: page.url(), date: '2026-09-28', tideSource: 'real KHOA API (not mocked)', boatFixtures: true, station: '군산', range, raw }, null, 2));
});
