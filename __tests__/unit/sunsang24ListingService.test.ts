import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseSunsang24Response,
  buildSunsang24Url,
} from '@/services/sunsang24ListingService';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/sunsang24-page1.json'), 'utf8'),
);

describe('parseSunsang24Response', () => {
  const schedules = parseSunsang24Response(fixture);

  it('parses every schedule in the page', () => {
    expect(schedules.length).toBe(6);
  });

  it('extracts a known schedule correctly', () => {
    const hit = schedules.find((s) => s.scheduleNo === 1607368);
    expect(hit?.shipName).toBe('자연피싱호');
    expect(hit?.areaMain).toBe('충남');
    expect(hit?.portName).toBe('마검포항');
    expect(hit?.fishType).toBe('백조기');
    expect(hit?.remainSeats).toBe(1);
    expect(hit?.totalSeats).toBe(20);
  });

  it('shows the complete species list — no "외 N종" truncation like thefishing.kr', () => {
    const hit = schedules.find((s) => s.scheduleNo === 1737576);
    expect(hit?.fishType).toBe(
      '참돔,광어,우럭,주꾸미,갑오징어,노래미,민어,농어,백조기,붕장어',
    );
  });

  it('buckets 충남 into 서해권, matching the other two sources\' grouping', () => {
    const hit = schedules.find((s) => s.scheduleNo === 1607368);
    expect(hit?.seaRegion).toBe('서해권');
  });

  it('every schedule has a detail URL keyed on its own ship number', () => {
    schedules.forEach((s) => {
      expect(s.detailUrl).toBe(`https://www.sunsang24.com/ship/detail/${s.shipNo}`);
    });
  });

  it('returns [] for a response with no list', () => {
    expect(parseSunsang24Response({})).toEqual([]);
    expect(parseSunsang24Response(null)).toEqual([]);
  });
});

describe('buildSunsang24Url', () => {
  it('always sends page and type=general', () => {
    const url = buildSunsang24Url({});
    expect(url).toContain('page=1');
    expect(url).toContain('type=general');
  });

  it('encodes a single day as sdate=date,date — their range format', () => {
    const url = buildSunsang24Url({ date: '2026-08-31' });
    expect(url).toContain('sdate=2026-08-31%2C2026-08-31');
  });

  it('passes a keyword through as search — matches ship name/area/fish_type as substring', () => {
    const url = buildSunsang24Url({ keyword: '백조기' });
    expect(url).toContain(`search=${encodeURIComponent('백조기')}`);
  });

  it('omits date/keyword when not given', () => {
    const url = buildSunsang24Url({ page: 2 });
    expect(url).not.toContain('sdate');
    expect(url).not.toContain('search');
    expect(url).toContain('page=2');
  });
});
