import { test, expect } from '@playwright/test';
import fs from 'fs';

// 5차 GOAL-1 — 어종 칩이 어종 필드 전용이 됐는지, 새 필터가 실제로
// 좁히는지, CSV가 전 필드로 나가는지.
test.describe('Records filters & export — /records', () => {
  const base = {
    location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
    photos: [],
    visibility: 'private',
    createdAt: '2026-09-01T09:00:00.000Z',
  };
  const seed = [
    { ...base, id: 'r-urok', date: '2026-08-10', species: '우럭', count: 3, caughtTime: '05:20', tackle: '지그헤드 5g' },
    { ...base, id: 'r-memo', date: '2026-08-11', species: '광어', count: 2, memo: '옆사람이 우럭 잡음' },
    { ...base, id: 'r-photo', date: '2026-09-05', species: '광어', count: 1, photos: ['data:image/gif;base64,R0lGODlhAQABAAAAACw='] },
  ];

  // 필터 패널은 검색창 옆 아이콘 버튼으로 연다 — 추측성 재시도 대신
  // 패널 안 요소가 실제로 보일 때까지를 오픈 성공의 정의로 삼는다.
  async function openFilters(page: import('@playwright/test').Page) {
    const chip = page.getByRole('button', { name: '우럭', exact: true });
    if (await chip.isVisible().catch(() => false)) return;
    await page.locator('input[placeholder]').first().locator('..').getByRole('button').first().click();
    await expect(chip).toBeVisible({ timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((r) => {
      // init script는 내비게이션마다 실행된다 — 1회만 시딩해야 편집
      // 결과(사진 삭제 등)가 다음 페이지 이동에서 되살아나지 않는다.
      if (localStorage.getItem('__e2e_seeded')) return;
      localStorage.setItem('__e2e_seeded', '1');
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, seed);
    await page.goto('/records');
    await openFilters(page);
  });

  test('the species chip no longer matches a memo mention', async ({ page }) => {
    await page.getByRole('button', { name: '우럭', exact: true }).click();

    // 우럭 기록만 남고, 메모에 "우럭"이 있는 광어 기록은 빠진다.
    await expect(page.getByText('옆사람이 우럭 잡음')).toHaveCount(0);
    await expect(
      page.locator('a[href^="/records/detail"]'),
    ).toHaveCount(1);
  });

  test('date range and photos-only actually narrow the list', async ({ page }) => {
    await page.getByLabel('시작 날짜').fill('2026-09-01');
    await expect(page.locator('a[href^="/records/detail"]')).toHaveCount(1);

    await page.getByLabel('시작 날짜').fill('');
    await page.getByRole('button', { name: '사진 있는 기록' }).click();
    await expect(page.locator('a[href^="/records/detail"]')).toHaveCount(1);
  });

  test('CSV export carries the new columns with real values', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /내보내기|Export/ }).first().click();
    await page.getByText('CSV').click();
    const download = await downloadPromise;
    const text = fs.readFileSync((await download.path())!, 'utf-8');
    const [header, ...rows] = text.replace(/^﻿/, '').split('\n');
    expect(header).toContain('시각');
    expect(header).toContain('채비');
    expect(header).toContain('물때');
    expect(header).toContain('공개여부');
    // 어종 열(3번째)이 우럭인 행 — "우럭"은 다른 기록의 메모에도 있어서
    // 단순 포함 검색은 엉뚱한 행을 고른다.
    const urok = rows.find((r) => r.split(',')[2] === '우럭')!;
    // 행 전체를 값으로 단언 — 컬럼 하나가 밀리면 바로 깨진다.
    expect(urok).toBe(
      '2026-08-10,05:20,우럭,3,,,오천항,36.4,126.5,지그헤드 5g,,,,,,비공개,,',
    );
  });

  test('deleting a photo in detail edit removes it from the photos-only filter', async ({
    page,
  }) => {
    // 사진 편집(GOAL-1 ④)과 사진 필터(②)가 같은 데이터를 공유한다 —
    // 둘을 잇는 회귀 경로.
    await page.getByRole('button', { name: '사진 있는 기록' }).click();
    await expect(page.locator('a[href^="/records/detail"]')).toHaveCount(1);

    await page.goto('/records/detail?id=r-photo');
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByRole('button', { name: '사진 삭제' }).click();
    await page.getByRole('button', { name: '기록 저장' }).click();
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible({
      timeout: 10000,
    });

    await page.goto('/records');
    await openFilters(page);
    await page.getByRole('button', { name: '사진 있는 기록' }).click();
    await expect(page.locator('a[href^="/records/detail"]')).toHaveCount(0);
  });
});
