import { describe, it, expect } from 'vitest';
import {
  alternativeDates,
  isCancellationRisk,
  isWithinAlertWindow,
} from '@/lib/sailCancelAlert';
import type { BoatDayStatus } from '@/services/boatAvailabilityService';

const NOW = new Date(2026, 9, 15, 10, 0); // 2026-10-15

describe('isWithinAlertWindow', () => {
  it('accepts exactly D-1 through D-3', () => {
    expect(isWithinAlertWindow('2026-10-16', NOW)).toBe(true); // D-1
    expect(isWithinAlertWindow('2026-10-17', NOW)).toBe(true); // D-2
    expect(isWithinAlertWindow('2026-10-18', NOW)).toBe(true); // D-3
  });

  it('rejects today, D-4, the past, and malformed dates', () => {
    expect(isWithinAlertWindow('2026-10-15', NOW)).toBe(false); // 당일
    expect(isWithinAlertWindow('2026-10-19', NOW)).toBe(false); // D-4
    expect(isWithinAlertWindow('2026-10-14', NOW)).toBe(false);
    expect(isWithinAlertWindow('2026-13-99', NOW)).toBe(false);
  });

  it('spans month boundaries', () => {
    expect(isWithinAlertWindow('2026-11-02', new Date(2026, 9, 31))).toBe(true); // D-2
  });
});

describe('isCancellationRisk', () => {
  it('fires on wind alone, wave alone, or both at the thresholds', () => {
    expect(
      isCancellationRisk({ date: 'd', windSpeedMax: 10, waveHeightMax: null }),
    ).toBe(true);
    expect(
      isCancellationRisk({ date: 'd', windSpeedMax: null, waveHeightMax: 1.5 }),
    ).toBe(true);
    expect(
      isCancellationRisk({ date: 'd', windSpeedMax: 14, waveHeightMax: 3 }),
    ).toBe(true);
  });

  it('stays quiet below thresholds and on missing data — no false alarms', () => {
    expect(
      isCancellationRisk({ date: 'd', windSpeedMax: 9.9, waveHeightMax: 1.4 }),
    ).toBe(false);
    // 결측은 초과의 증거가 아니다 — 이 회귀가 이 기능의 핵심 계약.
    expect(
      isCancellationRisk({ date: 'd', windSpeedMax: null, waveHeightMax: null }),
    ).toBe(false);
  });
});

describe('alternativeDates', () => {
  const day = (
    date: string,
    boatName: string,
    status: BoatDayStatus['status'],
  ): BoatDayStatus => ({ date, boatName, status });

  const days: BoatDayStatus[] = [
    day('2026-10-16', '팀바이트호', 'available'), // trip 당일 — 대안 아님
    day('2026-10-17', '팀바이트호', 'full'),
    day('2026-10-18', '팀바이트호', 'available'),
    day('2026-10-19', '팀바이트호', 'weather'),
    day('2026-10-20', '배쯔호', 'available'), // 다른 배
    day('2026-10-21', '팀바이트호', 'available'),
    day('2026-10-22', '팀바이트호', 'available'), // limit 밖
    day('2026-10-15', '팀바이트호', 'available'), // trip 이전
  ];

  it('returns the nearest available future dates for the same boat, capped at 2', () => {
    expect(alternativeDates(days, '팀바이트호', '2026-10-16')).toEqual([
      '2026-10-18',
      '2026-10-21',
    ]);
  });

  it('returns empty when the boat has no future availability', () => {
    expect(alternativeDates(days, '배쯔호', '2026-10-20')).toEqual([]);
    expect(alternativeDates([], '팀바이트호', '2026-10-16')).toEqual([]);
  });

  it('dedupes multiple trips of the same boat on one date', () => {
    const dup = [
      day('2026-10-18', '팀바이트호', 'available'),
      day('2026-10-18', '팀바이트호', 'available'), // 오전/오후 두 항차
    ];
    expect(alternativeDates(dup, '팀바이트호', '2026-10-16')).toEqual([
      '2026-10-18',
    ]);
  });
});
