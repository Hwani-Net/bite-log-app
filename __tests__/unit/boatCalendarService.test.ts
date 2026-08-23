import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseBoatDetailMeta,
  parseBoatCalendarHtml,
} from '@/services/boatCalendarService';

const detail = readFileSync(
  join(__dirname, '../fixtures/thefishing-detail-4247.html'),
  'utf8',
);
const septAjax = readFileSync(
  join(__dirname, '../fixtures/thefishing-calendar-202609.html'),
  'utf8',
);

describe('parseBoatDetailMeta', () => {
  const meta = parseBoatDetailMeta(detail, '4247');

  it('reads st_uid needed for month navigation', () => {
    expect(meta.stUid).toBe('645');
  });

  it("points 예약하기 at the boat's own homepage booking page, not thefishing", () => {
    expect(meta.bookingUrl).toMatch(/^http:\/\/yusungho\.kr\/index\.php\?mid=bk/);
    expect(meta.bookingUrl).not.toContain('&amp;');
  });

  it('extracts name, capacity, fish tags, area, image', () => {
    expect(meta.name).toContain('몬스터호');
    expect(meta.capacity).toBe('22인승');
    expect(meta.fishTags).toEqual(['우럭 광어', '쭈꾸미 갑오징어']);
    expect(meta.areaPath).toBe('서해권 > 경기도 > 인천 > 오이도');
    expect(meta.imageUrl).toMatch(/^https:\/\/theimage\.myfishmap\.kr\//);
  });
});

describe('parseBoatCalendarHtml — current month on detail page', () => {
  const days = parseBoatCalendarHtml(detail, '202608');

  it('parses the visible month cells', () => {
    expect(days.length).toBeGreaterThan(0);
    days.forEach((d) => expect(d.date).toMatch(/^2026-08-\d{2}$/));
  });

  it('marks a known bookable day with remaining seats', () => {
    const d24 = days.find((d) => d.day === 24);
    expect(d24?.status).toBe('available');
    expect(d24?.remainingSeats).toBe(19);
    expect(d24?.tide).toBe('3물');
  });

  it('marks a known sold-out day as full', () => {
    const d23 = days.find((d) => d.day === 23);
    expect(d23?.status).toBe('full');
  });

  it('leaves days with no trip as none', () => {
    const d16 = days.find((d) => d.day === 16);
    expect(d16?.status).toBe('none');
  });

  it('carries the 공지 and price line for bookable days', () => {
    const d24 = days.find((d) => d.day === 24);
    expect(d24?.notice).toContain('09:30');
    expect(d24?.priceLine).toContain('50,000');
  });
});

describe('parseBoatCalendarHtml — month-ajax response', () => {
  const days = parseBoatCalendarHtml(septAjax, '202609');

  it('parses the ajax month using the passed ym', () => {
    expect(days.length).toBeGreaterThan(0);
    days.forEach((d) => expect(d.date).toMatch(/^2026-09-\d{2}$/));
  });

  it('has at least one bookable day with a seat count', () => {
    const bookable = days.filter((d) => d.status === 'available');
    expect(bookable.length).toBeGreaterThan(0);
    expect(bookable.every((d) => typeof d.remainingSeats === 'number')).toBe(true);
  });
});

describe('parseBoatCalendarHtml — degenerate input', () => {
  it('returns [] for HTML with no calendar', () => {
    expect(parseBoatCalendarHtml('<html><body>nope</body></html>', '202609')).toEqual([]);
  });
});
