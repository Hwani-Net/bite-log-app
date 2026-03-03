'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getViralGearReport, type ViralGearItem, type ViralGearReport } from '@/services/viralGearService';
import { useAppStore } from '@/store/appStore';
import BottomNav from '@/components/BottomNav';

const LABELS = {
  ko: {
    title: '바이럴 채비 랭킹',
    subtitle: '지금 낚시 커뮤니티에서 가장 핫한 채비',
    refresh: '새로고침',
    loading: '분석 중...',
    aiTag: 'AI 분석',
    mockTag: '데모',
    totalSources: '개 게시물 분석',
    topSpecies: '이번 주 핫 어종',
    hotKeyword: '핫 키워드',
    mentionCount: '건 언급',
    buy: '쿠팡에서 보기',
    disclaimer: '쿠팡 파트너스 활동의 일환으로, 구매 시 수수료를 받을 수 있습니다.',
    updatedAt: '기준',
    noData: '데이터를 불러오는 중입니다...',
  },
  en: {
    title: 'Viral Gear Ranking',
    subtitle: "What's trending in fishing communities right now",
    refresh: 'Refresh',
    loading: 'Analyzing...',
    aiTag: 'AI Analysis',
    mockTag: 'Demo',
    totalSources: ' posts analyzed',
    topSpecies: 'Hot Species This Week',
    hotKeyword: 'Hot Keyword',
    mentionCount: ' mentions',
    buy: 'View on Coupang',
    disclaimer: 'This is a Coupang Partners affiliate link.',
    updatedAt: 'as of',
    noData: 'Loading data...',
  },
};

function TrendBar({ score }: { score: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div
        className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-700"
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function GearCard({ item, locale }: { item: ViralGearItem; locale: string }) {
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;
  const rankColors = ['bg-amber-400', 'bg-gray-300', 'bg-amber-600', 'bg-gray-200', 'bg-gray-200'];
  const rankColor = rankColors[item.rank - 1] ?? 'bg-gray-100';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Rank + Name */}
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full ${rankColor} flex items-center justify-center text-xs font-black text-white`}>
          {item.rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 truncate">{item.gearName}</h3>
            <span className={`text-xs font-bold ${item.trendColor} flex-shrink-0`}>
              {item.trendEmoji} {item.trend}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
            <span className="text-xs text-sky-600 font-medium">🎣 {item.species}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black text-sky-600">{item.viralScore}</p>
          <p className="text-[10px] text-gray-400">바이럴 점수</p>
        </div>
      </div>

      {/* Trend Bar */}
      <TrendBar score={item.viralScore} />

      {/* Summary */}
      <p className="text-xs text-gray-600 leading-relaxed">{item.summaryText}</p>

      {/* Mention count + CTA */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {item.mentionCount}{L.mentionCount}
        </span>
        <a
          href={item.coupangSearchUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
        >
          <span>🛒</span>
          {L.buy}
        </a>
      </div>
    </div>
  );
}

export default function ViralGearPage() {
  const locale = useAppStore(s => s.locale);
  const L = LABELS[locale] ?? LABELS.ko;

  const [report, setReport] = useState<ViralGearReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const result = await getViralGearReport();
      setReport(result);
      setLastFetch(Date.now());
    } catch {
      // silently fail — mock always works
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const canRefresh = Date.now() - lastFetch > 60_000; // 1분 쿨다운

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{L.title}</h1>
            <p className="text-xs text-gray-500">{L.subtitle}</p>
          </div>
          <button
            id="viral-refresh-btn"
            onClick={fetchReport}
            disabled={loading || !canRefresh}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl disabled:opacity-40 hover:bg-sky-100 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? L.loading : L.refresh}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Summary Strip */}
        {report && !loading && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              {report.isAI
                ? <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">🤖 {L.aiTag}</span>
                : <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">📋 {L.mockTag}</span>
              }
              <span className="text-xs text-white/70">
                {report.totalSources}{L.totalSources}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/70">{L.topSpecies}</p>
                <p className="text-base font-bold">🎣 {report.topSpecies}</p>
              </div>
              {report.hotKeyword && (
                <div>
                  <p className="text-[10px] text-white/70">{L.hotKeyword}</p>
                  <p className="text-base font-bold">🔥 {report.hotKeyword}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Gear Cards */}
        {!loading && report && (
          <div className="space-y-3">
            {report.items.map(item => (
              <GearCard key={item.rank} item={item} locale={locale} />
            ))}
          </div>
        )}

        {/* Affiliate Disclaimer */}
        {!loading && report && (
          <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">
            ℹ️ {L.disclaimer}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
