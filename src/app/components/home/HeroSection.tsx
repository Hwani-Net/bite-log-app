'use client';

import Link from 'next/link';
import { BiteTimePrediction } from '@/services/biteTimeService';

interface HeroSectionProps {
  biteTime: BiteTimePrediction | null;
  loading: boolean;
}

export default function HeroSection({ biteTime, loading }: HeroSectionProps) {
  const score = biteTime?.score ?? 0;
  const scoreColor = score >= 75 ? '#22c55e' : score >= 55 ? '#3b82f6' : score >= 35 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 54; // r=54
  const dashOffset = circumference - (score / 100) * circumference;

  const hour = new Date().getHours();
  const timeLabel =
    hour >= 5 && hour < 9 ? '🌅 아침' :
    hour >= 9 && hour < 17 ? '☀️ 낮' :
    hour >= 17 && hour < 20 ? '🌇 저녁' : '🌙 밤';

  return (
    <Link href="/bite-forecast" className="block">
      <section className="relative mx-4 mt-2 rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.15),transparent_60%)]" />

        <div className="relative px-5 pt-6 pb-5">
          {/* Score Gauge */}
          <div className="flex justify-center mb-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                {!loading && (
                  <circle
                    cx="60" cy="60" r="54" fill="none"
                    strokeWidth="8" strokeLinecap="round"
                    stroke={scoreColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-1000"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-blue-300">입질 지수</span>
                {loading ? (
                  <div className="h-10 w-14 bg-white/10 rounded-lg animate-pulse mt-1" />
                ) : (
                  <>
                    <span className="text-4xl font-black text-white leading-none">{score}</span>
                    <span className="text-[10px] text-white/50 mt-0.5">/100</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Weather Pills */}
          <div className="flex justify-center gap-2 mb-3">
            {biteTime?.factors?.slice(0, 3).map((f) => (
              <span key={f.name} className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="material-symbols-outlined text-xs text-white/70">{f.icon}</span>
                <span className="text-xs text-white/80 font-medium">{f.name}</span>
              </span>
            )) || (
              <>
                <span className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white/60">{timeLabel}</span>
                <span className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white/60">🌡 --°C</span>
                <span className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white/60">🌊 --</span>
              </>
            )}
          </div>

          {/* Location + Condition */}
          <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">📍</span>
              <span className="text-sm font-medium text-white/80">
                {biteTime?.currentPhaseLabel ? `${biteTime.currentPhaseLabel}` : '위치 확인 중...'}
              </span>
            </div>
            {biteTime && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                score >= 60 ? 'bg-emerald-500/80 text-white' :
                score >= 40 ? 'bg-amber-500/80 text-white' :
                'bg-red-500/80 text-white'
              }`}>
                {biteTime.gradeLabel}
              </span>
            )}
          </div>
        </div>
      </section>
    </Link>
  );
}
