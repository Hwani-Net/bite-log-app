import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(1).max(30),
});

interface UrimalsaemItem {
  target_code: number;
  word: string;
  sup_no: number;
  sense: Array<{
    sense_no: string;
    definition: string;
    type: string;
    pos?: string;
    cat?: string;
    region?: string;
  }>;
  pos?: string;
  link?: string;
}

interface UrimalsaemResponse {
  channel: {
    title: string;
    total: number;
    num: number;
    item?: UrimalsaemItem | UrimalsaemItem[];
  };
  error?: { error_code: number; message: string };
}

export interface DialectResult {
  word: string;
  region: string;
  definition: string;
  sourceWord: string;
}

function extractDialects(
  items: UrimalsaemItem[],
  query: string,
): DialectResult[] {
  const results: DialectResult[] = [];

  for (const item of items) {
    const senses = Array.isArray(item.sense) ? item.sense : [item.sense];
    for (const sense of senses) {
      if (!sense) continue;
      const def = sense.definition ?? "";
      const type = sense.type ?? "";

      // 방언 타입이거나 정의에 방언 언급
      const isDialect =
        type === "방언" ||
        def.includes("방언") ||
        def.includes("사투리") ||
        sense.cat === "방언";

      if (isDialect) {
        // region 추출: 정의에서 '경남', '전남' 등 패턴 추출
        const regionMatch =
          sense.region ??
          def.match(
            /(경남|경북|전남|전북|충남|충북|강원|제주|서울|경기|부산|대구|광주|인천|울산|서해|남해|동해|전국)/,
          )?.[0] ??
          "전국";

        results.push({
          word: item.word,
          region: regionMatch,
          definition: def.slice(0, 100),
          sourceWord: query,
        });
      }
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.URIMALS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "no_key" }, { status: 503 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_query" },
      { status: 400 },
    );
  }

  const { q } = parsed.data;

  try {
    const url = new URL("https://opendict.korean.go.kr/api/search");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", q);
    url.searchParams.set("req_type", "json");
    url.searchParams.set("num", "100");
    url.searchParams.set("part", "word");

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 502 },
      );
    }

    const data: UrimalsaemResponse = await res.json();

    if (data.error) {
      return NextResponse.json(
        { ok: false, error: data.error.message },
        { status: 502 },
      );
    }

    const rawItems = data.channel?.item;
    const items: UrimalsaemItem[] = rawItems
      ? Array.isArray(rawItems)
        ? rawItems
        : [rawItems]
      : [];

    const dialects = extractDialects(items, q);

    return NextResponse.json({ ok: true, dialects, total: items.length });
  } catch {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 503 },
    );
  }
}
