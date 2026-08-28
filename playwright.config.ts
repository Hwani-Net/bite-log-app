import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3013',
    trace: 'on-first-retry',
    // 서비스워커가 /api/* 를 가로채면 page.route 모의가 통째로 무시되고
    // 테스트가 조용히 실제 상류(thefishing.kr)를 때린다 — 통과·실패가
    // 외부 사이트 상태에 좌우돼 "간헐적 flake"로 보였다(2026-08-28 확인).
    // SW 자체를 검증하는 pwa-integrity 만 각자 allow 로 되돌린다.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3013',
    url: 'http://localhost:3013',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
