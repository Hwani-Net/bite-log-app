"use client";

import { Fish } from "lucide-react";
import { FISH_SEASON_DB, FishSeasonData } from "@/data/fishSeasonDB";
import { getClosedSpecies } from "@/data/fishRegulationDB";

export default function MonthlyFishCard() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 현재 금어기 어종 목록
  const closedSpecies = getClosedSpecies(month, day).map((r) => r.species);

  // 이달 peakFishingMonths에 포함 + 금어기 제외 → 최대 3개
  const recommended: FishSeasonData[] = FISH_SEASON_DB.filter(
    (fish) =>
      fish.peakFishingMonths.includes(month) &&
      !closedSpecies.includes(fish.species),
  ).slice(0, 3);

  if (recommended.length === 0) return null;

  // 어종별 대표 지역 (releaseSites 첫 번째, 없으면 빈 문자열)
  function getPrimaryRegion(fish: FishSeasonData): string {
    if (fish.releaseSites.length === 0) return "";
    return fish.releaseSites[0].region;
  }

  return (
    <section className="space-y-3">
      {/* 섹션 타이틀 */}
      <div className="flex items-center justify-between">
        <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">
          {month}월 추천 어종
        </h2>
      </div>

      {/* 어종 칩 목록 */}
      <div className="space-y-2">
        {recommended.map((fish) => {
          const region = getPrimaryRegion(fish);
          const isGold = fish.goldFishingMonths.includes(month);

          return (
            <div
              key={fish.species}
              className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-3 flex items-center gap-3"
            >
              {/* Fish 아이콘 */}
              <div className="shrink-0 w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center">
                <Fish size={16} className="text-[#c9a84c]" />
              </div>

              {/* 어종명 + 지역 태그 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.8rem] font-bold text-white tracking-wide">
                    {fish.species}
                  </span>
                  {/* 피크시즌 뱃지 */}
                  {isGold && (
                    <span className="bg-[#c9a84c] text-[#080d14] text-[10px] font-bold rounded-full px-2 py-0.5 leading-none">
                      제철
                    </span>
                  )}
                </div>
                {region && (
                  <span className="text-[0.55rem] font-thin text-white/40 tracking-widest uppercase mt-0.5 block">
                    {region}
                  </span>
                )}
              </div>

              {/* 수심 정보 */}
              <div className="shrink-0 text-right">
                <span className="text-[0.5rem] font-thin text-white/30 tracking-widest">
                  {fish.habitatDepth}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
