import { test, expect } from '@playwright/test';

// 2026-08-29 사용자 지적 — "동해,남해 등 항구명도 사라지고 서해에도 항구명
// 몇개만 나오고 아주 엉망이네". 원인: 항구 칩은 thefishing.kr 검색의
// 페이지 1(20척)에서만 뽑았는데, 실제로는 347척처럼 훨씬 많을 수 있어 그
// 20척에 없는 항구는 애초에 칩으로 뜰 수가 없었다. 낚시뚜(/api/boat
// -directory)는 이미 전수(177/177) 동기화돼 있고 같은 지역 필터를 쓰므로,
// 추가 요청 없이 그 항구까지 합쳐서 폭을 넓힌다.

const boat = (uid: string, areaPath: string) => ({
  uid,
  name: `배${uid}`,
  imageUrl: '',
  areaPath,
  seaRegion: areaPath.split('>')[0].trim(),
  fishTypes: '우럭',
  capacity: '12인승',
  detailUrl: '',
});

const fishappBoat = (shipId: string, harbor: string, seaRegion: string) => ({
  shipId,
  name: `낚시뚜배${shipId}`,
  province: '',
  area: '',
  harbor,
  imageUrl: '',
  detailUrl: '',
  seaRegion,
});

test('항구 칩은 페이지 1(thefishing.kr)뿐 아니라 낚시뚜 전수 데이터도 합친다', async ({
  page,
}) => {
  // thefishing.kr 페이지 1엔 대천항 하나뿐이지만(실제로는 347척 중 20척만
  // 보고 있는 상황을 흉내), 낚시뚜엔 이미 신진도항·오천항이 있다.
  await page.route('**/api/boat-listings*', (r) =>
    r.fulfill({
      json: {
        ok: true,
        boats: [boat('1', '서해권 > 충청남도 > 보령시 > 대천항')],
        total: 347,
        page: 1,
      },
    }),
  );
  await page.route('**/api/boat-directory*', (r) =>
    r.fulfill({
      json: {
        ok: true,
        boats: [
          fishappBoat('a1', '신진도항', '서해권'),
          fishappBoat('a2', '오천항', '서해권'),
        ],
        totalCached: 177,
      },
    }),
  );

  await page.goto('/booking');
  const ports = page.locator('[role="group"][aria-label="항구 필터"] button');
  await expect(ports).toContainText(['전체', '대천항', '신진도항', '오천항'], {
    timeout: 15000,
  });
});

test('지역을 바꾸면 낚시뚜 항구도 즉시 비워지고, 이전 지역 항구가 새 지역 밑에 남지 않는다', async ({
  page,
}) => {
  // 2026-08-29 실사용 재현 — 서해로 로드된 뒤 남해를 골랐는데, 남해
  // boat-listings 응답은 깨끗한데도(서버가 이미 지역 오염을 걸러줌)
  // 화면엔 서해 항구가 그대로 남아 있었다. 원인: boat-directory 응답이
  // boat-listings보다 늦게 도착하는 동안 이전(서해) 낚시뚜 데이터를
  // 계속 들고 있었다.
  let directoryRegion = '';
  let releaseSouth: (() => void) | null = null;
  await page.route('**/api/boat-listings*', (r) =>
    r.fulfill({ json: { ok: true, boats: [], total: 0, page: 1 } }),
  );
  await page.route('**/api/boat-directory*', async (r) => {
    const region = new URL(r.request().url()).searchParams.get('region') ?? '';
    directoryRegion = region;
    if (region === '3') {
      // 남해 요청은 일부러 붙잡아 둔다 — "아직 안 끝난 그 순간"을 확인해야 한다.
      await new Promise<void>((resolve) => {
        releaseSouth = resolve;
      });
    }
    const boats =
      region === '3'
        ? [fishappBoat('b1', '삼천포항', '남해권')]
        : [fishappBoat('a1', '신진도항', '서해권')];
    return r.fulfill({ json: { ok: true, boats, totalCached: 177 } });
  });

  await page.goto('/booking');
  const ports = page.locator('[role="group"][aria-label="항구 필터"] button');
  await expect(ports).toContainText(['전체', '신진도항'], { timeout: 15000 });

  await page
    .locator('[role="group"][aria-label="지역 필터"]')
    .getByRole('button', { name: '남해', exact: true })
    .click();

  // 남해 요청이 아직 안 끝난 이 순간 — 서해 항구가 남아 있으면 안 된다.
  await expect
    .poll(() => directoryRegion, { timeout: 5000 })
    .toBe('3');
  await expect(page.getByRole('button', { name: '신진도항', exact: true })).toHaveCount(0);

  releaseSouth?.();
  await expect(page.getByRole('button', { name: '삼천포항', exact: true })).toBeVisible({
    timeout: 15000,
  });
});
