import { NextRequest, NextResponse } from "next/server";
import { fetchBoatCalendar } from "@/services/boatCalendarService";

export const revalidate = 1800; // 30 min — polite read frequency on the source site

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const uid = sp.get("uid");
  const ym = sp.get("ym") ?? undefined;

  if (!uid || !/^\d+$/.test(uid)) {
    return NextResponse.json({ ok: false, error: "invalid_uid" }, { status: 400 });
  }
  if (ym && !/^\d{6}$/.test(ym)) {
    return NextResponse.json({ ok: false, error: "invalid_ym" }, { status: 400 });
  }

  try {
    const calendar = await fetchBoatCalendar(uid, ym);
    return NextResponse.json({ ok: true, ...calendar });
  } catch (err) {
    console.error("[boat-calendar]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
