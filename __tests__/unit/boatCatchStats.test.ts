import { describe, it, expect } from 'vitest';
import { summarizeCatchesForBoat } from '@/lib/boatCatchStats';
import type { CatchRecord } from '@/types';

const record = (overrides: Partial<CatchRecord>): CatchRecord => ({
  id: overrides.id ?? Math.random().toString(),
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  date: '2026-08-01',
  location: { name: '대천항' },
  species: '우럭',
  count: 1,
  photos: [],
  visibility: 'public',
  ...overrides,
});

describe('summarizeCatchesForBoat', () => {
  it('counts only records tagged with the given boat uid', () => {
    const records = [
      record({ boatUid: '4247', species: '우럭', count: 3 }),
      record({ boatUid: '9999', species: '우럭', count: 5 }), // different boat
      record({ species: '우럭', count: 2 }), // untagged
    ];
    const summary = summarizeCatchesForBoat(records, '4247');
    expect(summary.recordCount).toBe(1);
    expect(summary.totalCount).toBe(3);
  });

  it('sums counts per species and sorts by count descending', () => {
    const records = [
      record({ boatUid: '4247', species: '우럭', count: 2 }),
      record({ boatUid: '4247', species: '광어', count: 6 }),
      record({ boatUid: '4247', species: '우럭', count: 3 }),
    ];
    const summary = summarizeCatchesForBoat(records, '4247');
    expect(summary.recordCount).toBe(3);
    expect(summary.totalCount).toBe(11);
    expect(summary.bySpecies).toEqual([
      { species: '광어', count: 6 },
      { species: '우럭', count: 5 },
    ]);
  });

  it('returns a zeroed summary when nothing matches', () => {
    const summary = summarizeCatchesForBoat([record({ boatUid: '9999' })], '4247');
    expect(summary).toEqual({ recordCount: 0, totalCount: 0, bySpecies: [] });
  });

  it('is unaffected by records with no boatUid at all', () => {
    const summary = summarizeCatchesForBoat(
      [record({}), record({}), record({ boatUid: '4247' })],
      '4247',
    );
    expect(summary.recordCount).toBe(1);
  });
});
