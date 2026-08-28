// 3차 GOAL-3 — 나의 조건표. 기록에 이미 저장된 조건(기온·풍속·물때)을
// 구간화해 구간별 평균 마릿수를 낸다. 전부 순수 함수 — 신규 API 없음.
// 주의: 기록이 갖고 있는 건 weather.tempC(기온)지 수온이 아니다 — 축
// 이름도 정직하게 "기온"으로 쓴다(수온은 기록에 저장돼 있지 않음).
import type { CatchRecord } from "@/types";

export interface ConditionBucket {
  label: string;
  records: number; // 표본 수(기록 건수)
  totalCount: number; // 총 마릿수
  avgCount: number; // 평균 마릿수(소수 1자리)
}

export interface ConditionAxis {
  key: "temp" | "wind" | "tide";
  name: string; // "기온" | "풍속" | "물때"
  buckets: ConditionBucket[]; // 표본 있는 구간만, 정의 순서
  best: ConditionBucket | null; // 표본 MIN_SAMPLES 이상 구간 중 평균 최고
  sampled: number; // 이 축에 조건 값이 있던 기록 수
}

// 구간이 최소 이만큼의 표본을 가져야 "최고 조건"으로 뽑는다 — 1회 우연을
// 최고로 승격하지 않기 위한 하한.
export const MIN_SAMPLES = 3;

const TEMP_BUCKETS = ["10°C 미만", "10~17°C", "17~24°C", "24°C 이상"] as const;
const WIND_BUCKETS = ["바람 약(4m/s 미만)", "바람 중(4~8m/s)", "바람 강(8m/s 이상)"] as const;

/** 기온(°C) → 구간 라벨. GOAL-4의 "오늘 조건 매칭"도 이 함수를 쓴다. */
export function tempBucket(tempC: number): string {
  if (tempC < 10) return TEMP_BUCKETS[0];
  if (tempC < 17) return TEMP_BUCKETS[1];
  if (tempC < 24) return TEMP_BUCKETS[2];
  return TEMP_BUCKETS[3];
}

/** 풍속(m/s) → 구간 라벨. */
export function windBucket(windSpeed: number): string {
  if (windSpeed < 4) return WIND_BUCKETS[0];
  if (windSpeed < 8) return WIND_BUCKETS[1];
  return WIND_BUCKETS[2];
}

function aggregate(
  samples: { label: string; count: number }[],
  order?: readonly string[],
): { buckets: ConditionBucket[]; best: ConditionBucket | null } {
  const map = new Map<string, { records: number; totalCount: number }>();
  for (const s of samples) {
    const cur = map.get(s.label) ?? { records: 0, totalCount: 0 };
    cur.records += 1;
    cur.totalCount += s.count;
    map.set(s.label, cur);
  }
  let buckets: ConditionBucket[] = [...map.entries()].map(([label, v]) => ({
    label,
    records: v.records,
    totalCount: v.totalCount,
    avgCount: Math.round((v.totalCount / v.records) * 10) / 10,
  }));
  if (order) {
    buckets = buckets.sort(
      (a, b) => order.indexOf(a.label) - order.indexOf(b.label),
    );
  } else {
    // 물때처럼 정의 순서가 없는 축은 표본 많은 순.
    buckets = buckets.sort((a, b) => b.records - a.records);
  }
  const eligible = buckets.filter((b) => b.records >= MIN_SAMPLES);
  const best =
    eligible.length > 0
      ? eligible.reduce((m, b) => (b.avgCount > m.avgCount ? b : m))
      : null;
  return { buckets, best };
}

/**
 * 기록 배열 → 축 3개(기온/풍속/물때). 조건 값이 없는 기록은 그 축에서만
 * 조용히 빠진다 — 옛 기록과 자연 공존.
 */
export function conditionStats(records: CatchRecord[]): ConditionAxis[] {
  const temp = aggregate(
    records
      .filter((r) => typeof r.weather?.tempC === "number")
      .map((r) => ({ label: tempBucket(r.weather!.tempC), count: r.count })),
    TEMP_BUCKETS,
  );
  const wind = aggregate(
    records
      .filter((r) => typeof r.weather?.windSpeed === "number")
      .map((r) => ({
        label: windBucket(r.weather!.windSpeed!),
        count: r.count,
      })),
    WIND_BUCKETS,
  );
  const tide = aggregate(
    records
      .filter((r) => r.tide?.currentPhase)
      .map((r) => ({ label: r.tide!.currentPhase!, count: r.count })),
  );
  return [
    {
      key: "temp",
      name: "기온",
      ...temp,
      sampled: records.filter((r) => typeof r.weather?.tempC === "number").length,
    },
    {
      key: "wind",
      name: "풍속",
      ...wind,
      sampled: records.filter((r) => typeof r.weather?.windSpeed === "number")
        .length,
    },
    {
      key: "tide",
      name: "물때",
      ...tide,
      sampled: records.filter((r) => r.tide?.currentPhase).length,
    },
  ];
}
