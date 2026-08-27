import { test, expect } from '@playwright/test';
import { STORE_KEY } from '@/services/myBoatService';
import { SPECIES_FILTERS } from '@/services/boatListingService';

// These hit the real /api/boat-listings and /api/boat-calendar routes,
// which proxy thefishing.kr live (same pattern as news.spec.ts's YouTube
// RSS route) — timeouts are generous to absorb that external round trip.

test.describe('Booking search — /booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking');
  });

  // The date/species filters are duplicated on this page — once in the
  // date-search grid, once in the unrelated 예약 어시스턴트 checklist card
  // further down — so every filter locator here is scoped to the first
  // glass-morphism card (the search grid).
  const searchCard = (page: import('@playwright/test').Page) =>
    page.locator('.glass-morphism').first();

  // The 즐겨찾는 선사 row (once anything is favorited) renders its own
  // a[href^="/booking/boat/"] cards above the search grid, so every locator
  // that means "a search-result card" scopes to this testid, not the bare
  // href-prefix selector. Each card is a <div data-testid="boat-card"> —
  // the calendar link is now an absolutely-positioned overlay inside it
  // (not a wrapper), since a <button> can't legally nest inside an <a>.
  const resultsGrid = (page: import('@playwright/test').Page) =>
    page.locator('[data-testid="search-results"]');

  test('loads with a default search date and boat grid', async ({ page }) => {
    await expect(searchCard(page).locator('input[type="date"]')).toBeVisible();
    // The grid resolves to either boats or the explicit empty-state copy —
    // never a silent blank area.
    await expect(
      resultsGrid(page).locator('[data-testid="boat-card"]').first().or(
        page.getByText('이 조건으로 출조하는 선박이 없습니다'),
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test('region filter narrows the result count', async ({ page }) => {
    // Scoped to the search-grid heading's own count span — 낚시뚜's "X/177척
    // 동기화됨" text below also matches a bare /\d+척/ pattern.
    const countLabel = page
      .locator('h3', { hasText: '출조 선박' })
      .locator('xpath=following-sibling::span[1]');
    await expect(countLabel).toBeVisible({ timeout: 15000 });
    const before = await countLabel.textContent();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/boat-listings') && r.url().includes('region=1'),
      { timeout: 15000 },
    );
    await searchCard(page).getByRole('button', { name: '서해', exact: true }).click();
    await responsePromise;
    await page.waitForTimeout(300);

    // A real filter changed the query — the count text updated (same value
    // would mean the click was a no-op).
    await expect(countLabel).not.toHaveText(before ?? '');
  });

  test('species filter also narrows results', async ({ page }) => {
    // Scoped to the search-grid heading's own count span — 낚시뚜's "X/177척
    // 동기화됨" text below also matches a bare /\d+척/ pattern.
    const countLabel = page
      .locator('h3', { hasText: '출조 선박' })
      .locator('xpath=following-sibling::span[1]');
    await expect(countLabel).toBeVisible({ timeout: 15000 });
    const before = await countLabel.textContent();

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/boat-listings') && r.url().includes('species=4'),
      { timeout: 15000 },
    );
    await searchCard(page).getByRole('button', { name: '우럭', exact: true }).click();
    const response = await responsePromise;
    await page.waitForTimeout(300);

    await expect(countLabel).not.toHaveText(before ?? '');

    // The count changing is not enough on its own — thefishing.kr's own
    // si[] filter has been observed to narrow the count while still
    // returning boats whose displayed species has nothing to do with the
    // one selected (e.g. si[]=3 주꾸미 returning 꽃게 boats). Assert the
    // actual response content, not just that a number moved.
    const body = await response.json();
    expect(Array.isArray(body.boats)).toBe(true);
    for (const boat of body.boats) {
      expect(boat.fishTypes).toContain('우럭');
    }
  });

  test('favoriting a boat persists across reload and surfaces it in 즐겨찾는 선사', async ({
    page,
  }) => {
    const firstCard = resultsGrid(page).locator('[data-testid="boat-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    const boatName = await firstCard.locator('h4').textContent();
    // Every parsed listing has a name (parseBoatListingHtml drops nameless
    // entries) — assert it rather than letting a null silently turn the
    // toContainText checks below into no-op empty-string matches.
    expect(boatName).toBeTruthy();

    const star = firstCard.getByRole('button', { name: /즐겨찾기/ });
    await expect(star).toBeVisible();
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    // The star sits on an absolutely-positioned overlay Link — clicking it
    // must stay on /booking, not fall through to the calendar page.
    expect(page.url()).toContain('/booking');
    expect(page.url()).not.toMatch(/\/booking\/boat\//);

    await page.reload();
    const favSection = page.locator('h3', { hasText: '즐겨찾는 선사' });
    await expect(favSection).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="favorite-boats"]')).toContainText(
      boatName ?? '',
    );

    // Un-favoriting removes it from the section again — the star click
    // must not have accidentally navigated to the calendar page instead.
    const searchStar = resultsGrid(page)
      .locator('[data-testid="boat-card"]')
      .filter({ hasText: boatName ?? '' })
      .first()
      .getByRole('button', { name: /즐겨찾기/ });
    await searchStar.click();
    await expect(page.locator('h3', { hasText: '즐겨찾는 선사' })).toHaveCount(0);
  });

  test('marking a boat "안 탄다" badges it and pushes it to the bottom of the results', async ({
    page,
  }) => {
    const cards = resultsGrid(page).locator('[data-testid="boat-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    const firstCard = cards.first();
    const href = await firstCard.locator('a[href^="/booking/boat/"]').getAttribute('href');
    const uid = href!.match(/\/booking\/boat\/(\d+)/)![1];

    await page.goto(`/booking/boat/${uid}`);
    const neverButton = page.getByRole('button', { name: '안 탄다', exact: true });
    await expect(neverButton).toBeVisible({ timeout: 15000 });
    await neverButton.click();
    await expect(neverButton).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/booking');
    const reloadedCards = resultsGrid(page).locator('[data-testid="boat-card"]');
    await expect(reloadedCards.first()).toBeVisible({ timeout: 15000 });

    // thefishing.kr's live listing for "today" isn't guaranteed to return
    // the exact same set on a second fetch, so this doesn't compare
    // against the first load — it asserts the actual invariant
    // sortByVerdict guarantees on whatever the current result set is: a
    // "never"-marked boat sorts to the end of the list it's a part of.
    const total = await reloadedCards.count();
    // Match on "?" too — a bare uid prefix like "123" would otherwise also
    // match a card for uid "1234".
    const markedCard = reloadedCards
      .filter({ has: page.locator(`a[href^="/booking/boat/${uid}?"]`) })
      .first();
    if ((await markedCard.count()) === 0) {
      // thefishing.kr's own listing for today no longer includes this uid
      // at all (live data moved on) — nothing left to assert position on.
      // Annotate rather than silently pass with zero assertions run, so a
      // vacuous pass is visible in the report instead of looking identical
      // to a real one.
      test.info().annotations.push({
        type: 'skipped-assertion',
        description: `uid ${uid} no longer in today's live listing`,
      });
      return;
    }
    await expect(markedCard).toContainText('다시 안 탐');
    await expect(markedCard).toHaveAttribute('data-verdict', 'never');
    const markedIndex = await reloadedCards.evaluateAll(
      (els, targetUid) =>
        els.findIndex((el) =>
          el.querySelector(`a[href^="/booking/boat/${targetUid}?"]`),
        ),
      uid,
    );
    expect(markedIndex).toBe(total - 1);
  });

  test('keyword search filters real content on both sources, and clearing it restores the view', async ({
    page,
  }) => {
    const cards = resultsGrid(page).locator('[data-testid="boat-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const boatName = await cards.first().locator('h4').textContent();
    expect(boatName).toBeTruthy();
    const beforeCount = await cards.count();

    const searchInput = page.getByLabel('선박 통합 검색');
    await searchInput.fill(boatName!);
    // The filter is debounced (~200ms). A plain toContainText on the grid
    // container isn't a real wait condition here — it can pass instantly,
    // before the debounce even fires, simply because the unfiltered grid
    // already contains this card's own (unfiltered) text. Poll for the
    // actual end state instead: every visible card matches the keyword.
    await expect
      .poll(
        async () => {
          const texts = await cards.allTextContents();
          return texts.length > 0 && texts.every((t) => t.includes(boatName!));
        },
        { timeout: 5000 },
      )
      .toBe(true);

    // Clearing the keyword restores the original, unfiltered card count —
    // the filter is a pure client-side pass, not a new server request.
    await page.getByRole('button', { name: '검색어 지우기' }).click();
    await expect(cards).toHaveCount(beforeCount);

    // A keyword nothing can match shows the empty-state copy instead of a
    // silently blank grid. Both sources share the same copy, so this can
    // match more than one element — .first() is enough to prove it renders.
    await searchInput.fill('존재하지않는선박이름ZZZ999');
    await expect(
      page
        .getByText('검색어와 일치하는 선박이 없습니다. 다른 키워드를 시도해보세요.')
        .first(),
    ).toBeVisible();
  });

  test('keyword search also filters the 낚시뚜 directory — the point of a combined search', async ({
    page,
  }) => {
    const fishappCards = page.locator('[data-testid="fishapp-results"] h4');
    await expect(fishappCards.first()).toBeVisible({ timeout: 15000 });
    const boatName = await fishappCards.first().textContent();
    expect(boatName).toBeTruthy();

    await page.getByLabel('선박 통합 검색').fill(boatName!);
    // Same reasoning as the thefishing.kr test above: poll for every
    // visible card actually matching, not just the container text
    // trivially containing this card's own (still unfiltered) name.
    await expect
      .poll(
        async () => {
          const texts = await fishappCards.allTextContents();
          return texts.length > 0 && texts.every((t) => t.includes(boatName!));
        },
        { timeout: 5000 },
      )
      .toBe(true);
  });

  test('clicking a boat card navigates to its calendar page', async ({ page }) => {
    const link = resultsGrid(page)
      .locator('[data-testid="boat-card"]')
      .first()
      .locator('a[href^="/booking/boat/"]');
    await expect(link).toBeVisible({ timeout: 15000 });
    const href = await link.getAttribute('href');
    await link.click();
    await page.waitForURL(/\/booking\/boat\/\d+/, { timeout: 10000 });
    expect(page.url()).toContain(href!.split('?')[0]);
  });

  const portChips = (page: import('@playwright/test').Page) =>
    page.locator('[data-testid="port-filter"]').getByRole('button');
  const capacityChips = (page: import('@playwright/test').Page) =>
    page.locator('[data-testid="capacity-filter"]').getByRole('button');

  test('port and capacity chips narrow to matching boats, individually and combined', async ({
    page,
  }) => {
    const cards = resultsGrid(page).locator('[data-testid="boat-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Derive both the target port and capacity bucket from one real card,
    // so the combined port+capacity filter is guaranteed at least one
    // match — that same card — regardless of what thefishing.kr's live
    // listing looks like today.
    const sample = cards.first();
    const areaText = await sample.locator('p').first().textContent();
    const capacityText = await sample
      .locator('span')
      .filter({ hasText: /인승/ })
      .first()
      .textContent();
    expect(areaText).toBeTruthy();
    expect(capacityText).toBeTruthy();
    const targetPort = areaText!.split('·').map((s) => s.trim()).pop()!;
    const seats = Number(capacityText!.match(/(\d+)인승/)?.[1]);
    expect(Number.isFinite(seats)).toBe(true);
    const bucketLabel = seats <= 10 ? '소형' : seats <= 18 ? '중형' : '대형';

    // ① 항구 칩 → 그 항구 배만 표시
    await expect(portChips(page).first()).toBeVisible({ timeout: 5000 });
    await portChips(page).getByText(targetPort, { exact: true }).click();
    await expect
      .poll(
        async () => {
          const texts = await cards.allTextContents();
          return texts.length > 0 && texts.every((t) => t.includes(targetPort));
        },
        { timeout: 5000 },
      )
      .toBe(true);

    // ③ 정원 칩까지 같이 켜도(두 필터 동시 적용) — 표본 카드 자신이 두
    // 조건을 다 만족하므로 최소 1건은 보장된다.
    await capacityChips(page).filter({ hasText: bucketLabel }).click();
    await expect
      .poll(
        async () => {
          const texts = await cards.allTextContents();
          if (texts.length === 0) return false;
          return texts.every((t) => {
            if (!t.includes(targetPort)) return false;
            const n = Number(t.match(/(\d+)인승/)?.[1]);
            if (!Number.isFinite(n)) return false;
            if (bucketLabel === '소형') return n <= 10;
            if (bucketLabel === '중형') return n >= 11 && n <= 18;
            return n >= 19;
          });
        },
        { timeout: 5000 },
      )
      .toBe(true);

    // ② 정원 칩만 단독으로도 — 항구를 다시 전체로 풀어 정원 조건 하나만
    // 남긴다. 표본 카드가 여전히 그 구간에 속하므로 최소 1건 보장.
    await portChips(page).getByText('전체', { exact: true }).click();
    await expect
      .poll(
        async () => {
          const texts = await cards.allTextContents();
          if (texts.length === 0) return false;
          return texts.every((t) => {
            const n = Number(t.match(/(\d+)인승/)?.[1]);
            if (!Number.isFinite(n)) return false;
            if (bucketLabel === '소형') return n <= 10;
            if (bucketLabel === '중형') return n >= 11 && n <= 18;
            return n >= 19;
          });
        },
        { timeout: 5000 },
      )
      .toBe(true);
  });

  test('selecting a port clears when region changes — a stale pick can zero out results with no way back', async ({
    page,
  }) => {
    await expect(
      resultsGrid(page).locator('[data-testid="boat-card"]').first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(portChips(page).first()).toBeVisible({ timeout: 5000 });

    // Pick any non-전체 port.
    const targetPort = await portChips(page).nth(1).textContent();
    await portChips(page).nth(1).click();
    await expect(portChips(page).nth(1)).toHaveAttribute('aria-pressed', 'true');

    // Changing region reshapes which ports even exist — the picked one
    // must not silently survive as an invisible, unreachable filter.
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/boat-listings') && r.url().includes('region=1'),
      { timeout: 15000 },
    );
    await searchCard(page).getByRole('button', { name: '서해', exact: true }).click();
    await responsePromise;

    // The port row either re-renders with "전체" selected, or disappears
    // entirely (no ports in the new region) — either way, targetPort is no
    // longer the active filter.
    const stillHasPortChips = (await portChips(page).count()) > 0;
    if (stillHasPortChips) {
      const allChip = portChips(page).getByText('전체', { exact: true });
      await expect(allChip).toHaveAttribute('aria-pressed', 'true');
      const stalePortChip = portChips(page).getByText(targetPort!, { exact: true });
      if ((await stalePortChip.count()) > 0) {
        await expect(stalePortChip).toHaveAttribute('aria-pressed', 'false');
      }
    }
  });

  test('species-first recommendation: picking a species shows season + dates, picking a date fills the search grid', async ({
    page,
  }) => {
    const reverseSection = page.locator('[data-testid="reverse-recommendation"]');
    await expect(reverseSection).toBeVisible();

    await reverseSection.getByRole('button', { name: '우럭', exact: true }).click();
    // ① 시즌 상태 표기
    await expect(reverseSection.getByText(/시즌|금어기/)).toBeVisible();

    // ② 추천 날짜 최대 3개, 각각 근거(등급) 함께
    const recommendations = reverseSection.getByRole('listitem');
    const count = await recommendations.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);
    await expect(recommendations.first().getByText(/물때/)).toBeVisible();

    const firstDateLabel = await recommendations.first().textContent();

    // ③ 날짜 탭 → 기존 검색 그리드가 그 날짜/어종으로 다시 채워진다 —
    // 새 API 경로가 아니라 기존 /api/boat-listings 재사용을 확인한다.
    const woorukCode = SPECIES_FILTERS.find((s) => s.label === '우럭')!.code;
    const responsePromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/boat-listings') &&
        r.url().includes(`species=${woorukCode}`),
      { timeout: 15000 },
    );
    await recommendations.first().click();
    await responsePromise;

    const dateInput = searchCard(page).locator('input[type="date"]');
    const pickedValue = await dateInput.inputValue();
    // 추천 카드에 쓰인 "M/D" 표기가 실제로 채워진 date input과 일치하는지.
    const [, m, d] = pickedValue.split('-');
    expect(firstDateLabel).toContain(`${Number(m)}/${Number(d)}`);

    await expect(
      resultsGrid(page)
        .locator('[data-testid="boat-card"]')
        .first()
        .or(page.getByText('이 조건으로 출조하는 선박이 없습니다')),
    ).toBeVisible({ timeout: 15000 });
  });

  test('the search grid still defaults to today with no species pre-picked — reverse recommendation is opt-in', async ({
    page,
  }) => {
    await expect(searchCard(page).locator('input[type="date"]')).toBeVisible();
    const speciesGroup = searchCard(page).getByRole('group', { name: '어종 필터' });
    await expect(speciesGroup.getByRole('button', { name: '전체', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('Boat calendar — /booking/boat/[uid]', () => {
  // uid 4247 is a real, stable listing (오이도 몬스터호) used in the unit
  // fixtures too.
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking/boat/4247?date=2026-09-01');
  });

  test('renders boat meta and a month grid', async ({ page }) => {
    await expect(page.getByRole('link', { name: /홈페이지 예약/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/\d{4}년 \d{1,2}월/)).toBeVisible();
  });

  test('available calendar days show a 물때 grade dot, and the legend is visible', async ({
    page,
  }) => {
    const availableDay = page
      .locator('button')
      .filter({ hasText: /남은 \d+명/ })
      .first();
    await expect(availableDay).toBeVisible({ timeout: 15000 });

    const grade = await availableDay.getAttribute('data-bite-grade');
    expect(['excellent', 'good', 'fair', 'poor']).toContain(grade);

    // A "마감"(full) day never shows a grade — it isn't bookable regardless
    // of the tide condition, so surfacing one would be misleading.
    const fullDay = page.locator('button').filter({ hasText: '마감' }).first();
    if ((await fullDay.count()) > 0) {
      expect(await fullDay.getAttribute('data-bite-grade')).toBeNull();
    } else {
      // No 마감 day on the currently-loaded month — nothing to assert.
      // Annotate rather than let this look like a passing check that ran.
      test.info().annotations.push({
        type: 'skipped-assertion',
        description: 'no 마감 day in the current month to check against',
      });
    }

    // Calendar cells also carry an sr-only span with the same grade text
    // (accessible name for the color-only dot) — scope to the legend
    // itself so this doesn't collide with those.
    const legend = page.getByLabel('물때 지수 범례');
    await expect(legend).toBeVisible();
    for (const label of ['물때 최고', '물때 좋음', '물때 보통', '물때 약함']) {
      await expect(legend.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('the 홈페이지 예약 button points at the boat operator, not thefishing.kr', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: /홈페이지 예약/ }).first();
    await expect(link).toBeVisible({ timeout: 15000 });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toContain('thefishing.kr');
  });

  test('clicking a bookable day shows remaining seats and a per-day reserve link', async ({
    page,
  }) => {
    // No ?date= this time — day 1 (or whichever day the query param names)
    // starts pre-selected on that route, and clicking an already-selected
    // day toggles it off instead of opening the detail panel.
    await page.goto('/booking/boat/4247');
    const availableDay = page
      .locator('button')
      .filter({ hasText: /남은 \d+명/ })
      .first();
    await expect(availableDay).toBeVisible({ timeout: 15000 });
    await availableDay.click();

    await expect(page.getByText(/남은인원 \d+명/)).toBeVisible();
    const reserveLink = page.getByRole('link', { name: /\d+일 예약하기/ });
    await expect(reserveLink).toBeVisible();
    const href = await reserveLink.getAttribute('href');
    expect(href).not.toContain('thefishing.kr');
  });

  test('month navigation changes the displayed month', async ({ page }) => {
    const monthLabel = page.locator('text=/\\d{4}년 \\d{1,2}월/').first();
    await expect(monthLabel).toBeVisible({ timeout: 15000 });
    const before = await monthLabel.textContent();

    await page.getByLabel('다음 달').click();
    await page.waitForTimeout(1000);

    const after = await monthLabel.textContent();
    expect(after).not.toBe(before);
  });

  test('shows a change banner when a stale localStorage snapshot disagrees with the live name/port', async ({
    page,
  }) => {
    // Seeded before the app's own mount effect gets a chance to run, so
    // the visit's real recordSnapshot() call has something older to diff
    // against — a fake old name/port guarantees a mismatch regardless of
    // what thefishing.kr's live page currently says for this uid.
    await page.addInitScript(
      ({ uid, storeKey }) => {
        localStorage.setItem(
          storeKey,
          JSON.stringify({
            [uid]: {
              uid,
              favorite: false,
              verdict: null,
              memo: '',
              rides: [],
              goneStreak: 0,
              snapshots: [
                {
                  name: '스텔라호',
                  areaPath: '서해권 > 충청남도 > 보령시 > 대천항',
                  seenAt: '2026-01-01T00:00:00.000Z',
                },
              ],
            },
          }),
        );
      },
      { uid: '4247', storeKey: STORE_KEY },
    );
    await page.goto('/booking/boat/4247');

    const banner = page.getByText(/이전에.*스텔라호.*대천항/, { exact: false });
    await expect(banner).toBeVisible({ timeout: 15000 });
  });

  test('shows no change banner on a boat with no prior recorded snapshot', async ({
    page,
  }) => {
    // uid 3896 (비너스마린, from the unit fixtures) has never been visited
    // in this fresh browser context — recordSnapshot's very first write has
    // nothing to diff against.
    await page.goto('/booking/boat/3896');
    await expect(page.getByRole('link', { name: /홈페이지 예약/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/이전에.*였습니다/)).toHaveCount(0);
  });

  test('shows a "no longer listed" banner after two consecutive empty-parse visits', async ({
    page,
  }) => {
    // A uid this large doesn't exist on thefishing.kr — confirmed live: it
    // returns HTTP 200 with an 87-byte page carrying none of the markup
    // parseBoatDetailMeta looks for, so meta.name parses to "". That's the
    // exact "fetch succeeded, found nothing" case this banner is for, as
    // opposed to a network failure (which the separate error state handles).
    const FAKE_UID = '999999999';

    await page.goto(`/booking/boat/${FAKE_UID}`);
    await page.waitForTimeout(3000);
    // First empty-parse visit only counts one strike — not gone yet.
    await expect(page.getByText(/더 이상 확인되지 않습니다/)).toHaveCount(0);

    await page.goto(`/booking/boat/${FAKE_UID}`);
    await expect(page.getByText(/더 이상 확인되지 않습니다/)).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe('Trip briefing + season reminders — /booking (GOAL-9)', () => {
  // Both features are clock-sensitive (D-1 = "tomorrow", season = "this
  // month"), so every test pins the browser clock to 2026-10-15 — a date
  // where 우럭 is peak and 광어 is gold in FISH_SEASON_DB — instead of
  // depending on whichever real month the suite happens to run in.
  const FIXED_NOW = new Date(2026, 9, 15, 10, 0, 0);

  test('a watched slot for tomorrow renders the D-1 briefing card, and its link prefills /trip-plan', async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await page.addInitScript(() => {
      localStorage.setItem(
        'biteLog_boatWatchlist',
        JSON.stringify([
          { operatorId: 'yeongjin', boatName: '몬스터호', date: '2026-10-16' },
        ]),
      );
    });
    await page.goto('/booking');

    const card = page.locator('[data-testid="trip-briefing-card"]');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText('내일 출조 예정');
    await expect(card).toContainText('몬스터호');
    await expect(card).toContainText('10/16');

    // The link is the actual 브리핑 연동 — clicking it must land on
    // /trip-plan with the date and charter name already filled in, not on
    // an empty form the user has to re-type.
    await card.getByRole('link', { name: /출조 브리핑 준비/ }).click();
    await expect(page).toHaveURL(/\/trip-plan\?/);
    await expect(page.locator('input[type="date"]')).toHaveValue('2026-10-16');
    await expect(
      page.locator('input[placeholder="예: 홍길동 낚시배"]'),
    ).toHaveValue('몬스터호');
  });

  test('past-year same-month boat records render the season reminder, wired into the species picker', async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await page.addInitScript(() => {
      const base = {
        location: { id: 's1', name: '오천항', lat: 36.3, lng: 126.5 },
        count: 3,
        photos: [],
        visibility: 'private',
        createdAt: '2025-10-20T00:00:00.000Z',
      };
      localStorage.setItem(
        'fishlog_catches',
        JSON.stringify([
          { ...base, id: 'g9-1', date: '2025-10-10', species: '우럭', boatUid: '4247' },
          { ...base, id: 'g9-2', date: '2024-10-02', species: '우럭', boatUid: '4247' },
          // no boatUid — shore record, must NOT count toward 승선 이력
          { ...base, id: 'g9-3', date: '2025-10-12', species: '광어' },
        ]),
      );
    });
    await page.goto('/booking');

    const card = page.locator('[data-testid="season-reminder-card"]');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText('작년 이맘때');
    // Two 우럭 boat records across 2024/2025 aggregate; the untagged 광어
    // record is excluded entirely — real content, not just card presence.
    await expect(card).toContainText('2025년 10월 우럭 출조 2회');
    await expect(card).toContainText('피크 시즌');
    await expect(card).not.toContainText('광어');

    // "날짜 추천 보기" hands off to the GOAL-8 species-first flow.
    await card.getByRole('button', { name: '날짜 추천 보기' }).click();
    await expect(
      page.getByRole('button', { name: /우럭/ }).and(
        page.locator('[aria-pressed="true"]'),
      ),
    ).toBeVisible();
  });

  test('no cards for a fresh user — no watchlist, no ride history', async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto('/booking');
    // The search grid resolving (boats or empty state) proves the page is
    // done mounting — only then is the cards' absence meaningful.
    await expect(
      page
        .locator('[data-testid="search-results"] [data-testid="boat-card"]')
        .first()
        .or(page.getByText('이 조건으로 출조하는 선박이 없습니다')),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="trip-briefing-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="season-reminder-card"]')).toHaveCount(0);
  });
});
