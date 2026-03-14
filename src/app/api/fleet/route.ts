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

/**
 * 공공데이터포털 AIS API의 recptnDt 값을 ISO-8601 문자열로 변환한다.
 * API 반환 형식: "YYYYMMDDHHmmss" (14자리) 또는 이미 ISO 문자열인 경우 그대로 반환.
 */
function parseRecptnDt(raw: string): string {
  if (!raw) return new Date().toISOString();
  // ISO 형식이면 그대로 반환
  if (raw.includes('T') || raw.includes('-')) return raw;
  // "YYYYMMDDHHmmss" → "YYYY-MM-DDTHH:mm:ssZ"
  if (raw.length === 14) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`;
  }
  return new Date().toISOString();
}

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

interface FetchResult<T> {
  data: T;
  /** true = 실제 API 호출 실패로 Mock 데이터로 대체됨 */
  fallback: boolean;
}

async function fetchDynamic(): Promise<FetchResult<DynamicRecord[]>> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return { data: MOCK_DYNAMIC, fallback: false };
  }

  const url = `https://apis.data.go.kr/1192000/VesselAisDynamic/getDynamic?serviceKey=${apiKey}&resultType=json&numOfRows=100`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API unreachable', cause: String(err) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  if (!res.ok) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: `Fleet dynamic API responded with HTTP ${res.status}` },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  const json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  // 첫 번째 아이템의 키를 로깅 (필드명 진단용)
  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.field_sample',
      fields: Object.keys(items[0]),
    });
  }

  const data = items.map((item) => ({
    mmsi: String(item['mmsi'] ?? ''),
    lat: Number(item['lat'] ?? 0),
    lon: Number(item['lon'] ?? 0),
    // AIS 표준: sog = Speed Over Ground (대지속력), cog = Course Over Ground (대지침로)
    speed: Number(item['sog'] ?? item['speed'] ?? 0),
    course: Number(item['cog'] ?? item['course'] ?? 0),
    timestamp: parseRecptnDt(String(item['recptnDt'] ?? '')),
  }));

  // API 응답이 비어 있으면 mock으로 fallback
  if (data.length === 0) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API returned empty dataset' },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  return { data, fallback: false };
}

async function fetchStatic(): Promise<FetchResult<Map<string, StaticRecord>>> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: false };
  }

  const url = `https://apis.data.go.kr/1192000/VesselAisStatic/getStatic?serviceKey=${apiKey}&resultType=json&numOfRows=100`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API unreachable', cause: String(err) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  if (!res.ok) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: `Fleet static API responded with HTTP ${res.status}` },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  const json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  // API 응답이 비어 있으면 mock으로 fallback
  if (items.length === 0) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API returned empty dataset' },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  // 첫 번째 아이템의 키를 로깅 (필드명 진단용)
  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.field_sample',
      fields: Object.keys(items[0]),
    });
  }

  const map = new Map<string, StaticRecord>();
  for (const item of items) {
    const mmsi = String(item['mmsi'] ?? '');
    map.set(mmsi, {
      mmsi,
      shipName: String(item['shipNm'] ?? ''),
      // 선박종류코드 (AIS Type 11: 낚시선 등)
      shipType: String(item['shipTp'] ?? item['shipTypCd'] ?? ''),
      // 총톤수: gt(공공데이터포털 표준) → grossTon → grossTonnage 순서로 fallback
      tonnage: Number(item['gt'] ?? item['grossTon'] ?? item['grossTonnage'] ?? 0),
      // 선체전장: loa(Length Overall, AIS 표준) → shpLoa → shipLength 순서로 fallback
      length: Number(item['loa'] ?? item['shpLoa'] ?? item['shipLength'] ?? 0),
    });
  }
  return { data: map, fallback: false };
}

// --- Route handler ---------------------------------------------------

export async function GET() {
  // Static export mode: return mock data (no request params available)
  const fleet = joinFleetData(
    MOCK_DYNAMIC,
    new Map(MOCK_STATIC.map((s) => [s.mmsi, s])),
  );
  return NextResponse.json({
    ok: true,
    data: fleet,
    count: fleet.length,
    timestamp: new Date().toISOString(),
    mock: true,
  });
}
