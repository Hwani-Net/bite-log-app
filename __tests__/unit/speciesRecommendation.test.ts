import { describe, it, expect } from 'vitest';
import { recommendDates } from '@/lib/speciesRecommendation';

// Real grades for 2026-08-01..14 (confirmed via biteGradeForDate directly):
//   08-01 good   08-02 good   08-03 fair   08-04 fair   08-05 poor
//   08-06 poor   08-07 fair   08-08 fair   08-09 good   08-10 good
//   08-11 good   08-12 excellent   08-13 excellent   08-14 good
// Two excellents (08-12, 08-13) plus six good days — a real window with
// both a genuine tie group (excellent) and a case where the tiebreak
// actually matters (six good candidates, only 08-01 can make the top 3).
const TODAY = new Date(2026, 7, 1); // 2026-08-01

describe('recommendDates', () => {
  it('picks the two excellent days, then the earliest good day, for this real window', () => {
    expect(recommendDates(TODAY, 14, 3)).toEqual([
      { date: '2026-08-12', grade: 'excellent' },
      { date: '2026-08-13', grade: 'excellent' },
      { date: '2026-08-01', grade: 'good' }, // earliest of six good days, not 08-02/08-09/etc.
    ]);
  });

  it('respects a smaller limit without changing which dates rank highest', () => {
    expect(recommendDates(TODAY, 14, 1)).toEqual([
      { date: '2026-08-12', grade: 'excellent' },
    ]);
    expect(recommendDates(TODAY, 14, 2)).toEqual([
      { date: '2026-08-12', grade: 'excellent' },
      { date: '2026-08-13', grade: 'excellent' },
    ]);
  });

  it('excludes 08-12/08-13 once the window no longer reaches them', () => {
    const result = recommendDates(TODAY, 7, 3); // only 08-01..08-07
    expect(result.map((r) => r.date)).not.toContain('2026-08-12');
    // Best available in a 7-day window is the two 08-01/08-02 good days,
    // then the earliest fair day (08-03) — confirms the ranking still
    // works correctly on a truncated window, not just the full 14-day one.
    expect(result).toEqual([
      { date: '2026-08-01', grade: 'good' },
      { date: '2026-08-02', grade: 'good' },
      { date: '2026-08-03', grade: 'fair' },
    ]);
  });

  it('returns an empty array for a zero-day window', () => {
    expect(recommendDates(TODAY, 0, 3)).toEqual([]);
  });

  it('defaults to a 14-day window and a limit of 3 when not given', () => {
    expect(recommendDates(TODAY)).toEqual(recommendDates(TODAY, 14, 3));
  });
});
