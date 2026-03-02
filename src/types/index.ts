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
}

// ===== Fish Species =====
export const FISH_SPECIES = [
  '감성돔', '참돔', '농어', '볼락', '광어', '우럭',
  '방어', '숭어', '고등어', '전갱이', '학꽁치', '기타'
] as const;
export type FishSpecies = (typeof FISH_SPECIES)[number] | string;

// ===== Catch Record =====
export type RecordVisibility = 'private' | 'public';

export interface CatchRecord extends BaseEntity {
  userId?: string;       // Firebase Auth UID (확장용)
  date: string;          // YYYY-MM-DD
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
