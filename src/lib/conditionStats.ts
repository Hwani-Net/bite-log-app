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
  key: "temp" | "wind" | "tide" | "tackle";
  name: string; // "기온" | "풍속" | "물때" | "채비"
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
  // 동률이면 buckets 정렬 순서상 앞 구간이 남는다 — temp/wind는 구간 정의
  // 순, tide는 표본 많은 순이므로 "동률 시 표본 많은 쪽/앞 구간" 규칙.
  const best =
    eligible.length > 0
      ? eligible.reduce((m, b) => (b.avgCount > m.avgCount ? b : m))
      : null;
  return { buckets, best };
}

export interface ConditionMatch {
  key: ConditionAxis["key"];
  name: string;
  bucketLabel: string;
  avgCount: number;
  records: number;
}

/**
 * 오늘 조건이 속한 구간에서의 내 과거 실적(GOAL-4). 표본이
 * MIN_SAMPLES 미만인 구간은 반환하지 않는다 — 추정치를 날조하지 않는
 * 것이 계약이라, 반환이 비면 호출측은 스트립 자체를 그리지 않는다.
 */
export function matchTodayConditions(
  catchRecords: CatchRecord[],
  today: {
    tempC?: number | null;
    windSpeed?: number | null;
    tidePhase?: string | null;
  },
): ConditionMatch[] {
  const axes = conditionStats(catchRecords);
  const wanted: { key: ConditionAxis["key"]; label: string }[] = [];
  if (Number.isFinite(today.tempC))
    wanted.push({ key: "temp", label: tempBucket(today.tempC!) });
  if (Number.isFinite(today.windSpeed))
    wanted.push({ key: "wind", label: windBucket(today.windSpeed!) });
  // 물때 라벨은 tideService.getCurrentPhase()가 만드는 문자열("들물 3물")과
  // 기록 저장 시 스냅샷된 같은 문자열의 정확 일치다 — 라벨 형식을 바꾸면
  // 이 매칭이 조용히 끊기므로 두 지점을 같이 바꿔야 한다.
  if (today.tidePhase) wanted.push({ key: "tide", label: today.tidePhase });

  const out: ConditionMatch[] = [];
  for (const w of wanted) {
    const axis = axes.find((a) => a.key === w.key);
    if (!axis) continue;
    const bucket = axis.buckets.find((b) => b.label === w.label);
    if (bucket && bucket.records >= MIN_SAMPLES) {
      out.push({
        key: w.key,
        name: axis.name,
        bucketLabel: w.label,
        avgCount: bucket.avgCount,
        records: bucket.records,
      });
    }
  }
  return out;
}

/**
 * 기록 배열 → 축 3개(기온/풍속/물때). 조건 값이 없는 기록은 그 축에서만
 * 조용히 빠진다 — 옛 기록과 자연 공존.
 */
// 풍속 단위 정정일 — 이날 이전에 저장된 기록의 windSpeed는 km/h 크기일
// 수 있다(당시 weatherService가 open-meteo 기본 단위 km/h를 m/s로 표기).
// 12km/h(실제 약풍)와 12m/s(실제 강풍)를 사후에 구분할 방법이 없으므로,
// 변환하지 않고 풍속 축에서 제외한다 — 오염된 표본으로 구간을 채우는 것보다
// 축이 새로 쌓이는 쪽이 정직하다. 기온·물때 축은 영향 없음.
export const WIND_UNIT_FIX_DATE = "2026-08-28";

export function conditionStats(records: CatchRecord[]): ConditionAxis[] {
  // Number.isFinite — typeof 검사만으론 NaN이 "10°C 미만"으로 새어든다
  // (모든 < 비교가 false). 저장 경로가 여럿인 localStorage 데이터라 실제
  // 들어올 수 있는 값.
  const withTemp = records.filter((r) => Number.isFinite(r.weather?.tempC));
  const withWind = records.filter(
    (r) =>
      Number.isFinite(r.weather?.windSpeed) &&
      (r.createdAt ?? "") >= WIND_UNIT_FIX_DATE,
  );
  // "(예측)" 관측소명은 mock 폴백이 저장되던 시절의 지어낸 물때 — 제외.
  const withTide = records.filter(
    (r) => r.tide?.currentPhase && !r.tide.stationName?.includes("(예측)"),
  );
  const temp = aggregate(
    withTemp.map((r) => ({ label: tempBucket(r.weather!.tempC), count: r.count })),
    TEMP_BUCKETS,
  );
  const wind = aggregate(
    withWind.map((r) => ({
      label: windBucket(r.weather!.windSpeed!),
      count: r.count,
    })),
    WIND_BUCKETS,
  );
  const tide = aggregate(
    withTide.map((r) => ({ label: r.tide!.currentPhase!, count: r.count })),
  );
  // 채비 축(5차 GOAL-2) — "그날 뭘로 잡았나"가 기록의 재독 가치 핵심.
  // 대소문자·앞뒤 공백만 정규화해 같은 채비를 한 구간으로 모은다.
  const withTackle = records.filter((r) => r.tackle?.trim());
  const tackle = aggregate(
    withTackle.map((r) => ({ label: r.tackle!.trim(), count: r.count })),
  );
  return [
    { key: "temp", name: "기온", ...temp, sampled: withTemp.length },
    { key: "wind", name: "풍속", ...wind, sampled: withWind.length },
    { key: "tide", name: "물때", ...tide, sampled: withTide.length },
    { key: "tackle", name: "채비", ...tackle, sampled: withTackle.length },
  ];
}
