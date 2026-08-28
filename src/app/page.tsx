"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDataService } from "@/services/dataServiceFactory";
import { CatchRecord } from "@/types";
import { fetchTideData } from "@/services/tideService";
import { fetchWeather } from "@/services/weatherService";
import { fetchMarineData } from "@/services/marineService";
import {
  calculateBiteTime,
  BiteTimePrediction,
} from "@/services/biteTimeService";
import { getSpeciesBiteScores } from "@/services/speciesBiteService";
import { fetchTopNews, FishingNewsItem } from "@/services/fishingNewsService";
import {
  analyzeUserRecords,
  UserFishingProfile,
} from "@/services/personalizationService";
import {
  Bell,
  Fish,
  Wind,
  Newspaper,
  Users,
  PenLine,
  Trophy,
  CalendarDays,
  Map,
  ChevronRight,
} from "lucide-react";
import SeasonAlertBanner from "@/components/SeasonAlertBanner";
import SafeZoneBanner from "@/components/SafeZoneBanner";
import MonthlyFishCard from "@/components/MonthlyFishCard";
import MonthlySummaryCard from "@/components/MonthlySummaryCard";
import DailyFishingTip from "@/components/DailyFishingTip";
import { DynamicIcon } from "@/lib/iconMap";

import { fishGradient } from "@/lib/fishColors";

// ─── Precision Index Gauge (Hero) ────────────────────────────────────────────
function PrecisionGauge({
  biteTime,
  loading,
}: {
  biteTime: BiteTimePrediction | null;
  loading: boolean;
}) {
  const score = biteTime?.score ?? 0;

  // Extract water temp and wind speed from factors descriptions
  const waterTempFactor = biteTime?.factors?.find(
    (f) => f.name.includes("수온") || f.name.includes("SST"),
  );
  const windFactor = biteTime?.factors?.find(
    (f) => f.name.includes("바람") || f.name.includes("Wind"),
  );
  // Parse numeric values from descriptions like "미풍 3.2m/s" or "수온 14.0°C"
  const waterTempMatch = waterTempFactor?.description?.match(/([\d.]+)\s*°?C/);
  const windSpeedMatch = windFactor?.description?.match(/([\d.]+)\s*m\/s/);
  const waterTemp = waterTempMatch
    ? parseFloat(waterTempMatch[1])
    : (biteTime?.seaSurfaceTemp ?? null);
  const windSpeed = windSpeedMatch ? parseFloat(windSpeedMatch[1]) : null;

  return (
    <section className="relative w-full aspect-[4/5] flex items-center justify-center px-6 py-10">
      {/* Background with gradient overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.webp"
          alt="fishing background"
          fill
          priority
          className="object-cover grayscale-[0.2] brightness-50"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d14]/40 via-transparent to-[#080d14]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d14] via-transparent to-transparent" />
      </div>

      {/* Gauge circle */}
      <div className="relative z-10 w-72 h-72 flex items-center justify-center">
        {/* Outer ring */}
        <div className="absolute inset-0 border-[3px] border-white/5 rounded-full scale-[1.08] shadow-[0_0_30px_rgba(201,168,76,0.15)]" />
        {/* Spinning gold ring */}
        <div className="absolute inset-0 border-[0.8px] border-[#c9a84c]/30 rounded-full animate-[spin_60s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-[#c9a84c] shadow-[0_0_12px_#c9a84c]" />
        </div>
        {/* Inner glass circle */}
        <div className="w-64 h-64 rounded-full glass-morphism border-[0.5px] border-white/10 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 ambient-glow opacity-50" />
          <span className="relative z-10 text-[0.55rem] font-thin uppercase tracking-[0.3em] text-white/60 mb-2">
            정밀도 지수
          </span>
          <div className="relative z-10 flex items-baseline">
            {loading ? (
              <span className="text-[6rem] font-extrabold tracking-tighter text-white/20 leading-none animate-pulse">
                --
              </span>
            ) : (
              <>
                <span className="text-[10rem] font-extrabold tracking-tighter gold-glow text-[#c9a84c] leading-none">
                  {score}
                </span>
                <span className="text-xl font-thin text-[#7dd3fc]/60 ml-2">
                  /100
                </span>
              </>
            )}
          </div>
          <div className="relative z-10 mt-2 h-[1px] w-12 bg-[#c9a84c]/30" />
          <span className="relative z-10 text-[0.5rem] font-light text-[#7dd3fc] tracking-widest mt-3 uppercase">
            {biteTime?.gradeLabel ?? "분석 중..."}
          </span>
        </div>
      </div>

      {/* Weather stat cards */}
      <div className="absolute bottom-4 left-0 w-full px-4 grid grid-cols-2 gap-2">
        <div className="glass-morphism p-3 border-l-2 border-[#c9a84c] flex flex-col">
          <span className="text-[0.45rem] font-thin uppercase tracking-[0.2em] text-white/60 mb-1">
            수온
          </span>
          {loading || waterTemp == null ? (
            <span className="text-sm font-light text-white/40">
              {loading ? "측정 중" : "데이터 없음"}
            </span>
          ) : (
            <span className="text-lg font-light text-white">
              {waterTemp.toFixed(1)}
              <span className="text-xs text-[#7dd3fc] ml-0.5">°C</span>
            </span>
          )}
        </div>
        <div className="glass-morphism p-3 border-l-2 border-[#c9a84c] flex flex-col">
          <span className="text-[0.45rem] font-thin uppercase tracking-[0.2em] text-white/60 mb-1">
            풍속
          </span>
          {loading || windSpeed == null ? (
            <span className="text-sm font-light text-white/40">
              {loading ? "측정 중" : "데이터 없음"}
            </span>
          ) : (
            <span className="text-lg font-light text-white">
              {windSpeed.toFixed(1)}
              <span className="text-xs text-[#c9a84c] ml-0.5">m/s</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Stat Bar (3-column glass) ───────────────────────────────────────────────
function StatBar({
  totalCatch,
  thisMonth,
  maxSize,
  loading,
}: {
  totalCatch: number;
  thisMonth: number;
  maxSize: number;
  loading?: boolean;
}) {
  // Show "--" placeholder while loading so users don't misread unlabeled "0".
  // Numbers only render once records have actually been fetched.
  const fmt = (n: number) => (loading ? "--" : n === 0 ? "0" : n);
  return (
    <section className="grid grid-cols-3 gap-0.5 p-[1px]">
      <div className="glass-morphism py-6 flex flex-col items-center">
        <span className="text-4xl font-extrabold text-white mb-1">
          {fmt(totalCatch)}
        </span>
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.25em] text-white/70">
          조과 (마리)
        </span>
      </div>
      <div className="glass-morphism py-6 flex flex-col items-center border-x border-white/5">
        <span className="text-4xl font-extrabold text-[#c9a84c] mb-1 gold-glow">
          {fmt(thisMonth)}
        </span>
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.25em] text-white/70">
          이번 달 (마리)
        </span>
      </div>
      <div className="glass-morphism py-6 flex flex-col items-center">
        <span className="text-4xl font-extrabold text-[#7dd3fc] mb-1 blue-glow">
          {loading ? "--" : maxSize || "--"}
        </span>
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.25em] text-white/70">
          최대 사이즈 (cm)
        </span>
      </div>
    </section>
  );
}

// 바텀 네비에 없는 라우트 — 상단 햄버거 메뉴와 하단 "더보기" 그리드가
// 같은 목록을 쓴다(5차 GOAL-5).
const MORE_ROUTES: { href: string; icon: string; label: string }[] = [
  { href: "/stats", icon: "bar_chart", label: "낚시 통계" },
  { href: "/season-forecast", icon: "calendar_month", label: "시즌 예보" },
  { href: "/feed", icon: "rss_feed", label: "조황 피드" },
  { href: "/settings", icon: "settings", label: "설정" },
  { href: "/alerts", icon: "notifications", label: "알림" },
  { href: "/news", icon: "newspaper", label: "낚시 뉴스" },
  { href: "/regulations", icon: "shield", label: "낚시 규정" },
  { href: "/catch-value", icon: "payments", label: "조과 시세" },
  { href: "/fishdex", icon: "menu_book", label: "어류 도감" },
];

// ─── AI Insight Banner (실시간 분석) ─────────────────────────────────────────
function AIInsightBanner({
  profile,
  biteScore,
}: {
  profile: UserFishingProfile | null;
  biteScore: number | null;
}) {
  const insight =
    profile && profile.insights.length > 0 ? profile.insights[0] : null;
  // 개인 프로필 × 오늘 점수 결합 줄(3차 GOAL-4) — analyzeUserRecords()가
  // 계산해 놓고 insights[0] 한 줄만 쓰이던 필드들을 실제로 쓴다.
  const personalLine =
    profile && profile.favoriteSpecies
      ? [
          `주력 ${profile.favoriteSpecies}`,
          biteScore !== null ? `오늘 조건 ${biteScore}점` : null,
          profile.currentStreak > 1
            ? `${profile.currentStreak}일 연속 기록 중`
            : profile.bestMonth
              ? `${profile.bestMonth}이 최강`
              : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <Link href="/concierge" className="block">
      <section className="glass-morphism p-5 border border-white/5 relative overflow-hidden">
        {/* Radar sweep line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#c9a84c]/20 overflow-hidden">
          <div className="radar-line w-24 h-full bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
        </div>
        <div className="flex items-start gap-4">
          {/* Diamond icon */}
          <div className="shrink-0 w-8 h-8 border border-[#7dd3fc]/30 flex items-center justify-center rotate-45">
            <div className="w-1.5 h-1.5 bg-[#7dd3fc] shadow-[0_0_10px_#7dd3fc]" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full pulse-dot" />
                <span className="text-[0.55rem] font-bold uppercase tracking-[0.3em] text-[#7dd3fc]">
                  실시간 분석
                </span>
              </div>
              <span className="text-[0.4rem] font-thin text-white/30 uppercase tracking-widest">
                실시간 업데이트
              </span>
            </div>
            <p className="text-[0.75rem] italic font-light leading-relaxed text-white/80 pr-4">
              {insight
                ? `"${insight.title} — ${insight.description}"`
                : `"현재 조건을 분석 중입니다. 위치 정보를 허용하면 맞춤 분석을 제공합니다."`}
            </p>
            {personalLine && (
              <p
                data-testid="personal-forecast-line"
                className="text-[0.7rem] text-[#7dd3fc]/90 mt-1.5 font-medium"
              >
                {personalLine}
              </p>
            )}
          </div>
        </div>
      </section>
    </Link>
  );
}

// ─── Species Bite Ranking (어종 순위) ────────────────────────────────────────
function SpeciesBiteRanking({ biteTime }: { biteTime: BiteTimePrediction }) {
  const scores = useMemo(() => getSpeciesBiteScores(biteTime), [biteTime]);
  const top3 = scores.slice(0, 3);

  return (
    <section className="py-10">
      <div className="flex justify-between items-baseline mb-6">
        <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">
          어종 순위
        </h2>
        <Link
          href="/bite-forecast"
          className="text-[0.45rem] font-thin text-[#c9a84c] uppercase tracking-widest border-b border-[#c9a84c]/30 pb-0.5"
        >
          분석 보고서
        </Link>
      </div>
      <div className="space-y-6">
        {top3.map((sp, i) => {
          const rank = String(i + 1).padStart(2, "0");
          const isFirst = i === 0;
          return (
            <div key={sp.species} className="flex items-center relative pb-4">
              <span
                className={`font-serif italic text-6xl ${isFirst ? "text-[#c9a84c]/40" : "text-[#c9a84c]/20"} w-16 shrink-0`}
              >
                {rank}
              </span>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h3
                    className={`text-xl font-bold tracking-wide ${isFirst ? "text-white" : "text-white/80"} uppercase`}
                  >
                    {sp.species}
                  </h3>
                  <p className="text-[0.5rem] font-thin tracking-widest text-white/60 uppercase">
                    {sp.reason.split(".")[0]}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`block text-2xl font-extrabold tracking-tight ${isFirst ? "text-[#c9a84c] gold-glow" : "text-white/60"}`}
                  >
                    {sp.score}%
                  </span>
                  <span className="block text-[0.4rem] font-thin tracking-[0.3em] text-white/30 uppercase">
                    확률
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-16 right-0 h-[1px] bg-white/5 overflow-hidden">
                <div
                  className={`h-full ${isFirst ? "bg-[#c9a84c]/50" : i === 1 ? "bg-[#c9a84c]/30" : "bg-[#c9a84c]/20"}`}
                  style={{ width: `${sp.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Catch Gallery (조과 갤러리) ─────────────────────────────────────────────
function CatchGallery({ records }: { records: CatchRecord[] }) {
  const items = records.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex justify-between items-baseline mb-6">
        <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">
          조과 갤러리
        </h2>
        <Link
          href="/records"
          className="text-[0.45rem] font-thin text-[#c9a84c] uppercase tracking-widest border-b border-[#c9a84c]/30 pb-0.5"
        >
          전체보기
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((record) => {
          const gradient = fishGradient(record.species);
          const hasRealPhoto =
            record.photos.length > 0 && !record.photos[0].startsWith("/fish-");

          return (
            <Link
              key={record.id}
              href={`/records/detail?id=${record.id}`}
              className="block"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm mb-2">
                {hasRealPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.photos[0]}
                    alt={record.species}
                    className="w-full h-full object-cover grayscale-[0.3] brightness-75"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center brightness-75`}
                  >
                    <span className="text-lg font-bold text-white/40">
                      {record.species.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d14] via-transparent to-transparent opacity-80" />
                {/* Location badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 bg-[#c9a84c] text-[#080d14] text-[0.4rem] font-bold tracking-widest uppercase">
                    {record.location.name.split(" ")[0]}
                  </span>
                </div>
                {/* Size */}
                <div className="absolute bottom-3 left-3">
                  <span className="text-[0.4rem] font-thin text-[#7dd3fc] tracking-[0.3em] uppercase">
                    {record.sizeCm
                      ? `${record.sizeCm}CM`
                      : `${record.count}마리`}
                  </span>
                </div>
              </div>
              <span className="text-[0.9rem] font-bold text-white tracking-widest uppercase block text-center">
                {record.species}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Windy 출항 날씨 ──────────────────────────────────────────────────────────
function WindySection() {
  return (
    <section id="windy-section" className="pt-2">
      <div className="flex items-center gap-2 mb-3">
        <Wind size={14} className="text-[#7dd3fc]" />
        <h2 className="text-[0.6rem] font-bold text-white/60 uppercase tracking-[0.25em]">
          출항 날씨
        </h2>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/5">
        <iframe
          title="Windy Weather"
          width="100%"
          height="280"
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=m/s&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=35.5&lon=128.5&detailLat=35.5&detailLon=128.5&marker=true&message=true"
          frameBorder="0"
          style={{ display: "block" }}
        />
      </div>
      <p className="text-[0.45rem] text-white/20 text-center mt-2 tracking-[0.2em] uppercase">
        바람 · 파도 · 해류 · Powered by Windy.com
      </p>
    </section>
  );
}

// ─── 낚시 뉴스 섹션 ────────────────────────────────────────────────────────────
function NewsSection({ news }: { news: FishingNewsItem[] }) {
  if (news.length === 0) return null;
  return (
    <section className="pt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-[#c9a84c]" />
          <h2 className="text-[0.6rem] font-bold text-white/60 uppercase tracking-[0.25em]">
            낚시 뉴스
          </h2>
        </div>
        <a
          href="/news"
          className="text-[0.5rem] text-white/30 uppercase tracking-[0.2em] hover:text-[#c9a84c] transition-colors"
        >
          전체보기
        </a>
      </div>
      <div className="space-y-2">
        {news.slice(0, 3).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[0.65rem] font-medium text-white/80 line-clamp-2 leading-relaxed">
                {item.title}
              </p>
              <p className="text-[0.5rem] text-white/30 mt-1 uppercase tracking-widest">
                {item.source ?? "뉴스"}
              </p>
            </div>
            {item.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail}
                alt=""
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0 opacity-80"
              />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

// ─── 커뮤니티 조과 배너 ───────────────────────────────────────────────────────
function CommunityFeedBanner() {
  return (
    <a
      href="/feed"
      className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    >
      <div className="flex items-center gap-3">
        <Users size={18} className="text-[#c9a84c]/70" />
        <div>
          <h3 className="text-[0.65rem] font-bold text-white/80 uppercase tracking-[0.15em]">
            최신 조과 피드
          </h3>
          <p className="text-[0.5rem] text-white/30 mt-0.5">
            다른 낚시인의 오늘 조과 보기
          </p>
        </div>
      </div>
      <ChevronRight size={14} className="text-white/20" />
    </a>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [biteLoading, setBiteLoading] = useState(true);
  const [aiProfile, setAiProfile] = useState<UserFishingProfile | null>(null);
  const [topNews, setTopNews] = useState<FishingNewsItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const catches = await getDataService().getCatchRecords();
        setRecords(catches);
        setAiProfile(analyzeUserRecords(catches));
      } finally {
        setRecordsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    fetchTopNews()
      .then(setTopNews)
      .catch((err) => console.error("[News] fetch failed:", err));
  }, []);

  useEffect(() => {
    async function loadBiteTime() {
      setBiteLoading(true);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              const [w, t, m] = await Promise.all([
                fetchWeather(latitude, longitude),
                fetchTideData(latitude, longitude),
                fetchMarineData(latitude, longitude),
              ]);
              setBiteTime(calculateBiteTime(w, t, m));
              setBiteLoading(false);
            },
            () => {
              setBiteTime(calculateBiteTime(null, null));
              setBiteLoading(false);
            },
            { timeout: 5000, maximumAge: 300000 },
          );
        } else {
          setBiteTime(calculateBiteTime(null, null));
          setBiteLoading(false);
        }
      } catch {
        setBiteTime(calculateBiteTime(null, null));
        setBiteLoading(false);
      }
    }
    loadBiteTime();
  }, []);

  const hasRecords = !recordsLoading && records.length > 0;
  const totalCatch = recordsLoading
    ? 0
    : records.reduce((acc, r) => acc + r.count, 0);
  const maxSize = recordsLoading
    ? 0
    : records.reduce((acc, r) => Math.max(acc, r.sizeCm ?? 0), 0);
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthCatch = recordsLoading
    ? 0
    : records
        .filter((r) => r.date.startsWith(currentMonthPrefix))
        .reduce((acc, r) => acc + r.count, 0);

  if (!mounted) return null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] text-[#dde2f5] overflow-x-hidden pb-24 selection:bg-[#c9a84c]/30">
      {/* ── Header ── */}
      <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-6 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 z-[100]">
        {/* 햄버거 — 예전엔 클릭 핸들러 없는 장식 3줄이었다(5차 GOAL-5).
            바텀 네비에 없는 라우트로 가는 실제 메뉴가 됐다. */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴"
          aria-expanded={menuOpen}
          data-testid="home-menu-button"
          className="w-8 h-8 -ml-2 flex flex-col justify-center items-start gap-[3px] px-1"
        >
          <span className="w-4 h-[0.5px] bg-[#c9a84c]/80" />
          <span className="w-3 h-[0.5px] bg-[#c9a84c]/80" />
          <span className="w-4 h-[0.5px] bg-[#c9a84c]/80" />
        </button>
        {/* Title */}
        <div className="flex flex-col items-center">
          <h1 className="text-[#c9a84c] font-bold tracking-[0.3em] text-[0.65rem] uppercase font-[var(--font-display)]">
            Bite Log
          </h1>
          <p className="tracking-[0.25em] font-thin text-[0.4rem] text-white/40 uppercase -mt-0.5">
            해양 정밀 분석 터미널
          </p>
        </div>
        {/* Bell */}
        <Link href="/alerts" aria-label="알림 설정">
          <Bell size={18} className="text-[#c9a84c]/80" />
        </Link>
      </header>

      {/* 상단 메뉴 시트(5차 GOAL-5) — 햄버거가 실제로 여는 곳. */}
      {menuOpen && (
        <div
          data-testid="home-menu-sheet"
          className="fixed top-14 left-0 right-0 z-[99] bg-[#080d14]/95 backdrop-blur-xl border-b border-white/10 px-4 py-4"
        >
          <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
            {MORE_ROUTES.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#c9a84c]/30 transition-all"
              >
                <DynamicIcon name={icon} size={20} className="text-[#c9a84c]" />
                <span className="text-[10px] text-white/70">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="pt-14 pb-32 w-full max-w-[412px] mx-auto min-h-screen relative">
        {/* Precision Index Gauge */}
        <PrecisionGauge biteTime={biteTime} loading={biteLoading} />

        {/* Content area */}
        <div className="px-4 -mt-8 relative z-20 space-y-10">
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/record"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:border-[#c9a84c]/30 transition-all"
            >
              <PenLine size={14} className="text-[#c9a84c]" />
              기록 추가
            </Link>
            <a
              href="#windy-section"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:border-[#c9a84c]/30 transition-all"
            >
              <Wind size={14} className="text-[#7dd3fc]" />
              출항 날씨
            </a>
            <Link
              href="/ranking"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:border-[#c9a84c]/30 transition-all"
            >
              <Trophy size={14} className="text-[#c9a84c]" />
              랭킹
            </Link>
            <Link
              href="/booking"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:border-[#c9a84c]/30 transition-all"
            >
              <CalendarDays size={14} className="text-[#7dd3fc]" />
              예약
            </Link>
            <Link
              href="/trip-plan"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:border-[#c9a84c]/30 transition-all"
            >
              <Map size={14} className="text-[#c9a84c]" />
              조행 계획
            </Link>
          </div>

          {/* Stat Bar */}
          <StatBar
            totalCatch={totalCatch}
            thisMonth={thisMonthCatch}
            maxSize={maxSize}
            loading={recordsLoading}
          />

          {/* SafeZone 금어기 알림 */}
          <SafeZoneBanner />

          {/* Daily Fishing Tip */}
          <DailyFishingTip />

          {/* Season Alert Banner */}
          <SeasonAlertBanner />

          {/* Monthly Fish Card */}
          <MonthlyFishCard />

          {/* Monthly Summary Card */}
          <MonthlySummaryCard />

          {/* AI Insight Banner */}
          <AIInsightBanner
            profile={aiProfile}
            biteScore={biteTime && !biteLoading ? biteTime.score : null}
          />

          {/* Species Bite Ranking */}
          {biteTime && !biteLoading && (
            <SpeciesBiteRanking biteTime={biteTime} />
          )}

          {/* Catch Gallery or Empty State */}
          {!recordsLoading && hasRecords && <CatchGallery records={records} />}
          {!recordsLoading && !hasRecords && (
            <section className="py-10 flex flex-col items-center gap-4 text-center">
              <Fish size={48} className="text-[#c9a84c]/40" />
              <div className="space-y-1">
                <p className="text-sm text-white/40">
                  아직 조과 기록이 없습니다.
                </p>
                <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  첫 번째 조과를 기록해보세요!
                </p>
              </div>
              <Link
                href="/record"
                className="mt-2 px-6 py-2.5 rounded-full border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#c9a84c]/10 transition-colors flex items-center gap-2"
              >
                <Fish size={14} />
                기록하기
              </Link>
            </section>
          )}

          {/* 커뮤니티 최신 조과 피드 */}
          <CommunityFeedBanner />

          {/* 낚시 뉴스 */}
          <NewsSection news={topNews} />

          {/* Windy 출항 날씨 */}
          <WindySection />

          {/* Quick Menu — orphan routes */}
          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
              더보기
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ROUTES.map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#c9a84c]/30 hover:bg-white/[0.08] transition-all active:scale-95"
                >
                  <DynamicIcon
                    name={icon}
                    size={20}
                    className="text-[#c9a84c]"
                  />
                  <span className="text-[10px] text-white/60 font-medium text-center leading-tight">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── FAB — glass circle ── */}
      <Link
        href="/record"
        className="fixed bottom-24 right-6 z-[110] w-12 h-12 rounded-full glass-morphism border border-white/10 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        aria-label="새 기록 추가"
      >
        <div className="relative w-4 h-4">
          <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-[#c9a84c] shadow-[0_0_5px_#c9a84c]" />
          <div className="absolute left-1/2 top-0 h-full w-[0.5px] bg-[#c9a84c] shadow-[0_0_5px_#c9a84c]" />
        </div>
      </Link>
    </div>
  );
}
