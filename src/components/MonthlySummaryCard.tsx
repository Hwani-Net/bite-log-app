"use client";

import { useEffect, useState } from "react";
import { Fish, Calendar, TrendingUp } from "lucide-react";
import { getDataService } from "@/services/dataServiceFactory";
import { CatchRecord } from "@/types";

interface SummaryData {
  totalCount: number;
  topSpecies: string;
  tripCount: number;
}

export default function MonthlySummaryCard() {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const records: CatchRecord[] = await getDataService().getCatchRecords();
        const monthPrefix = new Date().toISOString().slice(0, 7);
        const monthly = records.filter((r) => r.date.startsWith(monthPrefix));

        if (monthly.length === 0) return;

        // 총 마릿수
        const totalCount = monthly.reduce((acc, r) => acc + r.count, 0);

        // 가장 많이 잡은 어종
        const speciesMap: Record<string, number> = {};
        for (const r of monthly) {
          speciesMap[r.species] = (speciesMap[r.species] ?? 0) + r.count;
        }
        const topSpecies =
          Object.entries(speciesMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

        // 출조 횟수 (날짜 기준 유니크 count)
        const uniqueDates = new Set(monthly.map((r) => r.date));
        const tripCount = uniqueDates.size;

        setData({ totalCount, topSpecies, tripCount });
      } catch {
        // 로드 실패 시 표시 안 함
      }
    }
    load();
  }, []);

  if (!data) return null;

  const currentMonth = new Date().getMonth() + 1;

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">
          {currentMonth}월 개인 조과 요약
        </h2>
        <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shadow-[0_0_6px_#c9a84c]" />
      </div>

      {/* 3개 항목 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 총 마릿수 */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <Fish size={16} className="text-[#c9a84c]" />
          <span className="text-2xl font-extrabold text-[#c9a84c] gold-glow leading-none">
            {data.totalCount}
          </span>
          <span className="text-[0.45rem] font-thin uppercase tracking-[0.2em] text-white/40">
            총 마릿수
          </span>
        </div>

        {/* 최다 어종 */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <TrendingUp size={16} className="text-[#7dd3fc]" />
          <span className="text-sm font-bold text-[#7dd3fc] blue-glow leading-none truncate max-w-full text-center">
            {data.topSpecies}
          </span>
          <span className="text-[0.45rem] font-thin uppercase tracking-[0.2em] text-white/40">
            최다 어종
          </span>
        </div>

        {/* 출조 횟수 */}
        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <Calendar size={16} className="text-[#c9a84c]" />
          <span className="text-2xl font-extrabold text-white leading-none">
            {data.tripCount}
          </span>
          <span className="text-[0.45rem] font-thin uppercase tracking-[0.2em] text-white/40">
            출조 횟수
          </span>
        </div>
      </div>
    </section>
  );
}
