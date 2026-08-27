// "이 어종, 언제 갈까" — 날짜를 먼저 고르는 대신 어종을 먼저 고르면, 향후
// 며칠 중 물때가 가장 좋은 날을 추천한다. GOAL-7의 calendarBiteOverlay를
// 그대로 재사용 — 새 외부 요청이나 새 점수 계산 로직을 또 만들지 않는다.

import { localISODate } from "@/lib/localDate";
import { biteGradeForDate, type BiteGrade } from "@/lib/calendarBiteOverlay";

export interface RecommendedDate {
  date: string; // YYYY-MM-DD
  grade: BiteGrade;
}

const GRADE_PRIORITY: Record<BiteGrade, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

/**
 * `today` 기준 향후 `days`일(오늘 포함, 기본 14일) 중 물때 지수가 가장
 * 좋은 최대 `limit`개(기본 3) 날짜를 고른다. 등급이 같으면 더 가까운
 * 날짜를 먼저 — "언젠가 좋은 날"보다 "곧 갈 수 있는 좋은 날"이 실제로
 * 쓸모 있는 추천이다.
 */
export function recommendDates(
  today: Date,
  days: number = 14,
  limit: number = 3,
): RecommendedDate[] {
  const candidates: RecommendedDate[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const date = localISODate(d);
    const grade = biteGradeForDate(date);
    if (grade) candidates.push({ date, grade });
  }
  return candidates
    .sort((a, b) => {
      const diff = GRADE_PRIORITY[b.grade] - GRADE_PRIORITY[a.grade];
      return diff !== 0 ? diff : a.date.localeCompare(b.date);
    })
    .slice(0, limit);
}
