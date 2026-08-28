import { describe, it, expect } from 'vitest';
import {
  conditionStats,
  matchTodayConditions,
  tempBucket,
  windBucket,
  MIN_SAMPLES,
} from '@/lib/conditionStats';
import type { CatchRecord } from '@/types';

function record(partial: Partial<CatchRecord>): CatchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-08-01T09:00:00.000Z',
    date: '2026-08-01',
    location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
    species: '우럭',
    count: 2,
    photos: [],
    visibility: 'private',
    ...partial,
  } as CatchRecord;
}

describe('bucket boundaries', () => {
  it('temp buckets split exactly at 10/17/24', () => {
    expect(tempBucket(9.9)).toBe('10°C 미만');
    expect(tempBucket(10)).toBe('10~17°C');
    expect(tempBucket(16.9)).toBe('10~17°C');
    expect(tempBucket(17)).toBe('17~24°C');
    expect(tempBucket(24)).toBe('24°C 이상');
  });

  it('wind buckets split exactly at 4/8', () => {
    expect(windBucket(3.9)).toBe('바람 약(4m/s 미만)');
    expect(windBucket(4)).toBe('바람 중(4~8m/s)');
    expect(windBucket(8)).toBe('바람 강(8m/s 이상)');
  });
});

describe('conditionStats', () => {
  it('averages per bucket and picks the best only with enough samples', () => {
    const records = [
      // 17~24°C 구간 4회, 평균 (5+4+3+4)/4 = 4
      record({ weather: { condition: 'clear', tempC: 18 }, count: 5 }),
      record({ weather: { condition: 'clear', tempC: 20 }, count: 4 }),
      record({ weather: { condition: 'clear', tempC: 22 }, count: 3 }),
      record({ weather: { condition: 'clear', tempC: 19 }, count: 4 }),
      // 10~17°C 구간 1회, 평균 9 — 표본 부족이라 best가 되면 안 됨
      record({ weather: { condition: 'clear', tempC: 12 }, count: 9 }),
    ];
    const temp = conditionStats(records).find((a) => a.key === 'temp')!;
    expect(temp.sampled).toBe(5);
    expect(temp.best?.label).toBe('17~24°C'); // 표본 1회짜리 9마리에 안 속는다
    expect(temp.best?.avgCount).toBe(4);
    expect(temp.best?.records).toBe(4);
    // 구간 자체는 표본 부족이어도 나열엔 나온다.
    expect(temp.buckets.map((b) => b.label)).toContain('10~17°C');
  });

  it('drops records lacking the axis value from that axis only', () => {
    const records = [
      record({ weather: { condition: 'clear', tempC: 18 } }), // windSpeed 없음
      record({
        weather: { condition: 'clear', tempC: 18, windSpeed: 2 },
        tide: { stationName: '보령', tides: [], currentPhase: '들물 3물' },
      }),
      record({}), // 조건 전무
    ];
    const axes = conditionStats(records);
    expect(axes.find((a) => a.key === 'temp')!.sampled).toBe(2);
    expect(axes.find((a) => a.key === 'wind')!.sampled).toBe(1);
    expect(axes.find((a) => a.key === 'tide')!.sampled).toBe(1);
  });

  it('groups tide by the stored phase label, most-sampled first', () => {
    const tide = (p: string) => ({ stationName: '보령', tides: [], currentPhase: p });
    const records = [
      record({ tide: tide('들물 3물'), count: 4 }),
      record({ tide: tide('들물 3물'), count: 6 }),
      record({ tide: tide('들물 3물'), count: 5 }),
      record({ tide: tide('조금'), count: 1 }),
    ];
    const axis = conditionStats(records).find((a) => a.key === 'tide')!;
    expect(axis.buckets[0].label).toBe('들물 3물');
    expect(axis.best?.label).toBe('들물 3물');
    expect(axis.best?.avgCount).toBe(5);
  });

  it('rejects NaN condition values instead of bucketing them as cold', () => {
    const records = [
      record({ weather: { condition: 'clear', tempC: NaN } }),
      record({ weather: { condition: 'clear', tempC: 18 } }),
    ];
    const temp = conditionStats(records).find((a) => a.key === 'temp')!;
    expect(temp.sampled).toBe(1); // NaN 기록은 표본이 아니다
    expect(temp.buckets.map((b) => b.label)).not.toContain('10°C 미만');
  });

  it('yields empty axes with null best on no records', () => {
    for (const axis of conditionStats([])) {
      expect(axis.best).toBeNull();
      expect(axis.sampled).toBe(0);
    }
  });
});

describe('matchTodayConditions', () => {
  const history = [
    record({ weather: { condition: 'clear', tempC: 18, windSpeed: 2 }, count: 5 }),
    record({ weather: { condition: 'clear', tempC: 20, windSpeed: 3 }, count: 4 }),
    record({ weather: { condition: 'clear', tempC: 22, windSpeed: 2.5 }, count: 3 }),
    record({ weather: { condition: 'clear', tempC: 12, windSpeed: 9 }, count: 9 }),
  ];

  it('returns only axes whose today-bucket has enough samples', () => {
    const matches = matchTodayConditions(history, { tempC: 19, windSpeed: 1 });
    // 기온 17~24°C: 3회 표본 → 매칭. 풍속 약: 3회 → 매칭.
    expect(matches.map((m) => m.key).sort()).toEqual(['temp', 'wind']);
    expect(matches.find((m) => m.key === 'temp')!.avgCount).toBe(4);
  });

  it('never fabricates from a thin bucket — one 9-fish day is not a forecast', () => {
    // 오늘이 10~17°C(표본 1회) + 강풍(표본 1회)이면 아무것도 없다.
    expect(matchTodayConditions(history, { tempC: 12, windSpeed: 9 })).toEqual([]);
  });

  it('matches the tide axis by exact stored phase label', () => {
    const tide = (p: string) => ({ stationName: '보령', tides: [], currentPhase: p });
    const withTide = [
      record({ tide: tide('들물 3물'), count: 4 }),
      record({ tide: tide('들물 3물'), count: 6 }),
      record({ tide: tide('들물 3물'), count: 5 }),
    ];
    const matches = matchTodayConditions(withTide, { tidePhase: '들물 3물' });
    expect(matches).toEqual([
      { key: 'tide', name: '물때', bucketLabel: '들물 3물', avgCount: 5, records: 3 },
    ]);
    expect(matchTodayConditions(withTide, { tidePhase: '조금' })).toEqual([]);
  });

  it('handles null/undefined today values without matching anything', () => {
    expect(
      matchTodayConditions(history, { tempC: null, windSpeed: undefined, tidePhase: null }),
    ).toEqual([]);
  });
});
