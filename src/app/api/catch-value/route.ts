import { NextResponse } from "next/server";

interface KamisItem {
  itemname: string;
  kindname: string;
  price: string;
  regday: string;
  marketname: string;
}

interface FishPrice {
  species: string;
  unit: string;
  priceMin: number;
  priceMax: number;
  priceAvg: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
  date: string;
  market: string;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePrice(raw: string): number {
  const n = Number(raw.replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function toIsoRegday(regday: string): string {
  // KAMIS regday format: "YYYY/MM/DD" or "YYYY-MM-DD"
  return regday.replace(/\//g, "-").trim();
}

export async function GET() {
  const certKey = process.env.KAMIS_CERT_KEY;
  const certId = process.env.KAMIS_CERT_ID;

  if (!certKey || !certId) {
    return NextResponse.json({ ok: false, error: "no_key" }, { status: 503 });
  }

  const today = toDateStr(new Date());

  const params = new URLSearchParams({
    action: "dailySalesList",
    p_cert_key: certKey,
    p_cert_id: certId,
    p_returntype: "json",
    p_productclscode: "02",
    p_itemcategorycode: "500",
    p_startday: today,
    p_endday: today,
  });

  const url = `https://www.kamis.or.kr/service/price/xml.do?${params.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 503 },
      );
    }

    const json = await res.json();

    // KAMIS response structure: { data: { item: [...] } } or { data: [] }
    const items: KamisItem[] = json?.data?.item ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 503 },
      );
    }

    const prices: FishPrice[] = items.map((item) => {
      const price = parsePrice(item.price);
      return {
        species: item.itemname ?? "",
        unit: item.kindname ?? "kg",
        priceMin: price,
        priceMax: price,
        priceAvg: price,
        trend: "flat",
        trendPct: 0,
        date: toIsoRegday(item.regday ?? today),
        market: item.marketname ?? "",
      };
    });

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
