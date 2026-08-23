// Reads 더피싱(thefishing.kr)'s own boat directory — the same public listing
// page a visitor browses at thefishing.kr/reservation, one page ~50 boats,
// real photos/region/target species/capacity, no login. Same honest,
// non-browser-impersonating User-Agent as boatAvailabilityService.ts; see
// that file for why. sunsang24.com is not touched here for the same reason
// it isn't touched there — its robots.txt explicitly disallows /ship/.

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
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
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

export async function fetchBoatListings(page = 1): Promise<BoatListing[]> {
  const url = page > 1 ? `${LISTING_URL}?page=${page}` : LISTING_URL;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`boat listing fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseBoatListingHtml(html);
}
