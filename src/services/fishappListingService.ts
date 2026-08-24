// Reads 낚시뚜(fishapp.co.kr)'s ship search JSON API — a real endpoint their
// own /static/js/pt/info/ship_search.js calls, not scraped HTML:
//   POST /pt/info/getSearchShipListByPort  { PORT_CD, KEYWORD, PAGE }
//   -> { shipList: [{ SHIP_ID, SHIP_NAME, PTL_DO_NM, PTL_AREA_NM, SHORT_NM,
//                      IMGHOST_URL, ... TOTAL }] }
// robots.txt is `Allow: /` with `Crawl-delay: 30`, so a page must not be
// fetched more than once per 30s. 177 boats / 10 per page = 18 pages — too
// many to fetch inline on every search (see fetchFishappPageCached below for
// how this is spread out instead of proxied live).
//
// Same honest User-Agent as the other boat services; see
// boatCalendarService.ts for why "bot" specifically (not automation itself)
// is what gets filtered elsewhere, and why we don't send a browser UA.

import { unstable_cache } from "next/cache";

const USER_AGENT =
  "BiteLog/1.0 (+https://bite-log-three.vercel.app; fishing app, low-frequency read-only)";

const SEARCH_URL = "https://www.fishapp.co.kr/pt/info/getSearchShipListByPort";

export const FISHAPP_PAGE_SIZE = 10;
export const FISHAPP_TOTAL_PAGES = 18; // ceil(177 / 10) as of 2026-08-23

export interface FishappBoat {
  shipId: string;
  name: string;
  province: string; // PTL_DO_NM, e.g. "경남"
  area: string; // PTL_AREA_NM, e.g. "통영"
  harbor: string; // SHORT_NM
  imageUrl: string;
  detailUrl: string;
  seaRegion: "서해권" | "남해권" | "동해권" | "제주권" | "기타";
}

// fishapp only returns a province name (PTL_DO_NM), not a sea-region label
// the way thefishing.kr's own pages do — this groups provinces the same way
// thefishing.kr's own search form groups them (real data pulled from that
// form: 서해권 has 경기/충남/전북, 남해권 has 전남/경남, 동해권 has
// 강원/경북, 제주권 is 제주/서귀포), so both sources bucket consistently.
const PROVINCE_TO_REGION: Record<string, FishappBoat["seaRegion"]> = {
  인천: "서해권",
  경기: "서해권",
  경기도: "서해권",
  충남: "서해권",
  충청남도: "서해권",
  전북: "서해권",
  전라북도: "서해권",
  전남: "남해권",
  전라남도: "남해권",
  경남: "남해권",
  경상남도: "남해권",
  부산: "남해권",
  울산: "동해권",
  강원: "동해권",
  강원도: "동해권",
  경북: "동해권",
  경상북도: "동해권",
  제주: "제주권",
  제주도: "제주권",
  서귀포시: "제주권",
  제주시: "제주권",
};

interface RawShip {
  SHIP_ID: string;
  SHIP_NAME: string;
  PTL_DO_NM: string;
  PTL_AREA_NM: string;
  SHORT_NM: string;
  IMGHOST_URL: string;
}

function toBoat(raw: RawShip): FishappBoat {
  return {
    shipId: raw.SHIP_ID,
    name: raw.SHIP_NAME,
    province: raw.PTL_DO_NM,
    area: raw.PTL_AREA_NM,
    harbor: raw.SHORT_NM,
    imageUrl: raw.IMGHOST_URL,
    detailUrl: `https://www.fishapp.co.kr/pt/schd/ship_info?SHIP_ID=${raw.SHIP_ID}`,
    seaRegion: PROVINCE_TO_REGION[raw.PTL_DO_NM] ?? "기타",
  };
}

/** Pure — kept separate from fetch so it's unit-testable offline. */
export function parseFishappResponse(json: unknown): FishappBoat[] {
  const ships = (json as { shipList?: RawShip[] })?.shipList ?? [];
  return ships.map(toBoat);
}

/** One real network call — never call this directly from a request path
 * that serves many concurrent users; go through fetchFishappPageCached. */
export async function fetchFishappPage(page: number): Promise<FishappBoat[]> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ PORT_CD: "", KEYWORD: "", PAGE: String(page) }).toString(),
  });
  if (!res.ok) {
    throw new Error(`fishapp page ${page} fetch failed: ${res.status}`);
  }
  return parseFishappResponse(await res.json());
}

// Cached per page for 30 days via Next's Data Cache (persists across
// invocations on Vercel — no database needed). The daily cron below is the
// intended writer, fetching 2 pages/day with a 35s gap between them so the
// full 18-page catalog is warm within ~9 days without ever exceeding 30s
// crawl-delay. If the live search route below reads a page nothing has
// warmed yet, this same cached function fetches it once (a single real
// visitor triggering a first-ever request for one page is not the
// "hammering their server" case Crawl-delay guards against) and then it
// stays cached for the same 30 days either way.
export const fetchFishappPageCached = unstable_cache(
  fetchFishappPage,
  ["fishapp-listing-page"],
  { revalidate: 60 * 60 * 24 * 30 },
);

// Bug this guards against: fanning out FISHAPP_TOTAL_PAGES calls in
// parallel (Promise.all) looked fine until the cache was actually empty —
// every page missed at once, so it fired 18 concurrent live requests at
// fishapp.co.kr in a single page load, nowhere near their 30s crawl-delay.
// This walks pages one at a time and, the moment a call turns out to have
// been a real network fetch rather than a cache hit (cheap reads resolve in
// a few ms; a round trip to fishapp.co.kr doesn't), stops pulling further
// unwarmed pages for this request. At most one live fetch per visitor per
// cold page, which is what an ordinary visitor triggering a first-ever
// request looks like anyway — the daily cron is what's responsible for
// warming the rest ahead of traffic.
const LIVE_FETCH_LATENCY_THRESHOLD_MS = 100;

export async function getAllCachedFishappBoats(
  maxLiveFetches = 1,
): Promise<FishappBoat[]> {
  const results: FishappBoat[] = [];
  let liveFetches = 0;

  for (let page = 1; page <= FISHAPP_TOTAL_PAGES; page++) {
    const start = Date.now();
    try {
      const boats = await fetchFishappPageCached(page);
      results.push(...boats);
      if (Date.now() - start > LIVE_FETCH_LATENCY_THRESHOLD_MS) {
        liveFetches += 1;
        if (liveFetches >= maxLiveFetches) break;
      }
    } catch {
      // skip this page for this request; cron or a later visitor retries it
    }
  }

  return results;
}
