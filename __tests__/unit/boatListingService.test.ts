import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseBoatListingHtml,
  parseBoatListingTotal,
  buildListingUrl,
  filterBoatsBySpecies,
  SPECIES_FILTERS,
  type BoatListing,
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

describe('filterBoatsBySpecies', () => {
  // Reproduces the reported bug: thefishing.kr's si[]=3(주꾸미) narrows the
  // count but its own results include boats whose displayed species has
  // nothing to do with 주꾸미 (confirmed live on thefishing.kr itself).
  const boat = (fishTypes: string): BoatListing => ({
    uid: '1',
    name: 'test',
    imageUrl: '',
    areaPath: '',
    seaRegion: '기타',
    fishTypes,
    capacity: '',
    detailUrl: '',
  });

  it('drops boats whose fishTypes does not mention the selected species', () => {
    const boats = [boat('주꾸미,갑오징어'), boat('꽃게'), boat('광어,우럭')];
    expect(filterBoatsBySpecies(boats, '3').map((b) => b.fishTypes)).toEqual([
      '주꾸미,갑오징어',
    ]);
  });

  it('matches the 쭈꾸미 spelling variant too', () => {
    const boats = [boat('쭈꾸미'), boat('갈치')];
    expect(filterBoatsBySpecies(boats, '3')).toHaveLength(1);
  });

  it('passes boats through unchanged when no species code is given', () => {
    const boats = [boat('꽃게'), boat('참돔')];
    expect(filterBoatsBySpecies(boats, undefined)).toBe(boats);
  });

  it('passes boats through unchanged for an unknown species code', () => {
    const boats = [boat('꽃게')];
    expect(filterBoatsBySpecies(boats, '99999')).toBe(boats);
  });

  // 어종을 26종으로 넓히면서 생긴 부분문자열 충돌 — 이름이 다른 어종
  // 안에 통째로 들어 있어서, 단순 includes로는 남의 배가 딸려온다.
  it('오징어(23) must not swallow 갑오징어·무늬오징어 — 각자 다른 어종이다', () => {
    const boats = [
      boat('오징어'),
      boat('갈치,오징어'),
      boat('갑오징어'),
      boat('무늬오징어'),
    ];
    expect(filterBoatsBySpecies(boats, '23').map((b) => b.fishTypes)).toEqual([
      '오징어',
      '갈치,오징어',
    ]);
  });

  it('갑오징어(6) still matches its own boats', () => {
    const boats = [boat('갑오징어,쭈꾸미'), boat('광어')];
    expect(filterBoatsBySpecies(boats, '6')).toHaveLength(1);
  });

  it('볼락(11) matches the 뽈락 spelling but not 불볼락(=열기)', () => {
    const boats = [boat('볼락'), boat('뽈락'), boat('불볼락')];
    expect(filterBoatsBySpecies(boats, '11').map((b) => b.fishTypes)).toEqual([
      '볼락',
      '뽈락',
    ]);
  });

  it('열기(10) matches its 불볼락 alias', () => {
    const boats = [boat('불볼락'), boat('열기'), boat('볼락')];
    expect(filterBoatsBySpecies(boats, '10')).toHaveLength(2);
  });

  it('백조기(8) matches its 보구치 alias', () => {
    const boats = [boat('보구치'), boat('백조기낚시'), boat('우럭')];
    expect(filterBoatsBySpecies(boats, '8')).toHaveLength(2);
  });

  it('광어(5) still matches 대광어 — same fish, bigger marketing', () => {
    const boats = [boat('대광어(다운샷)'), boat('우럭')];
    expect(filterBoatsBySpecies(boats, '5')).toHaveLength(1);
  });
});

describe('SPECIES_FILTERS coverage', () => {
  it('carries every species thefishing.kr actually offers', () => {
    // 2026-08-28 검색 폼 실측: si[] 코드 42개 중 어종 26개 + 타이라바(기법,
    // 원래 있던 필터라 유지). 이 숫자가 줄면 어떤 어종이 화면에서 사라진
    // 것이므로 의도한 변경인지 확인해야 한다.
    expect(SPECIES_FILTERS).toHaveLength(27);
  });

  it('has no duplicate codes or labels', () => {
    const codes = SPECIES_FILTERS.map((s) => s.code);
    const labels = SPECIES_FILTERS.map((s) => s.label);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(labels).size).toBe(labels.length);
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
