import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- Types -----------------------------------------------------------

interface DynamicRecord {
  mmsi: string;
  lat: number;
  lon: number;
  speed: number;   // knots
  course: number;   // degrees
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
  sizeClass: 'small' | 'large'; // <3 t → small, ≥5 t → large
}

// --- Mock data (used while data.go.kr API key is pending) ------------

const MOCK_DYNAMIC: DynamicRecord[] = [
  { mmsi: '440001000', lat: 34.7833, lon: 128.6833, speed: 0.5, course: 180, timestamp: new Date().toISOString() },
  { mmsi: '440001001', lat: 34.7850, lon: 128.6850, speed: 1.2, course: 90,  timestamp: new Date().toISOString() },
  { mmsi: '440001002', lat: 34.7900, lon: 128.6900, speed: 8.5, course: 270, timestamp: new Date().toISOString() },
  { mmsi: '440001003', lat: 34.7810, lon: 128.6810, speed: 0.3, course: 0,   timestamp: new Date().toISOString() },
  { mmsi: '440001004', lat: 34.7870, lon: 128.6870, speed: 12.0, course: 45, timestamp: new Date().toISOString() },
];

const MOCK_STATIC: StaticRecord[] = [
  { mmsi: '440001000', shipName: '해랑호',   shipType: 'fishing', tonnage: 2.5, length: 8 },
  { mmsi: '440001001', shipName: '돌고래호', shipType: 'leisure', tonnage: 1.8, length: 6 },
  { mmsi: '440001002', shipName: '대성호',   shipType: 'fishing', tonnage: 9.77, length: 18 },
  { mmsi: '440001003', shipName: '바다로호', shipType: 'leisure', tonnage: 2.0, length: 5 },
  { mmsi: '440001004', shipName: '금풍호',   shipType: 'cargo',   tonnage: 15.0, length: 25 },
];

// --- Helpers ---------------------------------------------------------

function classifySize(tonnage: number): 'small' | 'large' {
  return tonnage < 3 ? 'small' : 'large';
}

function joinFleetData(
  dynamic: DynamicRecord[],
  staticMap: Map<string, StaticRecord>,
): FleetEntry[] {
  return dynamic
    .filter((d) => staticMap.has(d.mmsi))
    .map((d) => {
      const s = staticMap.get(d.mmsi)!;
      return {
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
      };
    });
}

// --- Data fetchers ---------------------------------------------------

async function fetchDynamic(): Promise<DynamicRecord[]> {
  const apiKey = process.env.FLEET_API_KEY;
  if (!apiKey || process.env.FLEET_USE_MOCK === 'true') {
    return MOCK_DYNAMIC;
  }

  const url = `https://apis.data.go.kr/1192000/VesselAisDynamic/getDynamic?serviceKey=${apiKey}&resultType=json&numOfRows=100`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error('Fleet dynamic API error:', res.status);
    return MOCK_DYNAMIC;
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
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error('Fleet static API error:', res.status);
    return new Map(MOCK_STATIC.map((s) => [s.mmsi, s]));
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

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sizeFilter = searchParams.get('size'); // "small" | "large" | null (all)
  const minTonnage = searchParams.get('minTonnage');
  const maxTonnage = searchParams.get('maxTonnage');

  try {
    const [dynamic, staticMap] = await Promise.all([
      fetchDynamic(),
      fetchStatic(),
    ]);

    let fleet = joinFleetData(dynamic, staticMap);

    // Optional filters
    if (sizeFilter === 'small' || sizeFilter === 'large') {
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

    return NextResponse.json({
      ok: true,
      mock: !process.env.FLEET_API_KEY || process.env.FLEET_USE_MOCK === 'true',
      count: fleet.length,
      data: fleet,
    });
  } catch (err) {
    console.error('Fleet Proxy Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
