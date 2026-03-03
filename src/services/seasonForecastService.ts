// Season Forecast Service
// Uses fishSeasonDB (static data) — no LLM needed for structured release data.
// This service is kept for backward compatibility and potential future use.

import {
  FISH_SEASON_DB,
  isPeakSeason,
  isClosedSeason,
  getTotalRelease,
  getSeasonStatus,
  type Region,
  type FishSeasonData,
} from '@/data/fishSeasonDB';

export interface SeasonForecastReport {
  species: string;
  emoji: string;
  currentMonth: number;
  isPeakNow: boolean;
  isClosedNow: boolean;
  closedSeasonText: string | null;
  totalReleaseCount: number;
  cityCount: number;
  status: 'peak' | 'gold' | 'closed' | 'offseason';
  summary: string;
  tips: string[];
  disclaimer: string;
  peakMonths: number[];
  goldMonths: number[];
  habitatDepth: string;
}

export function getSeasonForecast(species: string): SeasonForecastReport | null {
  const data = FISH_SEASON_DB.find(d => d.species === species);
  if (!data) return null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const peak = isPeakSeason(data, month);
  const closed = isClosedSeason(data, month, day);
  const total = getTotalRelease(data);
  const cities = new Set(data.releaseSites.map(s => s.city)).size;
  const status = getSeasonStatus(data, month, day);

  const statusText = closed
    ? `현재 금어기 (${data.closedSeason!.start} ~ ${data.closedSeason!.end})`
    : status === 'gold'
      ? '🔥 지금이 황금 조과 시즌!'
      : peak
        ? '📈 피크 시즌 진행 중'
        : `피크 시즌: ${data.peakFishingMonths.join('·')}월`;

  const summary = `${data.species} — ${cities}개 지역에서 총 ${total.toLocaleString()}마리 방류 계획. ${statusText}`;

  const tips: string[] = [
    `황금 조과: ${data.goldFishingMonths.join('·')}월`,
    data.closedSeason ? `금어기: ${data.closedSeason.start} ~ ${data.closedSeason.end}` : '금어기 없음',
    `서식 수심: ${data.habitatDepth}`,
  ];

  return {
    species: data.species,
    emoji: data.emoji,
    currentMonth: month,
    isPeakNow: peak,
    isClosedNow: closed,
    closedSeasonText: data.closedSeason ? `${data.closedSeason.start} ~ ${data.closedSeason.end}` : null,
    totalReleaseCount: total,
    cityCount: cities,
    status,
    summary,
    tips,
    disclaimer: '방류 계획 데이터 기반 예측입니다. 실제 조과는 기상·수온에 따라 달라질 수 있습니다.',
    peakMonths: data.peakFishingMonths,
    goldMonths: data.goldFishingMonths,
    habitatDepth: data.habitatDepth,
  };
}
