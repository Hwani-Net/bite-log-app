import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Migrated 2026-04-21: old oceangrid/ API terminated 2026.3.31
// New endpoint: khoa.go.kr/oceandata/odmiapi (serviceKey = data.go.kr key)
const KHOA_TIDE_BASE =
  "http://www.khoa.go.kr/oceandata/odmiapi/GetTideFcstHghLwApiService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const obs_post_id =
    searchParams.get("obs_post_id") || searchParams.get("obsCode");
  const date = searchParams.get("date") || searchParams.get("reqDate");
  const serviceKey = process.env.NEXT_PUBLIC_KHOA_API_KEY;

  if (!obs_post_id || !date) {
    return NextResponse.json(
      { error: "Missing required query params: obsCode, reqDate" },
      { status: 400 },
    );
  }

  if (!serviceKey) {
    console.error("[tide/route] NEXT_PUBLIC_KHOA_API_KEY is not set");
    return NextResponse.json({ result: { data: [] } });
  }

  const url = `${KHOA_TIDE_BASE}?serviceKey=${encodeURIComponent(serviceKey)}&obsCode=${obs_post_id}&reqDate=${date}&type=json&numOfRows=10`;

  try {
    console.log(
      `[tide/route] Calling KHOA API: obs_post_id=${obs_post_id} date=${date}`,
    );
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(
        `[tide/route] KHOA API HTTP error: ${res.status} ${res.statusText}`,
      );
      return NextResponse.json({ result: { data: [] } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any;
    try {
      json = await res.json();
    } catch (parseErr) {
      const raw = await res.text().catch(() => "");
      console.error(
        "[tide/route] Failed to parse JSON response:",
        parseErr,
        "raw:",
        raw.slice(0, 300),
      );
      return NextResponse.json({ result: { data: [] } });
    }

    // Detect "invalid ServiceKey" or other API-level errors
    const resultCode: string =
      json?.result?.code ?? json?.response?.header?.resultCode ?? "";
    const resultMsg: string =
      json?.result?.msg ?? json?.response?.header?.resultMsg ?? "";

    if (resultCode && resultCode !== "0000" && resultCode !== "00") {
      console.error(
        `[tide/route] KHOA API error — code: ${resultCode}, msg: ${resultMsg}`,
      );
      // Return the error payload so tideService can decide, but also include empty data fallback
      return NextResponse.json({
        result: { data: [], code: resultCode, msg: resultMsg },
      });
    }

    if (
      resultMsg.toLowerCase().includes("invalid") ||
      resultMsg.toLowerCase().includes("servicekey")
    ) {
      console.error(
        `[tide/route] KHOA API invalid ServiceKey response: ${resultMsg}`,
      );
      return NextResponse.json({
        result: { data: [], code: resultCode, msg: resultMsg },
      });
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("[tide/route] Network error calling KHOA API:", err);
    return NextResponse.json({ result: { data: [] } });
  }
}
