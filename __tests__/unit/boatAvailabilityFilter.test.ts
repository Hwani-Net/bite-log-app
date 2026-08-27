import { describe, it, expect } from 'vitest';
import { dayAvailability, ymForDate } from '@/lib/boatAvailabilityFilter';

const DAYS = [
  { date: '2026-09-01', day: 1, tide: '4물', status: 'available', remainingSeats: 5 },
  { date: '2026-09-02', day: 2, tide: '5물', status: 'available' }, // 잔여석 미표기
  { date: '2026-09-03', day: 3, tide: '6물', status: 'full' },
  { date: '2026-09-04', day: 4, tide: '7물', status: 'none' },
];

describe('dayAvailability', () => {
  it('reads available with and without a seat count', () => {
    expect(dayAvailability(DAYS, '2026-09-01')).toEqual({
      state: 'available',
      remainingSeats: 5,
    });
    expect(dayAvailability(DAYS, '2026-09-02')).toEqual({
      state: 'available',
      remainingSeats: undefined,
    });
  });

  it('flags full — the only state the toggle is allowed to hide', () => {
    expect(dayAvailability(DAYS, '2026-09-03')).toEqual({ state: 'full' });
  });

  it('treats none, missing dates, and malformed payloads as unknown — never as full', () => {
    expect(dayAvailability(DAYS, '2026-09-04').state).toBe('unknown'); // "none"
    expect(dayAvailability(DAYS, '2026-09-30').state).toBe('unknown'); // 달력에 없는 날짜
    expect(dayAvailability(undefined, '2026-09-01').state).toBe('unknown');
    expect(dayAvailability('garbage', '2026-09-01').state).toBe('unknown');
    expect(dayAvailability([null, 3, { no: 'date' }], '2026-09-01').state).toBe(
      'unknown',
    );
  });
});

describe('ymForDate', () => {
  it('converts a search date to the calendar API ym', () => {
    expect(ymForDate('2026-09-05')).toBe('202609');
    expect(ymForDate('2026-12-31')).toBe('202612');
  });
});
