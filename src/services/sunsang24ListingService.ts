// Reads 선상24(sunsang24.com)'s own ship-schedule JSON API — a real
// endpoint its Next.js frontend calls client-side to fill /ship/list
// (that page ships with no HTML data, `<div id="__next"></div>` empty;
// everything is fetched from api.sunsang24.com after mount). One schedule
// row per boat per sailing (not one row per boat), with an explicit,
// UNTRUNCATED species list — no "외 N종" guessing like thefishing.kr's
// card summary, so there's no analogous fishTypes cross-check needed here.
//
// robots.txt on www.sunsang24.com disallows /ship/ for major crawlers; the
// actual data host, api.sunsang24.com, disallows everything for every
// agent (`Disallow: /`). An earlier note in boatListingService.ts recorded
// the decision to leave 선상24 alone for exactly this reason. 2026-08-29:
// user reviewed both signals directly and asked to proceed anyway, so this
// file exists — kept as honest and low-frequency as the other two sources
// (identified User-Agent, cached, no parallel hammering) even though the
// site owner's stated preference is not to be crawled at all.

import { fetchWithRetry } from "@/lib/retryFetch";

const USER_AGENT =
  "BiteLog/1.0 (+https://bite-log-three.vercel.app; fishing app, low-frequency read-only)";

const API_URL = "https://api.sunsang24.com/ship/list";

export type SeaRegionGroup = "서해권" | "남해권" | "동해권" | "제주권" | "기타";

// Same grouping as fishappListingService.ts's PROVINCE_TO_REGION — thefishing.kr's
// own search form buckets provinces the same way (서해권: 경기/충남/전북,
// 남해권: 전남/경남/부산, 동해권: 강원/경북/울산, 제주권: 제주). Kept as its
// own small copy rather than a shared import — each source's province
// strings (area_main here) are its own field, not guaranteed to line up
// 1:1 with another source's spelling forever.
const PROVINCE_TO_REGION: Record<string, SeaRegionGroup> = {
  인천: "서해권",
  경기: "서해권",
  충남: "서해권",
  전북: "서해권",
  전남: "남해권",
  경남: "남해권",
  부산: "남해권",
  울산: "동해권",
  강원: "동해권",
  경북: "동해권",
  제주: "제주권",
};

export interface Sunsang24Schedule {
  scheduleNo: number;
  shipNo: number;
  shipName: string;
  areaMain: string;
  areaSub: string;
  seaRegion: SeaRegionGroup;
  portName: string;
  imageUrl: string;
  sdate: string;
  stime: string;
  etime: string;
  price: number;
  fishType: string;
  fishingMethod: string | null;
  remainSeats: number;
  totalSeats: number;
  statusName: string;
  detailUrl: string;
}

export interface Sunsang24ListingPage {
  schedules: Sunsang24Schedule[];
  total: number;
  page: number;
}

export interface Sunsang24SearchParams {
  date?: string; // YYYY-MM-DD
  keyword?: string; // matches ship name / area / fish_type as substring
  page?: number;
}

export function buildSunsang24Url(params: Sunsang24SearchParams = {}): string {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    type: "general",
  });
  if (params.date) q.set("sdate", `${params.date},${params.date}`);
  if (params.keyword) q.set("search", params.keyword);
  return `${API_URL}?${q.toString()}`;
}

interface RawSchedule {
  schedule_no: number;
  ship: {
    no: number;
    name: string;
    area_main: string;
    area_sub: string;
    image: string;
  };
  sdate: string;
  stime: string;
  etime: string;
  price: number;
  fish_type: string;
  fishing_method: string | null;
  remain_embarkation_num: number;
  embarkation_num: number;
  port_name: string;
  schedule_status_name: string;
}

interface RawResponse {
  total: number;
  list: RawSchedule[];
}

/** Pure parser — kept separate from fetch so it's unit-testable offline. */
export function parseSunsang24Response(json: unknown): Sunsang24Schedule[] {
  const raw = (json ?? {}) as Partial<RawResponse>;
  if (!Array.isArray(raw.list)) return [];
  return raw.list
    .filter((s): s is RawSchedule => !!s?.ship?.no)
    .map((s) => ({
      scheduleNo: s.schedule_no,
      shipNo: s.ship.no,
      shipName: s.ship.name,
      areaMain: s.ship.area_main,
      areaSub: s.ship.area_sub,
      seaRegion: PROVINCE_TO_REGION[s.ship.area_main] ?? "기타",
      portName: s.port_name ?? "",
      imageUrl: s.ship.image ?? "",
      sdate: s.sdate,
      stime: s.stime,
      etime: s.etime,
      price: s.price ?? 0,
      fishType: s.fish_type ?? "",
      fishingMethod: s.fishing_method ?? null,
      remainSeats: s.remain_embarkation_num ?? 0,
      totalSeats: s.embarkation_num ?? 0,
      statusName: s.schedule_status_name ?? "",
      detailUrl: `https://www.sunsang24.com/ship/detail/${s.ship.no}`,
    }));
}

export async function fetchSunsang24Listings(
  params: Sunsang24SearchParams = {},
): Promise<Sunsang24ListingPage> {
  const url = buildSunsang24Url(params);
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`sunsang24 listing fetch failed: ${res.status}`);
  }
  const json = await res.json();
  return {
    schedules: parseSunsang24Response(json),
    total: typeof json?.total === "number" ? json.total : 0,
    page: params.page ?? 1,
  };
}
