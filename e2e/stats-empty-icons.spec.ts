import { test, expect } from "@playwright/test";

/**
 * 기록이 없을 때 각 빈 영역의 아이콘은 그 영역이 보여줄 그림과 같은 종류여야 한다.
 * 셋 다 막대 아이콘이면 사용자는 어느 영역이 비었는지 구분하지 못한다.
 */
test("빈 통계 화면의 아이콘이 각 섹션과 일치한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stats");

  // 빈 상태 아이콘만 size=36 으로 그려진다 — 섹션 제목 아이콘(16)과 섞이지 않는다.
  const emptyIcons = page.locator('svg[width="36"]');
  await expect(emptyIcons).toHaveCount(3, { timeout: 20000 });

  const classes = await emptyIcons.evaluateAll((els) =>
    els.map((e) => e.getAttribute("class") ?? ""),
  );

  // 월별 추이 = 막대, 어종 도넛 = 파이, Top spots = 지도 핀
  expect(classes[0]).toContain("lucide-chart-no-axes-column");
  expect(classes[1]).toContain("lucide-chart-pie");
  expect(classes[2]).toContain("lucide-map-pin");

  // 회귀: 도넛과 Top spots 가 다시 막대 아이콘으로 돌아가지 않았는지 못박는다
  expect(classes[1]).not.toContain("lucide-chart-no-axes-column");
  expect(classes[2]).not.toContain("lucide-chart-no-axes-column");

  // 바뀐 두 아이콘(파이·핀)이 한 화면에 들어오게 잡는다 — 담기지 않은 스크린샷은 증거가 아니다.
  await emptyIcons.nth(2).scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await expect(emptyIcons.nth(1)).toBeInViewport();
  await expect(emptyIcons.nth(2)).toBeInViewport();
  await page.screenshot({
    path: "e2e/__screenshots__/stats-empty-icons.png",
    fullPage: false,
  });
});
