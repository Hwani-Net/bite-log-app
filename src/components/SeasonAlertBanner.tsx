"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { getClosedSpecies, FISH_REGULATION_DB } from "@/data/fishRegulationDB";

interface AlertItem {
  type: "closed" | "soon";
  species: string;
  daysUntil?: number;
  endDate?: string;
  startDate?: string;
}

function parseMD(str: string): { month: number; day: number } {
  const [m, d] = str.split("/").map(Number);
  return { month: m, day: d };
}

function toDateNum(month: number, day: number): number {
  return month * 100 + day;
}

export default function SeasonAlertBanner() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 현재 금어기 중인 어종
  const closedNow = getClosedSpecies(month, day);

  // 30일 후까지 금어기 시작 어종 (현재 금어기 제외)
  const soon30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const soonMonth = soon30.getMonth() + 1;
  const soonDay = soon30.getDate();
  const todayNum = toDateNum(month, day);
  const soonNum = toDateNum(soonMonth, soonDay);

  const comingSoon = FISH_REGULATION_DB.filter((r) => {
    if (!r.closedSeason) return false;
    // 이미 금어기 중이면 제외
    if (closedNow.some((c) => c.species === r.species)) return false;
    const { month: sm, day: sd } = parseMD(r.closedSeason.start);
    const startNum = toDateNum(sm, sd);
    // 연도 내 금어기: startNum이 오늘 이후이고 30일 이내
    // 연도 걸침 없음 조건 적용: soonNum >= todayNum 분기
    if (soonNum >= todayNum) {
      return startNum > todayNum && startNum <= soonNum;
    } else {
      // 12월 말 ~ 1월 초 크로스오버 (연도 내 금어기이므로 이 케이스는 드묾)
      return startNum > todayNum || startNum <= soonNum;
    }
  });

  // 가장 임박한 1개만 표시: 우선순위 = 금어기 중 > 곧 금어기
  let alert: AlertItem | null = null;

  if (closedNow.length > 0) {
    const target = closedNow[0];
    const { month: em, day: ed } = parseMD(target.closedSeason!.end);
    alert = {
      type: "closed",
      species: target.species,
      endDate: `${em}/${ed}`,
    };
  } else if (comingSoon.length > 0) {
    // 가장 빨리 시작하는 어종
    const sorted = comingSoon.sort((a, b) => {
      const { month: am, day: ad } = parseMD(a.closedSeason!.start);
      const { month: bm, day: bd } = parseMD(b.closedSeason!.start);
      return toDateNum(am, ad) - toDateNum(bm, bd);
    });
    const target = sorted[0];
    const { month: sm, day: sd } = parseMD(target.closedSeason!.start);
    const startDate = new Date(today.getFullYear(), sm - 1, sd);
    const diffMs = startDate.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    alert = {
      type: "soon",
      species: target.species,
      daysUntil,
      startDate: `${sm}/${sd}`,
    };
  }

  if (!alert) return null;

  if (alert.type === "closed") {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 flex items-center gap-3">
        <AlertTriangle size={16} className="text-red-400 shrink-0" />
        <p className="text-[0.7rem] font-medium text-red-400 leading-relaxed">
          <span className="font-bold">{alert.species}</span> 금어기 중
          {alert.endDate && (
            <span className="font-normal text-red-400/70">
              {" "}
              (해제: {alert.endDate})
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-3">
      <Clock size={16} className="text-amber-400 shrink-0" />
      <p className="text-[0.7rem] font-medium text-amber-400 leading-relaxed">
        <span className="font-bold">{alert.species}</span> 금어기{" "}
        <span className="font-bold">D-{alert.daysUntil}</span>
        {alert.startDate && (
          <span className="font-normal text-amber-400/70">
            {" "}
            ({alert.startDate} 시작)
          </span>
        )}
      </p>
    </div>
  );
}
