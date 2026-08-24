import { NextRequest, NextResponse } from "next/server";
import { getAllCachedFishappBoats } from "@/services/fishappListingService";
import { REGION_FILTERS } from "@/services/boatListingService";

// Serves whatever of 낚시뚜's 177-boat catalog the daily cron
// (/api/cron/fishapp-sync) has warmed into the cache so far — never proxies
// fishapp.co.kr live from this route. No date/species filter: their search
// API doesn't expose either, so unlike /api/boat-listings this is a general
// directory, not "sailing on this date" — the client labels it accordingly.
export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const regionCode = request.nextUrl.searchParams.get("region");
  const regionLabel = REGION_FILTERS.find((r) => r.code === regionCode)?.label;
  const seaRegion = regionLabel ? (`${regionLabel}권` as const) : null;

  try {
    const all = await getAllCachedFishappBoats();
    const boats = seaRegion ? all.filter((b) => b.seaRegion === seaRegion) : all;
    return NextResponse.json({ ok: true, boats, totalCached: all.length });
  } catch (err) {
    console.error("[boat-directory]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
