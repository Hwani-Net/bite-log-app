import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBoatCalendarHtml } from '@/services/boatAvailabilityService';

const fixture = readFileSync(
  join(__dirname, '../fixtures/teambite-booking.html'),
  'utf8',
);

describe('parseBoatCalendarHtml', () => {
  const rows = parseBoatCalendarHtml(fixture);

  it('parses at least one row per day in the fixture', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('extracts real boat names, not the pinned notice row', () => {
    const names = new Set(rows.map((r) => r.boatName));
    expect(names.has('팀바이트호')).toBe(true);
    expect(names.has('배쯔호')).toBe(true);
    expect(names.has('공지사항')).toBe(false);
  });

  it('marks a known weather-cancelled day correctly', () => {
    const hit = rows.find(
      (r) => r.date === '2026-08-23' && r.boatName === '팀바이트호',
    );
    expect(hit?.status).toBe('weather');
  });

  it('parses remaining-seat count for an available day', () => {
    const hit = rows.find(
      (r) => r.date === '2026-08-26' && r.boatName.includes('배쯔호'),
    );
    expect(hit?.status).toBe('available');
    expect(hit?.remainingSeats).toBe(20);
  });

  it('every row has a YYYY-MM-DD date', () => {
    rows.forEach((r) => {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('returns an empty array for HTML with no calendar', () => {
    expect(parseBoatCalendarHtml('<html><body>no data</body></html>')).toEqual(
      [],
    );
  });
});
