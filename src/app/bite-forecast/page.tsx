"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { fetchTideData } from "@/services/tideService";
import { fetchWeather } from "@/services/weatherService";
import { fetchMarineData } from "@/services/marineService";
import {
  calculateBiteTime,
  BiteTimePrediction,
  BiteFactor,
} from "@/services/biteTimeService";
import { TideData, getCurrentPhase, TidePhase } from "@/services/tideService";
import { WeatherData } from "@/services/weatherService";
import PeakTimeline from "@/app/components/concierge/PeakTimeline";
import { ArrowLeft, Lock, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

// ─── Secret Spots Section ─────────────────────────────────────────────────────
function SecretSpotsSection({
  isPro,
  onOpenPaywall,
}: {
  isPro: boolean;
  onOpenPaywall: () => void;
}) {
  const spots = [
    {
      name: "대천항 남단 테트라포드",
      species: "감성돔, 우럭",
      desc: "들물 타임에 대물 출현 빈도 매우 높음",
    },
    {
      name: "시화방조제 1km 지점 수중여",
      species: "삼치, 광어",
      desc: "조류가 바뀌는 시점에 폭발적 피딩",
    },
    {
      name: "영흥도 남서쪽 시크릿 여밭",
      species: "참돔, 갑오징어",
      desc: "현지인들만 아는 최고급 포인트",
    },
  ];

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-[#c9a84c]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
          이 지역 시크릿 포인트
        </h3>
        {!isPro && (
          <span className="text-[10px] bg-[#c9a84c] text-[#080d14] px-1.5 py-0.5 rounded font-bold ml-1">
            PRO
          </span>
        )}
      </div>

      <div
        className={`space-y-3 transition-all duration-500 ${!isPro ? "blur-[6px] select-none" : ""}`}
      >
        {spots.map((spot, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-[#c9a84c]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {spot.name}
              </p>
              <p className="text-[10px] text-[#c9a84c] font-medium">
                {spot.species}
              </p>
              <p className="text-[9px] text-white/60 mt-0.5">{spot.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {!isPro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#080d14]/30 backdrop-blur-[2px] z-10">
          <div className="glass-morphism shadow-xl rounded-2xl p-5 border border-[#c9a84c]/20 flex flex-col items-center text-center max-w-[200px]">
            <Lock size={28} className="text-[#c9a84c] mb-2" />
            <p className="text-[11px] font-bold text-white leading-tight mb-3">
              고수들만 아는
              <br />
              시크릿 포인트 3곳 잠김
            </p>
            <button
              onClick={onOpenPaywall}
              className="bg-[#c9a84c] text-[#080d14] text-[10px] font-bold px-4 py-2 rounded-full shadow-lg shadow-[#c9a84c]/20 active:scale-95 transition-transform"
            >
              포인트 잠금 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75
      ? "#c9a84c"
      : score >= 55
        ? "#7dd3fc"
        : score >= 35
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[10px] text-white/60 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ─── Factor Card ──────────────────────────────────────────────────────────────
function FactorCard({ factor }: { factor: BiteFactor }) {
  const statusStyles = {
    positive: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      bar: "bg-emerald-500",
    },
    neutral: {
      bg: "bg-[#c9a84c]/10",
      border: "border-[#c9a84c]/20",
      text: "text-[#c9a84c]",
      bar: "bg-[#c9a84c]",
    },
    negative: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      text: "text-red-400",
      bar: "bg-red-500",
    },
  };
  const s = statusStyles[factor.status];

  return (
    <div className={`rounded-2xl p-4 border ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}
        >
          <DynamicIcon name={factor.icon} size={18} className={s.text} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-white">{factor.name}</p>
          <p className="text-[10px] text-white/60">{factor.description}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-black ${s.text}`}>{factor.score}</span>
          <span className="text-[10px] text-white/30">/20</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${s.bar} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, (factor.score / 20) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Tide Timeline ────────────────────────────────────────────────────────────
function TideTimeline({
  tideData,
  phase,
}: {
  tideData: TideData;
  phase: TidePhase | null;
}) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const totalMinutes = 24 * 60;

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <DynamicIcon name="waves" size={16} className="text-[#7dd3fc]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
          조석 시간표
        </h3>
        <span className="text-[10px] text-white/60 ml-auto">
          {tideData.stationName}
        </span>
      </div>

      {/* Current phase banner */}
      {phase && (
        <div className="bg-gradient-to-r from-[#7dd3fc]/20 to-[#c9a84c]/20 border border-[#7dd3fc]/20 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs font-bold text-white">{phase.label}</p>
              <p className="text-[10px] text-white/50">{phase.strengthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7dd3fc] rounded-full transition-all"
                style={{ width: `${phase.percent}%` }}
              />
            </div>
            <span className="text-[10px] text-white/60 font-bold">
              {Math.round(phase.percent)}%
            </span>
          </div>
        </div>
      )}

      {/* Timeline visual */}
      <div className="relative h-16 bg-white/5 rounded-xl overflow-hidden mb-3">
        {/* Time ruler */}
        {[0, 6, 12, 18].map((h) => (
          <div
            key={h}
            className="absolute top-0 h-full border-l border-dashed border-white/10"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            <span className="absolute -top-0.5 -translate-x-1/2 text-[8px] text-white/30 font-medium bg-transparent px-0.5">
              {h}시
            </span>
          </div>
        ))}

        {/* Tide markers */}
        {tideData.tides.map((tide, i) => {
          const [hh, mm] = tide.time.split(":").map(Number);
          const tideMinutes = hh * 60 + mm;
          const leftPercent = (tideMinutes / totalMinutes) * 100;
          const isHigh = tide.type === "High";

          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${leftPercent}%`, bottom: isHigh ? "50%" : "0%" }}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 ${isHigh ? "bg-[#7dd3fc] border-[#7dd3fc]/50" : "bg-[#c9a84c] border-[#c9a84c]/50"}`}
              />
              <div className="text-center mt-0.5">
                <p className="text-[8px] font-bold text-white/70">
                  {tide.time}
                </p>
                <p
                  className={`text-[7px] font-bold ${isHigh ? "text-[#7dd3fc]" : "text-[#c9a84c]"}`}
                >
                  {isHigh ? "만조" : "간조"}
                </p>
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-red-400 z-10"
          style={{ left: `${(currentMinutes / totalMinutes) * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-400 rounded-full" />
        </div>
      </div>

      {/* Tide table */}
      <div className="grid grid-cols-2 gap-2">
        {tideData.tides.map((tide, i) => {
          const isHigh = tide.type === "High";
          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isHigh ? "bg-[#7dd3fc]/10" : "bg-[#c9a84c]/10"}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${isHigh ? "bg-[#7dd3fc]" : "bg-[#c9a84c]"}`}
              />
              <div>
                <p className="text-xs font-bold text-white">
                  {isHigh ? "만조" : "간조"} {tide.time}
                </p>
                <p className="text-[10px] text-white/60">{tide.level}cm</p>
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
    {
      label: "기온",
      value: `${weather.tempC}°C`,
      icon: "thermostat",
      color:
        weather.tempC > 20
          ? "text-orange-400"
          : weather.tempC < 5
            ? "text-[#7dd3fc]"
            : "text-emerald-400",
    },
    {
      label: "바람",
      value: `${weather.windSpeed}m/s`,
      icon: "air",
      color: (weather.windSpeed ?? 0) > 10 ? "text-red-400" : "text-[#7dd3fc]",
    },
    {
      label: "습도",
      value: `${weather.humidity}%`,
      icon: "humidity_percentage",
      color: "text-[#7dd3fc]",
    },
    {
      label: "날씨",
      value: weather.conditionKo,
      icon: weather.icon,
      color: "text-[#c9a84c]",
    },
  ];

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <DynamicIcon name="cloud" size={16} className="text-[#c9a84c]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
          날씨 상세
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
          >
            <DynamicIcon name={item.icon} size={20} className={item.color} />
            <div>
              <p className="text-[10px] text-white/60 font-medium">
                {item.label}
              </p>
              <p className="text-sm font-bold text-white">{item.value}</p>
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
    if (f.name === "시간대" && f.score >= 16) {
      tips.push("지금은 매직아워! 톱워터 루어나 생미끼로 공략하세요.");
    }
    if (f.name.includes("물") && f.status === "positive") {
      tips.push("물 세기가 좋습니다. 채비가 자연스럽게 흘러 입질 확률 UP!");
    }
    if (f.name === "바람" && f.status === "negative") {
      tips.push(
        "바람이 강합니다. 무거운 채비로 교체하고 안전 장비를 확인하세요.",
      );
    }
    if (f.name.includes("수온") && f.status === "negative") {
      tips.push("수온이 낮습니다. 바닥층을 공략하고 느린 액션을 추천합니다.");
    }
    if (f.name.includes("수온") && f.score >= 16) {
      tips.push("수온이 적절합니다. 중층~상층까지 폭넓게 공략해보세요.");
    }
    if (f.name === "기압" && f.status === "positive" && f.score >= 14) {
      tips.push(
        "기압이 낮아지는 중! 물고기 활성도가 높아집니다. 적극 공략하세요.",
      );
    }
    if (f.name === "파고" && f.status === "negative") {
      tips.push(
        "파고가 높습니다. 선상낚시는 멀미 주의, 방파제 낚시를 추천합니다.",
      );
    }
    if (
      f.name.includes("사리") ||
      (f.icon === "dark_mode" && f.status === "positive")
    ) {
      tips.push("사리 전후입니다. 조류가 강해 먹이활동이 활발합니다!");
    }
  }

  if (biteTime.score < 35) {
    tips.push("전반적으로 어려운 조건입니다. 인내심을 갖고 임하세요.");
  }

  if (tips.length === 0) {
    tips.push("보통의 조건입니다. 포인트 선정에 집중하세요!");
  }

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <DynamicIcon name="lightbulb" size={16} className="text-[#c9a84c]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
          오늘의 낚시 팁
        </h3>
      </div>
      <div className="space-y-2">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="flex items-start gap-2 bg-[#c9a84c]/5 border border-[#c9a84c]/10 rounded-xl px-3 py-2.5"
          >
            <p className="text-xs text-white/70 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BiteForecastPage() {
  const locale = useAppStore((s) => s.locale);
  const { isPro, openPaywall } = useSubscriptionStore();
  const isKo = locale === "ko";

  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("현재 위치");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const [w, t, m] = await Promise.all([
                fetchWeather(lat, lng),
                fetchTideData(lat, lng),
                fetchMarineData(lat, lng),
              ]);
              setWeather(w);
              setTideData(t);
              setBiteTime(calculateBiteTime(w, t, m));
              if (t) setLocationName(t.stationName || "현재 위치");
              setLoading(false);
            },
            () => {
              // No location permission — use default
              setWeather(null);
              setTideData(null);
              setBiteTime(calculateBiteTime(null, null));
              setLoading(false);
            },
            { timeout: 8000, maximumAge: 300000 },
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
    hour >= 4 && hour < 9
      ? "아침"
      : hour >= 9 && hour < 17
        ? "낮"
        : hour >= 17 && hour < 20
          ? "저녁"
          : "밤";

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-[#080d14]/60 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full glass-morphism border border-white/10"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-white uppercase tracking-[0.1em]">
            {isKo ? "입질 예측 상세" : "Bite Forecast Detail"}
          </h1>
          <p className="text-[10px] text-white/60">
            {locationName} · {timeLabel}
          </p>
        </div>
      </header>

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-[#c9a84c]/20 border-t-[#c9a84c] rounded-full animate-spin" />
            <p className="text-sm text-white/60">위치 기반 데이터 분석 중...</p>
          </div>
        </div>
      ) : biteTime ? (
        <div className="space-y-4 px-4 pt-4">
          {/* ── Score Hero ── */}
          <div className="glass-morphism rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-6">
              <ScoreRing score={biteTime.score} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{biteTime.gradeEmoji}</span>
                  <span className="text-lg font-bold text-white">
                    {biteTime.gradeLabel}
                  </span>
                </div>
                <p className="text-xs text-white/60 mb-3">
                  7가지 요소를 종합 분석한 결과입니다
                </p>
                {/* Mini factor tags */}
                <div className="flex flex-wrap gap-1.5">
                  {biteTime.factors.map((f) => {
                    const dotColor =
                      f.status === "positive"
                        ? "bg-emerald-400"
                        : f.status === "negative"
                          ? "bg-red-400"
                          : "bg-[#c9a84c]";
                    return (
                      <span
                        key={f.name}
                        className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-0.5"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                        />
                        <span className="text-[10px] font-medium text-white/50">
                          {f.name}
                        </span>
                        <span className="text-[10px] font-bold text-white/70">
                          {f.score}
                        </span>
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
              <DynamicIcon
                name="analytics"
                size={16}
                className="text-[#c9a84c]"
              />
              <h2 className="text-sm font-bold text-white/50 uppercase tracking-[0.15em]">
                {isKo ? "요소별 상세 분석" : "Factor Analysis"}
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

          {/* ── Peak Timeline ── */}
          {tideData && <PeakTimeline tideData={tideData} locale={locale} />}

          {/* ── Weather Detail ── */}
          {weather && <WeatherDetail weather={weather} />}

          {/* ── Secret Spots (PRO) ── */}
          <SecretSpotsSection
            isPro={isPro}
            onOpenPaywall={() => openPaywall("secret_point")}
          />

          {/* ── Fishing Tips ── */}
          <FishingTips biteTime={biteTime} />

          {/* ── Windy Link ── */}
          <Link href="/weather" className="block">
            <div className="bg-gradient-to-r from-[#7dd3fc]/20 to-[#c9a84c]/10 border border-[#7dd3fc]/20 rounded-2xl p-4 flex items-center gap-3">
              <DynamicIcon
                name="satellite_alt"
                size={22}
                className="text-[#7dd3fc] shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs font-bold text-white uppercase tracking-[0.1em]">
                  {isKo ? "위성 날씨 지도 보기" : "View Satellite Weather"}
                </p>
                <p className="text-[10px] text-white/60">
                  7일 출항 날씨 · Windy.com
                </p>
              </div>
              <ChevronRight size={20} className="text-white/60" />
            </div>
          </Link>

          {/* ── Data source ── */}
          <p className="text-[10px] text-white/20 text-center pb-4">
            {isKo
              ? "※ 물때: KHOA 바다누리, 날씨: Open-Meteo, 수온·파고: Open-Meteo Marine. 실제 조과는 다를 수 있습니다."
              : "※ Tide: KHOA, Weather: Open-Meteo, SST/Waves: Open-Meteo Marine. Actual results may vary."}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm font-bold text-white mt-2">
              위치 정보가 필요합니다
            </p>
            <p className="text-xs text-white/60 mt-1">
              브라우저 위치 권한을 허용해주세요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
