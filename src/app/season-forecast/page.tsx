"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import {
  FISH_SEASON_DB,
  type FishSeasonData,
  type Region,
  type ReleaseSite,
  getTotalRelease,
  sortByCurrentSeason,
  getSeasonStatus,
  filterByRegion,
} from "@/data/fishSeasonDB";
import { useAppStore } from "@/store/appStore";
import BottomNav from "@/components/BottomNav";

const REGION_TABS: { label: string; value: Region | "전국" }[] = [
  { label: "전국", value: "전국" },
  { label: "서해", value: "서해" },
  { label: "남해", value: "남해" },
  { label: "동해", value: "동해" },
];

const STATUS_CONFIG = {
  gold: {
    label: "🔥 황금 시즌",
    bg: "bg-[#c9a84c]/10 border-[#c9a84c]/40",
    text: "text-[#c9a84c]",
    badge: "bg-[#c9a84c]",
  },
  peak: {
    label: "🎣 피크 시즌",
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    badge: "bg-green-500",
  },
  closed: {
    label: "🚫 금어기",
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500",
  },
  offseason: {
    label: "⏳ 비수기",
    bg: "bg-white/5 border-white/10",
    text: "text-white/60",
    badge: "bg-white/20",
  },
};

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 10000).toFixed(0)}만`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`.replace(".0만", "만");
  return n.toLocaleString();
}

function MonthBar({
  peakMonths,
  goldMonths,
  closedSeason,
}: {
  peakMonths: number[];
  goldMonths: number[];
  closedSeason: FishSeasonData["closedSeason"];
}) {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const now = new Date().getMonth() + 1;

  function getMonthColor(m: number) {
    if (closedSeason) {
      const [startM] = closedSeason.start.split("/").map(Number);
      const [endM] = closedSeason.end.split("/").map(Number);
      if (m >= startM && m <= endM) return "bg-red-400/60";
    }
    if (goldMonths.includes(m)) return "bg-[#c9a84c]";
    if (peakMonths.includes(m)) return "bg-green-400";
    return "bg-white/10";
  }

  return (
    <div className="flex gap-0.5 items-end">
      {months.map((m) => (
        <div key={m} className="flex flex-col items-center gap-0.5 flex-1">
          {m === now && <div className="w-1 h-1 rounded-full bg-[#7dd3fc]" />}
          <div
            className={`w-full h-2 rounded-sm ${getMonthColor(m)} ${m === now ? "ring-1 ring-[#7dd3fc] ring-offset-1 ring-offset-[#0f141b]" : ""}`}
          />
          <span
            className={`text-[8px] ${m === now ? "text-[#7dd3fc] font-bold" : "text-white/30"}`}
          >
            {m}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReleaseSiteRow({ site }: { site: ReleaseSite }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-white/80">{site.city}</span>
        <span className="text-[10px] text-white/60">{site.region}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#c9a84c]">
          {formatCount(site.count)}마리
        </span>
        <span className="text-[10px] text-white/60">
          {site.months.map((m) => `${m}월`).join("·")}
        </span>
      </div>
    </div>
  );
}

function FishCard({
  data,
  regionFilter,
}: {
  data: FishSeasonData;
  regionFilter: Region | "전국";
}) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const status = getSeasonStatus(data, month, day);
  const config = STATUS_CONFIG[status];
  const total = getTotalRelease(data);
  const sites =
    regionFilter === "전국"
      ? data.releaseSites
      : filterByRegion(data, regionFilter as Region);
  const filteredTotal = sites.reduce((sum, s) => sum + s.count, 0);
  const cityCount = new Set(sites.map((s) => s.city)).size;

  return (
    <div
      className={`rounded-2xl border ${config.bg} overflow-hidden transition-all`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.image}
          alt={data.species}
          className="w-12 h-12 rounded-full object-cover border-2 border-white/20 shadow-sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{data.species}</span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full text-[#080d14] font-bold ${config.badge}`}
            >
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-white/50">
              피크 {data.peakFishingMonths.map((m) => `${m}월`).join("·")}
            </span>
            <span className="text-[10px] text-white/20">|</span>
            <span className="text-xs text-white/50">
              {cityCount}개 지역 · {formatCount(filteredTotal)}마리
            </span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className="text-white/30 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "" }}
        />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Month bar */}
          <div>
            <p className="text-[10px] text-white/60 mb-1 flex items-center gap-2">
              <span>시즌 캘린더</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#c9a84c] inline-block" />{" "}
                황금
                <span className="w-2 h-2 rounded-sm bg-green-400 inline-block" />{" "}
                피크
                {data.closedSeason && (
                  <>
                    <span className="w-2 h-2 rounded-sm bg-red-400/60 inline-block" />{" "}
                    금어기
                  </>
                )}
              </span>
            </p>
            <MonthBar
              peakMonths={data.peakFishingMonths}
              goldMonths={data.goldFishingMonths}
              closedSeason={data.closedSeason}
            />
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">
              🌊 서식수심 {data.habitatDepth}
            </span>
            {data.closedSeason && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                ⛔ 금어기 {data.closedSeason.start}~{data.closedSeason.end}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">
              📊 총 방류 {formatCount(total)}마리
            </span>
          </div>

          {/* Release sites table */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">
              📍 지역별 방류 계획 ({sites[0]?.year || 2025}년 기준)
            </p>
            <div>
              {sites.length > 0 ? (
                sites
                  .sort((a, b) => b.count - a.count)
                  .map((site, i) => (
                    <ReleaseSiteRow key={`${site.city}-${i}`} site={site} />
                  ))
              ) : (
                <p className="text-xs text-white/60 text-center py-2">
                  이 해역의 방류 계획이 없습니다
                </p>
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
  const [regionFilter, setRegionFilter] = useState<Region | "전국">("전국");
  const month = new Date().getMonth() + 1;

  const sorted = useMemo(() => {
    const filtered =
      regionFilter === "전국"
        ? FISH_SEASON_DB
        : FISH_SEASON_DB.filter((d) =>
            d.releaseSites.some(
              (s) => s.region === regionFilter || s.region === "전국",
            ),
          );
    return sortByCurrentSeason(filtered, month);
  }, [regionFilter, month]);

  const isKo = locale === "ko";

  return (
    <main className="mx-auto max-w-md min-h-screen bg-[#080d14] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-white/50 flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1
                className="text-base font-bold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {isKo ? "시즌 예측" : "Season Forecast"}
              </h1>
              <p className="text-[10px] text-white/60">
                {isKo
                  ? "치어 방류 계획 기반 · 5개 어종"
                  : "Based on fry release plans · 5 species"}
              </p>
            </div>
          </div>

          {/* Region tabs */}
          <div className="flex gap-1.5 mt-3">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRegionFilter(tab.value)}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  regionFilter === tab.value
                    ? "bg-[#c9a84c] text-[#080d14] shadow-sm"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
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
        {sorted.map((data) => (
          <FishCard
            key={data.species}
            data={data}
            regionFilter={regionFilter}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-4 pt-6">
        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          {isKo
            ? "※ 한국수산자원공단 방류계획 기준. 실제 조과는 기상·수온·조류에 따라 달라질 수 있습니다."
            : "※ Based on FIRA release plans. Actual conditions may vary."}
        </p>
      </div>

      <BottomNav />
    </main>
  );
}
