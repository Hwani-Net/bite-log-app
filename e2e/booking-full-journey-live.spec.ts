import { test, expect } from '@playwright/test';

// 2026-09-06 사용자 지적 — "실제 예약 및 날짜 선택 후 메인화면 돌아가기등도 다
// 테스트 해본거야?" 기존 booking.spec.ts는 각 화면을 조각조각(검색·필터·달력·
// 링크 목적지)으로만 검증했고, 홈 → 검색 → 상세 → 날짜선택 → 예약 링크 →
// 뒤로가기 → 홈까지 실사용자처럼 하나로 이어서 확인하는 테스트가 없었다.
//
// 이 테스트는 라이브 배포(mock 없음, 실제 thefishing.kr 데이터)에서 그 전체
// 여정을 검증한다. "실제 예약"은 BITE Log가 처리하지 않는다 — 예약·결제는
// 선사 홈페이지(제3자 사이트)에서 이루어진다(boat/[uid]/page.tsx 마지막 안내
// 문구 참고). 그래서 여기서는 그 경계까지: 예약 링크가 올바른 목적지(선사
// 사이트, thefishing.kr 아님)를 가리키고 새 탭(target=_blank)으로 열려 BiteLog
// 세션을 잃지 않는지까지만 확인하고, 실제로 제3자 사이트에 들어가 결제하지는
// 않는다 — 그건 진짜 돈이 오가는 행위라 자동화 테스트의 대상이 될 수 없다.
const LIVE = 'https://bite-log-three.vercel.app';

test('홈 → 예약 검색 → 배 상세 → 날짜 선택 → 예약 링크 확인 → 뒤로가기 → 홈, 전체 여정', async ({
  page,
}) => {
  test.setTimeout(90_000);

  // 1) 홈
  await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page).toHaveTitle(/BITE Log|바이트로그/);
  await expect(page.getByText('조과 (마리)')).toBeVisible({ timeout: 10000 });

  // 2) 하단 네비 "예약" 탭을 실제로 클릭해 이동 (직접 goto가 아니라 실사용
  //    내비게이션 경로 그대로).
  await page.locator('nav').getByRole('link', { name: '예약' }).click();
  await page.waitForURL(/\/booking$/, { timeout: 15000 });

  // 3) 지역 필터로 좁힌다 — 서해가 보통 표본이 가장 많다.
  await page
    .locator('[role="group"][aria-label="지역 필터"]')
    .getByRole('button', { name: '서해', exact: true })
    .click();

  const card = page.locator('[data-testid="boat-card"]').first();
  await expect(card).toBeVisible({ timeout: 20000 });

  // 4) 카드를 실제로 클릭해 배 상세/달력 페이지로 이동.
  await card.locator('a[href^="/booking/boat/"]').click();
  await page.waitForURL(/\/booking\/boat\/\d+/, { timeout: 15000 });

  await expect(page.getByText(/\d{4}년 \d{1,2}월/)).toBeVisible({ timeout: 15000 });

  // 5) 예약 가능일을 찾는다 — 이번 달에 없으면 최대 3개월 앞까지 넘겨본다
  //    (라이브 데이터라 특정 달에 마감/출조없음만 있을 수 있다).
  let availableDay = page.locator('button').filter({ hasText: /남은 \d+명/ }).first();
  for (let i = 0; i < 3 && (await availableDay.count()) === 0; i++) {
    await page.getByLabel('다음 달').click();
    await page.waitForTimeout(800);
    availableDay = page.locator('button').filter({ hasText: /남은 \d+명/ }).first();
  }
  await expect(availableDay).toBeVisible({ timeout: 10000 });
  await availableDay.click();

  // 6) 날짜 선택 후 예약 링크 — 목적지만 확인하고 클릭(=제3자 실결제)은 하지 않는다.
  await expect(page.getByText(/남은인원 \d+명/)).toBeVisible();
  const reserveLink = page.getByRole('link', { name: /\d+일 예약하기/ });
  await expect(reserveLink).toBeVisible();
  const href = await reserveLink.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).not.toContain('thefishing.kr');
  await expect(reserveLink).toHaveAttribute('target', '_blank');

  // 7) 뒤로가기 — /booking으로 돌아오고, 골랐던 서해 필터가 남아 있어야 한다
  //    (2026-08-31 세션필터복원 수정이 라이브에서도 실제로 유지되는지).
  await page.goBack();
  await page.waitForURL(/\/booking$/, { timeout: 15000 });
  await expect(
    page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '서해', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 });

  // 8) 메인화면(홈)으로 완전히 복귀 — 하단 네비 "홈"을 클릭.
  await page.locator('nav').getByRole('link', { name: '홈' }).click();
  await page.waitForURL(`${LIVE}/`, { timeout: 15000 });
  await expect(page.getByText('조과 (마리)')).toBeVisible({ timeout: 10000 });
  // 여정 끝에서도 화면이 깨지지 않고 정상 인터랙티브 상태인지 — 하단 네비가
  // "홈" 탭을 활성으로 표시하는지까지 확인한다.
  await expect(
    page.locator('nav').getByRole('link', { name: '홈' }),
  ).toHaveClass(/text-\[#c9a84c\]/);
});
