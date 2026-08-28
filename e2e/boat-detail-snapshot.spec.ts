import { test, expect } from '@playwright/test';

// 2026-08-28 전수조사에서 발견: 배 상세 화면(/booking/boat/[uid])에서
// 달력 월만 넘겨도 "가격 변동" 배너가 떴다. 원인은 priceLine을 "지금 보는
// 달의 첫 가격 표시일"로 뽑아서, 가격 정보가 없는 달(과거월 등)로 넘기면
// 실제로는 가격이 그대로인데도 이전 스냅샷과 달라져 변경으로 오판했다.

const calendarFor = (priceLine?: string) => ({
  ok: true,
  meta: {
    uid: '9999',
    stUid: '1',
    name: '테스트호',
    areaPath: '서해권 > 충청남도 > 보령시 > 대천항',
    capacity: '12인승',
    fishTags: ['문어'],
    imageUrl: '',
    bookingUrl: '',
    detailUrl: '',
  },
  ym: '202608',
  days: priceLine
    ? [{ date: '2026-08-15', day: 15, tide: '', status: 'available', priceLine }]
    : [],
});

test('달력 월만 넘기면 가격 변동으로 오판하지 않는다', async ({ page }) => {
  const seededBoat = {
    uid: '9999',
    favorite: false,
    verdict: null,
    memo: '',
    rides: [],
    goneStreak: 0,
    snapshots: [
      {
        name: '테스트호',
        areaPath: '서해권 > 충청남도 > 보령시 > 대천항',
        priceLine: '문어 대 90,000원',
        seenAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  };
  await page.addInitScript((boat) => {
    if (localStorage.getItem('__e2e_seeded')) return;
    localStorage.setItem('__e2e_seeded', '1');
    localStorage.setItem('biteLog_myBoats', JSON.stringify({ '9999': boat }));
  }, seededBoat);

  let call = 0;
  await page.route('**/api/boat-calendar*', (route) => {
    call += 1;
    // 이번 방문(마운트) 첫 응답만 실제로 가격이 바뀐 값 — 정직한 변경
    // 감지는 계속 동작해야 한다. 이후 달을 넘기면 가격 정보가 없는 달로
    // 응답한다(과거월 등 실제로 흔한 상황).
    const priceLine = call === 1 ? '문어 대 110,000원' : undefined;
    return route.fulfill({ json: calendarFor(priceLine) });
  });

  await page.goto('/booking/boat/9999');
  await expect(page.getByText('테스트호')).toBeVisible({ timeout: 15000 });

  // 이번 방문에서 실제로 90,000 → 110,000으로 바뀐 건 정직한 변경이니
  // 배너가 떠야 한다.
  const banner = page.getByText('가격 변동').locator('..');
  await expect(banner).toContainText('90,000');
  await expect(banner).toContainText('110,000');

  // 달만 넘기면(가격 정보 없는 달) 배너 내용이 그대로여야 한다 — "110,000
  // → 정보 없음"으로 바뀌면 회귀다.
  await page.getByRole('button', { name: '다음 달' }).click();
  await page.waitForTimeout(1500);
  await expect(banner).toContainText('90,000');
  await expect(banner).toContainText('110,000');
  await expect(page.getByText('정보 없음')).toHaveCount(0);

  await page.getByRole('button', { name: '다음 달' }).click();
  await page.waitForTimeout(1500);
  await expect(banner).toContainText('90,000');
  await expect(banner).toContainText('110,000');
  await expect(page.getByText('정보 없음')).toHaveCount(0);
});
