// "이 배에서 내 조과" — records/page.tsx의 "탄 배" 태그(CatchRecord.boatUid)를
// 배 상세 페이지에서 요약해 보여준다. computeStats()의 종별 집계와 같은
// Map<key, count> → Array.from().map().sort() 모양을 그대로 따른다
// (src/services/localStorage.ts).

import type { CatchRecord } from "@/types";

export interface SpeciesBreakdown {
  species: string;
  count: number;
}

export interface BoatCatchSummary {
  // "이 배로 태그된 기록 건수" — 승선 횟수(myBoatService의 rides)가 아니다.
  // 같은 날 두 번 기록하면 2건으로 센다. 이름을 recordCount로 둔 이유도
  // 그 구분을 필드명에서부터 명확히 하기 위해서다.
  recordCount: number;
  totalCount: number; // 마릿수 합계
  bySpecies: SpeciesBreakdown[]; // count 내림차순
}

export function summarizeCatchesForBoat(
  records: CatchRecord[],
  uid: string,
): BoatCatchSummary {
  const matching = records.filter((r) => r.boatUid === uid);

  const speciesMap = new Map<string, number>();
  let totalCount = 0;
  for (const r of matching) {
    speciesMap.set(r.species, (speciesMap.get(r.species) ?? 0) + r.count);
    totalCount += r.count;
  }

  const bySpecies = Array.from(speciesMap.entries())
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count);

  return { recordCount: matching.length, totalCount, bySpecies };
}
