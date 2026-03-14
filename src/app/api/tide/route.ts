import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Using OceanGrid direct API URL which matches the 64-char hex key from .env.local
const KHOA_OCEANGRID_BASE = 'http://www.khoa.go.kr/api/oceangrid/tideObsPre/search.do';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // Static export mode: return empty response (client falls back to mock tide data)
  return NextResponse.json({ result: { data: [] } });
}
