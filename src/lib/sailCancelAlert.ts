// GOAL-10 — 출항 취소 조기 경보의 순수 판정 로직. 시간(now)은 전부
// 주입받고, 날짜 계산은 localDate.ts 로만 한다(UTC 함정 회귀 방지).
import type {
  BoatDayStatus,
  BoatOperatorId,
} from "@/services/boatAvailabilityService";
import type { DailyMarineOutlook } from "@/services/marineService";
import { parseLocalISODate } from "./localDate";

// 기상특보 발효 기준(풍랑주의보: 풍속 14m/s·파고 3m)보다 보수적 —
// 소형 낚싯배는 그 한참 전에 출항을 접는 일이 흔하다.
// ponytail: 고정 휴리스틱, 선사별 실제 취소 이력이 쌓이면 조정.
export const CANCEL_THRESHOLDS = { windSpeedMs: 10, waveHeightM: 1.5 };

// 두 선사의 모항 근해 대표 좌표 — 경보는 "가능성" 안내라 항구 단위 해상
// 좌표면 충분하다(marine API는 내륙 좌표에서 파고 null을 준다).
export const OPERATOR_COORDS: Record<
  BoatOperatorId,
  { lat: number; lng: number }
> = {
  teambite: { lat: 36.7, lng: 126.1 }, // 마검포 근해
  masterfishing: { lat: 36.32, lng: 126.4 }, // 대천항 근해
};

/** tripDate가 now 기준 D-3~D-1 구간인가 (당일·과거·4일 이상 뒤는 false). */
export function isWithinAlertWindow(tripDate: string, now: Date): boolean {
  const trip = parseLocalISODate(tripDate);
  if (!trip) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((trip.getTime() - today.getTime()) / 86400000);
  return diffDays >= 1 && diffDays <= 3;
}

/**
 * 임계 초과 판정. 결측(null)은 초과의 증거가 아니다 — 예보가 없으면
 * 조용히 false (오탐 경보 금지가 이 기능의 회귀 조건).
 */
export function isCancellationRisk(o: DailyMarineOutlook): boolean {
  return (
    (o.windSpeedMax !== null &&
      o.windSpeedMax >= CANCEL_THRESHOLDS.windSpeedMs) ||
    (o.waveHeightMax !== null &&
      o.waveHeightMax >= CANCEL_THRESHOLDS.waveHeightM)
  );
}

/**
 * 같은 배의 달력에서 tripDate 이후 예약 가능한 가장 가까운 날짜 최대
 * limit개. full/weather/unknown 은 대안이 아니다.
 */
export function alternativeDates(
  days: BoatDayStatus[],
  boatName: string,
  tripDate: string,
  limit = 2,
): string[] {
  return [
    ...new Set(
      days
        .filter(
          (d) =>
            d.boatName === boatName &&
            d.status === "available" &&
            d.date > tripDate,
        )
        .map((d) => d.date),
    ),
  ]
    .sort()
    .slice(0, limit);
}
