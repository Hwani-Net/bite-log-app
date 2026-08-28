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

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((r) => {
      localStorage.setItem('fishlog_catches', JSON.stringify(r));
    }, seed);
    await page.goto('/records');
    await page.getByRole('button', { name: /필터|Filter/ }).first().click().catch(() => {});
  });

  test('the species chip no longer matches a memo mention', async ({ page }) => {
    // 필터 패널 열기(아이콘 버튼) — 칩이 보일 때까지.
    const chip = page.getByRole('button', { name: '우럭', exact: true });
    if (!(await chip.isVisible().catch(() => false))) {
      await page.locator('button:near(input)').first().click();
    }
    await chip.click();

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
    expect(urok).toContain('05:20');
    expect(urok).toContain('지그헤드 5g');
    expect(urok).toContain('비공개');
  });
});
