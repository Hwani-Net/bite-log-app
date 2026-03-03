'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FISH_SEASON_DB,
  type FishSeasonData,
  type Region,
  type ReleaseSite,
  getTotalRelease,
  sortByCurrentSeason,
  getSeasonStatus,
  filterByRegion,
} from '@/data/fishSeasonDB';
import { useAppStore } from '@/store/appStore';
import BottomNav from '@/components/BottomNav';

const REGION_TABS: { label: string; value: Region | '전국' }[] = [
  { label: '전국', value: '전국' },
  { label: '서해', value: '서해' },
  { label: '남해', value: '남해' },
  { label: '동해', value: '동해' },
];

const STATUS_CONFIG = {
  gold:      { label: '🔥 황금 시즌', bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', badge: 'bg-amber-500' },
  peak:      { label: '🎣 피크 시즌', bg: 'bg-green-50 border-green-300', text: 'text-green-700', badge: 'bg-green-500' },
  closed:    { label: '🚫 금어기', bg: 'bg-red-50 border-red-300', text: 'text-red-600', badge: 'bg-red-500' },
  offseason: { label: '⏳ 비수기', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', badge: 'bg-slate-400' },
};

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 10000).toFixed(0)}만`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`.replace('.0만', '만');
  return n.toLocaleString();
}

function MonthBar({ peakMonths, goldMonths, closedSeason }: { peakMonths: number[]; goldMonths: number[]; closedSeason: FishSeasonData['closedSeason'] }) {
  const months = [1,2,3,4,5,6,7,8,9,10,11,12];
  const now = new Date().getMonth() + 1;
  
  function getMonthColor(m: number) {
    // Closed season check
    if (closedSeason) {
      const [startM] = closedSeason.start.split('/').map(Number);
      const [endM] = closedSeason.end.split('/').map(Number);
      if (m >= startM && m <= endM) return 'bg-red-300';
    }
    if (goldMonths.includes(m)) return 'bg-amber-400';
    if (peakMonths.includes(m)) return 'bg-green-400';
    return 'bg-slate-200';
  }

  return (
    <div className="flex gap-0.5 items-end">
      {months.map(m => (
        <div key={m} className="flex flex-col items-center gap-0.5 flex-1">
          {m === now && <div className="w-1 h-1 rounded-full bg-blue-500" />}
          <div className={`w-full h-2 rounded-sm ${getMonthColor(m)} ${m === now ? 'ring-1 ring-blue-500 ring-offset-1' : ''}`} />
          <span className={`text-[8px] ${m === now ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{m}</span>
        </div>
      ))}
    </div>
  );
}

function ReleaseSiteRow({ site }: { site: ReleaseSite }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700">{site.city}</span>
        <span className="text-[10px] text-slate-400">{site.region}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-primary">{formatCount(site.count)}마리</span>
        <span className="text-[10px] text-slate-400">{site.months.map(m => `${m}월`).join('·')}</span>
      </div>
    </div>
  );
}

function FishCard({ data, regionFilter }: { data: FishSeasonData; regionFilter: Region | '전국' }) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const status = getSeasonStatus(data, month, day);
  const config = STATUS_CONFIG[status];
  const total = getTotalRelease(data);
  const sites = regionFilter === '전국'
    ? data.releaseSites
    : filterByRegion(data, regionFilter as Region);
  const filteredTotal = sites.reduce((sum, s) => sum + s.count, 0);
  const cityCount = new Set(sites.map(s => s.city)).size;

  return (
    <div className={`rounded-2xl border ${config.bg} overflow-hidden transition-all`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.image} alt={data.species} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{data.species}</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold ${config.badge}`}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-500">
              피크 {data.peakFishingMonths.map(m => `${m}월`).join('·')}
            </span>
            <span className="text-[10px] text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              {cityCount}개 지역 · {formatCount(filteredTotal)}마리
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400 text-lg transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : '' }}>
          expand_more
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Month bar */}
          <div>
            <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-2">
              <span>시즌 캘린더</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> 황금
                <span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> 피크
                {data.closedSeason && <><span className="w-2 h-2 rounded-sm bg-red-300 inline-block" /> 금어기</>}
              </span>
            </p>
            <MonthBar peakMonths={data.peakFishingMonths} goldMonths={data.goldFishingMonths} closedSeason={data.closedSeason} />
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              🌊 서식수심 {data.habitatDepth}
            </span>
            {data.closedSeason && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-600">
                ⛔ 금어기 {data.closedSeason.start}~{data.closedSeason.end}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              📊 총 방류 {formatCount(total)}마리
            </span>
          </div>

          {/* Release sites table */}
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              📍 지역별 방류 계획 ({sites[0]?.year || 2025}년 기준)
            </p>
            <div>
              {sites.length > 0 ? (
                sites
                  .sort((a, b) => b.count - a.count)
                  .map((site, i) => <ReleaseSiteRow key={`${site.city}-${i}`} site={site} />)
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">이 해역의 방류 계획이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeasonForecastPage() {
  const { locale } = useAppStore();
  const [regionFilter, setRegionFilter] = useState<Region | '전국'>('전국');
  const month = new Date().getMonth() + 1;

  const sorted = useMemo(() => {
    const filtered = regionFilter === '전국'
      ? FISH_SEASON_DB
      : FISH_SEASON_DB.filter(d =>
          d.releaseSites.some(s => s.region === regionFilter || s.region === '전국')
        );
    return sortByCurrentSeason(filtered, month);
  }, [regionFilter, month]);

  const isKo = locale === 'ko';

  return (
    <main className="mx-auto max-w-md min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="material-symbols-outlined text-slate-500 text-xl">arrow_back</Link>
            <div>
              <h1 className="text-base font-bold text-slate-800">
                {isKo ? '시즌 예측' : 'Season Forecast'}
              </h1>
              <p className="text-[10px] text-slate-400">
                {isKo ? '치어 방류 계획 기반 · 5개 어종' : 'Based on fry release plans · 5 species'}
              </p>
            </div>
          </div>

          {/* Region tabs */}
          <div className="flex gap-1.5 mt-3">
            {REGION_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setRegionFilter(tab.value)}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  regionFilter === tab.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Fish cards */}
      <div className="px-4 pt-4 space-y-3">
        {sorted.map(data => (
          <FishCard key={data.species} data={data} regionFilter={regionFilter} />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pt-6">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          {isKo
            ? '※ 한국수산자원공단 방류계획 기준. 실제 조과는 기상·수온·조류에 따라 달라질 수 있습니다.'
            : '※ Based on FIRA release plans. Actual conditions may vary.'}
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
