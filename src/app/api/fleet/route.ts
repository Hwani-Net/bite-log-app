import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- Constants -------------------------------------------------------

/** gross tonnage 기준 임계값: 미만 → small, 이상 → large
 *  환경 변수 TONNAGE_THRESHOLD 로 재정의 가능 (기본값: 3) */
const TONNAGE_THRESHOLD = Number(process.env.TONNAGE_THRESHOLD ?? 3);

// --- Types -----------------------------------------------------------

/** GET /api/fleet 쿼리 파라미터 사양 */
interface FleetQueryParams {
  /** 선박 크기 필터. 허용값: 'small' | 'large' */
  size: string | null;
  /** 최소 톤수 필터 (숫자 문자열) */
  minTonnage: string | null;
  /** 최대 톤수 필터 (숫자 문자열) */
  maxTonnage: string | null;
}

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

// --- Custom error classes --------------------------------------------

/** 400 Bad Request — 쿼리 파라미터 유효성 오류 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

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
    if (!s) continue; // non-null assertion 제거: 명시적 가드로 대체
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

  const json = await res.json();
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  return items.map((item) => ({
    mmsi: String(item.mmsi ?? ''),
    lat: Number(item.lat ?? 0),
    lon: Number(item.lon ?? 0),
    speed: Number(item.speed ?? 0),
    course: Number(item.course ?? 0),
    timestamp: String(item.recptnDt ?? new Date().toISOString()),
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

  const json = await res.json();
  const items: Array<Record<string, unknown>> =
    json?.response?.body?.items?.item ?? [];

  const map = new Map<string, StaticRecord>();
  for (const item of items) {
    const mmsi = String(item.mmsi ?? '');
    map.set(mmsi, {
      mmsi,
      shipName: String(item.shipNm ?? ''),
      shipType: String(item.shipTp ?? ''),
      tonnage: Number(item.grossTonnage ?? 0),
      length: Number(item.shipLength ?? 0),
    });
  }
  return map;
}

// --- Query param parsing & validation --------------------------------

const VALID_SIZE_VALUES = ['small', 'large'] as const;
type SizeFilter = (typeof VALID_SIZE_VALUES)[number];

/** URLSearchParams → FleetQueryParams 변환 (타입 안전 파싱) */
function parseQueryParams(searchParams: URLSearchParams): FleetQueryParams {
  return {
    size: searchParams.get('size'),
    minTonnage: searchParams.get('minTonnage'),
    maxTonnage: searchParams.get('maxTonnage'),
  };
}

/** 파라미터 유효성 검사. 실패 시 ValidationError throw */
function validateParams(params: FleetQueryParams): void {
  const { size, minTonnage, maxTonnage } = params;

  if (size !== null && !VALID_SIZE_VALUES.includes(size as SizeFilter)) {
    throw new ValidationError(
      `Invalid 'size' value "${size}". Must be one of: ${VALID_SIZE_VALUES.join(', ')}`,
    );
  }
  if (minTonnage !== null && isNaN(Number(minTonnage))) {
    throw new ValidationError("'minTonnage' must be a numeric value");
  }
  if (maxTonnage !== null && isNaN(Number(maxTonnage))) {
    throw new ValidationError("'maxTonnage' must be a numeric value");
  }
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const reqTimestamp = new Date().toISOString();
  const params = parseQueryParams(request.nextUrl.searchParams);

  console.info('[Fleet GET] request received', { timestamp: reqTimestamp, params });

  try {
    validateParams(params);

    const { size, minTonnage, maxTonnage } = params;
    const sizeFilter = size as SizeFilter | null;

    const [dynamic, staticMap] = await Promise.all([
      fetchDynamic(),
      fetchStatic(),
    ]);

    let fleet = joinFleetData(dynamic, staticMap);

    if (sizeFilter) {
      fleet = fleet.filter((v) => v.sizeClass === sizeFilter);
    }
    if (minTonnage) {
      const min = Number(minTonnage);
      fleet = fleet.filter((v) => v.tonnage >= min);
    }
    if (maxTonnage) {
      const max = Number(maxTonnage);
      fleet = fleet.filter((v) => v.tonnage <= max);
    }

    const isMock = !process.env.FLEET_API_KEY || process.env.FLEET_USE_MOCK === 'true';

    console.info('[Fleet GET] success', { timestamp: reqTimestamp, params, count: fleet.length, mock: isMock });

    return NextResponse.json({
      ok: true,
      data: fleet,
      count: fleet.length,
      timestamp: new Date().toISOString(),
      mock: isMock,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      console.warn('[Fleet 400]', { timestamp: reqTimestamp, params, message: err.message });
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 400 },
      );
    }
    if (err instanceof ExternalApiError) {
      console.error('[Fleet 502]', { timestamp: reqTimestamp, params, message: err.message, cause: err.cause });
      return NextResponse.json(
        { ok: false, error: 'Bad Gateway: upstream fleet API failed' },
        { status: 502 },
      );
    }
    console.error('[Fleet 500]', { timestamp: reqTimestamp, params, err });
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
