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

  // 2026-08-30 교차검수(Codex) Finding 3 — 검색 effect가 새 요청 시작 시
  // 이전 결과를 비우지 않아서, 느린 지역 전환 도중 화면 제목·선택 지역은
  // 이미 새 지역인데 옛 지역 카드·항구 칩이 응답이 올 때까지 그대로
  // 남아 있었다. directoryBoats·선상24 effect는 이미 즉시 비운다.
  test('지역을 바꾸면 새 응답이 올 때까지 이전 지역의 검색 결과가 남지 않는다', async ({
    page,
  }) => {
    let releaseJeju: (() => void) | null = null;
    await page.route('**/api/boat-listings*', async (r) => {
      const region = new URL(r.request().url()).searchParams.get('region') ?? '';
      if (region === '130') {
        await new Promise<void>((resolve) => {
          releaseJeju = resolve;
        });
        return r.fulfill({
          json: {
            ok: true,
            boats: [boat('9', '제주호', '제주권 > 제주 > 제주시 > 제주항')],
            total: 1,
            page: 1,
            rawCount: 1,
          },
        });
      }
      return r.fulfill({
        json: {
          ok: true,
          boats: [boat('2', '서해호', '서해권 > 충청남도 > 보령시 > 대천항')],
          total: 1,
          page: 1,
          rawCount: 1,
        },
      });
    });

    await page.goto('/booking');
    await expect(page.getByText('서해호')).toBeVisible({ timeout: 15000 });

    await page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '제주', exact: true })
      .click();

    // 제주 요청이 아직 안 끝난 이 순간 — 서해 카드가 남아 있으면 화면이
    // 거짓말을 하는 것이다(사용자는 이미 제주를 골랐다).
    await expect(page.getByText('서해호')).toHaveCount(0, { timeout: 5000 });

    releaseJeju?.();
    await expect(page.getByText('제주호')).toBeVisible({ timeout: 15000 });
  });

  // 2026-08-30 교차검수(Codex) Finding 2 — "더 보기"(page>1) 실패 시 catch는
  // 이미 읽은 목록을 state에 남기지만, 렌더는 searchError를 먼저 검사해
  // 그 목록을 화면에서 통째로 가려버렸다. 일시적인 page 2 장애가 방금 성공한
  // page 1 결과까지 삼키면 안 된다.
  test('더 보기 중 다음 페이지가 실패해도 이미 불러온 목록은 사라지지 않는다', async ({
    page,
  }) => {
    let page2Failed = false;
    await page.route('**/api/boat-listings*', (r) => {
      const url = new URL(r.request().url());
      const pageParam = url.searchParams.get('page') ?? '1';
      if (pageParam === '2') {
        page2Failed = true;
        return r.fulfill({ status: 503, json: { ok: false, error: 'fetch_failed' } });
      }
      return r.fulfill({
        json: {
          ok: true,
          boats: [
            boat('1', '서해호', '서해권 > 충청남도 > 보령시 > 대천항'),
            boat('2', '삼길포호', '서해권 > 충청남도 > 서산시 > 삼길포'),
          ],
          total: 5,
          page: 1,
          rawCount: 2,
        },
      });
    });

    await page.goto('/booking');
    const results = page.locator('[data-testid="search-results"]');
    await expect(results.getByText('서해호')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /더 보기/ }).click();
    await expect.poll(() => page2Failed, { timeout: 10000 }).toBe(true);

    // page 1 결과는 그대로 남아 있어야 한다 — 전체 실패 문구로 안 가려진다.
    await expect(results.getByText('서해호')).toBeVisible();
    await expect(results.getByText('삼길포호')).toBeVisible();
    await expect(page.getByText('다음 페이지를 지금 불러오지 못했습니다')).toBeVisible();
    await expect(page.getByText('선박 목록을 지금 불러오지 못했습니다')).toHaveCount(0);
  });

  // 2026-08-31 사용자 지적 — 배 상세로 들어갔다 브라우저 뒤로가기로
  // /booking에 돌아오면 지역·어종·키워드 등 검색 필터가 전부 초기화돼
  // 있었다. 이 페이지는 클라이언트 컴포넌트라 뒤로가기 시 리마운트되면
  // useState 기본값으로 되돌아가는 게 원인 — sessionStorage에 저장해
  // 복원한다.
  test('배 상세를 봤다가 뒤로가기로 돌아오면 검색 필터가 남아 있다', async ({
    page,
  }) => {
    await page.route('**/api/boat-listings*', (r) => {
      const region = new URL(r.request().url()).searchParams.get('region') ?? '';
      const boats =
        region === '3'
          ? [boat('9', '남해호', '남해권 > 경상남도 > 통영 > 통영항')]
          : [];
      return r.fulfill({
        json: { ok: true, boats, total: boats.length, page: 1, rawCount: boats.length },
      });
    });

    await page.goto('/booking');
    await page
      .locator('[role="group"][aria-label="지역 필터"]')
      .getByRole('button', { name: '남해', exact: true })
      .click();

    const card = page.locator('[data-testid="boat-card"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const detailLink = card.locator('a[href^="/booking/boat/"]');
    await detailLink.click();
    await page.waitForURL(/\/booking\/boat\/\d+/, { timeout: 10000 });

    await page.goBack();
    await expect(
      page
        .locator('[role="group"][aria-label="지역 필터"]')
        .getByRole('button', { name: '남해', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 });
    await expect(page.locator('[data-testid="boat-card"]').first()).toBeVisible();
  });

  // 2026-08-31 OpenRouter 교차검수 발견 — 위 복원 로직이 날짜 형식만
  // 검증하고 지난 날짜인지는 안 봐서, 자정을 넘겨 세션이 이어지면 지난
  // 날짜가 그대로 복원돼 검색이 0건이 되는(원래 버그의 변형) 결함이 있었다.
  test('세션에 저장된 검색 날짜가 이미 지났으면 복원하지 않고 오늘 날짜로 시작한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'biteLog_bookingSearchFilters',
        JSON.stringify({
          date: '2020-01-01',
          region: '',
          species: '',
          keyword: '',
          port: '',
          capacity: '',
          availableOnly: false,
        }),
      );
    });
    await page.goto('/booking');
    // 페이지에 date input이 여러 개(출조 문의·동행 구하기 폼 등) 있어
    // "출조 날짜" 라벨이 붙은 검색 필터 것으로 좁힌다.
    const dateInput = page
      .locator('section', { has: page.getByText('출조 날짜') })
      .locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 15000 });
    // mount effect가 값을 채우기 전까지 잠깐 빈 문자열이다 — 안정될 때까지 기다린다.
    await expect(dateInput).not.toHaveValue('', { timeout: 15000 });
    const value = await dateInput.inputValue();
    expect(value).not.toBe('2020-01-01');
    expect(new Date(value).getTime()).toBeGreaterThan(new Date('2026-01-01').getTime());
  });

  // 같은 검수에서 함께 발견 — capacity를 무검증으로 캐스팅해 넣었다.
  // 지금 쓰는 버킷 목록(CAPACITY_OPTIONS)에 없는 값이 세션에 남아 있으면
  // 칩은 아무것도 안 눌린 채 필터만 조용히 걸려 결과가 사라질 수 있었다.
  test('세션에 저장된 정원 값이 지금 버킷 목록에 없으면 무시한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'biteLog_bookingSearchFilters',
        JSON.stringify({
          date: '',
          region: '',
          species: '',
          keyword: '',
          port: '',
          capacity: 'xlarge',
          availableOnly: false,
        }),
      );
    });
    await page.goto('/booking');
    await expect(
      page.locator('section', { has: page.getByText('출조 날짜') }).locator('input[type="date"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="capacity-filter"] button[aria-pressed="true"]'),
    ).toHaveText('전체');
  });

  // 2026-08-31 Codex 교차검수 — 로컬 실제 프로브로 재현: keyword가 문자열이
  // 아닌 값(예: 숫자)으로 세션에 저장돼 있으면 복원 시 그대로 state에
  // 들어가고, debouncedKeyword.trim() 호출에서 "keyword.trim is not a
  // function"으로 던져 전역 에러 화면("화면을 불러오지 못했습니다")으로
  // 떨어졌다.
  test('세션에 저장된 keyword가 문자열이 아니면 복원하지 않고 정상 렌더된다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'biteLog_bookingSearchFilters',
        JSON.stringify({
          date: '',
          region: '',
          species: '',
          keyword: 12345,
          port: '',
          capacity: '',
          availableOnly: false,
        }),
      );
    });
    await page.goto('/booking');
    await expect(
      page.locator('section', { has: page.getByText('출조 날짜') }).locator('input[type="date"]'),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('화면을 불러오지 못했습니다')).toHaveCount(0);
    await expect(
      page.locator('input[placeholder="배 이름·항구·어종으로 검색 (더피싱+낚시뚜 통합)"]'),
    ).toHaveValue('');
  });

  // 2026-08-31 Codex 교차검수 — 1페이지 원본에 배가 있었지만(rawCount>0)
  // 어종/지역 후필터에 전부 걸러지면, 기존 코드는 searchBoats.length===0만
  // 보고 "이 조건에 맞는 선박이 없습니다"로 단정해 뒤 페이지의 실제 매칭을
  // 사용자가 영영 확인할 방법이 없었다.
  test('1페이지가 필터로 전부 걸러져도 rawCount가 있으면 다음 페이지를 확인할 수 있다', async ({
    page,
  }) => {
    let requestedPage = '';
    await page.route('**/api/boat-listings*', (r) => {
      requestedPage = new URL(r.request().url()).searchParams.get('page') ?? '1';
      if (requestedPage === '2') {
        return r.fulfill({
          json: {
            ok: true,
            boats: [boat('7', '남해호', '남해권 > 경상남도 > 통영 > 통영항')],
            total: 25,
            page: 2,
            rawCount: 5,
          },
        });
      }
      return r.fulfill({ json: { ok: true, boats: [], total: 25, page: 1, rawCount: 20 } });
    });

    await page.goto('/booking');
    await expect(page.getByText('이 페이지에는 조건에 맞는 선박이 없어요')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('이 조건으로 출조하는 선박이 없습니다')).toHaveCount(0);

    await page.getByRole('button', { name: '다음 페이지 확인' }).click();
    await expect.poll(() => requestedPage, { timeout: 10000 }).toBe('2');
    await expect(page.getByText('남해호')).toBeVisible({ timeout: 15000 });
  });
});
