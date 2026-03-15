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

/**
 * apis.data.go.kr serviceKey 빌드 헬퍼.
 *
 * data.go.kr은 serviceKey를 이미 URL-encoded 상태(Base64+%2B/%3D)로 발급한다.
 * URLSearchParams.set()을 사용하면 이중 인코딩(%2B → %252B)이 발생해 서버가
 * 키를 인식하지 못하는 문제가 생긴다.
 * → template string으로 직접 URL을 조립해 이중 인코딩을 방지한다.
 *
 * ⚠️  FLEET_API_KEY 발급: https://www.data.go.kr → 검색 "선박 AIS" → 활용신청 후
 *     발급된 인코딩 키(예: abc%2Bdef%3D)를 그대로 .env.local에 설정한다.
 *     현재 KHOA 64자 hex 키는 data.go.kr AIS 서비스와 무관하므로 동작하지 않는다.
 */
function buildAisUrl(
  path: string,
  apiKey: string,
  extra: Record<string, string> = {},
): string {
  // serviceKey는 그대로 삽입 (data.go.kr이 이미 URL-encode해서 발급하므로)
  const params = new URLSearchParams({ resultType: 'json', numOfRows: '100', pageNo: '1', ...extra });
  return `https://apis.data.go.kr${path}?serviceKey=${apiKey}&${params.toString()}`;
}

async function fetchDynamic(): Promise<FetchResult<DynamicRecord[]>> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return { data: MOCK_DYNAMIC, fallback: false };
  }

  const urlStr = buildAisUrl('/1192000/VesselAisDynamic/getDynamic', apiKey);

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.dynamic.request',
    url: urlStr.replace(apiKey, '[REDACTED]'),
  });

  let res: Response;
  try {
    res = await fetch(urlStr, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API unreachable', cause: String(err) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: `Fleet dynamic API responded with HTTP ${res.status}`, body: body.slice(0, 500) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  let json: { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  try {
    json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  } catch (err) {
    const rawText = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API returned non-JSON response', preview: rawText.slice(0, 200), cause: String(err) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  // 응답 구조 상세 로깅 (필드 매핑 검증용)
  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.dynamic.raw_response_structure',
    topLevelKeys: Object.keys(json),
    responseBodyKeys: json?.response?.body ? Object.keys(json.response.body) : [],
  });

  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  // 첫 번째 아이템의 키와 샘플 값을 로깅 (필드명 진단용)
  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.field_sample',
      fields: Object.keys(items[0]),
      sample: {
        // lowercase (일부 엔드포인트) 및 UPPERCASE_SNAKE (대부분 공공데이터포털 AIS 표준) 모두 로깅
        mmsi: items[0]['mmsi'] ?? items[0]['MMSI'],
        lat: items[0]['lat'] ?? items[0]['LAT'] ?? items[0]['LATITUDE'],
        lon: items[0]['lon'] ?? items[0]['LON'] ?? items[0]['LONGITUDE'],
        sog: items[0]['sog'] ?? items[0]['SOG'],
        cog: items[0]['cog'] ?? items[0]['COG'],
        recptnDt: items[0]['recptnDt'] ?? items[0]['RECPTN_DT'],
        speed: items[0]['speed'] ?? items[0]['SPEED'],
        course: items[0]['course'] ?? items[0]['COURSE'],
      },
      totalItems: items.length,
    });
  }

  const data = items.map((item) => ({
    // 공공데이터포털 AIS API: 일부 엔드포인트는 대문자 스네이크케이스 사용 (PITFALLS.md 참조)
    mmsi: String(item['mmsi'] ?? item['MMSI'] ?? ''),
    lat: Number(item['lat'] ?? item['LAT'] ?? item['LATITUDE'] ?? 0),
    lon: Number(item['lon'] ?? item['LON'] ?? item['LONGITUDE'] ?? 0),
    // AIS 표준: sog = Speed Over Ground (대지속력), cog = Course Over Ground (대지침로)
    speed: Number(item['sog'] ?? item['SOG'] ?? item['speed'] ?? item['SPEED'] ?? 0),
    course: Number(item['cog'] ?? item['COG'] ?? item['course'] ?? item['COURSE'] ?? 0),
    timestamp: parseRecptnDt(String(item['recptnDt'] ?? item['RECPTN_DT'] ?? '')),
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

  const urlStr = buildAisUrl('/1192000/VesselAisStatic/getStatic', apiKey);

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.static.request',
    url: urlStr.replace(apiKey, '[REDACTED]'),
  });

  let res: Response;
  try {
    res = await fetch(urlStr, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API unreachable', cause: String(err) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: `Fleet static API responded with HTTP ${res.status}`, body: body.slice(0, 500) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  let json: { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  try {
    json = await res.json() as { response?: { body?: { items?: { item?: Array<Record<string, unknown>> } } } };
  } catch (err) {
    const rawText = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API returned non-JSON response', preview: rawText.slice(0, 200), cause: String(err) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  // 응답 구조 상세 로깅 (필드 매핑 검증용)
  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.static.raw_response_structure',
    topLevelKeys: Object.keys(json),
    responseBodyKeys: json?.response?.body ? Object.keys(json.response.body) : [],
  });

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

  // 첫 번째 아이템의 키와 샘플 값을 로깅 (필드명 진단용)
  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.field_sample',
      fields: Object.keys(items[0]),
      sample: {
        // lowercase 및 UPPERCASE_SNAKE 모두 로깅
        mmsi: items[0]['mmsi'] ?? items[0]['MMSI'],
        shipNm: items[0]['shipNm'] ?? items[0]['SHIP_NM'],
        shipTp: items[0]['shipTp'] ?? items[0]['SHIP_TP'] ?? items[0]['shipTypCd'] ?? items[0]['SHIP_TYPE'],
        gt: items[0]['gt'] ?? items[0]['GT'] ?? items[0]['grossTon'] ?? items[0]['GROSS_TON'],
        loa: items[0]['loa'] ?? items[0]['LOA'] ?? items[0]['shpLoa'] ?? items[0]['SHP_LOA'],
      },
      totalItems: items.length,
    });
  }

  const map = new Map<string, StaticRecord>();
  for (const item of items) {
    // 공공데이터포털 AIS API: 일부 엔드포인트는 대문자 스네이크케이스 사용 (PITFALLS.md 참조)
    const mmsi = String(item['mmsi'] ?? item['MMSI'] ?? '');
    map.set(mmsi, {
      mmsi,
      shipName: String(item['shipNm'] ?? item['SHIP_NM'] ?? ''),
      // 선박종류코드 (AIS Type 11: 낚시선 등)
      shipType: String(item['shipTp'] ?? item['SHIP_TP'] ?? item['shipTypCd'] ?? item['SHIP_TYPE'] ?? item['SHIP_TYP_CD'] ?? ''),
      // 총톤수: gt(공공데이터포털 표준) → UPPERCASE 순서로 fallback
      tonnage: Number(item['gt'] ?? item['GT'] ?? item['grossTon'] ?? item['GROSS_TON'] ?? item['grossTonnage'] ?? item['GROSS_TONNAGE'] ?? 0),
      // 선체전장: loa(Length Overall, AIS 표준) → UPPERCASE 순서로 fallback
      length: Number(item['loa'] ?? item['LOA'] ?? item['shpLoa'] ?? item['SHP_LOA'] ?? item['shipLength'] ?? item['SHIP_LENGTH'] ?? 0),
    });
  }
  return { data: map, fallback: false };
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const t0 = Date.now();

  // 1. Query param 유효성 검사
  const parsed = parseAndValidateQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.message }, { status: 400 });
  }
  const params = parsed.data;

  // 2. Dynamic + Static 데이터 병렬 fetch
  const [dynamicResult, staticResult] = await Promise.all([
    fetchDynamic(),
    fetchStatic(),
  ]);

  // 3. 조인 + 필터
  const rawFleet = joinFleetData(dynamicResult.data, staticResult.data);
  const filters = buildFilters(params);
  const fleet = applyFilters(rawFleet, filters);

  const duration = Date.now() - t0;
  const isMock = dynamicResult.fallback || staticResult.fallback;

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.get.complete',
    duration,
    count: fleet.length,
    rawCount: rawFleet.length,
    mock: isMock,
    dynamicFallback: dynamicResult.fallback,
    staticFallback: staticResult.fallback,
    params,
  });

  return NextResponse.json({
    ok: true,
    data: fleet,
    count: fleet.length,
    timestamp: new Date().toISOString(),
    mock: isMock,
  });
}
