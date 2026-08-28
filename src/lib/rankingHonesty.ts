// 5차 GOAL-4 — 랭킹 정직화. 랭킹은 공개 피드만 집계하는데 기록의 기본
// 공개 설정은 '비공개'라, 리더보드는 사실 "공개 의지" 순위에 가깝다.
// 그 사실을 화면에 말하고, 내 미반영 건수를 계산해 알려준다.
import type { CatchRecord } from "@/types";

/** 이번 시즌(이번 달) 내 비공개 기록 수 — 랭킹에 반영되지 않는 것들. */
export function unrankedCount(records: CatchRecord[], now: Date): number {
  const seasonStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return records.filter(
    (r) => r.date >= seasonStart && (r.visibility ?? "private") !== "public",
  ).length;
}

/**
 * 지역 필터 — 피드 항목의 location.region 기준. '전국'이면 전부.
 * region이 없는 항목은 지역 랭킹에서 빠진다(지역을 모르는 걸 특정
 * 지역에 넣지 않는다).
 */
export function filterByRegion<T extends { region?: string }>(
  items: T[],
  region: string,
): T[] {
  if (!region || region === "전국") return items;
  return items.filter((i) => i.region === region);
}

/** 배지 표시용 상위 N개 — 획득한 것만, 정의 순서 유지. */
export function earnedBadgeIcons(
  badges: { icon: string; earned?: boolean; unlocked?: boolean }[],
  limit = 3,
): string[] {
  return badges
    .filter((b) => b.earned ?? b.unlocked ?? false)
    .slice(0, limit)
    .map((b) => b.icon);
}
