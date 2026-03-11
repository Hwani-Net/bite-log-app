'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CatchRecord } from '@/types';
import { FishingNewsItem } from '@/services/fishingNewsService';
import { BiteTimePrediction } from '@/services/biteTimeService';
import { getSpeciesBiteScores, SpeciesBiteScore } from '@/services/speciesBiteService';

// ─── Fish emoji/color mapping ────────────────────────────────────────────────
const FISH_COLORS: Record<string, { gradient: string; emoji: string }> = {
  '농어': { gradient: 'from-blue-500 to-cyan-400', emoji: '🐟' },
  '우럭': { gradient: 'from-amber-500 to-orange-400', emoji: '🪨' },
  '참돔': { gradient: 'from-rose-400 to-pink-300', emoji: '🍣' },
  '감성돔': { gradient: 'from-violet-500 to-purple-400', emoji: '🐠' },
  '볼락': { gradient: 'from-emerald-500 to-green-400', emoji: '🔮' },
  '광어': { gradient: 'from-yellow-400 to-amber-300', emoji: '🫓' },
  '고등어': { gradient: 'from-indigo-500 to-blue-400', emoji: '🐟' },
  '방어': { gradient: 'from-sky-500 to-cyan-400', emoji: '🐟' },
  '주꾸미': { gradient: 'from-red-400 to-orange-300', emoji: '🐙' },
};
const DEFAULT_FISH = { gradient: 'from-slate-400 to-slate-300', emoji: '🎣' };

const NEWS_GRADIENTS = [
  'from-blue-600 via-blue-500 to-cyan-400',
  'from-slate-700 via-slate-600 to-slate-500',
  'from-amber-600 via-orange-500 to-yellow-400',
];
const NEWS_EMOJIS = ['🎣', '🐟', '🌊'];

interface ContentTabsProps {
  records: CatchRecord[];
  recordsLoading: boolean;
  topNews: FishingNewsItem[];
  biteTime: BiteTimePrediction | null;
  locale: string;
}

type TabId = 'catches' | 'news' | 'forecast';

export default function ContentTabs({ records, recordsLoading, topNews, biteTime, locale }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('catches');
  const isKo = locale === 'ko';

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'catches', label: isKo ? '최근 조과' : 'Catches', icon: 'phishing' },
    { id: 'news', label: isKo ? '뉴스' : 'News', icon: 'newspaper' },
    { id: 'forecast', label: isKo ? '입질 예보' : 'Forecast', icon: 'analytics' },
  ];

  return (
    <section className="px-4 pt-4">
      {/* Tab Bar */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 mb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'catches' && (
          <CatchesTab records={records} loading={recordsLoading} locale={locale} />
        )}
        {activeTab === 'news' && (
          <NewsTab news={topNews} locale={locale} />
        )}
        {activeTab === 'forecast' && (
          <ForecastTab biteTime={biteTime} locale={locale} />
        )}
      </div>
    </section>
  );
}

// ─── Catches Tab ─────────────────────────────────────────────────────────────
function CatchesTab({ records, loading, locale }: { records: CatchRecord[]; loading: boolean; locale: string }) {
  const isKo = locale === 'ko';
  const tagColors = ['bg-primary/10 text-primary', 'bg-teal-500/10 text-teal-600', 'bg-violet-500/10 text-violet-600'];

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800/50 rounded-2xl p-3 flex gap-3 animate-pulse border border-slate-100 dark:border-slate-700/50">
            <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {records.slice(0, 3).map((r, i) => {
        const fish = FISH_COLORS[r.species] || DEFAULT_FISH;
        const hasPhoto = r.photos.length > 0 && !r.photos[0].startsWith('/fish-');
        return (
          <Link key={r.id} href={`/records/detail?id=${r.id}`}
            className="flex gap-3 bg-white dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              {hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photos[0]} alt={r.species} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${fish.gradient} flex items-center justify-center`}>
                  <span className="text-2xl">{fish.emoji}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tagColors[i % 3]}`}>{r.species}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{r.date.replace(/-/g, '.')}</span>
              </div>
              <h4 className="text-sm font-bold mt-0.5 text-slate-900 dark:text-white truncate">
                {r.species} {r.sizeCm ? `${r.sizeCm}cm` : `${r.count}마리`}
              </h4>
              <div className="flex items-center mt-0.5 text-slate-400 dark:text-slate-500">
                <span className="material-symbols-outlined text-[12px] mr-0.5">location_on</span>
                <span className="text-[10px] truncate">{r.location?.name || '위치 정보 없음'}</span>
              </div>
            </div>
          </Link>
        );
      })}
      <Link href="/records" className="flex items-center justify-center gap-1 text-xs font-semibold text-primary py-2 hover:bg-primary/5 rounded-xl transition-colors">
        {isKo ? '전체 기록 보기' : 'View All Records'}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
    </div>
  );
}

// ─── News Tab ────────────────────────────────────────────────────────────────
function NewsTab({ news, locale }: { news: FishingNewsItem[]; locale: string }) {
  const isKo = locale === 'ko';

  if (news.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
        {isKo ? '뉴스를 불러오는 중...' : 'Loading news...'}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {news.slice(0, 3).map((item, i) => {
        const dotColor = item.freshness === 'realtime' ? 'bg-red-500' : item.freshness === 'today' ? 'bg-amber-400' : 'bg-slate-300';
        return (
          <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden hover:shadow-md transition-all active:scale-[0.99] border border-slate-100 dark:border-slate-700/50"
          >
            <div className="relative w-full h-36 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${NEWS_GRADIENTS[i % NEWS_GRADIENTS.length]} flex items-center justify-center`}>
                <span className="text-5xl opacity-30">{NEWS_EMOJIS[i % NEWS_EMOJIS.length]}</span>
              </div>
              {item.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
              <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${item.freshness === 'realtime' ? 'animate-pulse' : ''}`} />
                <span className="text-[9px] font-bold text-white/80 uppercase bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">{item.sourceLabel}</span>
                {item.species && <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/80 text-white font-bold">🐟 {item.species}</span>}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-bold text-white line-clamp-2">{item.title}</p>
                <p className="text-[10px] text-white/60 mt-0.5">{item.sourceLabel}</p>
              </div>
            </div>
          </a>
        );
      })}
      <Link href="/news" className="flex items-center justify-center gap-1 text-xs font-semibold text-primary py-2 hover:bg-primary/5 rounded-xl transition-colors">
        {isKo ? '뉴스 전체보기' : 'View All News'}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
    </div>
  );
}

// ─── Forecast Tab ────────────────────────────────────────────────────────────
function ForecastTab({ biteTime, locale }: { biteTime: BiteTimePrediction | null; locale: string }) {
  const isKo = locale === 'ko';
  const scores: SpeciesBiteScore[] = biteTime ? getSpeciesBiteScores(biteTime) : [];

  if (!biteTime) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
        <span className="material-symbols-outlined text-3xl mb-2">pending</span>
        <p className="text-sm">{isKo ? '입질 데이터 로딩 중...' : 'Loading bite data...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scores.slice(0, 5).map(s => {
        const colors = s.score >= 75 ? 'bg-emerald-500' : s.score >= 55 ? 'bg-blue-500' : s.score >= 35 ? 'bg-amber-500' : 'bg-red-400';
        return (
          <div key={s.species} className="flex items-center gap-3 bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
            <span className="text-xl w-8 text-center">{s.emoji || '🐟'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-white">{s.species}</span>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{s.score}점</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors} transition-all duration-500`} style={{ width: `${s.score}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.reason}</p>
            </div>
          </div>
        );
      })}
      <Link href="/bite-forecast" className="flex items-center justify-center gap-1 text-xs font-semibold text-primary py-2 hover:bg-primary/5 rounded-xl transition-colors">
        {isKo ? '상세 입질 예보' : 'Full Forecast'}
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
    </div>
  );
}
