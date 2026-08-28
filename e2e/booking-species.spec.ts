import { test, expect } from '@playwright/test';
import { SPECIES_FILTERS } from '@/services/boatListingService';
import { FISH_SPECIES } from '@/types';

// 2026-08-28 사용자 지적 — "표시 어종이 너무 부족한데?"
// 예약 화면이 더피싱 어종 26종 중 12종만 노출했고, 「어종으로 찾기」 칩은
// 시즌 데이터가 있는 5종으로 더 좁혀져 있었다.

test.describe('어종 노출 폭 — /booking', () => {
  const searchCard = (page: import('@playwright/test').Page) =>
    page.locator('.glass-morphism').first();

  test.beforeEach(async ({ page }) => {
    await page.goto('/booking');
  });

  test('어종 필터가 더피싱이 실제로 제공하는 어종을 모두 보여준다', async ({
    page,
  }) => {
    const card = searchCard(page);
    await expect(card.getByRole('button', { name: '우럭', exact: true })).toBeVisible({
      timeout: 15000,
    });
    // 예전 12종에 없던 어종들 — 이게 안 보이면 목록이 다시 좁아진 것이다.
    for (const s of ['백조기', '오징어', '문어', '꽃게', '한치', '열기']) {
      await expect(
        card.getByRole('button', { name: s, exact: true }),
        `${s} 칩이 없다`,
      ).toBeVisible();
    }
  });

  test('「어종으로 찾기」 칩이 검색 가능한 어종 전부를 담는다', async ({
    page,
  }) => {
    const panel = page.locator('[data-testid="reverse-recommendation"]');
    await expect(panel).toBeVisible({ timeout: 15000 });
    const chips = panel.locator('button');
    // 시즌 데이터 5종으로 좁아져 있던 것이 회귀하면 여기서 걸린다.
    await expect(chips).toHaveCount(SPECIES_FILTERS.length);
  });

  test('시즌 데이터가 없는 어종은 추천 날짜를 지어내지 않고 검색만 건다', async ({
    page,
  }) => {
    const panel = page.locator('[data-testid="reverse-recommendation"]');
    await expect(panel).toBeVisible({ timeout: 15000 });

    // 문어는 FISH_SEASON_DB(방류계획)에 없는 어종이다.
    await panel.getByRole('button', { name: '문어', exact: true }).click();
    await expect(
      panel.getByText('방류계획 시즌 데이터가 없어'),
    ).toBeVisible();
    // 추천 날짜 목록은 나오면 안 된다 — 근거 없는 추천이 된다.
    await expect(panel.locator('ul[aria-label="추천 출조일"]')).toHaveCount(0);

    const search = panel.locator('[data-testid="reverse-search-only"]');
    await expect(search).toBeVisible();
    await search.click();

    // 실제 검색이 걸렸는지는 어종 필터 칩의 선택 상태로 본다 — 업스트림
    // (thefishing.kr) 응답을 기다리면 외부 지연에 테스트가 끌려간다.
    await expect(
      page
        .locator('[role="group"][aria-label="어종 필터"]')
        .getByRole('button', { name: '문어', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
  });

  test('시즌 데이터가 있는 어종은 기존대로 추천 날짜를 준다', async ({
    page,
  }) => {
    const panel = page.locator('[data-testid="reverse-recommendation"]');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await panel.getByRole('button', { name: '우럭', exact: true }).click();
    await expect(
      panel.locator('ul[aria-label="추천 출조일"]').or(
        panel.getByText('추천할 만한 물때 데이터를 찾지 못했습니다'),
      ),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      panel.locator('[data-testid="reverse-search-only"]'),
    ).toHaveCount(0);
  });
});

test.describe('어종 노출 폭 — 기록·출조계획', () => {
  test('기록 입력 어종이 예약에서 고를 수 있는 어종을 덮는다', async ({
    page,
  }) => {
    // 예약해서 잡고 온 어종을 기록에 못 남기면 앱이 반쪽이 된다.
    const recordable = new Set<string>(FISH_SPECIES);
    const missing = SPECIES_FILTERS.map((f) => f.label).filter(
      (l) => l !== '타이라바' && !recordable.has(l),
    );
    expect(missing, `기록에 없는 예약 어종: ${missing.join(', ')}`).toEqual([]);
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();
    const picker = page.getByLabel('어종');
    await expect(picker).toBeVisible({ timeout: 15000 });
    const options = await picker.locator('option').allTextContents();
    for (const s of ['백조기', '문어', '꽃게', '한치']) {
      expect(options, `${s}가 기록 어종에 없다`).toContain(s);
    }
  });

  test('출조 계획 어종 칩이 기록 어종과 같은 목록에서 나온다', async ({
    page,
  }) => {
    await page.goto('/trip-plan');
    for (const s of ['문어', '한치', '백조기']) {
      await expect(
        page.getByRole('button', { name: s, exact: true }),
        `${s} 칩이 없다`,
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
