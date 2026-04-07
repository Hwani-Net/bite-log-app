"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  fetchAllFishingNews,
  FishingNewsItem,
  NewsRegionFilter,
  NewsSourceFilter,
} from "@/services/fishingNewsService";

const REGION_TABS: { key: NewsRegionFilter; label: string; emoji: string }[] = [
  { key: "all", label: "전체", emoji: "🌊" },
  { key: "east", label: "동해", emoji: "🏔️" },
  { key: "west", label: "서해", emoji: "🌅" },
  { key: "south", label: "남해", emoji: "🌴" },
  { key: "jeju", label: "제주", emoji: "🍊" },
];

const SOURCE_TABS: { key: NewsSourceFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "blog", label: "블로그" },
  { key: "news", label: "뉴스" },
  { key: "youtube", label: "YouTube" },
];

function FreshnessBadge({ freshness }: { freshness: string }) {
  const config = {
    realtime: {
      bg: "bg-red-500",
      text: "text-white",
      label: "실시간",
      dot: "🔴",
    },
    today: {
      bg: "bg-[#c9a84c]",
      text: "text-[#080d14]",
      label: "오늘",
      dot: "🟡",
    },
    week: {
      bg: "bg-white/10",
      text: "text-white/60",
      label: "이번주",
      dot: "⚪",
    },
  }[freshness] || {
    bg: "bg-white/10",
    text: "text-white/60",
    label: "기타",
    dot: "⚪",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}
    >
      {config.dot} {config.label}
    </span>
  );
}

function ReliabilityBadge({ reliability }: { reliability: string }) {
  const config = {
    official: { color: "text-[#7dd3fc]", label: "공식" },
    community: { color: "text-green-400", label: "커뮤니티" },
    sns: { color: "text-purple-400", label: "SNS" },
  }[reliability] || { color: "text-white/60", label: "기타" };

  return (
    <span className={`text-[10px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function SourceIcon({ source }: { source: string }) {
  const icons: Record<string, string> = {
    naver_blog: "📝",
    naver_news: "📰",
    naver_cafe: "☕",
    youtube: "▶️",
    community: "👥",
  };
  return <span className="text-sm">{icons[source] || "📄"}</span>;
}

function NewsCard({ item }: { item: FishingNewsItem }) {
  const timeAgo = getTimeAgo(item.publishedAt);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 block hover:scale-[1.01] hover:border-white/20 transition-all duration-200"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="flex gap-3">
        {/* Thumbnail for YouTube */}
        {item.thumbnail && (
          <div className="flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden bg-white/5">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            {item.source === "youtube" && (
              <div className="relative -mt-14 ml-10">
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                  ▶
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header: source + freshness */}
          <div className="flex items-center gap-2 mb-1.5">
            <SourceIcon source={item.source} />
            <span className="text-[11px] font-medium text-white/50">
              {item.sourceLabel}
            </span>
            <FreshnessBadge freshness={item.freshness} />
            <ReliabilityBadge reliability={item.reliability} />
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Footer: tags + time */}
          <div className="flex items-center gap-2 mt-2">
            {item.region && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] font-medium">
                {REGION_TABS.find((r) => r.key === item.region)?.label ||
                  item.region}
              </span>
            )}
            {item.species && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] font-medium">
                🐟 {item.species}
              </span>
            )}
            <span className="text-[10px] text-white/30 ml-auto">{timeAgo}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function NewsPage() {
  const [news, setNews] = useState<FishingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<NewsRegionFilter>("all");
  const [source, setSource] = useState<NewsSourceFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAllFishingNews(region, source);
      setNews(items);
    } catch (err) {
      console.error("Failed to load news:", err);
      setError("뉴스를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [region, source]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <div className="min-h-screen bg-[#080d14] page-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              실시간 조과 소식
            </h1>
            <button
              onClick={loadNews}
              className="text-xs px-3 py-1.5 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] font-medium hover:bg-[#c9a84c]/25 transition-colors"
            >
              새로고침
            </button>
          </div>

          {/* Region filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRegion(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  region === tab.key
                    ? "bg-[#c9a84c] text-[#080d14] shadow-md shadow-[#c9a84c]/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Source filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSource(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  source === tab.key
                    ? "bg-[#7dd3fc]/20 text-[#7dd3fc] border border-[#7dd3fc]/30"
                    : "bg-white/5 text-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-28 h-20 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😢</p>
            <p className="text-white/50">{error}</p>
            <button
              onClick={loadNews}
              className="mt-4 px-4 py-2 rounded-xl bg-[#c9a84c] text-[#080d14] text-sm font-medium"
            >
              다시 시도
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎣</p>
            <p className="text-white/50">해당 조건의 뉴스가 없습니다</p>
          </div>
        ) : (
          <>
            {/* Realtime section */}
            {news.filter((n) => n.freshness === "realtime").length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  실시간 — 1시간 이내
                </h2>
                <div className="space-y-3">
                  {news
                    .filter((n) => n.freshness === "realtime")
                    .map((item) => (
                      <NewsCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )}

            {/* Today section */}
            {news.filter((n) => n.freshness === "today").length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-bold text-[#c9a84c] mb-2">
                  🟡 오늘의 조과
                </h2>
                <div className="space-y-3">
                  {news
                    .filter((n) => n.freshness === "today")
                    .map((item) => (
                      <NewsCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )}

            {/* This week section */}
            {news.filter((n) => n.freshness === "week").length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-bold text-white/30 mb-2">
                  ⚪ 이번주
                </h2>
                <div className="space-y-3">
                  {news
                    .filter((n) => n.freshness === "week")
                    .map((item) => (
                      <NewsCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
