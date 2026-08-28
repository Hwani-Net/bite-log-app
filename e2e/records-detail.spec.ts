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

  test('editing the location name and memo keeps the GPS coordinates', async ({
    page,
  }) => {
    await page.addInitScript((record) => {
      localStorage.setItem('fishlog_catches', JSON.stringify([record]));
    }, RECORD);
    await page.goto(`/records/detail?id=${RECORD.id}`);

    await page.getByRole('button', { name: '수정' }).click();
    // 버그의 원래 증상이 바로 "위치명을 고치면 좌표가 지워진다"이므로
    // 위치명 변경이 이 테스트의 핵심 케이스다(메모만 바꾸는 건 절반).
    const nameField = page.getByRole('textbox', { name: '장소' });
    await expect(nameField).toHaveValue('오천항');
    await nameField.fill('대천항 방파제');
    // bare `textarea`는 dev 오버레이의 textarea까지 잡혀 strict 위반 —
    // 앱의 메모 필드를 접근성 이름으로 정확히 지정한다.
    await page
      .getByRole('textbox', { name: '메모' })
      .fill('위치명을 바꿨다 — 좌표는 그대로여야 한다');
    await page.getByRole('button', { name: '기록 저장' }).click();

    // 저장 완료(편집 모드 종료 → 수정 버튼 복귀)까지 기다린 뒤 데이터 검증.
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible({
      timeout: 10000,
    });
    const saved = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]').find(
          (r: { id: string }) => r.id === id,
        ),
      RECORD.id,
    );
    expect(saved.location.name).toBe('대천항 방파제'); // 이름은 바뀌고
    expect(saved.location.lat).toBe(36.4396); // 좌표는 살아 있다
    expect(saved.location.lng).toBe(126.5194);
    expect(saved.memo).toBe('위치명을 바꿨다 — 좌표는 그대로여야 한다');
  });

  // GOAL-2(3차): 잡은 시각(caughtTime)의 편집 왕복 + 물때 스냅샷 표시.
  test('caught time edits round-trip, and a stored tide phase renders', async ({
    page,
  }) => {
    const withPhase = {
      ...RECORD,
      id: 'e2e-time-1',
      caughtTime: '05:20',
      tide: {
        stationName: '보령',
        tides: [{ type: 'High', time: '03:45', level: 620 }],
        currentPhase: '들물 3물',
      },
    };
    await page.addInitScript((record) => {
      localStorage.setItem('fishlog_catches', JSON.stringify([record]));
    }, withPhase);
    await page.goto(`/records/detail?id=${withPhase.id}`);

    // 보기 모드: 날짜 옆 시각 + 물때 스냅샷이 보인다.
    await expect(page.getByText('2026-08-01 · 05:20')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('들물 3물')).toBeVisible();

    // 편집: 시각을 바꿔 저장하면 데이터에 반영된다.
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('잡은 시각').fill('06:40');
    await page.getByRole('button', { name: '기록 저장' }).click();
    await expect(page.getByText('2026-08-01 · 06:40')).toBeVisible({
      timeout: 10000,
    });
    const saved = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]').find(
          (r: { id: string }) => r.id === id,
        ),
      withPhase.id,
    );
    expect(saved.caughtTime).toBe('06:40');
    expect(saved.tide.currentPhase).toBe('들물 3물'); // 편집이 물때를 안 지운다
  });
});
