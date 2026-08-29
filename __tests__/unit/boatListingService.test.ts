import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseBoatListingHtml,
  parseBoatListingTotal,
  buildListingUrl,
  filterBoatsBySpecies,
  filterBoatsByRegion,
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

  // 2026-08-29 사용자 지적 — si[]=8(백조기)+sa[]=1(서해)로 112건이 잡히는데
  // 화면엔 3척뿐이었다. 카드 표기는 "쭈꾸미,갑오징어 외 4종"처럼 앞의
  // 1~2종만 보여주고 나머지는 "외 N종"으로 가리는데, si[]가 이미 골라낸
  // 배 대부분이 백조기를 그 가려진 자리에 숨기고 있었다 — "안 보인다"를
  // "없다"로 오판해 걸러낸 게 진짜 원인.
  it('does not drop a boat whose fishTypes is truncated ("외 N종") — si[] already vetted it', () => {
    const boats = [
      boat('쭈꾸미,갑오징어 외 4종'), // 백조기가 가려진 자리에 있을 수 있다
      boat('★꽃게낚시★ 외 9종'),
      boat('☆가을 쭈꾸미☆'), // 안 가려짐 — 완결된 목록, 백조기 없음
    ];
    const kept = filterBoatsBySpecies(boats, '8').map((b) => b.fishTypes);
    expect(kept).toContain('쭈꾸미,갑오징어 외 4종');
    expect(kept).toContain('★꽃게낚시★ 외 9종');
    expect(kept).not.toContain('☆가을 쭈꾸미☆');
  });

  it('still drops a boat whose complete (untruncated) fishTypes genuinely excludes the species', () => {
    // 원래 이 함수가 잡으려던 사례: si[]=3(주꾸미)인데 "광어,우럭"만
    // 있고 "외"도 없어(전체 표기 확정) 주꾸미가 없는 게 확실하다.
    const boats = [boat('광어,우럭'), boat('주꾸미,갑오징어')];
    expect(filterBoatsBySpecies(boats, '3').map((b) => b.fishTypes)).toEqual([
      '주꾸미,갑오징어',
    ]);
  });
});

describe('filterBoatsByRegion', () => {
  // 2026-08-29 사용자 지적 — 남해를 골랐는데 항구 필터에 서해 항구(신진도항·
  // 무창포항 등)가 섞여 나왔다. thefishing.kr에 sa[]=3(남해권)을 직접
  // 질의해도 결과의 상당수가 areaPath상 서해권이었다(thefishing.kr을
  // 우회해 실측 확인) — si[]/fishTypes 불일치와 같은 클래스의 결함이다.
  const boat = (uid: string, areaPath: string, seaRegion: string): BoatListing => ({
    uid,
    name: `배${uid}`,
    imageUrl: '',
    areaPath,
    seaRegion: seaRegion as BoatListing['seaRegion'],
    fishTypes: '',
    capacity: '',
    detailUrl: '',
  });

  it('drops boats whose own seaRegion disagrees with the queried region code', () => {
    const boats = [
      boat('1', '서해권 > 경기도 > 평택시 > 평택항', '서해권'),
      boat('2', '남해권 > 전라남도 > 목포', '남해권'),
      boat('3', '서해권 > 충청남도 > 보령시 > 무창포항', '서해권'),
    ];
    // sa[]=3 (남해) 로 질의했다는 상황을 흉내 — 실제로 남해권인 배만 남아야 한다.
    expect(filterBoatsByRegion(boats, '3').map((b) => b.uid)).toEqual(['2']);
  });

  it('passes boats through unchanged when no region code is given', () => {
    const boats = [boat('1', '', '서해권'), boat('2', '', '남해권')];
    expect(filterBoatsByRegion(boats, undefined)).toBe(boats);
  });

  it('passes boats through unchanged for an unknown region code', () => {
    const boats = [boat('1', '', '기타')];
    expect(filterBoatsByRegion(boats, '999')).toBe(boats);
  });

  it('covers all four regions used by REGION_FILTERS', () => {
    const boats = [
      boat('1', '', '서해권'),
      boat('2', '', '남해권'),
      boat('3', '', '동해권'),
      boat('4', '', '제주권'),
    ];
    expect(filterBoatsByRegion(boats, '1').map((b) => b.uid)).toEqual(['1']);
    expect(filterBoatsByRegion(boats, '3').map((b) => b.uid)).toEqual(['2']);
    expect(filterBoatsByRegion(boats, '2').map((b) => b.uid)).toEqual(['3']);
    expect(filterBoatsByRegion(boats, '130').map((b) => b.uid)).toEqual(['4']);
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
