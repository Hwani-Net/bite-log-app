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
  Search,
  TriangleAlert,
} from "lucide-react";
import { matchesKeyword } from "@/lib/keywordMatch";
import {
  capacityBucket,
  extractPorts,
  type CapacityBucket,
} from "@/lib/boatFilters";
import { recommendDates } from "@/lib/speciesRecommendation";
import {
  dayBeforeTrips,
  nextBriefingNotifications,
  seasonReminders,
} from "@/lib/tripReminders";
import {
  alternativeDates,
  isCancellationRisk,
  isWithinAlertWindow,
  OPERATOR_COORDS,
} from "@/lib/sailCancelAlert";
import {
  distanceKmForAreaPath,
  sortBoatsByDistance,
} from "@/lib/portDistance";
import { fetchDailyMarineOutlook } from "@/services/marineService";
import { BITE_GRADE_LABEL } from "@/lib/calendarBiteOverlay";
import { getDataService } from "@/services/dataServiceFactory";
import type { CatchRecord } from "@/types";
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
  REGION_FILTERS,
  SPECIES_FILTERS,
  type BoatListing,
  type BoatListingPage,
} from "@/services/boatListingService";
import { type FishappBoat } from "@/services/fishappListingService";
import {
  requestNotificationPermission,
  sendLocalNotification,
} from "@/services/pushNotificationService";
import {
  loadMyBoats,
  toggleFavorite,
  favoritesFromMap,
  sortByVerdict,
  shortPort,
  type MyBoatMap,
  type BoatSnapshot,
  type BoatVerdict,
} from "@/services/myBoatService";

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

const CAPACITY_OPTIONS: { value: CapacityBucket | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "small", label: "소형 (~10인)" },
  { value: "medium", label: "중형 (11~18인)" },
  { value: "large", label: "대형 (19인~)" },
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

/**
 * YYYY-MM-DD in the browser's local timezone. `toISOString()` is always
 * UTC — for a KST (UTC+9) user that reads "yesterday" for the first 9
 * hours of every day, which is the wrong default for a Korea-only search.
 */
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

// 어종 역방향 추천에서 다루는 어종 — FISH_SEASON_DB에 실제 시즌 데이터가
// 있으면서 동시에 SPECIES_FILTERS(더피싱 검색용)에도 코드가 있는 것만
// 남긴다. 둘 다 있어야 추천 날짜를 골랐을 때 그 코드를 기존 검색에 그대로
// 넘길 수 있다(새 API 없음) — "라벨이 겹친다"는 걸 주석으로만 가정하면
// 둘 중 하나가 바뀌었을 때 조용히 "전체 어종"으로 새는 경로가 생긴다.
// 필터링 자체로 그 경로를 원천 차단한다(옵션에 없는 어종은 애초에 못 고름).
const REVERSE_SPECIES_OPTIONS = FISH_SEASON_DB.map((d) => d.species).filter((s) =>
  SPECIES_FILTERS.some((f) => f.label === s),
);

const SEASON_STATUS_LABEL: Record<
  "peak" | "gold" | "closed" | "offseason",
  string
> = {
  gold: "황금 시즌",
  peak: "피크 시즌",
  closed: "금어기",
  offseason: "시즌 아님",
};

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

function BoatListingCard({
  boat,
  date,
  isFav,
  onToggleFav,
  verdict,
  rideCount,
  memo,
  distanceKm = null,
}: {
  boat: BoatListing;
  date: string;
  isFav: boolean;
  onToggleFav: (boat: BoatListing) => void;
  verdict: BoatVerdict | null;
  rideCount: number;
  memo: string;
  distanceKm?: number | null;
}) {
  const shortArea = boat.areaPath.split(" > ").slice(1).join(" · ");
  return (
    // A <button> can't legally nest inside an <a> (invalid HTML, breaks
    // screen-reader focus order), so the card isn't a <Link> anymore — the
    // Link is an absolutely-positioned overlay under the star button
    // (z-0 vs z-10), and the visual content is pointer-events-none so
    // clicks pass through to it everywhere except the star.
    <div
      data-testid="boat-card"
      data-verdict={verdict ?? undefined}
      className="relative bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-[#c9a84c]/40 transition-all"
    >
      <Link
        href={`/booking/boat/${boat.uid}?date=${date}`}
        className="absolute inset-0 z-0"
        aria-label={`${boat.name} 예약 달력 보기`}
      />
      {/* "다시 안 탐" de-ranks the whole card, but the badge explaining WHY
          stays at full opacity below — dimming the reason along with
          everything else would defeat the point of showing it at all. */}
      <div
        className={`relative w-full h-28 bg-white/5 pointer-events-none ${verdict === "never" ? "opacity-50" : ""}`}
      >
        {boat.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={boat.imageUrl}
            alt={boat.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span className="absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-black/60 text-white/80">
          {boat.capacity || "정원 미표기"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onToggleFav(boat)}
        aria-label={isFav ? `${boat.name} 즐겨찾기 해제` : `${boat.name} 즐겨찾기`}
        aria-pressed={isFav}
        className={`absolute top-1.5 right-1.5 z-10 size-7 rounded-full flex items-center justify-center transition-colors ${
          isFav
            ? "bg-[#c9a84c] text-[#080d14]"
            : "bg-black/50 text-white/60 hover:text-white"
        }`}
      >
        <Star size={13} fill={isFav ? "currentColor" : "none"} />
      </button>
      <div className="p-2.5 pointer-events-none">
        <div className={verdict === "never" ? "opacity-50" : ""}>
          <h4 className="text-xs font-bold text-white truncate mb-0.5">
            {boat.name}
          </h4>
          <p className="text-[10px] text-white/40 truncate mb-1">
            {distanceKm !== null && (
              <span
                data-testid="boat-distance"
                className="text-[#7dd3fc]/90 font-semibold"
              >
                ~{Math.round(distanceKm)}km ·{" "}
              </span>
            )}
            {shortArea || boat.areaPath}
          </p>
          <p className="text-[10px] text-[#c9a84c]/80 truncate">
            {boat.fishTypes || "어종 정보 없음"}
          </p>
        </div>
        {verdict === "again" && (
          <p className="text-[10px] text-amber-300 truncate mt-1">
            ⭐ {rideCount}회 승선 · 다시 타고 싶음
          </p>
        )}
        {verdict === "never" && (
          <p className="text-[10px] text-red-300 truncate mt-1">
            ⚠️ 다시 안 탐
          </p>
        )}
        {memo && (verdict === "again" || verdict === "never") && (
          <p className="text-[9px] text-white/40 truncate">{memo}</p>
        )}
      </div>
    </div>
  );
}

function FishappBoatCard({ boat }: { boat: FishappBoat }) {
  return (
    <a
      href={boat.detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-cyan-400/40 transition-all"
    >
      <div className="relative w-full h-28 bg-white/5">
        {boat.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={boat.imageUrl}
            alt={boat.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/80 text-[#080d14] font-bold">
          낚시뚜
        </span>
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-bold text-white truncate mb-0.5">
          {boat.name}
        </h4>
        <p className="text-[10px] text-white/40 truncate">
          {boat.province} · {boat.harbor || boat.area}
        </p>
      </div>
    </a>
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
  // "내 선사 카드" — 즐겨찾기·판정·이력을 배(uid) 하나에 묶어 저장.
  const [myBoats, setMyBoats] = useState<MyBoatMap>({});
  // 시즌 회귀 리마인더용 — 배 태그(boatUid)된 과거 조과기록.
  const [catchRecords, setCatchRecords] = useState<CatchRecord[]>([]);
  const handleToggleFavorite = (boat: BoatListing) => {
    const snap: Omit<BoatSnapshot, "seenAt"> = {
      name: boat.name,
      areaPath: boat.areaPath,
      fishTypes: boat.fishTypes,
      imageUrl: boat.imageUrl,
    };
    toggleFavorite(boat.uid, snap);
    setMyBoats(loadMyBoats());
  };
  // ── 더피싱-style search: date + region + species → boats sailing that day.
  // Starts empty rather than new Date() — a lazy initializer computing
  // "today" runs during this page's server render too, and dev-mode
  // compiles are slow enough (multi-second) that the server's "today" and
  // the client's "today" at hydration can genuinely land on different
  // calendar days, which is a hydration mismatch on the date input's value.
  // Set for real in the mount effect below (client-only).
  const [searchDate, setSearchDate] = useState<string>("");
  const [todayDate, setTodayDate] = useState<string>(""); // for both date inputs' `min`
  const [searchRegion, setSearchRegion] = useState<string>(""); // REGION_FILTERS code
  const [searchSpecies, setSearchSpecies] = useState<string>(""); // SPECIES_FILTERS code
  // 통합 검색 — 서버에 새 요청을 보내지 않고, 이미 불러온 더피싱+낚시뚜
  // 결과를 클라이언트에서 이름·항구·어종으로 한 번 더 거른다. 입력창은
  // keyword로 즉시 반응하고, 실제 필터링은 debouncedKeyword로 살짝 늦춰서
  // 타이핑 중간중간 "일치 없음"이 깜빡이는 걸 막는다 — 이 페이지 전체가
  // 하나의 큰 컴포넌트라 매 키 입력마다 전체가 리렌더되는데, 필터 결과
  // 자체가 그 리렌더 빈도를 따라가지 않게 하는 값싼 방법이기도 하다.
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 200);
    return () => clearTimeout(t);
  }, [keyword]);
  // 항구·정원 — 서버 요청 없이 이미 불러온 결과를 한 번 더 좁힌다. 칩
  // 목록 자체는 지금 결과의 areaPath에서 뽑으므로, 지역/날짜가 바뀌면 그
  // 결과 목록도 같이 바뀌면서 자연히 갱신된다.
  const [selectedPort, setSelectedPort] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState<CapacityBucket | "">("");
  // Date/region/species/keyword all reshape which ports even exist in the
  // current result set — a stale port pick left active after one of those
  // changes can filter to zero boats with the port chip row itself gone
  // (it only renders when portOptions is non-empty), leaving no way back.
  const resetPortFilter = () => setSelectedPort("");
  // 어종 역방향 추천 — "날짜 → 배" 대신 "이 어종, 언제 갈까"로 시작한다.
  const [reverseSpecies, setReverseSpecies] = useState("");
  // 거리순 정렬(2차 GOAL-1) — 위치는 지역 자동 선택과 같은 요청을 재사용.
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sortByDist, setSortByDist] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const handleToggleDistanceSort = () => {
    if (sortByDist) {
      setSortByDist(false);
      setGeoError(false);
      return;
    }
    if (userCoords) {
      setSortByDist(true);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    // mount 시점 요청이 거부/실패했어도 칩을 누르면 한 번 더 요청한다 —
    // 사용자가 방금 의사를 표시했으니 이때가 권한을 물을 적기다.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(false);
        setSortByDist(true);
      },
      () => setGeoError(true),
      { timeout: 5000, maximumAge: 300000 },
    );
  };
  const [searchPage, setSearchPage] = useState(1);
  const [searchResult, setSearchResult] = useState<BoatListingPage | null>(null);
  const [searchBoats, setSearchBoats] = useState<BoatListing[]>([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);

  // Auto-pick the user's sea region once, if they haven't chosen one.
  useEffect(() => {
    if (!userRegion || userRegion === "기타" || searchRegion) return;
    const match = REGION_FILTERS.find((r) => r.label === userRegion);
    if (match) setSearchRegion(match.code);
  }, [userRegion, searchRegion]);

  useEffect(() => {
    if (!searchDate) return; // not yet set by the mount effect
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(false);
    const q = new URLSearchParams({ date: searchDate, page: String(searchPage) });
    if (searchRegion) q.set("region", searchRegion);
    if (searchSpecies) q.set("species", searchSpecies);
    fetch(`/api/boat-listings?${q.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: BoatListingPage & { ok?: boolean }) => {
        if (cancelled) return;
        // A malformed body (no `boats` array) is a failure, not "0 results"
        // — e.g. the service worker's offline fallback used to satisfy
        // `res.ok` with a 200 whose body didn't match this shape at all.
        if (data.ok === false || !Array.isArray(data.boats)) {
          throw new Error("malformed boat-listings response");
        }
        setSearchResult(data);
        setSearchBoats((prev) =>
          searchPage === 1 ? data.boats : [...prev, ...data.boats],
        );
      })
      .catch(() => {
        if (!cancelled) setSearchError(true);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchDate, searchRegion, searchSpecies, searchPage]);

  const resetSearchPage = () => setSearchPage(1);

  // ── 낚시뚜 directory: region-only filter, no date/species (their search
  // API doesn't expose either) — kept in its own labeled section rather
  // than merged into the date-specific grid above, so we never imply a
  // boat is confirmed sailing on searchDate when we don't actually know.
  const [directoryBoats, setDirectoryBoats] = useState<FishappBoat[]>([]);
  const [directoryTotalCached, setDirectoryTotalCached] = useState(0);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDirectoryLoading(true);
    setDirectoryError(false);
    const q = searchRegion ? `?region=${searchRegion}` : "";
    fetch(`/api/boat-directory${q}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        if (data.ok === false || !Array.isArray(data.boats)) {
          throw new Error("malformed boat-directory response");
        }
        setDirectoryBoats(data.boats);
        setDirectoryTotalCached(data.totalCached ?? 0);
      })
      .catch(() => {
        if (!cancelled) setDirectoryError(true);
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchRegion]);

  const loadOperatorAvailability = async (operatorId: BoatOperatorId) => {
    setAvailabilityLoading((prev) => ({ ...prev, [operatorId]: true }));
    setAvailabilityError((prev) => ({ ...prev, [operatorId]: false }));
    try {
      const res = await fetch(`/api/boat-availability?operator=${operatorId}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.ok === false || !Array.isArray(data.days)) {
        throw new Error("malformed boat-availability response");
      }
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

  // 취소 경보 카드의 "달력 열기" — 해당 선사 패널을 펼치고 그리로 스크롤.
  const openOperatorCalendar = (operatorId: BoatOperatorId) => {
    setExpandedOperator(operatorId);
    if (!availability[operatorId]) loadOperatorAvailability(operatorId);
    document
      .getElementById(`operator-${operatorId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    // Local date, not toISOString() — toISOString() is always UTC, so for
    // a KST user (UTC+9) it reads "yesterday" for the first 9 hours of
    // every day (00:00–08:59 KST). Caught live: the search grid defaulted
    // to 2026-08-26 while the clock read 2026-08-27 00:03 KST, and
    // thefishing.kr correctly had zero listings for a date already past.
    const today = localISODate(new Date());
    setSearchDate(today);
    setTodayDate(today);

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
    setMyBoats(loadMyBoats());

    // Best-effort location for the monthly pick — silently falls back to
    // the nationwide top release site if permission is denied/unavailable.
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserRegion(
          getRegionForCoords(pos.coords.latitude, pos.coords.longitude),
        );
        // 거리순 정렬(2차 GOAL-1)도 같은 위치를 재사용 — 권한 요청은 한 번.
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
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

  // 출조 D-1 브리핑 — 내일 승선 예정(빈자리 알림에 등록한 날짜, 또는
  // 즐겨찾기 배에 적어둔 탄 날짜)이 있으면 로컬 알림 한 번 + 상단 카드.
  // 위 watchlist 폴링과 같은 포그라운드 한정이며, 이미 알린 (배,날짜)는
  // localStorage에 기억해 페이지를 다시 열 때마다 재알림하지 않는다.
  // new Date()는 deps 밖이지만 watchlist/myBoats가 바뀔 때마다 현재
  // 시각으로 재계산된다 — 자정을 넘겨 계속 열어둔 탭에서만 하루 어긋날
  // 수 있는 근사치(GOAL-8의 추천 날짜와 같은 한계, 같은 이유로 감수).
  const briefingTrips = useMemo(
    () => dayBeforeTrips(watchlist, myBoats, new Date()),
    [watchlist, myBoats],
  );
  useEffect(() => {
    if (briefingTrips.length === 0) return;
    const KEY = "biteLog_briefingNotified";
    let stored: unknown = [];
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      // 깨진 저장값은 새로 시작
    }
    const { notify, sent } = nextBriefingNotifications(
      stored,
      briefingTrips,
      localISODate(new Date()),
    );
    for (const trip of notify) {
      sendLocalNotification(
        `내일 ${trip.name} 출조 예정`,
        "날씨·물때·채비 브리핑을 미리 확인하세요.",
        undefined,
        `briefing-${trip.name}|${trip.date}`,
      );
    }
    if (notify.length > 0) localStorage.setItem(KEY, JSON.stringify(sent));
  }, [briefingTrips]);

  // 출항 취소 조기 경보 — 빈자리 알림에 등록한 승선일이 D-3~D-1이면 그
  // 선사 모항 근해의 일별 예보(풍속·파고 최대)를 확인해 임계 초과 시
  // 경보 카드 + 로컬 알림 1회, 같은 배의 자리 있는 대안 날짜 최대 2개.
  // 예보 결측·API 실패는 조용히 생략(오탐 경보 금지). 즐겨찾기 rides는
  // 선사 달력이 없어 대안 날짜를 못 주므로 여기선 다루지 않는다.
  interface CancelAlert {
    operatorId: BoatOperatorId;
    boatName: string;
    date: string;
    windSpeedMax: number | null;
    waveHeightMax: number | null;
    alternatives: string[];
  }
  const [cancelAlerts, setCancelAlerts] = useState<CancelAlert[]>([]);
  useEffect(() => {
    const inWindow = watchlist.filter((w) =>
      isWithinAlertWindow(w.date, new Date()),
    );
    if (inWindow.length === 0) {
      setCancelAlerts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const outlookCache = new Map<
        BoatOperatorId,
        Awaited<ReturnType<typeof fetchDailyMarineOutlook>>
      >();
      const daysCache = new Map<BoatOperatorId, BoatDayStatus[]>();
      const alerts: CancelAlert[] = [];
      for (const w of inWindow) {
        const coords = OPERATOR_COORDS[w.operatorId];
        if (!coords) continue;
        try {
          if (!outlookCache.has(w.operatorId)) {
            outlookCache.set(
              w.operatorId,
              await fetchDailyMarineOutlook(coords.lat, coords.lng),
            );
          }
          const day = outlookCache
            .get(w.operatorId)!
            .find((o) => o.date === w.date);
          if (!day || !isCancellationRisk(day)) continue;
          if (!daysCache.has(w.operatorId)) {
            const res = await fetch(
              `/api/boat-availability?operator=${w.operatorId}`,
            );
            daysCache.set(
              w.operatorId,
              res.ok
                ? ((await res.json()) as { days: BoatDayStatus[] }).days
                : [],
            );
          }
          // 예보상 같은 악천후 창에 있는 날짜는 대안에서 제외 — 예보
          // 범위(5일) 밖은 판정 불가라 허용.
          const risky = new Set(
            outlookCache
              .get(w.operatorId)!
              .filter(isCancellationRisk)
              .map((o) => o.date),
          );
          alerts.push({
            ...w,
            windSpeedMax: day.windSpeedMax,
            waveHeightMax: day.waveHeightMax,
            alternatives: alternativeDates(
              daysCache.get(w.operatorId)!,
              w.boatName,
              w.date,
              2,
              risky,
            ),
          });
        } catch {
          // 이 배 하나만 조용히 생략 — 나머지 경보는 계속 평가
        }
      }
      if (!cancelled) setCancelAlerts(alerts);
    })();
    return () => {
      cancelled = true;
    };
  }, [watchlist]);
  useEffect(() => {
    if (cancelAlerts.length === 0) return;
    const KEY = "biteLog_cancelAlertNotified";
    let stored: unknown = [];
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      // 깨진 저장값은 새로 시작
    }
    const { notify, sent } = nextBriefingNotifications(
      stored,
      cancelAlerts.map((a) => ({ name: a.boatName, date: a.date })),
      localISODate(new Date()),
    );
    for (const t of notify) {
      sendLocalNotification(
        `${t.name} 출항 취소 가능성`,
        `${formatShortDate(t.date)} 예보가 좋지 않아요. 대안 날짜를 확인해 보세요.`,
        undefined,
        `cancel-${t.name}|${t.date}`,
      );
    }
    if (notify.length > 0) localStorage.setItem(KEY, JSON.stringify(sent));
  }, [cancelAlerts]);

  // 시즌 회귀 리마인더 — 기록을 못 읽으면 카드만 조용히 생략.
  useEffect(() => {
    let cancelled = false;
    getDataService()
      .getCatchRecords()
      .then((records) => {
        if (!cancelled) setCatchRecords(records);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const seasonRems = useMemo(
    () => seasonReminders(catchRecords, new Date()),
    [catchRecords],
  );

  const spotOfMonth = useMemo(
    () => getMonthlyRecommendation(currentMonth, currentDay, userRegion),
    [currentMonth, currentDay, userRegion],
  );

  const favoriteBoats = useMemo(() => favoritesFromMap(myBoats), [myBoats]);
  // "다시 안 탐" 배는 목록에서 숨기지 않고 맨 아래로 밀어낸다 — 실수로
  // 재예약하는 걸 막는 게 목적이라, 안 보이면 그 목적을 못 이룬다.
  // 거리순은 verdict 정렬보다 먼저 — sortByVerdict가 안정 partition이라
  // '안 탄다' 배는 여전히 맨 뒤로 가고, 각 구획 안에서 거리순이 유지된다.
  const sortedSearchBoats = useMemo(() => {
    const base =
      sortByDist && userCoords
        ? sortBoatsByDistance(searchBoats, userCoords.lat, userCoords.lng)
        : searchBoats;
    return sortByVerdict(base, myBoats);
  }, [searchBoats, myBoats, sortByDist, userCoords]);
  const keywordFilteredSearchBoats = useMemo(
    () =>
      sortedSearchBoats.filter((b) =>
        matchesKeyword(debouncedKeyword, b.name, b.areaPath, b.fishTypes),
      ),
    [sortedSearchBoats, debouncedKeyword],
  );
  const keywordFilteredDirectoryBoats = useMemo(
    () =>
      directoryBoats.filter((b) =>
        matchesKeyword(debouncedKeyword, b.name, b.province, b.area, b.harbor),
      ),
    [directoryBoats, debouncedKeyword],
  );
  // 항구 칩은 "지금 이 조건에서 뭐가 있는지"를 보여줘야 하니 항구/정원
  // 필터를 적용하기 전, 키워드까지만 거른 목록에서 뽑는다 — 이미 항구를
  // 골랐다고 칩 목록이 그 항구 하나로 쪼그라들면 다른 항구로 못 바꾼다.
  const portOptions = useMemo(
    () => extractPorts(keywordFilteredSearchBoats.map((b) => b.areaPath)),
    [keywordFilteredSearchBoats],
  );
  const finalFilteredSearchBoats = useMemo(
    () =>
      keywordFilteredSearchBoats.filter((b) => {
        if (selectedPort && shortPort(b.areaPath) !== selectedPort) return false;
        if (selectedCapacity && capacityBucket(b.capacity) !== selectedCapacity) return false;
        return true;
      }),
    [keywordFilteredSearchBoats, selectedPort, selectedCapacity],
  );
  // Any client-side narrowing that makes the server's own total/pagination
  // fraction stop meaning "what you're looking at" — the count label and
  // the 더 보기 label both fall back to a plain filtered count once true.
  const hasClientFilter = Boolean(
    searchSpecies || debouncedKeyword.trim() || selectedPort || selectedCapacity,
  );

  const reverseSeasonData = reverseSpecies
    ? (FISH_SEASON_DB.find((d) => d.species === reverseSpecies) ?? null)
    : null;
  const reverseSeasonStatus = reverseSeasonData
    ? getSeasonStatus(reverseSeasonData, currentMonth, currentDay)
    : null;
  // `now`를 deps에서 뺀 채로 둔다 — 같은 종을 껐다 다시 켜면(토글)
  // reverseSpecies가 바뀌므로 그때마다 이 시점의 최신 now로 다시 계산된다.
  // 재계산 없이 남는 경우는 "같은 종을 선택한 패널을 자정 넘게 열어
  // 둔다" 뿐인데, 14일 창이 겹치는 범위가 커서 실질적으로 하루 어긋나도
  // 추천이 크게 달라지지 않는다.
  const recommendedDates = useMemo(
    () => (reverseSpecies ? recommendDates(now, 14, 3) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reverseSpecies],
  );

  const handlePickRecommendedDate = (date: string) => {
    const code = SPECIES_FILTERS.find((s) => s.label === reverseSpecies)?.code ?? "";
    setSearchDate(date);
    setSearchSpecies(code);
    resetSearchPage();
    resetPortFilter();
    setKeyword("");
    // 스크롤만으로는 스크린리더 사용자에게 "여기로 왔다"는 신호가 안
    // 간다 — 헤딩에 포커스를 옮기면 스크롤과 알림을 동시에 해결한다.
    const heading = document.getElementById("search-results-heading");
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
    heading?.focus();
  };

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

        {/* 즐겨찾는 선사 — 별표한 배를 uid로 저장해 두므로 선사가 이름·모항을
            바꿔도(GOAL-3) 계속 같은 배로 따라간다. 즐겨찾기 없으면 섹션 자체를
            숨긴다 — 빈 상태를 위한 공간을 매번 차지하게 두지 않는다. */}
        {favoriteBoats.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] px-1">
              즐겨찾는 선사
            </h3>
            <div
              data-testid="favorite-boats"
              className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
            >
              {favoriteBoats.map((fav) => (
                <Link
                  key={fav.uid}
                  href={`/booking/boat/${fav.uid}`}
                  className="shrink-0 w-40 bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-[#c9a84c]/40 transition-all"
                >
                  <div className="relative w-full h-20 bg-white/5">
                    {fav.latest?.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fav.latest.imageUrl}
                        alt={fav.latest?.name ?? fav.uid}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <span className="absolute top-1.5 right-1.5 size-6 rounded-full bg-[#c9a84c] text-[#080d14] flex items-center justify-center">
                      <Star size={11} fill="currentColor" />
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-white truncate">
                      {fav.latest?.name ?? `선박 #${fav.uid}`}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">
                      {fav.latest?.areaPath.split(" > ").slice(-1)[0] ?? ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 출항 취소 조기 경보 — D-1 브리핑보다 위: 일정 자체가 무산될 수
            있다는 정보가 준비물 안내보다 급하다. */}
        {cancelAlerts.length > 0 && (
          <section
            data-testid="cancel-alert-card"
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-400/10 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <TriangleAlert
                size={14}
                className="text-red-300"
                aria-hidden="true"
              />
              <p className="text-xs font-bold text-red-300">
                출항 취소 가능성
              </p>
            </div>
            {cancelAlerts.map((a) => (
              <div
                key={`${a.operatorId}|${a.boatName}|${a.date}`}
                className="space-y-1"
              >
                <p className="text-sm text-white/85">
                  {a.boatName} · {formatShortDate(a.date)} — 예보{" "}
                  {a.windSpeedMax !== null &&
                    `풍속 최대 ${Math.round(a.windSpeedMax * 10) / 10}m/s`}
                  {a.windSpeedMax !== null && a.waveHeightMax !== null && " · "}
                  {a.waveHeightMax !== null &&
                    `파고 최대 ${Math.round(a.waveHeightMax * 10) / 10}m`}
                </p>
                {a.alternatives.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-white/60">
                      자리 있는 대안 날짜:{" "}
                      {a.alternatives.map(formatShortDate).join(" · ")}
                    </p>
                    <button
                      type="button"
                      onClick={() => openOperatorCalendar(a.operatorId)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-400/15 border border-red-400/30 text-red-200 hover:bg-red-400/25 transition-colors"
                    >
                      선사 달력 열기
                    </button>
                  </div>
                )}
              </div>
            ))}
            <p className="text-[10px] text-white/45">
              예보 기준 참고용이에요 — 실제 출항 여부는 선사가 결정합니다.
            </p>
          </section>
        )}

        {/* 출조 D-1 브리핑 — 알림은 포그라운드+권한 허용일 때만 도달하므로,
            조건이 참인 동안 카드는 항상 그린다(알림이 못 간 경우의 보험). */}
        {briefingTrips.length > 0 && (
          <section
            data-testid="trip-briefing-card"
            className="rounded-2xl border border-[#7dd3fc]/30 bg-[#7dd3fc]/8 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <BellRing size={14} className="text-[#7dd3fc]" aria-hidden="true" />
              <p className="text-xs font-bold text-[#7dd3fc]">내일 출조 예정</p>
            </div>
            {briefingTrips.map((trip) => (
              <div
                key={`${trip.name}|${trip.date}`}
                className="flex items-center justify-between gap-2"
              >
                <p className="text-sm text-white/80 truncate">
                  {trip.name} · {formatShortDate(trip.date)}
                </p>
                <Link
                  href={`/trip-plan?date=${trip.date}&name=${encodeURIComponent(trip.name)}`}
                  aria-label={`${trip.name} 출조 브리핑 준비`}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#7dd3fc]/15 border border-[#7dd3fc]/30 text-[#7dd3fc] hover:bg-[#7dd3fc]/25 transition-colors"
                >
                  출조 브리핑 준비
                </Link>
              </div>
            ))}
            <p className="text-[10px] text-white/45">
              날씨 · 물때 · 채비 체크리스트를 브리핑에서 한 번에 확인하세요.
            </p>
          </section>
        )}

        {/* 시즌 회귀 리마인더 — 작년 같은 달의 승선 기록 어종이 지금 다시
            시즌이면 알려준다. 이력 없는 사용자에겐 아무것도 안 그린다. */}
        {seasonRems.length > 0 && (
          <section
            data-testid="season-reminder-card"
            className="rounded-2xl border border-[#c9a84c]/30 bg-[#c9a84c]/8 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#c9a84c]" aria-hidden="true" />
              <p className="text-xs font-bold text-[#c9a84c]">
                작년 이맘때 다녀오셨어요
              </p>
            </div>
            {seasonRems.map((rem) => (
              <div
                key={rem.species}
                className="flex items-center justify-between gap-2"
              >
                <p className="text-sm text-white/80">
                  {rem.lastYear}년 {currentMonth}월 {rem.species} 출조{" "}
                  {rem.tripCount}회 — 지금이{" "}
                  {rem.status === "gold" ? "황금" : "피크"} 시즌이에요
                </p>
                {REVERSE_SPECIES_OPTIONS.includes(rem.species) && (
                  <button
                    type="button"
                    onClick={() => setReverseSpecies(rem.species)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/25 transition-colors"
                  >
                    날짜 추천 보기
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* 어종 역방향 추천 — "날짜 → 배" 대신 "이 어종, 언제 갈까"를 먼저
            묻는다. 시즌 상태는 FISH_SEASON_DB, 추천 날짜는 GOAL-7의 물때
            지수를 그대로 재사용(새 점수 계산도, 새 API 호출도 없음).
            추천 날짜를 고르면 기존 날짜-우선 검색 상태(searchDate/
            searchSpecies)를 그대로 세팅한다 — 아래 검색 그리드가 이미
            그 상태를 구독하고 있어 새 fetch 로직 없이 자연히 다시 그려진다. */}
        <section
          data-testid="reverse-recommendation"
          className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-3"
        >
          <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] flex items-center gap-1.5">
            <Fish size={12} className="text-[#c9a84c]" aria-hidden="true" />
            어종으로 찾기
          </h3>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="어종 선택">
            {REVERSE_SPECIES_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setReverseSpecies((cur) => (cur === s ? "" : s))}
                aria-pressed={reverseSpecies === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  reverseSpecies === s
                    ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {reverseSpecies && reverseSeasonData && reverseSeasonStatus && (
            <div className="space-y-2">
              <p className="text-xs text-white/60">
                {reverseSpecies} ·{" "}
                <span
                  className={
                    reverseSeasonStatus === "gold" || reverseSeasonStatus === "peak"
                      ? "text-[#c9a84c] font-semibold"
                      : "text-white/40"
                  }
                >
                  {SEASON_STATUS_LABEL[reverseSeasonStatus]}
                </span>
              </p>

              {recommendedDates.length === 0 ? (
                <p role="status" className="text-xs text-white/30 py-2">
                  향후 14일 중 추천할 만한 물때 데이터를 찾지 못했습니다.
                </p>
              ) : (
                // <button role="listitem">이었으면 버튼의 네이티브 role이
                // 덮어써져 스크린리더가 클릭 가능한 요소로 인식 못 한다 —
                // role은 li에 맡기고 button은 그대로 button으로 둔다.
                <ul className="flex flex-col gap-1.5 list-none" aria-label="추천 출조일">
                  {recommendedDates.map((r) => (
                    <li key={r.date}>
                      <button
                        type="button"
                        onClick={() => handlePickRecommendedDate(r.date)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#c9a84c]/40 hover:bg-white/10 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar size={13} className="text-[#c9a84c]" aria-hidden="true" />
                          <span className="text-xs font-bold text-white">
                            {formatShortDate(r.date)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-white/50">
                          {BITE_GRADE_LABEL[r.grade]}
                          <ChevronRight size={12} aria-hidden="true" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-white/40">
                날짜를 고르면 그날 이 어종으로 출조하는 선박을 아래에서 보여드려요
              </p>
            </div>
          )}
        </section>

        {/* 통합 검색 — 더피싱과 낚시뚜, 소스 두 개를 동시에 훑는 건 개별
            플랫폼엔 없는 기능이다. 서버 요청은 추가하지 않고, 이미 불러온
            결과를 이름·항구·어종 기준으로 클라이언트에서 한 번 더 거른다. */}
        <section
          data-testid="keyword-search"
          className="bg-white/3 border border-white/8 rounded-2xl p-3"
        >
          <label className="relative block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                resetPortFilter(); // a keyword can drop this port out of portOptions entirely
              }}
              placeholder="배 이름·항구·어종으로 검색 (더피싱+낚시뚜 통합)"
              aria-label="선박 통합 검색"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                aria-label="검색어 지우기"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-white/10 text-white/50 hover:text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            )}
          </label>
        </section>

        {/* 더피싱-style search: pick a date, filter by region/species, see the
            boats sailing that day, tap one to open its month calendar with
            per-day 예약하기 → the boat's own booking page. */}
        <section className="space-y-3">
          <div className="glass-morphism border border-white/5 rounded-2xl p-4 space-y-3">
            <label className="block">
              <span className="block text-xs text-white/50 mb-1.5 font-medium">
                <Calendar size={12} className="inline mr-1 text-[#c9a84c]" />
                출조 날짜
              </span>
              <input
                type="date"
                value={searchDate}
                min={todayDate || undefined}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  resetSearchPage();
                  resetPortFilter();
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
              />
            </label>

            <div>
              <span className="block text-xs text-white/50 mb-1.5 font-medium">
                <MapPin size={12} className="inline mr-1 text-[#c9a84c]" aria-hidden="true" />
                지역
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="지역 필터">
                {[{ id: "all", label: "전체", code: "" }, ...REGION_FILTERS].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSearchRegion(r.code);
                      resetSearchPage();
                      resetPortFilter();
                    }}
                    aria-pressed={searchRegion === r.code}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      searchRegion === r.code
                        ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs text-white/50 mb-1.5 font-medium">
                <Fish size={12} className="inline mr-1 text-[#c9a84c]" aria-hidden="true" />
                어종
              </span>
              <div
                className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
                role="group"
                aria-label="어종 필터"
              >
                {[{ label: "전체", code: "" }, ...SPECIES_FILTERS].map((s) => (
                  <button
                    key={s.code || "all"}
                    onClick={() => {
                      setSearchSpecies(s.code);
                      resetSearchPage();
                      resetPortFilter();
                    }}
                    aria-pressed={searchSpecies === s.code}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      searchSpecies === s.code
                        ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {(portOptions.length > 0 || selectedPort) && (
              <div>
                <span className="block text-xs text-white/50 mb-1.5 font-medium">
                  <Anchor size={12} className="inline mr-1 text-[#c9a84c]" aria-hidden="true" />
                  항구
                </span>
                <div
                  data-testid="port-filter"
                  className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
                  role="group"
                  aria-label="항구 필터"
                >
                  {[{ label: "전체", value: "" }, ...portOptions.map((p) => ({ label: p, value: p }))].map(
                    (p) => (
                      <button
                        key={p.value || "all"}
                        onClick={() => setSelectedPort(p.value)}
                        aria-pressed={selectedPort === p.value}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          selectedPort === p.value
                            ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                            : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                        }`}
                      >
                        {p.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            <div>
              <span className="block text-xs text-white/50 mb-1.5 font-medium">
                <Users size={12} className="inline mr-1 text-[#c9a84c]" aria-hidden="true" />
                정원
              </span>
              <div data-testid="capacity-filter" className="flex gap-1.5" role="group" aria-label="정원 필터">
                {CAPACITY_OPTIONS.map((c) => (
                  <button
                    key={c.value || "all"}
                    onClick={() => setSelectedCapacity(c.value)}
                    aria-pressed={selectedCapacity === c.value}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedCapacity === c.value
                        ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                        : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3
              id="search-results-heading"
              tabIndex={-1}
              className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] scroll-mt-4 focus:outline-none"
            >
              {searchDate.slice(5).replace("-", "/")} 출조 선박
            </h3>
            {/* 기존 e2e가 h3의 following-sibling::span으로 개수 라벨을
                찾으므로, 칩을 넣어도 h3·span의 형제 관계는 유지한다. */}
            <button
              type="button"
              onClick={handleToggleDistanceSort}
              aria-pressed={sortByDist}
              aria-describedby={geoError ? "distance-sort-error" : undefined}
              className={`ml-auto mr-2 text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                sortByDist
                  ? "bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c] font-semibold"
                  : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              거리순
            </button>
            <span className="text-[11px] text-white/40" aria-live="polite">
              {searchResult
                ? hasClientFilter
                  ? `${finalFilteredSearchBoats.length}척 일치`
                  : `${searchResult.total}척`
                : ""}
            </span>
          </div>
          {geoError && (
            <p
              id="distance-sort-error"
              role="alert"
              className="text-[10px] text-amber-200/80 px-1"
            >
              위치 권한이 없어 거리순 정렬을 쓸 수 없어요. 브라우저 설정에서
              위치를 허용한 뒤 다시 눌러주세요.
            </p>
          )}

          {searchError ? (
            <p className="text-xs text-white/30 py-6 text-center">
              선박 목록을 지금 불러오지 못했습니다.
            </p>
          ) : searchLoading && searchBoats.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/3 animate-pulse" />
              ))}
            </div>
          ) : searchBoats.length === 0 ? (
            <p role="status" className="text-xs text-white/30 py-6 text-center">
              이 조건으로 출조하는 선박이 없습니다. 날짜나 필터를 바꿔보세요.
            </p>
          ) : finalFilteredSearchBoats.length === 0 ? (
            <div role="status" className="py-6 text-center space-y-2">
              <p className="text-xs text-white/30">
                {debouncedKeyword.trim()
                  ? "검색어와 일치하는 선박이 없습니다. 다른 키워드를 시도해보세요."
                  : "이 조건에 맞는 선박이 없습니다. 항구나 정원 필터를 바꿔보세요."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setSelectedPort("");
                  setSelectedCapacity("");
                }}
                className="text-xs text-[#c9a84c] underline underline-offset-2"
              >
                검색어·항구·정원 필터 초기화
              </button>
            </div>
          ) : (
            <>
              <div
                data-testid="search-results"
                className={`grid grid-cols-2 gap-2 ${searchLoading ? "opacity-60" : ""}`}
              >
                {finalFilteredSearchBoats.map((boat) => (
                  <BoatListingCard
                    key={boat.uid}
                    boat={boat}
                    date={searchDate}
                    isFav={!!myBoats[boat.uid]?.favorite}
                    onToggleFav={handleToggleFavorite}
                    verdict={myBoats[boat.uid]?.verdict ?? null}
                    rideCount={myBoats[boat.uid]?.rides.length ?? 0}
                    memo={myBoats[boat.uid]?.memo ?? ""}
                    distanceKm={
                      sortByDist && userCoords
                        ? distanceKmForAreaPath(
                            boat.areaPath,
                            userCoords.lat,
                            userCoords.lng,
                          )
                        : null
                    }
                  />
                ))}
              </div>
              {searchResult && searchBoats.length < searchResult.total && (
                <button
                  onClick={() => setSearchPage((p) => p + 1)}
                  disabled={searchLoading}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-40"
                >
                  {searchLoading
                    ? "불러오는 중..."
                    : hasClientFilter
                      ? "더 보기"
                      : `더 보기 (${searchBoats.length}/${searchResult.total})`}
                </button>
              )}
            </>
          )}
          <p className="text-[10px] text-white/25 px-1">
            더피싱 예약 시스템 기준 · 선박을 누르면 달력과 남은 자리가 보이고,
            예약은 선사 홈페이지에서 이루어집니다
          </p>
        </section>

        {/* 낚시뚜 directory — a second, separately-labeled source. No
            date/species filter (their API doesn't expose either), so this
            is deliberately not merged into the date-specific grid above:
            merging would imply these boats are confirmed sailing on
            searchDate, which we don't actually know. Boats appear here as
            the daily cron warms them in — see fishappListingService.ts. */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em]">
              낚시뚜 등록 선박 (날짜 무관)
            </h3>
            {directoryTotalCached > 0 && (
              <span className="text-[11px] text-white/40" aria-live="polite">
                {debouncedKeyword.trim()
                  ? `${keywordFilteredDirectoryBoats.length}척 일치`
                  : `${directoryTotalCached}/177척 동기화됨`}
              </span>
            )}
          </div>
          {directoryError ? (
            <p className="text-xs text-white/30 py-4 text-center">
              선박 목록을 지금 불러오지 못했습니다.
            </p>
          ) : directoryLoading && directoryBoats.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-white/3 animate-pulse" />
              ))}
            </div>
          ) : directoryBoats.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">
              {directoryTotalCached === 0
                ? "매일 조금씩 동기화 중입니다 — 곧 채워집니다."
                : "이 지역에 동기화된 선박이 아직 없습니다."}
            </p>
          ) : keywordFilteredDirectoryBoats.length === 0 ? (
            <p role="status" className="text-xs text-white/30 py-4 text-center">
              검색어와 일치하는 선박이 없습니다. 다른 키워드를 시도해보세요.
            </p>
          ) : (
            <div data-testid="fishapp-results" className="grid grid-cols-2 gap-2">
              {keywordFilteredDirectoryBoats.map((boat) => (
                <FishappBoatCard key={boat.shipId} boat={boat} />
              ))}
            </div>
          )}
          <p className="text-[10px] text-white/25 px-1">
            낚시뚜 등록 선사 목록 · 날짜별 예약 가능 여부는 선박을 눌러 낚시뚜
            페이지에서 확인하세요
          </p>
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
                  min={todayDate || undefined}
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
                  id={`operator-${platform.id}`}
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
