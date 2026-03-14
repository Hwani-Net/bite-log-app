import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Using OceanGrid direct API URL which matches the 64-char hex key from .env.local
const KHOA_OCEANGRID_BASE = 'http://www.khoa.go.kr/api/oceangrid/tideObsPre/search.do';

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_KHOA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'KHOA API key not configured' }, { status: 500 });
  }

  const queryParams = request.nextUrl.searchParams;
  const obsCode = queryParams.get('obs_post_id') || '';
  const date = queryParams.get('date') || '';

  if (!obsCode || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const apiUrl = `${KHOA_OCEANGRID_BASE}?ServiceKey=${apiKey}&ObsCode=${obsCode}&Date=${date}&ResultType=json`;

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    const text = await res.text();
    
    // Attempt to parse JSON
    try {
      const data = JSON.parse(text);
      const lowerText = text.toLowerCase();
      if (lowerText.includes('error') || lowerText.includes('invalid')) {
        console.error('KHOA API returned error/invalid response:', text);
        return NextResponse.json({
          error: 'KHOA API returned an error or invalid response',
          details: text.substring(0, 200),
        }, { status: 502 });
      }
      return NextResponse.json(data);
    } catch (e) {
      console.error('KHOA API Error Response:', text);
      return NextResponse.json({ 
        error: 'KHOA API returned non-JSON response', 
        details: text.substring(0, 100) 
      }, { status: 502 });
    }
  } catch (err) {
    console.error('Tide Proxy Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
