// 배별 달력의 각 날짜 셀에 물때(사리/조금) 기반 입질 지수를 얹는다.
// lunarService.getLunarInfo()는 순수 천문 계산이라 어떤 미래 날짜든 새
// 외부 요청 없이 바로 계산된다 — biteTimeService.calculateBiteTime()은
// 실시간 날씨/조류 API 응답이 있어야 해서(지금 이 순간 전용), 달력의 미래
// 수십 개 날짜에는 쓸 수 없다. "물때 지수"라고 부르는 이유도 그래서다 —
// 실시간 날씨·파고까지 반영한 종합 입질예보가 아니라, 사리/조금 주기가
// 만드는 조류 강도 하나만 반영한다는 걸 이름에서부터 정직하게 드러낸다.

import { getLunarInfo } from "@/services/lunarService";

export type BiteGrade = "excellent" | "good" | "fair" | "poor";

export const BITE_GRADE_LABEL: Record<BiteGrade, string> = {
  excellent: "물때 최고",
  good: "물때 좋음",
  fair: "물때 보통",
  poor: "물때 약함",
};

// 배경(불투명)이 아니라 작은 점 색으로만 쓴다 — 예약 가능/마감을 나타내는
// 기존 카드 배경색과 겹치면 안 된다. 네 색을 서로 다른 색상(hue)으로
// 골랐다 — emerald/lime처럼 인접한 초록 두 개를 쓰면 6~8px 점에서
// "최고"와 "좋음"이 사실상 구분이 안 된다. poor 를 회색으로 두면 "이 배는
// 요약 정보가 없음"(점 자체가 없는 상태)과 구별이 안 되므로, 옅더라도
// 명확히 색이 있는 톤을 쓴다.
export const BITE_GRADE_DOT_COLOR: Record<BiteGrade, string> = {
  excellent: "bg-emerald-400",
  good: "bg-sky-400",
  fair: "bg-amber-400",
  poor: "bg-red-400/70",
};

/**
 * "YYYY-MM-DD"를 로컬 자정으로 파싱한다. `new Date(iso)` 는 UTC 자정으로
 * 해석되어 KST에서 하루가 밀린다 — 이 세션에서 이미 두 번(검색 그리드 기본
 * 날짜, bite-forecast 예약 CTA 링크) 같은 버그를 고쳤다. 형식이 안 맞거나
 * "2026-02-30"처럼 달력에 없는 날짜면 null — 예보를 생략하는 편이 틀린
 * 날짜로 계산한 값을 보여주는 것보다 안전하다.
 */
function parseLocalISODate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/** date: "YYYY-MM-DD". 파싱 실패 시 null — 셀에 아무것도 표시하지 않는다. */
export function biteGradeForDate(date: string): BiteGrade | null {
  const parsed = parseLocalISODate(date);
  if (!parsed) return null;
  return getLunarInfo(parsed).fishingImpact;
}
