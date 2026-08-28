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

  test('어종을 고르는 자리는 화면에 하나뿐이다', async ({ page }) => {
    // 어종 칩을 두 곳에 같은 목록으로 세우면 "어종 선택이 겹쳐 있다"가
    // 된다(2026-08-28 사용자 지적). 날짜 추천 패널은 추천 근거가 있는
    // 어종만 다루는 별개 기능이어야 한다.
    const panel = page.locator('[data-testid="reverse-recommendation"]');
    await expect(panel).toBeVisible({ timeout: 15000 });

    const seasonChips = await panel
      .locator('[role="group"][aria-label="추천 어종 선택"] button')
      .allTextContents();
    const filterChips = await page
      .locator('[role="group"][aria-label="어종 필터"] button')
      .allTextContents();

    expect(filterChips.length).toBeGreaterThan(SPECIES_FILTERS.length);
    // 추천 패널은 검색 필터의 진부분집합이어야 한다 — 같은 크기면 두 벌이다.
    expect(seasonChips.length).toBeLessThan(filterChips.length / 2);
    seasonChips.forEach((s) => expect(filterChips).toContain(s));
  });

  test('날짜 추천 패널은 근거(방류계획)가 있는 어종만 세운다', async ({
    page,
  }) => {
    const panel = page.locator('[data-testid="reverse-recommendation"]');
    await expect(panel).toBeVisible({ timeout: 15000 });
    // 문어는 FISH_SEASON_DB에 없다 — 여기 서 있으면 근거 없는 추천이 된다.
    await expect(
      panel.getByRole('button', { name: '문어', exact: true }),
    ).toHaveCount(0);

    await panel.getByRole('button', { name: '우럭', exact: true }).click();
    await expect(
      panel.locator('ul[aria-label="추천 출조일"]').or(
        panel.getByText('추천할 만한 물때 데이터를 찾지 못했습니다'),
      ),
    ).toBeVisible({ timeout: 10000 });
  });

  test('어종 필터는 가로 스크롤이 아니라 줄바꿈이라 전부 보인다', async ({
    page,
  }) => {
    const group = page.locator('[role="group"][aria-label="어종 필터"]');
    await expect(group).toBeVisible({ timeout: 15000 });
    const geom = await group.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }));
    // 스크롤로 돌아가면 27종 중 대여섯 개만 보인다.
    expect(geom.scrollW).toBeLessThanOrEqual(geom.clientW + 1);
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
