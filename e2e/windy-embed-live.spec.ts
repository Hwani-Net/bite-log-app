import { test, expect } from "@playwright/test";

/**
 * 체크리스트는 CSP 에 frame-src 를 추가하라고 "권고"하지만, 이 저장소에는 CSP 가 없다.
 * 없는 CSP 를 근거로 차단을 단정하지 않는다 — 배포된 화면에서 iframe 이 실제로
 * 그려지는지 먼저 본다. 그려지면 항목을 닫고, CSP 를 새로 넣지 않는다
 * (없던 곳에 부분 CSP 를 넣으면 없던 제약이 생겨 다른 임베드를 깨뜨린다).
 */
const LIVE = "https://bite-log-app.web.app";

test("배포된 홈에서 Windy 임베드가 실제로 렌더된다", async ({ page }) => {
  const cspViolations: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to frame|frame-src/i.test(t)) {
      cspViolations.push(t.slice(0, 200));
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(LIVE, { waitUntil: "domcontentloaded", timeout: 60000 });

  const windy = page.locator('iframe[src*="embed.windy.com"]');
  await expect(windy).toHaveCount(1, { timeout: 30000 });
  await windy.scrollIntoViewIfNeeded();
  await expect(windy).toBeVisible();

  // 프레임이 실제로 문서를 실었는지 — 요소만 있고 내용이 빈 경우를 걸러낸다.
  const frame = await windy.contentFrame();
  expect(frame, "iframe 이 문서를 싣지 못했다").not.toBeNull();

  await page.waitForTimeout(4000);
  await page.screenshot({
    path: "e2e/__screenshots__/windy-embed-live.png",
    fullPage: false,
  });

  console.log("CSP 위반 로그: " + (cspViolations.length || 0) + " 건");
  cspViolations.slice(0, 3).forEach((c) => console.log("  " + c));
  expect(cspViolations, "CSP 가 프레임을 막고 있다").toEqual([]);
});
