import { describe, it, expect } from 'vitest';
import { analyzeFishingDna } from '@/services/fishingDnaService';
import type { CatchRecord } from '@/types';

// GOAL-2(3차)에서 고친 두 버그를 고정한다:
// ① bestTide가 관측소 지명(stationName)을 집계해 "인천"이 최고 물때로 나오던 것
// ② bestTimeSlot이 저장 시각(createdAt) 기반이라 "밤에 몰아 기록"이 야행성으로 나오던 것

function record(partial: Partial<CatchRecord>): CatchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-08-01T21:30:00', // 저장은 밤 9시반 (소파 기록)
    date: '2026-08-01',
    location: { id: 's', name: '오천항 방파제', lat: 36.4, lng: 126.5 },
    species: '우럭',
    count: 2,
    photos: [],
    visibility: 'private',
    ...partial,
  } as CatchRecord;
}

const tide = (currentPhase?: string) => ({
  stationName: '보령',
  tides: [
    { type: 'High' as const, time: '03:45', level: 620 },
    { type: 'Low' as const, time: '09:58', level: 80 },
  ],
  ...(currentPhase ? { currentPhase } : {}),
});

describe('analyzeFishingDna — bestTide', () => {
  it('aggregates the tidal phase, never the station name', () => {
    const dna = analyzeFishingDna([
      record({ tide: tide('들물 3물'), count: 5 }),
      record({ tide: tide('들물 3물'), count: 4 }),
      record({ tide: tide('썰물 1물'), count: 1 }),
      record({ tide: tide(undefined) }), // phase 없는 옛 기록 — 집계 제외
      record({}),
    ]);
    expect(dna!.bestTide).toBe('들물 3물');
    expect(dna!.bestTide).not.toBe('보령'); // 지명 회귀 방지
  });

  it('omits bestTide entirely when no record carries a phase — old data only', () => {
    const dna = analyzeFishingDna([
      record({ tide: tide(undefined) }),
      record({ tide: tide(undefined) }),
      record({}),
      record({}),
      record({}),
    ]);
    expect(dna!.bestTide).toBeNull();
  });
});

describe('analyzeFishingDna — bestTimeSlot', () => {
  it('uses caughtTime when present — evening logging does not make a night angler', () => {
    // 전부 새벽 5시에 잡고 밤에 저장한 기록 — caughtTime이 이긴다.
    const dna = analyzeFishingDna([
      record({ caughtTime: '05:10' }),
      record({ caughtTime: '05:20' }),
      record({ caughtTime: '04:50' }),
      record({ caughtTime: '05:05' }),
      record({ caughtTime: '05:30' }),
    ]);
    expect(dna!.bestTimeSlot).toBe('새벽 (04~06시)');
    expect(dna!.timeSlotEstimated).toBe(false);
    expect(dna!.archetypeKo).toContain('새벽'); // 아키타입까지 교정됨
  });

  it('falls back to createdAt for old records and flags the estimate', () => {
    const dna = analyzeFishingDna([
      record({ caughtTime: '05:10' }),
      record({ caughtTime: '05:20' }),
      record({}), // createdAt 21시 폴백
      record({}),
      record({}),
    ]);
    expect(dna!.timeSlotEstimated).toBe(true);
  });

  it('ignores malformed caughtTime values', () => {
    const dna = analyzeFishingDna([
      record({ caughtTime: '5시쯤' }), // 형식 불일치 → 폴백
      record({ caughtTime: '05:20' }),
      record({ caughtTime: '05:10' }),
      record({ caughtTime: '05:30' }),
      record({ caughtTime: '04:55' }),
    ]);
    expect(dna!.timeSlotEstimated).toBe(true);
    expect(dna!.bestTimeSlot).toBe('새벽 (04~06시)');
  });
});
