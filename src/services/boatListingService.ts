// Reads 더피싱(thefishing.kr)'s own public boat directory — the same listing
// page a visitor browses at thefishing.kr/reservation — with the same
// date/region/species filters its own search form exposes. ~50 boats per
// page, real photos/region/target species/capacity, no login. Same honest,
// non-browser-impersonating User-Agent as boatCalendarService.ts; see that
// file for why. sunsang24.com is not touched here for the same reason it
// isn't touched there — its robots.txt explicitly disallows /ship/.

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
const SPECIES_LABEL_ALIASES: Record<string, string[]> = {
  주꾸미: ["주꾸미", "쭈꾸미"],
};

export function filterBoatsBySpecies(
  boats: BoatListing[],
  speciesCode?: string,
): BoatListing[] {
  if (!speciesCode) return boats;
  const label = SPECIES_FILTERS.find((s) => s.code === speciesCode)?.label;
  if (!label) return boats;
  const aliases = SPECIES_LABEL_ALIASES[label] ?? [label];
  return boats.filter((b) => aliases.some((a) => b.fishTypes.includes(a)));
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
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`boat listing fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return {
    boats: filterBoatsBySpecies(parseBoatListingHtml(html), params.speciesCode),
    total: parseBoatListingTotal(html),
    page: params.page ?? 1,
  };
}
