// GOAL-9 — 출조 브리핑 D-1 판정 + 시즌 회귀 리마인더. 전부 순수 함수라
// 시간(now)을 주입받는다 — 테스트에서 시계를 고정하기 위한 구조이자,
// localDate.ts 의 UTC 함정 회귀를 피하기 위해 로컬 날짜 헬퍼만 쓴다.
import type { CatchRecord } from "@/types";
import type { MyBoatMap } from "@/services/myBoatService";
import { FISH_SEASON_DB, getSeasonStatus } from "@/data/fishSeasonDB";
import { localISODate, parseLocalISODate } from "./localDate";

export interface UpcomingTrip {
  name: string; // 배 이름
  date: string; // YYYY-MM-DD
  uid?: string; // 더피싱 uid — 즐겨찾기 rides 출처일 때만
}

/** tripDate가 now 기준 "내일"인가 (로컬 달력 기준, 월말 넘김 포함). */
export function isDayBefore(tripDate: string, now: Date): boolean {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return tripDate === localISODate(tomorrow);
}

/**
 * D-1 브리핑 대상 — 빈자리 알림 watchlist의 (배, 날짜) + 즐겨찾기 배에
 * 기록된 탄 날짜 중 내일인 것. 같은 배·날짜가 양쪽에 있으면 한 번만.
 */
export function dayBeforeTrips(
  watchlist: { boatName: string; date: string }[],
  myBoats: MyBoatMap,
  now: Date,
): UpcomingTrip[] {
  const trips: UpcomingTrip[] = [];
  for (const w of watchlist) {
    if (isDayBefore(w.date, now)) trips.push({ name: w.boatName, date: w.date });
  }
  for (const [uid, boat] of Object.entries(myBoats)) {
    if (!boat.favorite) continue;
    const name =
      boat.snapshots[boat.snapshots.length - 1]?.name ?? `선박 #${uid}`;
    for (const ride of boat.rides) {
      if (isDayBefore(ride.date, now))
        trips.push({ name, date: ride.date, uid });
    }
  }
  const seen = new Set<string>();
  return trips.filter((t) => {
    const key = `${t.name}|${t.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * D-1 알림 dedupe — localStorage에 저장된 "이미 알린 키" 목록(sentRaw,
 * 깨진 값 허용)과 오늘 날짜를 받아, 이번에 알릴 trip과 저장할 다음 키
 * 목록을 돌려준다. 키는 `이름|YYYY-MM-DD` — watchlist 항목엔 uid가 없어
 * 두 소스에 걸친 같은 배를 묶을 공통 속성이 이름뿐이다(같은 날 같은
 * 이름의 다른 배가 하나로 합쳐지는 건 감수하는 한계). 날짜는 항상 키의
 * 마지막 세그먼트로 읽어서 이름에 `|`가 들어 있어도 깨지지 않는다.
 */
export function nextBriefingNotifications(
  sentRaw: unknown,
  trips: UpcomingTrip[],
  today: string,
): { notify: UpcomingTrip[]; sent: string[] } {
  let sent: string[] = Array.isArray(sentRaw)
    ? sentRaw.filter((k): k is string => typeof k === "string")
    : [];
  sent = sent.filter((k) => (k.split("|").pop() ?? "") >= today);
  const notify = trips.filter((t) => !sent.includes(`${t.name}|${t.date}`));
  return { notify, sent: [...sent, ...notify.map((t) => `${t.name}|${t.date}`)] };
}

export interface SeasonReminder {
  species: string;
  lastYear: number; // 가장 최근 과거 출조 연도
  tripCount: number; // 같은 달 과거 출조 기록 건수 (연도 무관 합산)
  status: "peak" | "gold";
}

/**
 * "작년 이맘때 ○○ 출조" — 배 태그(boatUid)된 과거 연도 기록 중 지금과
 * 같은 달의 어종이, FISH_SEASON_DB 기준 현재 피크/황금 시즌이면 리마인더.
 * 시즌 데이터 없는 어종·금어기(closed)·비시즌은 조용히 생략한다.
 */
export function seasonReminders(
  records: CatchRecord[],
  now: Date,
): SeasonReminder[] {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const bySpecies = new Map<string, { count: number; lastYear: number }>();
  for (const r of records) {
    if (!r.boatUid) continue; // 승선(출조) 기록만
    const d = parseLocalISODate(r.date);
    if (!d) continue;
    if (d.getFullYear() >= year) continue; // "작년 이맘때" — 과거 연도만
    if (d.getMonth() + 1 !== month) continue; // 같은 달만
    const cur = bySpecies.get(r.species) ?? { count: 0, lastYear: 0 };
    cur.count += 1;
    cur.lastYear = Math.max(cur.lastYear, d.getFullYear());
    bySpecies.set(r.species, cur);
  }
  const out: SeasonReminder[] = [];
  for (const [species, agg] of bySpecies) {
    const data = FISH_SEASON_DB.find((f) => f.species === species);
    if (!data) continue;
    const status = getSeasonStatus(data, month, day);
    if (status !== "peak" && status !== "gold") continue;
    out.push({ species, lastYear: agg.lastYear, tripCount: agg.count, status });
  }
  return out.sort((a, b) => b.tripCount - a.tripCount);
}
