import { UserProfile } from '@/types';

// ===== Ranking Types =====
export type RankingCategory = 'catch' | 'size' | 'variety';

export interface RankingEntry {
  rank: number;
  user: UserProfile;
  value: number;
  label: string;      // e.g., "128마리" or "58cm"
}

export interface RankingData {
  category: RankingCategory;
  seasonLabel: string;          // e.g., "2026년 2월 시즌"
  seasonEndDate: string;        // ISO 8601
  myRank: RankingEntry | null;
  topThree: RankingEntry[];
  rest: RankingEntry[];         // 4th~10th
  isRealData?: boolean;         // true = Firebase live data, false = mock
}

export interface RankingService {
  getRanking(category: RankingCategory): Promise<RankingData>;
}
