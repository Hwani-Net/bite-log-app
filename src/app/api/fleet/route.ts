import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- Constants -------------------------------------------------------

/** gross tonnage 기준 임계값: 미만 → small, 이상 → large */
const TONNAGE_THRESHOLD = 3;

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

// --- Custom error class ----------------------------------------------

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

// --- Query param validation ------------------------------------------

const VALID_SIZE_VALUES = ['small', 'large'] as const;
type SizeFilter = (typeof VALID_SIZE_VALUES)[number];

function validateParams(
  sizeParam: string | null,
  minTonnage: string | null,
  maxTonnage: string | null,
): { ok: true } | { ok: false; message: string } {
  if (sizeParam !== null && !VALID_SIZE_VALUES.includes(sizeParam as SizeFilter)) {
    return {
      ok: false,
      message: `Invalid 'size' value "${sizeParam}". Must be one of: ${VALID_SIZE_VALUES.join(', ')}`,
    };
  }
  if (minTonnage !== null && isNaN(Number(minTonnage))) {
    return { ok: false, message: "'minTonnage' must be a numeric value" };
  }
  if (maxTonnage !== null && isNaN(Number(maxTonnage))) {
    return { ok: false, message: "'maxTonnage' must be a numeric value" };
  }
  return { ok: true };
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sizeParam    = searchParams.get('size');
  const minTonnage   = searchParams.get('minTonnage');
  const maxTonnage   = searchParams.get('maxTonnage');

  const validation = validateParams(sizeParam, minTonnage, maxTonnage);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.message },
      { status: 400 },
    );
  }

  const sizeFilter = sizeParam as SizeFilter | null;

  try {
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

    return NextResponse.json({
      ok: true,
      data: fleet,
      count: fleet.length,
      timestamp: new Date().toISOString(),
      mock: isMock,
    });
  } catch (err) {
    if (err instanceof ExternalApiError) {
      console.error('[Fleet 502]', err.message, err.cause);
      return NextResponse.json(
        { ok: false, error: 'Bad Gateway: upstream fleet API failed' },
        { status: 502 },
      );
    }
    console.error('[Fleet 500]', err);
    return NextResponse.json(
      { ok: false, error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
