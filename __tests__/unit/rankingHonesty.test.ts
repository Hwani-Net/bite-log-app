import { describe, it, expect } from 'vitest';
import {
  unrankedCount,
  filterByRegion,
  earnedBadgeIcons,
} from '@/lib/rankingHonesty';
import type { CatchRecord } from '@/types';

const NOW = new Date(2026, 7, 20); // 2026-08-20

function record(partial: Partial<CatchRecord>): CatchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-08-01T09:00:00.000Z',
    date: '2026-08-10',
    location: { name: '오천항' },
    species: '우럭',
    count: 2,
    photos: [],
    visibility: 'private',
    ...partial,
  } as CatchRecord;
}

describe('unrankedCount', () => {
  it('counts this season private records — the ones the leaderboard cannot see', () => {
    const records = [
      record({ date: '2026-08-01' }), // 비공개, 이번 달
      record({ date: '2026-08-15' }), // 비공개, 이번 달
      record({ date: '2026-08-16', visibility: 'public' }), // 공개 → 반영됨
      record({ date: '2026-07-31' }), // 지난 달 → 이번 시즌 아님
    ];
    expect(unrankedCount(records, NOW)).toBe(2);
  });

  it('treats a missing visibility as private (the app default)', () => {
    const legacy = { ...record({ date: '2026-08-05' }), visibility: undefined };
    expect(unrankedCount([legacy as unknown as CatchRecord], NOW)).toBe(1);
  });

  it('is zero when everything is public or there is nothing', () => {
    expect(
      unrankedCount([record({ date: '2026-08-05', visibility: 'public' })], NOW),
    ).toBe(0);
    expect(unrankedCount([], NOW)).toBe(0);
  });
});

describe('filterByRegion', () => {
  const items = [
    { id: 'a', region: '서해' },
    { id: 'b', region: '남해' },
    { id: 'c' }, // region 없음
  ];

  it('passes everything through for 전국 or an empty region', () => {
    expect(filterByRegion(items, '전국')).toHaveLength(3);
    expect(filterByRegion(items, '')).toHaveLength(3);
  });

  it('keeps only the requested region and drops unknown-region items', () => {
    expect(filterByRegion(items, '서해').map((i) => i.id)).toEqual(['a']);
    expect(filterByRegion(items, '동해')).toEqual([]);
  });
});

describe('earnedBadgeIcons', () => {
  it('shows only earned badges up to the limit, in order', () => {
    const badges = [
      { icon: 'a', earned: true },
      { icon: 'b', earned: false },
      { icon: 'c', earned: true },
      { icon: 'd', earned: true },
      { icon: 'e', earned: true },
    ];
    expect(earnedBadgeIcons(badges)).toEqual(['a', 'c', 'd']);
    expect(earnedBadgeIcons(badges, 1)).toEqual(['a']);
  });

  it('returns nothing when none are earned', () => {
    expect(earnedBadgeIcons([{ icon: 'a', earned: false }])).toEqual([]);
    expect(earnedBadgeIcons([])).toEqual([]);
  });
});
