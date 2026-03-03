// Lunar Phase Service — Moon phase calculation for fishing
// No API needed — pure astronomical calculation (Metonic cycle approximation)

export interface LunarInfo {
  phase: number;           // 0~29 (음력 일수, 0=신월, 15=보름)
  phaseName: string;       // 한글 명칭
  phaseEmoji: string;      // 달 이모지
  lunarAge: number;        // 음력 일
  isSariPeriod: boolean;   // 사리(대조기) 여부 — 보름/그믐 전후
  isJogumPeriod: boolean;  // 조금(소조기) 여부 — 상현/하현 전후
  fishingImpact: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
}

/**
 * Calculate lunar age (days since new moon) using Conway's approximation
 * Accurate to ±1 day, sufficient for fishing forecasts
 */
function getLunarAge(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Reference new moon: 2000-01-06 (Julian Day 2451550.1)
  // Synodic month: 29.53059 days
  const synodicMonth = 29.53059;

  // Days since reference date
  const refDate = new Date(2000, 0, 6); // Jan 6, 2000
  const diffMs = date.getTime() - refDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Lunar age = days modulo synodic month
  let age = diffDays % synodicMonth;
  if (age < 0) age += synodicMonth;

  return Math.round(age * 10) / 10;
}

/**
 * Get comprehensive lunar info for fishing
 */
export function getLunarInfo(date: Date = new Date()): LunarInfo {
  const age = getLunarAge(date);
  const phase = Math.round(age);

  // Phase names and emojis
  let phaseName: string;
  let phaseEmoji: string;

  if (age < 1.85) {
    phaseName = '신월(삭)'; phaseEmoji = '🌑';
  } else if (age < 5.53) {
    phaseName = '초승달'; phaseEmoji = '🌒';
  } else if (age < 8.38) {
    phaseName = '상현달'; phaseEmoji = '🌓';
  } else if (age < 12.91) {
    phaseName = '상현 지남'; phaseEmoji = '🌔';
  } else if (age < 16.61) {
    phaseName = '보름달(망)'; phaseEmoji = '🌕';
  } else if (age < 20.29) {
    phaseName = '하현 앞'; phaseEmoji = '🌖';
  } else if (age < 23.99) {
    phaseName = '하현달'; phaseEmoji = '🌗';
  } else if (age < 27.68) {
    phaseName = '그믐달'; phaseEmoji = '🌘';
  } else {
    phaseName = '그믐(삭 직전)'; phaseEmoji = '🌑';
  }

  // 사리(대조기): 신월(0) 또는 보름(15) 전후 2~3일 — 물 세기 최대, 입질 활발
  const distFromNew = Math.min(age, 29.53 - age);
  const distFromFull = Math.abs(age - 14.77);
  const isSariPeriod = distFromNew <= 3 || distFromFull <= 3;

  // 조금(소조기): 상현(7.4) 또는 하현(22.1) 전후 2~3일 — 물 세기 약, 입질 약
  const distFromFirstQ = Math.abs(age - 7.38);
  const distFromThirdQ = Math.abs(age - 22.07);
  const isJogumPeriod = distFromFirstQ <= 3 || distFromThirdQ <= 3;

  // Fishing impact
  let fishingImpact: LunarInfo['fishingImpact'];
  let description: string;

  if (isSariPeriod) {
    if (distFromNew <= 1 || distFromFull <= 1) {
      fishingImpact = 'excellent';
      description = '사리 피크 — 조류 최강, 입질 폭발 기대';
    } else {
      fishingImpact = 'good';
      description = '사리 전후 — 조류 강하고 먹이활동 활발';
    }
  } else if (isJogumPeriod) {
    if (distFromFirstQ <= 1 || distFromThirdQ <= 1) {
      fishingImpact = 'poor';
      description = '조금 — 조류 약하고 입질 저조';
    } else {
      fishingImpact = 'fair';
      description = '조금 전후 — 조류 약해지기 시작';
    }
  } else {
    fishingImpact = 'good';
    description = '중간물 — 적당한 조류, 무난한 조건';
  }

  return {
    phase,
    phaseName,
    phaseEmoji,
    lunarAge: Math.round(age),
    isSariPeriod,
    isJogumPeriod,
    fishingImpact,
    description,
  };
}
