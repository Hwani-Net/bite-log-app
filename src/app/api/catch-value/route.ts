import { NextResponse } from "next/server";

interface KamisItem {
  item_name: string;
  item_code: string;
  kind_name: string;
  unit: string;
  dpr1: string; // 당일
  day1: string;
  dpr2: string; // 1일전
  day2: string;
  dpr3: string; // 1주일전
  day3: string;
  [key: string]: string;
}

interface FishPrice {
  species: string;
  unit: string;
  price: number;
  prevPrice: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
  date: string;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePrice(raw: string): number {
  if (!raw || raw.trim() === "-") return 0;
  const n = Number(raw.replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function calcTrend(
  current: number,
  prev: number,
): { trend: "up" | "down" | "flat"; trendPct: number } {
  if (prev === 0 || current === 0) return { trend: "flat", trendPct: 0 };
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 1000) / 10; // 소수 1자리
  if (Math.abs(pct) < 0.1) return { trend: "flat", trendPct: 0 };
  return { trend: diff > 0 ? "up" : "down", trendPct: Math.abs(pct) };
}

export async function GET() {
  const certKey = process.env.KAMIS_CERT_KEY;
  const certId = process.env.KAMIS_CERT_ID ?? "7733";

  if (!certKey) {
    return NextResponse.json({ ok: false, error: "no_key" }, { status: 503 });
  }

  const today = toDateStr(new Date());

  const params = new URLSearchParams({
    action: "dailyPriceByCategoryList",
    p_cert_key: certKey,
    p_cert_id: certId,
    p_returntype: "json",
    p_product_cls_code: "02", // 도매
    p_item_category_code: "600", // 수산물
    p_regday: today,
  });

  const url = `https://www.kamis.or.kr/service/price/xml.do?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error("[catch-value] KAMIS HTTP error:", res.status);
      return NextResponse.json(
        { ok: false, error: "upstream_error", status: res.status },
        { status: 503 },
      );
    }

    const json = await res.json();

    // KAMIS response: { condition: [...], data: { error_code: "000", item: [...] } }
    const errorCode = json?.data?.error_code;
    if (errorCode && errorCode !== "000") {
      console.error("[catch-value] KAMIS error_code:", errorCode);
      return NextResponse.json(
        { ok: false, error: "kamis_error", error_code: errorCode },
        { status: 503 },
      );
    }

    const items: KamisItem[] = json?.data?.item ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      console.warn("[catch-value] KAMIS returned empty items for date:", today);
      return NextResponse.json(
        { ok: false, error: "no_data", date: today },
        { status: 503 },
      );
    }

    const prices: FishPrice[] = items
      .map((item) => {
        const price = parsePrice(item.dpr1);
        const prevPrice = parsePrice(item.dpr2);
        const { trend, trendPct } = calcTrend(price, prevPrice);

        return {
          species: `${item.item_name ?? ""} ${item.kind_name ?? ""}`.trim(),
          unit: item.unit ?? "",
          price,
          prevPrice,
          trend,
          trendPct,
          date: today,
        };
      })
      .filter((p) => p.price > 0); // 가격 없는 항목 제외

    return NextResponse.json({
      ok: true,
      data: {
        prices,
        updatedAt: new Date().toISOString(),
        isLive: true,
      },
    });
  } catch (err) {
    console.error("[catch-value] KAMIS fetch failed:", err);
    return NextResponse.json(
      { ok: false, error: "upstream_error" },
      { status: 503 },
    );
  }
}
