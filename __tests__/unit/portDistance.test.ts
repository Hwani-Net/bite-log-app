import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  distanceKmForAreaPath,
  sortBoatsByDistance,
} from '@/lib/portDistance';
import { PORT_COORDS } from '@/data/portCoords';

describe('haversineKm', () => {
  it('matches a known distance — 대천항↔오천항은 직선 ~12km', () => {
    const a = PORT_COORDS['대천항'];
    const b = PORT_COORDS['오천항'];
    const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(14);
  });

  it('is zero for the same point and symmetric', () => {
    expect(haversineKm(36.3, 126.5, 36.3, 126.5)).toBe(0);
    expect(haversineKm(36.3, 126.5, 33.5, 126.5)).toBeCloseTo(
      haversineKm(33.5, 126.5, 36.3, 126.5),
      10,
    );
  });
});

describe('distanceKmForAreaPath', () => {
  const user = { lat: 36.35, lng: 126.6 }; // 보령 내륙 어딘가

  it('resolves the last areaPath segment against the table', () => {
    const km = distanceKmForAreaPath(
      '서해권 > 충청남도 > 보령시 > 대천항',
      user.lat,
      user.lng,
    );
    expect(km).not.toBeNull();
    expect(km!).toBeLessThan(15);
  });

  it('returns null for a port not in the table', () => {
    expect(
      distanceKmForAreaPath('서해권 > 충청남도 > 어딘가 > 없는항', user.lat, user.lng),
    ).toBeNull();
  });
});

describe('sortBoatsByDistance', () => {
  // 사용자를 보령(대천항 코앞)에 두면 기대 순서가 자명해진다:
  // 대천항 < 오천항 < 평택항 < 제주항.
  const user = PORT_COORDS['대천항'];
  const boat = (name: string, port: string) => ({
    name,
    areaPath: `권역 > 도 > 시 > ${port}`,
  });

  it('sorts known ports ascending and sends unknown ports to the end in original order', () => {
    const boats = [
      boat('제주배', '제주항'),
      boat('미지1', '없는항A'),
      boat('평택배', '평택항'),
      boat('미지2', '없는항B'),
      boat('대천배', '대천항'),
      boat('오천배', '오천항'),
    ];
    expect(sortBoatsByDistance(boats, user.lat, user.lng).map((b) => b.name)).toEqual([
      '대천배',
      '오천배',
      '평택배',
      '제주배',
      '미지1', // 미등록끼리는 원래 상대 순서 유지
      '미지2',
    ]);
  });

  it('keeps the input array untouched', () => {
    const boats = [boat('제주배', '제주항'), boat('대천배', '대천항')];
    sortBoatsByDistance(boats, user.lat, user.lng);
    expect(boats[0].name).toBe('제주배');
  });
});
