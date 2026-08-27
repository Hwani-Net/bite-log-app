// GOAL-1(2차) — 내 위치 거리순 정렬의 순수 로직. 좌표 테이블에 없는
// 항구는 거리 null로 두고 정렬 끝에 원래 순서대로 남긴다 — 숨기지 않음.
import { PORT_COORDS } from "@/data/portCoords";

/** 두 좌표 사이 대권 거리(km). */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * areaPath("서해권 > 충청남도 > 보령시 > 대천항")의 마지막 세그먼트로
 * 좌표 테이블을 찾아 사용자 위치와의 거리(km)를 준다. 미등록이면 null.
 */
export function distanceKmForAreaPath(
  areaPath: string,
  userLat: number,
  userLng: number,
): number | null {
  const port = areaPath.split(" > ").pop()?.trim() ?? "";
  const coords = PORT_COORDS[port];
  if (!coords) return null;
  // 동명 항구 안전장치 — within이 지정된 이름은 그 지역 경로에서만 매칭.
  if (coords.within && !areaPath.includes(coords.within)) return null;
  return haversineKm(userLat, userLng, coords.lat, coords.lng);
}

/**
 * 거리 오름차순 정렬. 거리를 모르는 배는 서로의 원래 순서를 유지한 채
 * 전부 뒤로. 안정 정렬을 위해 원래 인덱스를 tie-break로 쓴다.
 */
export function sortBoatsByDistance<T extends { areaPath: string }>(
  boats: T[],
  userLat: number,
  userLng: number,
): T[] {
  return boats
    .map((boat, i) => ({
      boat,
      i,
      km: distanceKmForAreaPath(boat.areaPath, userLat, userLng),
    }))
    .sort((a, b) => {
      if (a.km === null && b.km === null) return a.i - b.i;
      if (a.km === null) return 1;
      if (b.km === null) return -1;
      return a.km - b.km || a.i - b.i;
    })
    .map((x) => x.boat);
}
