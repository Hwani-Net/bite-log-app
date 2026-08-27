// 2차 GOAL-2 — "예약 가능만 보기"의 순수 판정. 달력 API(/api/boat-calendar)
// 응답의 days에서 특정 날짜의 가용성을 읽는다. 판정 불가는 전부 "unknown" —
// 이 토글의 계약은 "확실히 마감인 배만 숨긴다"이지 "불확실하면 숨긴다"가
// 아니다(오탐 숨김 금지가 회귀 조건).

export interface DayAvailability {
  state: "available" | "full" | "unknown";
  remainingSeats?: number;
}

export function dayAvailability(
  days: unknown,
  date: string,
): DayAvailability {
  if (!Array.isArray(days)) return { state: "unknown" };
  const day = days.find(
    (d): d is { date: string; status?: string; remainingSeats?: number } =>
      typeof d === "object" && d !== null && (d as { date?: unknown }).date === date,
  );
  if (!day) return { state: "unknown" }; // 달력에 그 날짜 자체가 없음
  if (day.status === "available") {
    // "남은자리 0명" 같은 모순 표기 방어 — 0석이면 사실상 마감이다.
    if (day.remainingSeats === 0) return { state: "full" };
    return {
      state: "available",
      remainingSeats:
        typeof day.remainingSeats === "number" ? day.remainingSeats : undefined,
    };
  }
  if (day.status === "full") return { state: "full" };
  // "none"(그날 출조 표기 없음) 등 — 검색 그리드는 그날 뜬다고 했으니
  // 달력과 모순 = 판정 불가로 두고 보여준다.
  return { state: "unknown" };
}

/** searchDate("YYYY-MM-DD") → 달력 API의 ym("YYYYMM"). */
export function ymForDate(date: string): string {
  return date.slice(0, 7).replace("-", "");
}
