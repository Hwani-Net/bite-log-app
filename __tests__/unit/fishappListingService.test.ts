import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFishappResponse } from '@/services/fishappListingService';

const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/fishapp-page1.json'), 'utf8'),
);

describe('parseFishappResponse', () => {
  const boats = parseFishappResponse(fixture);

  it('parses every ship in the page', () => {
    expect(boats.length).toBe(10);
  });

  it('extracts a known boat correctly', () => {
    const hit = boats.find((b) => b.shipId === 'H0000972LR');
    expect(hit?.name).toBe('통영낚시친구');
    expect(hit?.province).toBe('경남');
    expect(hit?.area).toBe('통영');
    expect(hit?.harbor).toBe('통영영운리항');
  });

  it('buckets 경남 into 남해권, matching thefishing.kr\'s own grouping', () => {
    const hit = boats.find((b) => b.shipId === 'H0000972LR');
    expect(hit?.seaRegion).toBe('남해권');
  });

  it('every boat has a detail URL with its own shipId', () => {
    boats.forEach((b) => {
      expect(b.detailUrl).toBe(
        `https://www.fishapp.co.kr/pt/schd/ship_info?SHIP_ID=${b.shipId}`,
      );
    });
  });

  it('returns [] for a response with no shipList', () => {
    expect(parseFishappResponse({})).toEqual([]);
    expect(parseFishappResponse(null)).toEqual([]);
  });
});
