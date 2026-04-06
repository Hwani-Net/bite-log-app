import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NAVER_API_URL = "https://openapi.naver.com/v1/search";

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // @mock-data — No Naver API keys, return empty for client-side mock fallback
    return NextResponse.json({ items: [], total: 0, start: 1, display: 0 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "낚시 조황";
  const type = searchParams.get("type") || "blog"; // blog | news | cafearticle
  const display = searchParams.get("display") || "10";
  const start = searchParams.get("start") || "1";
  const sort = searchParams.get("sort") || "date"; // sim | date

  try {
    const url = `${NAVER_API_URL}/${type}.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`;

    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[Naver API] HTTP ${res.status}: ${await res.text()}`);
      return NextResponse.json(
        {
          items: [],
          total: 0,
          start: 1,
          display: 0,
          error: `HTTP ${res.status}`,
        },
        { status: 200 }, // Return 200 with empty items so client falls back gracefully
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Naver API] Network error:", error);
    return NextResponse.json(
      { items: [], total: 0, start: 1, display: 0, error: "Network error" },
      { status: 200 },
    );
  }
}
