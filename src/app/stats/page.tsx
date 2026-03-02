'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord, UserStats, PeriodFilter } from '@/types';
import { computeBadges, AchievementBadge } from '@/services/badgeService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#1392ec', '#2dd4bf', '#22c55e', '#a855f7', '#f59e0b', '#ec4899'];

// Dynamic import for Leaflet (SSR not supported)
const FishingMap = dynamic(() => import('@/components/FishingMap'), { ssr: false });

const PERIOD_TABS: { value: PeriodFilter; ko: string; en: string }[] = [
  { value: 'week', ko: '1주', en: '1W' },
  { value: 'month', ko: '1개월', en: '1M' },
  { value: '3months', ko: '3개월', en: '3M' },
  { value: 'all', ko: '전체', en: 'All' },
];

function MiniStatCard({ icon, label, value, unit }: { icon: string; label: string; value: number | string; unit: string }) {
  return (
    <div className="glass-card flex flex-col gap-1 rounded-xl p-4 shadow-sm border border-primary/5">
      <p className="text-slate-500 text-xs font-medium">{label}</p>
      <p className="text-slate-900 dark:text-slate-100 text-xl font-bold">
        {value}
        <span className="text-sm ml-0.5 font-normal text-slate-500">{unit}</span>
      </p>
      <span className="material-symbols-outlined text-primary text-base">{icon}</span>
    </div>
  );
}

// ===== Calendar Component =====
function CalendarView({ records, locale }: { records: CatchRecord[]; locale: string }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, days, firstDay, dateMap } = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = new Date(y, m, 1).getDay();

    // Map: "YYYY-MM-DD" → total catch count
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = r.date;
      map.set(key, (map.get(key) ?? 0) + r.count);
    });

    return {
      year: y,
      month: m,
      days: daysInMonth,
      firstDay: firstDayOfWeek,
      dateMap: map,
    };
  }, [records, monthOffset]);

  const dayLabels = locale === 'ko'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const monthLabel = locale === 'ko'
    ? `${year}년 ${month + 1}월`
    : new Date(year, month).toLocaleDateString('en', { year: 'numeric', month: 'long' });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="glass-card rounded-xl p-4 border border-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset((p) => p - 1)} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <span className="material-symbols-outlined text-lg text-slate-500">chevron_left</span>
        </button>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{monthLabel}</h4>
        <button onClick={() => setMonthOffset((p) => Math.min(p + 1, 0))} disabled={monthOffset >= 0} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">
          <span className="material-symbols-outlined text-lg text-slate-500">chevron_right</span>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div key={i} className={`text-center text-[10px] font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first day offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const catchCount = dateMap.get(dateStr) ?? 0;
          const isToday = dateStr === today;

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                isToday ? 'ring-2 ring-primary' : ''
              } ${catchCount > 0 ? 'bg-primary/10' : ''}`}
            >
              <span className={`font-medium ${isToday ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
              {catchCount > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(catchCount, 3) }).map((_, j) => (
                    <div key={j} className="size-1 rounded-full bg-primary" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><div className="size-2 rounded-full bg-primary" /> {locale === 'ko' ? '출조일' : 'Fishing day'}</span>
        <span className="flex items-center gap-1"><div className="size-2 rounded-full ring-2 ring-primary" /> {locale === 'ko' ? '오늘' : 'Today'}</span>
      </div>
    </div>
  );
}

// ===== Badge Component =====
function BadgeCard({ badge, locale }: { badge: AchievementBadge; locale: string }) {
  return (
    <div className={`glass-card rounded-xl p-3 border transition-all ${badge.earned ? 'border-primary/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg flex items-center justify-center ${badge.earned ? 'bg-gradient-to-tr from-primary to-cyan-400 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
          <span className="material-symbols-outlined text-lg">{badge.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {locale === 'ko' ? badge.name.ko : badge.name.en}
          </h4>
          <p className="text-[10px] text-slate-400 truncate">
            {locale === 'ko' ? badge.description.ko : badge.description.en}
          </p>
        </div>
        {badge.earned ? (
          <span className="material-symbols-outlined text-primary text-xl">verified</span>
        ) : (
          <span className="text-[10px] font-bold text-slate-400">{Math.round(badge.progress * 100)}%</span>
        )}
      </div>
      {/* Progress bar */}
      {!badge.earned && (
        <div className="mt-2 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all" style={{ width: `${badge.progress * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'calendar' | 'map' | 'badges'>('stats');

  const loadStats = useCallback(async (p: PeriodFilter) => {
    const s = await getDataService().getUserStats(p);
    setStats(s);
  }, []);

  useEffect(() => {
    loadStats(period);
    getDataService().getCatchRecords().then((r) => {
      setRecords(r);
      setBadges(computeBadges(r));
    });
  }, [period, loadStats]);

  const earnedCount = badges.filter((b) => b.earned).length;

  const tabs = [
    { key: 'stats' as const, icon: 'bar_chart', label: locale === 'ko' ? '통계' : 'Stats' },
    { key: 'map' as const, icon: 'map', label: locale === 'ko' ? '지도' : 'Map' },
    { key: 'calendar' as const, icon: 'calendar_month', label: locale === 'ko' ? '캘린더' : 'Calendar' },
    { key: 'badges' as const, icon: 'military_tech', label: locale === 'ko' ? `배지 ${earnedCount}/${badges.length}` : `Badges ${earnedCount}/${badges.length}` },
  ];

  if (!stats) return null;

  return (
    <div className="page-enter relative z-10 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-primary/10">
        <div className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full" />
        <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">
          {t('stats.title')}
          <span className="material-symbols-outlined text-primary ml-1 align-middle text-base">bar_chart</span>
        </h1>
        <div className="flex w-10 items-center justify-end" />
      </header>

      {/* Tab bar */}
      <div className="px-4 pt-3">
        <div className="flex h-10 items-center rounded-xl bg-slate-200/50 dark:bg-slate-800/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex cursor-pointer h-full grow items-center justify-center gap-1.5 overflow-hidden rounded-lg px-2 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                  : 'text-slate-500'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'stats' && (
          <>
            {/* Period filter */}
            <div className="px-4 py-3">
              <div className="flex h-9 items-center justify-center rounded-xl bg-slate-200/50 dark:bg-slate-800/50 p-1">
                {PERIOD_TABS.map((tab) => (
                  <label key={tab.value} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-semibold transition-all ${
                    period === tab.value
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                      : 'text-slate-500'
                  }`}>
                    <span className="truncate">{locale === 'ko' ? tab.ko : tab.en}</span>
                    <input className="hidden" name="period" type="radio" value={tab.value} checked={period === tab.value} onChange={() => setPeriod(tab.value)} />
                  </label>
                ))}
              </div>
            </div>

            {/* 2x2 stat grid */}
            <section className="grid grid-cols-2 gap-3 px-4 py-2">
              <MiniStatCard icon="calendar_month" label={t('stats.totalTrips')} value={stats.totalTrips} unit={t('stats.unit.trips')} />
              <MiniStatCard icon="set_meal" label={t('stats.totalCatch')} value={stats.totalCatch} unit={t('stats.unit.fish')} />
              <MiniStatCard icon="bar_chart" label={t('stats.avgCatch')} value={stats.avgCatchPerTrip} unit={t('stats.unit.fishPerTrip')} />
              <MiniStatCard icon="straighten" label={t('stats.maxSize')} value={stats.maxSizeCm} unit={t('stats.unit.cm')} />
            </section>

            {/* Monthly trend chart */}
            <section className="mt-6 px-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3 flex items-center gap-2">
                {t('stats.monthlyTrend')}
                <span className="material-symbols-outlined text-primary text-base">trending_up</span>
              </h3>
              <div className="glass-card p-4 rounded-xl border border-primary/5 h-48">
                {stats.monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                      <Bar dataKey="count" name={locale === 'ko' ? '마릿수' : 'Count'} radius={[6, 6, 0, 0]}>
                        {stats.monthlyTrend.map((_, index) => (
                          <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1392ec" />
                          <stop offset="100%" stopColor="#2dd4bf" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-400 py-8">{t('stats.noData')}</p>
                )}
              </div>
            </section>

            {/* Species donut */}
            <section className="mt-8 px-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3 flex items-center gap-2">
                {t('stats.speciesRatio')}
                <span className="material-symbols-outlined text-primary text-base">donut_large</span>
              </h3>
              <div className="glass-card p-4 rounded-xl border border-primary/5">
                {stats.speciesBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.speciesBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="species" paddingAngle={3} strokeWidth={0}>
                        {stats.speciesBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={(value: string) => <span style={{ fontSize: '12px', color: '#64748b' }}>{value}</span>} />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [`${value}${locale === 'ko' ? '마리' : ''}`, name]}
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-slate-400 py-8">{t('stats.noData')}</p>
                )}
              </div>
            </section>

            {/* Top spots */}
            <section className="mt-8 px-4 mb-8">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3 flex items-center gap-2">
                {t('stats.topSpots')}
                <span className="material-symbols-outlined text-primary text-base">location_on</span>
              </h3>
              <div className="space-y-3">
                {stats.topSpots.length > 0 ? (
                  stats.topSpots.map((spot, i) => (
                    <div key={spot.spot.name} className="glass-card rounded-xl p-3 border border-primary/5 flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {i === 0 ? <span className="material-symbols-outlined">emoji_events</span> : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                          <h4 className="text-sm font-bold">{spot.spot.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {spot.visits}{t('stats.visits')} · {spot.totalCatch}{t('stats.caught')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-4">{t('stats.noData')}</p>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'calendar' && (
          <section className="px-4 py-4">
            <CalendarView records={records} locale={locale} />
            {/* Recent trips from calendar */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-sm">history</span>
                {locale === 'ko' ? '최근 출조' : 'Recent Trips'}
              </h3>
              <div className="space-y-2">
                {records.slice(0, 5).map((r) => (
                  <Link key={r.id} href={`/records/detail?id=${r.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">set_meal</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{r.species} {r.sizeCm ? `${r.sizeCm}cm` : `${r.count}${locale === 'ko' ? '마리' : ''}`}</p>
                      <p className="text-[10px] text-slate-400">{r.date} · {r.location.name}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'map' && (
          <section className="px-4 py-4">
            <FishingMap records={records} locale={locale} height="400px" />
          </section>
        )}

        {activeTab === 'badges' && (
          <section className="px-4 py-4">
            {/* Summary */}
            <div className="glass-card rounded-xl p-4 border border-primary/5 mb-4 text-center">
              <div className="text-3xl font-black text-primary">{earnedCount}<span className="text-lg text-slate-400">/{badges.length}</span></div>
              <p className="text-xs text-slate-500 mt-1">{locale === 'ko' ? '달성한 배지' : 'Badges Earned'}</p>
            </div>
            {/* Badge grid */}
            <div className="space-y-3">
              {badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
