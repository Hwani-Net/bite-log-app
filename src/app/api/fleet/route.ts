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

const MOCK_DYNAMIC: DynamicRecord[] = [];

const MOCK_STATIC: StaticRecord[] = [];

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
 * api.odcloud.kr URL 빌드 헬퍼.
 *
 * 공공데이터포털 serviceKey는 이미 URL-encoded 상태(Base64+%2B/%3D)로 발급된다.
 * URLSearchParams.set()을 사용하면 이중 인코딩(%2B → %252B)이 발생하므로
 * template string으로 serviceKey를 직접 삽입한다.
 *
 * ⚠️  FLEET_API_KEY 발급: https://www.data.go.kr → 검색 "선박 AIS 동적정보" →
 *     활용신청 후 발급된 인코딩 키를 그대로 .env.local에 설정한다.
 *
 * Primary endpoint: api.odcloud.kr/api/15129186/v1 (선박AIS동적정보)
 *   → apis.data.go.kr/1192000/VesselAisDynamic/getDynamic 은 HTTP 500 반환 확인됨
 */
function buildOdcloudUrl(datasetId: string, apiKey: string, page = 1, perPage = 100, uddiPath?: string): string {
  const suffix = uddiPath ? `/${uddiPath}` : '';
  return `https://api.odcloud.kr/api/${datasetId}/v1${suffix}?serviceKey=${apiKey}&page=${page}&perPage=${perPage}`;
}

/** api.odcloud.kr 응답 형식 */
interface OdcloudResponse {
  currentCount?: number;
  data?: Array<Record<string, unknown>>;
  matchCount?: number;
  page?: number;
  perPage?: number;
  totalCount?: number;
}

/**
 * 응답 JSON에서 item 배열을 추출한다.
 * - api.odcloud.kr 형식: { data: [...] }
 * - apis.data.go.kr 형식: { response: { body: { items: { item: [...] } } } }
 * 두 형식을 모두 처리한다.
 */
function extractItems(json: unknown): Array<Record<string, unknown>> {
  if (json == null || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;

  // odcloud 형식
  if (Array.isArray(obj['data'])) {
    return obj['data'] as Array<Record<string, unknown>>;
  }

  // apis.data.go.kr 형식
  const resp = obj['response'] as Record<string, unknown> | undefined;
  const body = resp?.['body'] as Record<string, unknown> | undefined;
  const items = body?.['items'] as Record<string, unknown> | undefined;
  const item = items?.['item'];
  if (Array.isArray(item)) return item as Array<Record<string, unknown>>;
  if (item != null && typeof item === 'object') return [item as Record<string, unknown>];

  return [];
}

/**
 * ODCloud AIS API의 좌표값을 도 단위로 정규화한다.
 * 원시값이 1000 초과인 경우 600000으로 나눠 도 단위로 변환한다.
 * (예: 19874256 → 33.12°, 75949336 → 126.58°)
 * 이미 도 단위(예: 34.5)인 경우 그대로 반환.
 */
function normalizeCoord(raw: number): number {
  return raw > 1000 ? raw / 600000 : raw;
}

/** DynamicRecord 매핑: odcloud/data.go.kr 양쪽 필드명 처리 */
function mapDynamicItem(item: Record<string, unknown>): DynamicRecord {
  const rawLat = Number(item['lat'] ?? item['LAT'] ?? item['위도'] ?? item['LATITUDE'] ?? 0);
  const rawLon = Number(item['lon'] ?? item['LON'] ?? item['경도'] ?? item['LONGITUDE'] ?? 0);
  return {
    mmsi: String(item['mmsi'] ?? item['MMSI'] ?? ''),
    lat: normalizeCoord(rawLat),
    lon: normalizeCoord(rawLon),
    speed: Number(item['sog'] ?? item['SOG'] ?? item['대지속력'] ?? item['speed'] ?? item['SPEED'] ?? 0),
    course: Number(item['cog'] ?? item['COG'] ?? item['대지침로'] ?? item['course'] ?? item['COURSE'] ?? 0),
    timestamp: parseRecptnDt(
      // '수신시간' is the field name returned by the ODCloud UDDI endpoint (others are aliases)
      String(item['recptnDt'] ?? item['RECPTN_DT'] ?? item['수신일시'] ?? item['수신시각'] ?? item['수신시간'] ?? ''),
    ),
  };
}

/** StaticRecord 매핑: odcloud/data.go.kr 양쪽 필드명 처리 */
function mapStaticItem(item: Record<string, unknown>): StaticRecord {
  const mmsi = String(item['mmsi'] ?? item['MMSI'] ?? '');
  return {
    mmsi,
    shipName: String(item['shipNm'] ?? item['SHIP_NM'] ?? item['선박명'] ?? ''),
    shipType: String(
      item['shipTp'] ?? item['SHIP_TP'] ?? item['shipTypCd'] ?? item['SHIP_TYPE'] ??
      item['SHIP_TYP_CD'] ?? item['선박종류'] ?? '',
    ),
    tonnage: Number(
      item['gt'] ?? item['GT'] ?? item['grossTon'] ?? item['GROSS_TON'] ??
      item['grossTonnage'] ?? item['GROSS_TONNAGE'] ?? item['총톤수'] ?? 0,
    ),
    length: Number(
      item['loa'] ?? item['LOA'] ?? item['shpLoa'] ?? item['SHP_LOA'] ??
      item['shipLength'] ?? item['SHIP_LENGTH'] ?? item['선체전장'] ?? 0,
    ),
  };
}

async function fetchDynamic(): Promise<FetchResult<DynamicRecord[]>> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return { data: MOCK_DYNAMIC, fallback: false };
  }

  // Primary: api.odcloud.kr/api/15129186/v1/uddi:... (선박AIS동적정보)
  const urlStr = buildOdcloudUrl('15129186', apiKey, 1, 100, 'uddi:2762dfc8-b8ae-4e17-8a44-86f39f480203');

  // Debug: print the full URL shape (API key redacted) so it's visible in Next.js dev logs
  console.log('[fleet] fetchDynamic URL:', urlStr.replace(apiKey, '<FLEET_API_KEY>'));
  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.dynamic.request',
    endpoint: 'odcloud/15129186',
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

  let rawText: string;
  try {
    rawText = await res.text();
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API body read failed', cause: String(err) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.fallback_to_mock',
      error: { message: 'Fleet dynamic API returned non-JSON', preview: rawText.slice(0, 200), cause: String(err) },
    });
    return { data: MOCK_DYNAMIC, fallback: true };
  }

  const items = extractItems(json);

  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.field_sample',
      fields: Object.keys(items[0]),
      sample: items[0],
      totalItems: (json as OdcloudResponse).totalCount ?? items.length,
    });
  }

  const data = items
    .map(mapDynamicItem)
    .filter((d) => d.mmsi !== '');

  // Warn when MMSI values are masked (e.g. "440******") — join with static will yield 0 results
  const maskedCount = data.filter((d) => d.mmsi.includes('*')).length;
  if (maskedCount > 0) {
    console.warn(`[fleet] ${maskedCount}/${data.length} MMSI values are masked by ODCloud API — static join will fail, fallback expected`);
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.dynamic.mmsi_masked',
      maskedCount,
      totalCount: data.length,
    });
  }

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

  // apis.data.go.kr static endpoint (dynamic보다 안정적인 경우가 많음)
  // serviceKey 이중 인코딩 방지를 위해 template string 직접 사용
  const extra = new URLSearchParams({ resultType: 'json', numOfRows: '100', pageNo: '1' });
  const urlStr = `https://apis.data.go.kr/1192000/VesselAisStatic/getStatic?serviceKey=${apiKey}&${extra.toString()}`;

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.static.request',
    endpoint: 'data.go.kr/VesselAisStatic',
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

  let rawText: string;
  try {
    rawText = await res.text();
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API body read failed', cause: String(err) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API returned non-JSON', preview: rawText.slice(0, 200), cause: String(err) },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  const items = extractItems(json);

  if (items.length === 0) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.fallback_to_mock',
      error: { message: 'Fleet static API returned empty dataset' },
    });
    return { data: new Map(MOCK_STATIC.map((s) => [s.mmsi, s])), fallback: true };
  }

  if (items.length > 0) {
    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.static.field_sample',
      fields: Object.keys(items[0]),
      sample: items[0],
      totalItems: items.length,
    });
  }

  const map = new Map<string, StaticRecord>();
  for (const item of items) {
    const record = mapStaticItem(item);
    if (record.mmsi) map.set(record.mmsi, record);
  }
  return { data: map, fallback: false };
}

// --- KHOA OceanGrid AIS fallback ------------------------------------

/**
 * KHOA(국립해양조사원) OceanGrid 실시간 선박위치 API
 * - 엔드포인트: www.khoa.go.kr/api/oceangrid/tsrtShipPos/search.do
 * - 키 형식: 64자 hex (NEXT_PUBLIC_KHOA_API_KEY)
 * - 응답: result.data[] (camelCase 필드)
 * - 단일 엔드포인트에 동적(위치·속도)과 정적(선명·톤수) 정보 포함
 * docs: https://www.khoa.go.kr/oceangrid/khoa/takepart/openapi/openApiDeveloperGuide.do
 */
const KHOA_VESSEL_POS_URL =
  'https://www.khoa.go.kr/api/oceangrid/tsrtShipPos/search.do';

interface KhoaVesselItem {
  mmsi?: string | number;
  lat?: string | number;
  lon?: string | number;
  speed?: string | number;
  sog?: string | number;
  course?: string | number;
  cog?: string | number;
  recptnDt?: string;
  recptDt?: string;
  shipNm?: string;
  shipName?: string;
  shipType?: string | number;
  shipTp?: string | number;
  gt?: string | number;
  grossTon?: string | number;
  loa?: string | number;
  shipLength?: string | number;
  [key: string]: unknown;
}

interface KhoaApiResponse {
  result?: {
    meta?: { totalCount?: string | number };
    data?: KhoaVesselItem[];
  };
}

/**
 * KHOA OceanGrid에서 선박 위치 데이터를 조회하고
 * dynamic 목록과 static 맵을 반환한다.
 * 실패 시 null 반환.
 */
async function fetchFromKhoa(): Promise<{
  dynamic: DynamicRecord[];
  staticMap: Map<string, StaticRecord>;
} | null> {
  const khoaKey = process.env.NEXT_PUBLIC_KHOA_API_KEY;
  if (!khoaKey) return null;

  const url = `${KHOA_VESSEL_POS_URL}?ServiceKey=${khoaKey}&ResultType=json&numOfRows=100&pageNo=1`;

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.khoa.request',
    url: url.replace(khoaKey, '[REDACTED]'),
  });

  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.khoa.unreachable',
      error: String(err),
    });
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.khoa.http_error',
      status: res.status,
      body: body.slice(0, 300),
    });
    return null;
  }

  let json: KhoaApiResponse;
  try {
    json = (await res.json()) as KhoaApiResponse;
  } catch (err) {
    const rawText = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.khoa.parse_error',
      preview: rawText.slice(0, 200),
      error: String(err),
    });
    return null;
  }

  const items: KhoaVesselItem[] = json?.result?.data ?? [];
  if (items.length === 0) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'fleet.khoa.empty',
    });
    return null;
  }

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'fleet.khoa.field_sample',
    fields: Object.keys(items[0]),
    totalItems: items.length,
  });

  const dynamic: DynamicRecord[] = items
    .filter((item) => item.mmsi != null)
    .map((item) => ({
      mmsi: String(item.mmsi ?? ''),
      lat: Number(item.lat ?? 0),
      lon: Number(item.lon ?? 0),
      speed: Number(item.speed ?? item.sog ?? 0),
      course: Number(item.course ?? item.cog ?? 0),
      timestamp: parseRecptnDt(String(item.recptnDt ?? item.recptDt ?? '')),
    }));

  const staticMap = new Map<string, StaticRecord>();
  for (const item of items) {
    const mmsi = String(item.mmsi ?? '');
    if (!mmsi) continue;
    staticMap.set(mmsi, {
      mmsi,
      shipName: String(item.shipNm ?? item.shipName ?? ''),
      shipType: String(item.shipType ?? item.shipTp ?? ''),
      tonnage: Number(item.gt ?? item.grossTon ?? 0),
      length: Number(item.loa ?? item.shipLength ?? 0),
    });
  }

  return { dynamic, staticMap };
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const t0 = Date.now();

  try {
    // 1. Query param 유효성 검사
    const parsed = parseAndValidateQuery(request.nextUrl.searchParams);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.message }, { status: 400 });
    }
    const params = parsed.data;

    // 2. Dynamic + Static 데이터 병렬 fetch (primary: odcloud/data.go.kr)
    const [dynamicResult, staticResult] = await Promise.all([
      fetchDynamic(),
      fetchStatic(),
    ]);

    // 3. primary API 중 하나라도 실패 시 KHOA OceanGrid로 fallback
    //    이유: dynamic이 실제 MMSI를 반환하고 static이 Mock MMSI를 반환하면
    //          joinFleetData 결과가 0건이 되어 실질적으로 mock과 동일해짐
    let rawFleet: FleetEntry[];
    let dataSource: 'primary' | 'khoa' | 'mock' = 'primary';

    if (dynamicResult.fallback || staticResult.fallback) {
      const khoaData = await fetchFromKhoa();
      if (khoaData && khoaData.dynamic.length > 0) {
        rawFleet = joinFleetData(khoaData.dynamic, khoaData.staticMap);
        dataSource = 'khoa';
        structuredLog('info', {
          timestamp: new Date().toISOString(),
          event: 'fleet.khoa.success',
          count: rawFleet.length,
        });
      } else {
        // 모든 외부 소스 실패 → mock 데이터 사용
        rawFleet = joinFleetData(MOCK_DYNAMIC, new Map(MOCK_STATIC.map((s) => [s.mmsi, s])));
        dataSource = 'mock';
      }
    } else {
      rawFleet = joinFleetData(dynamicResult.data, staticResult.data);
    }

    // 4. 필터 적용
    const filters = buildFilters(params);
    const fleet = applyFilters(rawFleet, filters);

    const duration = Date.now() - t0;
    const isMock = dataSource === 'mock';

    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'fleet.get.complete',
      duration,
      count: fleet.length,
      rawCount: rawFleet.length,
      dataSource,
      mock: isMock,
      params,
    });

    return NextResponse.json({
      ok: true,
      data: fleet,
      count: fleet.length,
      timestamp: new Date().toISOString(),
      mock: isMock,
      dataSource,
    });
  } catch (err) {
    structuredLog('error', {
      timestamp: new Date().toISOString(),
      event: 'fleet.get.unhandled_error',
      error: String(err),
      duration: Date.now() - t0,
    });
    return NextResponse.json(
      { ok: false, error: 'Internal server error', mock: true, data: MOCK_DYNAMIC, count: MOCK_DYNAMIC.length },
      { status: 500 },
    );
  }
}
