// Species-specific Bite Forecast Service
// Provides per-species fishing scores by factoring in optimal conditions
// for each target species (water temperature, tide preference, time of day, etc.)

import { BiteTimePrediction } from './biteTimeService';

// Seasonal activity profile — 24-hour preference per season
export interface SeasonalActivity {
  spring: number[];  // 3~5월 (24개 값, 0.0~1.0)
  summer: number[];  // 6~8월
  autumn: number[];  // 9~11월
  winter: number[];  // 12~2월
}

// Species-specific environmental preferences
export interface SpeciesCondition {
  species: string;
  emoji: string;
  optimalTempRange: [number, number]; // °C [min, max] — best water temp
  goodTempRange: [number, number];    // °C — acceptable range
  preferredTideStrength: 'strong' | 'moderate' | 'any'; // tide current preference
  preferredTimeOfDay: 'dawn' | 'dusk' | 'night' | 'day' | 'any'; // best feeding time
  pressureSensitivity: 'high' | 'medium' | 'low'; // how much pressure affects them
  depthRange: string; // habitat depth
  note: string;       // fishing tip in Korean
  // DEPRECATED — use seasonalActivity instead
  hourlyPreference?: number[];
  // NEW: 계절별 시간 활성도 (리서치 기반)
  seasonalActivity: SeasonalActivity;
}

// Korean fishing species condition database
// Source: Tavily pro research (2026-03-11) — 블로그, 낚시춘추, SNS 조과기록 기반
// Key references: fishingseasons.co.kr, 네이버 블로그 실전 리포트, 부산일보, Instagram 조과
const SPECIES_CONDITIONS: SpeciesCondition[] = [
  {
    species: '감성돔',
    emoji: '🐟',
    optimalTempRange: [14, 20],
    goodTempRange: [10, 24],
    preferredTideStrength: 'strong',
    preferredTimeOfDay: 'dawn',
    pressureSensitivity: 'high',
    depthRange: '5~30m',
    note: '들물 3~4물 때 입질이 가장 활발하며, 기압이 떨어질 때 먹이활동이 증가합니다.',
    // 봄: 아침 피크 [네이버블로그 실전보고], 가을: 해질녘 피크 [동해안 16~18시 보고]
    // 한낮 12~14시 연중 저활성 [다수 근거]
    seasonalActivity: {
      spring: [0.2, 0.15, 0.15, 0.3, 0.7, 0.95, 1.0, 0.85, 0.6, 0.4, 0.25, 0.2, 0.15, 0.15, 0.2, 0.3, 0.4,  0.6, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2],
      summer: [0.15, 0.1, 0.1, 0.2, 0.5, 0.7, 0.8, 0.65, 0.4, 0.25, 0.15, 0.1, 0.1, 0.1, 0.15, 0.2, 0.35, 0.5, 0.6, 0.45, 0.3, 0.2, 0.15, 0.15],
      autumn: [0.3, 0.2, 0.2, 0.35, 0.6, 0.8, 0.85, 0.7, 0.5, 0.3, 0.2, 0.15, 0.15, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 0.85, 0.6, 0.4, 0.35, 0.3],
      winter: [0.25, 0.2, 0.2, 0.3, 0.5, 0.7, 0.75, 0.6, 0.4, 0.3, 0.2, 0.15, 0.15, 0.15, 0.2, 0.3, 0.4,  0.55, 0.65, 0.5, 0.35, 0.25, 0.25, 0.25],
    },
  },
  {
    species: '참돔',
    emoji: '🎏',
    optimalTempRange: [16, 22],
    goodTempRange: [13, 26],
    preferredTideStrength: 'moderate',
    preferredTimeOfDay: 'dawn',
    pressureSensitivity: 'medium',
    depthRange: '20~80m',
    note: '산란기(4~6월) 새벽 05~07시 폭풍입질 보고 다수. 바닥층 공략 필수.',
    // 산란기(봄) 새벽 폭풍입질 [실전 사례 blog.naver.com/hukihuki]
    // 상사리(여름~가을) 종일 가능하나 새벽 여전히 우세
    seasonalActivity: {
      spring: [0.2, 0.15, 0.2, 0.4, 0.85, 1.0, 0.95, 0.7, 0.5, 0.35, 0.25, 0.2, 0.2, 0.2, 0.25, 0.3, 0.4,  0.55, 0.65, 0.5, 0.35, 0.25, 0.2, 0.2],
      summer: [0.2, 0.15, 0.15, 0.3, 0.6, 0.8, 0.75, 0.6, 0.5, 0.45, 0.4, 0.4, 0.4, 0.4, 0.4, 0.45, 0.5,  0.55, 0.6, 0.45, 0.3, 0.25, 0.2, 0.2],
      autumn: [0.2, 0.15, 0.15, 0.3, 0.7, 0.9, 0.85, 0.65, 0.5, 0.4, 0.35, 0.3, 0.3, 0.3, 0.35, 0.4, 0.45, 0.55, 0.65, 0.5, 0.35, 0.25, 0.2, 0.2],
      winter: [0.15, 0.1, 0.1, 0.2, 0.4, 0.55, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.15, 0.15, 0.2, 0.25, 0.3, 0.4, 0.45, 0.35, 0.25, 0.2, 0.15, 0.15],
    },
  },
  {
    species: '우럭',
    emoji: '🪨',
    optimalTempRange: [8, 18],
    goodTempRange: [5, 22],
    preferredTideStrength: 'moderate',
    preferredTimeOfDay: 'any',
    pressureSensitivity: 'low',
    depthRange: '20~50m',
    note: '수온 변화에 둔감하고 연중 낚이지만, 야간에 중하층까지 떠올라 입질 확률 증가.',
    // 야간 선상 19:30~01:30 매우 활발 [Instagram 실전보고]
    // 주간: 바닥층, 활성 날은 침선 꼭대기까지 뜸
    // 새벽/해질녘 약간 높고 전반적으로 균일하나 야간에 뜨는 패턴
    seasonalActivity: {
      spring: [0.5, 0.45, 0.4, 0.45, 0.65, 0.75, 0.8, 0.7, 0.6, 0.55, 0.5, 0.45, 0.45, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.85, 0.75, 0.65, 0.55, 0.5],
      summer: [0.45, 0.4, 0.35, 0.4, 0.55, 0.65, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.35, 0.35, 0.4, 0.45, 0.55, 0.65, 0.75, 0.8, 0.7, 0.6, 0.5, 0.45],
      autumn: [0.55, 0.5, 0.45, 0.5, 0.7, 0.8, 0.85, 0.75, 0.6, 0.55, 0.5, 0.45, 0.45, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.9, 0.8, 0.7, 0.6, 0.55],
      winter: [0.5, 0.45, 0.4, 0.45, 0.6, 0.7, 0.75, 0.65, 0.55, 0.5, 0.45, 0.4, 0.4, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.85, 0.75, 0.65, 0.55, 0.5],
    },
  },
  {
    species: '볼락',
    emoji: '🐡',
    optimalTempRange: [8, 16],
    goodTempRange: [5, 20],
    preferredTideStrength: 'moderate',
    preferredTimeOfDay: 'night',
    pressureSensitivity: 'medium',
    depthRange: '5~20m',
    note: '7~9월 낮볼락 시즌(새벽~9시, 15~18시), 11~6월 밤볼락 시즌(야간 우세).',
    // ★ 가장 확실한 계절별 전환 [낚시춘추 fishingseasons.co.kr 정복군 볼락 마스터플랜]
    // 여름(7~9월): 낮볼락 — 동튼후~09시, 15~18시 쌍봉형, 10~15시 뜸
    // 겨울(11~6월): 밤볼락 — 야간 중심, 중썰물 때 활발
    seasonalActivity: {
      spring: [0.85, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 0.95, 1.0, 0.95, 0.9],
      summer: [0.3, 0.2, 0.15, 0.2, 0.5, 0.8, 0.95, 1.0, 0.85, 0.5, 0.2, 0.1, 0.1, 0.1, 0.15, 0.5, 0.8, 0.95, 0.85, 0.5, 0.3, 0.2, 0.2, 0.25],
      autumn: [0.7, 0.6, 0.5, 0.4, 0.35, 0.5, 0.7, 0.85, 0.7, 0.4, 0.15, 0.1, 0.1, 0.1, 0.15, 0.4, 0.65, 0.85, 0.75, 0.6, 0.8, 0.9, 0.85, 0.75],
      winter: [0.9, 0.85, 0.8, 0.7, 0.5, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 1.0, 1.0, 0.95, 0.9],
    },
  },
  {
    species: '광어',
    emoji: '🐠',
    optimalTempRange: [14, 22],
    goodTempRange: [10, 26],
    preferredTideStrength: 'strong',
    preferredTimeOfDay: 'dawn',
    pressureSensitivity: 'medium',
    depthRange: '5~30m',
    note: '바닥 공략 필수. 물때 3~6물/10~13물이 좋고, 야간 갯바위에서도 잡힘.',
    // 물때 의존도 높음, 시간대 특정 데이터 제한적
    // 야간 갯바위 광어 조과 보고 있음 [네이버 실전]
    // 기본: 새벽+해질녘 쌍봉 + 야간도 가능
    seasonalActivity: {
      spring: [0.3, 0.2, 0.2, 0.35, 0.7, 0.9, 0.85, 0.65, 0.5, 0.4, 0.3, 0.2, 0.2, 0.2, 0.3, 0.4, 0.5, 0.65, 0.75, 0.55, 0.4, 0.3, 0.3, 0.3],
      summer: [0.25, 0.2, 0.15, 0.25, 0.6, 0.8, 0.75, 0.6, 0.4, 0.3, 0.2, 0.15, 0.15, 0.15, 0.2, 0.3, 0.4, 0.55, 0.65, 0.45, 0.35, 0.25, 0.25, 0.25],
      autumn: [0.35, 0.3, 0.25, 0.4, 0.75, 0.95, 0.9, 0.7, 0.55, 0.4, 0.3, 0.25, 0.25, 0.25, 0.3, 0.45, 0.55, 0.7, 0.8, 0.65, 0.5, 0.4, 0.35, 0.35],
      winter: [0.2, 0.15, 0.15, 0.2, 0.45, 0.6, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15, 0.15, 0.15, 0.2, 0.25, 0.35, 0.45, 0.55, 0.4, 0.3, 0.2, 0.2, 0.2],
    },
  },
  {
    species: '주꾸미',
    emoji: '🐙',
    optimalTempRange: [14, 20],
    goodTempRange: [12, 24],
    preferredTideStrength: 'moderate',
    preferredTimeOfDay: 'day',
    pressureSensitivity: 'low',
    depthRange: '10~30m',
    note: '가을(9~11월) 피크. 오전+오후 쌍봉형 패턴. 물때(1~3물)가 핵심.',
    // ★ 대표님 실전 + 선상 출조 패턴(06~10시 + 14~17시) [네이버 실전보고]
    // 한낮(11~13시) 상대적 저조, 비시즌 거의 잡히지 않음
    seasonalActivity: {
      spring: [0.05, 0.05, 0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1, 0.15, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
      summer: [0.05, 0.05, 0.05, 0.05, 0.1, 0.15, 0.25, 0.35, 0.4, 0.35, 0.25, 0.15, 0.1, 0.1, 0.15, 0.25, 0.2, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
      autumn: [0.05, 0.05, 0.05, 0.1, 0.2, 0.5, 0.8, 0.95, 1.0, 0.9, 0.6, 0.35, 0.3, 0.35, 0.6, 0.85, 0.9, 0.6, 0.3, 0.1, 0.05, 0.05, 0.05, 0.05],
      winter: [0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.1, 0.15, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    },
  },
  {
    species: '농어',
    emoji: '🐈',
    optimalTempRange: [16, 24],
    goodTempRange: [12, 28],
    preferredTideStrength: 'strong',
    preferredTimeOfDay: 'dawn',
    pressureSensitivity: 'high',
    depthRange: '1~15m',
    note: '아침보다 저녁물때가 확률 높음. 초들물/초썰물 집중. 흐린 날, 비오는 날 유리.',
    // ★ 해질녘 > 새벽 [블로그 실전: 저녁물때 입질 왕성, 만조 전후 황금물때]
    // 달 밝으면 깊은 수심, 달 없으면 얕은 수심
    seasonalActivity: {
      spring: [0.25, 0.2, 0.15, 0.3, 0.6, 0.8, 0.75, 0.5, 0.35, 0.25, 0.15, 0.15, 0.15, 0.15, 0.2, 0.3, 0.5, 0.75, 0.9, 0.7, 0.45, 0.35, 0.3, 0.25],
      summer: [0.3, 0.2, 0.15, 0.3, 0.65, 0.85, 0.8, 0.55, 0.35, 0.25, 0.15, 0.1, 0.1, 0.1, 0.2, 0.35, 0.6, 0.85, 1.0, 0.8, 0.55, 0.4, 0.35, 0.3],
      autumn: [0.3, 0.25, 0.2, 0.35, 0.7, 0.9, 0.85, 0.6, 0.4, 0.25, 0.15, 0.1, 0.1, 0.15, 0.25, 0.4, 0.65, 0.9, 1.0, 0.85, 0.6, 0.45, 0.35, 0.3],
      winter: [0.2, 0.15, 0.1, 0.2, 0.4, 0.55, 0.5, 0.35, 0.25, 0.2, 0.15, 0.1, 0.1, 0.1, 0.15, 0.2, 0.35, 0.5, 0.6, 0.45, 0.3, 0.25, 0.2, 0.2],
    },
  },
  {
    species: '고등어',
    emoji: '🐟',
    optimalTempRange: [18, 24],
    goodTempRange: [14, 28],
    preferredTideStrength: 'any',
    preferredTimeOfDay: 'day',
    pressureSensitivity: 'low',
    depthRange: '5~50m',
    note: '동틀 무렵+해질 때 골든타임. 만조 겹치면 한밤중에도 입질. 카드채비 효과적.',
    // ★ 아침 만조 + 해질녘 쌍봉형 [네이버·기사 실전보고]
    // 중들물~끝들물 최고, 만조 시 약아짐, 초썰물에 다시 입질
    seasonalActivity: {
      spring: [0.1, 0.1, 0.1, 0.15, 0.3, 0.5, 0.7, 0.8, 0.75, 0.6, 0.4, 0.3, 0.25, 0.25, 0.3, 0.4, 0.55, 0.7, 0.6, 0.35, 0.2, 0.15, 0.1, 0.1],
      summer: [0.1, 0.1, 0.1, 0.15, 0.35, 0.6, 0.8, 0.9, 0.85, 0.65, 0.45, 0.35, 0.3, 0.3, 0.35, 0.5, 0.65, 0.8, 0.7, 0.4, 0.25, 0.15, 0.1, 0.1],
      autumn: [0.15, 0.1, 0.1, 0.2, 0.4, 0.65, 0.85, 1.0, 0.9, 0.7, 0.5, 0.35, 0.3, 0.3, 0.35, 0.5, 0.7, 0.85, 0.75, 0.45, 0.25, 0.15, 0.15, 0.15],
      winter: [0.1, 0.1, 0.1, 0.1, 0.2, 0.35, 0.5, 0.6, 0.55, 0.4, 0.3, 0.25, 0.2, 0.2, 0.25, 0.3, 0.4, 0.5, 0.45, 0.3, 0.2, 0.1, 0.1, 0.1],
    },
  },
  {
    species: '쥐노래미',
    emoji: '🐟',
    optimalTempRange: [8, 16],
    goodTempRange: [5, 20],
    preferredTideStrength: 'moderate',
    preferredTimeOfDay: 'day',
    pressureSensitivity: 'low',
    depthRange: '3~15m',
    note: '겨울 방파제 낚시의 주력 어종. 크릴 미끼로 바닥~중층 공략. 빠른 입질 패턴.',
    // 시간대 특정 데이터 제한적 — 바닥층 위주 주간 활동 [fishingseasons.co.kr]
    // 연중 주간 활동형으로 추정, 한낮에도 비교적 양호 (바닥 어종 특성)
    seasonalActivity: {
      spring: [0.1, 0.1, 0.1, 0.15, 0.3, 0.45, 0.6, 0.7, 0.8, 0.85, 0.8, 0.75, 0.7, 0.7, 0.65, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1],
      summer: [0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.45, 0.55, 0.6, 0.65, 0.6, 0.55, 0.5, 0.5, 0.5, 0.45, 0.35, 0.25, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1],
      autumn: [0.1, 0.1, 0.1, 0.15, 0.3, 0.5, 0.65, 0.75, 0.85, 0.9, 0.85, 0.8, 0.75, 0.75, 0.7, 0.65, 0.55, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1],
      winter: [0.1, 0.1, 0.1, 0.2, 0.35, 0.5, 0.7, 0.8, 0.9, 1.0, 0.95, 0.85, 0.8, 0.8, 0.75, 0.65, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1, 0.1],
    },
  },
  {
    species: '방어',
    emoji: '🐟',
    optimalTempRange: [14, 20],
    goodTempRange: [10, 24],
    preferredTideStrength: 'strong',
    preferredTimeOfDay: 'dawn',
    pressureSensitivity: 'high',
    depthRange: '30~100m',
    note: '겨울 대물 시즌. 조류가 강할 때 지깅으로 공략. 기압 변화에 민감.',
    // 떼로 이동, 아침 입질 집중, 오후에도 가능 — 시간대 특정 데이터 제한적
    // 새벽+오전 피크, 해질녘 2차 [선상 출조 패턴 기준]
    seasonalActivity: {
      spring: [0.2, 0.15, 0.15, 0.3, 0.6, 0.8, 0.75, 0.6, 0.45, 0.35, 0.25, 0.2, 0.2, 0.2, 0.25, 0.35, 0.45, 0.55, 0.6, 0.45, 0.3, 0.25, 0.2, 0.2],
      summer: [0.15, 0.1, 0.1, 0.2, 0.4, 0.55, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.15, 0.15, 0.2, 0.25, 0.3, 0.4, 0.45, 0.3, 0.2, 0.15, 0.15, 0.15],
      autumn: [0.25, 0.2, 0.2, 0.35, 0.7, 0.9, 0.85, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2, 0.2, 0.3, 0.4, 0.55, 0.7, 0.75, 0.55, 0.4, 0.3, 0.25, 0.25],
      winter: [0.3, 0.25, 0.2, 0.4, 0.75, 1.0, 0.95, 0.75, 0.6, 0.45, 0.35, 0.25, 0.2, 0.2, 0.3, 0.4, 0.55, 0.7, 0.8, 0.6, 0.45, 0.35, 0.3, 0.3],
    },
  },
];

export interface SpeciesBiteScore {
  species: string;
  emoji: string;
  score: number; // 0-100 adjusted for this species
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  gradeEmoji: string;
  adjustment: number;  // delta from base score (e.g. +13, -8)
  reason: string;      // why this species is better/worse today
  tip: string;         // species-specific tip
}

/**
 * Calculate species-specific bite scores based on current conditions.
 * Takes the base prediction and adjusts for each species' preferences.
 */
export function getSpeciesBiteScores(
  basePrediction: BiteTimePrediction,
): SpeciesBiteScore[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const hour = now.getHours();

  // Extract current conditions from base prediction factors
  const sstFactor = basePrediction.factors.find(f => f.name.includes('수온'));
  const tideFactor = basePrediction.factors.find(f => f.icon === 'waves');
  const pressureFactor = basePrediction.factors.find(f => f.name === '기압');

  // Parse SST value from factor name (e.g. "수온 12.1°C")
  const sstMatch = sstFactor?.name.match(/([\d.]+)°C/);
  const currentSST = sstMatch ? parseFloat(sstMatch[1]) : basePrediction.seaSurfaceTemp;

  // Parse current velocity from description
  const velocityMatch = tideFactor?.description.match(/유속\s*([\d.]+)m\/s/);
  const currentVelocity = velocityMatch ? parseFloat(velocityMatch[1]) : undefined;

  // Parse pressure from description
  const pressureMatch = pressureFactor?.description.match(/([\d.]+)hPa/);
  const currentPressure = pressureMatch ? parseFloat(pressureMatch[1]) : undefined;

  return SPECIES_CONDITIONS.map(sp => {
    let adjustment = 0;
    const reasons: string[] = [];

    // 1. Water temperature check (biggest factor)
    if (currentSST !== undefined) {
      const [optMin, optMax] = sp.optimalTempRange;
      const [goodMin, goodMax] = sp.goodTempRange;

      if (currentSST >= optMin && currentSST <= optMax) {
        adjustment += 12;
        reasons.push(`수온 ${currentSST}°C — ${sp.species} 최적 수온대!`);
      } else if (currentSST >= goodMin && currentSST <= goodMax) {
        adjustment += 4;
        reasons.push(`수온 ${currentSST}°C — ${sp.species} 활동 범위`);
      } else {
        adjustment -= 15;
        reasons.push(`수온 ${currentSST}°C — ${sp.species}에게 부적합`);
      }
    }

    // 2. Tide/Current strength preference
    if (currentVelocity !== undefined) {
      if (sp.preferredTideStrength === 'strong' && currentVelocity >= 0.4) {
        adjustment += 6;
        reasons.push('강한 조류 선호 어종 — 지금 조류 적합');
      } else if (sp.preferredTideStrength === 'moderate' && currentVelocity >= 0.2 && currentVelocity <= 0.7) {
        adjustment += 4;
        reasons.push('적당한 조류 — 양호');
      } else if (sp.preferredTideStrength === 'strong' && currentVelocity < 0.2) {
        adjustment -= 6;
        reasons.push('조류가 약해 활성 저하 예상');
      }
    }

    // 3. Time of day preference
    if (sp.preferredTimeOfDay === 'dawn' && (hour >= 4 && hour <= 7)) {
      adjustment += 8;
      reasons.push('새벽 활동 어종 — 매직아워!');
    } else if (sp.preferredTimeOfDay === 'dusk' && (hour >= 17 && hour <= 20)) {
      adjustment += 8;
      reasons.push('해질녘 활동 어종 — 골든타임!');
    } else if (sp.preferredTimeOfDay === 'night' && (hour >= 20 || hour <= 4)) {
      adjustment += 8;
      reasons.push('야행성 어종 — 활동 시간대');
    } else if (sp.preferredTimeOfDay === 'day' && (hour >= 8 && hour <= 16)) {
      adjustment += 4;
      reasons.push('주간 활동 어종 — 적합');
    } else if (sp.preferredTimeOfDay !== 'any') {
      adjustment -= 5;
    }

    // 4. Pressure sensitivity
    if (currentPressure !== undefined && sp.pressureSensitivity === 'high') {
      if (currentPressure >= 1000 && currentPressure <= 1012) {
        adjustment += 5;
        reasons.push('기압 하강 → 활성도 급상승!');
      } else if (currentPressure > 1020) {
        adjustment -= 5;
        reasons.push('고기압 → 이 어종은 입질 저조 경향');
      }
    }

    // 5. Season bonus
    const SEASON_DB_ENTRY = findSeasonMatch(sp.species, month);
    if (SEASON_DB_ENTRY === 'peak') {
      adjustment += 5;
      reasons.push(`${month}월 피크 시즌!`);
    } else if (SEASON_DB_ENTRY === 'gold') {
      adjustment += 8;
      reasons.push(`${month}월 골드 시즌! 🏆`);
    } else if (SEASON_DB_ENTRY === 'offseason') {
      adjustment -= 8;
      reasons.push('비시즌 — 확률 낮음');
    }

    const adjustedScore = Math.min(100, Math.max(0, basePrediction.score + adjustment));
    const grade: SpeciesBiteScore['grade'] = adjustedScore >= 75 ? 'excellent' : adjustedScore >= 55 ? 'good' : adjustedScore >= 35 ? 'fair' : 'poor';
    const gradeEmoji = grade === 'excellent' ? '🟢' : grade === 'good' ? '🔵' : grade === 'fair' ? '🟡' : '🔴';

    return {
      species: sp.species,
      emoji: sp.emoji,
      score: adjustedScore,
      grade,
      gradeEmoji,
      adjustment,
      reason: reasons.slice(0, 2).join(' · ') || '기본 조건 적용',
      tip: sp.note,
    };
  }).sort((a, b) => b.score - a.score); // Best species first
}

// Simple season matcher using FISH_SEASON_DB peakFishingMonths
function findSeasonMatch(species: string, month: number): 'peak' | 'gold' | 'offseason' {
  // Inline season data for species we track
  const seasonMap: Record<string, { peak: number[]; gold: number[] }> = {
    '감성돔': { peak: [4, 5, 10, 11, 12], gold: [11, 12] },
    '참돔': { peak: [5, 6, 10, 11], gold: [5, 10] },
    '우럭': { peak: [3, 4, 10, 11, 12], gold: [11, 12] },
    '볼락': { peak: [1, 2, 3, 11, 12], gold: [1, 2] },
    '광어': { peak: [4, 5, 10, 11], gold: [10, 11] },
    '주꾸미': { peak: [9, 10, 11], gold: [9, 10] },
    '농어': { peak: [6, 7, 8, 9, 10], gold: [9, 10] },
    '고등어': { peak: [8, 9, 10, 11], gold: [9, 10] },
    '쥐노래미': { peak: [11, 12, 1, 2, 3], gold: [12, 1] },
    '방어': { peak: [11, 12, 1, 2], gold: [12, 1] },
  };

  const entry = seasonMap[species];
  if (!entry) return 'offseason';
  if (entry.gold.includes(month)) return 'gold';
  if (entry.peak.includes(month)) return 'peak';
  return 'offseason';
}

/** Get the list of species condition profiles */
export function getSpeciesConditions(): SpeciesCondition[] {
  return SPECIES_CONDITIONS;
}

/** Map month (1~12) to season key */
export function getSeason(month: number): keyof SeasonalActivity {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter'; // 12, 1, 2
}

/**
 * Get 24-hour activity weight array for a species in the current season.
 * @param speciesName — Korean species name
 * @param month — 1~12 (defaults to current month)
 * Returns [0.5, 0.5, ...] (flat) if species not found.
 */
export function getSpeciesHourlyBoost(speciesName: string, month?: number): number[] {
  const sp = SPECIES_CONDITIONS.find(s => s.species === speciesName);
  if (!sp) return Array(24).fill(0.5);

  const m = month ?? (new Date().getMonth() + 1);
  const season = getSeason(m);
  return sp.seasonalActivity[season];
}
