'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { getFirebaseRanking } from '@/services/rankingService';
import { RankingCategory, RankingData } from '@/types/ranking';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_KEYS: { value: RankingCategory; koLabel: string; enLabel: string; icon: string }[] = [
  { value: 'catch', koLabel: '조과왕', enLabel: 'Most Caught', icon: 'set_meal' },
  { value: 'size', koLabel: '대어왕', enLabel: 'Biggest Fish', icon: 'straighten' },
  { value: 'variety', koLabel: '다양왕', enLabel: 'Most Variety', icon: 'category' },
];

export default function RankingPage() {
  const locale = useAppStore((s) => s.locale);
  const { user } = useAuth();
  const [category, setCategory] = useState<RankingCategory>('catch');
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFirebaseRanking(category, user?.uid);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [category, user?.uid]);

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

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        <p className="text-slate-500 text-sm">{locale === 'ko' ? '랭킹 불러오는 중...' : 'Loading rankings...'}</p>
      </div>
    );
  }

  if (!data) return null;

  const first = data.topThree[0];
  const second = data.topThree[1];
  const third = data.topThree[2];

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display page-enter">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <button className="size-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-full transition-colors" onClick={() => window.history.back()}>
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            🏆 {locale === 'ko' ? '낚시 랭킹' : 'Fishing Ranking'}
          </h1>
          {/* Real/Mock badge */}
          {data.isRealData ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              DEMO
            </span>
          )}
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 pb-40">
        {/* Season Countdown Banner */}
        <div className="px-4 py-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-teal-400/10 border border-primary/15 p-5">
            <div className="absolute top-3 right-4 text-5xl opacity-10">🏆</div>
            <div className="flex flex-col gap-0.5 mb-4">
              <span className="text-primary text-xs font-bold uppercase tracking-wider">
                {locale === 'ko' ? '시즌 종료까지' : 'Season ends in'}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{data.seasonLabel}</h2>
            </div>
            <div className="flex gap-2">
              {[
                { val: pad(days), label: locale === 'ko' ? '일' : 'D' },
                { val: pad(hours), label: locale === 'ko' ? '시간' : 'H' },
                { val: pad(minutes), label: locale === 'ko' ? '분' : 'M' },
                { val: pad(seconds), label: locale === 'ko' ? '초' : 'S' },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center bg-white/70 rounded-xl py-2.5 px-1 border border-primary/10 shadow-sm">
                  <span className="text-xl font-black text-primary tabular-nums">{item.val}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segmented Tab */}
        <div className="px-4 mb-6">
          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-xl transition-all ${
                  category === c.value
                    ? 'font-bold bg-gradient-to-r from-primary to-teal-400 text-white shadow-md shadow-primary/20'
                    : 'font-medium text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-base leading-none">{c.icon}</span>
                {locale === 'ko' ? c.koLabel : c.enLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Loading overlay for tab switch */}
        {loading && data && (
          <div className="flex justify-center py-4">
            <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Podium */}
            {data.topThree.length > 0 ? (
              <div className="px-4 flex items-end justify-center gap-2 mb-8 mt-2">
                {/* Rank 2 */}
                {second ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full border-2 border-slate-300 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl shadow-md">
                        {second.user.photoURL ?? '🎣'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-slate-400 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">2</div>
                    </div>
                    <div className="w-full bg-gradient-to-b from-slate-100 to-slate-50 border border-slate-200 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center" style={{ height: '70px' }}>
                      <p className="text-xs font-bold text-slate-800 truncate w-full">{second.user.displayName}</p>
                      <p className="text-sm font-black text-primary">{second.label}</p>
                    </div>
                  </div>
                ) : <div className="flex-1" />}

                {/* Rank 1 */}
                {first ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                        <span className="material-symbols-outlined text-yellow-400 text-4xl drop-shadow-sm">workspace_premium</span>
                      </div>
                      <div className="w-20 h-20 rounded-full border-4 border-primary overflow-hidden bg-gradient-to-br from-primary/20 to-teal-400/20 flex items-center justify-center text-3xl shadow-xl shadow-primary/30">
                        {first.user.photoURL ?? '🎣'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-primary to-teal-400 text-white text-xs font-black w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">1</div>
                    </div>
                    <div className="w-full bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center" style={{ height: '90px' }}>
                      <p className="text-sm font-bold text-slate-900 truncate w-full">{first.user.displayName}</p>
                      <p className="text-lg font-black text-primary">{first.label}</p>
                    </div>
                  </div>
                ) : <div className="flex-1" />}

                {/* Rank 3 */}
                {third ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full border-2 border-orange-400 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-2xl shadow-md">
                        {third.user.photoURL ?? '🎣'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-orange-400 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">3</div>
                    </div>
                    <div className="w-full bg-gradient-to-b from-orange-50 to-white border border-orange-100 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center" style={{ height: '55px' }}>
                      <p className="text-xs font-bold text-slate-800 truncate w-full">{third.user.displayName}</p>
                      <p className="text-sm font-black text-orange-500">{third.label}</p>
                    </div>
                  </div>
                ) : <div className="flex-1" />}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-4xl mb-3">🎣</p>
                <p className="text-slate-600 font-semibold">{locale === 'ko' ? '이번 시즌 첫 번째 조과를 기록하세요!' : 'Be the first to log a catch this season!'}</p>
                <p className="text-slate-400 text-sm mt-1">{locale === 'ko' ? '공개로 올린 조과가 랭킹에 반영됩니다' : 'Public catches appear in the ranking'}</p>
              </div>
            )}

            {/* Leaderboard List (4th~) */}
            {data.rest.length > 0 && (
              <div className="px-4 space-y-2 mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {locale === 'ko' ? '4위 이하' : 'Others'}
                </h3>
                {data.rest.map((entry) => (
                  <div
                    key={entry.user.uid}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm transition-colors ${
                      entry.user.uid === user?.uid
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <span className="w-7 text-center text-sm font-black text-slate-400">{entry.rank}</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xl shrink-0">
                      {entry.user.photoURL ?? '🎣'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${entry.user.uid === user?.uid ? 'text-primary' : 'text-slate-800'}`}>
                        {entry.user.displayName}
                        {entry.user.uid === user?.uid && (
                          <span className="ml-1.5 text-[10px] font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">나</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-sm font-black ${entry.user.uid === user?.uid ? 'text-primary' : 'text-slate-700'}`}>
                      {entry.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state for real data with no entries beyond top 3 */}
            {data.isRealData && data.topThree.length === 0 && (
              <div className="px-4 py-4 text-center text-xs text-slate-400">
                {locale === 'ko' ? '아직 랭킹에 올라온 조과가 없습니다. 조과를 공개로 올려보세요!' : 'No public catches yet. Share yours!'}
              </div>
            )}

            {/* Not logged in prompt */}
            {!user && (
              <div className="mx-4 mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-sm text-slate-600">
                  {locale === 'ko' ? '로그인하면 내 순위를 확인할 수 있어요' : 'Sign in to see your rank'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating My Rank Panel */}
      {data.myRank && user && (
        <div className="fixed bottom-[84px] left-0 right-0 z-40 flex justify-center px-4">
          <div className="w-full max-w-lg bg-gradient-to-r from-primary to-teal-400 rounded-2xl p-4 shadow-2xl shadow-primary/30 flex items-center gap-4 text-white">
            <div className="flex flex-col items-center min-w-[40px]">
              <span className="text-[10px] font-bold uppercase opacity-70 leading-none mb-1">
                {locale === 'ko' ? '내 순위' : 'My Rank'}
              </span>
              <span className="text-2xl font-black">{data.myRank.rank}</span>
            </div>
            <div className="w-[1px] h-10 bg-white/30" />
            <div className="w-11 h-11 rounded-full border-2 border-white/40 overflow-hidden bg-primary/50 flex items-center justify-center text-white text-xl shrink-0">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="me" className="w-full h-full object-cover" />
              ) : (data.myRank.user.photoURL ?? '🎣')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.displayName || data.myRank.user.displayName}</p>
              <p className="text-[11px] opacity-70">
                {data.myRank.rank <= 3
                  ? (locale === 'ko' ? '🏆 TOP 3!' : '🏆 TOP 3!')
                  : (locale === 'ko' ? `상위 ${Math.ceil((data.myRank.rank / (data.topThree.length + data.rest.length + 1)) * 100)}%` : `Top ${Math.ceil((data.myRank.rank / (data.topThree.length + data.rest.length + 1)) * 100)}%`)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-black">{data.myRank.label}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
