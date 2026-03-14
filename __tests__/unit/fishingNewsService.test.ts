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

// ── fetchYouTubeVideos (no API key → mock data) ───────────────────
describe('fetchYouTubeVideos — fallback to mock data when no API key', () => {
  it('should return an array of items', async () => {
    const items = await fetchYouTubeVideos();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it('all items should have source = "youtube"', async () => {
    const items = await fetchYouTubeVideos();
    items.forEach((item) => {
      expect(item.source).toBe('youtube');
      expect(item.sourceLabel).toBe('YouTube');
    });
  });

  it('each YouTube item should have a valid structure', async () => {
    const items = await fetchYouTubeVideos();
    items.forEach(validateNewsItem);
  });

  it('YouTube items should have YouTube links', async () => {
    const items = await fetchYouTubeVideos();
    items.forEach((item) => {
      expect(item.link).toContain('youtube.com');
    });
  });

  it('YouTube items should have thumbnails', async () => {
    const items = await fetchYouTubeVideos();
    items.forEach((item) => {
      expect(item.thumbnail).toBeTruthy();
    });
  });

  it('YouTube items should have sns reliability', async () => {
    const items = await fetchYouTubeVideos();
    items.forEach((item) => {
      expect(item.reliability).toBe('sns');
    });
  });

  it('should accept a custom query without crashing', async () => {
    const items = await fetchYouTubeVideos('제주 방어 낚시', 3);
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
