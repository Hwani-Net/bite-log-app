'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord } from '@/types';
import { fetchTideData } from '@/services/tideService';
import { fetchWeather } from '@/services/weatherService';
import { calculateBiteTime, BiteTimePrediction } from '@/services/biteTimeService';
import { fetchTopNews, FishingNewsItem } from '@/services/fishingNewsService';
import { analyzeUserRecords, UserFishingProfile } from '@/services/personalizationService';
import { getInSeasonSpecies } from '@/services/conciergeService';

// ─── Hero Card: 오늘의 낚시 조건 ──────────────────────────────────────────────
function HeroCard({ biteTime, loading }: { biteTime: BiteTimePrediction | null; loading: boolean }) {
  const scoreColor = biteTime
    ? biteTime.score >= 75 ? '#22c55e'
    : biteTime.score >= 55 ? '#3b82f6'
    : biteTime.score >= 35 ? '#f59e0b'
    : '#ef4444'
    : '#94a3b8';

  const month = new Date().getMonth() + 1;

  return (
    <section className="px-4 pt-4">
      <div className="relative rounded-3xl overflow-hidden h-52 shadow-xl">
        {/* 실사 배경 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-bg.png"
          alt="fishing background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 그라데이션 오버레이 — 텍스트 가독성 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,30,60,0.45) 0%, rgba(8,50,80,0.75) 55%, rgba(5,25,50,0.92) 100%)',
          }}
        />

        {/* LIVE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wide">LIVE</span>
        </div>

        {/* Season badge */}
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-[11px] font-semibold text-white">{month}월 시즌</span>
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

// ─── AI 인사이트 띠 ──────────────────────────────────────────────────────────
function AIInsightBanner({ profile, locale }: { profile: UserFishingProfile | null; locale: string }) {
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);
  const month = new Date().getMonth() + 1;

  return (
    <section className="px-4 pt-4">
      <Link href="/concierge" className="block">
        <div className="bg-gradient-to-r from-primary to-cyan-500 rounded-2xl p-4 flex items-center gap-3 shadow-md shadow-primary/20">
          <div className="bg-white/20 rounded-xl p-2 shrink-0">
            <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">
              {locale === 'ko' ? 'AI 컨시어지 추천' : 'AI Concierge'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {inSeasonSpecies.length > 0
                ? `${month}월 시즌: ${inSeasonSpecies.slice(0, 3).map(s => s.name).join(', ')}`
                : (locale === 'ko' ? '오늘의 추천 포인트 확인하기' : 'Check today\'s spots')}
            </p>
            {profile && profile.totalDays > 0 && (
              <p className="text-[10px] text-white/70 mt-0.5">
                {profile.totalDays}일 기록 분석 완료
              </p>
            )}
          </div>
          <span className="material-symbols-outlined text-white/80">chevron_right</span>
        </div>
      </Link>
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

// ─── 최근 조과 (매거진 카드) ──────────────────────────────────────────────────
function CatchMagazineCard({ record, index }: { record: CatchRecord; index: number }) {
  const tagColors = [
    'bg-primary/10 text-primary',
    'bg-teal-500/10 text-teal-600',
    'bg-violet-500/10 text-violet-600',
  ];

  return (
    <Link
      href={`/records/detail?id=${record.id}`}
      className="flex gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.98]"
    >
      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        {record.photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.photos[0]} alt={record.species} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">set_meal</span>
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
function NewsCard({ item }: { item: FishingNewsItem }) {
  const dotColor = item.freshness === 'realtime' ? 'bg-red-500'
    : item.freshness === 'today' ? 'bg-amber-400'
    : 'bg-slate-300';

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      {item.thumbnail && (
        <div className="w-full h-36 overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[10px] text-slate-400 font-medium">{item.sourceLabel}</span>
          {item.species && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 font-semibold">
              🐟 {item.species}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{item.title}</p>
      </div>
    </a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const locale = useAppStore((s) => s.locale);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [biteLoading, setBiteLoading] = useState(true);
  const [topNews, setTopNews] = useState<FishingNewsItem[]>([]);
  const [aiProfile, setAiProfile] = useState<UserFishingProfile | null>(null);

  // Demo records shown when no real records exist
  const DEMO_RECORDS: CatchRecord[] = [
    {
      id: 'demo-1', species: '농어', sizeCm: 72, count: 1,
      date: '2024-05-20', location: { name: '제주도 서귀포시', lat: 0, lng: 0 },
      photos: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAooF4TYs_z1-nO7MoHh3d9SUfk6KbTwyQpgA3bm0lHCPfxmB4wIidRdOrvFwThAj42a9q9KD-nfsV5-dJNm4agXRbwjrFW5VFg1EPa9Evn97up6_d0QAn3l1ByRmsY0wLxr126kJQrNBDg0hs5UkpVJk4Zm5E7k3rfT9OMKTJaE4xf1nq8IKsUxEQGJjeLCDjt6tVm0-qHxDzDxt4uvkOVu7rm5QAWtfosFGnnxOW-afjA2fhPC6dYH-kEG1Q2u8e0uf1Bnkc7naC3'],
      memo: '대물 농어', createdAt: '2024-05-20', updatedAt: '2024-05-20', visibility: 'public' as const,
    },
    {
      id: 'demo-2', species: '우럭', sizeCm: undefined, count: 3,
      date: '2024-05-18', location: { name: '충남 당진시', lat: 0, lng: 0 },
      photos: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBg4mjyL5_aVCabZj6iJba_4E1cR2AOZ8_HMjTeDeT0XPN3TxWdleTRh66vrfwxpDb8y9gWX7od6rTK8w6y0y8rqCXpBisP9PYYmN4NV5f8THjVx73RUubdfx156HqHdQ3Q5JxkfXa85GQ_cSzQBDozs5Y8TLxsojP8E0cSUijoNSrMF3IMAK-UgEXV24oyWqIVzeRA_Tix-BTR7P70MGm4AmHCsIKB_YEExTnMo0ucOZs-AdurpmpjKDeZLiFX5_Q4UvEhjHrord0y'],
      memo: '방파제 우럭', createdAt: '2024-05-18', updatedAt: '2024-05-18', visibility: 'public' as const,
    },
    {
      id: 'demo-3', species: '참돔', sizeCm: 45, count: 1,
      date: '2024-05-12', location: { name: '전남 여수시', lat: 0, lng: 0 },
      photos: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBYdD0_vNJSuK0zCFFl9BcxzuzEE_7S1mCMs4SWqFw3NLmzc2NgwNIpJTC3ap4WAOYG22FTxmyTTjXvA-6lwQaAFLqZCWW1D0IA3h77OQGp7289zafURv5-1i51iwp81EDFMlOjs4U2AYhq86BtNtIiz5gRykwo2gM8Z3OHLB5uyWlcrAhOGOotlm-IzFIfdysPJYtZdjeHzRZct_0ILapiqPc-ftkZNk9Gusk_dpjYx3Xvaew10Cgm6LN7rnSF02yUct1IU1Da32fa'],
      memo: '참돔', createdAt: '2024-05-12', updatedAt: '2024-05-12', visibility: 'public' as const,
    },
  ];

  useEffect(() => {
    async function load() {
      const catches = await getDataService().getCatchRecords();
      setRecords(catches);
      setAiProfile(analyzeUserRecords(catches));
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
              const [w, t] = await Promise.all([
                fetchWeather(pos.coords.latitude, pos.coords.longitude),
                fetchTideData(pos.coords.latitude, pos.coords.longitude),
              ]);
              setBiteTime(calculateBiteTime(w, t));
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

  const displayRecords = records.length > 0 ? records : DEMO_RECORDS;
  const isDemo = records.length === 0;
  const totalCatch = isDemo ? 128 : records.reduce((acc, r) => acc + r.count, 0);
  const maxSize = isDemo ? 58 : records.reduce((acc, r) => Math.max(acc, r.sizeCm ?? 0), 0);
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthCatch = isDemo ? 15 : records
    .filter((r) => r.date.startsWith(currentMonthPrefix))
    .reduce((acc, r) => acc + r.count, 0);

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
          <button className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
            <span className="material-symbols-outlined text-slate-500 text-lg">notifications</span>
          </button>
        </div>
      </header>

      {/* ── Hero: 오늘의 낚시 조건 ── */}
      <HeroCard biteTime={biteTime} loading={biteLoading} />

      {/* ── Stat Bar ── */}
      <StatBar totalCatch={totalCatch} thisMonth={thisMonthCatch} maxSize={maxSize} locale={locale} />

      {/* ── AI Concierge Banner ── */}
      <AIInsightBanner profile={aiProfile} locale={locale} />

      {/* ── AI Insights ── */}
      <AIInsightsSection profile={aiProfile} locale={locale} />

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
          {displayRecords.map((r, i) => (
            <CatchMagazineCard key={r.id} record={r} index={i} />
          ))}
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
            {topNews.slice(0, 3).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

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
