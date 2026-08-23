import { NextRequest, NextResponse } from "next/server";
import { fetchBoatListings } from "@/services/boatListingService";

export const revalidate = 1800; // 30 min — polite read frequency on the source site

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page");
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;

  try {
    const boats = await fetchBoatListings(page);
    return NextResponse.json({ ok: true, boats });
  } catch (err) {
    console.error("[boat-listings]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
