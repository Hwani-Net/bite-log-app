"use client";

import { WeatherData } from "@/services/weatherService";
import { TideData } from "@/services/tideService";
import { BiteTimePrediction } from "@/services/biteTimeService";
import PeakTimeline from "./PeakTimeline";
import {
  ConciergeRecommendation,
  SpeciesInfo,
} from "@/services/conciergeService";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { DynamicIcon } from "@/lib/iconMap";
import { Sparkles } from "lucide-react";

interface OverviewTabProps {
  locale: string;
  loading: boolean;
  weather: WeatherData | null;
  tideData: TideData | null;
  biteTime: BiteTimePrediction | null;
  recommendation: ConciergeRecommendation | null;
  inSeasonSpecies: SpeciesInfo[];
}

export default function OverviewTab({
  locale,
  loading,
  weather,
  tideData,
  biteTime,
  recommendation,
  inSeasonSpecies,
}: OverviewTabProps) {
  const { isPro, openPaywall } = useSubscriptionStore();
  const biteScore = biteTime?.score ?? 0;
  const seasonChipsRef = useDragScroll();

  return (
    <div className="space-y-6 pb-24">
      {/* AI Greeting Card */}
      <section>
        <div className="rounded-2xl bg-white/5 backdrop-blur-[12px] p-5 flex items-start gap-4 border border-white/10 transition-transform duration-300 hover:bg-white/[0.07]">
          <div className="bg-gradient-to-br from-primary to-cyan-400 p-3 rounded-xl shrink-0 shadow-lg shadow-primary/25">
            <Sparkles size={28} className="text-white drop-shadow-sm" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">
              {locale === "ko" ? "안녕하세요, 낚시인님!" : "Hello!"}
            </h2>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">
              {loading
                ? locale === "ko"
                  ? "낚시 컨디션 분석 중..."
                  : "Analyzing conditions..."
                : recommendation?.reasoning}
            </p>
          </div>
        </div>
      </section>

      {/* In-Season Species Chips */}
      {inSeasonSpecies.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-white/40 mb-2">
            {locale === "ko"
              ? `${new Date().getMonth() + 1}월 시즌 어종`
              : `${new Date().toLocaleString("en", { month: "long" })} Season`}
          </p>
          <div
            ref={seasonChipsRef}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
          >
            {inSeasonSpecies.map((sp) => (
              <span
                key={sp.name}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center gap-1.5"
              >
                {sp.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sp.image}
                    alt={sp.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[#c9a84c]">
                    {sp.name.slice(0, 1)}
                  </span>
                )}{" "}
                {sp.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Today's Recommendation */}
      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          {locale === "ko" ? "오늘의 추천" : "Today's Pick"}
        </h3>
        {loading ? (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 animate-pulse h-32" />
        ) : recommendation ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-cyan-400/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10">
                {recommendation.species.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recommendation.species.image}
                    alt={recommendation.species.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-[#c9a84c]">
                    {recommendation.species.name.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-primary mb-1">
                    <DynamicIcon name="location_on" size={14} />
                    <span className="text-xs font-semibold">
                      {recommendation.spot.name}
                    </span>
                  </div>
                  <p className="font-bold text-base text-white">
                    {recommendation.species.name}{" "}
                    {locale === "ko" ? "히트 포인트" : "Hot Spot"}
                  </p>
                </div>
                <div className="flex gap-3 text-[10px] text-white/50 font-medium mt-2">
                  <div className="flex items-center gap-1">
                    <DynamicIcon name="schedule" size={14} />
                    <span>{recommendation.departureTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DynamicIcon name="navigation" size={14} />
                    <span>
                      {recommendation.travelMinutes < 60
                        ? `${recommendation.travelMinutes}분`
                        : `${Math.floor(recommendation.travelMinutes / 60)}시간 ${recommendation.travelMinutes % 60}분`}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      recommendation.species.difficulty === "beginner"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : recommendation.species.difficulty === "intermediate"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {recommendation.species.difficulty === "beginner"
                      ? locale === "ko"
                        ? "초급"
                        : "Easy"
                      : recommendation.species.difficulty === "intermediate"
                        ? locale === "ko"
                          ? "중급"
                          : "Mid"
                        : locale === "ko"
                          ? "고급"
                          : "Pro"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            {recommendation.tips.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                {recommendation.tips.map((tip, i) => (
                  <p
                    key={i}
                    className="text-xs text-white/50 leading-relaxed flex items-start gap-1"
                  >
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Secret Hotspot Section */}
      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          {locale === "ko" ? "시크릿 포인트" : "Secret Hotspot"}
        </h3>
        <button
          onClick={() => {
            if (!isPro) openPaywall("secret_point");
          }}
          className={`w-full border rounded-2xl p-4 text-left transition-all hover:bg-white/[0.07] active:scale-[0.99] ${
            isPro ? "bg-white/5 border-white/10" : "bg-white/5 border-white/10"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                isPro
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25"
              }`}
            >
              <DynamicIcon
                name={isPro ? "shield" : "lock"}
                size={24}
                className="text-white"
              />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">
                {isPro
                  ? (recommendation?.secretSpot?.name ??
                    (locale === "ko"
                      ? "시크릿 포인트 준비 중"
                      : "Secret Spot (Loading...)"))
                  : locale === "ko"
                    ? "현지인 시크릿 포인트 공개"
                    : "Local Secret Spots"}
              </p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                {isPro
                  ? (recommendation?.secretSpot?.description ??
                    (locale === "ko"
                      ? "PRO 회원 전용 시크릿 포인트입니다"
                      : "PRO exclusive secret fishing spot"))
                  : locale === "ko"
                    ? "PRO 회원 전용 — 지역 명인들의 폭조 포인트"
                    : "PRO only — Top local fishing spots"}
              </p>
              <span
                className={`inline-block mt-2 px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full ${
                  isPro
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600"
                }`}
              >
                {isPro ? "VERIFIED" : "PRO"}
              </span>
            </div>
            {isPro ? (
              <DynamicIcon
                name="check"
                size={20}
                className="text-emerald-500 font-bold"
              />
            ) : (
              <DynamicIcon
                name="chevron_right"
                size={20}
                className="text-white/40"
              />
            )}
          </div>
        </button>
      </section>

      {/* Weather & Tide Analysis */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            {locale === "ko" ? "날씨 & 조수 분석" : "Weather & Tide"}
          </h3>
          {biteTime && (
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                biteScore >= 75
                  ? "bg-emerald-500/20 text-emerald-400"
                  : biteScore >= 55
                    ? "bg-[#7dd3fc]/20 text-[#7dd3fc]"
                    : biteScore >= 35
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
              }`}
            >
              {locale === "ko"
                ? `입질 확률: ${biteScore}%`
                : `Bite: ${biteScore}%`}
            </span>
          )}
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
            <div className="bg-gradient-to-br from-primary/10 to-cyan-400/10 rounded-full w-8 h-8 mx-auto flex items-center justify-center mb-1">
              <DynamicIcon
                name="thermostat"
                size={14}
                className="text-primary"
              />
            </div>
            <p className="text-[10px] text-white/40">
              {locale === "ko" ? "기온" : "Temp"}
            </p>
            <p className="font-bold text-sm text-white">
              {loading
                ? "—"
                : weather?.tempC != null
                  ? `${weather.tempC}°C`
                  : "—"}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
            <div className="bg-gradient-to-br from-primary/10 to-cyan-400/10 rounded-full w-8 h-8 mx-auto flex items-center justify-center mb-1">
              <DynamicIcon name="air" size={14} className="text-primary" />
            </div>
            <p className="text-[10px] text-white/40">
              {locale === "ko" ? "풍속" : "Wind"}
            </p>
            <p className="font-bold text-sm text-white">
              {loading
                ? "—"
                : weather?.windSpeed != null
                  ? `${weather.windSpeed}m/s`
                  : "—"}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
            <div className="bg-gradient-to-br from-primary/10 to-cyan-400/10 rounded-full w-8 h-8 mx-auto flex items-center justify-center mb-1">
              <DynamicIcon
                name={weather?.icon ?? "cloud"}
                size={14}
                className="text-primary"
              />
            </div>
            <p className="text-[10px] text-white/40">
              {locale === "ko"
                ? (weather?.conditionKo ?? "날씨")
                : (weather?.conditionEn ?? "Weather")}
            </p>
            <p className="font-bold text-sm text-white">
              {loading
                ? "—"
                : weather?.humidity != null
                  ? `${weather.humidity}%`
                  : "—"}
            </p>
          </div>
        </div>

        {/* Tide bar chart */}
        {tideData && tideData.tides.length > 0 && (
          <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-white/40 flex items-center gap-1">
                <DynamicIcon
                  name="location_on"
                  size={10}
                  className="text-primary"
                />{" "}
                {tideData.stationName}
              </p>
            </div>
            <div className="flex items-end justify-between gap-2 h-16">
              {tideData.tides.map((tide, i) => {
                const maxLevel = Math.max(
                  ...tideData.tides.map((t) => t.level),
                );
                const pct = maxLevel > 0 ? (tide.level / maxLevel) * 100 : 50;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span
                      className={`text-[9px] font-bold ${tide.type === "High" ? "text-primary" : "text-white/40"}`}
                    >
                      {tide.type === "High" ? "만" : "간"}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        tide.type === "High"
                          ? "bg-gradient-to-t from-primary/50 to-primary/90"
                          : "bg-white/20"
                      }`}
                      style={{ height: `${pct}%`, minHeight: "8px" }}
                    />
                    <span className="text-[9px] text-white/50 font-medium">
                      {tide.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Peak Time Timeline */}
        <PeakTimeline tideData={tideData} locale={locale} />

        {/* Bite factors */}
        {biteTime && (
          <div className="mt-5 space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
            {biteTime.factors.map((f) => (
              <div key={f.name} className="flex items-center gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    f.status === "positive"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : f.status === "negative"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-white/10 text-white/40"
                  }`}
                >
                  <DynamicIcon name={f.icon} size={12} />
                </div>
                <span className="text-white/60 font-medium w-12 shrink-0">
                  {f.name}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      f.status === "positive"
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-300 shadow-sm shadow-emerald-400/30"
                        : f.status === "negative"
                          ? "bg-gradient-to-r from-red-400 to-red-300 shadow-sm shadow-red-400/30"
                          : "bg-gradient-to-r from-amber-400 to-amber-300 shadow-sm shadow-amber-400/30"
                    }`}
                    style={{ width: `${Math.min(100, (f.score / 20) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/40 w-6 text-right font-medium">
                  {f.score}/20
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
              <span className="text-2xl drop-shadow-sm">
                {biteTime.gradeEmoji}
              </span>
              <span
                className={`text-sm font-black ${
                  biteTime.grade === "excellent"
                    ? "text-emerald-400"
                    : biteTime.grade === "good"
                      ? "text-[#7dd3fc]"
                      : biteTime.grade === "fair"
                        ? "text-amber-400"
                        : "text-red-400"
                }`}
              >
                {biteTime.gradeLabel}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
