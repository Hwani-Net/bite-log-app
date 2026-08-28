import { test, expect } from '@playwright/test';

// 2026-08-28 전수조사: 프로덕션에 BITE_INDEX_API_KEY가 설정된 적이 없어
// 해수부 낚시지수는 항상 모의 데이터인데, "해수부 공식" 배지가 "샘플"
// 배지와 나란히 상시 표시돼 자기모순이었다(공식이면서 동시에 샘플이라고
// 주장). 배지는 실제 데이터 출처와 항상 일치해야 한다.

test('모의 데이터일 때는 "해수부 공식" 배지가 뜨지 않는다', async ({
  page,
}) => {
  await page.route('**/api/bite-index*', (route) =>
    route.fulfill({
      status: 503,
      json: { ok: false, error: 'no_key' },
    }),
  );
  await page.goto('/bite-forecast');
  const section = page.getByText('해양수산부 공식 낚시지수').locator('..');
  await expect(section.getByText('샘플')).toBeVisible({ timeout: 15000 });
  await expect(section.getByText('해수부 공식')).toHaveCount(0);
});

test('실 데이터일 때는 "해수부 공식" 배지가 뜨고 "샘플"은 없다', async ({
  page,
}) => {
  await page.route('**/api/bite-index*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: [
          {
            placeName: '김녕',
            targetFish: '우럭',
            indexScore: 4,
            lat: 33.5,
            lon: 126.7,
          },
        ],
      },
    }),
  );
  await page.goto('/bite-forecast');
  const section = page.getByText('해양수산부 공식 낚시지수').locator('..');
  await expect(section.getByText('해수부 공식')).toBeVisible({ timeout: 15000 });
  await expect(section.getByText('샘플')).toHaveCount(0);
});
