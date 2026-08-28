// ===== Base Entity (Firebase 확장 대비) =====
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ===== Fishing Spot =====
export interface FishingSpot {
  name: string;
  lat?: number;
  lng?: number;
  region?: string;
}

// ===== Weather Info (확장용) =====
export interface WeatherInfo {
  condition: string;
  tempC: number;
  windSpeed?: number;
  humidity?: number;
}

// ===== Tide Info (확장용) =====
export interface TideRecordData {
  stationName: string;
  tides: {
    type: 'High' | 'Low'; // '고조' | '저조'
    time: string; // HH:mm
    level: number; // cm
  }[];
  // 기록 시점 물흐름 스냅샷 (예: "들물 3물") — 저장할 때 이미 계산되던
  // getCurrentPhase() 결과를 버리지 않고 담는다. 옛 기록엔 없다(optional).
  currentPhase?: string;
}

// ===== Fish Species =====
// 주꾸미·갑오징어: 규정DB(금어기)·시즌DB의 핵심 어종인데 기록 폼에서
// 선택할 수 없어 "기타"로 적어야 했다 — 규정 지킴이·시즌 리마인더가
// 그 기록을 못 잡는 정합 구멍(4차 GOAL-1에서 추가).
export const FISH_SPECIES = [
  '감성돔', '참돔', '농어', '볼락', '광어', '우럭',
  '방어', '숭어', '고등어', '전갱이', '학꽁치',
  '주꾸미', '갑오징어', '기타'
] as const;
export type FishSpecies = (typeof FISH_SPECIES)[number] | string;

// ===== Catch Record =====
export type RecordVisibility = 'private' | 'public';

export interface CatchRecord extends BaseEntity {
  userId?: string;       // Firebase Auth UID (확장용)
  date: string;          // YYYY-MM-DD
  caughtTime?: string;   // HH:mm — 잡은 시각(로컬). 옛 기록엔 없다(optional)
  location: FishingSpot;
  species: FishSpecies;
  count: number;
  sizeCm?: number;
  weightKg?: number;     // 확장: 무게
  photos: string[];      // base64 or Firebase Storage URL
  memo?: string;
  weather?: WeatherInfo;
  tide?: TideRecordData;
  visibility: RecordVisibility; // 기본값: 'public'
  likeCount?: number;  // 좋아요 기능 (Option B)
  boatUid?: string;    // 더피싱 uid — myBoatService.ts 의 "내 선사 카드"와 같은 키
  tackle?: string;     // 채비·미끼 (5차 GOAL-2에서 입력 UI 연결)
}

// ===== Public Feed Item (GPS 좌표 제외) =====
export interface PublicFeedItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  date: string;
  location: { name: string; region?: string }; // GPS 좌표 의도적 제외
  species: string;
  count: number;
  sizeCm?: number;
  photos: string[];       // 첫 1장만
  weather?: WeatherInfo;
  tide?: TideRecordData;
  createdAt: string;
  likeCount: number;       // 좋아요 수
  commentCount: number;    // 댓글 수
  sourceRecordId?: string; // 원본 CatchRecord ID (Firestore dual-write)
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  userId: string;
  userDisplayName: string;
  content: string;
  createdAt: string;
}

// ===== User Stats =====
export interface SpeciesBreakdown {
  species: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;   // e.g., "2026-01"
  label: string;   // e.g., "1월"
  count: number;
}

export interface TopSpot {
  spot: FishingSpot;
  visits: number;
  totalCatch: number;
}

export interface UserStats {
  totalTrips: number;
  totalCatch: number;
  avgCatchPerTrip: number;
  maxSizeCm: number;
  speciesBreakdown: SpeciesBreakdown[];
  monthlyTrend: MonthlyTrend[];
  topSpots: TopSpot[];
}

// ===== User Profile (Firebase 확장용 - 회원 랭킹) =====
export type BadgeType = 'beginner' | 'intermediate' | 'expert' | 'master' | 'legend';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  earnedAt: string;
}

export interface UserProfile extends BaseEntity {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: number;
  totalCatch: number;
  badges: Badge[];
}

// ===== Data Service Interface (Firebase 전환용) =====
export interface DataService {
  // Catch Records
  getCatchRecords(): Promise<CatchRecord[]>;
  getCatchRecord(id: string): Promise<CatchRecord | null>;
  addCatchRecord(record: Omit<CatchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatchRecord>;
  updateCatchRecord(id: string, data: Partial<CatchRecord>): Promise<CatchRecord>;
  deleteCatchRecord(id: string): Promise<void>;

  // Stats
  getUserStats(period?: 'week' | 'month' | '3months' | 'all'): Promise<UserStats>;
}

// ===== Form Schema =====
export interface CatchFormData {
  date: string;
  locationName: string;
  species: FishSpecies;
  count: number;
  sizeCm?: number;
  memo?: string;
  photos: string[];
}

// ===== Period Filter =====
export type PeriodFilter = 'week' | 'month' | '3months' | 'all';
export const PERIOD_OPTIONS: { value: PeriodFilter; label: string; labelEn: string }[] = [
  { value: 'week', label: '1주', labelEn: '1W' },
  { value: 'month', label: '1개월', labelEn: '1M' },
  { value: '3months', label: '3개월', labelEn: '3M' },
  { value: 'all', label: '전체', labelEn: 'All' },
];
