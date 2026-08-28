import { describe, it, expect } from 'vitest';
import {
  nextOpenDate,
  pendingSeasonOpenAlerts,
  unnotifiedAlerts,
  markFired,
} from '@/lib/seasonOpenAlert';
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

  it('rejects malformed inputs, including days that do not exist in the month', () => {
    expect(nextOpenDate('', new Date())).toBeNull();
    expect(nextOpenDate('13/40', new Date())).toBeNull();
    expect(nextOpenDate('8-31', new Date())).toBeNull();
    expect(nextOpenDate('2/31', new Date(2026, 0, 1))).toBeNull(); // Date 오버플로 방지
    expect(nextOpenDate('4/31', new Date(2026, 0, 1))).toBeNull();
  });
});

describe('dedupe helpers — only real firings are marked', () => {
  const alerts = [
    { species: '주꾸미', openDate: '2026-09-01', daysLeft: 2 },
    { species: '감성돔', openDate: '2026-09-01', daysLeft: 2 },
  ];

  it('unnotifiedAlerts filters already-marked entries and survives corrupt storage', () => {
    expect(unnotifiedAlerts(alerts, ['주꾸미|2026-09-01'])).toEqual([alerts[1]]);
    expect(unnotifiedAlerts(alerts, 'garbage')).toEqual(alerts);
    expect(unnotifiedAlerts(alerts, [42, null])).toEqual(alerts);
  });

  it('markFired appends only fired keys and prunes past openings for next-year rearm', () => {
    const next = markFired(
      ['지난어종|2026-08-20', '주꾸미|2026-09-01'],
      ['감성돔|2026-09-01'],
      '2026-08-30',
    );
    expect(next).toEqual(['주꾸미|2026-09-01', '감성돔|2026-09-01']);
  });

  it('a skipped send (no fired keys) leaves nothing marked — the retry window stays open', () => {
    // 권한 거부·조용한 시간으로 발화가 생략되면 fired가 비고, 마커도
    // 그대로다 — 다음 앱 오픈에서 다시 시도된다.
    expect(markFired([], [], '2026-08-30')).toEqual([]);
    expect(unnotifiedAlerts(alerts, [])).toEqual(alerts);
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
