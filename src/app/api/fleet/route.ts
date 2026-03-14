import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// --- Constants -------------------------------------------------------

/** gross tonnage 기준 임계값: 미만 → small, 이상 → large
 *  환경 변수 TONNAGE_THRESHOLD 로 재정의 가능 (기본값: 3) */
const TONNAGE_THRESHOLD = Number(process.env.TONNAGE_THRESHOLD ?? 3);

// --- Types -----------------------------------------------------------

interface DynamicRecord {
  mmsi: string;
  lat: number;
  lon: number;
  speed: number;   // knots
  course: number;  // degrees
  timestamp: string; // ISO-8601
}

interface StaticRecord {
  mmsi: string;
  shipName: string;
  shipType: string;  // e.g. "fishing", "cargo", "leisure"
  tonnage: number;   // gross tonnage
  length: number;    // metres
}

interface FleetEntry {
  mmsi: string;
  lat: number;
  lon: number;
  speed: number;
  course: number;
  timestamp: string;
  shipName: string;
  shipType: string;
  tonnage: number;
  length: number;
  sizeClass: 'small' | 'large'; // < TONNAGE_THRESHOLD → small, ≥ TONNAGE_THRESHOLD → large
}

// --- Structured Logging ----------------------------------------------

interface LogPayload {
  timestamp: string;
  event: string;
  params?: unknown;
  error?: unknown;
  duration?: number;
  [key: string]: unknown;
}

function structuredLog(level: 'info' | 'warn' | 'error', payload: LogPayload): void {
  const entry = JSON.stringify(payload);
  if (level === 'info')  console.info(entry);
  if (level === 'warn')  console.warn(entry);
  if (level === 'error') console.error(entry);
}

// --- Zod schema & type guard -----------------------------------------

/** GET /api/fleet 쿼리 파라미터 Zod 스키마 (유효성 검사 + 타입 추론 일원화) */
const FleetQuerySchema = z.object({
  size: z
    .enum(['small', 'large'])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  minTonnage: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "'minTonnage' must be a positive numeric value")
    .nullable()
    .optional()
    .transform((v) => (v != null ? Number(v) : null)),
  maxTonnage: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "'maxTonnage' must be a positive numeric value")
    .nullable()
    .optional()
    .transform((v) => (v != null ? Number(v) : null)),
});

/** Zod inference から生成した型 */
type FleetQueryParams = z.output<typeof FleetQuerySchema>;

/** URLSearchParams → FleetQueryParams 변환 + 유효성 검사 (타입 가드 통합) */
function parseAndValidateQuery(
  searchParams: URLSearchParams,
): { success: true; data: FleetQueryParams } | { success: false; message: string } {
  const raw = {
    size: searchParams.get('size') ?? undefined,
    minTonnage: searchParams.get('minTonnage') ?? undefined,
    maxTonnage: searchParams.get('maxTonnage') ?? undefined,
  };

  const result = FleetQuerySchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join('; ');
    return { success: false, message };
  }
  return { success: true, data: result.data };
}

// --- Custom error classes --------------------------------------------

/** 502 Bad Gateway — 외부 AIS API 호출 실패 */
class ExternalApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ExternalApiError';
  }
}

// --- Mock data (used while data.go.kr API key is pending) ------------

const MOCK_DYNAMIC: DynamicRecord[] = [
  { mmsi: '440001000', lat: 34.7833, lon: 128.6833, speed: 0.5,  course: 180, timestamp: new Date().toISOString() },
  { mmsi: '440001001', lat: 34.7850, lon: 128.6850, speed: 1.2,  course: 90,  timestamp: new Date().toISOString() },
  { mmsi: '440001002', lat: 34.7900, lon: 128.6900, speed: 8.5,  course: 270, timestamp: new Date().toISOString() },
  { mmsi: '440001003', lat: 34.7810, lon: 128.6810, speed: 0.3,  course: 0,   timestamp: new Date().toISOString() },
  { mmsi: '440001004', lat: 34.7870, lon: 128.6870, speed: 12.0, course: 45,  timestamp: new Date().toISOString() },
];

const MOCK_STATIC: StaticRecord[] = [
  { mmsi: '440001000', shipName: '해랑호',   shipType: 'fishing', tonnage: 2.5,  length: 8  },
  { mmsi: '440001001', shipName: '돌고래호', shipType: 'leisure', tonnage: 1.8,  length: 6  },
  { mmsi: '440001002', shipName: '대성호',   shipType: 'fishing', tonnage: 9.77, length: 18 },
  { mmsi: '440001003', shipName: '바다로호', shipType: 'leisure', tonnage: 2.0,  length: 5  },
  { mmsi: '440001004', shipName: '금풍호',   shipType: 'cargo',   tonnage: 15.0, length: 25 },
];

// --- Helpers ---------------------------------------------------------

function classifySize(tonnage: number): 'small' | 'large' {
  return tonnage < TONNAGE_THRESHOLD ? 'small' : 'large';
}

function joinFleetData(
  dynamic: DynamicRecord[],
  staticMap: Map<string, StaticRecord>,
): FleetEntry[] {
  const entries: FleetEntry[] = [];
  for (const d of dynamic) {
    const s = staticMap.get(d.mmsi);
    if (!s) continue;
    entries.push({
      mmsi: d.mmsi,
      lat: d.lat,
      lon: d.lon,
      speed: d.speed,
      course: d.course,
      timestamp: d.timestamp,
      shipName: s.shipName,
      shipType: s.shipType,
      tonnage: s.tonnage,
      length: s.length,
      sizeClass: classifySize(s.tonnage),
    });
  }
  return entries;
}

// --- Functional filter chain (QueryBuilder) --------------------------

type FleetFilter = (entry: FleetEntry) => boolean;

/**
 * FleetQueryParams로부터 필터 배열을 생성하고,
 * 함수형 체이닝으로 fleet 목록에 적용한다.
 */
function buildFilters(params: FleetQueryParams): FleetFilter[] {
  const filters: FleetFilter[] = [];

  if (params.size != null) {
    const sizeVal = params.size;
    filters.push((e) => e.sizeClass === sizeVal);
  }
  if (params.minTonnage != null) {
    const min = params.minTonnage;
    filters.push((e) => e.tonnage >= min);
  }
  if (params.maxTonnage != null) {
    const max = params.maxTonnage;
    filters.push((e) => e.tonnage <= max);
  }

  return filters;
}

function applyFilters(fleet: FleetEntry[], filters: FleetFilter[]): FleetEntry[] {
  return filters.reduce<FleetEntry[]>(
    (acc, filter) => acc.filter(filter),
    fleet,
  );
}

// --- Data fetchers ---------------------------------------------------

async function fetchDynamic(): Promise<DynamicRecord[]> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return MOCK_DYNAMIC;
  }

  const url = `https://apis.data.go.kr/1192000/VesselAisDynamic/getDynamic?serviceKey=${apiKey}&resultType=json&numOfRows=100`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    throw new ExternalApiError('Fleet dynamic API unreachable', err);
  }
  if (!res.ok) {
    throw new ExternalApiError(`Fleet dynamic API responded with HTTP ${res.status}`);
  }

  const json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  return items.map((item) => ({
    mmsi: String(item['mmsi'] ?? ''),
    lat: Number(item['lat'] ?? 0),
    lon: Number(item['lon'] ?? 0),
    speed: Number(item['speed'] ?? 0),
    course: Number(item['course'] ?? 0),
    timestamp: String(item['recptnDt'] ?? new Date().toISOString()),
  }));
}

async function fetchStatic(): Promise<Map<string, StaticRecord>> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return new Map(MOCK_STATIC.map((s) => [s.mmsi, s]));
  }

  const url = `https://apis.data.go.kr/1192000/VesselAisStatic/getStatic?serviceKey=${apiKey}&resultType=json&numOfRows=100`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    throw new ExternalApiError('Fleet static API unreachable', err);
  }
  if (!res.ok) {
    throw new ExternalApiError(`Fleet static API responded with HTTP ${res.status}`);
  }

  const json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  const map = new Map<string, StaticRecord>();
  for (const item of items) {
    const mmsi = String(item['mmsi'] ?? '');
    map.set(mmsi, {
      mmsi,
      shipName: String(item['shipNm'] ?? ''),
      shipType: String(item['shipTp'] ?? ''),
      tonnage: Number(item['grossTonnage'] ?? 0),
      length: Number(item['shipLength'] ?? 0),
    });
  }
  return map;
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const reqTimestamp = new Date().toISOString();

  const parsed = parseAndValidateQuery(request.nextUrl.searchParams);

  structuredLog('info', {
    timestamp: reqTimestamp,
    event: 'fleet.request.received',
    params: Object.fromEntries(request.nextUrl.searchParams),
  });

  if (!parsed.success) {
    structuredLog('warn', {
      timestamp: reqTimestamp,
      event: 'fleet.request.validation_failed',
      params: Object.fromEntries(request.nextUrl.searchParams),
      error: parsed.message,
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { ok: false, error: parsed.message },
      { status: 400 },
    );
  }

  const params = parsed.data;

  try {
    const [dynamic, staticMap] = await Promise.all([
      fetchDynamic(),
      fetchStatic(),
    ]);

    const fleet = applyFilters(
      joinFleetData(dynamic, staticMap),
      buildFilters(params),
    );

    const isMock = !process.env.FLEET_API_KEY || process.env.FLEET_USE_MOCK === 'true';

    structuredLog('info', {
      timestamp: reqTimestamp,
      event: 'fleet.request.success',
      params,
      count: fleet.length,
      mock: isMock,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      data: fleet,
      count: fleet.length,
      timestamp: new Date().toISOString(),
      mock: isMock,
    });
  } catch (err) {
    if (err instanceof ExternalApiError) {
      structuredLog('error', {
        timestamp: reqTimestamp,
        event: 'fleet.request.upstream_failed',
        params,
        error: { message: err.message, cause: String(err.cause) },
        duration: Date.now() - startTime,
      });
      return NextResponse.json(
        { ok: false, error: 'Bad Gateway: upstream fleet API failed' },
        { status: 502 },
      );
    }
    structuredLog('error', {
      timestamp: reqTimestamp,
      event: 'fleet.request.internal_error',
      params,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
