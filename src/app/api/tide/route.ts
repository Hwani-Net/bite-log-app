import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parseLocalISODate } from "@/lib/localDate";
import { parseTideResponse, TIDE_STATIONS } from "@/services/tideService";

// Official Swagger: https://www.data.go.kr/data/15156018/openapi.do
const KHOA_URL = "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService";

// Cache validated successes only. KHOA also returns API errors with HTTP 200;
// caching raw fetch responses would preserve a temporary error for a full day.
const readTides = unstable_cache(async (code: string, date: string) => {
  const key = process.env.KHOA_API_KEY || process.env.NEXT_PUBLIC_KHOA_API_KEY;
  if (!key) throw new Error("tide_not_configured");
  const params = new URLSearchParams({
    serviceKey: decodeURIComponent(key), obsCode: code, reqDate: date, type: "json", numOfRows: "10",
  });
  const response = await fetch(`${KHOA_URL}?${params}`, {
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("upstream_http_error");
  const data = await response.json();
  const resultCode = data.header?.resultCode ?? data.response?.header?.resultCode;
  if (resultCode === "03") throw new Error("tide_not_available");
  const parsed = parseTideResponse(data, date);
  if (!parsed || parsed.stationName !== TIDE_STATIONS.find(s => s.code === code)?.name) {
    throw new Error("upstream_api_error");
  }
  return data;
}, ["khoa-tides-validated-v1"], { revalidate: 86400 });

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const code = sp.get("obsCode") ?? sp.get("obs_post_id");
  const date = sp.get("reqDate") ?? sp.get("date") ?? "";
  const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  if (!TIDE_STATIONS.some(s => s.code === code) || !/^\d{8}$/.test(date) || !parseLocalISODate(iso)) {
    return NextResponse.json({ error: "invalid_station_or_date" }, { status: 400 });
  }
  try {
    const data = await readTides(code!, date);
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    // Upstream errors/URLs can contain the service key; don't log them.
    if (error instanceof Error && error.message === "tide_not_available") {
      return NextResponse.json({ error: "tide_not_available" }, { status: 404 });
    }
    return NextResponse.json({ error: "tide_fetch_failed" }, { status: 503 });
  }
}
