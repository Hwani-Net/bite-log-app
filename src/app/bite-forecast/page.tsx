'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { fetchTideData } from '@/services/tideService';
import { fetchWeather } from '@/services/weatherService';
import { calculateBiteTime, BiteTimePrediction, BiteFactor } from '@/services/biteTimeService';
import { TideData, getCurrentPhase, TidePhase } from '@/services/tideService';
import { WeatherData } from '@/services/weatherService';

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? '#22c55e' :
    score >= 55 ? '#3b82f6' :
    score >= 35 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#e2e8f0" strokeWidth="10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-slate-900">{score}</span>
        <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ─── Factor Card ──────────────────────────────────────────────────────────────
function FactorCard({ factor }: { factor: BiteFactor }) {
  const statusStyles = {
    positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    neutral: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', bar: 'bg-amber-500' },
    negative: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-500', bar: 'bg-red-500' },
  };
  const s = statusStyles[factor.status];

  return (
    <div className={`rounded-2xl p-4 border ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
          <span className={`material-symbols-outlined text-lg ${s.text}`}>{factor.icon}</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-800">{factor.name}</p>
          <p className="text-[10px] text-slate-500">{factor.description}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-black ${s.text}`}>{factor.score}</span>
          <span className="text-[10px] text-slate-400">/25</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-white rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${s.bar} transition-all duration-700 ease-out`}
          style={{ width: `${(factor.score / 25) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Tide Timeline ────────────────────────────────────────────────────────────
function TideTimeline({ tideData, phase }: { tideData: TideData; phase: TidePhase | null }) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const totalMinutes = 24 * 60;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-cyan-500 text-base">waves</span>
        <h3 className="text-sm font-bold text-slate-800">조석 시간표</h3>
        <span className="text-[10px] text-slate-400 ml-auto">{tideData.stationName}</span>
      </div>

      {/* Current phase banner */}
      {phase && (
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{phase.emoji}</span>
            <div>
              <p className="text-xs font-bold text-white">{phase.label}</p>
              <p className="text-[10px] text-white/70">{phase.strengthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${phase.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-white/80 font-bold">{Math.round(phase.percent)}%</span>
          </div>
        </div>
      )}

      {/* Timeline visual */}
      <div className="relative h-16 bg-slate-50 rounded-xl overflow-hidden mb-3">
        {/* Time ruler */}
        {[0, 6, 12, 18].map(h => (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-dashed border-slate-200"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            <span className="absolute -top-0.5 -translate-x-1/2 text-[8px] text-slate-400 font-medium bg-slate-50 px-0.5">
              {h}시
            </span>
          </div>
        ))}

        {/* Tide markers */}
        {tideData.tides.map((tide, i) => {
          const [hh, mm] = tide.time.split(':').map(Number);
          const tideMinutes = hh * 60 + mm;
          const leftPercent = (tideMinutes / totalMinutes) * 100;
          const isHigh = tide.type === 'High';

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${leftPercent}%`, bottom: isHigh ? '50%' : '0%' }}
            >
              <div className={`w-3 h-3 rounded-full border-2 ${isHigh ? 'bg-cyan-500 border-cyan-300' : 'bg-blue-800 border-blue-600'}`} />
              <div className="text-center mt-0.5">
                <p className="text-[8px] font-bold text-slate-700">{tide.time}</p>
                <p className={`text-[7px] font-bold ${isHigh ? 'text-cyan-600' : 'text-blue-700'}`}>
                  {isHigh ? '만조' : '간조'}
                </p>
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
          style={{ left: `${(currentMinutes / totalMinutes) * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Tide table */}
      <div className="grid grid-cols-2 gap-2">
        {tideData.tides.map((tide, i) => {
          const isHigh = tide.type === 'High';
          return (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isHigh ? 'bg-cyan-50' : 'bg-blue-50'}`}>
              <span className={`text-sm ${isHigh ? 'text-cyan-600' : 'text-blue-700'}`}>
                {isHigh ? '🔵' : '🔷'}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isHigh ? '만조' : '간조'} {tide.time}
                </p>
                <p className="text-[10px] text-slate-500">{tide.level}cm</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weather Detail Section ───────────────────────────────────────────────────
function WeatherDetail({ weather }: { weather: WeatherData }) {
  const items = [
    { label: '기온', value: `${weather.tempC}°C`, icon: 'thermostat', color: weather.tempC > 20 ? 'text-orange-500' : weather.tempC < 5 ? 'text-blue-500' : 'text-emerald-500' },
    { label: '바람', value: `${weather.windSpeed}m/s`, icon: 'air', color: (weather.windSpeed ?? 0) > 10 ? 'text-red-500' : 'text-cyan-500' },
    { label: '습도', value: `${weather.humidity}%`, icon: 'humidity_percentage', color: 'text-blue-500' },
    { label: '날씨', value: weather.conditionKo, icon: weather.icon, color: 'text-amber-500' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-amber-500 text-base">partly_cloudy_day</span>
        <h3 className="text-sm font-bold text-slate-800">날씨 상세</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
            <span className={`material-symbols-outlined text-xl ${item.color}`}>{item.icon}</span>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{item.label}</p>
              <p className="text-sm font-bold text-slate-800">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fishing Tips ─────────────────────────────────────────────────────────────
function FishingTips({ biteTime }: { biteTime: BiteTimePrediction }) {
  const tips: string[] = [];

  // Generate tips based on factors
  for (const f of biteTime.factors) {
    if (f.name === '시간대' && f.score >= 20) {
      tips.push('🌅 지금은 매직아워! 톱워터 루어나 생미끼로 공략하세요.');
    }
    if (f.name.includes('물') && f.status === 'positive') {
      tips.push('🌊 물 세기가 좋습니다. 채비가 자연스럽게 흘러 입질 확률 UP!');
    }
    if (f.name === '바람' && f.status === 'negative') {
      tips.push('💨 바람이 강합니다. 무거운 채비로 교체하고 안전 장비를 확인하세요.');
    }
    if (f.name === '기온' && f.status === 'negative') {
      tips.push('🌡️ 수온이 낮습니다. 바닥층을 공략하고 느린 액션을 추천합니다.');
    }
    if (f.name === '기온' && f.score >= 18) {
      tips.push('☀️ 수온이 적절합니다. 중층~상층까지 폭넓게 공략해보세요.');
    }
  }

  if (biteTime.score < 35) {
    tips.push('⚠️ 전반적으로 어려운 조건입니다. 인내심을 갖고 임하세요.');
  }

  if (tips.length === 0) {
    tips.push('🎣 보통의 조건입니다. 포인트 선정에 집중하세요!');
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-base">lightbulb</span>
        <h3 className="text-sm font-bold text-slate-800">오늘의 낚시 팁</h3>
      </div>
      <div className="space-y-2">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-700 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BiteForecastPage() {
  const locale = useAppStore((s) => s.locale);
  const isKo = locale === 'ko';

  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('현재 위치');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const [w, t] = await Promise.all([
                fetchWeather(lat, lng),
                fetchTideData(lat, lng),
              ]);
              setWeather(w);
              setTideData(t);
              setBiteTime(calculateBiteTime(w, t));
              if (t) setLocationName(t.stationName || '현재 위치');
              setLoading(false);
            },
            () => {
              // No location permission — use default
              setWeather(null);
              setTideData(null);
              setBiteTime(calculateBiteTime(null, null));
              setLoading(false);
            },
            { timeout: 8000, maximumAge: 300000 }
          );
        } else {
          setBiteTime(calculateBiteTime(null, null));
          setLoading(false);
        }
      } catch {
        setBiteTime(calculateBiteTime(null, null));
        setLoading(false);
      }
    }
    load();
  }, []);

  const phase = tideData ? getCurrentPhase(tideData) : null;
  const now = new Date();
  const hour = now.getHours();
  const timeLabel =
    hour >= 4 && hour < 9 ? '🌅 아침' :
    hour >= 9 && hour < 17 ? '☀️ 낮' :
    hour >= 17 && hour < 20 ? '🌇 저녁' : '🌙 밤';

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-slate-50 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-slate-50 sticky top-0 z-30 backdrop-blur-md">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100"
        >
          <span className="material-symbols-outlined text-slate-500">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-base font-bold text-slate-900">
            {isKo ? '입질 예측 상세' : 'Bite Forecast Detail'}
          </h1>
          <p className="text-[10px] text-slate-400">{locationName} · {timeLabel}</p>
        </div>
      </header>

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-slate-500">위치 기반 데이터 분석 중...</p>
          </div>
        </div>
      ) : biteTime ? (
        <div className="space-y-4 px-4 pt-4">
          {/* ── Score Hero ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-6">
              <ScoreRing score={biteTime.score} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{biteTime.gradeEmoji}</span>
                  <span className="text-lg font-bold text-slate-900">{biteTime.gradeLabel}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  4가지 요소를 종합 분석한 결과입니다
                </p>
                {/* Mini factor tags */}
                <div className="flex flex-wrap gap-1.5">
                  {biteTime.factors.map((f) => {
                    const dotColor =
                      f.status === 'positive' ? 'bg-emerald-500' :
                      f.status === 'negative' ? 'bg-red-500' : 'bg-amber-500';
                    return (
                      <span key={f.name} className="flex items-center gap-1 bg-slate-100 rounded-full px-2 py-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        <span className="text-[10px] font-medium text-slate-600">{f.name}</span>
                        <span className="text-[10px] font-bold text-slate-800">{f.score}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Factor Detail Cards ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-base">analytics</span>
              <h2 className="text-sm font-bold text-slate-800">
                {isKo ? '요소별 상세 분석' : 'Factor Analysis'}
              </h2>
            </div>
            <div className="space-y-2.5">
              {biteTime.factors.map((f) => (
                <FactorCard key={f.name} factor={f} />
              ))}
            </div>
          </div>

          {/* ── Tide Timeline ── */}
          {tideData && tideData.tides.length > 0 && (
            <TideTimeline tideData={tideData} phase={phase} />
          )}

          {/* ── Weather Detail ── */}
          {weather && <WeatherDetail weather={weather} />}

          {/* ── Fishing Tips ── */}
          <FishingTips biteTime={biteTime} />

          {/* ── Windy Link ── */}
          <Link href="/weather" className="block">
            <div className="bg-gradient-to-r from-sky-500 to-cyan-400 rounded-2xl p-4 flex items-center gap-3 shadow-md">
              <span className="text-2xl">🛰️</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">
                  {isKo ? '위성 날씨 지도 보기' : 'View Satellite Weather'}
                </p>
                <p className="text-[10px] text-white/70">
                  7일 출항 날씨 · Windy.com
                </p>
              </div>
              <span className="material-symbols-outlined text-white/80">chevron_right</span>
            </div>
          </Link>

          {/* ── Data source ── */}
          <p className="text-[10px] text-slate-400 text-center pb-4">
            {isKo
              ? '※ 물때: KHOA 바다누리, 날씨: Open-Meteo. 실제 조과는 다를 수 있습니다.'
              : '※ Tide data: KHOA, Weather: Open-Meteo. Actual results may vary.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <span className="text-4xl">📍</span>
            <p className="text-sm font-bold text-slate-700 mt-2">위치 정보가 필요합니다</p>
            <p className="text-xs text-slate-500 mt-1">브라우저 위치 권한을 허용해주세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
