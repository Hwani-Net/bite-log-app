"use client";

import { useMemo } from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  FISH_REGULATION_DB,
  getClosedSpecies,
  FishRegulation,
} from "@/data/fishRegulationDB";

const MAX_DISPLAY = 5;

function formatDate(dateStr: string): string {
  // "5/1" -> "5/1"
  return dateStr;
}

function getEndDate(reg: FishRegulation): string {
  return reg.closedSeason ? formatDate(reg.closedSeason.end) : "";
}

function getStartDate(reg: FishRegulation): string {
  return reg.closedSeason ? formatDate(reg.closedSeason.start) : "";
}

function SpeciesList({
  items,
  suffix,
}: {
  items: { name: string; date: string }[];
  suffix: (d: string) => string;
}) {
  const visible = items.slice(0, MAX_DISPLAY);
  const rest = items.length - MAX_DISPLAY;

  return (
    <p className="text-xs text-white/70 mt-1 leading-relaxed">
      {visible.map((item, i) => (
        <span key={item.name}>
          {i > 0 && <span className="text-white/30 mx-1">•</span>}
          <span className="font-medium text-white/90">{item.name}</span>
          {item.date && (
            <span className="text-white/40 ml-0.5 text-[10px]">
              ({suffix(item.date)})
            </span>
          )}
        </span>
      ))}
      {rest > 0 && <span className="text-white/30 ml-1">외 {rest}종</span>}
    </p>
  );
}

export default function SafeZoneBanner() {
  const { currentlyClosed, soonStart, soonEnd } = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    // 7일 후
    const laterDate = new Date(now);
    laterDate.setDate(laterDate.getDate() + 7);
    const laterM = laterDate.getMonth() + 1;
    const laterD = laterDate.getDate();

    // 7일 전
    const prevDate = new Date(now);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevM = prevDate.getMonth() + 1;
    const prevD = prevDate.getDate();

    const closedNow = getClosedSpecies(m, d);
    const closedLater = getClosedSpecies(laterM, laterD);
    const closedPrev = getClosedSpecies(prevM, prevD);

    const closedNowNames = new Set(closedNow.map((r) => r.species));
    const closedLaterNames = new Set(closedLater.map((r) => r.species));
    const closedPrevNames = new Set(closedPrev.map((r) => r.species));

    // 곧 시작: 7일 후에는 금어기이지만 지금은 아닌 어종
    const soonStartList = FISH_REGULATION_DB.filter(
      (r) =>
        r.closedSeason &&
        !closedNowNames.has(r.species) &&
        closedLaterNames.has(r.species),
    );

    // 곧 종료: 7일 전에는 금어기였지만 지금은 아닌 어종 (= 최근 해제)
    // 더 직관적인 해석: 현재 금어기 + 7일 후 해제 → "7일 내 해제 예정"
    const soonEndList = closedNow.filter(
      (r) => !closedLaterNames.has(r.species),
    );

    return {
      currentlyClosed: closedNow,
      soonStart: soonStartList,
      soonEnd: soonEndList,
    };
  }, []);

  const hasAny =
    currentlyClosed.length > 0 || soonStart.length > 0 || soonEnd.length > 0;

  if (!hasAny) {
    return (
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-emerald-300">
            현재 금어기 어종이 없습니다
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {/* 금어기 중 */}
      {currentlyClosed.length > 0 && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={16} className="text-red-400 shrink-0" />
            <span className="text-xs font-bold text-red-300 uppercase tracking-[0.15em]">
              금어기 중 ({currentlyClosed.length}종)
            </span>
          </div>
          <SpeciesList
            items={currentlyClosed.map((r) => ({
              name: r.species,
              date: getEndDate(r),
            }))}
            suffix={(d) => `${d} 해제`}
          />
        </div>
      )}

      {/* 7일 내 금어기 시작 */}
      {soonStart.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-[0.15em]">
              7일 내 금어기 시작 ({soonStart.length}종)
            </span>
          </div>
          <SpeciesList
            items={soonStart.map((r) => ({
              name: r.species,
              date: getStartDate(r),
            }))}
            suffix={(d) => `${d}부터`}
          />
        </div>
      )}

      {/* 7일 내 금어기 해제 */}
      {soonEnd.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-[0.15em]">
              7일 내 금어기 해제 ({soonEnd.length}종)
            </span>
          </div>
          <SpeciesList
            items={soonEnd.map((r) => ({
              name: r.species,
              date: getEndDate(r),
            }))}
            suffix={(d) => `${d} 해제`}
          />
        </div>
      )}
    </section>
  );
}
