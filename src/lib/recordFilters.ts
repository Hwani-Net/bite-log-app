// 5차 GOAL-1 — 기록 목록 필터·CSV. 전부 순수 함수라 유닛으로 고정한다.
// 어종 칩이 free-text 검색과 같은 문자열을 공유하던 구조를 분리했다:
// 예전엔 "우럭" 칩을 눌러도 메모에 "우럭"만 적힌 다른 어종 기록이 함께
// 남았다(칩은 어종 필드 전용이어야 한다).
import type { CatchRecord } from "@/types";

export interface RecordFilters {
  search?: string; // 자유 검색: 어종·장소·메모·채비
  species?: string; // 어종 전용(칩)
  from?: string; // YYYY-MM-DD 이상
  to?: string; // YYYY-MM-DD 이하
  photosOnly?: boolean;
}

export function filterRecords(
  records: CatchRecord[],
  f: RecordFilters,
): CatchRecord[] {
  let result = records;
  if (f.species) {
    result = result.filter((r) => r.species === f.species);
  }
  const q = f.search?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (r) =>
        r.species.toLowerCase().includes(q) ||
        r.location.name.toLowerCase().includes(q) ||
        r.memo?.toLowerCase().includes(q) ||
        r.tackle?.toLowerCase().includes(q),
    );
  }
  if (f.from) result = result.filter((r) => r.date >= f.from!);
  if (f.to) result = result.filter((r) => r.date <= f.to!);
  if (f.photosOnly) result = result.filter((r) => r.photos.length > 0);
  return result;
}

// CSV — 예전엔 14필드 중 7개만 나가서 "내보내기"가 반쪽이었다.
// 쉼표는 전각(；)으로 치환하는 기존 관행을 유지한다(엑셀 호환 우선).
const CSV_HEADERS = [
  "날짜",
  "시각",
  "어종",
  "마릿수",
  "크기(cm)",
  "무게(kg)",
  "장소",
  "위도",
  "경도",
  "채비",
  "날씨",
  "기온(C)",
  "풍속(m/s)",
  "물때",
  "관측소",
  "공개여부",
  "배uid",
  "메모",
] as const;

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).replace(/,/g, "；").replace(/[\r\n]+/g, " ");
}

export function recordsToCsvRows(records: CatchRecord[]): string[][] {
  return records.map((r) => [
    r.date,
    r.caughtTime ?? "",
    r.species,
    String(r.count),
    r.sizeCm != null ? String(r.sizeCm) : "",
    r.weightKg != null ? String(r.weightKg) : "",
    csvCell(r.location.name),
    r.location.lat != null ? String(r.location.lat) : "",
    r.location.lng != null ? String(r.location.lng) : "",
    csvCell(r.tackle),
    csvCell(r.weather?.condition),
    r.weather?.tempC != null ? String(r.weather.tempC) : "",
    r.weather?.windSpeed != null ? String(r.weather.windSpeed) : "",
    csvCell(r.tide?.currentPhase),
    csvCell(r.tide?.stationName),
    r.visibility === "public" ? "공개" : "비공개",
    csvCell(r.boatUid),
    csvCell(r.memo),
  ]);
}

export function recordsToCsv(records: CatchRecord[]): string {
  return [CSV_HEADERS.slice(), ...recordsToCsvRows(records)]
    .map((row) => row.join(","))
    .join("\n");
}
