import { describe, it, expect } from 'vitest';
import {
  isDayBefore,
  dayBeforeTrips,
  seasonReminders,
} from '@/lib/tripReminders';
import type { MyBoatMap } from '@/services/myBoatService';
import type { CatchRecord } from '@/types';

const NOW = new Date(2026, 9, 15, 10, 30); // 2026-10-15 10:30 로컬

function record(partial: Partial<CatchRecord>): CatchRecord {
  return {
    id: 'r1',
    createdAt: '2026-01-01T00:00:00.000Z',
    date: '2025-10-10',
    location: { id: 's1', name: '테스트', lat: 36, lng: 126 },
    species: '우럭',
    count: 3,
    photos: [],
    visibility: 'private',
    ...partial,
  } as CatchRecord;
}

describe('isDayBefore', () => {
  it('is true only for the calendar day after now', () => {
    expect(isDayBefore('2026-10-16', NOW)).toBe(true);
    expect(isDayBefore('2026-10-15', NOW)).toBe(false); // 당일은 D-1 아님
    expect(isDayBefore('2026-10-17', NOW)).toBe(false);
    expect(isDayBefore('2026-10-14', NOW)).toBe(false);
  });

  it('rolls over month and year boundaries in local time', () => {
    expect(isDayBefore('2026-11-01', new Date(2026, 9, 31, 23))).toBe(true);
    expect(isDayBefore('2027-01-01', new Date(2026, 11, 31, 5))).toBe(true);
  });
});

describe('dayBeforeTrips', () => {
  const myBoats: MyBoatMap = {
    '100': {
      uid: '100',
      favorite: true,
      verdict: null,
      memo: '',
      rides: [{ date: '2026-10-16' }, { date: '2026-10-20' }],
      snapshots: [
        { name: '옛이름호', areaPath: 'a', seenAt: '2026-01-01' },
        { name: '스텔라호', areaPath: '서해 > 대천항', seenAt: '2026-06-01' },
      ],
      goneStreak: 0,
    },
    '200': {
      uid: '200',
      favorite: false, // 즐겨찾기 아님 — 내일 날짜라도 제외
      verdict: null,
      memo: '',
      rides: [{ date: '2026-10-16' }],
      snapshots: [{ name: '남해호', areaPath: 'b', seenAt: '2026-01-01' }],
      goneStreak: 0,
    },
  };

  it('collects tomorrow trips from watchlist and favorite rides, latest snapshot name wins', () => {
    const watchlist = [
      { boatName: '몬스터호', date: '2026-10-16' },
      { boatName: '몬스터호', date: '2026-10-18' }, // 내일 아님
    ];
    expect(dayBeforeTrips(watchlist, myBoats, NOW)).toEqual([
      { name: '몬스터호', date: '2026-10-16' },
      { name: '스텔라호', date: '2026-10-16', uid: '100' },
    ]);
  });

  it('dedupes the same boat+date appearing in both sources', () => {
    const watchlist = [{ boatName: '스텔라호', date: '2026-10-16' }];
    const trips = dayBeforeTrips(watchlist, myBoats, NOW);
    expect(trips).toHaveLength(1);
    expect(trips[0]).toEqual({ name: '스텔라호', date: '2026-10-16' });
  });

  it('returns empty when nothing is scheduled tomorrow', () => {
    expect(dayBeforeTrips([], {}, NOW)).toEqual([]);
  });
});

describe('seasonReminders', () => {
  it('reminds for past-year same-month boat records whose species is in season now', () => {
    const records = [
      // 10월은 우럭 peak([3,4,10,11,12], gold는 [11,12]) — peak로 판정
      record({ id: 'a', date: '2025-10-10', species: '우럭', boatUid: '100' }),
      record({ id: 'b', date: '2024-10-02', species: '우럭', boatUid: '100' }),
      // 10월은 광어 gold([10,11]) — gold로 판정
      record({ id: 'c', date: '2025-10-20', species: '광어', boatUid: '200' }),
    ];
    expect(seasonReminders(records, NOW)).toEqual([
      { species: '우럭', lastYear: 2025, tripCount: 2, status: 'peak' },
      { species: '광어', lastYear: 2025, tripCount: 1, status: 'gold' },
    ]);
  });

  it('excludes current-year records, other months, untagged records, and unknown species', () => {
    const records = [
      record({ id: 'a', date: '2026-10-01', species: '우럭', boatUid: '1' }), // 올해
      record({ id: 'b', date: '2025-09-30', species: '우럭', boatUid: '1' }), // 다른 달
      record({ id: 'c', date: '2025-10-10', species: '우럭' }), // boatUid 없음
      record({ id: 'd', date: '2025-10-10', species: '감성돔', boatUid: '1' }), // 시즌DB 없음
    ];
    expect(seasonReminders(records, NOW)).toEqual([]);
  });

  it('suppresses closed-season species even with matching history', () => {
    // 8월의 주꾸미는 금어기(4/1~8/31) — 작년 8월 기록이 있어도 리마인더 없음
    const augNow = new Date(2026, 7, 28);
    const records = [
      record({ id: 'a', date: '2025-08-20', species: '주꾸미', boatUid: '1' }),
    ];
    expect(seasonReminders(records, augNow)).toEqual([]);
  });

  it('suppresses offseason species', () => {
    // 7월은 우럭 시즌 아님([3,4,10,11,12])
    const julNow = new Date(2026, 6, 10);
    const records = [
      record({ id: 'a', date: '2025-07-05', species: '우럭', boatUid: '1' }),
    ];
    expect(seasonReminders(records, julNow)).toEqual([]);
  });
});
