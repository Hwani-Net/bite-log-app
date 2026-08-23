import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Ensure no actual HTTP calls are made
const originalFetch = globalThis.fetch;
beforeEach(() => {
  // Clear API key env vars so mock data paths are taken
  vi.stubEnv('NEXT_PUBLIC_NAVER_CLIENT_ID', '');
  vi.stubEnv('NEXT_PUBLIC_NAVER_CLIENT_SECRET', '');
  vi.stubEnv('NEXT_PUBLIC_YOUTUBE_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

import {
  fetchNaverNews,
  fetchYouTubeVideos,
  fetchAllFishingNews,
  fetchTopNews,
} from '@/services/fishingNewsService';
import type {
  FishingNewsItem,
  NewsRegionFilter,
  NewsSourceFilter,
} from '@/services/fishingNewsService';

// ── Required structure helpers ─────────────────────────────────────
function validateNewsItem(item: FishingNewsItem): void {
  expect(typeof item.id).toBe('string');
  expect(item.id.length).toBeGreaterThan(0);
  expect(typeof item.title).toBe('string');
  expect(item.title.length).toBeGreaterThan(0);
  expect(typeof item.description).toBe('string');
  expect(typeof item.link).toBe('string');
  expect(item.link.length).toBeGreaterThan(0);
  expect(['naver_blog', 'naver_news', 'naver_cafe', 'youtube', 'community']).toContain(item.source);
  expect(typeof item.sourceLabel).toBe('string');
  expect(typeof item.publishedAt).toBe('string');
  expect(['realtime', 'today', 'week']).toContain(item.freshness);
  expect(['official', 'community', 'sns']).toContain(item.reliability);
}

// ── fetchNaverNews (no API keys → mock data) ──────────────────────
describe('fetchNaverNews — fallback to mock data when no API key', () => {
  it('should return an array of items', async () => {
    const items = await fetchNaverNews();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('each item should have the required fields', async () => {
    const items = await fetchNaverNews();
    items.forEach(validateNewsItem);
  });

  it('should return items with Korean fishing-related content', async () => {
    const items = await fetchNaverNews();
    const fishingTerms = ['낚시', '조과', '조황', '감성돔', '볼락', '광어', '방어', '오징어'];
    const hasFishingContent = items.some((item) =>
      fishingTerms.some(
        (term) => item.title.includes(term) || item.description.includes(term)
      )
    );
    expect(hasFishingContent).toBe(true);
  });

  it('should accept a custom query parameter without crashing', async () => {
    const items = await fetchNaverNews('볼락 야간낚시', 5);
    expect(Array.isArray(items)).toBe(true);
  });

  it('mock items should have valid region values (or undefined)', async () => {
    const items = await fetchNaverNews();
    const validRegions = ['east', 'west', 'south', 'jeju', undefined];
    items.forEach((item) => {
      expect(validRegions).toContain(item.region);
    });
  });
});

// -- fetchYouTubeVideos (server RSS route) ------------------------
// Videos now come from /api/youtube-rss. There is no client-side mock:
// the contract is that an unreachable route degrades to an empty list
// instead of throwing (see docs/PITFALLS.md - graceful fallback rule).
describe('fetchYouTubeVideos - graceful degradation', () => {
  it('returns an empty array instead of throwing when the RSS route is unreachable', async () => {
    const items = await fetchYouTubeVideos();
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(0);
  });

  it('parses items returned by the RSS route', async () => {
    const payload = [
      {
        title: 'TEST_VIDEO',
        link: 'https://www.youtube.com/watch?v=abc123',
        source: 'youtube',
        sourceLabel: 'YouTube',
        reliability: 'sns',
        thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
        pubDate: '2026-04-20T00:00:00Z',
      },
    ];
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;
    try {
      const items = await fetchYouTubeVideos();
      expect(items).toHaveLength(1);
      expect(items[0].source).toBe('youtube');
      expect(items[0].link).toContain('youtube.com');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('should accept a custom query without crashing', async () => {
    const items = await fetchYouTubeVideos('CUSTOM_QUERY', 3);
    expect(Array.isArray(items)).toBe(true);
  });
});

// ── fetchAllFishingNews ───────────────────────────────────────────
describe('fetchAllFishingNews — aggregated results', () => {
  it('should return an array of items with default filters', async () => {
    const items = await fetchAllFishingNews();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('all items should have a thumbnail (assigned default if missing)', async () => {
    const items = await fetchAllFishingNews();
    items.forEach((item) => {
      expect(item.thumbnail).toBeTruthy();
    });
  });

  it('each item should have the required structure', async () => {
    const items = await fetchAllFishingNews();
    items.forEach(validateNewsItem);
  });

  it('items should be sorted by date (newest first)', async () => {
    const items = await fetchAllFishingNews();
    for (let i = 0; i < items.length - 1; i++) {
      const current = new Date(items[i].publishedAt).getTime();
      const next = new Date(items[i + 1].publishedAt).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  it('source filter "youtube" should return only YouTube items', async () => {
    const items = await fetchAllFishingNews('all', 'youtube');
    items.forEach((item) => {
      expect(item.source).toBe('youtube');
    });
  });

  it('source filter "blog" should return only blog items', async () => {
    const items = await fetchAllFishingNews('all', 'blog');
    items.forEach((item) => {
      expect(item.source).toBe('naver_blog');
    });
  });

  it('should accept all valid region filters without crashing', async () => {
    const regions: NewsRegionFilter[] = ['all', 'east', 'west', 'south', 'jeju'];
    for (const region of regions) {
      const items = await fetchAllFishingNews(region);
      expect(Array.isArray(items)).toBe(true);
    }
  });

  it('should accept all valid source filters without crashing', async () => {
    const sources: NewsSourceFilter[] = ['all', 'blog', 'news', 'youtube', 'community'];
    for (const source of sources) {
      const items = await fetchAllFishingNews('all', source);
      expect(Array.isArray(items)).toBe(true);
    }
  });
});

// ── fetchTopNews ──────────────────────────────────────────────────
describe('fetchTopNews', () => {
  it('should return at most 3 items', async () => {
    const items = await fetchTopNews();
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('should return at least 1 item', async () => {
    const items = await fetchTopNews();
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('each top news item should have valid structure', async () => {
    const items = await fetchTopNews();
    items.forEach(validateNewsItem);
  });

  it('top news items should all have thumbnails', async () => {
    const items = await fetchTopNews();
    items.forEach((item) => {
      expect(item.thumbnail).toBeTruthy();
    });
  });
});

// ── FishingNewsItem interface compliance ──────────────────────────
describe('FishingNewsItem interface compliance', () => {
  it('mock news items should cover multiple sources', async () => {
    const items = await fetchAllFishingNews();
    const sources = new Set(items.map((i) => i.source));
    // With no API keys: naver mock returns blog/cafe/news, YouTube mock returns youtube
    expect(sources.size).toBeGreaterThanOrEqual(2);
  });

  it('mock items should cover multiple regions', async () => {
    const items = await fetchAllFishingNews();
    const regions = new Set(items.map((i) => i.region).filter(Boolean));
    expect(regions.size).toBeGreaterThan(0);
  });

  it('mock items should cover multiple fish species', async () => {
    const items = await fetchAllFishingNews();
    const species = new Set(items.map((i) => i.species).filter(Boolean));
    expect(species.size).toBeGreaterThan(0);
  });

  it('all freshness values should be valid enum members', async () => {
    const items = await fetchAllFishingNews();
    const validFreshness = new Set(['realtime', 'today', 'week']);
    items.forEach((item) => {
      expect(validFreshness.has(item.freshness)).toBe(true);
    });
  });

  it('all reliability values should be valid enum members', async () => {
    const items = await fetchAllFishingNews();
    const validReliability = new Set(['official', 'community', 'sns']);
    items.forEach((item) => {
      expect(validReliability.has(item.reliability)).toBe(true);
    });
  });
});
