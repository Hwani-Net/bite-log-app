import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Bite Index (바다낚시지수) Server Proxy
// ─────────────────────────────────────────────────────────────────────────────
// Endpoint: https://apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2
// Auth:     serviceKey (URL-encoded 64-char hex) via `BITE_INDEX_API_KEY`
// Quota:    10,000 calls/day
// Window:   today + 7-day forecast (reqDate=YYYYMMDD, default = today)
//
// Query parameters (upstream):
//   serviceKey   required — 64-char hex, URL-encoded
//   type=json    required — JSON response
//   reqDate      YYYYMMDD — defaults to today if omitted
//   gubun        "갯바위" | "선상"  (required by API, default 갯바위)
//   pageNo       default 1
//   numOfRows    default 10, max 300
//   include      optional comma-separated field allow-list (e.g., lat,lot)
//   exclude      optional field deny-list
//   placeName    optional Korean place-name filter (e.g., "김녕")
//
// Upstream response (example):
// {
//   "response": {
//     "header": { "resultCode": "00", "resultMsg": "NORMAL SERVICE." },
//     "body": {
//       "items": { "item": [ { 장소, 어종, 낚시지수, 수온, 파고, 물때, lat, lot, ... } ] },
//       "totalCount": 142, "pageNo": 1, "numOfRows": 10
//     }
//   }
// }
//
// This route intentionally surfaces upstream errors (HTTP + resultCode) as 503
// responses so the client can decide to fall back to mock. Try-catch does not
// swallow errors — they are logged and propagated with actionable context.
// ─────────────────────────────────────────────────────────────────────────────

const BITE_INDEX_API_BASE =
  "https://apis.data.go.kr/1192136/fcstFishingv2/GetFcstFishingApiServicev2";

const GUBUN_LABEL: Record<"shore" | "boat", "갯바위" | "선상"> = {
  shore: "갯바위",
  boat: "선상",
};

/** Bite Index record served to the client (normalised, mapped from upstream). */
export interface BiteIndexItem {
  /** 장소명 (예: 김녕) */
  placeName: string;
  /** 대상 어종 (예: 참돔) */
  targetFish: string;
  /** 낚시지수 1..5 (1=매우나쁨, 5=매우좋음). 0/결측은 3 으로 보정. */
  indexScore: 1 | 2 | 3 | 4 | 5;
  /** 수온(°C) */
  waterTemp?: number;
  /** 파고(m) */
  waveHeight?: number;
  /** 물때 */
  tideInfo?: string;
  /** 위도 */
  lat?: number;
  /** 경도 */
  lon?: number;
  /** 예보일자 YYYYMMDD */
  forecastDate: string;
  /** 구분 (갯바위|선상) */
  gubun: "갯바위" | "선상";
}

// --- Structured logging -----------------------------------------------------

interface LogPayload {
  timestamp: string;
  event: string;
  [k: string]: unknown;
}

function structuredLog(
  level: "info" | "warn" | "error",
  payload: LogPayload,
): void {
  const entry = JSON.stringify(payload);
  if (level === "info") console.info(entry);
  if (level === "warn") console.warn(entry);
  if (level === "error") console.error(entry);
}

// --- Query validation --------------------------------------------------------

const BiteIndexQuerySchema = z.object({
  gubun: z.enum(["shore", "boat", "갯바위", "선상"]).optional(),
  placeName: z.string().min(1).max(100).optional(),
  reqDate: z
    .string()
    .regex(/^\d{8}$/, "'reqDate' must be YYYYMMDD (8 digits)")
    .optional(),
  pageNo: z
    .string()
    .regex(/^\d+$/, "'pageNo' must be a positive integer")
    .optional()
    .transform((v) => (v != null ? Number(v) : 1)),
  numOfRows: z
    .string()
    .regex(/^\d+$/, "'numOfRows' must be a positive integer")
    .optional()
    .transform((v) => (v != null ? Math.min(Number(v), 300) : 10)),
  include: z.string().max(200).optional(),
  exclude: z.string().max(200).optional(),
});

type BiteIndexQuery = z.output<typeof BiteIndexQuerySchema>;

function parseQuery(
  params: URLSearchParams,
): { ok: true; data: BiteIndexQuery } | { ok: false; message: string } {
  const raw = {
    gubun: params.get("gubun") ?? undefined,
    placeName: params.get("placeName") ?? undefined,
    reqDate: params.get("reqDate") ?? undefined,
    pageNo: params.get("pageNo") ?? undefined,
    numOfRows: params.get("numOfRows") ?? undefined,
    include: params.get("include") ?? undefined,
    exclude: params.get("exclude") ?? undefined,
  };

  const result = BiteIndexQuerySchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join("; ");
    return { ok: false, message };
  }
  return { ok: true, data: result.data };
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

function resolveGubun(raw?: string): "갯바위" | "선상" {
  if (!raw) return "갯바위";
  if (raw === "갯바위" || raw === "선상") return raw;
  if (raw === "shore") return GUBUN_LABEL.shore;
  if (raw === "boat") return GUBUN_LABEL.boat;
  return "갯바위";
}

// --- Upstream response extraction -------------------------------------------

function extractItems(json: unknown): Array<Record<string, unknown>> {
  if (json == null || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  const resp = obj["response"] as Record<string, unknown> | undefined;
  const body = resp?.["body"] as Record<string, unknown> | undefined;
  const items = body?.["items"] as Record<string, unknown> | undefined;
  const item = items?.["item"];
  if (Array.isArray(item)) return item as Array<Record<string, unknown>>;
  if (item != null && typeof item === "object")
    return [item as Record<string, unknown>];

  // Defensive fallback for odcloud-style payloads
  if (Array.isArray(obj["data"]))
    return obj["data"] as Array<Record<string, unknown>>;

  return [];
}

function pick(item: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function numOrUndef(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function avgRange(
  min: number | undefined,
  max: number | undefined,
): number | undefined {
  if (min != null && max != null)
    return Math.round(((min + max) / 2) * 10) / 10;
  return min ?? max;
}

/** Map upstream Korean/English field variants into a stable client shape. */
function mapBiteIndexItem(
  item: Record<string, unknown>,
  defaults: { gubun: "갯바위" | "선상"; reqDate: string },
): BiteIndexItem {
  const scoreRaw = pick(
    item,
    "totalIndex",
    "indexScore",
    "fcstFshngIndx",
    "fcstFishingIndex",
    "fishingIndex",
    "낚시지수",
  );
  // Grade mapping — accept both 1..5 numeric and Korean grade labels.
  let scoreNum: number | undefined = numOrUndef(scoreRaw);
  if (scoreNum == null && typeof scoreRaw === "string") {
    const g = scoreRaw.trim().replace(/\s+/g, "");
    if (g === "매우좋음") scoreNum = 5;
    else if (g === "좋음") scoreNum = 4;
    else if (g === "보통") scoreNum = 3;
    else if (g === "나쁨") scoreNum = 2;
    else if (g === "매우나쁨") scoreNum = 1;
  }
  const clamped = Math.max(1, Math.min(5, Math.round(scoreNum ?? 3)));
  const indexScore = clamped as 1 | 2 | 3 | 4 | 5;

  return {
    placeName: String(
      pick(
        item,
        "placeName",
        "seafsPstnNm",
        "fsnplcNm",
        "psnNm",
        "장소",
        "장소명",
      ) ?? "",
    ),
    targetFish: String(
      pick(
        item,
        "targetFish",
        "seafsTgfshNm",
        "tgfshNm",
        "fishNm",
        "어종",
        "대상어종",
      ) ?? "미상",
    ),
    indexScore,
    waterTemp:
      avgRange(
        numOrUndef(pick(item, "minWtem", "minWtrTmprt")),
        numOrUndef(pick(item, "maxWtem", "maxWtrTmprt")),
      ) ??
      numOrUndef(
        pick(item, "waterTemp", "wtrTemp", "wtrTmprt", "wtem", "수온"),
      ),
    waveHeight:
      avgRange(
        numOrUndef(pick(item, "minWvhgt", "minWvHgt")),
        numOrUndef(pick(item, "maxWvhgt", "maxWvHgt")),
      ) ??
      numOrUndef(
        pick(item, "waveHeight", "wvHgt", "wvhgt", "avgWvhgt", "파고"),
      ),
    tideInfo:
      String(pick(item, "tideInfo", "tdlvHrCn", "tide", "물때") ?? "") ||
      undefined,
    lat: numOrUndef(pick(item, "lat", "latitude", "위도")),
    lon: numOrUndef(pick(item, "lot", "lon", "lng", "longitude", "경도")),
    forecastDate: String(
      pick(
        item,
        "forecastDate",
        "predcYmd",
        "reqDate",
        "fcstDate",
        "예보일자",
      ) ?? defaults.reqDate,
    ),
    gubun: defaults.gubun,
  };
}

// --- Upstream error check ----------------------------------------------------

function checkApiError(json: unknown): string | null {
  if (json == null || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const resp = obj["response"] as Record<string, unknown> | undefined;
  const header = resp?.["header"] as Record<string, unknown> | undefined;
  const code = String(header?.["resultCode"] ?? "");
  const msg = String(header?.["resultMsg"] ?? "");
  if (code && code !== "00" && code !== "000" && code !== "0000") {
    return `resultCode=${code} resultMsg=${msg}`;
  }
  if (
    msg &&
    (msg.toLowerCase().includes("invalid") ||
      msg.toLowerCase().includes("servicekey"))
  ) {
    return `serviceKey rejected: ${msg}`;
  }
  return null;
}

// --- Route handler -----------------------------------------------------------

export async function GET(request: NextRequest) {
  const t0 = Date.now();

  const parsed = parseQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.message },
      { status: 400 },
    );
  }
  const params = parsed.data;

  const apiKey = process.env.BITE_INDEX_API_KEY;
  if (!apiKey) {
    // 503 → client falls back to local mock (see src/services/biteIndexService.ts)
    structuredLog("warn", {
      timestamp: new Date().toISOString(),
      event: "bite_index.key_missing",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "BITE_INDEX_API_KEY not configured",
        data: [],
        count: 0,
        mock: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const gubun = resolveGubun(params.gubun);
  const reqDate = params.reqDate ?? todayYYYYMMDD();

  // Build upstream URL. `serviceKey` is kept in template string to avoid
  // URLSearchParams double-encoding of an already URL-encoded hex key.
  const extra = new URLSearchParams({
    type: "json",
    reqDate,
    gubun,
    pageNo: String(params.pageNo),
    numOfRows: String(params.numOfRows),
  });
  if (params.placeName) extra.set("placeName", params.placeName);
  if (params.include) extra.set("include", params.include);
  if (params.exclude) extra.set("exclude", params.exclude);

  const url = `${BITE_INDEX_API_BASE}?serviceKey=${apiKey}&${extra.toString()}`;

  structuredLog("info", {
    timestamp: new Date().toISOString(),
    event: "bite_index.request",
    gubun,
    reqDate,
    placeName: params.placeName ?? null,
    pageNo: params.pageNo,
    numOfRows: params.numOfRows,
  });

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    structuredLog("error", {
      timestamp: new Date().toISOString(),
      event: "bite_index.unreachable",
      cause: String(err),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Upstream unreachable",
        cause: String(err),
        data: [],
        count: 0,
        mock: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    structuredLog("error", {
      timestamp: new Date().toISOString(),
      event: "bite_index.http_error",
      status: res.status,
      bodyPreview: body.slice(0, 300),
    });
    return NextResponse.json(
      {
        ok: false,
        error: `Upstream HTTP ${res.status}`,
        data: [],
        count: 0,
        mock: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const rawText = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    structuredLog("error", {
      timestamp: new Date().toISOString(),
      event: "bite_index.parse_error",
      preview: rawText.slice(0, 300),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Upstream returned non-JSON",
        preview: rawText.slice(0, 300),
        data: [],
        count: 0,
        mock: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const apiError = checkApiError(json);
  if (apiError) {
    structuredLog("error", {
      timestamp: new Date().toISOString(),
      event: "bite_index.api_level_error",
      detail: apiError,
    });
    return NextResponse.json(
      {
        ok: false,
        error: `Upstream API error: ${apiError}`,
        data: [],
        count: 0,
        mock: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const items = extractItems(json);
  const data = items.map((it) => mapBiteIndexItem(it, { gubun, reqDate }));

  const duration = Date.now() - t0;
  structuredLog("info", {
    timestamp: new Date().toISOString(),
    event: "bite_index.success",
    count: data.length,
    duration,
  });

  return NextResponse.json({
    ok: true,
    data,
    count: data.length,
    timestamp: new Date().toISOString(),
    mock: false,
  });
}
