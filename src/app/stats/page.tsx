"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/appStore";
import { getDataService } from "@/services/dataServiceFactory";
import { CatchRecord, UserStats, PeriodFilter } from "@/types";
import { computeBadges, AchievementBadge } from "@/services/badgeService";
import { analyzeFishingDna, FishingDna } from "@/services/fishingDnaService";
import {
  ArrowLeft,
  Fish,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  Target,
  ChevronRight,
  BarChart3,
  BarChart2,
  Loader2,
  Trophy,
  Dna,
  Compass,
  Clock,
  Wind,
} from "lucide-react";
import { conditionStats } from "@/lib/conditionStats";
import { DynamicIcon } from "@/lib/iconMap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#c9a84c",
  "#7dd3fc",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
];

// Dynamic import for Leaflet (SSR not supported)
const FishingMap = dynamic(() => import("@/components/FishingMap"), {
  ssr: false,
});

const PERIOD_TABS: { value: PeriodFilter; ko: string; en: string }[] = [
  { value: "week", ko: "1주", en: "1W" },
  { value: "month", ko: "1개월", en: "1M" },
  { value: "3months", ko: "3개월", en: "3M" },
  { value: "all", ko: "전체", en: "All" },
];

function MiniStatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: string;
  label: string;
  value: number | string;
  unit: string;
}) {
  return (
    <div className="glass-morphism border border-white/5 flex flex-col gap-1 rounded-xl p-4">
      <p className="text-white/50 text-xs font-medium uppercase tracking-[0.2em]">
        {label}
      </p>
      <p className="text-white text-xl font-bold">
        {value}
        <span className="text-sm ml-0.5 font-normal text-white/60">{unit}</span>
      </p>
      <DynamicIcon name={icon} size={16} className="text-[#c9a84c]" />
    </div>
  );
}

// ===== Calendar Component =====
function CalendarView({
  records,
  locale,
}: {
  records: CatchRecord[];
  locale: string;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, days, firstDay, dateMap } = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = new Date(y, m, 1).getDay();

    // Map: "YYYY-MM-DD" → total catch count
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = r.date;
      map.set(key, (map.get(key) ?? 0) + r.count);
    });

    return {
      year: y,
      month: m,
      days: daysInMonth,
      firstDay: firstDayOfWeek,
      dateMap: map,
    };
  }, [records, monthOffset]);

  const dayLabels =
    locale === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["S", "M", "T", "W", "T", "F", "S"];

  const monthLabel =
    locale === "ko"
      ? `${year}년 ${month + 1}월`
      : new Date(year, month).toLocaleDateString("en", {
          year: "numeric",
          month: "long",
        });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="glass-morphism border border-white/5 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonthOffset((p) => p - 1)}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
        >
          <DynamicIcon
            name="chevron_left"
            size={18}
            className="text-white/50"
          />
        </button>
        <h4 className="text-sm font-bold text-white">{monthLabel}</h4>
        <button
          onClick={() => setMonthOffset((p) => Math.min(p + 1, 0))}
          disabled={monthOffset >= 0}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={18} className="text-white/50" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div
            key={i}
            className={`text-center text-[10px] font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-[#7dd3fc]" : "text-white/60"}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first day offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const catchCount = dateMap.get(dateStr) ?? 0;
          const isToday = dateStr === today;

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                isToday ? "ring-2 ring-[#c9a84c]" : ""
              } ${catchCount > 0 ? "bg-[#c9a84c]/10" : ""}`}
            >
              <span
                className={`font-medium ${isToday ? "text-[#c9a84c] font-bold" : "text-white/60"}`}
              >
                {day}
              </span>
              {catchCount > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(catchCount, 3) }).map(
                    (_, j) => (
                      <div
                        key={j}
                        className="size-1 rounded-full bg-[#c9a84c]"
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-white/60">
        <span className="flex items-center gap-1">
          <div className="size-2 rounded-full bg-[#c9a84c]" />{" "}
          {locale === "ko" ? "출조일" : "Fishing day"}
        </span>
        <span className="flex items-center gap-1">
          <div className="size-2 rounded-full ring-2 ring-[#c9a84c]" />{" "}
          {locale === "ko" ? "오늘" : "Today"}
        </span>
      </div>
    </div>
  );
}

// ===== Badge Component =====
function BadgeCard({
  badge,
  locale,
}: {
  badge: AchievementBadge;
  locale: string;
}) {
  return (
    <div
      className={`glass-morphism rounded-xl p-3 border transition-all ${badge.earned ? "border-[#c9a84c]/30" : "border-white/5 opacity-60"}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-lg flex items-center justify-center ${badge.earned ? "bg-gradient-to-tr from-[#c9a84c] to-[#7dd3fc] text-[#080d14]" : "bg-white/5 text-white/30"}`}
        >
          <DynamicIcon name={badge.icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate">
            {locale === "ko" ? badge.name.ko : badge.name.en}
          </h4>
          <p className="text-[10px] text-white/60 truncate">
            {locale === "ko" ? badge.description.ko : badge.description.en}
          </p>
        </div>
        {badge.earned ? (
          <Award size={20} className="text-[#c9a84c]" aria-hidden="true" />
        ) : (
          <span className="text-[10px] font-bold text-white/60">
            {Math.round(badge.progress * 100)}%
          </span>
        )}
      </div>
      {/* Progress bar */}
      {!badge.earned && (
        <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#c9a84c] to-[#7dd3fc] transition-all"
            style={{ width: `${badge.progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  // 나의 조건표 — DNA/배지처럼 기간 필터와 무관하게 전체 기록 기준
  // (조건별 표본은 많을수록 의미 있어서다).
  const conditionAxes = useMemo(() => conditionStats(records), [records]);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [dna, setDna] = useState<FishingDna | null>(null);
  const [activeTab, setActiveTab] = useState<
    "stats" | "calendar" | "map" | "badges" | "dna"
  >("stats");

  const loadStats = useCallback(async (p: PeriodFilter) => {
    const s = await getDataService().getUserStats(p);
    setStats(s);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats(period);
    getDataService()
      .getCatchRecords()
      .then((r) => {
        setRecords(r);
        setBadges(computeBadges(r));
        setDna(analyzeFishingDna(r));
      });

    // Handle tab routing (e.g., from home AI insight /stats?tab=dna)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam === "dna" ||
      tabParam === "badges" ||
      tabParam === "map" ||
      tabParam === "calendar"
    ) {
      setActiveTab(tabParam);
    }
  }, [period, loadStats]);

  const earnedCount = badges.filter((b) => b.earned).length;

  const TAB_DESCRIPTIONS: Record<string, string> = {
    stats: "기간별 조과 통계 · 어종 분포 · 기록 트렌드",
    dna: "내 낚시 스타일 · 선호 어종 · 패턴 분석",
    map: "조과 위치 지도 · 포인트 히트맵",
    calendar: "날짜별 조과 달력 · 출조 히스토리",
    badges: "업적 배지 달성 현황 · 목표까지 진행률",
  };

  const tabs = [
    {
      key: "stats" as const,
      icon: "bar_chart",
      label: locale === "ko" ? "통계" : "Stats",
    },
    {
      key: "dna" as const,
      icon: "genetics",
      label: locale === "ko" ? "DNA" : "DNA",
    },
    {
      key: "map" as const,
      icon: "map",
      label: locale === "ko" ? "지도" : "Map",
    },
    {
      key: "calendar" as const,
      icon: "calendar_month",
      label: locale === "ko" ? "캘린더" : "Calendar",
    },
    {
      key: "badges" as const,
      icon: "military_tech",
      label:
        locale === "ko"
          ? `배지 ${earnedCount}/${badges.length}`
          : `Badges ${earnedCount}/${badges.length}`,
    },
  ];

  if (!stats) return null;

  return (
    <div className="page-enter relative z-10 pb-32 min-h-dvh bg-[#080d14] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-[#080d14]/60 backdrop-blur-xl p-4 pb-2 justify-between border-b border-white/5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full" />
        <h1 className="text-white text-lg font-bold leading-tight tracking-[0.1em] uppercase flex-1 text-center">
          {t("stats.title")}
          <BarChart3
            size={16}
            className="text-[#c9a84c] ml-1 inline align-middle"
            aria-hidden="true"
          />
        </h1>
        <div className="flex w-10 items-center justify-end" />
      </header>

      {/* Tab bar */}
      <div className="px-4 pt-3">
        <div className="flex h-10 items-center rounded-xl bg-white/5 border border-white/10 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex cursor-pointer h-full grow items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-[#c9a84c] text-[#080d14] shadow-sm"
                  : "text-white/60"
              }`}
            >
              <DynamicIcon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        {/* Tab description */}
        <p className="text-[10px] text-white/30 text-center mt-1.5 px-4">
          {TAB_DESCRIPTIONS[activeTab]}
        </p>
      </div>

      <div className="flex-1">
        {activeTab === "stats" && (
          <>
            {/* Period filter */}
            <div className="px-4 py-3">
              <div className="flex h-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 p-1">
                {PERIOD_TABS.map((tab) => (
                  <label
                    key={tab.value}
                    className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-semibold transition-all ${
                      period === tab.value
                        ? "bg-[#c9a84c] text-[#080d14] shadow-sm"
                        : "text-white/60"
                    }`}
                  >
                    <span className="truncate">
                      {locale === "ko" ? tab.ko : tab.en}
                    </span>
                    <input
                      className="hidden"
                      name="period"
                      type="radio"
                      value={tab.value}
                      checked={period === tab.value}
                      onChange={() => setPeriod(tab.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* 2x2 stat grid */}
            <section className="grid grid-cols-2 gap-3 px-4 py-2">
              <MiniStatCard
                icon="calendar_month"
                label={t("stats.totalTrips")}
                value={stats.totalTrips}
                unit={t("stats.unit.trips")}
              />
              <MiniStatCard
                icon="set_meal"
                label={t("stats.totalCatch")}
                value={stats.totalCatch}
                unit={t("stats.unit.fish")}
              />
              <MiniStatCard
                icon="bar_chart"
                label={t("stats.avgCatch")}
                value={stats.avgCatchPerTrip}
                unit={t("stats.unit.fishPerTrip")}
              />
              <MiniStatCard
                icon="straighten"
                label={t("stats.maxSize")}
                value={stats.maxSizeCm}
                unit={t("stats.unit.cm")}
              />
            </section>

            {/* Monthly trend chart */}
            <section className="mt-6 px-4">
              <h3 className="text-white/50 text-base font-bold mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                {t("stats.monthlyTrend")}
                <TrendingUp size={16} className="text-[#c9a84c]" />
              </h3>
              <div className="glass-morphism border border-white/5 p-4 rounded-xl h-48">
                {stats.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f141b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#ffffff",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name={locale === "ko" ? "마릿수" : "Count"}
                        radius={[6, 6, 0, 0]}
                      >
                        {stats.monthlyTrend.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill="url(#barGradient)"
                          />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient
                          id="barGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#c9a84c" />
                          <stop offset="100%" stopColor="#7dd3fc" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <BarChart2 size={36} className="text-[#c9a84c]/40" />
                    <p className="text-sm font-bold text-white/60">
                      {locale === "ko"
                        ? "아직 기록이 없습니다"
                        : "No records yet"}
                    </p>
                    <p className="text-xs text-white/30">
                      {locale === "ko"
                        ? "기록을 추가하면 통계가 나타납니다"
                        : "Add a catch to see stats"}
                    </p>
                    <Link
                      href="/record"
                      className="mt-1 px-5 py-2 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#c9a84c]/10 transition-colors"
                    >
                      {locale === "ko" ? "기록하기" : "Add Record"}
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Species donut */}
            <section className="mt-8 px-4">
              <h3 className="text-white/50 text-base font-bold mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                {t("stats.speciesRatio")}
                <Target size={16} className="text-[#c9a84c]" />
              </h3>
              <div className="glass-morphism border border-white/5 p-4 rounded-xl">
                {stats.speciesBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={stats.speciesBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="species"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {stats.speciesBreakdown.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value: string) => (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.5)",
                            }}
                          >
                            {value}
                          </span>
                        )}
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [
                          `${value}${locale === "ko" ? "마리" : ""}`,
                          name,
                        ]}
                        contentStyle={{
                          background: "#0f141b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#ffffff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <BarChart2 size={36} className="text-[#c9a84c]/40" />
                    <p className="text-sm font-bold text-white/60">
                      {locale === "ko"
                        ? "아직 기록이 없습니다"
                        : "No records yet"}
                    </p>
                    <p className="text-xs text-white/30">
                      {locale === "ko"
                        ? "기록을 추가하면 통계가 나타납니다"
                        : "Add a catch to see stats"}
                    </p>
                    <Link
                      href="/record"
                      className="mt-1 px-5 py-2 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#c9a84c]/10 transition-colors"
                    >
                      {locale === "ko" ? "기록하기" : "Add Record"}
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Top spots */}
            <section className="mt-8 px-4 mb-8">
              <h3 className="text-white/50 text-base font-bold mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                {t("stats.topSpots")}
                <MapPin size={16} className="text-[#c9a84c]" />
              </h3>
              <div className="space-y-3">
                {stats.topSpots.length > 0 ? (
                  stats.topSpots.map((spot, i) => (
                    <div
                      key={spot.spot.name}
                      className="glass-morphism border border-white/5 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="size-10 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center font-bold text-[#c9a84c]">
                        {i === 0 ? <Trophy size={16} /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-[#c9a84c]" />
                          <h4 className="text-sm font-bold text-white">
                            {spot.spot.name}
                          </h4>
                        </div>
                        <p className="text-[10px] text-white/60">
                          {spot.visits}
                          {t("stats.visits")} · {spot.totalCatch}
                          {t("stats.caught")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <BarChart2 size={36} className="text-[#c9a84c]/40" />
                    <p className="text-sm font-bold text-white/60">
                      {locale === "ko"
                        ? "아직 기록이 없습니다"
                        : "No records yet"}
                    </p>
                    <p className="text-xs text-white/30">
                      {locale === "ko"
                        ? "기록을 추가하면 통계가 나타납니다"
                        : "Add a catch to see stats"}
                    </p>
                    <Link
                      href="/record"
                      className="mt-1 px-5 py-2 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#c9a84c]/10 transition-colors"
                    >
                      {locale === "ko" ? "기록하기" : "Add Record"}
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* 나의 조건표 (3차 GOAL-3) — 기록에 저장된 기온·풍속·물때를
                구간별 평균 마릿수로. 표본 부족 축은 정직하게 빈 상태. */}
            <section className="mt-2 px-4 mb-8" data-testid="condition-table">
              <h3 className="text-white/50 text-base font-bold mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                {locale === "ko" ? "나의 조건표" : "My Conditions"}
                <Wind size={16} className="text-[#7dd3fc]" />
              </h3>
              <div className="space-y-3">
                {conditionAxes.map((axis) => (
                  <div
                    key={axis.key}
                    className="glass-morphism border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                        {axis.name}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {axis.sampled > 0
                          ? `표본 ${axis.sampled}회`
                          : ""}
                      </span>
                    </div>
                    {axis.best ? (
                      <>
                        <p className="text-sm font-bold text-white">
                          {axis.best.label}
                          <span className="text-[#7dd3fc]">
                            {" "}
                            평균 {axis.best.avgCount}마리
                          </span>
                          <span className="text-white/35 text-xs font-normal">
                            {" "}
                            ({axis.best.records}회)
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {axis.buckets.map((b) => (
                            <span
                              key={b.label}
                              className={`text-[10px] px-2 py-1 rounded-lg border ${
                                b.label === axis.best!.label
                                  ? "bg-[#7dd3fc]/15 border-[#7dd3fc]/40 text-[#7dd3fc] font-semibold"
                                  : "bg-white/4 border-white/8 text-white/50"
                              }`}
                            >
                              {b.label} · {b.avgCount}마리/{b.records}회
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-white/35">
                        {locale === "ko"
                          ? "기록이 쌓이면 이 조건에서의 내 평균이 나타나요 (구간당 3회 이상)"
                          : "Log more catches to see your averages (3+ per bucket)"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "calendar" && (
          <section className="px-4 py-4">
            <CalendarView records={records} locale={locale} />
            {/* Recent trips from calendar */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-white/50 mb-2 flex items-center gap-1 uppercase tracking-[0.2em]">
                <Clock size={14} className="text-[#c9a84c]" />
                {locale === "ko" ? "최근 출조" : "Recent Trips"}
              </h3>
              <div className="space-y-2">
                {records.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/records/detail?id=${r.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="size-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
                      <Fish size={14} className="text-[#c9a84c]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {r.species}{" "}
                        {r.sizeCm
                          ? `${r.sizeCm}cm`
                          : `${r.count}${locale === "ko" ? "마리" : ""}`}
                      </p>
                      <p className="text-[10px] text-white/60">
                        {r.date} · {r.location.name}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "map" && (
          <section className="px-4 py-4">
            <FishingMap records={records} locale={locale} height="400px" />
          </section>
        )}

        {activeTab === "badges" && (
          <section className="px-4 py-4">
            {/* Summary */}
            <div className="glass-morphism border border-white/5 rounded-xl p-4 mb-4 text-center">
              <div className="text-3xl font-black text-[#c9a84c] gold-glow">
                {earnedCount}
                <span className="text-lg text-white/60">/{badges.length}</span>
              </div>
              <p className="text-xs text-white/60 mt-1">
                {locale === "ko" ? "달성한 배지" : "Badges Earned"}
              </p>
            </div>
            {/* Badge grid */}
            <div className="space-y-3">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {activeTab === "dna" && (
          <section className="px-4 py-4">
            {dna ? (
              <div className="space-y-4">
                {/* Archetype hero card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 via-[#0f141b] to-[#7dd3fc]/10 border border-[#c9a84c]/30 p-6 text-white shadow-xl">
                  <div className="absolute -right-6 -top-6 opacity-10">
                    <DynamicIcon
                      name="biotech"
                      size={120}
                      className="text-[#c9a84c]"
                    />
                  </div>
                  <p className="text-xs font-medium text-[#c9a84c]/70 mb-1 uppercase tracking-[0.2em]">
                    {locale === "ko" ? "나의 낚시 DNA" : "My Fishing DNA"}
                  </p>
                  <h2 className="text-2xl font-black mb-1 text-[#c9a84c] gold-glow">
                    {locale === "ko" ? dna.archetypeKo : dna.archetypeEn}
                    {/* 아키타입도 같은 시간 표본에서 나오므로, 저장 시각
                        폴백이 섞였으면 여기에도 추정임을 밝힌다. */}
                    {dna.timeSlotEstimated && (
                      <span className="text-sm font-semibold text-white/40 align-middle">
                        {" "}
                        ({locale === "ko" ? "추정" : "est."})
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-white/60">
                    {dna.totalRecords}
                    {locale === "ko"
                      ? "개 조과 기반 분석 결과"
                      : " records analyzed"}
                  </p>
                </div>

                {/* DNA stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-morphism border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-[#c9a84c]" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                        {locale === "ko" ? "최고 시간대" : "Best Time"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {dna.bestTimeSlot}
                    </p>
                    <p className="text-xs text-[#c9a84c] font-semibold">
                      {dna.bestTimePercent}%
                      {dna.timeSlotEstimated && (
                        <span className="text-white/35 font-normal">
                          {" "}
                          · {locale === "ko" ? "일부 추정" : "partly est."}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="glass-morphism border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Fish size={16} className="text-[#7dd3fc]" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                        {locale === "ko" ? "최다 어종" : "Top Species"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {dna.topSpecies}
                    </p>
                    <p className="text-xs text-[#7dd3fc] font-semibold">
                      {dna.topSpeciesCount}
                      {locale === "ko" ? "마리" : ""}
                    </p>
                  </div>
                  <div className="glass-morphism border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-[#7dd3fc]" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                        {locale === "ko" ? "단골 포인트" : "Top Spot"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">
                      {dna.topLocation}
                    </p>
                    <p className="text-xs text-[#7dd3fc] font-semibold">
                      {dna.topLocationVisits}
                      {locale === "ko" ? "회 방문" : " visits"}
                    </p>
                  </div>
                  <div className="glass-morphism border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-[#c9a84c]" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                        {locale === "ko" ? "최고의 달" : "Best Month"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {dna.bestMonth}
                      {locale === "ko" ? "월" : ""}
                    </p>
                    <p className="text-xs text-[#c9a84c] font-semibold">
                      {dna.bestMonthCount}
                      {locale === "ko" ? "마리" : ""}
                    </p>
                  </div>
                </div>

                {/* Extra insights */}
                <div className="space-y-3">
                  {dna.bestTide && (
                    <div className="glass-morphism border border-white/5 rounded-xl p-4 flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-[#7dd3fc]/10 flex items-center justify-center">
                        <DynamicIcon
                          name="waves"
                          size={16}
                          className="text-[#7dd3fc]"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                          {locale === "ko" ? "황금 물때" : "Golden Tide"}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {dna.bestTide}
                        </p>
                      </div>
                    </div>
                  )}
                  {dna.avgSizeCm && (
                    <div className="glass-morphism border border-white/5 rounded-xl p-4 flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
                        <DynamicIcon
                          name="straighten"
                          size={16}
                          className="text-[#c9a84c]"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.1em]">
                          {locale === "ko" ? "평균 사이즈" : "Avg Size"}
                        </p>
                        <p className="text-sm font-bold text-white">
                          {dna.avgSizeCm}cm
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-4 flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-[#c9a84c]/20 flex items-center justify-center shrink-0">
                      <DynamicIcon
                        name="lightbulb"
                        size={16}
                        className="text-[#c9a84c]"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#c9a84c] uppercase tracking-[0.1em]">
                        {locale === "ko" ? "개선 포인트" : "Improvement Tip"}
                      </p>
                      <p className="text-sm text-white/70">
                        {locale === "ko" ? dna.weaknessKo : dna.weaknessEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center size-20 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 mb-4">
                  <Dna size={36} className="text-[#c9a84c]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {locale === "ko"
                    ? "조과 5개 이상 등록하면"
                    : "Record 5+ catches to"}
                </h3>
                <p className="text-sm text-white/60">
                  {locale === "ko"
                    ? "나만의 낚시 DNA를 분석해 드려요"
                    : "unlock your Fishing DNA"}
                </p>
                <p className="text-xs text-white/20 mt-2">
                  {locale === "ko"
                    ? `현재 ${records.length}개`
                    : `Current: ${records.length}`}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
