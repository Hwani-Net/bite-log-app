// 4차 GOAL-2 — 금어기 해제 D-3 알림. 이 앱의 첫 "실제로 울리는" 알림:
// 규정DB(정적) × 내 기록 상위 어종(getAutoDetectedPrefs) × 기존
// sendLocalNotification — 서버·크론·FCM 없이 앱을 열 때 검사한다.
// 전부 순수 함수(시간 주입), 발화 dedupe는 tripReminders의
// nextBriefingNotifications를 별도 키로 재사용한다.
import { FISH_REGULATION_DB } from "@/data/fishRegulationDB";
import { getAutoDetectedPrefs } from "@/services/openRunAlertService";
import type { CatchRecord } from "@/types";
import { localISODate } from "./localDate";

export interface SeasonOpenAlert {
  species: string;
  openDate: string; // YYYY-MM-DD — 금어기 end 다음날
  daysLeft: number; // 0(오늘 해제)~windowDays
}

/**
 * "M/D" 금어기 종료일 → now 기준 다가오는 해제일(end 다음날, 오늘 포함
 * 이후 가장 가까운 해). 12/31 종료는 다음해 1/1로 자연 이월된다(Date
 * 생성자가 월말·연말을 넘겨 계산). 형식 불량은 null.
 */
export function nextOpenDate(end: string, now: Date): Date | null {
  const parts = end.split("/").map(Number);
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  const [m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let open = new Date(now.getFullYear(), m - 1, d + 1);
  if (open < today) open = new Date(now.getFullYear() + 1, m - 1, d + 1);
  return open;
}

/**
 * 지금 알릴 만한 해제 임박 어종 — 금어기가 있는 규정DB 어종 중 내 기록
 * 상위 어종(자동 감지 top3)에 들고, 해제까지 0~windowDays일 남은 것.
 * 기록 없는 사용자는 빈 배열(아무에게나 울리지 않는다).
 */
export function pendingSeasonOpenAlerts(
  records: CatchRecord[],
  now: Date,
  windowDays = 3,
): SeasonOpenAlert[] {
  const mySpecies = new Set(
    getAutoDetectedPrefs(records).map((p) => p.species),
  );
  if (mySpecies.size === 0) return [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: SeasonOpenAlert[] = [];
  for (const reg of FISH_REGULATION_DB) {
    if (!reg.closedSeason || !mySpecies.has(reg.species)) continue;
    const open = nextOpenDate(reg.closedSeason.end, now);
    if (!open) continue;
    const daysLeft = Math.round((open.getTime() - today.getTime()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= windowDays) {
      out.push({
        species: reg.species,
        openDate: localISODate(open),
        daysLeft,
      });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
