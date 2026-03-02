'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord, UserStats } from '@/types';
import { fetchWeather, WeatherData } from '@/services/weatherService';
import { fetchTideData, TideData } from '@/services/tideService';
import { calculateBiteTime, BiteTimePrediction } from '@/services/biteTimeService';
import { fetchTopNews, FishingNewsItem } from '@/services/fishingNewsService';
import { analyzeUserRecords, PersonalInsight, UserFishingProfile } from '@/services/personalizationService';
import { generateRecommendation, ConciergeRecommendation, getInSeasonSpecies } from '@/services/conciergeService';

function StatCard({ label, value, unit, borderClass }: { label: string; value: string | number; unit?: string; borderClass: string }) {
  return (
    <div className={`flex-1 min-w-[110px] glass-card rounded-2xl p-4 shadow-sm ${borderClass}`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-bold text-slate-900 dark:text-white">{value}</span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

function CatchCard({ record, index }: { record: CatchRecord; index: number }) {
  const badgeClasses = [
    'bg-primary/10 text-primary',
    'bg-teal-500/10 text-teal-600',
    'bg-blue-500/10 text-blue-600',
  ];

  return (
    <Link href={`/records/detail?id=${record.id}`} className="flex bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]">
      <div className="size-20 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
        {record.photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.photos[0]} alt={record.species} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-2xl">set_meal</span>
          </div>
        )}
      </div>
      <div className="ml-4 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 ${badgeClasses[index % 3]} text-[10px] font-bold rounded-full`}>
            {record.species}
          </span>
          <span className="text-[11px] text-slate-400">{record.date.replace(/-/g, '.')}</span>
        </div>
        <h4 className="text-base font-bold mt-1 text-slate-900 dark:text-white">
          {record.species} {record.sizeCm ? `${record.sizeCm}cm` : `${record.count}마리`}
        </h4>
        <div className="flex items-center mt-1 text-slate-500 dark:text-slate-400">
          <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
          <span className="text-xs">{record.location.name}</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [biteLoading, setBiteLoading] = useState(true);
  const [topNews, setTopNews] = useState<FishingNewsItem[]>([]);
  const [aiProfile, setAiProfile] = useState<UserFishingProfile | null>(null);
  const [conciergeRec, setConciergeRec] = useState<ConciergeRecommendation | null>(null);
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);

  // Stitch design demo data — shown when localStorage has no real records
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
      // AI Personalization
      const profile = analyzeUserRecords(catches);
      setAiProfile(profile);
    }
    load();
    fetchTopNews().then(setTopNews).catch(console.error);
  }, []);

  // Load BiteTime prediction
  useEffect(() => {
    async function loadBiteTime() {
      setBiteLoading(true);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const [w, t] = await Promise.all([
                fetchWeather(pos.coords.latitude, pos.coords.longitude),
                fetchTideData(pos.coords.latitude, pos.coords.longitude)
              ]);
              const prediction = calculateBiteTime(w, t);
              setBiteTime(prediction);
              setBiteLoading(false);
            },
            () => {
              // No GPS — calculate with null data
              const prediction = calculateBiteTime(null, null);
              setBiteTime(prediction);
              setBiteLoading(false);
            },
            { timeout: 5000, maximumAge: 300000 }
          );
        } else {
          const prediction = calculateBiteTime(null, null);
          setBiteTime(prediction);
          setBiteLoading(false);
        }
      } catch {
        const prediction = calculateBiteTime(null, null);
        setBiteTime(prediction);
        setBiteLoading(false);
      }
    }
    loadBiteTime();
  }, []);

  // Use demo data when no real records exist
  const displayRecords = records.length > 0 ? records : DEMO_RECORDS;
  const isDemo = records.length === 0;

  // Stitch design stat values for demo mode, otherwise compute from real data
  const totalCatch = isDemo ? 128 : records.reduce((acc, r) => acc + r.count, 0);
  const maxSize = isDemo ? 58 : records.reduce((acc, r) => Math.max(acc, r.sizeCm ?? 0), 0);
  
  // Get current YYYY-MM
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthCatch = isDemo ? 15 : records
    .filter((r) => r.date.startsWith(currentMonthPrefix))
    .reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="relative flex min-h-screen w-full flex-col wave-bg overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <span className="material-symbols-outlined text-2xl font-bold">set_meal</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">FishLog</h1>
        </div>
        <button className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
        </button>
      </header>

      {/* Greeting */}
      <section className="px-5 pt-4">
        <h2 className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">
          <span className="text-primary">AI</span>가 분석한 나의 낚시
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {aiProfile && aiProfile.totalDays > 0
            ? `${aiProfile.totalDays}일간의 기록을 AI가 분석했어요`
            : '오늘도 대물을 낚으러 떠나볼까요?'
          }
        </p>
      </section>

      {/* AI Insights */}
      {aiProfile && aiProfile.insights.length > 0 && (
        <section className="px-5 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {locale === 'ko' ? 'AI 인사이트' : 'AI Insights'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {aiProfile.insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 border ${
                  insight.color === 'primary' ? 'bg-primary/5 border-primary/20' :
                  insight.color === 'emerald' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' :
                  insight.color === 'amber' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' :
                  insight.color === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' :
                  'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`material-symbols-outlined text-sm ${
                    insight.color === 'primary' ? 'text-primary' :
                    insight.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                    insight.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                    insight.color === 'red' ? 'text-red-500' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>{insight.icon}</span>
                  {insight.highlight && (
                    <span className={`text-xs font-bold ${
                      insight.color === 'primary' ? 'text-primary' :
                      insight.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      insight.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                      insight.color === 'red' ? 'text-red-500' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>{insight.highlight}</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{insight.title}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">{insight.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Concierge Quick Summary */}
      <section className="px-5 pt-5">
        <Link href="/concierge" className="block">
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-primary via-cyan-400 to-primary bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary">
                  {locale === 'ko' ? 'AI 컨시어지 추천' : 'AI Concierge Pick'}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {inSeasonSpecies.length > 0
                    ? `${new Date().getMonth() + 1}월 시즌: ${inSeasonSpecies.slice(0, 3).map(s => s.name).join(', ')}`
                    : (locale === 'ko' ? '오늘의 추천 포인트를 확인하세요' : 'Check today\'s recommendation')
                  }
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
          </div>
        </Link>
      </section>

      {/* Stats Cards - Horizontal Scroll */}
      <section className="flex gap-3 px-5 pt-6 overflow-x-auto no-scrollbar">
        <StatCard label={locale === 'ko' ? '총 조과' : 'Total Catch'} value={totalCatch} unit={locale === 'ko' ? '마리' : ''} borderClass="border-l-4 border-l-primary" />
        <StatCard label={locale === 'ko' ? '이번 달' : 'This Month'} value={thisMonthCatch} unit={locale === 'ko' ? '마리' : ''} borderClass="border-l-4 border-l-teal-400" />
        <StatCard label={locale === 'ko' ? '최대 사이즈' : 'Max Size'} value={maxSize || '-'} unit="cm" borderClass="border-l-4 border-l-blue-400" />
      </section>

      {/* BiteTime Prediction Card */}
      <section className="px-5 pt-6">
        <div className="glass-card rounded-2xl p-5 shadow-sm overflow-hidden relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">phishing</span>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {locale === 'ko' ? '오늘의 입질 예측' : "Today's Bite Forecast"}
            </h3>
          </div>
          {biteLoading ? (
            <div className="flex items-center justify-center py-6">
              <span className="animate-spin material-symbols-outlined text-primary">progress_activity</span>
              <span className="ml-2 text-sm text-slate-400">{locale === 'ko' ? '분석 중...' : 'Analyzing...'}</span>
            </div>
          ) : biteTime ? (
            <div className="flex items-center gap-5">
              {/* Circular gauge */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-700" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${biteTime.score * 2.64} 264`}
                    className={biteTime.score >= 75 ? 'text-emerald-500' : biteTime.score >= 55 ? 'text-blue-500' : biteTime.score >= 35 ? 'text-amber-500' : 'text-red-400'}
                    stroke="currentColor"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{biteTime.score}</span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
              </div>
              {/* Factors */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-lg">{biteTime.gradeEmoji}</span>
                  <span className={`text-sm font-bold ${
                    biteTime.grade === 'excellent' ? 'text-emerald-600 dark:text-emerald-400' :
                    biteTime.grade === 'good' ? 'text-blue-600 dark:text-blue-400' :
                    biteTime.grade === 'fair' ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-500'
                  }`}>{biteTime.gradeLabel}</span>
                </div>
                {biteTime.factors.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-xs">
                    <span className={`material-symbols-outlined text-sm ${
                      f.status === 'positive' ? 'text-emerald-500' :
                      f.status === 'negative' ? 'text-red-400' : 'text-slate-400'
                    }`}>{f.icon}</span>
                    <span className="text-slate-500 dark:text-slate-400 w-10">{f.name}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          f.status === 'positive' ? 'bg-emerald-400' :
                          f.status === 'negative' ? 'bg-red-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${(f.score / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 🔥 Realtime Fishing News */}
      {topNews.length > 0 && (
        <section className="px-5 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              실시간 조과 소식
            </h3>
            <Link href="/news" className="text-sm font-medium text-primary flex items-center">
              전체보기
              <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
            </Link>
          </div>
          <div className="space-y-3">
            {topNews.map(item => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-2xl p-3.5 flex gap-3 hover:scale-[1.01] transition-transform"
              >
                {item.thumbnail && (
                  <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.freshness === 'realtime' ? 'bg-red-500' :
                      item.freshness === 'today' ? 'bg-amber-400' : 'bg-slate-300'
                    }`} />
                    <span className="text-[10px] text-slate-500 font-medium">{item.sourceLabel}</span>
                    {item.species && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-accent/10 text-teal-600 dark:text-teal-accent font-medium">
                        🐟 {item.species}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Recent Catches */}
      <section className="px-5 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{locale === 'ko' ? '최근 조과' : 'Recent Catches'}</h3>
          <Link href="/records" className="text-sm font-medium text-primary flex items-center">
            {locale === 'ko' ? '전체보기' : 'View All'}
            <span className="material-symbols-outlined text-sm ml-0.5">chevron_right</span>
          </Link>
        </div>
        <div className="space-y-3">
          {displayRecords.map((r, i) => <CatchCard key={r.id} record={r} index={i} />)}
        </div>
      </section>

      {/* Floating Add Button */}
      <Link
        href="/record"
        className="fixed bottom-24 right-6 z-40 size-14 rounded-full bg-gradient-to-tr from-primary to-cyan-400 text-white shadow-lg shadow-primary/40 flex items-center justify-center fab-pulse hover:scale-110 transition-transform"
        aria-label="새 기록 추가"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </Link>
    </div>
  );
}
