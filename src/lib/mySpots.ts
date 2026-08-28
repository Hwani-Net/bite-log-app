// 3차 GOAL-5 — "나의 포인트". 하드코딩 시크릿 포인트를 대체하는, 사용자
// 실기록 기반 상위 포인트. 총 조과 우선, 동률이면 방문 수.
import type { CatchRecord } from "@/types";

export interface MySpot {
  name: string;
  visits: number;
  totalCatch: number;
}

export function topSpotsFromRecords(
  records: CatchRecord[],
  limit = 3,
): MySpot[] {
  const map = new Map<string, { visits: number; totalCatch: number }>();
  for (const r of records) {
    const name = r.location?.name?.trim();
    // 위치 미지정 기록은 포인트가 아니다.
    if (!name || name === "위치 미지정" || name === "Unknown") continue;
    const cur = map.get(name) ?? { visits: 0, totalCatch: 0 };
    cur.visits += 1;
    // count 누락/비수치 기록이 NaN을 전염시키지 않게.
    cur.totalCatch += Number.isFinite(r.count) ? r.count : 0;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalCatch - a.totalCatch || b.visits - a.visits)
    .slice(0, limit);
}
