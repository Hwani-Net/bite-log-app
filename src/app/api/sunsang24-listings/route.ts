import { NextRequest, NextResponse } from "next/server";
import {
  fetchSunsang24Listings,
  type SeaRegionGroup,
} from "@/services/sunsang24ListingService";

export const revalidate = 1800; // 30 min — polite read frequency on the source site

// 지역 코드는 booking/page.tsx의 REGION_FILTERS와 맞춘다(1=서해,3=남해,
// 2=동해,130=제주) — 화면에서 같은 코드로 두 소스를 동시에 필터링한다.
const REGION_CODE_TO_SEA_REGION: Record<string, SeaRegionGroup> = {
  "1": "서해권",
  "3": "남해권",
  "2": "동해권",
  "130": "제주권",
};

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? undefined;
  const regionCode = sp.get("region") ?? undefined;
  const keyword = sp.get("keyword") ?? undefined;
  const page = Math.max(1, Number(sp.get("page")) || 1);

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  try {
    const result = await fetchSunsang24Listings({ date, keyword, page });
    // 선상24 API엔 지역 코드 파라미터가 없다 — 검색어(search)로 어종은
    // 정확히 좁혀지지만 지역은 province(area_main) 텍스트라 우리 쪽에서
    // seaRegion으로 한 번 더 거른다. 날짜 하루치가 전국 1500+건이라
    // 어종 없이 지역만 고르면 이 페이지(30건) 표본이 작을 수 있다 —
    // thefishing.kr 페이지1과 같은 한계, 알려진 제약으로 남겨 둔다.
    const expectedRegion = regionCode ? REGION_CODE_TO_SEA_REGION[regionCode] : undefined;
    const schedules = expectedRegion
      ? result.schedules.filter((s) => s.seaRegion === expectedRegion)
      : result.schedules;
    return NextResponse.json({ ok: true, ...result, schedules });
  } catch (err) {
    console.error("[sunsang24-listings]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
