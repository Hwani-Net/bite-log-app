import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // Static export mode: return empty response (client falls back to mock news)
  return NextResponse.json({ items: [], total: 0, start: 1, display: 0 });
}
