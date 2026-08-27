import { describe, it, expect } from 'vitest';
import { biteGradeForDate, BITE_GRADE_LABEL, BITE_GRADE_DOT_COLOR } from '@/lib/calendarBiteOverlay';
import { getLunarInfo } from '@/services/lunarService';

describe('biteGradeForDate', () => {
  it('is deterministic — same date always yields the same grade', () => {
    expect(biteGradeForDate('2026-09-15')).toBe(biteGradeForDate('2026-09-15'));
  });

  // The grading logic itself (사리/조금 → excellent/good/fair/poor) is
  // lunarService's own responsibility and is exercised there — what this
  // checks is that a future date parses and reaches getLunarInfo() without
  // throwing, which matters because a calendar page calls this for dates
  // months out, not just "today".
  it('returns one of the four known grades for an arbitrary future date', () => {
    const grade = biteGradeForDate('2027-01-01');
    expect(['excellent', 'good', 'fair', 'poor']).toContain(grade);
  });

  it('returns null for a malformed date string', () => {
    expect(biteGradeForDate('2026/08/27')).toBeNull();
    expect(biteGradeForDate('not-a-date')).toBeNull();
    expect(biteGradeForDate('')).toBeNull();
  });

  it('returns null for a calendar-invalid date (rolls over silently in JS Date)', () => {
    // 2026 is not a leap year — Feb 30 doesn't exist and native Date would
    // silently roll it into March if not explicitly rejected.
    expect(biteGradeForDate('2026-02-30')).toBeNull();
    expect(biteGradeForDate('2026-13-01')).toBeNull();
  });

  it('delegates to lunarService on local Y/M/D, not UTC-parsed ones', () => {
    // If this used `new Date(iso)` (UTC) instead of local-component
    // construction, a KST run would compute the lunar day for one day
    // earlier than intended. First assertion is the wiring check — same
    // date in, same value lunarService itself would compute, out.
    const local = biteGradeForDate('2026-08-27');
    const viaLocalComponents = getLunarInfo(new Date(2026, 7, 27)).fishingImpact;
    const viaUTCString = getLunarInfo(new Date('2026-08-27')).fishingImpact;
    expect(local).toBe(viaLocalComponents);
    // Only assert they'd differ when the environment's offset actually
    // pushes the UTC-parsed date to a different local day — otherwise this
    // is environment-dependent noise, not a real assertion.
    if (new Date('2026-08-27').getDate() !== 27) {
      expect(local).not.toBe(viaUTCString);
    }
  });
});

describe('BITE_GRADE_LABEL / BITE_GRADE_DOT_COLOR', () => {
  it('has an entry for every grade', () => {
    const grades = ['excellent', 'good', 'fair', 'poor'] as const;
    for (const g of grades) {
      expect(BITE_GRADE_LABEL[g]).toBeTruthy();
      expect(BITE_GRADE_DOT_COLOR[g]).toBeTruthy();
    }
  });
});
