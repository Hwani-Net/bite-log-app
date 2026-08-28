// 3차 GOAL-6 — 기록 시점 규정 지킴이. isCatchLegal()은 규정 페이지에
// 있었지만 실제 물고기(어종+체장+날짜)를 검증한 적이 한 번도 없었다 —
// 기록 저장 직전이 그 함수가 있어야 할 자리다. 차단이 아니라 보호가
// 목적(방류했을 수 있으므로 "그래도 저장"을 열어 둔다).
import { isCatchLegal, getRegulation } from "@/data/fishRegulationDB";
import { parseLocalISODate } from "./localDate";

export interface LegalityWarning {
  violations: string[];
  penaltyNote: string | null;
  legalRef: string | null;
}

/**
 * 위반이 없거나(합법·규정DB 밖 어종) 날짜가 파싱 불가면 null —
 * 확실한 위반에만 경고한다(오탐 경고 금지).
 */
export function legalityWarning(
  species: string,
  sizeCm: number | null,
  date: string,
): LegalityWarning | null {
  const d = parseLocalISODate(date);
  if (!d) return null;
  const { legal, violations } = isCatchLegal(
    species,
    Number.isFinite(sizeCm) ? sizeCm : null,
    d.getMonth() + 1,
    d.getDate(),
  );
  if (legal) return null;
  const reg = getRegulation(species);
  return {
    violations,
    penaltyNote: reg?.penaltyNote ?? null,
    legalRef: reg?.legalRef ?? null,
  };
}
