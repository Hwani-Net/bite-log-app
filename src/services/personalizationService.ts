// AI Personalization Service
// Analyzes user's past catch records to generate personalized insights
// No external API calls — pure data analysis ($0 cost)

import { CatchRecord, UserStats } from '@/types';

// ─── Types ────────────────────────────────────────────────────

export interface PersonalInsight {
  type: 'pattern' | 'achievement' | 'tip' | 'streak' | 'prediction';
  icon: string;
  title: string;
  description: string;
  highlight?: string; // bold value (e.g. "72%")
  color: 'primary' | 'emerald' | 'amber' | 'red' | 'blue';
}

export interface UserFishingProfile {
  favoriteSpecies: string | null;
  favoriteSpot: string | null;
  bestMonth: string | null;
  avgCatchRate: number;
  totalDays: number;
  currentStreak: number;
  insights: PersonalInsight[];
}

// ─── Helpers ──────────────────────────────────────────────────

function getMonthName(month: number): string {
  const names = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  return names[month - 1] ?? `${month}월`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

// ─── Core Analysis ────────────────────────────────────────────

/**
 * Analyze user's fishing records and generate personalized insights.
 * Pure data analysis — $0 cost, no external APIs.
 */
export function analyzeUserRecords(records: CatchRecord[]): UserFishingProfile {
  if (records.length === 0) {
    return {
      favoriteSpecies: null,
      favoriteSpot: null,
      bestMonth: null,
      avgCatchRate: 0,
      totalDays: 0,
      currentStreak: 0,
      insights: getNewUserInsights(),
    };
  }

  // Sort by date descending
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  // ── Basic stats ──
  const uniqueDates = new Set(records.map(r => r.date));
  const totalDays = uniqueDates.size;
  const totalCatch = records.reduce((sum, r) => sum + r.count, 0);
  const avgCatchRate = totalDays > 0 ? Math.round((totalCatch / totalDays) * 10) / 10 : 0;

  // ── Favorite species ──
  const speciesCount = new Map<string, number>();
  records.forEach(r => {
    speciesCount.set(r.species, (speciesCount.get(r.species) ?? 0) + r.count);
  });
  const topSpecies = [...speciesCount.entries()].sort((a, b) => b[1] - a[1]);
  const favoriteSpecies = topSpecies[0]?.[0] ?? null;

  // ── Favorite spot ──
  const spotCount = new Map<string, number>();
  records.forEach(r => {
    spotCount.set(r.location.name, (spotCount.get(r.location.name) ?? 0) + 1);
  });
  const topSpots = [...spotCount.entries()].sort((a, b) => b[1] - a[1]);
  const favoriteSpot = topSpots[0]?.[0] ?? null;

  // ── Best month ──
  const monthCount = new Map<number, number>();
  records.forEach(r => {
    const m = new Date(r.date).getMonth() + 1;
    monthCount.set(m, (monthCount.get(m) ?? 0) + r.count);
  });
  const topMonths = [...monthCount.entries()].sort((a, b) => b[1] - a[1]);
  const bestMonth = topMonths[0] ? getMonthName(topMonths[0][0]) : null;

  // ── Current streak ──
  const currentStreak = calculateStreak(sorted);

  // ── Generate insights ──
  const insights = generateInsights(
    sorted, totalCatch, totalDays, avgCatchRate,
    favoriteSpecies, favoriteSpot, bestMonth,
    topSpecies, topSpots, currentStreak
  );

  return {
    favoriteSpecies,
    favoriteSpot,
    bestMonth,
    avgCatchRate,
    totalDays,
    currentStreak,
    insights,
  };
}

function calculateStreak(sortedRecords: CatchRecord[]): number {
  if (sortedRecords.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const lastDate = sortedRecords[0].date;
  const daysSinceLast = daysBetween(today, lastDate);

  // If last record was more than 7 days ago, streak is broken
  if (daysSinceLast > 7) return 0;

  let streak = 1;
  for (let i = 1; i < sortedRecords.length; i++) {
    const gap = daysBetween(sortedRecords[i - 1].date, sortedRecords[i].date);
    if (gap <= 7) streak++;
    else break;
  }
  return streak;
}

// ─── Insight Generation ───────────────────────────────────────

function generateInsights(
  records: CatchRecord[],
  totalCatch: number,
  totalDays: number,
  avgCatchRate: number,
  favoriteSpecies: string | null,
  favoriteSpot: string | null,
  bestMonth: string | null,
  topSpecies: [string, number][],
  topSpots: [string, number][],
  streak: number,
): PersonalInsight[] {
  const insights: PersonalInsight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // 1. Species mastery
  if (favoriteSpecies && topSpecies[0]) {
    const pct = totalCatch > 0 ? Math.round((topSpecies[0][1] / totalCatch) * 100) : 0;
    insights.push({
      type: 'pattern',
      icon: 'analytics',
      title: `${favoriteSpecies} 전문가`,
      description: `전체 조과의 ${pct}%가 ${favoriteSpecies}입니다. ${
        pct > 60 ? '다른 어종에도 도전해보세요!' : '다양한 어종을 섭렵하고 있어요!'
      }`,
      highlight: `${pct}%`,
      color: 'primary',
    });
  }

  // 2. Hot streak
  if (streak >= 3) {
    insights.push({
      type: 'streak',
      icon: 'local_fire_department',
      title: `${streak}주 연속 출조 🔥`,
      description: '꾸준함이 실력을 만듭니다! 연속 출조 기록을 이어가세요.',
      highlight: `${streak}주`,
      color: 'emerald',
    });
  }

  // 3. Best month prediction
  if (bestMonth) {
    const isCurrentBestMonth = topSpecies.length > 0 && bestMonth === getMonthName(currentMonth);
    insights.push({
      type: 'prediction',
      icon: 'calendar_month',
      title: isCurrentBestMonth ? '지금이 최적의 시즌!' : `${bestMonth}이 최고 시즌`,
      description: isCurrentBestMonth
        ? `${bestMonth}은 조과가 가장 좋은 달입니다. 적극적으로 출조하세요!`
        : `분석 결과, ${bestMonth}에 조과가 가장 좋았어요.`,
      highlight: bestMonth,
      color: isCurrentBestMonth ? 'emerald' : 'blue',
    });
  }

  // 4. Size achievement
  const bigCatches = records.filter(r => (r.sizeCm ?? 0) >= 40);
  if (bigCatches.length > 0) {
    const maxSize = Math.max(...bigCatches.map(r => r.sizeCm ?? 0));
    insights.push({
      type: 'achievement',
      icon: 'emoji_events',
      title: `대물 사냥꾼`,
      description: `40cm 이상 대물 ${bigCatches.length}마리 기록! 최대 ${maxSize}cm 🏆`,
      highlight: `${maxSize}cm`,
      color: 'amber',
    });
  }

  // 5. Favorite spot loyalty
  if (favoriteSpot && topSpots[0] && topSpots[0][1] >= 3) {
    insights.push({
      type: 'pattern',
      icon: 'favorite',
      title: `단골 낚시터`,
      description: `${favoriteSpot}을(를) ${topSpots[0][1]}회 방문. 이 포인트만의 비법을 가지고 있나요?`,
      highlight: `${topSpots[0][1]}회`,
      color: 'red',
    });
  }

  // 6. Catch rate performance
  if (totalDays >= 3) {
    if (avgCatchRate >= 5) {
      insights.push({
        type: 'achievement',
        icon: 'trending_up',
        title: '고효율 낚시!',
        description: `출조당 평균 ${avgCatchRate}마리. 상위 10% 실력자에요!`,
        highlight: `${avgCatchRate}마리/일`,
        color: 'emerald',
      });
    } else if (avgCatchRate < 2) {
      insights.push({
        type: 'tip',
        icon: 'lightbulb',
        title: '효율 개선 팁',
        description: `출조당 평균 ${avgCatchRate}마리. AI 컨시어지에서 추천 포인트를 확인해보세요!`,
        highlight: `${avgCatchRate}마리/일`,
        color: 'amber',
      });
    }
  }

  // 7. Recent inactivity
  if (records.length > 0 && streak === 0) {
    const lastDate = records[0].date;
    const daysSince = Math.floor(daysBetween(now.toISOString().split('T')[0], lastDate));
    if (daysSince >= 14) {
      insights.push({
        type: 'tip',
        icon: 'notifications_active',
        title: `${daysSince}일째 쉬는 중`,
        description: '오랜만에 출조해볼까요? AI 컨시어지가 오늘의 최적 포인트를 추천하고 있어요!',
        highlight: `${daysSince}일`,
        color: 'amber',
      });
    }
  }

  return insights.slice(0, 4); // Max 4 insights
}

function getNewUserInsights(): PersonalInsight[] {
  return [
    {
      type: 'tip',
      icon: 'waving_hand',
      title: '환영합니다! 🎣',
      description: '첫 조과를 기록하면 AI가 맞춤 분석을 제공해드립니다.',
      color: 'primary',
    },
    {
      type: 'tip',
      icon: 'auto_awesome',
      title: 'AI 컨시어지를 만나보세요',
      description: '오늘의 추천 포인트, 시즌 어종, 장비를 AI가 분석해줍니다.',
      color: 'blue',
    },
  ];
}
