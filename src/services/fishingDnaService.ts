/**
 * fishingDnaService.ts
 * Analyzes user's catch records to find personal fishing patterns ("fishing DNA").
 * Uses local computation first, then optionally enriches with AI insights.
 */

import { CatchRecord } from '@/types';

export interface FishingDna {
  // Core pattern
  archetypeKo: string;   // e.g. "새벽형 갯바위 낚시인"
  archetypeEn: string;   // e.g. "Dawn Rock Angler"
  // Best time
  bestTimeSlot: string;  // e.g. "05:00~07:00"
  bestTimePercent: number;
  // Best tide (from tide data in records)
  bestTide: string | null;
  // Top species
  topSpecies: string;
  topSpeciesCount: number;
  // Top location
  topLocation: string;
  topLocationVisits: number;
  // Weakness
  weaknessKo: string;
  weaknessEn: string;
  // Monthly pattern
  bestMonth: number;     // 1-12
  bestMonthCount: number;
  // Avg size
  avgSizeCm: number | null;
  // Total records analyzed
  totalRecords: number;
  analyzedAt: string;    // ISO date
}

/**
 * Analyze catch records locally (no AI call needed).
 * Returns null if less than 5 records.
 */
export function analyzeFishingDna(records: CatchRecord[]): FishingDna | null {
  if (records.length < 5) return null;

  // ── 1. Time slot analysis ─────────────────────────────────────────
  const timeSlots: Record<string, number> = {
    '새벽 (04~06시)': 0,
    '이른 아침 (06~08시)': 0,
    '오전 (08~11시)': 0,
    '한낮 (11~14시)': 0,
    '오후 (14~17시)': 0,
    '저녁 (17~20시)': 0,
    '밤 (20~04시)': 0,
  };

  const createdHours = records.map((r) => {
    const d = r.createdAt ? new Date(r.createdAt) : new Date(r.date);
    return d.getHours();
  });

  createdHours.forEach((h) => {
    if (h >= 4 && h < 6) timeSlots['새벽 (04~06시)']++;
    else if (h >= 6 && h < 8) timeSlots['이른 아침 (06~08시)']++;
    else if (h >= 8 && h < 11) timeSlots['오전 (08~11시)']++;
    else if (h >= 11 && h < 14) timeSlots['한낮 (11~14시)']++;
    else if (h >= 14 && h < 17) timeSlots['오후 (14~17시)']++;
    else if (h >= 17 && h < 20) timeSlots['저녁 (17~20시)']++;
    else timeSlots['밤 (20~04시)']++;
  });

  const bestTimeEntry = Object.entries(timeSlots).sort((a, b) => b[1] - a[1])[0];
  const bestTimeSlot = bestTimeEntry[0];
  const bestTimePercent = Math.round((bestTimeEntry[1] / records.length) * 100);

  // ── 2. Species analysis ──────────────────────────────────────────
  const speciesMap = new Map<string, number>();
  records.forEach((r) => {
    speciesMap.set(r.species, (speciesMap.get(r.species) ?? 0) + r.count);
  });
  const sortedSpecies = Array.from(speciesMap.entries()).sort((a, b) => b[1] - a[1]);
  const topSpecies = sortedSpecies[0]?.[0] ?? '정보 없음';
  const topSpeciesCount = sortedSpecies[0]?.[1] ?? 0;

  // ── 3. Location analysis ─────────────────────────────────────────
  const locationMap = new Map<string, number>();
  records.forEach((r) => {
    const name = r.location?.name || '미지정';
    locationMap.set(name, (locationMap.get(name) ?? 0) + 1);
  });
  const sortedLocations = Array.from(locationMap.entries()).sort((a, b) => b[1] - a[1]);
  const topLocation = sortedLocations[0]?.[0] ?? '미지정';
  const topLocationVisits = sortedLocations[0]?.[1] ?? 0;

  // ── 4. Monthly pattern ───────────────────────────────────────────
  const monthMap = new Map<number, number>();
  records.forEach((r) => {
    const m = new Date(r.date).getMonth() + 1;
    monthMap.set(m, (monthMap.get(m) ?? 0) + r.count);
  });
  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => b[1] - a[1]);
  const bestMonth = sortedMonths[0]?.[0] ?? 1;
  const bestMonthCount = sortedMonths[0]?.[1] ?? 0;

  // ── 5. Average size ──────────────────────────────────────────────
  const sizes = records.filter((r) => r.sizeCm && r.sizeCm > 0).map((r) => r.sizeCm!);
  const avgSizeCm = sizes.length > 0 ? Math.round(sizes.reduce((s, v) => s + v, 0) / sizes.length) : null;

  // ── 6. Tide analysis ─────────────────────────────────────────────
  // Simple: check if tide data exists in records
  let bestTide: string | null = null;
  const tideRecords = records.filter((r) => r.tide?.stationName);
  if (tideRecords.length > 0) {
    const tideMap = new Map<string, number>();
    tideRecords.forEach((r) => {
      const station = r.tide?.stationName ?? '';
      tideMap.set(station, (tideMap.get(station) ?? 0) + r.count);
    });
    const sortedTides = Array.from(tideMap.entries()).sort((a, b) => b[1] - a[1]);
    bestTide = sortedTides[0]?.[0] ?? null;
  }

  // ── 7. Archetype generation ──────────────────────────────────────
  const isDawn = bestTimeSlot.includes('새벽') || bestTimeSlot.includes('이른 아침');
  const isNight = bestTimeSlot.includes('밤') || bestTimeSlot.includes('저녁');
  const isCoast = topLocation.includes('방파제') || topLocation.includes('갯바위') || topLocation.includes('포구');
  const isReservoir = topLocation.includes('저수지') || topLocation.includes('강') || topLocation.includes('호수');

  let archetypeKo = '';
  let archetypeEn = '';
  if (isDawn && isCoast) { archetypeKo = '새벽형 갯바위 낚시인'; archetypeEn = 'Dawn Rock Angler'; }
  else if (isNight && isCoast) { archetypeKo = '야간 포인트 사냥꾼'; archetypeEn = 'Night Point Hunter'; }
  else if (isDawn && isReservoir) { archetypeKo = '새벽형 민물 낚시인'; archetypeEn = 'Dawn Freshwater Angler'; }
  else if (isDawn) { archetypeKo = '부지런한 새벽 낚시인'; archetypeEn = 'Early Bird Angler'; }
  else if (isNight) { archetypeKo = '야행성 낚시인'; archetypeEn = 'Nocturnal Angler'; }
  else { archetypeKo = '전천후 낚시인'; archetypeEn = 'All-Weather Angler'; }

  // ── 8. Weakness ──────────────────────────────────────────────────
  const worstTimeEntry = Object.entries(timeSlots).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])[0];
  const weaknessKo = worstTimeEntry ? `${worstTimeEntry[0]}에는 조과가 저조해요` : '아직 데이터가 부족해요';
  const weaknessEn = worstTimeEntry ? `Lower catch rate during ${worstTimeEntry[0]}` : 'Not enough data yet';

  return {
    archetypeKo,
    archetypeEn,
    bestTimeSlot,
    bestTimePercent,
    bestTide,
    topSpecies,
    topSpeciesCount,
    topLocation,
    topLocationVisits,
    weaknessKo,
    weaknessEn,
    bestMonth,
    bestMonthCount,
    avgSizeCm,
    totalRecords: records.length,
    analyzedAt: new Date().toISOString(),
  };
}
