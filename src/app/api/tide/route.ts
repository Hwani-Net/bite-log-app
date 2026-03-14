import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const KHOA_BASE = 'https://apis.data.go.kr/1192136/tideFcstHghLw/getTideFcstHghLw';

export async function GET(request: NextRequest) {
  await headers();
  const apiKey = process.env.KHOA_API_KEY ?? process.env.NEXT_PUBLIC_KHOA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const queryParams = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  
  params.set('resultType', 'json');
  params.set('obsCode', queryParams.get('obs_post_id') || '');
  params.set('tideFcstTime', queryParams.get('date') || '');
  params.set('pageNo', '1');
  params.set('numOfRows', '20');

  // Manual append serviceKey to avoid URLSearchParams encoding issues with some KHOA keys
  const apiUrl = `${KHOA_BASE}?serviceKey=${apiKey}&${params.toString()}`;

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Tide API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch tide data' }, { status: 502 });
  }
}
