'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { fetchWeather, WeatherData } from '@/services/weatherService';
import { fetchTideData, TideData } from '@/services/tideService';
import { calculateBiteTime, BiteTimePrediction } from '@/services/biteTimeService';
import {
  generateRecommendation,
  ConciergeRecommendation,
  getInSeasonSpecies,
  GearItem,
} from '@/services/conciergeService';
import { getGearRecommendations, trackAffiliateClick, GearRecommendation } from '@/services/affiliateService';

export default function ConciergePage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [recommendation, setRecommendation] = useState<ConciergeRecommendation | null>(null);
  const [affiliateGear, setAffiliateGear] = useState<GearRecommendation[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // In-season species (static for current month)
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!navigator.geolocation) {
          finalize(null, null, 37.5665, 126.9780); // default: Seoul
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserCoords({ lat, lng });

            const [w, td] = await Promise.all([
              fetchWeather(lat, lng),
              fetchTideData(lat, lng),
            ]);
            setWeather(w);
            setTideData(td);
            finalize(w, td, lat, lng);
          },
          () => finalize(null, null, 37.5665, 126.9780),
          { timeout: 5000, maximumAge: 300000 }
        );
      } catch {
        finalize(null, null, 37.5665, 126.9780);
      }
    }

    function finalize(w: WeatherData | null, td: TideData | null, lat: number, lng: number) {
      const bt = calculateBiteTime(w, td);
      setBiteTime(bt);
      const rec = generateRecommendation(w, td, bt, lat, lng);
      setRecommendation(rec);
      // Load affiliate gear based on recommended species
      if (rec) {
        const gear = getGearRecommendations(rec.species.name);
        setAffiliateGear(gear);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const biteScore = biteTime?.score ?? 0;

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden pb-24 page-enter">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {locale === 'ko' ? 'AI 컨시어지' : 'AI Concierge'}
          </h1>
        </div>
        <button className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
        </button>
      </header>

      <main className="flex-1 px-5">
        {/* AI Greeting Card */}
        <section className="mt-4">
          <div className="rounded-2xl p-[1px] bg-gradient-to-br from-primary to-cyan-400">
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {locale === 'ko' ? '안녕하세요, 대표님!' : 'Hello!'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                  {loading
                    ? (locale === 'ko' ? '낚시 컨디션 분석 중...' : 'Analyzing conditions...')
                    : recommendation?.reasoning
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* In-Season Species Chips */}
        {inSeasonSpecies.length > 0 && (
          <section className="mt-5">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              {locale === 'ko' ? `📅 ${new Date().getMonth() + 1}월 시즌 어종` : `📅 ${new Date().toLocaleString('en', { month: 'long' })} Season`}
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {inSeasonSpecies.map((sp) => (
                <span
                  key={sp.name}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                >
                  {sp.image ? (
                    <img src={sp.image} alt={sp.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    sp.emoji
                  )} {sp.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Today's Recommendation */}
        <section className="mt-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            🎯 {locale === 'ko' ? '오늘의 추천' : "Today's Pick"}
          </h3>
          {loading ? (
            <SkeletonCard />
          ) : recommendation ? (
            <div className="glass-card rounded-2xl p-4 shadow-sm">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center overflow-hidden shrink-0">
                  {recommendation.species.image ? (
                    <img src={recommendation.species.image} alt={recommendation.species.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{recommendation.species.emoji}</span>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-primary mb-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="text-xs font-semibold">{recommendation.spot.name}</span>
                    </div>
                    <p className="font-bold text-base text-slate-900 dark:text-white">
                      {recommendation.species.name} {locale === 'ko' ? '히트 포인트' : 'Hot Spot'} {recommendation.species.emoji}
                    </p>
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500 font-medium mt-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{recommendation.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">directions_car</span>
                      <span>
                        {recommendation.travelMinutes < 60
                          ? `${recommendation.travelMinutes}분`
                          : `${Math.floor(recommendation.travelMinutes / 60)}시간 ${recommendation.travelMinutes % 60}분`
                        }
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      recommendation.species.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-600' :
                      recommendation.species.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {recommendation.species.difficulty === 'beginner' ? (locale === 'ko' ? '초급' : 'Easy')
                        : recommendation.species.difficulty === 'intermediate' ? (locale === 'ko' ? '중급' : 'Mid')
                        : (locale === 'ko' ? '고급' : 'Pro')
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              {recommendation.tips.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {recommendation.tips.map((tip, i) => (
                    <p key={i} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Weather & Tide Analysis */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              🌊 {locale === 'ko' ? '날씨 & 조수 분석' : 'Weather & Tide'}
            </h3>
            {biteTime && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                biteScore >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                biteScore >= 55 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                biteScore >= 35 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {locale === 'ko' ? `입질 확률: ${biteScore}%` : `Bite: ${biteScore}%`}
              </span>
            )}
          </div>

          {/* Stat boxes */}
          <div className="grid grid-cols-3 gap-3">
            <WeatherStatBox
              icon="thermostat"
              label={locale === 'ko' ? '기온' : 'Temp'}
              value={loading ? '—' : weather?.tempC != null ? `${weather.tempC}°C` : '—'}
            />
            <WeatherStatBox
              icon="air"
              label={locale === 'ko' ? '풍속' : 'Wind'}
              value={loading ? '—' : weather?.windSpeed != null ? `${weather.windSpeed}m/s` : '—'}
            />
            <WeatherStatBox
              icon={weather?.icon ?? 'cloud'}
              label={locale === 'ko' ? (weather?.conditionKo ?? '날씨') : (weather?.conditionEn ?? 'Weather')}
              value={loading ? '—' : weather?.humidity != null ? `${weather.humidity}%` : '—'}
            />
          </div>

          {/* Tide bar chart */}
          {tideData && tideData.tides.length > 0 && (
            <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-slate-400">
                  <span className="material-symbols-outlined text-[10px] text-slate-400">location_on</span> {tideData.stationName}
                </p>
              </div>
              <div className="flex items-end justify-between gap-2 h-16">
                {tideData.tides.map((tide, i) => {
                  const maxLevel = Math.max(...tideData.tides.map(t => t.level));
                  const pct = maxLevel > 0 ? (tide.level / maxLevel) * 100 : 50;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[9px] font-bold ${tide.type === 'High' ? 'text-primary' : 'text-slate-400'}`}>
                        {tide.type === 'High' ? '만' : '간'}
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          tide.type === 'High' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        style={{ height: `${pct}%`, minHeight: '8px', opacity: 0.3 + (pct / 100) * 0.7 }}
                      />
                      <span className="text-[9px] text-slate-500">{tide.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bite factors */}
          {biteTime && (
            <div className="mt-4 space-y-2">
              {biteTime.factors.map((f) => (
                <div key={f.name} className="flex items-center gap-2 text-xs">
                  <span className={`material-symbols-outlined text-sm ${
                    f.status === 'positive' ? 'text-emerald-500' :
                    f.status === 'negative' ? 'text-red-400' : 'text-slate-400'
                  }`}>{f.icon}</span>
                  <span className="text-slate-500 dark:text-slate-400 w-10">{f.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        f.status === 'positive' ? 'bg-emerald-400' :
                        f.status === 'negative' ? 'bg-red-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${(f.score / 25) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{f.score}/25</span>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-lg">{biteTime.gradeEmoji}</span>
                <span className={`text-sm font-bold ${
                  biteTime.grade === 'excellent' ? 'text-emerald-600 dark:text-emerald-400' :
                  biteTime.grade === 'good' ? 'text-blue-600 dark:text-blue-400' :
                  biteTime.grade === 'fair' ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-500'
                }`}>{biteTime.gradeLabel}</span>
              </div>
            </div>
          )}
        </section>

        {/* Recommended Gear — Coupang Partners */}
        <section className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-slate-400">shopping_bag</span>
            {locale === 'ko' ? '추천 장비' : 'Recommended Gear'}
          </h3>
          <div className="space-y-2">
            {affiliateGear.map((gear) => (
              <a
                key={gear.id}
                href={gear.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAffiliateClick(gear.id, gear.species)}
                className="glass-card rounded-xl p-3 flex items-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                {gear.image ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gear.image} alt={gear.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <span className="text-2xl w-12 text-center shrink-0">{gear.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{gear.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{gear.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{gear.priceRange}</p>
                  <p className="text-[9px] text-slate-400 flex items-center gap-0.5 justify-end">
                    {locale === 'ko' ? '쿠팡에서 보기' : 'View on Coupang'}
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </p>
                </div>
              </a>
            ))}
          </div>
          <p className="text-[8px] text-slate-300 dark:text-slate-600 mt-2 text-center">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다
          </p>
          {/* Coupang Search Widget */}
          <div className="mt-4 glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-400 mb-2 text-center">
              🔍 {locale === 'ko' ? '원하는 낚시 장비를 쿠팡에서 직접 검색하세요' : 'Search fishing gear on Coupang'}
            </p>
            <iframe
              src="https://coupa.ng/clLNxm"
              width="100%"
              height="36"
              frameBorder="0"
              scrolling="no"
              referrerPolicy="unsafe-url"
              style={{ borderRadius: '8px' }}
            />
          </div>
        </section>
      </main>

      {/* Quick Action Buttons */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 flex gap-2 justify-center pointer-events-none z-30">
        <button className="pointer-events-auto bg-primary text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-primary/30 flex items-center gap-1 hover:scale-105 transition-transform active:scale-95">
          <span className="material-symbols-outlined text-sm">explore</span>
          {locale === 'ko' ? '포인트 추천' : 'Spot Finder'}
        </button>
        <a href="/trip-plan" className="pointer-events-auto bg-orange-500 hover:bg-orange-400 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-orange-500/30 flex items-center gap-1 hover:scale-105 transition-transform active:scale-95">
          <span className="material-symbols-outlined text-sm">checklist</span>
          {locale === 'ko' ? '출조 준비' : 'Trip Plan'}
        </a>
        <button className="pointer-events-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:scale-105 transition-transform active:scale-95">
          <span className="material-symbols-outlined text-sm">description</span>
          {locale === 'ko' ? '조황 리포트' : 'Report'}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function WeatherStatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
      <span className="material-symbols-outlined text-primary mb-1">{icon}</span>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="font-bold text-sm text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function GearCard({ gear, locale }: { gear: GearItem; locale: string }) {
  return (
    <div className="min-w-[140px] flex flex-col gap-2">
      <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gear.image}
          alt={gear.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {gear.trending && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
            {locale === 'ko' ? '추천' : 'Pick'}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium line-clamp-1 text-slate-900 dark:text-white">{gear.name}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">₩{gear.price.toLocaleString()}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}
