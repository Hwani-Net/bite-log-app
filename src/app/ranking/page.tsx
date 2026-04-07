"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { getFirebaseRanking } from "@/services/rankingService";
import { RankingCategory, RankingData } from "@/types/ranking";
import { useAuth } from "@/hooks/useAuth";
import { DynamicIcon } from "@/lib/iconMap";

const CATEGORY_KEYS: {
  value: RankingCategory;
  koLabel: string;
  enLabel: string;
  icon: string;
}[] = [
  {
    value: "catch",
    koLabel: "조과왕",
    enLabel: "Most Caught",
    icon: "set_meal",
  },
  {
    value: "size",
    koLabel: "대어왕",
    enLabel: "Biggest Fish",
    icon: "straighten",
  },
  {
    value: "variety",
    koLabel: "다양왕",
    enLabel: "Most Variety",
    icon: "category",
  },
];

export default function RankingPage() {
  const locale = useAppStore((s) => s.locale);
  const { user } = useAuth();
  const [category, setCategory] = useState<RankingCategory>("catch");
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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    function calc() {
      const diff = new Date(data!.seasonEndDate).getTime() - Date.now();
      if (diff <= 0) {
        setDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        return;
      }
      setDays(Math.floor(diff / 86400000));
      setHours(Math.floor((diff % 86400000) / 3600000));
      setMinutes(Math.floor((diff % 3600000) / 60000));
      setSeconds(Math.floor((diff % 60000) / 1000));
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [data]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-[#080d14]">
        <DynamicIcon
          name="refresh"
          size={36}
          className="text-[#c9a84c] animate-spin"
        />
        <p className="text-white/50 text-sm">
          {locale === "ko" ? "랭킹 불러오는 중..." : "Loading rankings..."}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const first = data.topThree[0];
  const second = data.topThree[1];
  const third = data.topThree[2];

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display page-enter bg-[#080d14]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button
          className="size-10 flex items-center justify-center text-white/50 hover:bg-white/5 rounded-full transition-colors"
          onClick={() => window.history.back()}
        >
          <DynamicIcon name="arrow_back" size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-white">
            {locale === "ko" ? "낚시 랭킹" : "Fishing Ranking"}
          </h1>
          {/* Real/Mock badge */}
          {data.isRealData ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse inline-block" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30 font-medium">
              DEMO
            </span>
          )}
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 pb-40">
        {/* Season Countdown Banner */}
        <div className="px-4 py-5">
          <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
            <div className="absolute top-3 right-4 opacity-10">
              <DynamicIcon
                name="emoji_events"
                size={48}
                className="text-[#c9a84c]"
              />
            </div>
            <div className="flex flex-col gap-0.5 mb-4">
              <span className="text-[#c9a84c] text-xs font-bold uppercase tracking-[0.2em]">
                {locale === "ko" ? "시즌 종료까지" : "Season ends in"}
              </span>
              <h2 className="text-lg font-bold text-white">
                {data.seasonLabel}
              </h2>
            </div>
            <div className="flex gap-2">
              {[
                { val: pad(days), label: locale === "ko" ? "일" : "D" },
                { val: pad(hours), label: locale === "ko" ? "시간" : "H" },
                { val: pad(minutes), label: locale === "ko" ? "분" : "M" },
                { val: pad(seconds), label: locale === "ko" ? "초" : "S" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center bg-white/5 rounded-xl py-2.5 px-1 border border-white/10"
                >
                  <span className="text-xl font-black text-[#c9a84c] tabular-nums">
                    {item.val}
                  </span>
                  <span className="text-[10px] text-white/30 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Segmented Tab */}
        <div className="px-4 mb-6">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl gap-1">
            {CATEGORY_KEYS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-xl transition-all ${
                  category === c.value
                    ? "font-bold bg-[#c9a84c] text-[#080d14]"
                    : "font-medium text-white/50 hover:text-white/70"
                }`}
              >
                <DynamicIcon name={c.icon} size={16} />
                {locale === "ko" ? c.koLabel : c.enLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Loading overlay for tab switch */}
        {loading && data && (
          <div className="flex justify-center py-4">
            <DynamicIcon
              name="refresh"
              size={20}
              className="text-[#c9a84c] animate-spin"
            />
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
                      <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden bg-white/5 flex items-center justify-center text-sm font-bold text-white/60">
                        {second.user.photoURL ??
                          second.user.displayName?.charAt(0) ??
                          "?"}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white/20 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-[#080d14] flex items-center justify-center">
                        2
                      </div>
                    </div>
                    <div
                      className="w-full bg-white/5 border border-white/10 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center"
                      style={{ height: "70px" }}
                    >
                      <p className="text-xs font-bold text-white truncate w-full">
                        {second.user.displayName}
                      </p>
                      <p className="text-sm font-black text-[#7dd3fc]">
                        {second.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Rank 1 */}
                {first ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                        <DynamicIcon
                          name="emoji_events"
                          size={36}
                          className="text-[#c9a84c] drop-shadow-sm"
                        />
                      </div>
                      <div className="w-20 h-20 rounded-full border-4 border-[#c9a84c] overflow-hidden bg-[#c9a84c]/10 flex items-center justify-center text-base font-bold text-[#c9a84c]">
                        {first.user.photoURL ??
                          first.user.displayName?.charAt(0) ??
                          "?"}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-[#c9a84c] text-[#080d14] text-xs font-black w-6 h-6 rounded-full border-2 border-[#080d14] flex items-center justify-center">
                        1
                      </div>
                    </div>
                    <div
                      className="w-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center"
                      style={{ height: "90px" }}
                    >
                      <p className="text-sm font-bold text-white truncate w-full">
                        {first.user.displayName}
                      </p>
                      <p className="text-lg font-black text-[#c9a84c]">
                        {first.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Rank 3 */}
                {third ? (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full border-2 border-[#c9a84c]/40 overflow-hidden bg-[#c9a84c]/5 flex items-center justify-center text-sm font-bold text-[#c9a84c]/70">
                        {third.user.photoURL ??
                          third.user.displayName?.charAt(0) ??
                          "?"}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-[#c9a84c]/60 text-[#080d14] text-[10px] font-black w-5 h-5 rounded-full border-2 border-[#080d14] flex items-center justify-center">
                        3
                      </div>
                    </div>
                    <div
                      className="w-full bg-white/5 border border-white/10 rounded-t-xl flex flex-col items-center justify-end p-2 pb-3 text-center"
                      style={{ height: "55px" }}
                    >
                      <p className="text-xs font-bold text-white truncate w-full">
                        {third.user.displayName}
                      </p>
                      <p className="text-sm font-black text-[#c9a84c]/70">
                        {third.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-white/50 font-semibold">
                  {locale === "ko"
                    ? "이번 시즌 첫 번째 조과를 기록하세요!"
                    : "Be the first to log a catch this season!"}
                </p>
                <p className="text-white/30 text-sm mt-1">
                  {locale === "ko"
                    ? "공개로 올린 조과가 랭킹에 반영됩니다"
                    : "Public catches appear in the ranking"}
                </p>
              </div>
            )}

            {/* Leaderboard List (4th~) */}
            {data.rest.length > 0 && (
              <div className="px-4 space-y-2 mb-4">
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
                  {locale === "ko" ? "4위 이하" : "Others"}
                </h3>
                {data.rest.map((entry) => (
                  <div
                    key={entry.user.uid}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
                      entry.user.uid === user?.uid
                        ? "bg-[#c9a84c]/5 border-[#c9a84c]/20"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <span className="w-7 text-center text-sm font-black text-white/30">
                      {entry.rank}
                    </span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 flex items-center justify-center text-sm font-bold text-white/40 shrink-0">
                      {entry.user.photoURL ??
                        entry.user.displayName?.charAt(0) ??
                        "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${entry.user.uid === user?.uid ? "text-[#c9a84c]" : "text-white"}`}
                      >
                        {entry.user.displayName}
                        {entry.user.uid === user?.uid && (
                          <span className="ml-1.5 text-[10px] font-normal bg-[#c9a84c]/10 text-[#c9a84c] px-1.5 py-0.5 rounded-full">
                            나
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-black ${entry.user.uid === user?.uid ? "text-[#c9a84c]" : "text-white/70"}`}
                    >
                      {entry.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state for real data with no entries beyond top 3 */}
            {data.isRealData && data.topThree.length === 0 && (
              <div className="px-4 py-4 text-center text-xs text-white/30">
                {locale === "ko"
                  ? "아직 랭킹에 올라온 조과가 없습니다. 조과를 공개로 올려보세요!"
                  : "No public catches yet. Share yours!"}
              </div>
            )}

            {/* Not logged in prompt */}
            {!user && (
              <div className="mx-4 mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-white/50">
                  {locale === "ko"
                    ? "로그인하면 내 순위를 확인할 수 있어요"
                    : "Sign in to see your rank"}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating My Rank Panel */}
      {data.myRank && user && (
        <div className="fixed bottom-[84px] left-0 right-0 z-40 flex justify-center px-4">
          <div className="w-full max-w-lg bg-gradient-to-r from-[#c9a84c] to-[#7dd3fc] rounded-2xl p-4 shadow-2xl flex items-center gap-4 text-[#080d14]">
            <div className="flex flex-col items-center min-w-[40px]">
              <span className="text-[10px] font-bold uppercase opacity-70 leading-none mb-1">
                {locale === "ko" ? "내 순위" : "My Rank"}
              </span>
              <span className="text-2xl font-black">{data.myRank.rank}</span>
            </div>
            <div className="w-[1px] h-10 bg-[#080d14]/20" />
            <div className="w-11 h-11 rounded-full border-2 border-[#080d14]/20 overflow-hidden bg-[#080d14]/10 flex items-center justify-center text-sm font-bold text-[#080d14] shrink-0">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="me"
                  className="w-full h-full object-cover"
                />
              ) : (
                (data.myRank.user.displayName?.charAt(0) ?? "?")
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {user.displayName || data.myRank.user.displayName}
              </p>
              <p className="text-[11px] opacity-70">
                {data.myRank.rank <= 3
                  ? locale === "ko"
                    ? "TOP 3!"
                    : "TOP 3!"
                  : locale === "ko"
                    ? `상위 ${Math.ceil((data.myRank.rank / (data.topThree.length + data.rest.length + 1)) * 100)}%`
                    : `Top ${Math.ceil((data.myRank.rank / (data.topThree.length + data.rest.length + 1)) * 100)}%`}
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
