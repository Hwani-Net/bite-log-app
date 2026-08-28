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
