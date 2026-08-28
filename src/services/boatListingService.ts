// Reads 더피싱(thefishing.kr)'s own public boat directory — the same listing
// page a visitor browses at thefishing.kr/reservation — with the same
// date/region/species filters its own search form exposes. ~50 boats per
// page, real photos/region/target species/capacity, no login. Same honest,
// non-browser-impersonating User-Agent as boatCalendarService.ts; see that
// file for why. sunsang24.com is not touched here for the same reason it
// isn't touched there — its robots.txt explicitly disallows /ship/.

import { fetchWithRetry } from "@/lib/retryFetch";

const USER_AGENT =
  "BiteLog/1.0 (+https://bite-log-three.vercel.app; fishing app, low-frequency read-only)";

const LISTING_URL = "https://thefishing.kr/reservation/list.php";

export type SeaRegionGroup = "서해권" | "남해권" | "동해권" | "제주권" | "기타";

export interface BoatListing {
  uid: string;
  name: string;
  imageUrl: string;
  areaPath: string; // "서해권 > 충청남도 > 서천군 > 홍원항"
  seaRegion: SeaRegionGroup;
  fishTypes: string;
  capacity: string;
  detailUrl: string;
}

export interface BoatListingPage {
  boats: BoatListing[];
  total: number; // "검색 N건" from the page header; 0 when unparseable
  page: number;
}

// Values are the `sa[]` codes from thefishing.kr's own search form. The four
// 권역 codes here are the top-level checkboxes; the form also exposes finer
// port-level codes we don't surface yet.
export const REGION_FILTERS = [
  { id: "west", label: "서해", code: "1" },
  { id: "south", label: "남해", code: "3" },
  { id: "east", label: "동해", code: "2" },
  { id: "jeju", label: "제주", code: "130" },
] as const;

// `si[]` codes from the same form, limited to the species this app already
// knows how to talk about (SPECIES_OPTIONS on the booking page).
// 더피싱이 실제로 제공하는 si[] 어종 코드 전수(2026-08-28 검색 폼 실측 —
// 코드 42개 중 어종이 아닌 것(체험낚시·대회·이벤트·탐사·갯바위·생미끼·
// 어초침선·기타)을 뺀 26종). 예전엔 12종만 노출해 백조기(업스트림 218건)·
// 오징어(225건)·문어(157건)·꽃게(122건)처럼 성수기에 배가 가장 많이 뜨는
// 어종을 아예 고를 수 없었다.
//
// 순서는 사용 빈도 — 앞쪽 12종이 기존 목록이라 쓰던 사람의 위치 감각이
// 바뀌지 않는다. 타이라바는 어종이 아니라 참돔 기법이지만 원래 있던
// 필터라 유지한다(빼면 쓰던 사람에겐 기능 삭제다).
export const SPECIES_FILTERS = [
  { label: "우럭", code: "4" },
  { label: "광어", code: "5" },
  { label: "참돔", code: "1" },
  { label: "감성돔", code: "22" },
  { label: "볼락", code: "11" },
  { label: "주꾸미", code: "3" },
  { label: "갑오징어", code: "6" },
  { label: "갈치", code: "2" },
  { label: "농어", code: "21" },
  { label: "삼치", code: "48" },
  { label: "방어", code: "54" },
  { label: "타이라바", code: "38" },
  { label: "백조기", code: "8" },
  { label: "오징어", code: "23" },
  { label: "문어", code: "7" },
  { label: "꽃게", code: "56" },
  { label: "노래미", code: "14" },
  { label: "한치", code: "24" },
  { label: "열기", code: "10" },
  { label: "민어", code: "20" },
  { label: "부시리", code: "27" },
  { label: "도다리", code: "13" },
  { label: "가자미", code: "12" },
  { label: "낙지", code: "53" },
  { label: "숭어", code: "26" },
  { label: "고등어", code: "28" },
  { label: "대구", code: "9" },
] as const;

export interface BoatSearchParams {
  date?: string; // YYYY-MM-DD
  regionCode?: string;
  speciesCode?: string;
  page?: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Pure parser — kept separate from fetch so it's unit-testable offline.
 * HTML comments are stripped first: the page comments out unused icon
 * markup like `<!--<li class="re_icon1"></li>-->`, and the literal `</li>`
 * inside that comment text terminates a naive `<li>...</li>` match early,
 * cutting the block off before the fields we actually need.
 */
export function parseBoatListingHtml(html: string): BoatListing[] {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "");
  // The page has two lists: 더피싱패밀리 (a fixed ~32 featured boats that
  // ignore every filter, date included) and 예약리스트 (`re_list_etc`) — the
  // actual search results, 20/page, whose length matches the "검색 N건"
  // header. Only the second is a search result, so scope to it; fall back
  // to the whole document if the marker ever moves.
  const listStart = stripped.indexOf('class="re_list re_list_etc"');
  const clean = listStart >= 0 ? stripped.slice(listStart) : stripped;
  const results: BoatListing[] = [];

  const liRe = /<li>([\s\S]*?)<\/li>/g;
  let match: RegExpExecArray | null;
  while ((match = liRe.exec(clean))) {
    const block = match[1];
    const uidMatch = block.match(/list\.php\?uid=(\d+)/);
    if (!uidMatch) continue;
    const uid = uidMatch[1];

    const imageUrl = block.match(/<img src="([^"]+)"/)?.[1] ?? "";
    const areaRaw = block.match(/re_list_area">([^<]+)</)?.[1] ?? "";
    const name = decodeEntities(block.match(/re_list_ship">([^<]+)</)?.[1] ?? "");
    const fishTypes = decodeEntities(
      block.match(/re_list_fish">([^<]+)</)?.[1] ?? "",
    );
    const capacity = block.match(/re_list_price">([^<]+)</)?.[1] ?? "";
    if (!name) continue;

    const areaPath = decodeEntities(areaRaw);
    const regionMatch = areaPath.match(/^(서해권|남해권|동해권|제주권)/);
    const seaRegion: SeaRegionGroup = (regionMatch?.[1] as SeaRegionGroup) ?? "기타";

    results.push({
      uid,
      name,
      imageUrl,
      areaPath,
      seaRegion,
      fishTypes,
      capacity,
      detailUrl: `https://thefishing.kr/reservation/list.php?uid=${uid}`,
    });
  }

  return results;
}

/** "전체 684건 / 검색 85건" → 85. Returns 0 if the header isn't there. */
export function parseBoatListingTotal(html: string): number {
  const m = html.match(/검색\s*<b[^>]*>(\d+)<\/b>\s*건/);
  return m ? Number(m[1]) : 0;
}

// thefishing.kr's own si[] filter narrows the result COUNT by an internal
// tag that doesn't always match the species text it displays on the card —
// e.g. si[]=3(주꾸미) includes boats whose visible fishTypes reads "광어,우럭"
// with no 주꾸미 mention at all. Confirmed by querying thefishing.kr directly
// (bypassing our request-building entirely), so it's their tagging, not a
// bug in buildListingUrl/parseBoatListingHtml. We can't fix their tags, but
// we can stop showing a boat under a species filter its own label disagrees
// with. Some species are spelled two ways across their pages.
// 라벨과 카드 표기가 어긋나는 경우를 정규식으로 다룬다. 별칭이 필요한
// 것(뽈락/보구치)과, 부분문자열이 다른 어종을 잘못 물어오는 것(오징어가
// "갑오징어"에 걸린다)을 같은 자리에서 처리해야 한 쪽만 고치고 다른 쪽을
// 놓치는 일이 없다.
const SPECIES_MATCHERS: Record<string, RegExp> = {
  주꾸미: /주꾸미|쭈꾸미/,
  // 갑오징어·무늬오징어·한치오징어는 다른 어종이고 각자 코드가 있다.
  // 앞에 한글이 붙은 합성어는 전부 다른 종으로 보고 배제한다 — 갑/한만
  // 막으면 무늬·화살 같은 표기가 그대로 새어 들어온다.
  오징어: /(?<![가-힣])오징어/,
  // "불볼락"은 열기라 따로 코드가 있다 — 볼락 검색에 딸려오면 안 된다.
  볼락: /(?<!불)볼락|뽈락/,
  열기: /열기|불볼락/,
  백조기: /백조기|보구치/,
};

export function filterBoatsBySpecies(
  boats: BoatListing[],
  speciesCode?: string,
): BoatListing[] {
  if (!speciesCode) return boats;
  const label = SPECIES_FILTERS.find((s) => s.code === speciesCode)?.label;
  if (!label) return boats;
  const re = SPECIES_MATCHERS[label] ?? new RegExp(label);
  return boats.filter((b) => re.test(b.fishTypes));
}

// sa[]도 si[]와 같은 문제가 있다 — thefishing.kr에 sa[]=3(남해권)을 직접
// 질의해도 결과의 상당수가 areaPath상으로는 서해권 배였다(예: "서해권 >
// 경기도 > 평택시 > 평택항", "서해권 > 충청남도 > 보령시 > 무창포항" 등,
// thefishing.kr 자체를 우회해 확인). 그 결과가 항구 필터 칩까지 그대로
// 새서, 남해를 골랐는데 서해 항구(신진도항·무창포항·홍원항 등)가 섞여
// 나오는 걸로 드러났다(2026-08-29 사용자 지적). si[]와 마찬가지로 그쪽
// 태그를 고칠 수는 없지만, 배 자신의 표시 지역(seaRegion, areaPath 첫
// 구간에서 그대로 뽑은 값)과 다르면 그 필터 아래 보여주지 않을 수는 있다.
export function filterBoatsByRegion(
  boats: BoatListing[],
  regionCode?: string,
): BoatListing[] {
  if (!regionCode) return boats;
  const label = REGION_FILTERS.find((r) => r.code === regionCode)?.label;
  if (!label) return boats;
  const expected = `${label}권` as SeaRegionGroup;
  return boats.filter((b) => b.seaRegion === expected);
}

export function buildListingUrl(params: BoatSearchParams = {}): string {
  const q = new URLSearchParams();
  if (params.date) q.set("search_date", params.date);
  if (params.regionCode) q.append("sa[]", params.regionCode);
  if (params.speciesCode) q.append("si[]", params.speciesCode);
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const qs = q.toString();
  return qs ? `${LISTING_URL}?${qs}` : LISTING_URL;
}

export async function fetchBoatListings(
  params: BoatSearchParams = {},
): Promise<BoatListingPage> {
  const url = buildListingUrl(params);
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`boat listing fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const parsed = filterBoatsByRegion(
    filterBoatsBySpecies(parseBoatListingHtml(html), params.speciesCode),
    params.regionCode,
  );
  return {
    boats: parsed,
    total: parseBoatListingTotal(html),
    page: params.page ?? 1,
  };
}
