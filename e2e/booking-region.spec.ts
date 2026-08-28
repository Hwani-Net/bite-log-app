import { test, expect } from '@playwright/test';

// 2026-08-28 사용자 지적 — 제주를 골랐는데 항구 칩이 서해 항구 그대로였다.
// 원인은 둘이었다: (1) 프로덕션에서 상류 요청이 전부 실패하고 있었고,
// (2) 실패해도 이전 지역 결과가 화면에 남아 항구 칩이 갱신되지 않았다.
// (2)는 상류가 멀쩡해도 언제든 재발하는 UI 결함이라 여기서 고정한다.

const boat = (uid: string, name: string, areaPath: string) => ({
  uid,
  name,
  imageUrl: '',
  areaPath,
  seaRegion: areaPath.split('>')[0].trim(),
  fishTypes: '우럭',
  capacity: '12인승',
  detailUrl: `https://thefishing.kr/reservation/list.php?uid=${uid}`,
});

test.describe('지역 전환 — /booking', () => {
  test('지역을 바꾸면 항구 칩이 그 지역 항구로 갈린다', async ({ page }) => {
    await page.route('**/api/boat-listings*', (r) => {
      const region = new URL(r.request().url()).searchParams.get('region');
      const boats =
        region === '130'
          ? [boat('1', '제주호', '남해권 > 제주 > 제주시 > 제주항')]
          : [
              boat('2', '서해호', '서해권 > 충청남도 > 보령시 > 대천항'),
              boat('3', '삼길포호', '서해권 > 충청남도 > 서산시 > 삼길포'),
            ];
      return r.fulfill({ json: { ok: true, boats, total: boats.length, page: 1 } });
    });

    await page.goto('/booking');
    const ports = page.locator('[role="group"][aria-label="항구 필터"] button');
    await expect(ports).toContainText(['전체', '대천항', '삼길포']);

    await page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '제주', exact: true })
      .click();

    // 서해 항구가 남아 있으면 화면이 거짓말을 하는 것이다.
    await expect(ports).toContainText(['전체', '제주항'], { timeout: 15000 });
    await expect(
      page
        .locator('[role="group"][aria-label="항구 필터"]')
        .getByRole('button', { name: '대천항', exact: true }),
    ).toHaveCount(0);
  });

  test('검색이 실패하면 이전 지역 결과를 남기지 않고, 다시 시도할 수 있다', async ({
    page,
  }) => {
    let fail = false;
    await page.route('**/api/boat-listings*', (r) => {
      if (fail) return r.fulfill({ status: 503, json: { ok: false, error: 'fetch_failed' } });
      return r.fulfill({
        json: {
          ok: true,
          boats: [boat('2', '서해호', '서해권 > 충청남도 > 보령시 > 대천항')],
          total: 1,
          page: 1,
        },
      });
    });

    await page.goto('/booking');
    await expect(
      page
        .locator('[role="group"][aria-label="항구 필터"]')
        .getByRole('button', { name: '대천항', exact: true }),
    ).toBeVisible({ timeout: 15000 });

    fail = true;
    await page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '제주', exact: true })
      .click();

    // 실패했으면 실패했다고 말해야 하고, 옛 항구 칩은 사라져야 한다.
    await expect(page.getByText('선박 목록을 지금 불러오지 못했습니다')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[role="group"][aria-label="항구 필터"]'),
    ).toHaveCount(0);

    // 되돌릴 수단이 있어야 한다 — 새로고침만이 답이면 안 된다.
    fail = false;
    await page.locator('[data-testid="search-retry"]').click();
    await expect(
      page.locator('[data-testid="search-results"] [data-testid="boat-card"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
