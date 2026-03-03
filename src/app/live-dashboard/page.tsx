'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getPublicFeed } from '@/services/feedService';
import { PublicFeedItem } from '@/types';
import { fetchTopNews, FishingNewsItem } from '@/services/fishingNewsService';
import { FISH_SEASON_DB, getSeasonStatus } from '@/data/fishSeasonDB';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegionStat {
  region: string;
  count: number;
  topSpecies: string;
  emoji: string;
}

interface SpeciesStat {
  species: string;
  emoji: string;
  count: number;
  avgSize: number;
  topLocation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  '제주': '제주', '서귀포': '제주',
  '부산': '남해', '통영': '남해', '거제': '남해', '여수': '남해', '목포': '남해',
  '인천': '서해', '당진': '서해', '태안': '서해', '보령': '서해', '군산': '서해',
  '속초': '동해', '강릉': '동해', '포항': '동해', '울산': '동해', '동해': '동해',
};

function getRegion(locationName: string): string {
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (locationName.includes(key)) return region;
  }
  return '기타';
}

const SPECIES_EMOJIS: Record<string, string> = {
  '농어': '🐟', '우럭': '🪨', '참돔': '🎏', '감성돔': '🐠', '볼락': '🐡',
  '광어': '🫓', '고등어': '🐟', '방어': '🐟', '주꾸미': '🐙', '전갱이': '🐟',
  '숭어': '🐟', '학꽁치': '🐟',
};

// ─── Region Card ──────────────────────────────────────────────────────────────
const REGION_COLORS: Record<string, { bg: string; gradient: string; icon: string }> = {
  '서해': { bg: 'bg-amber-50', gradient: 'from-amber-500 to-orange-400', icon: '🌅' },
  '남해': { bg: 'bg-cyan-50', gradient: 'from-cyan-500 to-blue-400', icon: '🏝️' },
  '동해': { bg: 'bg-indigo-50', gradient: 'from-indigo-500 to-blue-500', icon: '🌊' },
  '제주': { bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-400', icon: '🍊' },
  '기타': { bg: 'bg-slate-50', gradient: 'from-slate-500 to-slate-400', icon: '📍' },
};

function RegionCard({ stat }: { stat: RegionStat }) {
  const color = REGION_COLORS[stat.region] || REGION_COLORS['기타'];

  return (
    <div className={`rounded-2xl p-3 border border-slate-100 ${color.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{color.icon}</span>
        <span className="text-sm font-bold text-slate-800">{stat.region}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-black text-slate-900">{stat.count}</span>
          <span className="text-[10px] text-slate-500 ml-1">마리</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">인기 어종</p>
          <p className="text-xs font-bold text-slate-700">
            {stat.emoji} {stat.topSpecies}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Species Row ──────────────────────────────────────────────────────────────
function SpeciesRow({ stat, rank }: { stat: SpeciesStat; rank: number }) {
  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-slate-100">
      <span className={`text-lg font-black ${rankColors[rank - 1] || 'text-slate-400'} w-6 text-center`}>
        {rank}
      </span>
      <span className="text-xl">{stat.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{stat.species}</p>
        <p className="text-[10px] text-slate-500 truncate">{stat.topLocation}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900">{stat.count}마리</p>
        {stat.avgSize > 0 && (
          <p className="text-[10px] text-slate-400">평균 {stat.avgSize}cm</p>
        )}
      </div>
    </div>
  );
}

// ─── Live News Ticker ─────────────────────────────────────────────────────────
function LiveNewsTicker({ news }: { news: FishingNewsItem[] }) {
  if (news.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">LIVE</span>
        <span className="text-xs font-bold text-slate-800">실시간 조과 소식</span>
      </div>
      <div className="divide-y divide-slate-50">
        {news.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400">{item.sourceLabel}</span>
                {item.species && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600 font-bold">
                    🐟 {item.species}
                  </span>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-sm">open_in_new</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function LiveDashboardPage() {
  const locale = useAppStore((s) => s.locale);
  const isKo = locale === 'ko';
  const [feed, setFeed] = useState<PublicFeedItem[]>([]);
  const [news, setNews] = useState<FishingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  useEffect(() => {
    Promise.all([
      getPublicFeed().then(setFeed).catch(() => setFeed([])),
      fetchTopNews().then(setNews).catch(() => setNews([])),
    ]).finally(() => setLoading(false));
  }, []);

  // Calculate region stats
  const regionStats = useMemo((): RegionStat[] => {
    const regionMap = new Map<string, { count: number; speciesCount: Map<string, number> }>();

    feed.forEach(item => {
      const region = getRegion(item.location.name);
      if (!regionMap.has(region)) {
        regionMap.set(region, { count: 0, speciesCount: new Map() });
      }
      const stat = regionMap.get(region)!;
      stat.count += item.count;
      stat.speciesCount.set(item.species, (stat.speciesCount.get(item.species) || 0) + item.count);
    });

    return Array.from(regionMap.entries())
      .map(([region, data]) => {
        const topSpeciesEntry = [...data.speciesCount.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          region,
          count: data.count,
          topSpecies: topSpeciesEntry?.[0] || '-',
          emoji: SPECIES_EMOJIS[topSpeciesEntry?.[0]] || '🐟',
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [feed]);

  // Calculate species stats
  const speciesStats = useMemo((): SpeciesStat[] => {
    const speciesMap = new Map<string, { count: number; sizes: number[]; locations: Map<string, number> }>();

    feed.forEach(item => {
      if (!speciesMap.has(item.species)) {
        speciesMap.set(item.species, { count: 0, sizes: [], locations: new Map() });
      }
      const stat = speciesMap.get(item.species)!;
      stat.count += item.count;
      if (item.sizeCm) stat.sizes.push(item.sizeCm);
      stat.locations.set(item.location.name, (stat.locations.get(item.location.name) || 0) + 1);
    });

    return Array.from(speciesMap.entries())
      .map(([species, data]) => {
        const topLocation = [...data.locations.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          species,
          emoji: SPECIES_EMOJIS[species] || '🐟',
          count: data.count,
          avgSize: data.sizes.length > 0 ? Math.round(data.sizes.reduce((a, b) => a + b, 0) / data.sizes.length) : 0,
          topLocation: topLocation?.[0] || '-',
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [feed]);

  // Season fish that are in season right now
  const inSeasonFish = FISH_SEASON_DB.filter(d => {
    const st = getSeasonStatus(d, month, day);
    return st === 'peak' || st === 'gold';
  });

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-slate-50 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-slate-50 sticky top-0 z-30 backdrop-blur-md">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100"
        >
          <span className="material-symbols-outlined text-slate-500">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">
            {isKo ? '실시간 조황' : 'Live Dashboard'}
          </h1>
          <p className="text-[10px] text-slate-400">
            {isKo ? '전국 낚시 현황 · 업데이트됨' : 'Nationwide fishing status'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-500">LIVE</span>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-slate-500">전국 조황 데이터 수집 중...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 px-4 pt-4">
          {/* ── Summary Banner ── */}
          <div className="bg-gradient-to-r from-primary to-cyan-500 rounded-2xl p-4 shadow-lg shadow-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                  {isKo ? '오늘 전국 조과' : 'Today\'s Total'}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">
                    {feed.reduce((sum, f) => sum + f.count, 0).toLocaleString()}
                  </span>
                  <span className="text-sm text-white/70">마리</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/70 mb-0.5">{feed.length}건 기록</p>
                <p className="text-[10px] text-white/70">{regionStats.length}개 해역</p>
              </div>
            </div>
          </div>

          {/* ── Season Fish Banner ── */}
          {inSeasonFish.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="material-symbols-outlined text-amber-500 text-base">whatshot</span>
                <h2 className="text-sm font-bold text-slate-800">
                  {isKo ? `${month}월 시즌 어종` : `${month} In-Season`}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {inSeasonFish.map(d => {
                  const st = getSeasonStatus(d, month, day);
                  const isGold = st === 'gold';
                  return (
                    <Link
                      key={d.species}
                      href="/season-forecast"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all hover:scale-105 ${
                        isGold
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}
                    >
                      <span className="text-sm">{d.emoji}</span>
                      <span className="text-xs font-bold">{d.species}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isGold ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {isGold ? '황금' : '피크'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Region Grid ── */}
          {regionStats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-base">map</span>
                <h2 className="text-sm font-bold text-slate-800">
                  {isKo ? '해역별 현황' : 'By Region'}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {regionStats.map(stat => (
                  <RegionCard key={stat.region} stat={stat} />
                ))}
              </div>
            </div>
          )}

          {/* ── Species Ranking ── */}
          {speciesStats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-500 text-base">emoji_events</span>
                <h2 className="text-sm font-bold text-slate-800">
                  {isKo ? '어종별 랭킹' : 'Species Ranking'}
                </h2>
              </div>
              <div className="space-y-2">
                {speciesStats.slice(0, 5).map((stat, i) => (
                  <SpeciesRow key={stat.species} stat={stat} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Live News ── */}
          <LiveNewsTicker news={news} />

          {/* ── Empty state ── */}
          {feed.length === 0 && news.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <span className="text-4xl">🎣</span>
              <p className="text-sm font-bold text-slate-700 mt-3">아직 오늘의 조과가 없습니다</p>
              <p className="text-xs text-slate-500 mt-1">첫 번째 조과를 기록해보세요!</p>
              <Link
                href="/record"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                기록 추가
              </Link>
            </div>
          )}

          {/* ── Data source ── */}
          <p className="text-[10px] text-slate-400 text-center pb-4">
            {isKo
              ? '※ 커뮤니티 피드 + 네이버 뉴스 기반. 실시간 업데이트됩니다.'
              : '※ Community feed + Naver news. Updated in real-time.'}
          </p>
        </div>
      )}
    </div>
  );
}
