"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { fetchTideData } from "@/services/tideService";
import { fetchWeather } from "@/services/weatherService";
import { fetchMarineData, MarineData } from "@/services/marineService";
import {
  calculateBiteTime,
  BiteTimePrediction,
  BiteFactor,
} from "@/services/biteTimeService";
import { TideData, getCurrentPhase, TidePhase } from "@/services/tideService";
import { WeatherData } from "@/services/weatherService";
import PeakTimeline from "@/app/components/concierge/PeakTimeline";
import { getRegionForCoords } from "@/lib/region";
import {
  ArrowLeft,
  Lock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Anchor,
  Ship,
  Thermometer,
} from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";
import {
  fetchBiteIndexWithMeta,
  FishingIndex as BiteIndexRow,
  BITE_INDEX_CONFIG,
  BiteIndexGubun,
} from "@/services/biteIndexService";

// ─── Secret Spots Section ─────────────────────────────────────────────────────
// YYYY-MM-DD in the browser's local timezone. `toISOString()` is always
// UTC, which reads "yesterday" for a KST user during the first 9 hours of
// every day — the wrong default for a link into a Korea-only date search.
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

// ─── Fishing Score Calculator ────────────────────────────────────────────────
function calcFishingScore(params: {
  windSpeed: number;
  waveHeight: number;
  waterTemp: number;
}): { score: number; label: string; color: string; desc: string } {
  const windScore =
    params.windSpeed <= 3
      ? 40
      : params.windSpeed <= 6
        ? 30
        : params.windSpeed <= 10
          ? 15
          : 0;

  const waveScore =
    params.waveHeight <= 0.3
      ? 40
      : params.waveHeight <= 0.8
        ? 30
        : params.waveHeight <= 1.5
          ? 15
          : 0;

  const waterScore =
    params.waterTemp >= 15 && params.waterTemp <= 25
      ? 20
      : params.waterTemp >= 10 && params.waterTemp < 15
        ? 12
        : params.waterTemp > 25 && params.waterTemp <= 28
          ? 12
          : 5;

  const score = windScore + waveScore + waterScore;

  if (score >= 80)
    return {
      score,
      label: "낚시 최적",
      color: "#4ade80",
      desc: "출조하기 좋은 날씨입니다",
    };
  if (score >= 60)
    return {
      score,
      label: "낚시 양호",
      color: "#c9a84c",
      desc: "무난한 조건입니다",
    };
  if (score >= 40)
    return {
      score,
      label: "낚시 주의",
      color: "#fb923c",
      desc: "바람·파도를 확인하세요",
    };
  return {
    score,
    label: "출항 자제",
    color: "#f87171",
    desc: "기상 악화로 위험할 수 있습니다",
  };
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
      <svg
        aria-hidden="true"
        className="-rotate-90"
        style={{ width: size, height: size }}
      >
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
  const noData = factor.description.includes("정보 없음");

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
          {noData ? (
            <>
              <span className="text-lg font-black text-white/30">--</span>
              <span className="text-[10px] text-white/30">/20</span>
            </>
          ) : (
            <>
              <span className={`text-lg font-black ${s.text}`}>
                {factor.score}
              </span>
              <span className="text-[10px] text-white/30">/20</span>
            </>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${noData ? "bg-white/10" : s.bar} transition-all duration-700 ease-out`}
          style={{
            width: noData
              ? "0%"
              : `${Math.min(100, (factor.score / 20) * 100)}%`,
          }}
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

// ─── Water Temp Timeline ──────────────────────────────────────────────────────
function WaterTempTimeline({ marine }: { marine: MarineData }) {
  const OPTIMAL_MIN = 16.0;
  const OPTIMAL_MAX = 22.0;
  const HOURS_TO_SHOW = 24;

  // Find current hour index in hourlyTimes
  const now = new Date();
  const hourlyTimes = marine.hourlyTimes ?? [];
  const hourlySst = marine.hourlySst ?? [];
  const hourlyWaveHeight = marine.hourlyWaveHeight ?? [];

  let startIdx = 0;
  if (hourlyTimes.length > 0) {
    // Find the index closest to current hour
    const nowMs = now.getTime();
    let minDiff = Infinity;
    for (let i = 0; i < hourlyTimes.length; i++) {
      const diff = Math.abs(new Date(hourlyTimes[i]).getTime() - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        startIdx = i;
      }
    }
  }

  const hourlyTimesSlice = hourlyTimes.slice(
    startIdx,
    startIdx + HOURS_TO_SHOW,
  );
  const hourlySlice = hourlySst
    .slice(startIdx, startIdx + HOURS_TO_SHOW)
    .map((v) => (v == null ? NaN : v));
  const waveSlice = hourlyWaveHeight
    .slice(startIdx, startIdx + HOURS_TO_SHOW)
    .map((v) => (v == null ? NaN : v));

  // Valid temps only
  const validTemps = hourlySlice.filter((t) => !isNaN(t));
  const minTemp = validTemps.length > 0 ? Math.min(...validTemps) - 1 : 10;
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) + 1 : 30;
  const tempRange = maxTemp - minTemp || 1;

  // SVG dimensions
  const svgW = 320;
  const svgH = 80;
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 16;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const toX = (i: number) => padL + (i / (HOURS_TO_SHOW - 1)) * chartW;
  const toY = (temp: number) =>
    padT + chartH - ((temp - minTemp) / tempRange) * chartH;

  // Optimal zone band Y coordinates (clamp to chart bounds)
  const optBandTop = Math.max(padT, toY(Math.min(OPTIMAL_MAX, maxTemp)));
  const optBandBot = Math.min(
    padT + chartH,
    toY(Math.max(OPTIMAL_MIN, minTemp)),
  );
  const showOptBand = OPTIMAL_MAX >= minTemp && OPTIMAL_MIN <= maxTemp;

  // Build SVG path
  const pathPoints: string[] = [];
  for (let i = 0; i < hourlySlice.length; i++) {
    const t = hourlySlice[i];
    if (isNaN(t)) continue;
    const x = toX(i);
    const y = toY(t);
    pathPoints.push(pathPoints.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  const pathD = pathPoints.join(" ");

  // Current time marker (index 0 = now)
  const nowX = toX(0);

  // X-axis labels every 6 hours
  const xLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < hourlySlice.length; i++) {
    if (hourlyTimesSlice[i] && i % 6 === 0) {
      const d = new Date(hourlyTimesSlice[i]);
      const hh = d.getHours().toString().padStart(2, "0");
      xLabels.push({ x: toX(i), label: `${hh}:00` });
    }
  }

  // Find first optimal temperature entry
  const optimalIdx = hourlySlice.findIndex(
    (t) => !isNaN(t) && t >= OPTIMAL_MIN,
  );
  let optimalLabel = "48시간 이내 없음";
  if (optimalIdx >= 0 && hourlyTimesSlice[optimalIdx]) {
    const od = new Date(hourlyTimesSlice[optimalIdx]);
    const month = od.getMonth() + 1;
    const day = od.getDate();
    const hh = od.getHours().toString().padStart(2, "0");
    const mm = od.getMinutes().toString().padStart(2, "0");
    optimalLabel = `${month}월 ${day}일 ${hh}:${mm}`;
  }

  // Current SST color
  const currentSst =
    validTemps.length > 0
      ? (hourlySlice.find((t) => !isNaN(t)) ?? marine.seaSurfaceTemp)
      : marine.seaSurfaceTemp;
  const sstColor =
    currentSst < 14
      ? "#7dd3fc"
      : currentSst < 16
        ? "#93c5fd"
        : currentSst <= 22
          ? "#4ade80"
          : "#f59e0b";

  // Wave summary (avg of slice)
  const validWaves = waveSlice.filter((w) => !isNaN(w));
  const avgWave =
    validWaves.length > 0
      ? validWaves.reduce((a, b) => a + b, 0) / validWaves.length
      : null;

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer size={16} className="text-[#c9a84c]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
            수온 예보 (72시간)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {avgWave !== null && (
            <span className="text-[10px] text-white/50">
              파고 avg {avgWave.toFixed(1)}m
            </span>
          )}
          <span
            className="text-sm font-black px-2 py-0.5 rounded-lg"
            style={{ color: sstColor, background: `${sstColor}18` }}
          >
            {marine.seaSurfaceTemp.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-hidden rounded-xl bg-white/5 mb-3">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ height: svgH }}
          aria-hidden="true"
        >
          {/* Optimal zone band */}
          {showOptBand && (
            <rect
              x={padL}
              y={optBandTop}
              width={chartW}
              height={Math.max(0, optBandBot - optBandTop)}
              fill="rgba(74,222,128,0.12)"
            />
          )}

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + frac * chartH;
            return (
              <line
                key={frac}
                x1={padL}
                y1={y}
                x2={padL + chartW}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}

          {/* Y-axis labels */}
          {[minTemp + tempRange * 0.75, minTemp + tempRange * 0.25].map(
            (t, i) => (
              <text
                key={i}
                x={padL - 3}
                y={toY(t) + 3}
                textAnchor="end"
                fontSize="7"
                fill="rgba(255,255,255,0.3)"
              >
                {Math.round(t)}
              </text>
            ),
          )}

          {/* Optimal zone label */}
          {showOptBand && (
            <text
              x={padL + 3}
              y={optBandTop + 8}
              fontSize="7"
              fill="rgba(74,222,128,0.6)"
            >
              최적
            </text>
          )}

          {/* SST line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={sstColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current time vertical marker */}
          <line
            x1={nowX}
            y1={padT}
            x2={nowX}
            y2={padT + chartH}
            stroke="rgba(249,115,22,0.7)"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
          <text
            x={nowX + 2}
            y={padT + 7}
            fontSize="7"
            fill="rgba(249,115,22,0.8)"
          >
            현재
          </text>

          {/* X-axis labels */}
          {xLabels.map(({ x, label }) => (
            <text
              key={label}
              x={x}
              y={svgH - 2}
              textAnchor="middle"
              fontSize="7"
              fill="rgba(255,255,255,0.3)"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      {/* Optimal fishing window */}
      <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-white/60">
            최적 수온 도달 ({OPTIMAL_MIN}°C+)
          </span>
        </div>
        <span
          className={`text-[11px] font-bold ${
            optimalIdx >= 0 ? "text-emerald-400" : "text-white/40"
          }`}
        >
          {optimalLabel}
        </span>
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

// ─── Bite Index Section (해양수산부 공식 바다낚시지수 v2) ─────────────────────

function BiteIndexOfficialSection() {
  const [gubun, setGubun] = useState<BiteIndexGubun>("shore");
  const [rows, setRows] = useState<BiteIndexRow[]>([]);
  const [mocked, setMocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<
    "전체" | "서해" | "남해" | "동해" | "제주"
  >("전체");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBiteIndexWithMeta({ gubun, numOfRows: 100 })
      .then((res) => {
        if (cancelled) return;
        setRows(res.items);
        setMocked(res.mocked);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[BiteIndexOfficialSection] fetch failed:", err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gubun]);

  const filteredRows =
    selectedRegion === "전체"
      ? rows
      : rows.filter((r) => getRegionForCoords(r.lat, r.lon) === selectedRegion);
  const displayedRows = showAll ? filteredRows : filteredRows.slice(0, 10);

  const renderScore = (score: 1 | 2 | 3 | 4 | 5) => {
    const conf = BITE_INDEX_CONFIG[score];
    return (
      <div className="flex items-center gap-2">
        <span className={`text-base font-black ${conf.textClass}`}>
          {score}
        </span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[56px]">
          <div
            className={`h-full rounded-full ${conf.barClass}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold ${conf.textClass} shrink-0`}>
          {conf.label}
        </span>
      </div>
    );
  };

  return (
    <div className="glass-morphism rounded-2xl border border-white/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#7dd3fc]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.15em]">
          해양수산부 공식 낚시지수
        </h3>
        <span className="text-[9px] bg-[#7dd3fc]/20 border border-[#7dd3fc]/30 text-[#7dd3fc] px-1.5 py-0.5 rounded font-bold ml-1">
          해수부 공식
        </span>
        {mocked && !loading && (
          <span className="text-[9px] bg-white/10 border border-white/10 text-white/50 px-1.5 py-0.5 rounded font-bold ml-auto">
            샘플
          </span>
        )}
      </div>

      {/* Gubun toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setGubun("shore");
            setShowAll(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
            gubun === "shore"
              ? "bg-[#7dd3fc]/20 border border-[#7dd3fc]/40 text-[#7dd3fc]"
              : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          }`}
        >
          <Anchor size={12} />
          갯바위
        </button>
        <button
          type="button"
          onClick={() => {
            setGubun("boat");
            setShowAll(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
            gubun === "boat"
              ? "bg-[#c9a84c]/20 border border-[#c9a84c]/40 text-[#c9a84c]"
              : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
          }`}
        >
          <Ship size={12} />
          선상
        </button>
      </div>

      {/* Region tabs: 전체 / 서해 / 남해 / 동해 / 제주 */}
      <div className="flex gap-1.5">
        {(
          [
            { key: "전체", color: "rgba(255,255,255,0.5)" },
            { key: "서해", color: "#7dd3fc" },
            { key: "남해", color: "#4ade80" },
            { key: "동해", color: "#c9a84c" },
            { key: "제주", color: "#f472b6" },
          ] as const
        ).map(({ key, color }) => {
          const active = selectedRegion === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedRegion(key);
                setShowAll(false);
              }}
              className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
              style={
                active
                  ? {
                      backgroundColor: `${color}20`,
                      border: `1px solid ${color}50`,
                      color,
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.45)",
                    }
              }
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Anchor size={24} className="text-white/20" />
          <p className="text-xs text-white/40">데이터 수신 중</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedRows.map((row, i) => (
            <div
              key={`${row.placeName}-${row.targetFish}-${i}`}
              className="bg-white/5 rounded-xl px-3 py-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {row.placeName || "—"}
                  </p>
                  <p className="text-[10px] text-white/60 truncate">
                    대상 어종: {row.targetFish}
                    {row.tideInfo ? ` · ${row.tideInfo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-white/50">
                  {row.waterTemp != null && (
                    <span>수온 {row.waterTemp.toFixed(1)}℃</span>
                  )}
                  {row.waveHeight != null && (
                    <span>파고 {row.waveHeight.toFixed(1)}m</span>
                  )}
                </div>
              </div>
              {renderScore(row.indexScore)}
            </div>
          ))}
          {filteredRows.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
            >
              {showAll
                ? `접기 (${filteredRows.length}개 중 10개 표시)`
                : `전체 보기 · ${filteredRows.length}개 중 10개 표시`}
            </button>
          )}
        </div>
      )}

      <p className="text-[9px] text-white/20 text-right">
        출처: 해양수산부 바다낚시지수 v2 (data.go.kr)
      </p>
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
  const [marine, setMarine] = useState<MarineData | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 33.4996,
    lng: 126.5312,
  });
  const [loading, setLoading] = useState(true);
  const [locationResolved, setLocationResolved] = useState(false);
  const [locationName, setLocationName] = useState("현재 위치");

  useEffect(() => {
    // Fallback coordinates (제주도 중심) — used when geolocation fails or times out.
    // Keeps the page renderable even without location permission.
    const DEFAULT_LAT = 33.4996;
    const DEFAULT_LNG = 126.5312;

    async function loadWithCoords(
      lat: number,
      lng: number,
      isFallback: boolean,
    ) {
      // Signal that coordinates are known — the loading banner swaps copy to
      // "실시간 데이터 수신 중" so users get feedback that the geolocation
      // permission step already succeeded and only API fan-out remains.
      setLocationResolved(true);
      if (isFallback) {
        setLocationName("제주도 (기본)");
      }

      // Use allSettled so a single slow/failing API does not block the rest.
      const [wRes, tRes, mRes] = await Promise.allSettled([
        fetchWeather(lat, lng),
        fetchTideData(lat, lng),
        fetchMarineData(lat, lng),
      ]);
      const w = wRes.status === "fulfilled" ? wRes.value : null;
      const t = tRes.status === "fulfilled" ? tRes.value : null;
      const m = mRes.status === "fulfilled" ? mRes.value : null;
      // Store resolved coords so FishingIndexSection can query by region
      setCoords({ lat, lng });
      setWeather(w);
      setTideData(t);
      setMarine(m);
      setBiteTime(calculateBiteTime(w, t, m));
      if (!isFallback && t) {
        setLocationName(t.stationName || "현재 위치");
      }
      // Always dismiss the loading banner once allSettled resolves — even if
      // every API failed, the page shows a "위치 권한을 허용하면..." hint
      // instead of hanging on the loader.
      setLoading(false);
    }

    // Initial loading=true is already set by useState — no need to re-set here.
    // Location-independent sections (e.g. 해양수산부 바다낚시지수) render via the
    // loading branch below while geolocation is still resolving.

    if (!navigator.geolocation) {
      // No geolocation support — fall back to default coords directly.
      loadWithCoords(DEFAULT_LAT, DEFAULT_LNG, true);
      return;
    }

    // Safety net: if the browser never calls back (some environments silently
    // drop geolocation callbacks), force-resolve with fallback after ~6s.
    let resolved = false;
    const fallbackTimer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      loadWithCoords(DEFAULT_LAT, DEFAULT_LNG, true);
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        loadWithCoords(pos.coords.latitude, pos.coords.longitude, false);
      },
      () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        loadWithCoords(DEFAULT_LAT, DEFAULT_LNG, true);
      },
      { timeout: 5000, maximumAge: 60000 },
    );

    return () => {
      clearTimeout(fallbackTimer);
    };
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

      {/* Loading state — non-blocking: show skeleton for location-dependent widgets
          while keeping location-independent sections (official bite index) visible. */}
      {loading ? (
        <div className="space-y-4 px-4 pt-4">
          {/* Compact inline loader (does NOT cover the page) */}
          <div className="glass-morphism rounded-2xl border border-white/5 p-5 flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#c9a84c]/20 border-t-[#c9a84c] rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">
                {locationResolved
                  ? "실시간 데이터 수신 중"
                  : "위치 기반 데이터 분석 중"}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {locationResolved
                  ? "날씨·조석·파고 정보를 불러오고 있습니다"
                  : "위치 권한이 없어도 아래 바다낚시지수는 볼 수 있습니다"}
              </p>
            </div>
          </div>
        </div>
      ) : biteTime ? (
        <div className="space-y-4 px-4 pt-4">
          {/* ── Fishing Score Card ── */}
          {weather &&
            marine &&
            (() => {
              const result = calcFishingScore({
                windSpeed: weather.windSpeed ?? 0,
                waveHeight: marine.waveHeight ?? 0,
                waterTemp: marine.seaSurfaceTemp ?? 18,
              });
              const circumference = 2 * Math.PI * 24;
              return (
                <div
                  className="rounded-2xl border p-4 mb-4 flex items-center gap-4"
                  style={{ borderColor: `${result.color}40` }}
                >
                  <div className="flex flex-col items-start flex-1">
                    <span
                      className="text-4xl font-bold leading-none"
                      style={{ color: result.color }}
                    >
                      {result.score}
                    </span>
                    <span
                      className="text-sm font-bold mt-1"
                      style={{ color: result.color }}
                    >
                      {result.label}
                    </span>
                    <span className="text-xs text-white/60 mt-0.5">
                      {result.desc}
                    </span>
                  </div>
                  <svg
                    aria-hidden="true"
                    width="56"
                    height="56"
                    viewBox="0 0 56 56"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke={result.color}
                      strokeWidth="4"
                      strokeDasharray={`${(result.score / 100) * circumference} ${circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                    />
                    <text
                      x="28"
                      y="33"
                      textAnchor="middle"
                      fill={result.color}
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {result.score}
                    </text>
                  </svg>
                </div>
              );
            })()}

          {/* ── Score Hero ── */}
          {(() => {
            const validCount = biteTime.factors.filter(
              (f) => !f.description.includes("정보 없음"),
            ).length;
            const showScore = validCount >= 2;
            return (
              <div className="glass-morphism rounded-2xl border border-white/5 p-5">
                <div className="flex items-center gap-6">
                  {showScore ? (
                    <ScoreRing score={biteTime.score} />
                  ) : (
                    <div className="relative flex items-center justify-center w-[120px] h-[120px]">
                      <svg
                        aria-hidden="true"
                        className="-rotate-90"
                        style={{ width: 120, height: 120 }}
                      >
                        <circle
                          cx={60}
                          cy={60}
                          r={54}
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="10"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white/30">
                          --
                        </span>
                        <span className="text-[10px] text-white/30 font-medium">
                          / 100
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
            );
          })()}

          {/* ── Booking CTA (shown when conditions are decent or better) ── */}
          {(biteTime.grade === "excellent" || biteTime.grade === "good") && (
            <Link
              href={`/booking?date=${localISODate(new Date())}`}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#c9a84c] text-[#080d14] text-sm font-bold hover:brightness-110 transition-all"
            >
              <Anchor size={16} />
              {isKo ? "지금 출조 예약하기" : "Book a trip now"}
            </Link>
          )}

          {/* ── 해양수산부 공식 바다낚시지수 (data.go.kr v2) ── */}
          <BiteIndexOfficialSection />

          {/* ── GPS permission banner ── */}
          {!weather && !tideData && (
            <p className="text-xs text-white/40 text-center py-2">
              위치 권한을 허용하면 실시간 데이터를 제공합니다
            </p>
          )}

          {/* ── Water Temp Timeline ── */}
          {marine?.hourlySst && marine.hourlySst.length > 0 && (
            <WaterTempTimeline marine={marine} />
          )}

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
          <a
            href="https://www.windy.com/?36.0,128.0,7"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
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
          </a>

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
