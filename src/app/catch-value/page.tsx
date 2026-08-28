"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowUpDown,
  ArrowDownUp,
  AlignLeft,
} from "lucide-react";
import {
  fetchCatchValue,
  type FishPrice,
  type CatchValueData,
} from "@/services/catchValueService";

type SortMode = "price" | "trend" | "name";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

function TrendIcon({ trend }: { trend: FishPrice["trend"] }) {
  if (trend === "up")
    return <TrendingUp size={14} className="text-red-400 shrink-0" />;
  if (trend === "down")
    return <TrendingDown size={14} className="text-blue-400 shrink-0" />;
  return <Minus size={14} className="text-white/30 shrink-0" />;
}

function TrendLabel({
  trend,
  pct,
}: {
  trend: FishPrice["trend"];
  pct: number;
}) {
  if (trend === "flat")
    return <span className="text-xs text-white/30">보합</span>;
  const color = trend === "up" ? "text-red-400" : "text-blue-400";
  const sign = trend === "up" ? "+" : "";
  return (
    <span className={`text-xs font-bold ${color}`}>
      {sign}
      {pct.toFixed(1)}%
    </span>
  );
}

function PriceBar({
  priceMin,
  priceMax,
  priceAvg,
}: {
  priceMin: number;
  priceMax: number;
  priceAvg: number;
}) {
  const range = priceMax - priceMin;
  const avgPct = range > 0 ? ((priceAvg - priceMin) / range) * 100 : 50;

  return (
    <div className="relative h-1.5 bg-white/10 rounded-full mt-2">
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#c9a84c] border-2 border-[#0e1823] shadow"
        style={{ left: `calc(${avgPct}% - 5px)` }}
      />
    </div>
  );
}

function PriceCard({ fish }: { fish: FishPrice }) {
  return (
    <div className="bg-[#0e1823] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {fish.species}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            최저 {formatPrice(fish.priceMin)} ~ 최고{" "}
            {formatPrice(fish.priceMax)}원
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TrendIcon trend={fish.trend} />
          <TrendLabel trend={fish.trend} pct={fish.trendPct} />
        </div>
      </div>

      <div className="mt-2">
        <span className="text-base font-bold text-[#c9a84c]">
          {formatPrice(fish.priceAvg)}원
        </span>
        <span className="text-xs text-white/30 ml-1">/{fish.unit}</span>
      </div>

      <PriceBar
        priceMin={fish.priceMin}
        priceMax={fish.priceMax}
        priceAvg={fish.priceAvg}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0e1823] rounded-2xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-white/5 rounded w-24" />
          <div className="h-3 bg-white/5 rounded w-40" />
        </div>
        <div className="h-4 bg-white/5 rounded w-12" />
      </div>
      <div className="h-5 bg-white/5 rounded w-28 mt-3" />
      <div className="h-1.5 bg-white/5 rounded-full mt-3" />
    </div>
  );
}

export default function CatchValuePage() {
  const [data, setData] = useState<CatchValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("price");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCatchValue().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.prices;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => p.species.toLowerCase().includes(q));
    }
    if (sortMode === "price") {
      list = [...list].sort((a, b) => b.priceAvg - a.priceAvg);
    } else if (sortMode === "trend") {
      list = [...list].sort(
        (a, b) => Math.abs(b.trendPct) - Math.abs(a.trendPct),
      );
    } else {
      list = [...list].sort((a, b) => a.species.localeCompare(b.species, "ko"));
    }
    return list;
  }, [data, sortMode, searchQuery]);

  const summary = useMemo(() => {
    if (!data) return { up: 0, down: 0, flat: 0 };
    const list = data.prices;
    return {
      up: list.filter((p) => p.trend === "up").length,
      down: list.filter((p) => p.trend === "down").length,
      flat: list.filter((p) => p.trend === "flat").length,
    };
  }, [data]);

  const sortOptions: {
    mode: SortMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { mode: "price", label: "가격순", icon: <ArrowDownUp size={12} /> },
    { mode: "trend", label: "상승률순", icon: <ArrowUpDown size={12} /> },
    { mode: "name", label: "어종명순", icon: <AlignLeft size={12} /> },
  ];

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-3 bg-[#080d14]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <Link
          href="/regulations"
          className="size-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0"
        >
          <ArrowLeft size={20} className="text-white/50" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white">수산물 시세</h1>
          <p className="text-[10px] text-white/30">수협 위판 데이터 기준</p>
        </div>
        {data && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
              data.isLive
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-[#c9a84c]/10 border-[#c9a84c]/20 text-[#c9a84c]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${data.isLive ? "bg-green-400 animate-pulse" : "bg-[#c9a84c]"}`}
            />
            {data.isLive ? "실시간" : "모의데이터"}
          </div>
        )}
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Mock data banner */}
        {data && !data.isLive && (
          <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl px-4 py-3">
            <p className="text-xs text-[#c9a84c] font-semibold">
              현재 모의 데이터입니다. 수협 API 연동 후 실시간 제공됩니다.
            </p>
          </div>
        )}

        {/* Summary cards */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0e1823] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={14} className="text-red-400" />
                <span className="text-xs text-red-400 font-bold">상승</span>
              </div>
              <p className="text-xl font-bold text-white">{summary.up}</p>
              <p className="text-[10px] text-white/30">종</p>
            </div>
            <div className="bg-[#0e1823] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown size={14} className="text-blue-400" />
                <span className="text-xs text-blue-400 font-bold">하락</span>
              </div>
              <p className="text-xl font-bold text-white">{summary.down}</p>
              <p className="text-[10px] text-white/30">종</p>
            </div>
            <div className="bg-[#0e1823] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Minus size={14} className="text-white/30" />
                <span className="text-xs text-white/30 font-bold">보합</span>
              </div>
              <p className="text-xl font-bold text-white">{summary.flat}</p>
              <p className="text-[10px] text-white/30">종</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="어종명 검색 (예: 감성돔, 전복)"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#c9a84c]/50 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setSortMode(opt.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                sortMode === opt.mode
                  ? "bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Price list */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((fish) => (
                <PriceCard key={fish.species} fish={fish} />
              ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-white/30">
                검색 결과가 없습니다
              </p>
              <p className="text-xs text-white/20 mt-1">
                어종 이름을 확인해 주세요
              </p>
            </div>
          )}
        </div>

        {/* Footer notice */}
        <div className="space-y-2 pb-2">
          <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
            <p className="text-[10px] text-white/40">
              {data?.isLive
                ? "수협 API 실시간"
                : "수협 위판 데이터 기준 (모의 데이터)"}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              데이터 오차가 있을 수 있습니다. 실거래 전 확인 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
