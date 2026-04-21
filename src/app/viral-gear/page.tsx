"use client";

// @mock-data — viralGearService falls back to getMockReport() when API keys are absent

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getViralGearReport,
  type ViralGearItem,
  type ViralGearReport,
} from "@/services/viralGearService";
import { useAppStore } from "@/store/appStore";
import BottomNav from "@/components/BottomNav";
import {
  ShoppingCart,
  TrendingUp,
  Minus,
  TrendingDown,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

const LABELS = {
  ko: {
    title: "바이럴 채비 랭킹",
    subtitle: "지금 낚시 커뮤니티에서 가장 핫한 채비",
    refresh: "새로고침",
    loading: "분석 중...",
    aiTag: "AI 분석",
    mockTag: "데모",
    totalSources: "개 게시물 분석",
    topSpecies: "이번 주 핫 어종",
    hotKeyword: "핫 키워드",
    mentionCount: "건 언급",
    buy: "쿠팡에서 보기",
    disclaimer:
      "쿠팡 파트너스 활동의 일환으로, 구매 시 수수료를 받을 수 있습니다.",
    updatedAt: "기준",
    noData: "데이터를 불러오는 중입니다...",
  },
  en: {
    title: "Viral Gear Ranking",
    subtitle: "What's trending in fishing communities right now",
    refresh: "Refresh",
    loading: "Analyzing...",
    aiTag: "AI Analysis",
    mockTag: "Demo",
    totalSources: " posts analyzed",
    topSpecies: "Hot Species This Week",
    hotKeyword: "Hot Keyword",
    mentionCount: " mentions",
    buy: "View on Coupang",
    disclaimer: "This is a Coupang Partners affiliate link.",
    updatedAt: "as of",
    noData: "Loading data...",
  },
};

function TrendIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "trending-up-fast")
    return <TrendingUp size={14} className={className} strokeWidth={2.5} />;
  if (icon === "trending-up")
    return <TrendingUp size={14} className={className} />;
  if (icon === "trending-down")
    return <TrendingDown size={14} className={className} />;
  return <Minus size={14} className={className} />;
}

function TrendBar({ score }: { score: number }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-700"
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function GearCard({ item, locale }: { item: ViralGearItem; locale: string }) {
  const L = LABELS[locale as "ko" | "en"] ?? LABELS.ko;
  const rankColors = [
    "bg-amber-400",
    "bg-gray-300",
    "bg-amber-600",
    "bg-white/20",
    "bg-white/20",
  ];
  const rankColor = rankColors[item.rank - 1] ?? "bg-white/10";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      {/* Rank + Name */}
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full ${rankColor} flex items-center justify-center text-xs font-black text-white`}
        >
          {item.rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate">
              {item.gearName}
            </h3>
            <span
              className={`text-xs font-bold ${item.trendColor} flex items-center gap-0.5 flex-shrink-0`}
            >
              <TrendIcon icon={item.trendIcon} />
              {item.trend}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
              {item.category}
            </span>
            <span className="text-xs text-[#c9a84c] font-medium">
              {item.species}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black text-[#c9a84c]">{item.viralScore}</p>
          <p className="text-[10px] text-white/40">바이럴 점수</p>
        </div>
      </div>

      {/* Trend Bar */}
      <TrendBar score={item.viralScore} />

      {/* Summary */}
      <p className="text-xs text-white/60 leading-relaxed">
        {item.summaryText}
      </p>

      {/* Mention count + CTA */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          {item.mentionCount}
          {L.mentionCount}
        </span>
        <a
          href={item.coupangSearchUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center gap-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-[#c9a84c]/20 transition-colors"
        >
          <ShoppingCart size={14} />
          {L.buy}
        </a>
      </div>
    </div>
  );
}

export default function ViralGearPage() {
  const locale = useAppStore((s) => s.locale);
  const L = LABELS[locale] ?? LABELS.ko;

  const [report, setReport] = useState<ViralGearReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [fetchError, setFetchError] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const result = await getViralGearReport();
      setReport(result);
      setLastFetch(Date.now());
    } catch (err) {
      console.error("[viral-gear]", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const canRefresh = Date.now() - lastFetch > 60_000; // 1분 쿨다운

  return (
    <div className="min-h-dvh min-h-screen bg-[#080d14] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d14]/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/70" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">{L.title}</h1>
            <p className="text-xs text-white/50">{L.subtitle}</p>
          </div>
          <button
            id="viral-refresh-btn"
            onClick={fetchReport}
            disabled={loading || !canRefresh}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#c9a84c] bg-[#c9a84c]/10 px-3 py-1.5 rounded-xl disabled:opacity-40 hover:bg-[#c9a84c]/20 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? L.loading : L.refresh}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Error state */}
        {fetchError && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center text-sm text-red-400">
            데이터를 불러올 수 없습니다. 새로고침해 주세요.
          </div>
        )}

        {/* Summary Strip */}
        {report && !loading && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              {report.isAI ? (
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {L.aiTag}
                </span>
              ) : (
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {L.mockTag}
                </span>
              )}
              <span className="text-xs text-white/70">
                {report.totalSources}
                {L.totalSources}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/70">{L.topSpecies}</p>
                <p className="text-base font-bold">{report.topSpecies}</p>
              </div>
              {report.hotKeyword && (
                <div>
                  <p className="text-[10px] text-white/70">{L.hotKeyword}</p>
                  <p className="text-base font-bold">{report.hotKeyword}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse space-y-3"
              >
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full" />
                <div className="h-8 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Gear Cards */}
        {!loading && report && (
          <div className="space-y-3">
            {report.items.map((item) => (
              <GearCard key={item.rank} item={item} locale={locale} />
            ))}
          </div>
        )}

        {/* Affiliate Disclaimer */}
        {!loading && report && (
          <p className="text-[10px] text-white/30 text-center px-4 leading-relaxed">
            {L.disclaimer}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
