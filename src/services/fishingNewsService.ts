/**
 * Fishing News Service
 * Fetches real-time fishing catch reports from multiple sources:
 * - Naver Search API (blogs, news, cafes)
 * - YouTube Data API v3
 * - Community posts (internal feed)
 *
 * Sources include both official news and "찌라시" (informal community reports)
 * because fishing conditions change rapidly and real-time info is valuable.
 */

export interface FishingNewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  source: 'naver_blog' | 'naver_news' | 'naver_cafe' | 'youtube' | 'community';
  sourceLabel: string;
  thumbnail?: string;
  publishedAt: string;
  freshness: 'realtime' | 'today' | 'week'; // 🔴 실시간 / 🟡 오늘 / ⚪ 이번주
  reliability: 'official' | 'community' | 'sns'; // 공식 / 커뮤니티 / SNS
  region?: string;
  species?: string;
}

export type NewsRegionFilter = 'all' | 'east' | 'west' | 'south' | 'jeju';
export type NewsSourceFilter = 'all' | 'blog' | 'news' | 'youtube' | 'community';

const REGION_KEYWORDS: Record<string, string[]> = {
  east: ['동해', '속초', '강릉', '삼척', '울진', '포항', '울산', '부산 기장'],
  west: ['서해', '인천', '태안', '보령', '군산', '목포', '신안', '영광'],
  south: ['남해', '통영', '거제', '여수', '완도', '고흥', '사천', '남해군'],
  jeju: ['제주', '서귀포', '한림', '성산', '모슬포', '추자도'],
};

const SPECIES_KEYWORDS = [
  '감성돔', '볼락', '농어', '참돔', '돌돔', '벵에돔',
  '광어', '우럭', '쥐노래미', '고등어', '방어', '부시리',
  '갈치', '오징어', '문어', '주꾸미', '쭈꾸미',
];

// 낚시 관련 기본 썸네일 (Unsplash — 핫링킹 허용, 무료)
const FISHING_THUMBNAILS = [
  'https://images.unsplash.com/photo-1500463959177-e0869687df26?w=480&h=270&fit=crop', // 바다 낚시
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=480&h=270&fit=crop', // 물고기
  'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=480&h=270&fit=crop', // 보트
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=480&h=270&fit=crop', // 바다
  'https://images.unsplash.com/photo-1504472478235-9bc48ba4d60f?w=480&h=270&fit=crop', // 낚시대
];

/** thumbnail이 없는 뉴스 아이템에 기본 썸네일 할당 */
function assignDefaultThumbnail(item: FishingNewsItem, index: number): FishingNewsItem {
  if (item.thumbnail) return item;
  return { ...item, thumbnail: FISHING_THUMBNAILS[index % FISHING_THUMBNAILS.length] };
}

// Relevance keywords — articles must contain at least one to be considered fishing-related
const FISHING_RELEVANCE_KEYWORDS = [
  // 낚시 행위
  '낚시', '조과', '조황', '조행', '출조', '입질', '히트', '채비',
  '캐스팅', '루어', '찌낚', '원투', '바다낚시', '선상', '방파제',
  '갯바위', '포인트', '미끼', '에기', '지깅', '타이라바',
  // 어종 (SPECIES_KEYWORDS와 중복이지만 확실하게)
  ...SPECIES_KEYWORDS,
  // 낚시 관련 명사
  '릴', '대물', '마릿수', '쿨러', '씨알', '손맛', '올림',
  '물때', '수온', '조류', '만조', '간조',
  // 낚시터/선박
  '낚시배', '피싱', '유어선', '낚시터', '갈치배',
];

// Irrelevant/Shopping keywords to exclude from live catch news
const SHOPPING_KEYWORDS = [
  '할인', '구매', '특가', '쇼핑', '장비', '리뷰', '추천템', '최저가', '내돈내산',
  '품절', '공구', '마켓', '스토어', '판매', '이벤트', '당일발송', '무료배송',
  '사용후기', '실사용', '사용기', '체험단', '협찬', '광고', '에기', '다이와', '시마노', 'JS컴퍼니'
];

/**
 * Check if text is relevant to fishing (excludes shopping/gear reviews)
 * Returns true if at least one fishing keyword is found and NO shopping keyword is found
 */
function isFishingRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  
  // 먼저 쇼핑/홍보성 키워드가 포함되어 있으면 무조건 필터링 (장비 글 제외)
  const isShoppingOrSpam = SHOPPING_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  if (isShoppingOrSpam) return false;

  return FISHING_RELEVANCE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Calculate freshness based on publication time
 */
function calculateFreshness(publishedAt: string): 'realtime' | 'today' | 'week' {
  const now = Date.now();
  const pubTime = new Date(publishedAt).getTime();
  const diffHours = (now - pubTime) / (1000 * 60 * 60);

  if (diffHours <= 1) return 'realtime';
  if (diffHours <= 24) return 'today';
  return 'week';
}

/**
 * Detect region from text
 */
function detectRegion(text: string): string | undefined {
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return region;
    }
  }
  return undefined;
}

/**
 * Detect fish species from text
 */
function detectSpecies(text: string): string | undefined {
  return SPECIES_KEYWORDS.find(sp => text.includes(sp));
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

/**
 * Fetch fishing news from Naver Search API
 * Direct client-side call (static export compatible)
 */
export async function fetchNaverNews(
  query: string = '낚시 조과',
  display: number = 10,
  sort: string = 'date'
): Promise<FishingNewsItem[]> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.warn('Naver API keys not set, using mock data');
    return getMockNews();
  }

  try {
    // Use CORS proxy for Naver API (doesn't support CORS headers)
    const blogUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const newsUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const headers = {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    };

    const [blogRes, newsRes] = await Promise.allSettled([
      fetch(`https://corsproxy.io/?${encodeURIComponent(blogUrl)}`, { headers, cache: 'no-store' }),
      fetch(`https://corsproxy.io/?${encodeURIComponent(newsUrl)}`, { headers, cache: 'no-store' }),
    ]);

    const items: FishingNewsItem[] = [];
    const blogData = blogRes.status === 'fulfilled' && blogRes.value.ok ? await blogRes.value.json() : null;
    const newsData = newsRes.status === 'fulfilled' && newsRes.value.ok ? await newsRes.value.json() : null;

    // Process blog results
    if (blogData?.items) {
      for (const item of blogData.items) {
        const title = stripHtml(item.title);
        const desc = stripHtml(item.description);
        const combined = title + ' ' + desc;
        items.push({
          id: `blog_${item.link}`,
          title,
          description: desc.slice(0, 120) + (desc.length > 120 ? '...' : ''),
          link: item.link,
          source: 'naver_blog',
          sourceLabel: '블로그',
          publishedAt: item.postdate
            ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
            : new Date().toISOString(),
          freshness: calculateFreshness(
            item.postdate
              ? `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
              : new Date().toISOString()
          ),
          reliability: 'community',
          region: detectRegion(combined),
          species: detectSpecies(combined),
        });
      }
    }

    // Process news results
    if (newsData?.items) {
      for (const item of newsData.items) {
        const title = stripHtml(item.title);
        const desc = stripHtml(item.description);
        const combined = title + ' ' + desc;
        items.push({
          id: `news_${item.link}`,
          title,
          description: desc.slice(0, 120) + (desc.length > 120 ? '...' : ''),
          link: item.originallink || item.link,
          source: 'naver_news',
          sourceLabel: '뉴스',
          publishedAt: item.pubDate || new Date().toISOString(),
          freshness: calculateFreshness(item.pubDate || new Date().toISOString()),
          reliability: 'official',
          region: detectRegion(combined),
          species: detectSpecies(combined),
        });
      }
    }

    // Filter out irrelevant articles (e.g. Jeju travel essays)
    const relevant = items.filter(it => isFishingRelevant(it.title + ' ' + it.description));
    relevant.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return relevant.length > 0 ? relevant : getMockNews();
  } catch (err) {
    console.error('Naver news fetch failed:', err);
    return getMockNews();
  }
}

/**
 * Fetch cafe articles from Naver Search API (cafearticle endpoint)
 * Searches ALL Naver cafes (BDJ, 인낚, 피쉬앤피쉬, etc.)
 * Returns titles + snippets + cafe names + URLs
 */
export async function fetchNaverCafeArticles(
  query: string = '낚시 조과',
  display: number = 10,
  sort: string = 'date'
): Promise<FishingNewsItem[]> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    console.warn('Naver API keys not set for cafe search');
    return [];
  }

  try {
    const cafeUrl = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const headers = {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    };

    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(cafeUrl)}`, { headers, cache: 'no-store' });
    if (!res.ok) {
      console.warn('Naver cafe API returned:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data?.items) return [];

    return data.items.map((item: {
      title: string;
      link: string;
      description: string;
      cafename: string;
      cafeurl: string;
    }) => {
      const title = stripHtml(item.title);
      const desc = stripHtml(item.description);
      const combined = title + ' ' + desc;

      return {
        id: `cafe_${item.link}`,
        title,
        description: desc.slice(0, 150) + (desc.length > 150 ? '...' : ''),
        link: item.link,
        source: 'naver_cafe' as const,
        sourceLabel: item.cafename || '카페',
        publishedAt: new Date().toISOString(), // cafe API doesn't return date
        freshness: 'today' as const,
        reliability: 'community' as const,
        region: detectRegion(combined),
        species: detectSpecies(combined),
      };
    });
  } catch (err) {
    console.error('Naver cafe search failed:', err);
    return [];
  }
}

/**
 * Fetch community insights for a specific species + region
 * Combines cafe articles with relevant search queries
 * Used by Pre-Trip Briefing system
 */
export async function fetchCommunityInsights(
  species: string,
  region?: string,
): Promise<{ articles: FishingNewsItem[]; summary: string }> {
  const queries = [
    `${species} ${region || ''} 조황`.trim(),
    `${species} 채비 추천`,
    `${species} ${region || ''} 조행기`.trim(),
  ];

  const allArticles: FishingNewsItem[] = [];

  // Fetch cafe articles for each query (parallel)
  const results = await Promise.allSettled(
    queries.map(q => fetchNaverCafeArticles(q, 5, 'sim'))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = allArticles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  // Sort by freshness
  unique.sort((a, b) => {
    const order = { realtime: 0, today: 1, week: 2 };
    return order[a.freshness] - order[b.freshness];
  });

  const top = unique.slice(0, 10);

  // Generate a quick summary from titles
  const summary = top.length > 0
    ? top.slice(0, 5).map(a => `[${a.sourceLabel}] ${a.title}`).join('\n')
    : `${species} 관련 최근 카페 글이 없습니다.`;

  return { articles: top, summary };
}

/**
 * Fetch fishing videos from YouTube
 * Direct client-side call (static export compatible)
 */
export async function fetchYouTubeVideos(
  query: string = '냚시 조과',
  maxResults: number = 6
): Promise<FishingNewsItem[]> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';

  if (!apiKey) {
    console.warn('YouTube API key not set, using mock data');
    return getMockYouTube();
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=date&relevanceLanguage=ko&key=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      // Graceful fallback — don't pollute console with errors
      console.warn(`YouTube API returned ${res.status}, using mock data`);
      return getMockYouTube();
    }

    const data = await res.json();

    const items = (data.items || []).map((item: {
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }) => {
      const title = item.snippet.title;
      const desc = item.snippet.description;
      const combined = title + ' ' + desc;

      return {
        id: `yt_${item.id.videoId}`,
        title,
        description: desc.slice(0, 120) + (desc.length > 120 ? '...' : ''),
        link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        source: 'youtube' as const,
        sourceLabel: 'YouTube',
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        freshness: calculateFreshness(item.snippet.publishedAt),
        reliability: 'sns' as const,
        region: detectRegion(combined),
        species: detectSpecies(combined),
      };
    });

    return items.length > 0 ? items : getMockYouTube();
  } catch (err) {
    console.warn('YouTube fetch failed, using mock data:', err instanceof Error ? err.message : err);
    return getMockYouTube();
  }
}

/**
 * Fetch all fishing news from all sources
 */
export async function fetchAllFishingNews(
  regionFilter: NewsRegionFilter = 'all',
  sourceFilter: NewsSourceFilter = 'all'
): Promise<FishingNewsItem[]> {
  const regionQuery = regionFilter !== 'all'
    ? REGION_KEYWORDS[regionFilter]?.[0] || ''
    : '';
  // "조행기"를 필수로 포함유도하여 장비 광고성 글을 배제
  const searchQuery = `낚시 조행기 ${regionQuery}`.trim();

  const promises: Promise<FishingNewsItem[]>[] = [];

  if (sourceFilter === 'all' || sourceFilter === 'blog' || sourceFilter === 'news') {
    promises.push(fetchNaverNews(searchQuery, 15));
  }
  if (sourceFilter === 'all' || sourceFilter === 'youtube') {
    promises.push(fetchYouTubeVideos(searchQuery, 8));
  }

  const results = await Promise.allSettled(promises);
  let allItems: FishingNewsItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems = allItems.concat(result.value);
    }
  }

  // Filter by region if specified
  if (regionFilter !== 'all') {
    allItems = allItems.filter(item =>
      !item.region || item.region === regionFilter
    );
  }

  // Filter by source if specified
  if (sourceFilter === 'blog') {
    allItems = allItems.filter(item => item.source === 'naver_blog');
  } else if (sourceFilter === 'news') {
    allItems = allItems.filter(item => item.source === 'naver_news');
  } else if (sourceFilter === 'youtube') {
    allItems = allItems.filter(item => item.source === 'youtube');
  }

  // Sort by date (newest first)
  allItems.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  // Assign default thumbnails for items without one
  allItems = allItems.map((item, i) => assignDefaultThumbnail(item, i));

  return allItems;
}

/**
 * Get top 3 news items for the home screen
 */
export async function fetchTopNews(): Promise<FishingNewsItem[]> {
  const all = await fetchAllFishingNews('all', 'all');
  return all.slice(0, 3);
}

// ========== Mock Data (fallback) ==========

function getMockNews(): FishingNewsItem[] {
  const now = new Date();
  return [
    {
      id: 'mock_1',
      title: '통영 감성돔 대물 시즌 활짝! 40cm급 연발',
      description: '통영 욕지도 일대에서 감성돔 40cm급이 연일 올라오고 있습니다. 물때와 수온이 딱 맞아떨어지면서...',
      link: 'https://search.naver.com/search.naver?query=%ED%86%B5%EC%98%81+%EA%B0%90%EC%84%B1%EB%8F%94+%EC%A1%B0%ED%99%A9',
      source: 'naver_blog',
      sourceLabel: '블로그',
      thumbnail: 'https://i.ytimg.com/vi/cQQHK36-xbQ/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      freshness: 'today',
      reliability: 'community',
      region: 'south',
      species: '감성돔',
    },
    {
      id: 'mock_2',
      title: '서해 태안 볼락 야간 루어 폭발 조과',
      description: '태안 만리포 방파제에서 볼락 20cm급이 연이어 히트! 지그헤드 1.5g + 웜 조합이 특효...',
      link: 'https://search.naver.com/search.naver?query=%ED%83%9C%EC%95%88+%EB%B3%BC%EB%9D%BD+%EC%A1%B0%ED%99%A9',
      source: 'naver_cafe',
      sourceLabel: '카페',
      thumbnail: 'https://i.ytimg.com/vi/-l0PNR6gxgo/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      freshness: 'realtime',
      reliability: 'community',
      region: 'west',
      species: '볼락',
    },
    {
      id: 'mock_3',
      title: '[속보] 제주 방어 시즌 개막! 80cm급 방어 입질 시작',
      description: '제주 모슬포 앞바다에서 올해 첫 방어 시즌이 개막했습니다. 지깅으로 80cm급이...',
      link: 'https://search.naver.com/search.naver?query=%EC%A0%9C%EC%A3%BC+%EB%B0%A9%EC%96%B4+%EB%82%9A%EC%8B%9C',
      source: 'naver_news',
      sourceLabel: '뉴스',
      thumbnail: 'https://i.ytimg.com/vi/8fGqRUDGxyQ/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      freshness: 'today',
      reliability: 'official',
      region: 'jeju',
      species: '방어',
    },
    {
      id: 'mock_4',
      title: '동해 속초 오징어 한 박스 조과! 에기 사이즈별 정리',
      description: '속초항 방파제에서 밤 8시부터 새벽 2시까지 한 박스 가득 채웠습니다. 2.5호 에기가...',
      link: 'https://search.naver.com/search.naver?query=%EC%86%8D%EC%B4%88+%EC%98%A4%EC%A7%95%EC%96%B4+%EC%A1%B0%ED%99%A9',
      source: 'naver_blog',
      sourceLabel: '블로그',
      thumbnail: 'https://i.ytimg.com/vi/bgOQo6eZ08A/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      freshness: 'today',
      reliability: 'community',
      region: 'east',
      species: '오징어',
    },
    {
      id: 'mock_5',
      title: '남해 여수 광어 플랫피싱 시즌 돌입',
      description: '여수 일대 연안에서 광어 40~50cm급이 잡히기 시작했습니다. 다운샷 리그 추천...',
      link: 'https://search.naver.com/search.naver?query=%EC%97%AC%EC%88%98+%EA%B4%91%EC%96%B4+%EB%82%9A%EC%8B%9C',
      source: 'naver_blog',
      sourceLabel: '블로그',
      thumbnail: 'https://i.ytimg.com/vi/eC-0QlY-bdw/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      freshness: 'week',
      reliability: 'community',
      region: 'south',
      species: '광어',
    },
  ];
}

function getMockYouTube(): FishingNewsItem[] {
  const now = new Date();
  return [
    {
      id: 'yt_mock_1',
      title: '🐟 통영 선상낚시 감성돔 대물 연발! | 원투낚시 가이드',
      description: '통영 욕지도에서 감성돔 40cm급을 연달아 잡았습니다! 채비법과 포인트 완벽 가이드...',
      link: 'https://www.youtube.com/watch?v=cQQHK36-xbQ',
      source: 'youtube',
      sourceLabel: 'YouTube',
      thumbnail: 'https://i.ytimg.com/vi/cQQHK36-xbQ/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      freshness: 'today',
      reliability: 'sns',
      region: 'south',
      species: '감성돔',
    },
    {
      id: 'yt_mock_2',
      title: '🎣 볼락 루어 마릿수 폭발! 태안 밤낚시 브이로그',
      description: '볼락 야간 루어 낚시 꿀팁 대공개! 지그헤드 선택법부터 액션까지...',
      link: 'https://www.youtube.com/watch?v=-l0PNR6gxgo',
      source: 'youtube',
      sourceLabel: 'YouTube',
      thumbnail: 'https://i.ytimg.com/vi/-l0PNR6gxgo/hqdefault.jpg',
      publishedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      freshness: 'today',
      reliability: 'sns',
      region: 'west',
      species: '볼락',
    },
  ];
}
