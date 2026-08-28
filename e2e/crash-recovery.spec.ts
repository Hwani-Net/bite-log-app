import { test, expect } from '@playwright/test';

// 앱이 클라이언트 예외로 죽었을 때 사용자가 빠져나올 수 있는지 검증한다.
// 2026-08-28 사용자가 /booking에서 Next.js 기본 "Application error" 화면을
// 만났는데, 그 화면엔 복구 버튼도 원인 표시도 없어 할 수 있는 일이 없었다.
//
// location.reload는 Chromium에서 재정의할 수 없으므로, 스텁 대신 실제
// 재로드를 관찰한다 — window에 심은 표식이 사라지면 새로고침된 것이다.

const MARK = () => {
  (window as unknown as { __mark?: number }).__mark = 1;
};
const marked = () =>
  (window as unknown as { __mark?: number }).__mark === 1;

test('청크 로드 실패는 스스로 새로고침해 복구하고, 두 번은 하지 않는다', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(MARK);

  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Loading chunk 42 failed. (/_next/static/chunks/x.js)',
      }),
    );
  });

  // 표식이 사라졌다 = 새로고침이 실제로 일어났다
  await page.waitForFunction(
    () => (window as unknown as { __mark?: number }).__mark !== 1,
    { timeout: 10000 },
  );
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('__bitelog_chunk_recovery'),
    ),
  ).toBe('1');

  // 두 번째 발생은 무시해야 한다 — 진짜 고장이면 무한 새로고침 루프가 된다.
  await page.evaluate(MARK);
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'ChunkLoadError: again' }),
    );
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(marked)).toBe(true);
});

test('무관한 오류는 새로고침을 유발하지 않는다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(MARK);
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'TypeError: x is not a function' }),
    );
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(marked)).toBe(true);
});
