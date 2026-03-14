'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord } from '@/types';
import { fetchTideData } from '@/services/tideService';
import { fetchWeather } from '@/services/weatherService';
import { fetchMarineData } from '@/services/marineService';
import { calculateBiteTime, BiteTimePrediction } from '@/services/biteTimeService';
import { getSpeciesBiteScores, SpeciesBiteScore } from '@/services/speciesBiteService';
import { fetchTopNews, FishingNewsItem } from '@/services/fishingNewsService';
import { analyzeUserRecords, UserFishingProfile } from '@/services/personalizationService';
import { getInSeasonSpecies } from '@/services/conciergeService';
import {
  FISH_SEASON_DB, getSeasonStatus, getTotalRelease,
  sortByCurrentSeason, type FishSeasonData,
} from '@/data/fishSeasonDB';

// ─── 시즌 예측 위젯 (동적 데이터 기반) ──────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
  gold:      { label: '황금 시즌', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  peak:      { label: '피크 시즌', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  closed:    { label: '금어기',     badge: 'bg-red-100 text-red-600',     dot: 'bg-red-500' },
  offseason: { label: '비시즌',     badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
};

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
}

function SeasonForecastWidget({ locale }: { locale: string }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isKo = locale === 'ko';

  const sorted = sortByCurrentSeason(FISH_SEASON_DB, month);
  // 현재 시즌인 어종 (peak + gold)
  const inSeason = sorted.filter(d => {
    const st = getSeasonStatus(d, month, day);
    return st === 'peak' || st === 'gold';
  });
  // 금어기 어종
  const closed = sorted.filter(d => getSeasonStatus(d, month, day) === 'closed');

  return (
    <section className="px-4 pt-6">
      <Link href="/season-forecast" className="block group">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-primary/20 transition-all">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <div>
                <p className="text-xs font-bold text-white">
                  {isKo ? `${month}월 시즌 예측` : `${month} Season Forecast`}
                </p>
                <p className="text-[10px] text-white/70">
                  {isKo ? '치어 방류 데이터 기반' : 'Based on fry release data'}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-white/80 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
          </div>

          {/* 시즌 어종 칩 */}
          <div className="px-4 py-3">
            {inSeason.length > 0 ? (
              <>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {isKo ? '🎣 지금 잡히는 어종' : '🎣 In Season Now'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {inSeason.map(d => {
                    const st = getSeasonStatus(d, month, day);
                    const style = STATUS_STYLES[st];
                    const total = getTotalRelease(d);
                    return (
                      <div
                        key={d.species}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${style.badge} border border-transparent`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <span className="text-sm">{d.emoji}</span>
                        <span className="text-xs font-bold">{d.species}</span>
                        {total > 0 && (
                          <span className="text-[9px] opacity-70">{formatCount(total)} 방류</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                {isKo ? '현재 피크 시즌인 어종이 없습니다' : 'No species in peak season'}
              </p>
            )}

            {/* 금어기 경고 */}
            {closed.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-500">
                <span>⛔</span>
                <span>
                  {isKo ? '금어기' : 'Closed'}: {closed.map(d => `${d.emoji} ${d.species}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}

// ─── Windy 위성 날씨 ─────────────────────────────────────────────────────────
function WindyWeatherSection({ locale }: { locale: string }) {
  return (
    <section className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-sky-500 text-base">satellite_alt</span>
        <h2 className="text-sm font-bold text-slate-800">
          {locale === 'ko' ? '출항 날씨' : 'Departure Weather'}
        </h2>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <iframe
          title="Windy Weather"
          width="100%"
          height="300"
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=m/s&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=35.5&lon=128.5&detailLat=35.5&detailLon=128.5&marker=true&message=true"
          frameBorder="0"
        />
      </div>
      <p className="text-[10px] text-slate-400 text-center mt-2">
        바람 · 파도 · 해류를 터치로 확인하세요 · Powered by Windy.com
      </p>
    </section>
  );
}

// ─── Hero Card: 오늘의 낚시 조건 ──────────────────────────────────────────────
// 시간대별 오버레이 컬러 (아침/오후/저녁/밤)
function getTimeOfDayOverlay(hour: number, weatherDesc?: string): string {
  const isCloud = weatherDesc && /cloud|overcast|rain|snow/i.test(weatherDesc);
  if (hour >= 5 && hour < 9) {
    // 아침: 황금빛 오렌지
    return isCloud
      ? 'linear-gradient(to bottom, rgba(60,50,30,0.55) 0%, rgba(80,60,20,0.80) 55%, rgba(30,20,5,0.93) 100%)'
      : 'linear-gradient(to bottom, rgba(120,70,10,0.50) 0%, rgba(180,90,10,0.72) 35%, rgba(20,10,5,0.92) 100%)';
  } else if (hour >= 9 && hour < 17) {
    // 오후: 맑은 청색
    return isCloud
      ? 'linear-gradient(to bottom, rgba(30,50,80,0.55) 0%, rgba(20,40,70,0.78) 55%, rgba(5,20,45,0.93) 100%)'
      : 'linear-gradient(to bottom, rgba(5,35,90,0.42) 0%, rgba(8,60,110,0.70) 55%, rgba(4,25,55,0.93) 100%)';
  } else if (hour >= 17 && hour < 20) {
    // 저녁: 붉은 노을
    return isCloud
      ? 'linear-gradient(to bottom, rgba(80,30,20,0.55) 0%, rgba(100,40,15,0.80) 55%, rgba(30,10,5,0.93) 100%)'
      : 'linear-gradient(to bottom, rgba(150,50,10,0.52) 0%, rgba(200,70,15,0.78) 35%, rgba(40,10,5,0.93) 100%)';
  } else {
    // 밤: 짙은 남색
    return 'linear-gradient(to bottom, rgba(5,10,40,0.60) 0%, rgba(5,15,50,0.82) 55%, rgba(2,5,25,0.96) 100%)';
  }
}

function HeroCard({ biteTime, loading }: { biteTime: BiteTimePrediction | null; loading: boolean }) {
  const scoreColor = biteTime
    ? biteTime.score >= 75 ? '#22c55e'
    : biteTime.score >= 55 ? '#3b82f6'
    : biteTime.score >= 35 ? '#f59e0b'
    : '#ef4444'
    : '#94a3b8';

  const month = new Date().getMonth() + 1;
  const hour = new Date().getHours();
  // 시간대 레이블 (배지)
  const timeLabel =
    hour >= 5 && hour < 9 ? '🌅 아침' :
    hour >= 9 && hour < 17 ? '☀️ 낮' :
    hour >= 17 && hour < 20 ? '🌇 저녁' : '🌙 밤';
  const weatherDesc = biteTime?.factors?.find(f => f.name.includes('날씨') || f.name.includes('Weather'))?.name;
  const overlayBg = getTimeOfDayOverlay(hour, weatherDesc);

  return (
    <section className="px-4 pt-4">
      <Link href="/bite-forecast" className="block">
      <div className="relative rounded-3xl overflow-hidden h-52 shadow-xl">
        {/* 실사 배경 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg.png"
          alt="fishing background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 시간대+날씨 동적 오버레이 */}
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{ background: overlayBg }}
        />

        {/* LIVE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wide">LIVE</span>
        </div>

        {/* Tidal phase + season badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          {biteTime?.currentPhaseLabel && (
            <div className="flex items-center gap-1 bg-cyan-500/80 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="text-[10px]">🌊</span>
              <span className="text-[10px] font-bold text-white">{biteTime.currentPhaseLabel}</span>
              {biteTime.currentStrengthLabel && (
                <span className="text-[9px] font-medium text-white/80">{biteTime.currentStrengthLabel}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-[11px] font-semibold text-white">{timeLabel}</span>
          </div>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white/70 text-xs font-medium mb-1">오늘의 낚시 조건</p>
          <div className="flex items-end justify-between">
            <div>
              {loading ? (
                <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse" />
              ) : biteTime ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-black text-white">{biteTime.gradeEmoji}</span>
                    <span className="text-xl font-bold text-white">{biteTime.gradeLabel}</span>
                  </div>
                  <p className="text-white/80 text-xs">{biteTime.gradeLabel}</p>
                </>
              ) : (
                <p className="text-white text-lg font-bold">조건 분석 중...</p>
              )}
            </div>

            {/* Circular score */}
            {biteTime && !loading && (
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(biteTime.score / 100) * 163.4} 163.4`}
                    stroke={scoreColor}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-white leading-none">{biteTime.score}</span>
                  <span className="text-[9px] text-white/60">/ 100</span>
                </div>
              </div>
            )}
          </div>

          {/* Factor pills */}
          {biteTime && !loading && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {biteTime.factors.map((f) => (
                <span
                  key={f.name}
                  className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5"
                >
                  <span className="material-symbols-outlined text-[10px] text-white">{f.icon}</span>
                  <span className="text-[10px] text-white/90 font-medium">{f.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      </Link>
    </section>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({
  totalCatch, thisMonth, maxSize, locale
}: { totalCatch: number; thisMonth: number; maxSize: number; locale: string }) {
  const items = [
    { label: locale === 'ko' ? '총 조과' : 'Total', value: totalCatch, unit: locale === 'ko' ? '마리' : '' },
    { label: locale === 'ko' ? '이번 달' : 'Month', value: thisMonth, unit: locale === 'ko' ? '마리' : '' },
    { label: locale === 'ko' ? '최대' : 'Max', value: maxSize || '-', unit: maxSize ? 'cm' : '' },
  ];

  return (
    <section className="px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex divide-x divide-slate-100">
        {items.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3 px-2">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{item.label}</p>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-xl font-black text-slate-900">{item.value}</span>
              {item.unit && <span className="text-[10px] text-slate-400 font-medium">{item.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── AI 컨시어지 + 시즌 예측 통합 배너 ────────────────────────────────────────
function AIInsightBanner({ profile, locale }: { profile: UserFishingProfile | null; locale: string }) {
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isKo = locale === 'ko';

  // fishSeasonDB 기반 시즌 어종 + 금어기
  const inSeason = useMemo(() =>
    sortByCurrentSeason(FISH_SEASON_DB, month).filter(d => {
      const st = getSeasonStatus(d, month, day);
      return st === 'peak' || st === 'gold';
    }), [month, day]);

  const closed = useMemo(() =>
    FISH_SEASON_DB.filter(d => getSeasonStatus(d, month, day) === 'closed'),
    [month, day]);

  return (
    <section className="px-4 pt-4">
      <div className="bg-gradient-to-br from-primary via-blue-500 to-cyan-500 rounded-2xl overflow-hidden shadow-md shadow-primary/20">
        {/* ── 상단: AI 컨시어지 CTA ── */}
        <Link href="/concierge" className="flex items-center gap-3 p-4 pb-3 group">
          <div className="rounded-xl overflow-hidden shrink-0 w-10 h-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ai-concierge.png" alt="AI" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
              {isKo ? 'AI 컨시어지' : 'AI Concierge'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {inSeasonSpecies.length > 0
                ? `${month}월 시즌: ${inSeasonSpecies.slice(0, 3).map(s => s.name).join(', ')}`
                : (isKo ? '오늘의 추천 포인트 확인하기' : 'Check today\'s spots')}
            </p>
            {profile && profile.totalDays > 0 && (
              <p className="text-[10px] text-white/70 mt-0.5">
                {profile.totalDays}일 기록 분석 완료
              </p>
            )}
          </div>
          <span className="material-symbols-outlined text-white/80 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
        </Link>

        {/* ── 구분선 ── */}
        <div className="mx-4 border-t border-white/15" />

        {/* ── 하단: 시즌 어종 칩 + 금어기 (시즌 예측 상세 링크) ── */}
        <Link href="/season-forecast" className="block px-4 py-3 group/season">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider flex items-center gap-1">
              🎣 {isKo ? '지금 잡히는 어종' : 'In Season Now'}
            </p>
            <span className="text-[9px] text-white/50 flex items-center gap-0.5 group-hover/season:text-white/80 transition-colors">
              {isKo ? '시즌 상세' : 'Details'}
              <span className="material-symbols-outlined text-[12px] group-hover/season:translate-x-0.5 transition-transform">chevron_right</span>
            </span>
          </div>
          {inSeason.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {inSeason.map(d => {
                const st = getSeasonStatus(d, month, day);
                const isGold = st === 'gold';
                const total = getTotalRelease(d);
                return (
                  <div
                    key={d.species}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      isGold
                        ? 'bg-amber-400/30 text-amber-100'
                        : 'bg-white/15 text-white/90'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isGold ? 'bg-amber-300' : 'bg-green-300'}`} />
                    <span>{d.emoji}</span>
                    <span>{d.species}</span>
                    {total > 0 && (
                      <span className="text-[9px] opacity-70 font-medium">{formatCount(total)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/60">
              {isKo ? '현재 피크 시즌인 어종이 없습니다' : 'No species in peak season'}
            </p>
          )}

          {/* 금어기 경고 */}
          {closed.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-200">
              <span>⛔</span>
              <span>
                {isKo ? '금어기' : 'Closed'}: {closed.map(d => `${d.emoji} ${d.species}`).join(', ')}
              </span>
            </div>
          )}
        </Link>
      </div>
    </section>
  );
}

// ─── AI Insights Grid ─────────────────────────────────────────────────────────
function AIInsightsSection({ profile, locale }: { profile: UserFishingProfile | null; locale: string }) {
  if (!profile || profile.insights.length === 0) return null;

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-primary' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-500' },
    blue: { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600' },
  };

  return (
    <section className="px-4 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
        <h2 className="text-sm font-bold text-slate-800">
          {locale === 'ko' ? 'AI 인사이트' : 'AI Insights'}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {profile.insights.map((insight, i) => {
          const c = colorMap[insight.color] ?? colorMap.blue;
          return (
            <div key={i} className={`rounded-2xl p-3 border ${c.bg} ${c.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`material-symbols-outlined text-sm ${c.text}`}>{insight.icon}</span>
                {insight.highlight && (
                  <span className={`text-xs font-black ${c.text}`}>{insight.highlight}</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 leading-tight">{insight.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{insight.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Fish species default image/color mapping
const FISH_COLORS: Record<string, { gradient: string; emoji: string }> = {
  '농어': { gradient: 'from-blue-500 to-cyan-400', emoji: '🐟' },
  '우럭': { gradient: 'from-amber-500 to-orange-400', emoji: '🪨' },
  '참돔': { gradient: 'from-rose-400 to-pink-300', emoji: '🍣' },
  '감성돔': { gradient: 'from-violet-500 to-purple-400', emoji: '🐠' },
  '볼락': { gradient: 'from-emerald-500 to-green-400', emoji: '🔮' },
  '광어': { gradient: 'from-yellow-400 to-amber-300', emoji: '🫓' },
  '고등어': { gradient: 'from-indigo-500 to-blue-400', emoji: '🐟' },
  '방어': { gradient: 'from-sky-500 to-cyan-400', emoji: '🐟' },
  '주꾸미': { gradient: 'from-red-400 to-orange-300', emoji: '🐙' },
};
const DEFAULT_FISH = { gradient: 'from-slate-400 to-slate-300', emoji: '🎣' };

// ─── 최근 조과 (매거진 카드) ──────────────────────────────────────────────────
function CatchMagazineCard({ record, index }: { record: CatchRecord; index: number }) {
  const tagColors = [
    'bg-primary/10 text-primary',
    'bg-teal-500/10 text-teal-600',
    'bg-violet-500/10 text-violet-600',
  ];
  const fishStyle = FISH_COLORS[record.species] || DEFAULT_FISH;
  // Use real user photos; skip bundled placeholder images
  const hasRealPhoto = record.photos.length > 0 && !record.photos[0].startsWith('/fish-');

  return (
    <Link
      href={`/records/detail?id=${record.id}`}
      className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.98]"
    >
      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        {hasRealPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.photos[0]} alt={record.species} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${fishStyle.gradient} flex items-center justify-center`}>
            <span className="text-3xl drop-shadow-md">{fishStyle.emoji}</span>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tagColors[index % 3]}`}>
            {record.species}
          </span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{record.date.replace(/-/g, '.')}</span>
        </div>
        <h4 className="text-sm font-bold mt-1 text-slate-900 truncate">
          {record.species} {record.sizeCm ? `${record.sizeCm}cm` : `${record.count}마리`}
        </h4>
        <div className="flex items-center mt-0.5 text-slate-400">
          <span className="material-symbols-outlined text-[12px] mr-0.5">location_on</span>
          <span className="text-[10px] truncate">{record.location.name}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── 낚시 뉴스 카드 (full-bleed image) ───────────────────────────────────────
const NEWS_GRADIENTS = [
  'from-blue-600 via-blue-500 to-cyan-400',
  'from-slate-700 via-slate-600 to-slate-500',
  'from-amber-600 via-orange-500 to-yellow-400',
  'from-emerald-600 via-teal-500 to-cyan-400',
  'from-violet-600 via-purple-500 to-pink-400',
];
const NEWS_EMOJIS = ['🎣', '🐟', '🌊', '⛵', '🦑'];

function NewsCard({ item, index = 0 }: { item: FishingNewsItem; index?: number }) {
  const dotColor = item.freshness === 'realtime' ? 'bg-red-500'
    : item.freshness === 'today' ? 'bg-amber-400'
    : 'bg-slate-300';
  const hasThumbnail = !!item.thumbnail;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:scale-[1.01] transition-all active:scale-[0.99]"
    >
      {/* 이미지 + 타이틀 오버레이 */}
      <div className="relative w-full h-40 overflow-hidden bg-slate-900">
        {hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-80"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${NEWS_GRADIENTS[index % NEWS_GRADIENTS.length]} flex items-center justify-center`}>
            <span className="text-5xl opacity-30">{NEWS_EMOJIS[index % NEWS_EMOJIS.length]}</span>
          </div>
        )}
        {/* 하단 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

        {/* 상단 배지 */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${item.freshness === 'realtime' ? 'animate-pulse' : ''}`} />
          <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {item.freshness === 'realtime' ? 'LIVE' : item.sourceLabel}
          </span>
          {item.species && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/80 text-white font-bold">
              🐟 {item.species}
            </span>
          )}
        </div>

        {/* 하단 타이틀 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">
            {item.title}
          </p>
          <p className="text-[10px] text-white/60 mt-0.5">{item.sourceLabel}</p>
        </div>
      </div>
    </a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const locale = useAppStore((s) => s.locale);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [biteLoading, setBiteLoading] = useState(true);
  const [topNews, setTopNews] = useState<FishingNewsItem[]>([]);
  const [aiProfile, setAiProfile] = useState<UserFishingProfile | null>(null);

  // Demo records — dynamic dates relative to today for a realistic feel
  const today = new Date();
  const daysAgo = (d: number) => {
    const t = new Date(today); t.setDate(today.getDate() - d);
    return t.toISOString().slice(0, 10);
  };

  const DEMO_RECORDS: CatchRecord[] = [
    {
      id: 'demo-1', species: '농어', sizeCm: 72, count: 1,
      date: daysAgo(1), location: { name: '제주 서귀포 범섬', lat: 33.22, lng: 126.51 },
      photos: [],
      memo: '범섬 포인트 캐스팅, 미노우 12cm 히트! 대물 농어 72cm 🎉',
      createdAt: daysAgo(1), updatedAt: daysAgo(1), visibility: 'public' as const,
    },
    {
      id: 'demo-2', species: '우럭', sizeCm: 28, count: 5,
      date: daysAgo(3), location: { name: '충남 당진 왜목항', lat: 36.96, lng: 126.88 },
      photos: [],
      memo: '왜목항 방파제 야간 원투, 우럭 5마리 마릿수 조과',
      createdAt: daysAgo(3), updatedAt: daysAgo(3), visibility: 'public' as const,
    },
    {
      id: 'demo-3', species: '참돔', sizeCm: 45, count: 2,
      date: daysAgo(5), location: { name: '전남 여수 금오도', lat: 34.5, lng: 127.75 },
      photos: [],
      memo: '금오도 선상 타이라바, 45cm급 참돔 2마리! 물때 최고',
      createdAt: daysAgo(5), updatedAt: daysAgo(5), visibility: 'public' as const,
    },
    {
      id: 'demo-4', species: '감성돔', sizeCm: 42, count: 1,
      date: daysAgo(8), location: { name: '경남 통영 욕지도', lat: 34.59, lng: 128.25 },
      photos: [],
      memo: '욕지도 갯바위 찌낚시, 감성돔 42cm 1마리',
      createdAt: daysAgo(8), updatedAt: daysAgo(8), visibility: 'public' as const,
    },
    {
      id: 'demo-5', species: '볼락', sizeCm: 22, count: 8,
      date: daysAgo(12), location: { name: '강원 속초 대포항', lat: 38.18, lng: 128.6 },
      photos: [],
      memo: '대포항 야간 루어, 볼락 마릿수 폭발 🔥 지그헤드 1.5g',
      createdAt: daysAgo(12), updatedAt: daysAgo(12), visibility: 'public' as const,
    },
  ];

  useEffect(() => {
    async function load() {
      try {
        const catches = await getDataService().getCatchRecords();
        setRecords(catches);
        setAiProfile(analyzeUserRecords(catches));
      } finally {
        setRecordsLoading(false);
      }
    }
    load();
    fetchTopNews().then(setTopNews).catch(console.error);
  }, []);

  useEffect(() => {
    async function loadBiteTime() {
      setBiteLoading(true);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              const [w, t, m] = await Promise.all([
                fetchWeather(latitude, longitude),
                fetchTideData(latitude, longitude),
                fetchMarineData(latitude, longitude),
              ]);
              setBiteTime(calculateBiteTime(w, t, m));
              setBiteLoading(false);
            },
            () => {
              setBiteTime(calculateBiteTime(null, null));
              setBiteLoading(false);
            },
            { timeout: 5000, maximumAge: 300000 }
          );
        } else {
          setBiteTime(calculateBiteTime(null, null));
          setBiteLoading(false);
        }
      } catch {
        setBiteTime(calculateBiteTime(null, null));
        setBiteLoading(false);
      }
    }
    loadBiteTime();
  }, []);

  const isDemo = !recordsLoading && records.length === 0;
  const displayRecords = recordsLoading ? [] : (records.length > 0 ? records : DEMO_RECORDS);
  const totalCatch = recordsLoading ? 0 : (isDemo ? 128 : records.reduce((acc, r) => acc + r.count, 0));
  const maxSize = recordsLoading ? 0 : (isDemo ? 58 : records.reduce((acc, r) => Math.max(acc, r.sizeCm ?? 0), 0));
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthCatch = recordsLoading ? 0 : (isDemo ? 15 : records
    .filter((r) => r.date.startsWith(currentMonthPrefix))
    .reduce((acc, r) => acc + r.count, 0));

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-slate-50 overflow-x-hidden pb-24">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 bg-slate-50 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
            <span className="material-symbols-outlined text-xl">set_meal</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">
            <span className="text-primary">BITE</span>
            <span className="text-slate-900"> Log</span>
          </h1>
          {isDemo && (
            <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">DEMO</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/concierge"
            className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-primary"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
          </Link>
          <Link
            href="/alerts"
            className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 hover:bg-sky-50 hover:border-sky-200 transition-colors"
            aria-label="알림 설정"
          >
            <span className="material-symbols-outlined text-slate-500 text-lg">notifications</span>
          </Link>
        </div>
      </header>

      {/* ── Hero: 오늘의 낚시 조건 ── */}
      <HeroCard biteTime={biteTime} loading={biteLoading} />

      {/* ── 시즌 예측 위젯 ── */}
      <SeasonForecastWidget locale={locale} />

      {/* ── 어종별 맞춤 입질 예보 ── */}
      {biteTime && !biteLoading && (
        <SpeciesBiteRanking biteTime={biteTime} locale={locale} />
      )}

      {/* ── Stat Bar ── */}
      <StatBar totalCatch={totalCatch} thisMonth={thisMonthCatch} maxSize={maxSize} locale={locale} />

      {/* ── AI Concierge Banner ── */}
      <AIInsightBanner profile={aiProfile} locale={locale} />

      {/* ── 최근 조과 ── */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">
            {locale === 'ko' ? '최근 조과' : 'Recent Catches'}
          </h2>
          <Link href="/records" className="text-xs font-semibold text-primary flex items-center gap-0.5">
            {locale === 'ko' ? '전체보기' : 'View All'}
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>
        <div className="space-y-2.5">
          {recordsLoading ? (
            // Skeleton cards while loading — prevents DEMO flash
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex gap-3 animate-pulse">
                <div className="w-[72px] h-[72px] rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-slate-200 rounded w-16" />
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-24" />
                </div>
              </div>
            ))
          ) : (
            displayRecords.slice(0, 3).map((r, i) => (
              <CatchMagazineCard key={r.id} record={r} index={i} />
            ))
          )}
        </div>
      </section>

      {/* ── 낚시 뉴스 ── */}
      {topNews.length > 0 && (
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {locale === 'ko' ? '실시간 조과 소식' : 'Live News'}
            </h2>
            <Link href="/news" className="text-xs font-semibold text-primary flex items-center gap-0.5">
              {locale === 'ko' ? '전체보기' : 'View All'}
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
          <div className="space-y-3">
            {topNews.slice(0, 3).map((item, i) => (
              <NewsCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── AI Insights ── */}
      <AIInsightsSection profile={aiProfile} locale={locale} />

      {/* ── 바이럴 채비 랭킹 위젯 ── */}
      <section className="px-4 pt-3 pb-2">
        <Link href="/viral-gear" className="block">
          <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-orange-200">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🔥</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
                {locale === 'ko' ? '바이럴 채비 랭킹' : 'Viral Gear Ranking'}
              </p>
              <p className="text-sm font-bold text-white truncate">
                {locale === 'ko'
                  ? '🛒 지금 커뮤니티에서 가장 핫한 채비 TOP 5'
                  : '🛒 Most talked-about gear in fishing communities'}
              </p>
            </div>
            <span className="material-symbols-outlined text-white/80">chevron_right</span>
          </div>
        </Link>
      </section>

      {/* ── Windy 위성 날씨: 바람·파도·해류 (하단 배치 — 스크롤 차단 방지) ── */}
      <WindyWeatherSection locale={locale} />

      {/* ── FAB ── */}
      <Link
        href="/record"
        className="fixed bottom-24 right-5 z-40 size-14 rounded-full bg-gradient-to-tr from-primary to-cyan-400 text-white shadow-xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        aria-label="새 기록 추가"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </Link>
    </div>
  );
}

// ── Species Bite Ranking (어종별 맞춤 입질 예보) ──────────────────
function SpeciesBiteRanking({ biteTime, locale }: { biteTime: BiteTimePrediction; locale: string }) {
  const scores = useMemo(() => getSpeciesBiteScores(biteTime), [biteTime]);
  const isKo = locale === 'ko';
  const top5 = scores.slice(0, 5);
  const scrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="px-4 pt-4" role="region" aria-label="어종별 입질 예보">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-base">phishing</span>
          {isKo ? '어종별 입질 예보' : 'Species Forecast'}
        </h2>
        <span className="text-[10px] text-slate-400">
          {isKo ? '현재 조건 기준' : 'Based on current conditions'}
        </span>
      </div>

      <div ref={scrollRef} tabIndex={0} className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 cursor-grab active:cursor-grabbing touch-pan-x overscroll-contain">
        {top5.map((sp, i) => {
          const bgGradient =
            sp.grade === 'excellent' ? 'from-emerald-500 to-teal-500' :
            sp.grade === 'good' ? 'from-blue-500 to-cyan-500' :
            sp.grade === 'fair' ? 'from-amber-500 to-orange-400' :
            'from-slate-400 to-slate-500';
          const borderColor =
            sp.grade === 'excellent' ? 'border-emerald-200' :
            sp.grade === 'good' ? 'border-blue-200' :
            sp.grade === 'fair' ? 'border-amber-200' :
            'border-slate-200';
          const adjustText = sp.adjustment > 0 ? `+${sp.adjustment}` : `${sp.adjustment}`;
          const adjustColor = sp.adjustment > 0 ? 'text-emerald-600' : sp.adjustment < 0 ? 'text-red-500' : 'text-slate-400';

          return (
            <div
              key={sp.species}
              className={`shrink-0 w-[140px] bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}
            >
              {/* Score header */}
              <div className={`bg-gradient-to-r ${bgGradient} px-3 py-2.5 flex items-center justify-between`}>
                <div className="flex items-center gap-1.5">
                  {i === 0 && <span className="text-xs">👑</span>}
                  <span className="text-sm">{sp.emoji}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-black text-xl leading-none">{sp.score}</span>
                  <span className="text-white/70 text-[10px] ml-0.5">/100</span>
                </div>
              </div>
              {/* Species info */}
              <div className="p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate">{sp.species}</span>
                  <span className={`text-[10px] font-bold ${adjustColor}`}>{adjustText}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mb-1.5">{sp.reason}</p>
                <p className="text-[9px] text-teal-600 leading-snug line-clamp-1">💡 {sp.tip.split('.')[0]}.</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
