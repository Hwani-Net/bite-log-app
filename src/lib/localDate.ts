// 로컬(KST) 자정 기준 날짜 변환. `new Date(iso)` 와 `toISOString()` 은 둘
//다 UTC라서 한국 자정~오전 9시 사이엔 하루가 밀린다 — 이 세션에서만도
// 검색 그리드 기본 날짜, bite-forecast 예약 링크, 달력 물때 지수까지
// 세 번 같은 버그를 고쳤다. 새로 만드는 날짜 로직은 여기서 가져다 쓴다.

/** Date → "YYYY-MM-DD", 로컬 타임존 기준. */
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "YYYY-MM-DD" → 로컬 자정 Date. 형식이 안 맞거나 달력에 없는 날짜(예:
 * "2026-02-30")면 null — 틀린 날짜로 계산한 값을 보여주는 것보다 안전하다.
 */
export function parseLocalISODate(iso: string): Date | null {
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
