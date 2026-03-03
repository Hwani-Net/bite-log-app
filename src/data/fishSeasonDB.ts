// Fish Season Database — 2026 Release PLAN Data (CONFIRMED ONLY)
// Source: 한국수산자원공단 방류종자관리시스템 — 방류계획 (seed.fira.or.kr)
// Updated: 2026-03-03 기준, 203건 전수 조사
// NOTE: 실제 확정된 2026년 공고 데이터만 포함. 추가 공고 시 업데이트 필요.

export type Region = '서해' | '남해' | '동해' | '전국';

// Location-level release plan detail
export interface ReleaseSite {
  city: string;       // 시·군 (e.g. 인천, 부산)
  region: Region;     // 해역
  count: number;      // 방류 계획 마리수
  months: number[];   // 방류 예정월
  year: number;       // 계획 연도
  note?: string;      // 공고 비고
}

export interface FishSeasonData {
  species: string;
  speciesEn: string;
  emoji: string;
  image: string;            // 실사 어종 이미지 경로
  peakFishingMonths: number[];
  goldFishingMonths: number[];
  closedSeason: { start: string; end: string } | null;
  habitatDepth: string;
  releaseSites: ReleaseSite[];   // 지역별 상세 방류 계획
  tipKey: string;
}

export const FISH_SEASON_DB: FishSeasonData[] = [
  // ── 주꾸미 ─────────────────────────────────────────────
  {
    species: '주꾸미',
    speciesEn: 'Webfoot Octopus',
    emoji: '🐙',
    image: '/fish-jukumi.png',
    peakFishingMonths: [9, 10, 11],
    goldFishingMonths: [9, 10],
    closedSeason: { start: '4/1', end: '8/31' },
    habitatDepth: '10~30m',
    tipKey: 'season.tip.jukumi',
    releaseSites: [
      { city: '인천', region: '서해', count: 300000, months: [6, 7], year: 2026, note: '인천광역시 수산자원연구소' },
    ],
  },
  // ── 우럭 (조피볼락) ────────────────────────────────────
  {
    species: '우럭',
    speciesEn: 'Black Rockfish',
    emoji: '🪨',
    image: '/fish-urok.png',
    peakFishingMonths: [3, 4, 10, 11, 12],
    goldFishingMonths: [11, 12],
    closedSeason: null,
    habitatDepth: '20~50m',
    tipKey: 'season.tip.urok',
    releaseSites: [
      { city: '인천', region: '서해', count: 250000, months: [5, 6], year: 2026, note: '인천광역시 수산자원연구소' },
      { city: '부산 사하구', region: '남해', count: 96000, months: [4], year: 2026, note: '2026-04-01~04-30' },
    ],
  },
  // ── 광어 (넙치) ─────────────────────────────────────────
  {
    species: '광어',
    speciesEn: 'Olive Flounder',
    emoji: '🐠',
    image: '/fish-gwangeo.png',
    peakFishingMonths: [4, 5, 10, 11],
    goldFishingMonths: [10, 11],
    closedSeason: null,
    habitatDepth: '5~30m (모래 바닥)',
    tipKey: 'season.tip.gwangeo',
    releaseSites: [
      { city: '부산', region: '남해', count: 100000, months: [3, 4], year: 2026, note: '부산광역시 수산자원연구소' },
    ],
  },
  // ── 참돔 ───────────────────────────────────────────────
  {
    species: '참돔',
    speciesEn: 'Red Sea Bream',
    emoji: '🎏',
    image: '/fish-chamdom.png',
    peakFishingMonths: [5, 6, 10, 11],
    goldFishingMonths: [5, 10],
    closedSeason: null,
    habitatDepth: '20~80m',
    tipKey: 'season.tip.chamdom',
    releaseSites: [
      { city: '부산 사하구', region: '남해', count: 100000, months: [4], year: 2026, note: '2026-04-01~04-30' },
    ],
  },
  // ── 볼락 ───────────────────────────────────────────────
  {
    species: '볼락',
    speciesEn: 'Korean Rockfish',
    emoji: '🐡',
    image: '/fish-bolrak.png',
    peakFishingMonths: [1, 2, 3, 11, 12],
    goldFishingMonths: [1, 2],
    closedSeason: null,
    habitatDepth: '5~20m (암초)',
    tipKey: 'season.tip.bolrak',
    releaseSites: [
      { city: '통영', region: '남해', count: 309630, months: [12], year: 2026, note: '2025-12 방류 (2026 사업)' },
      { city: '사천', region: '남해', count: 220000, months: [5], year: 2026, note: '2026-05-01~05-14' },
      { city: '하동', region: '남해', count: 143000, months: [5, 6, 7, 8], year: 2026, note: '2026-05-01~08-31' },
      { city: '거제', region: '남해', count: 26345, months: [1], year: 2026, note: '2025-12-15~01-16' },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────

/** Total release count for a species */
export function getTotalRelease(data: FishSeasonData): number {
  return data.releaseSites.reduce((sum, s) => sum + s.count, 0);
}

/** Number of cities for a species */
export function getReleaseCityCount(data: FishSeasonData): number {
  return new Set(data.releaseSites.map(s => s.city)).size;
}

/** Filter release sites by region */
export function filterByRegion(data: FishSeasonData, region: Region): ReleaseSite[] {
  if (region === '전국') return data.releaseSites;
  return data.releaseSites.filter(s => s.region === region || s.region === '전국');
}

/** Check if current month is peak season */
export function isPeakSeason(data: FishSeasonData, month: number): boolean {
  return data.peakFishingMonths.includes(month);
}

/** Check if currently in closed season */
export function isClosedSeason(data: FishSeasonData, month: number, day: number): boolean {
  if (!data.closedSeason) return false;
  const [startM, startD] = data.closedSeason.start.split('/').map(Number);
  const [endM, endD] = data.closedSeason.end.split('/').map(Number);
  const current = month * 100 + day;
  const start = startM * 100 + startD;
  const end = endM * 100 + endD;
  return current >= start && current <= end;
}

/** Get season status label */
export function getSeasonStatus(data: FishSeasonData, month: number, day: number): 
  'peak' | 'gold' | 'closed' | 'offseason' {
  if (isClosedSeason(data, month, day)) return 'closed';
  if (data.goldFishingMonths.includes(month)) return 'gold';
  if (data.peakFishingMonths.includes(month)) return 'peak';
  return 'offseason';
}

/** Sort species: in-season first, then by total release count */
export function sortByCurrentSeason(species: FishSeasonData[], month: number): FishSeasonData[] {
  return [...species].sort((a, b) => {
    const aInSeason = a.peakFishingMonths.includes(month) ? 1 : 0;
    const bInSeason = b.peakFishingMonths.includes(month) ? 1 : 0;
    if (aInSeason !== bInSeason) return bInSeason - aInSeason;
    return getTotalRelease(b) - getTotalRelease(a);
  });
}

// 전체 어종 목록 (중복 제거)
export const ALL_SPECIES = [...new Set(FISH_SEASON_DB.map(d => d.species))];
export const SPECIES_META: Record<string, { emoji: string; speciesEn: string }> = 
  Object.fromEntries(FISH_SEASON_DB.map(d => [d.species, { emoji: d.emoji, speciesEn: d.speciesEn }]));
