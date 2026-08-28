import { describe, it, expect } from 'vitest';
import { filterRecords, recordsToCsv, recordsToCsvRows } from '@/lib/recordFilters';
import type { CatchRecord } from '@/types';

function record(partial: Partial<CatchRecord>): CatchRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-09-01T09:00:00.000Z',
    date: '2026-08-10',
    location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
    species: '광어',
    count: 2,
    photos: [],
    visibility: 'private',
    ...partial,
  } as CatchRecord;
}

describe('filterRecords — species chip vs free search', () => {
  const records = [
    record({ id: 'a', species: '우럭' }),
    record({ id: 'b', species: '광어', memo: '옆사람이 우럭 잡음' }),
    record({ id: 'c', species: '광어' }),
  ];

  it('the species filter matches the species field only — the old chip bug', () => {
    // 예전 구현은 칩이 free-text search로 들어가 b(메모에 우럭)도 남겼다.
    expect(filterRecords(records, { species: '우럭' }).map((r) => r.id)).toEqual([
      'a',
    ]);
  });

  it('free search still spans species, location, memo, and tackle', () => {
    expect(filterRecords(records, { search: '우럭' }).map((r) => r.id)).toEqual([
      'a',
      'b',
    ]);
    const withTackle = [record({ id: 't', tackle: '지그헤드 5g' })];
    expect(filterRecords(withTackle, { search: '지그헤드' })).toHaveLength(1);
  });

  it('combines chip and search — both must hold', () => {
    expect(
      filterRecords(records, { species: '광어', search: '우럭' }).map((r) => r.id),
    ).toEqual(['b']);
  });
});

describe('filterRecords — date range and photos', () => {
  const records = [
    record({ id: 'old', date: '2026-07-31' }),
    record({ id: 'mid', date: '2026-08-10', photos: ['data:image/png;base64,x'] }),
    record({ id: 'new', date: '2026-09-01' }),
  ];

  it('is inclusive on both bounds and independent of each other', () => {
    expect(filterRecords(records, { from: '2026-08-10' }).map((r) => r.id)).toEqual([
      'mid',
      'new',
    ]);
    expect(filterRecords(records, { to: '2026-08-10' }).map((r) => r.id)).toEqual([
      'old',
      'mid',
    ]);
    expect(
      filterRecords(records, { from: '2026-08-01', to: '2026-08-31' }).map((r) => r.id),
    ).toEqual(['mid']);
  });

  it('photosOnly keeps records that actually carry a photo', () => {
    expect(filterRecords(records, { photosOnly: true }).map((r) => r.id)).toEqual([
      'mid',
    ]);
  });

  it('returns everything for an empty filter set', () => {
    expect(filterRecords(records, {})).toHaveLength(3);
  });
});

describe('recordsToCsv', () => {
  const full = record({
    date: '2026-08-10',
    caughtTime: '05:20',
    species: '우럭',
    count: 3,
    sizeCm: 32,
    tackle: '지그헤드 5g, 웜',
    weather: { condition: 'Clear', tempC: 21.5, windSpeed: 2.4 },
    tide: { stationName: '보령', tides: [], currentPhase: '들물 3물' },
    visibility: 'public',
    boatUid: '4247',
    memo: '입질 좋았음, 야간',
  });

  it('carries every field the record holds — not the old 7 columns', () => {
    const [row] = recordsToCsvRows([full]);
    expect(row).toEqual([
      '2026-08-10',
      '05:20',
      '우럭',
      '3',
      '32',
      '',
      '오천항',
      '36.4',
      '126.5',
      '지그헤드 5g； 웜', // 쉼표는 전각 치환(엑셀 호환 관행 유지)
      'Clear',
      '21.5',
      '2.4',
      '들물 3물',
      '보령',
      '공개',
      '4247',
      '입질 좋았음； 야간',
    ]);
  });

  it('emits a header row and one line per record', () => {
    const csv = recordsToCsv([full, record({})]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('채비');
    expect(lines[0]).toContain('물때');
    expect(lines).toHaveLength(3);
  });

  it('flattens newlines so a multi-line memo cannot break the row', () => {
    const [row] = recordsToCsvRows([record({ memo: '첫줄\n둘째줄' })]);
    expect(row[17]).toBe('첫줄 둘째줄');
  });
});
