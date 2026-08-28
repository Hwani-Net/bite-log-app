import { describe, it, expect } from 'vitest';
import { nextOpenDate, pendingSeasonOpenAlerts } from '@/lib/seasonOpenAlert';
import type { CatchRecord } from '@/types';

// 규정DB 실값: 주꾸미 금어기 5/1~8/31(해제 9/1), 감성돔 5/1~6/30(해제 7/1),
// 대구 1/16~2/15류의 겨울 금어기 존재. catchLegality.test의 DB-핀이 지킨다.
function record(species: string, locationName = '오천항'): CatchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-08-01T09:00:00.000Z',
    date: '2026-08-01',
    location: { id: 's', name: locationName, lat: 36.4, lng: 126.5 },
    species,
    count: 2,
    photos: [],
    visibility: 'private',
  } as CatchRecord;
}

describe('nextOpenDate', () => {
  it('is the day after the closed-season end, rolling months naturally', () => {
    expect(nextOpenDate('8/31', new Date(2026, 7, 29))!.getTime()).toBe(
      new Date(2026, 8, 1).getTime(), // 9/1
    );
    expect(nextOpenDate('6/30', new Date(2026, 5, 28))!.getTime()).toBe(
      new Date(2026, 6, 1).getTime(), // 7/1
    );
  });

  it('rolls to next year when this year\'s opening already passed — 12/31 opens on new year\'s day', () => {
    expect(nextOpenDate('8/31', new Date(2026, 9, 10))!.getTime()).toBe(
      new Date(2027, 8, 1).getTime(),
    );
    expect(nextOpenDate('12/31', new Date(2026, 11, 30))!.getTime()).toBe(
      new Date(2027, 0, 1).getTime(),
    );
  });

  it('treats today-as-opening-day as still upcoming (daysLeft 0 case)', () => {
    expect(nextOpenDate('8/31', new Date(2026, 8, 1))!.getTime()).toBe(
      new Date(2026, 8, 1).getTime(),
    );
  });

  it('rejects malformed inputs', () => {
    expect(nextOpenDate('', new Date())).toBeNull();
    expect(nextOpenDate('13/40', new Date())).toBeNull();
    expect(nextOpenDate('8-31', new Date())).toBeNull();
  });
});

describe('pendingSeasonOpenAlerts', () => {
  const jukumiHistory = [record('주꾸미'), record('주꾸미'), record('우럭')];

  it('alerts inside the D-3 window for a species the user actually fishes', () => {
    // 2026-08-29 → 주꾸미 해제(9/1)까지 3일
    const alerts = pendingSeasonOpenAlerts(jukumiHistory, new Date(2026, 7, 29));
    expect(alerts).toEqual([
      { species: '주꾸미', openDate: '2026-09-01', daysLeft: 3 },
    ]);
    // 해제 당일도 알림 대상(오늘부터 풀림)
    expect(
      pendingSeasonOpenAlerts(jukumiHistory, new Date(2026, 8, 1))[0].daysLeft,
    ).toBe(0);
  });

  it('stays silent outside the window — D-4 is too early, D+1 is over', () => {
    expect(pendingSeasonOpenAlerts(jukumiHistory, new Date(2026, 7, 28))).toEqual([]);
    expect(pendingSeasonOpenAlerts(jukumiHistory, new Date(2026, 8, 2))).toEqual([]);
  });

  it('never alerts species the user has no records of, or users with no records', () => {
    // 우럭만 기록 — 주꾸미 해제 창이어도 침묵
    expect(
      pendingSeasonOpenAlerts([record('우럭')], new Date(2026, 7, 29)),
    ).toEqual([]);
    expect(pendingSeasonOpenAlerts([], new Date(2026, 7, 29))).toEqual([]);
  });

  it('ignores species outside the auto-detected top 3', () => {
    // 상위 3종(농어·볼락·광어)이 주꾸미를 밀어낸다 — 1회짜리 주꾸미는 내 어종이 아님
    const crowded = [
      record('농어'), record('농어'), record('농어'),
      record('볼락'), record('볼락'), record('볼락'),
      record('광어'), record('광어'), record('광어'),
      record('주꾸미'),
    ];
    expect(pendingSeasonOpenAlerts(crowded, new Date(2026, 7, 29))).toEqual([]);
  });
});
