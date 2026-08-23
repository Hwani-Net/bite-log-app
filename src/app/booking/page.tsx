"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  ArrowLeft,
  Fish,
  Users,
  Calendar,
  MapPin,
  CheckSquare,
  ChevronRight,
  Star,
  ShieldCheck,
  Check,
  Bell,
  BellRing,
  ChevronDown,
  X,
} from "lucide-react";
import {
  FISH_SEASON_DB,
  getSeasonStatus,
  getTotalRelease,
  getReleaseCityCount,
  type FishSeasonData,
} from "@/data/fishSeasonDB";
import { getRegionForCoords, type SeaRegion } from "@/lib/region";
import {
  type BoatDayStatus,
  type BoatOperatorId,
} from "@/services/boatAvailabilityService";
import {
  requestNotificationPermission,
  sendLocalNotification,
} from "@/services/pushNotificationService";

// @mock-data — editorial fallback only for months with no FISH_SEASON_DB
// species in gold/peak season (getMonthlyRecommendation() below prefers real
// 방류계획 데이터 whenever a DB species is in season that month).
const MONTHLY_SPOTS_FALLBACK: Record<
  number,
  { species: string; location: string; region: string; tip: string }
> = {
  1: {
    species: "볼락",
    location: "포항 구룡포",
    region: "동해",
    tip: "야간 선상낚시 최적기. 수온 낮아 대형급 출현.",
  },
  2: {
    species: "우럭",
    location: "인천 굴업도",
    region: "서해",
    tip: "서해 최대 우럭 포인트. 2월 조황 최상급.",
  },
  3: {
    species: "삼치",
    location: "여수 거문도",
    region: "남해",
    tip: "봄 삼치 시즌 개막. 루어낚시 입질 폭발.",
  },
  4: {
    species: "감성돔",
    location: "통영 한산도",
    region: "남해",
    tip: "4월 수온 상승으로 감성돔 갯바위 입질 활발.",
  },
  5: {
    species: "참돔",
    location: "제주 우도",
    region: "제주",
    tip: "참돔 선상낚시 최성기. 타이라바 효과적.",
  },
  6: {
    species: "광어",
    location: "강릉 주문진",
    region: "동해",
    tip: "여름 광어 시즌 시작. 선상 생미끼 추천.",
  },
  7: {
    species: "방어",
    location: "울릉도",
    region: "동해",
    tip: "여름 방어 떼낚시. 대형 지깅 준비 필수.",
  },
  8: {
    species: "농어",
    location: "서천 무창포",
    region: "서해",
    tip: "방파제·갯바위 농어 최성기. 야간 입질 집중.",
  },
  9: {
    species: "전어",
    location: "군산 선유도",
    region: "서해",
    tip: "9월 전어 씨알 최대. 망 낚시·훌치기 효과적.",
  },
  10: {
    species: "갈치",
    location: "제주 모슬포",
    region: "제주",
    tip: "제주 갈치 선상 최성기. 야간 집어등 필수.",
  },
  11: {
    species: "대구",
    location: "진해만",
    region: "남해",
    tip: "11월 대구 시즌 개막. 저수온 포인트 집중.",
  },
  12: {
    species: "도루묵",
    location: "속초 청초호",
    region: "동해",
    tip: "겨울 도루묵 산란기. 방파제 손쉽게 마릿수.",
  },
};

interface MonthlyRecommendation {
  species: string;
  location: string;
  region: string;
  tip: string;
  image: string | null;
  /** true = derived from the 한국수산자원공단 방류계획 DB (see /season-forecast) */
  sourced: boolean;
}

// Prefer a species that's in gold/peak season this month according to the
// real release-plan DB. Falls back to the curated table only for months
// none of the tracked species are in season (data gap, not a data error).
function getMonthlyRecommendation(
  month: number,
  day: number,
  userRegion: SeaRegion | "기타" | null,
): MonthlyRecommendation {
  const inSeason = FISH_SEASON_DB.filter((d) => {
    const status = getSeasonStatus(d, month, day);
    return status === "gold" || status === "peak";
  });

  if (inSeason.length > 0) {
    const isGold = (d: FishSeasonData) =>
      getSeasonStatus(d, month, day) === "gold";
    const best = [...inSeason].sort((a, b) => {
      const goldDiff = Number(isGold(b)) - Number(isGold(a));
      return goldDiff !== 0 ? goldDiff : getTotalRelease(b) - getTotalRelease(a);
    })[0];

    const site = [...best.releaseSites].sort((a, b) => {
      if (userRegion) {
        const match = Number(b.region === userRegion) - Number(a.region === userRegion);
        if (match !== 0) return match;
      }
      return b.count - a.count;
    })[0];

    const statusLabel = isGold(best) ? "황금 시즌" : "피크 시즌";
    const cityCount = getReleaseCityCount(best);
    const total = getTotalRelease(best);

    return {
      species: best.species,
      location: site.city,
      region: site.region,
      tip: `${statusLabel} · ${cityCount}개 지역 총 ${total.toLocaleString()}마리 방류 계획 · 서식수심 ${best.habitatDepth}`,
      image: best.image,
      sourced: true,
    };
  }

  const fallback = MONTHLY_SPOTS_FALLBACK[month];
  return { ...fallback, image: null, sourced: false };
}

const SPECIES_OPTIONS = [
  "감성돔",
  "참돔",
  "광어",
  "우럭",
  "볼락",
  "주꾸미",
  "농어",
  "방어",
  "삼치",
  "갈치",
  "기타",
];

const CHECKLIST_BASE = [
  "낚시 라이선스 / 신분증",
  "멀미약 (출항 30분 전 복용)",
  "구명조끼",
  "방수 의류 / 장갑",
  "아이스박스 (어획물 보관)",
  "간식 및 음료",
  "자외선 차단제",
];

const SPECIES_CHECKLIST: Record<string, string[]> = {
  감성돔: ["갯바위화 또는 안전화", "밑밥 (크릴)", "찌낚시 채비"],
  참돔: ["타이라바 채비 (80-150g)", "PE라인 0.8-1.5호", "전동릴 권장"],
  광어: ["생미끼 (우럭·도다리)", "50-80g 봉돌", "목줄 형광 0.5m"],
  우럭: ["지그헤드 / 웜", "스피닝릴", "형광 집어제"],
  볼락: ["소형 루어 (2-3인치 웜)", "라이트 로드", "헤드랜턴 (야간)"],
  주꾸미: ["에기 또는 왕눈이 채비", "구멍쭈 채비 (선택)", "라이트 지깅로드"],
  농어: ["미노우·팝퍼 루어", "PE라인 1-1.5호", "리더 30-40lb"],
  방어: ["고중량 지그 (150-250g)", "전동릴 또는 파워릴", "대형 훅"],
  삼치: ["메탈지그 40-80g", "빠른 리트리브용 릴", "와이어 리더"],
  갈치: ["선상 갈치 전용 채비", "집어등 (야간)", "야광 가짜미끼"],
  기타: ["범용 스피닝 또는 베이트릴", "다목적 루어 세트"],
};

interface BookingPlatform {
  id: string;
  name: string;
  description: string;
  url: string;
  features: string[];
  accent: string;
  /** "operator" = a single boat's own site, not a multi-boat marketplace. */
  kind?: "operator";
}

// Every URL below was verified live and pointed at the platform's actual
// booking/search entry point (not just its homepage) as of 2026-08-23.
// 낚시가(naksiga.com) and 피싱캠프(fishingcamp.co.kr) were dropped — both
// no longer resolve (connection refused).
const PLATFORMS: BookingPlatform[] = [
  {
    id: "sunsang24",
    name: "선상24",
    description: "전국 실시간 선상낚시 예약 플랫폼",
    url: "https://www.sunsang24.com/ship/list",
    features: ["실시간 예약", "조황 정보", "낚싯배 비교"],
    accent: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  },
  {
    id: "thefishing",
    name: "더피싱",
    description: "배낚시·선상낚시 실시간 예약",
    url: "https://thefishing.kr/reservation/list.php",
    features: ["긴급모집", "출조버스", "낚시대회"],
    accent: "bg-orange-500/15 border-orange-500/30 text-orange-400",
  },
  {
    id: "moolban",
    name: "물반고기반",
    description: "국내 최대 낚시 실시간 예약 플랫폼",
    url: "https://www.moolban.com/",
    features: ["전국 7,500+ 포인트", "실시간 조황", "통합 커뮤니티"],
    accent: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  },
  {
    id: "usin",
    name: "어신",
    description: "날짜·인원·지역·어종 통합 검색 예약",
    url: "https://us-in.io/",
    features: ["조황 리포트", "지역별 선사", "커뮤니티"],
    accent: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  },
  {
    id: "fishapp",
    name: "낚시뚜",
    description: "선상낚시 실시간 조황·예약",
    url: "https://www.fishapp.co.kr/pt/info/ship_search_page",
    features: ["테마낚시", "체험낚시", "숙박 연계"],
    accent: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
  },
  // Individual boats (not multi-boat marketplaces) — added on request.
  // Both run on the same white-label booking template as thefishing.kr
  // (js.thefishing.kr scripts on both), so they're linked, not scraped —
  // see the "실시간 예약 현황" note below for why.
  {
    id: "masterfishing",
    name: "루피호 (대천항)",
    description: "대천항 팀루피호·루피호·슈퍼맨호 전문 예약",
    url: "https://masterfishing.kr/index.php?mid=bk",
    features: ["대천항", "우럭·광어", "선상낚시"],
    accent: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    kind: "operator",
  },
  {
    id: "teambite",
    name: "팀바이트호 (마검포)",
    description: "마검포 팀바이트호 선상낚시 전문 예약",
    url: "http://teambite.kr/index.php?mid=bk",
    features: ["마검포", "선상낚시"],
    accent: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    kind: "operator",
  },
];

interface WatchedSlot {
  operatorId: BoatOperatorId;
  boatName: string;
  date: string;
}

const WATCHLIST_KEY = "biteLog_boatWatchlist";

function loadWatchlist(): WatchedSlot[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? (JSON.parse(raw) as WatchedSlot[]) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list: WatchedSlot[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

const STATUS_LABEL: Record<BoatDayStatus["status"], string> = {
  available: "예약 가능",
  full: "마감",
  weather: "기상악화",
  unknown: "정보 없음",
};

const STATUS_STYLE: Record<BoatDayStatus["status"], string> = {
  available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  full: "bg-white/5 text-white/40 border-white/10",
  weather: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  unknown: "bg-white/5 text-white/30 border-white/10",
};

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function BoatAvailabilityPanel({
  operatorId,
  days,
  loading,
  error,
  watchlist,
  onToggleWatch,
}: {
  operatorId: BoatOperatorId;
  days: BoatDayStatus[] | undefined;
  loading: boolean;
  error: boolean;
  watchlist: WatchedSlot[];
  onToggleWatch: (slot: WatchedSlot) => void;
}) {
  if (loading) {
    return (
      <p className="text-xs text-white/30 py-3 text-center">
        예약 현황 불러오는 중...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-xs text-white/30 py-3 text-center">
        예약 현황을 지금 불러오지 못했습니다. 선사 페이지에서 직접
        확인해주세요.
      </p>
    );
  }
  if (!days || days.length === 0) {
    return (
      <p className="text-xs text-white/30 py-3 text-center">
        표시할 예약 현황이 없습니다.
      </p>
    );
  }

  const upcoming = days
    .filter((d) => d.status !== "unknown")
    .slice(0, 14);

  return (
    <div className="space-y-1.5 pt-1">
      {upcoming.map((d, i) => {
        const isWatched = watchlist.some(
          (w) =>
            w.operatorId === operatorId &&
            w.boatName === d.boatName &&
            w.date === d.date,
        );
        return (
          <div
            key={`${d.date}-${d.boatName}-${i}`}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/2"
          >
            <span className="text-[11px] text-white/50 w-10 shrink-0">
              {formatShortDate(d.date)}
            </span>
            <span className="text-[11px] text-white/70 flex-1 truncate">
              {d.boatName}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[d.status]}`}
            >
              {d.status === "available" && d.remainingSeats != null
                ? `잔여 ${d.remainingSeats}명`
                : STATUS_LABEL[d.status]}
            </span>
            {d.status === "full" && (
              <button
                onClick={() =>
                  onToggleWatch({
                    operatorId,
                    boatName: d.boatName,
                    date: d.date,
                  })
                }
                className={`shrink-0 size-6 rounded-full flex items-center justify-center transition-colors ${
                  isWatched
                    ? "bg-[#c9a84c] text-[#080d14]"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
                title={isWatched ? "알림 취소" : "빈자리 알림 받기"}
              >
                {isWatched ? <BellRing size={12} /> : <Bell size={12} />}
              </button>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-white/25 pt-1 px-1">
        더피싱 예약 시스템 기준 · 30분마다 갱신 · 확정은 반드시 선사
        페이지에서 확인하세요
      </p>
    </div>
  );
}

export default function BookingPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const [userRegion, setUserRegion] = useState<SeaRegion | "기타" | null>(
    null,
  );
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedParty, setSelectedParty] = useState<number>(2);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<BookingPlatform>(
    PLATFORMS[0],
  );
  const [expandedOperator, setExpandedOperator] =
    useState<BoatOperatorId | null>(null);
  const [availability, setAvailability] = useState<
    Partial<Record<BoatOperatorId, BoatDayStatus[]>>
  >({});
  const [availabilityError, setAvailabilityError] = useState<
    Partial<Record<BoatOperatorId, boolean>>
  >({});
  const [availabilityLoading, setAvailabilityLoading] = useState<
    Partial<Record<BoatOperatorId, boolean>>
  >({});
  const [watchlist, setWatchlist] = useState<WatchedSlot[]>([]);

  const loadOperatorAvailability = async (operatorId: BoatOperatorId) => {
    setAvailabilityLoading((prev) => ({ ...prev, [operatorId]: true }));
    setAvailabilityError((prev) => ({ ...prev, [operatorId]: false }));
    try {
      const res = await fetch(`/api/boat-availability?operator=${operatorId}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setAvailability((prev) => ({ ...prev, [operatorId]: data.days }));
    } catch {
      setAvailabilityError((prev) => ({ ...prev, [operatorId]: true }));
    } finally {
      setAvailabilityLoading((prev) => ({ ...prev, [operatorId]: false }));
    }
  };

  const handleToggleExpand = (operatorId: BoatOperatorId) => {
    const next = expandedOperator === operatorId ? null : operatorId;
    setExpandedOperator(next);
    if (next && !availability[next]) {
      loadOperatorAvailability(next);
    }
  };

  const handleToggleWatch = (slot: WatchedSlot) => {
    setWatchlist((prev) => {
      const exists = prev.some(
        (w) =>
          w.operatorId === slot.operatorId &&
          w.boatName === slot.boatName &&
          w.date === slot.date,
      );
      const next = exists
        ? prev.filter(
            (w) =>
              !(
                w.operatorId === slot.operatorId &&
                w.boatName === slot.boatName &&
                w.date === slot.date
              ),
          )
        : [...prev, slot];
      saveWatchlist(next);
      return next;
    });
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      requestNotificationPermission();
    }
  };

  // One-time sync from external systems (URL query, localStorage,
  // geolocation) into React state after mount. Deliberately not done via
  // useState lazy initializers — `window` isn't available during this
  // "use client" page's server render, so reading it there would make the
  // server-rendered HTML and the client's first render disagree (a
  // hydration mismatch) instead of just being a beat slower.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const species = params.get("species");
    const date = params.get("date");
    if (species && SPECIES_OPTIONS.includes(species)) {
      setSelectedSpecies(species);
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSelectedDate(date);
    }

    const savedPlatformId = localStorage.getItem("biteLog_bookingPlatform");
    const savedPlatform = PLATFORMS.find((p) => p.id === savedPlatformId);
    if (savedPlatform) setSelectedPlatform(savedPlatform);

    setWatchlist(loadWatchlist());

    // Best-effort location for the monthly pick — silently falls back to
    // the nationwide top release site if permission is denied/unavailable.
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserRegion(
          getRegionForCoords(pos.coords.latitude, pos.coords.longitude),
        );
      },
      () => {},
      { timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  // Re-checks every watched (boat, date) slot while this page stays open and
  // fires a local notification the moment one flips from full to available.
  // This only runs in the foreground tab — there's no push infrastructure
  // (service worker + FCM server key + a cron sender) in this app yet, so it
  // can't wake a closed app. The UI copy says so; this isn't meant to quietly
  // promise more than it does.
  useEffect(() => {
    if (watchlist.length === 0) return;

    const checkWatchlist = async () => {
      const operatorIds = Array.from(
        new Set(watchlist.map((w) => w.operatorId)),
      );
      for (const operatorId of operatorIds) {
        try {
          const res = await fetch(
            `/api/boat-availability?operator=${operatorId}`,
          );
          if (!res.ok) continue;
          const { days } = (await res.json()) as { days: BoatDayStatus[] };
          setAvailability((prev) => ({ ...prev, [operatorId]: days }));

          const stillWatchedForOperator = loadWatchlist().filter(
            (w) => w.operatorId === operatorId,
          );
          for (const w of stillWatchedForOperator) {
            const current = days.find(
              (d) => d.boatName === w.boatName && d.date === w.date,
            );
            if (current && current.status === "available") {
              sendLocalNotification(
                `${w.boatName} 자리 났어요`,
                `${formatShortDate(w.date)} 예약이 가능해졌습니다. 서두르세요!`,
                undefined,
                `boat-${w.operatorId}-${w.boatName}-${w.date}`,
              );
              setWatchlist((prev) => {
                const next = prev.filter(
                  (p) =>
                    !(
                      p.operatorId === w.operatorId &&
                      p.boatName === w.boatName &&
                      p.date === w.date
                    ),
                );
                saveWatchlist(next);
                return next;
              });
            }
          }
        } catch {
          // best-effort — try again on the next interval
        }
      }
    };

    const interval = setInterval(checkWatchlist, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const spotOfMonth = useMemo(
    () => getMonthlyRecommendation(currentMonth, currentDay, userRegion),
    [currentMonth, currentDay, userRegion],
  );

  const checklist = selectedSpecies
    ? [
        ...CHECKLIST_BASE,
        ...(SPECIES_CHECKLIST[selectedSpecies] ?? SPECIES_CHECKLIST["기타"]),
      ]
    : CHECKLIST_BASE;

  const handleGenerate = () => {
    if (!selectedSpecies) return;
    setShowResult(true);
  };

  const handleReset = () => {
    setShowResult(false);
    setSelectedSpecies("");
    setSelectedDate("");
    setSelectedParty(2);
  };

  // The reserve link opens the partner site in a new tab; this just copies
  // the assistant's criteria first so it's one paste away on the other end.
  const handleReserveClick = () => {
    const parts = [
      `어종 ${selectedSpecies}`,
      selectedDate && `날짜 ${selectedDate}`,
      `인원 ${selectedParty}명`,
    ].filter(Boolean);
    navigator.clipboard?.writeText(parts.join(" / ")).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => {},
    );
  };

  return (
    <div className="bg-[#080d14] text-white min-h-dvh min-h-screen page-enter">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-white/40 mb-4 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={14} />
          홈으로
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">낚시 예약</h1>
        <p className="text-sm text-white/40">
          어시스턴트로 준비물을 확인하고 플랫폼으로 예약하세요
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 pb-24">
        {/* Monthly Highlight */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 via-[#0f141b] to-[#7dd3fc]/10 border border-[#c9a84c]/30 p-5">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Star size={80} className="text-[#c9a84c]" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-semibold text-[#c9a84c]/70 uppercase tracking-[0.2em]">
              {currentMonth}월 추천 포인트
            </p>
            {spotOfMonth.sourced && (
              <Link
                href="/season-forecast"
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] font-semibold"
              >
                방류계획 데이터 기반
              </Link>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#c9a84c] mb-0.5">
                {spotOfMonth.species}
              </h2>
              <div className="flex items-center gap-1 text-xs text-white/70 mb-2">
                <MapPin size={12} className="text-[#c9a84c]" />
                {spotOfMonth.location}
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] ml-1">
                  {spotOfMonth.region}
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed max-w-[220px]">
                {spotOfMonth.tip}
              </p>
            </div>
            <div className="shrink-0 size-14 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center overflow-hidden">
              {spotOfMonth.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spotOfMonth.image}
                  alt={spotOfMonth.species}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Fish size={28} className="text-[#c9a84c]" />
              )}
            </div>
          </div>
        </section>

        {/* Assistant */}
        <section className="glass-morphism border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
            <CheckSquare size={15} className="text-[#c9a84c]" />
            낚시 예약 어시스턴트
          </h3>

          {!showResult ? (
            <div className="space-y-4">
              {/* Species */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  목표 어종
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSpecies(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selectedSpecies === s
                          ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  <Calendar size={12} className="inline mr-1 text-[#c9a84c]" />
                  예정 날짜
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Party size */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  <Users size={12} className="inline mr-1 text-[#c9a84c]" />
                  인원
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedParty((p) => Math.max(1, p - 1))}
                    className="size-9 rounded-lg bg-white/5 border border-white/10 text-white/60 font-bold flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-white w-8 text-center">
                    {selectedParty}
                  </span>
                  <button
                    onClick={() => setSelectedParty((p) => Math.min(20, p + 1))}
                    className="size-9 rounded-lg bg-white/5 border border-white/10 text-white/60 font-bold flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-white/40 ml-1">명</span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedSpecies}
                className="w-full py-3 rounded-xl bg-[#c9a84c] text-[#080d14] font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                준비물 체크리스트 생성
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 p-3 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl">
                <Fish size={18} className="text-[#c9a84c] shrink-0" />
                <div className="text-sm text-white font-semibold">
                  {selectedSpecies} 낚시
                  {selectedDate && (
                    <span className="ml-2 text-white/50 font-normal text-xs">
                      {selectedDate}
                    </span>
                  )}
                  <span className="ml-2 text-white/50 font-normal text-xs">
                    {selectedParty}명
                  </span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-[0.15em]">
                  준비물 체크리스트
                </p>
                {checklist.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5"
                  >
                    <div
                      className={`size-4 rounded flex items-center justify-center shrink-0 ${
                        i < CHECKLIST_BASE.length
                          ? "bg-white/10"
                          : "bg-[#c9a84c]/20 border border-[#c9a84c]/30"
                      }`}
                    />
                    <span className="text-xs text-white/70">{item}</span>
                    {i >= CHECKLIST_BASE.length && (
                      <span className="ml-auto text-[10px] text-[#c9a84c] font-semibold shrink-0">
                        {selectedSpecies}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Tip: recommended spot */}
              {spotOfMonth.species === selectedSpecies && (
                <div className="p-3 bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 rounded-xl">
                  <p className="text-xs font-semibold text-[#7dd3fc] mb-0.5">
                    이달의 추천 포인트
                  </p>
                  <p className="text-xs text-white/60">
                    {spotOfMonth.location} — {spotOfMonth.tip}
                  </p>
                </div>
              )}

              {/* Platform selector */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  예약 플랫폼 선택
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlatform(p);
                        localStorage.setItem("biteLog_bookingPlatform", p.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                        selectedPlatform.id === p.id
                          ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  다시 선택
                </button>
                <a
                  href={selectedPlatform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleReserveClick}
                  className="flex-1 py-2.5 rounded-xl bg-[#c9a84c] text-[#080d14] text-sm font-bold text-center hover:brightness-110 transition-all"
                >
                  {selectedPlatform.name}으로 예약
                </a>
              </div>
              {copied && (
                <p className="flex items-center gap-1.5 text-[11px] text-[#7dd3fc] justify-center">
                  <Check size={12} />
                  검색 조건이 복사됐습니다 — 예약 사이트에서 붙여넣으세요
                </p>
              )}
            </div>
          )}
        </section>

        {/* Platform Cards */}
        <div className="space-y-3">
          <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] px-1">
            검증된 예약 플랫폼
          </h3>
          {PLATFORMS.filter((p) => !p.kind).map((platform, i) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl p-4 hover:bg-white/6 hover:border-white/15 transition-all group"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className={`size-11 rounded-xl border flex items-center justify-center shrink-0 ${platform.accent}`}
              >
                <Anchor size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-0.5">
                  {platform.name}
                </h4>
                <p className="text-xs text-white/50 truncate mb-1.5">
                  {platform.description}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {platform.features.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-white/20 group-hover:text-white/50 transition-colors shrink-0"
              />
            </a>
          ))}
        </div>

        {/* Individual boat operators */}
        <div className="space-y-3">
          <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] px-1">
            개별 선사 직접 예약
          </h3>
          {PLATFORMS.filter((p) => p.kind === "operator").map(
            (platform, i) => {
              const operatorId = platform.id as BoatOperatorId;
              const isExpanded = expandedOperator === operatorId;
              return (
                <div
                  key={platform.id}
                  className="bg-white/3 border border-white/8 rounded-2xl p-4"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-center gap-4">
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 flex-1 min-w-0 group"
                    >
                      <div
                        className={`size-11 rounded-xl border flex items-center justify-center shrink-0 ${platform.accent}`}
                      >
                        <Anchor size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white mb-0.5">
                          {platform.name}
                        </h4>
                        <p className="text-xs text-white/50 truncate mb-1.5">
                          {platform.description}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {platform.features.map((f) => (
                            <span
                              key={f}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-white/20 group-hover:text-white/50 transition-colors shrink-0"
                      />
                    </a>
                  </div>
                  <button
                    onClick={() => handleToggleExpand(operatorId)}
                    className="flex items-center gap-1 mt-3 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ChevronDown
                      size={12}
                      className="transition-transform"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "" }}
                    />
                    예약 현황 보기
                  </button>
                  {isExpanded && (
                    <BoatAvailabilityPanel
                      operatorId={operatorId}
                      days={availability[operatorId]}
                      loading={!!availabilityLoading[operatorId]}
                      error={!!availabilityError[operatorId]}
                      watchlist={watchlist}
                      onToggleWatch={handleToggleWatch}
                    />
                  )}
                </div>
              );
            },
          )}
          <p className="text-[11px] text-white/30 px-1">
            아는 선사가 여기 없나요? 위 플랫폼에서 선사명으로 검색해보세요.
          </p>
        </div>

        {/* Watchlist */}
        {watchlist.length > 0 && (
          <div className="space-y-2 border border-[#c9a84c]/20 rounded-2xl p-4 bg-[#c9a84c]/5">
            <h3 className="flex items-center gap-1.5 text-xs text-[#c9a84c] font-semibold uppercase tracking-[0.15em]">
              <BellRing size={13} />
              빈자리 알림 등록 ({watchlist.length})
            </h3>
            {watchlist.map((w) => (
              <div
                key={`${w.operatorId}-${w.boatName}-${w.date}`}
                className="flex items-center gap-2 py-1 px-1"
              >
                <span className="text-[11px] text-white/60 flex-1">
                  {w.boatName} · {formatShortDate(w.date)}
                </span>
                <button
                  onClick={() => handleToggleWatch(w)}
                  className="size-5 rounded-full flex items-center justify-center text-white/30 hover:text-white/60"
                  title="알림 취소"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <p className="text-[10px] text-white/30 px-1">
              BITE Log 앱이 열려 있는 동안 10분마다 확인해서 알려드려요. 앱을
              완전히 닫으면 확인하지 못합니다.
            </p>
          </div>
        )}

        {/* Why link-out instead of in-app booking */}
        <div className="flex items-start gap-3 border border-white/8 rounded-2xl p-4 bg-white/2">
          <ShieldCheck size={18} className="text-white/30 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/40 leading-relaxed">
            BITE Log는 예약·결제를 직접 처리하지 않습니다. 위 플랫폼은 모두
            선사와 직접 계약된 예약 시스템이니, 결제와 취소 규정은 해당
            플랫폼에서 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
