// Fleet Radar Service - shared types and algorithms for client-side AIS data

export interface FleetEntry {
  mmsi: string;
  lat: number;
  lon: number;
  speed: number;
  course: number;
  timestamp: string;
  shipName: string;
  shipType: string;
  tonnage: number;
  length: number;
  sizeClass: "small" | "large";
}

export interface SafeHarborZone {
  centerLat: number;
  centerLon: number;
  ships: FleetEntry[];
  avgSpeed: number;
  label: string;
}

// --- Safe Harbor Algorithm ---

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in km */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Safe Harbor Algorithm (PRD §5.1):
 * Find clusters of small boats (< 3 GT) that are:
 *   - speed 0~2 knots (fishing state)
 *   - 3+ boats in a 500m radius cluster
 *   - 500m+ away from any large ship (≥ 5 GT)
 */
export function computeSafeHarbors(fleet: FleetEntry[]): SafeHarborZone[] {
  const largeShips = fleet.filter((s) => s.tonnage >= 5);
  const fishingSmall = fleet.filter(
    (s) => s.sizeClass === "small" && s.speed <= 2,
  );

  if (fishingSmall.length < 3) return [];

  // Simple clustering: group small boats within 0.5km of each other
  const visited = new Set<string>();
  const clusters: FleetEntry[][] = [];

  for (const ship of fishingSmall) {
    if (visited.has(ship.mmsi)) continue;
    const cluster: FleetEntry[] = [ship];
    visited.add(ship.mmsi);

    for (const other of fishingSmall) {
      if (visited.has(other.mmsi)) continue;
      if (haversineKm(ship.lat, ship.lon, other.lat, other.lon) <= 0.5) {
        cluster.push(other);
        visited.add(other.mmsi);
      }
    }
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }

  // Filter: cluster center must be ≥500m from all large ships
  const safeZones: SafeHarborZone[] = [];

  for (const cluster of clusters) {
    const centerLat = cluster.reduce((s, c) => s + c.lat, 0) / cluster.length;
    const centerLon = cluster.reduce((s, c) => s + c.lon, 0) / cluster.length;

    const tooClose = largeShips.some(
      (lg) => haversineKm(centerLat, centerLon, lg.lat, lg.lon) < 0.5,
    );
    if (tooClose) continue;

    const avgSpeed = cluster.reduce((s, c) => s + c.speed, 0) / cluster.length;

    safeZones.push({
      centerLat,
      centerLon,
      ships: cluster,
      avgSpeed,
      label: `${cluster.length}척 소형선 밀집 (평균 ${avgSpeed.toFixed(1)}kt)`,
    });
  }

  return safeZones;
}

/**
 * Proximity Alert (PRD §5.2):
 * Check if any large ship (≥5 GT, ≥10 knots) is within 1km of user position
 */
export function checkProximityAlert(
  fleet: FleetEntry[],
  userLat: number,
  userLon: number,
): FleetEntry[] {
  return fleet.filter(
    (s) =>
      s.tonnage >= 5 &&
      s.speed >= 10 &&
      haversineKm(userLat, userLon, s.lat, s.lon) <= 1,
  );
}
