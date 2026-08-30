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
  /**
   * 순위가 비어 있는 이유가 "불러오기 실패"일 때만 채워진다.
   * 값이 없으면 정상적으로 조회했고 집계 대상이 없었다는 뜻이다 —
   * 실패와 "아직 기록 없음"이 같은 빈 배열로 보이면 사용자도 로그도 둘을 구분할 수 없다.
   */
  unavailable?: RankingUnavailableReason;
}

/** 랭킹을 불러오지 못한 이유. 화면 문구와 로그 분기의 근거가 된다. */
export type RankingUnavailableReason =
  | "timeout"
  | "permission"
  | "offline"
  | "error";

export interface RankingService {
  getRanking(category: RankingCategory): Promise<RankingData>;
}
