import { test, expect } from "@playwright/test";

/**
 * 랭킹 조회가 실패했을 때, 화면이 "아직 아무도 안 올렸다"와 다르게 보여야 한다.
 * 둘이 같은 문구로 덮이면 권한 설정 실수가 정상 상태로 위장돼 몇 주씩 묻힌다.
 */
test.describe("랭킹 실패 상태", () => {
  test("Firestore 가 끊기면 빈 순위가 아니라 실패 안내가 보인다", async ({
    page,
  }) => {
    // 모바일 앱이므로 실제 사용 폭으로 본다 — 데스크톱 폭에서는 배너가
    // 뷰포트 밖으로 밀려 스크린샷이 증거가 되지 못한다.
    await page.setViewportSize({ width: 390, height: 844 });
    // 랭킹 집계가 읽는 Firestore 채널만 끊는다 — 나머지 페이지는 정상 동작시킨다.
    await page.route(/firestore\.googleapis\.com/, (route) => route.abort());

    await page.goto("/ranking");

    const failure = page.getByText(/조회에 실패|응답이 늦습니다|load failure/i);
    await expect(failure).toBeVisible({ timeout: 20000 });

    // 빈 상태 문구는 실패와 동시에 뜨지 않아야 한다 — 그래야 둘이 구분된다.
    await expect(
      page.getByText(/아직 랭킹에 올라온 조과가 없습니다/),
    ).toHaveCount(0);

    // 다시 시도 수단이 함께 있어야 실패가 막다른 길이 되지 않는다.
    await expect(page.getByRole("button", { name: /다시 시도|Retry/ })).toBeVisible();

    // 배너가 실제로 화면에 들어온 상태를 남긴다 — 담기지 않은 스크린샷은 증거가 아니다.
    await failure.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "e2e/__screenshots__/ranking-failure-state.png",
      fullPage: false,
    });
  });
});
