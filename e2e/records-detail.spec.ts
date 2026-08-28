import { test, expect } from '@playwright/test';

// GOAL-1(3차) 회귀 고정: 상세 편집 저장이 location을 {name}만으로 덮어써
// 제목/메모만 고쳐도 GPS 좌표가 지워지던 버그. 저장 후 localStorage의
// 원본 데이터에서 lat/lng가 살아 있는지 데이터 레벨로 단언한다.
test.describe('Record detail edit — /records/detail', () => {
  const RECORD = {
    id: 'e2e-gps-1',
    createdAt: '2026-08-01T09:00:00.000Z',
    date: '2026-08-01',
    location: { id: 's1', name: '오천항', lat: 36.4396, lng: 126.5194 },
    species: '우럭',
    count: 3,
    photos: [],
    visibility: 'private',
    memo: '원래 메모',
  };

  test('editing the memo keeps the GPS coordinates', async ({ page }) => {
    await page.addInitScript((record) => {
      localStorage.setItem('fishlog_catches', JSON.stringify([record]));
    }, RECORD);
    await page.goto(`/records/detail?id=${RECORD.id}`);

    await page.getByRole('button', { name: '수정' }).click();
    // bare `textarea`는 dev 오버레이의 textarea까지 잡혀 strict 위반 —
    // 앱의 메모 필드를 접근성 이름으로 정확히 지정한다.
    const memoField = page.getByRole('textbox', { name: '메모' });
    await expect(memoField).toBeVisible();
    await memoField.fill('메모만 바꿨다 — 좌표는 그대로여야 한다');
    await page.getByRole('button', { name: '기록 저장' }).click();

    // 저장 완료(편집 모드 종료 → 수정 버튼 복귀)까지 기다린 뒤 데이터 검증.
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible({
      timeout: 10000,
    });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]'),
    );
    expect(saved[0].memo).toBe('메모만 바꿨다 — 좌표는 그대로여야 한다');
    expect(saved[0].location.lat).toBe(36.4396);
    expect(saved[0].location.lng).toBe(126.5194);
    expect(saved[0].location.name).toBe('오천항');
  });
});
