import { NextRequest, NextResponse } from "next/server";
import { fetchBoatListings } from "@/services/boatListingService";

export const revalidate = 1800; // 30 min — polite read frequency on the source site

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? undefined;
  const regionCode = sp.get("region") ?? undefined;
  const speciesCode = sp.get("species") ?? undefined;
  const page = Math.max(1, Number(sp.get("page")) || 1);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  try {
    const result = await fetchBoatListings({ date, regionCode, speciesCode, page });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[boat-listings]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
