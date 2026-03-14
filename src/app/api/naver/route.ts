import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'blog';
  const query = searchParams.get('query');
  const display = searchParams.get('display') || '10';
  const sort = searchParams.get('sort') || 'sim';

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Naver keys missing in env');
    return NextResponse.json({ error: 'Naver API keys not configured' }, { status: 500 });
  }

  const naverUrl = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;

  try {
    const res = await fetch(naverUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Naver API error status:', res.status, errorText);
      return NextResponse.json({ error: 'Naver API error', status: res.status, details: errorText }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Naver Proxy Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
