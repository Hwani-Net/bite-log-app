import { test, expect } from '@playwright/test';

// 5차 GOAL-5 — 컨시어지·홈 마무리: 채팅 영속, 조황 리포트 실연결,
// 장식이던 햄버거의 실제 메뉴.
test.describe('Concierge & home finishing', () => {
  test('chat history survives a reload', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'biteLog_chatHistory',
        JSON.stringify([
          { role: 'user', text: '우럭 시즌 언제야?' },
          { role: 'model', text: '가을이 가장 좋습니다.' },
        ]),
      );
    });
    await page.goto('/concierge');
    // AI 마스터 탭으로 이동하면 저장된 대화가 그대로 있다.
    await page.getByRole('button', { name: /AI 마스터|AI Master/ }).click();
    await expect(page.getByText('우럭 시즌 언제야?')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('가을이 가장 좋습니다.')).toBeVisible();
  });

  test('the report button renders a real report from my records', async ({
    page,
  }) => {
    const now = new Date();
    const d = (day: number) =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await page.addInitScript((records) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(records));
    }, [
      { id: 'c1', date: d(1), species: '우럭', count: 4, sizeCm: 35, location: { name: '오천항' }, photos: [], visibility: 'private', createdAt: 'x', updatedAt: 'x' },
      { id: 'c2', date: d(2), species: '광어', count: 2, location: { name: '대천항' }, photos: [], visibility: 'private', createdAt: 'x', updatedAt: 'x' },
    ]);
    await page.goto('/concierge');
    await page.locator('[data-testid="catch-report-button"]').click();

    const report = page.locator('[data-testid="catch-report"]');
    await expect(report).toBeVisible({ timeout: 15000 });
    await expect(report).toContainText('조황 리포트');
    await expect(report).toContainText('2회'); // 출조 2회
    await expect(report).toContainText('6마리'); // 총 조과
    await expect(report).toContainText('우럭');
    await expect(report).toContainText('오천항');
  });

  test('the home hamburger opens a real menu', async ({ page }) => {
    await page.goto('/');
    const sheet = page.locator('[data-testid="home-menu-sheet"]');
    await expect(sheet).toHaveCount(0);

    await page.locator('[data-testid="home-menu-button"]').click();
    await expect(sheet).toBeVisible();
    // 바텀 네비에 없는 라우트로 실제 이동한다.
    await sheet.getByRole('link', { name: /낚시 규정/ }).click();
    await expect(page).toHaveURL(/\/regulations/);
  });
});
