import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBoatListingHtml } from '@/services/boatListingService';

const fixture = readFileSync(
  join(__dirname, '../fixtures/thefishing-listing.html'),
  'utf8',
);

describe('parseBoatListingHtml', () => {
  const boats = parseBoatListingHtml(fixture);

  it('parses every boat card on the page', () => {
    expect(boats.length).toBe(52);
  });

  it('extracts a known boat correctly', () => {
    const hit = boats.find((b) => b.uid === '4644');
    expect(hit?.name).toBe('엔젤피싱호');
    expect(hit?.capacity).toBe('22인승');
    expect(hit?.fishTypes).toContain('쭈꾸미');
  });

  it('decodes HTML entities and buckets the sea region', () => {
    const hit = boats.find((b) => b.uid === '4644');
    expect(hit?.areaPath).toBe('서해권 > 충청남도 > 서천군 > 홍원항');
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

  it('returns an empty array for HTML with no listings', () => {
    expect(parseBoatListingHtml('<html><body>none</body></html>')).toEqual(
      [],
    );
  });
});
