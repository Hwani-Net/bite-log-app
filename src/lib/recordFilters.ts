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
  // date는 스키마상 "YYYY-MM-DD" — 사전식 비교가 곧 날짜 비교다.
  if (f.from) result = result.filter((r) => r.date >= f.from!);
  if (f.to) result = result.filter((r) => r.date <= f.to!);
  // photos는 옛 기록에 아예 없을 수 있다(?. 없으면 토글 순간 목록 전체가
  // TypeError로 죽는다 — 같은 파일 다른 곳은 이미 ?? []로 방어 중이었다).
  if (f.photosOnly) result = result.filter((r) => (r.photos?.length ?? 0) > 0);
  return result;
}

// CSV — 예전엔 기록이 가진 값 중 7열만 나가서 "내보내기"가 반쪽이었다
// (지금은 18열: weather·tide를 의미 단위로 펼침. 재구성용 tides 배열과
// 내부 id/createdAt은 JSON 내보내기 쪽이 담당한다).
// 인용은 RFC 4180 방식 — 예전 전각(；) 치환은 쉼표 든 값을 영구 변형해
// 무손실 왕복을 깨뜨렸다(5차 GOAL-1 교차검수 지적).
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

/**
 * 셀 1개를 CSV 안전 문자열로. ① 수식 인젝션 방어 — =·+·-·@로 시작하는
 * 사용자 입력(어종·메모·채비·장소)이 엑셀에서 수식으로 실행되지 않게
 * 작은따옴표를 앞에 붙인다 ② RFC 4180 인용 — 쉼표·따옴표·줄바꿈이 있으면
 * 전체를 "로 감싸고 내부 "는 ""로 이스케이프(값 자체는 그대로 보존).
 */
export function csvCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function recordsToCsvRows(records: CatchRecord[]): string[][] {
  return records.map((r) => [
    r.date,
    r.caughtTime ?? "",
    csvCell(r.species),
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
  return [CSV_HEADERS as readonly string[], ...recordsToCsvRows(records)]
    .map((row) => row.join(","))
    .join("\n");
}
