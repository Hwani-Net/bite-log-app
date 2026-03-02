'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { mockRankingService } from '@/services/rankingService';
import { RankingCategory, RankingData } from '@/types/ranking';

const CATEGORY_KEYS: { value: RankingCategory; koLabel: string; enLabel: string }[] = [
  { value: 'catch', koLabel: '조과왕', enLabel: 'Most Caught' },
  { value: 'size', koLabel: '대어왕', enLabel: 'Biggest Fish' },
  { value: 'variety', koLabel: '다양왕', enLabel: 'Most Variety' },
];

export default function RankingPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const [category, setCategory] = useState<RankingCategory>('catch');
  const [data, setData] = useState<RankingData | null>(null);

  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const load = useCallback(async () => {
    const result = await mockRankingService.getRanking(category);
    setData(result);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!data) return;
    function calc() {
      const diff = new Date(data!.seasonEndDate).getTime() - Date.now();
      if (diff <= 0) { setDays(0); setHours(0); setMinutes(0); setSeconds(0); return; }
      setDays(Math.floor(diff / 86400000));
      setHours(Math.floor((diff % 86400000) / 3600000));
      setMinutes(Math.floor((diff % 3600000) / 60000));
      setSeconds(Math.floor((diff % 60000) / 1000));
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [data]);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!data) return <p className="text-center py-20 text-slate-500">Loading...</p>;

  const first = data.topThree[0];
  const second = data.topThree[1];
  const third = data.topThree[2];

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display page-enter">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-primary/10">
        <div className="flex items-center justify-between">
          <button className="p-2 -ml-2 text-slate-700 dark:text-slate-100" onClick={() => window.history.back()}>
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            🏆 {locale === 'ko' ? '낚시 랭킹' : 'Fishing Ranking'}
          </h1>
          <button className="p-2 -mr-2 text-slate-700 dark:text-slate-100">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-32">
        {/* Season Countdown Banner */}
        <div className="px-4 py-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-ocean-deep/10 dark:from-[#25d1f4]/30 dark:to-background-dark border border-primary/15 dark:border-[#25d1f4]/20 p-5">
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-primary dark:text-[#25d1f4] text-xs font-bold uppercase tracking-wider">
                {locale === 'ko' ? '시즌 종료까지' : 'Season ends in'}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {locale === 'ko' ? '2024년 6월 시즌' : 'June 2024 Season'}
              </h2>
            </div>
            <div className="flex gap-3">
              {[
                { val: pad(days), label: locale === 'ko' ? '일' : 'D' },
                { val: pad(hours), label: locale === 'ko' ? '시간' : 'H' },
                { val: pad(minutes), label: locale === 'ko' ? '분' : 'M' },
                { val: pad(seconds), label: locale === 'ko' ? '초' : 'S' },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center bg-white/60 dark:bg-background-dark/40 rounded-lg py-2 border border-slate-200/50 dark:border-white/5">
                  <span className="text-xl font-bold text-primary dark:text-[#25d1f4]">{item.val}</span>
                  <span className="text-[10px] text-slate-500 dark:text-white/60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segmented Tab Control */}
        <div className="px-4 mb-8">
          <div className="flex p-1 bg-slate-100 dark:bg-[#25d1f4]/10 rounded-xl">
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                  category === c.value
                    ? 'font-semibold bg-primary dark:bg-[#25d1f4] text-white dark:text-background-dark shadow-sm'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {locale === 'ko' ? c.koLabel : c.enLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Podium Layout */}
        <div className="px-4 flex items-end justify-center gap-2 mb-10">
          {/* Rank 2 */}
          {second && (
            <div className="flex-1 flex flex-col items-center text-slate-900 dark:text-slate-100">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                  {second.user.photoURL ?? '🎣'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-300 text-slate-700 dark:text-background-dark text-[10px] font-bold px-1.5 rounded-full border border-white dark:border-background-dark">
                  2
                </div>
              </div>
              <div className="podium-2 w-full rounded-t-xl flex flex-col items-center justify-center p-2 text-center border-t border-x border-primary/10">
                <span className="text-xs font-bold truncate w-full">{second.user.displayName}</span>
                <span className="text-primary dark:text-[#25d1f4] font-bold text-sm">{second.label}</span>
              </div>
            </div>
          )}

          {/* Rank 1 */}
          {first && (
            <div className="flex-1 flex flex-col items-center text-slate-900 dark:text-slate-100">
              <div className="relative mb-4">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400">
                  <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-primary dark:border-[#25d1f4] overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-[0_0_20px_rgba(19,146,236,0.3)] dark:shadow-[0_0_20px_rgba(37,209,244,0.4)] flex items-center justify-center text-3xl">
                  {first.user.photoURL ?? '🎣'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary dark:bg-[#25d1f4] text-white dark:text-background-dark text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-background-dark">
                  1
                </div>
              </div>
              <div className="podium-1 w-full rounded-t-xl flex flex-col items-center justify-center p-2 text-center border-t border-x border-primary/30">
                <span className="text-sm font-bold truncate w-full">{first.user.displayName}</span>
                <span className="text-primary dark:text-[#25d1f4] font-extrabold text-lg">{first.label}</span>
              </div>
            </div>
          )}

          {/* Rank 3 */}
          {third && (
            <div className="flex-1 flex flex-col items-center text-slate-900 dark:text-slate-100">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full border-2 border-orange-400 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                  {third.user.photoURL ?? '🎣'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-orange-400 text-white dark:text-background-dark text-[10px] font-bold px-1.5 rounded-full border border-white dark:border-background-dark">
                  3
                </div>
              </div>
              <div className="podium-3 w-full rounded-t-xl flex flex-col items-center justify-center p-2 text-center border-t border-x border-primary/10">
                <span className="text-xs font-bold truncate w-full">{third.user.displayName}</span>
                <span className="text-primary dark:text-[#25d1f4] font-bold text-sm">{third.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard List */}
        <div className="px-4 space-y-3">
          {data.rest.map((entry) => (
            <div key={entry.user.uid} className="flex items-center gap-4 p-3 bg-white dark:bg-primary/5 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
              <span className="w-6 text-center font-bold text-slate-400">{entry.rank}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                {entry.user.photoURL ?? '🎣'}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.user.displayName}</h4>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{entry.label}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Current User Rank Panel */}
      {data.myRank && (
        <div className="fixed bottom-[84px] left-0 right-0 z-40 flex justify-center px-4">
          <div className="w-full max-w-lg bg-primary dark:bg-[#25d1f4] rounded-xl p-4 shadow-2xl shadow-primary/30 dark:shadow-[#25d1f4]/30 flex items-center gap-4 text-white dark:text-slate-900 border border-primary/30 dark:border-white/20">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase opacity-80 leading-none mb-1">
                {locale === 'ko' ? '내 순위' : 'My Rank'}
              </span>
              <span className="text-xl font-black">{data.myRank.rank}</span>
            </div>
            <div className="w-[1px] h-8 bg-white/30 dark:bg-slate-900/20"></div>
            <div className="w-10 h-10 rounded-full border-2 border-white/40 dark:border-slate-900/30 overflow-hidden bg-slate-700 dark:bg-slate-800 flex items-center justify-center text-white text-xl">
              {data.myRank.user.photoURL ?? '🎣'}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold truncate">{data.myRank.user.displayName}</h4>
              <p className="text-[10px] opacity-80 font-medium">
                {locale === 'ko' ? '상위 12% 이내' : 'Top 12%'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-bold">{data.myRank.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
