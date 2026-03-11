'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { getInSeasonSpecies } from '@/services/conciergeService';
import {
  FISH_SEASON_DB, getSeasonStatus, sortByCurrentSeason, type FishSeasonData,
} from '@/data/fishSeasonDB';

interface AIConciergeCardProps {
  locale: string;
}

export default function AIConciergeCard({ locale }: AIConciergeCardProps) {
  const isKo = locale === 'ko';
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);

  const inSeason = useMemo(() =>
    sortByCurrentSeason(FISH_SEASON_DB, month).filter(d => {
      const st = getSeasonStatus(d, month, day);
      return st === 'peak' || st === 'gold';
    }).slice(0, 5), [month, day]);

  const closed = useMemo(() =>
    FISH_SEASON_DB.filter(d => getSeasonStatus(d, month, day) === 'closed').slice(0, 3),
    [month, day]);

  return (
    <section className="px-4 pt-3">
      <div className="bg-gradient-to-br from-primary via-blue-500 to-cyan-500 rounded-2xl overflow-hidden shadow-md shadow-primary/20">
        {/* AI CTA */}
        <Link href="/concierge" className="flex items-center gap-3 p-4 pb-3 group">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
              {isKo ? 'AI 컨시어지' : 'AI Concierge'} ✨
            </p>
            <p className="text-sm font-bold text-white truncate">
              {inSeasonSpecies.length > 0
                ? `${month}월 시즌: ${inSeasonSpecies.slice(0, 3).map(s => s.name).join(', ')}`
                : (isKo ? '오늘의 추천 포인트 확인하기' : 'Check today\'s spots')}
            </p>
          </div>
          <span className="material-symbols-outlined text-white/80 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
        </Link>

        <div className="mx-4 border-t border-white/15" />

        {/* Season Chips */}
        <Link href="/season-forecast" className="block px-4 py-3 group/season">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">
              🎣 {isKo ? '지금 잡히는 어종' : 'In Season'}
            </p>
            <span className="text-[9px] text-white/50 flex items-center gap-0.5 group-hover/season:text-white/80 transition-colors">
              {isKo ? '상세' : 'Details'}
              <span className="material-symbols-outlined text-[12px] group-hover/season:translate-x-0.5 transition-transform">chevron_right</span>
            </span>
          </div>
          {inSeason.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {inSeason.map(d => {
                const st = getSeasonStatus(d, month, day);
                const isGold = st === 'gold';
                return (
                  <span key={d.species} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${isGold ? 'bg-amber-400/30 text-amber-100' : 'bg-white/15 text-white/90'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isGold ? 'bg-amber-300' : 'bg-green-300'}`} />
                    <span>{d.emoji} {d.species}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/60">{isKo ? '시즌 정보 로딩 중...' : 'Loading...'}</p>
          )}
          {closed.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-200">
              <span>⛔</span>
              <span>{isKo ? '금어기' : 'Closed'}: {closed.map(d => `${d.emoji} ${d.species}`).join(', ')}</span>
            </div>
          )}
        </Link>
      </div>
    </section>
  );
}
