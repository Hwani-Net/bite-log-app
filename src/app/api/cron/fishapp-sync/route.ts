import { NextRequest, NextResponse } from "next/server";
import {
  fetchFishappPageCached,
  FISHAPP_TOTAL_PAGES,
} from "@/services/fishappListingService";

// Runs once/day (Vercel Hobby's cron ceiling). Warms 2 pages per run with a
// 35s gap between the two real requests — comfortably above fishapp.co.kr's
// robots.txt Crawl-delay: 30. Which 2 pages rotates by day-of-year so the
// full 18-page catalog (177 boats) is warm within ~9 days, no stored cursor
// needed — see fishappListingService.ts for why no database is required
// either.
export const maxDuration = 60;

function pagesForToday(): [number, number] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getUTCFullYear(), 0, 0).getTime()) /
      86400000,
  );
  const cycle = dayOfYear % Math.ceil(FISHAPP_TOTAL_PAGES / 2);
  const first = cycle * 2 + 1;
  const second = Math.min(first + 1, FISHAPP_TOTAL_PAGES);
  return [first, second];
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [pageA, pageB] = pagesForToday();
  const results: Record<number, number | "error"> = {};

  try {
    const boatsA = await fetchFishappPageCached(pageA);
    results[pageA] = boatsA.length;
  } catch {
    results[pageA] = "error";
  }

  if (pageB !== pageA) {
    await new Promise((r) => setTimeout(r, 35_000));
    try {
      const boatsB = await fetchFishappPageCached(pageB);
      results[pageB] = boatsB.length;
    } catch {
      results[pageB] = "error";
    }
  }

  return NextResponse.json({ ok: true, synced: results });
}
