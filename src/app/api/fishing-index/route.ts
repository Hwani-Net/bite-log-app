import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KHOA_FISHING_BASE =
  "http://www.khoa.go.kr/oceandata/odmiapi/GetFcstFishingApiServicev2";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gubun = searchParams.get("gubun") || "갯바위";
  const placeName = searchParams.get("placeName");
  const reqDate = searchParams.get("reqDate");
  const serviceKey = process.env.NEXT_PUBLIC_KHOA_API_KEY;

  if (!serviceKey) {
    console.error("[fishing-index/route] NEXT_PUBLIC_KHOA_API_KEY not set");
    return NextResponse.json({ result: { data: [] } });
  }

  const params = new URLSearchParams({
    serviceKey,
    gubun,
    type: "json",
    numOfRows: "30",
  });
  if (placeName) params.set("placeName", placeName);
  if (reqDate) params.set("reqDate", reqDate);

  const url = `${KHOA_FISHING_BASE}?${params.toString()}`;

  try {
    console.log(
      `[fishing-index/route] Calling KHOA API: gubun=${gubun} placeName=${placeName ?? "all"} reqDate=${reqDate ?? "today"}`,
    );
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(
        `[fishing-index/route] KHOA API HTTP error: ${res.status} ${res.statusText}`,
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
        "[fishing-index/route] Failed to parse JSON:",
        parseErr,
        "raw:",
        raw.slice(0, 300),
      );
      return NextResponse.json({ result: { data: [] } });
    }

    // Detect API-level errors
    const resultCode: string =
      json?.result?.code ?? json?.response?.header?.resultCode ?? "";
    const resultMsg: string =
      json?.result?.msg ?? json?.response?.header?.resultMsg ?? "";

    if (resultCode && resultCode !== "0000" && resultCode !== "00") {
      console.error(
        `[fishing-index/route] KHOA API error — code: ${resultCode}, msg: ${resultMsg}`,
      );
      return NextResponse.json({
        result: { data: [], code: resultCode, msg: resultMsg },
      });
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("[fishing-index/route] Network error:", err);
    return NextResponse.json({ result: { data: [] } });
  }
}
