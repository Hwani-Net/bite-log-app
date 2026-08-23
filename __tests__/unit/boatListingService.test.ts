import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseBoatListingHtml,
  parseBoatListingTotal,
  buildListingUrl,
} from '@/services/boatListingService';

const fixture = readFileSync(
  join(__dirname, '../fixtures/thefishing-listing.html'),
  'utf8',
);
const dateFixture = readFileSync(
  join(__dirname, '../fixtures/thefishing-listing-date.html'),
  'utf8',
);

describe('parseBoatListingHtml', () => {
  const boats = parseBoatListingHtml(fixture);

  it('parses only the 예약리스트 section (20/page), not the fixed 패밀리 strip', () => {
    // The page also carries a 더피싱패밀리 block of ~32 featured boats that
    // ignores every filter; those must not leak into search results.
    expect(boats.length).toBe(20);
  });

  it('extracts a known boat correctly', () => {
    const hit = boats.find((b) => b.uid === '4834');
    expect(hit?.name).toContain('방주호');
    expect(hit?.capacity).toBe('12인승');
    expect(hit?.fishTypes).toContain('우럭');
  });

  it('decodes HTML entities and buckets the sea region', () => {
    const hit = boats.find((b) => b.uid === '4834');
    expect(hit?.areaPath).toBe('서해권 > 충청남도 > 보령시 > 오천항');
    expect(hit?.seaRegion).toBe('서해권');
  });

  it('every boat has a working detail URL with its own uid', () => {
    boats.forEach((b) => {
      expect(b.detailUrl).toBe(
        `https://thefishing.kr/reservation/list.php?uid=${b.uid}`,
      );
    });
  });

  it('does not stop early at commented-out markup', () => {
    // Regression: the page comments out unused icon <li> markup, whose
    // literal `</li>` used to truncate the real boat block before reaching
    // name/area/fish/capacity fields.
    boats.forEach((b) => {
      expect(b.name.length).toBeGreaterThan(0);
    });
  });

  it('parses a date-filtered page the same way', () => {
    const dated = parseBoatListingHtml(dateFixture);
    expect(dated.length).toBe(20);
    expect(dated[0].uid).toBe('3896');
    expect(dated[0].name).toBe('비너스마린');
  });

  it('returns an empty array for HTML with no listings', () => {
    expect(parseBoatListingHtml('<html><body>none</body></html>')).toEqual(
      [],
    );
  });
});

describe('parseBoatListingTotal', () => {
  it('reads the 검색 N건 header', () => {
    expect(parseBoatListingTotal(fixture)).toBe(684);
    expect(parseBoatListingTotal(dateFixture)).toBe(85);
  });
  it('returns 0 when the header is missing', () => {
    expect(parseBoatListingTotal('<html></html>')).toBe(0);
  });
});

describe('buildListingUrl', () => {
  it('maps our params onto thefishing.kr search-form names', () => {
    const url = buildListingUrl({
      date: '2026-09-01',
      regionCode: '1',
      speciesCode: '4',
      page: 2,
    });
    expect(url).toContain('search_date=2026-09-01');
    expect(url).toContain('sa%5B%5D=1');
    expect(url).toContain('si%5B%5D=4');
    expect(url).toContain('page=2');
  });
  it('omits page=1 and empty filters', () => {
    expect(buildListingUrl({ page: 1 })).toBe(
      'https://thefishing.kr/reservation/list.php',
    );
  });
});
