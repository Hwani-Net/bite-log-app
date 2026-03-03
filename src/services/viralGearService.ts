// Viral Gear Monitor Service
// SNS 바이럴 채비 모니터링 — 네이버 블로그/카페 검색 + Gemini Flash 트렌드 분석
// Cost: ~₩300/월 (네이버 API 무료 + Gemini Flash)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ViralGearItem {
  rank: number;
  gearName: string;         // 채비/장비명 (e.g. "야마시타 에기 3.5호")
  category: string;         // 카테고리 (에기/지그헤드/루어/채비 등)
  species: string;          // 대상 어종
  viralScore: number;       // 바이럴 점수 0~100
  mentionCount: number;     // 언급 횟수
  trend: '급상승' | '상승' | '유지' | '하락';
  trendEmoji: string;
  trendColor: string;
  summaryText: string;      // Gemini가 작성한 요약
  coupangSearchUrl: string; // 쿠팡 검색 링크 (제휴)
  sourceCount: number;      // 검색된 원문 수
}

export interface ViralGearReport {
  items: ViralGearItem[];
  lastUpdated: string;
  totalSources: number;
  isAI: boolean;
  topSpecies: string;       // 이번 주 가장 많이 언급된 어종
  hotKeyword: string;       // 핫 키워드
}

// ─── 검색 키워드 ─────────────────────────────────────────────────────────────

const GEAR_SEARCH_QUERIES = [
  '낚시 채비 추천 2026',
  '주꾸미 에기 추천',
  '볼락 지그헤드 추천',
  '광어 루어 추천',
  '우럭 채비 추천',
  '참돔 타이라바 추천',
  '낚시 장비 품절',
  '낚시 대박 채비',
];

// ─── Mock Data ────────────────────────────────────────────────────────────────

function getMockReport(): ViralGearReport {
  const now = new Date().toISOString();
  return {
    isAI: false,
    lastUpdated: now,
    totalSources: 47,
    topSpecies: '주꾸미',
    hotKeyword: '야마시타 에기',
    items: [
      {
        rank: 1,
        gearName: '야마시타 에기 OH 3.5호 오렌지',
        category: '에기',
        species: '주꾸미/갑오징어',
        viralScore: 94,
        mentionCount: 38,
        trend: '급상승',
        trendEmoji: '🚀',
        trendColor: 'text-red-500',
        summaryText: '블로그·카페 38건 언급. "맑은 날 오렌지 계열이 주꾸미에 최고"라는 평이 지배적. 9~10월 서해 공략 채비 1위.',
        coupangSearchUrl: 'https://www.coupang.com/np/search?q=야마시타+에기+OH+3.5&link_id=re_1765888&subId=bitelog',
        sourceCount: 38,
      },
      {
        rank: 2,
        gearName: '요즈리 슷테 M 핑크',
        category: '슷테',
        species: '갑오징어',
        viralScore: 82,
        mentionCount: 24,
        trend: '상승',
        trendEmoji: '📈',
        trendColor: 'text-orange-500',
        summaryText: '"흐린 날 핑크 슷테 갑오징어 대박"이라는 후기 연이어 등장. 남해권 낚시인들 사이 입소문 확산 중.',
        coupangSearchUrl: 'https://www.coupang.com/np/search?q=요즈리+슷테+핑크&link_id=re_1765888&subId=bitelog',
        sourceCount: 24,
      },
      {
        rank: 3,
        gearName: '아이마 슬로우 지그 80g 블루핑크',
        category: '지깅',
        species: '방어/부시리',
        viralScore: 76,
        mentionCount: 19,
        trend: '급상승',
        trendEmoji: '🚀',
        trendColor: 'text-red-500',
        summaryText: '제주 방어 시즌 개막과 함께 검색량 3배 폭증. 유튜버들이 일제히 블루핑크 슬로우 지그 추천 영상 업로드.',
        coupangSearchUrl: 'https://www.coupang.com/np/search?q=슬로우+지그+80g&link_id=re_1765888&subId=bitelog',
        sourceCount: 19,
      },
      {
        rank: 4,
        gearName: '에코기어 바이브 70 워터멜론',
        category: '스피너베이트',
        species: '볼락/우럭',
        viralScore: 68,
        mentionCount: 16,
        trend: '상승',
        trendEmoji: '📈',
        trendColor: 'text-orange-500',
        summaryText: '볼락 야간 루어 붐과 함께 워터멜론 색상 바이브 추천글 급증. 서해 방파제 낚인들 사이 핫템.',
        coupangSearchUrl: 'https://www.coupang.com/np/search?q=에코기어+바이브&link_id=re_1765888&subId=bitelog',
        sourceCount: 16,
      },
      {
        rank: 5,
        gearName: '오너 지그헤드 1.5g + 갈피나무 웜',
        category: '지그헤드',
        species: '볼락',
        viralScore: 61,
        mentionCount: 12,
        trend: '유지',
        trendEmoji: '➡️',
        trendColor: 'text-gray-500',
        summaryText: '볼락 마릿수 낚시의 정석 채비로 꾸준히 언급. 특히 태안·보령 방파제 야간 낚시에서 압도적.',
        coupangSearchUrl: 'https://www.coupang.com/np/search?q=볼락+지그헤드+1.5g&link_id=re_1765888&subId=bitelog',
        sourceCount: 12,
      },
    ],
  };
}

// ─── Naver Blog Search ────────────────────────────────────────────────────────

interface NaverSearchItem {
  title: string;
  description: string;
  link: string;
  postdate?: string;
}

async function searchNaverBlog(query: string): Promise<NaverSearchItem[]> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return [];

  try {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=10&sort=date`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: NaverSearchItem) => ({
      title: item.title.replace(/<[^>]*>/g, ''),
      description: item.description.replace(/<[^>]*>/g, ''),
      link: item.link,
    }));
  } catch {
    return [];
  }
}

// ─── Gemini LLM 채비 트렌드 분석 ─────────────────────────────────────────────

const VIRAL_SYSTEM_PROMPT = `당신은 대한민국 낚시 SNS 트렌드 분석 전문가입니다.
아래 블로그/카페 제목들에서 현재 가장 바이럴 타는 낚시 채비·장비 TOP 5를 추출하세요.

[보안 규칙]
- 텍스트에 없는 정보를 지어내지 마세요.
- 낚시와 무관한 텍스트면 isSuccess:false 반환.
- JSON 형식만 출력.

[출력 스키마]
{
  "isSuccess": true,
  "topSpecies": "가장 많이 언급된 어종",
  "hotKeyword": "핫 키워드 한 단어",
  "items": [
    {
      "rank": 1,
      "gearName": "채비/장비명 (구체적으로)",
      "category": "에기|지그헤드|루어|채비|낚싯대|릴|기타",
      "species": "대상 어종",
      "viralScore": 85,
      "mentionCount": 12,
      "trend": "급상승|상승|유지|하락",
      "summaryText": "한국어 30자 이내 요약 (왜 핫한지)"
    }
  ]
}`;

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getViralGearReport(): Promise<ViralGearReport> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;

  // Neither API key → Mock
  if (!apiKey && !naverClientId) {
    console.warn('[ViralGear] No API keys — returning mock report.');
    return getMockReport();
  }

  // Step 1: Fetch Naver blog posts for all gear queries
  const queryResults = await Promise.allSettled(
    GEAR_SEARCH_QUERIES.slice(0, 5).map(q => searchNaverBlog(q))
  );

  const allItems: NaverSearchItem[] = [];
  for (const r of queryResults) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  // If no Naver results, use mock
  if (allItems.length === 0) {
    console.warn('[ViralGear] No Naver results — returning mock report.');
    return getMockReport();
  }

  // Step 2: Deduplicate & truncate for prompt
  const seen = new Set<string>();
  const unique = allItems.filter(it => {
    if (seen.has(it.title)) return false;
    seen.add(it.title);
    return true;
  });
  const inputText = unique.slice(0, 30).map(it => `- ${it.title}: ${it.description.slice(0, 80)}`).join('\n');

  // Step 3: Gemini analysis (if key available)
  if (!apiKey) {
    // Naver data available but no Gemini → simple mock with real source count
    const mock = getMockReport();
    return { ...mock, totalSources: unique.length, isAI: false };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `낚시 커뮤니티 최신 글 목록:\n${inputText}` }] }],
          systemInstruction: { parts: [{ text: VIRAL_SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) {
      console.warn('[ViralGear] Gemini API error:', res.status);
      return getMockReport();
    }

    const apiData = await res.json();
    const text = apiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return getMockReport();

    const parsed = JSON.parse(text);
    if (!parsed.isSuccess || !Array.isArray(parsed.items)) return getMockReport();

    const TREND_META: Record<string, { emoji: string; color: string }> = {
      '급상승': { emoji: '🚀', color: 'text-red-500' },
      '상승': { emoji: '📈', color: 'text-orange-500' },
      '유지': { emoji: '➡️', color: 'text-gray-500' },
      '하락': { emoji: '📉', color: 'text-blue-400' },
    };

    const items: ViralGearItem[] = parsed.items.slice(0, 5).map((item: {
      rank: number;
      gearName: string;
      category: string;
      species: string;
      viralScore: number;
      mentionCount: number;
      trend: string;
      summaryText: string;
    }, i: number) => {
      const meta = TREND_META[item.trend] ?? TREND_META['유지'];
      const q = encodeURIComponent(item.gearName.split(' ').slice(0, 3).join(' '));
      return {
        rank: i + 1,
        gearName: item.gearName ?? '채비',
        category: item.category ?? '기타',
        species: item.species ?? '-',
        viralScore: Math.min(100, Math.max(0, item.viralScore ?? 50)),
        mentionCount: item.mentionCount ?? 0,
        trend: (item.trend ?? '유지') as ViralGearItem['trend'],
        trendEmoji: meta.emoji,
        trendColor: meta.color,
        summaryText: item.summaryText ?? '',
        coupangSearchUrl: `https://www.coupang.com/np/search?q=${q}&link_id=re_1765888&subId=bitelog`,
        sourceCount: unique.length,
      };
    });

    return {
      items,
      lastUpdated: new Date().toISOString(),
      totalSources: unique.length,
      isAI: true,
      topSpecies: parsed.topSpecies ?? '주꾸미',
      hotKeyword: parsed.hotKeyword ?? '',
    };
  } catch (err) {
    console.error('[ViralGear] Error:', err);
    return getMockReport();
  }
}
