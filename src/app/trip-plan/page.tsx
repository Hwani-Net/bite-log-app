"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TripPlan,
  TripBriefing,
  generateTripBriefing,
  getBriefingAlertTime,
} from "@/services/preTripBriefingService";
import {
  sendLocalNotification,
  requestNotificationPermission,
} from "@/services/pushNotificationService";
import {
  ArrowLeft,
  PenLine,
  Sparkles,
  Waves,
  SearchCheck,
  MessageCircle,
  ListChecks,
  Backpack,
  ShoppingBag,
  ShoppingCart,
  ExternalLink,
  Bell,
  Anchor,
  Scissors,
  Flashlight,
  Phone,
  Droplets,
  Package,
  Bug,
  Armchair,
  Shirt,
  Flame,
  Hand,
  Snowflake,
  Sun,
  Glasses,
  CloudRain,
  Footprints,
  AlertTriangle,
  Pill,
  Thermometer,
  BatteryCharging,
  Stethoscope,
  CreditCard,
  Shield,
  Settings2,
  Circle,
  Fish,
  FishOff,
  Dumbbell,
  Link,
  Worm,
  Zap,
  Briefcase,
  LifeBuoy,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Anchor,
  Scissors,
  Flashlight,
  Phone,
  Droplets,
  Package,
  Bug,
  Armchair,
  Shirt,
  Flame,
  Hand,
  Snowflake,
  Sun,
  Glasses,
  CloudRain,
  Footprints,
  AlertTriangle,
  Pill,
  Thermometer,
  BatteryCharging,
  Stethoscope,
  CreditCard,
  Shield,
  Settings2,
  Circle,
  Fish,
  FishOff,
  Dumbbell,
  Link,
  Worm,
  Zap,
  Briefcase,
  LifeBuoy,
  Waves,
};

function ItemIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} />;
}

// @mock-data — 하드코딩된 어종 목록. 실서비스 시 fishSeasonDB 또는 API로 교체
const SPECIES_LIST = [
  "볼락",
  "감성돔",
  "농어",
  "우럭",
  "방어",
  "주꾸미",
  "갈치",
  "광어",
  "참돔",
];

// @mock-data — 하드코딩된 지역-좌표 매핑. 실서비스 시 지도 API 검색으로 교체
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  인천: { lat: 37.4563, lng: 126.7052 },
  태안: { lat: 36.7485, lng: 126.2982 },
  보령: { lat: 36.3325, lng: 126.6127 },
  군산: { lat: 35.9675, lng: 126.7368 },
  목포: { lat: 34.8118, lng: 126.3922 },
  통영: { lat: 34.854, lng: 128.433 },
  거제: { lat: 34.8802, lng: 128.6217 },
  여수: { lat: 34.7604, lng: 127.6622 },
  부산: { lat: 35.1796, lng: 129.0756 },
  제주: { lat: 33.4996, lng: 126.5312 },
  서귀포: { lat: 33.2541, lng: 126.5601 },
  속초: { lat: 38.2048, lng: 128.5912 },
  포항: { lat: 36.019, lng: 129.3435 },
};

const FISHING_TYPES = [
  { value: "breakwater", label: "방파제" },
  { value: "boat", label: "선상낚시" },
  { value: "shore", label: "갯바위/연안" },
  { value: "reef", label: "방죽/갯벌" },
] as const;

export default function TripPlanPage() {
  const router = useRouter();
  const [form, setForm] = useState<Partial<TripPlan>>({
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    species: "볼락",
    location: "태안",
    fishingType: "breakwater",
    alertHour: 14,
  });
  const [briefing, setBriefing] = useState<TripBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertSet, setAlertSet] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("biteLog_tripAlert");
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved) as {
        tripDate: string;
        alertHour: number;
      };
      const initialDate = new Date(Date.now() + 86400000)
        .toISOString()
        .split("T")[0];
      return parsed.tripDate === initialDate && parsed.alertHour === 14;
    } catch (e) {
      console.error("biteLog_tripAlert parse error", e);
      return false;
    }
  });

  const handleGenerate = async () => {
    if (!form.species || !form.location || !form.date) return;
    setLoading(true);
    setBriefing(null);

    const coords = LOCATION_COORDS[form.location] || {
      lat: 37.5665,
      lng: 126.978,
    };
    const plan: TripPlan = {
      date: form.date,
      species: form.species,
      location: form.location,
      lat: coords.lat,
      lng: coords.lng,
      fishingType: form.fishingType || "breakwater",
      charterName: form.charterName,
      alertHour: form.alertHour ?? 14,
    };

    try {
      const result = await generateTripBriefing(plan);
      setBriefing(result);
    } catch (e) {
      console.error("Briefing generation failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAlert = async () => {
    if (!briefing) return;
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      alert("알림 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
      return;
    }
    const alertTime = getBriefingAlertTime(
      briefing.tripPlan.date,
      briefing.tripPlan.alertHour,
    );
    const now = new Date();
    const delay = alertTime.getTime() - now.getTime();

    setAlertSet(true);
    localStorage.setItem(
      "biteLog_tripAlert",
      JSON.stringify({
        tripDate: briefing.tripPlan.date,
        alertHour: briefing.tripPlan.alertHour,
      }),
    );

    const notificationPayload = [
      `${briefing.tripPlan.species} 출조 브리핑`,
      `내일 ${briefing.tripPlan.location} 출조 준비하세요!`,
      "/icons/icon-192x192.png",
      "trip-briefing",
    ] as const;

    if (delay > 0) {
      setTimeout(() => {
        sendLocalNotification(...notificationPayload);
      }, delay);
    } else {
      sendLocalNotification(...notificationPayload);
    }
  };

  const priorityColor = (p: string) => {
    if (p === "essential") return "text-red-400";
    if (p === "recommended") return "text-[#c9a84c]";
    return "text-white/50";
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden pb-24 page-enter bg-[#080d14]">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-3 sticky top-0 z-30 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="size-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            출조 전 브리핑
          </h1>
          <p className="text-xs text-white/50">
            AI가 날씨·물때·커뮤니티 조황을 종합합니다
          </p>
        </div>
      </header>

      <div className="flex-1 px-5 mt-4 space-y-4">
        {/* ── 출조 계획 입력 ── */}
        <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <PenLine size={20} className="text-[#c9a84c]" />
            출조 계획 입력
          </h2>

          {/* 날짜 */}
          <div>
            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-[0.2em]">
              출조 날짜
            </label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={{ colorScheme: "dark" }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c]/50 transition-all"
            />
          </div>

          {/* 어종 */}
          <div>
            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-[0.2em]">
              대상 어종
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIES_LIST.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setForm((f) => ({ ...f, species: sp }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.species === sp
                      ? "bg-[#c9a84c] text-[#080d14]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:border-[#c9a84c]/40"
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* 지역 */}
          <div>
            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-[0.2em]">
              출조 지역
            </label>
            <select
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              style={{ colorScheme: "dark" }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c]/50 transition-all"
            >
              {Object.keys(LOCATION_COORDS).map((loc) => (
                <option
                  key={loc}
                  value={loc}
                  className="bg-[#0f141b] text-white"
                >
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 낚시 유형 */}
          <div>
            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-[0.2em]">
              낚시 유형
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FISHING_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() =>
                    setForm((f) => ({ ...f, fishingType: t.value }))
                  }
                  className={`py-2 rounded-xl text-[11px] font-semibold transition-all ${
                    form.fishingType === t.value
                      ? "bg-[#c9a84c] text-[#080d14]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:border-[#c9a84c]/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 선사명 */}
          {form.fishingType === "boat" && (
            <div>
              <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-[0.2em]">
                선사명 (선택)
              </label>
              <input
                type="text"
                placeholder="예: 홍길동 낚시배"
                value={form.charterName || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, charterName: e.target.value }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50 transition-all"
              />
            </div>
          )}

          {/* 알림 시간 */}
          <div>
            <label className="text-xs font-semibold text-white/50 mb-1.5 flex items-center gap-1 uppercase tracking-[0.2em]">
              브리핑 발송 시간
              <span className="text-[#c9a84c] text-[10px] normal-case tracking-normal">
                (쿠팡 당일배송 주문 가능)
              </span>
            </label>
            <div className="flex gap-2">
              {[10, 12, 14, 16].map((h) => (
                <button
                  key={h}
                  onClick={() => setForm((f) => ({ ...f, alertHour: h }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    form.alertHour === h
                      ? "bg-[#c9a84c] text-[#080d14]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:border-[#c9a84c]/40"
                  }`}
                >
                  {h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#c9a84c] hover:opacity-90 disabled:opacity-50 text-[#080d14] font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#080d14]/30 border-t-[#080d14] rounded-full animate-spin" />
                브리핑 생성 중...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI 브리핑 생성
              </>
            )}
          </button>
        </section>

        {/* ── 브리핑 결과 없음 ── */}
        {!briefing && !loading && (
          <section className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
              <Sparkles size={24} className="text-white/20" />
            </div>
            <p className="text-sm font-semibold text-white/40">
              아직 브리핑이 없습니다
            </p>
            <p className="text-xs text-white/25 leading-relaxed max-w-[220px]">
              출조 계획을 입력하고 AI 브리핑 생성을 눌러주세요
            </p>
          </section>
        )}

        {/* ── 브리핑 결과 ── */}
        {briefing && (
          <>
            {/* AI 총평 */}
            <section className="rounded-2xl p-[1px] bg-gradient-to-br from-[#c9a84c] to-[#7dd3fc]">
              <div className="rounded-2xl bg-[#0f141b] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-[#c9a84c]/10 p-2 rounded-xl">
                    <Sparkles size={20} className="text-[#c9a84c]" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    AI 출조 총평
                  </span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  {briefing.aiSummary}
                </p>
                <p className="text-[11px] text-white/30 mt-3 flex items-center gap-1">
                  <Waves size={12} />
                  물때: {briefing.tideInfo}
                </p>
              </div>
            </section>

            {/* 채비 추천 */}
            {briefing.tackleAdvice && (
              <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <SearchCheck size={20} className="text-[#c9a84c]" />
                  채비 추천 — {briefing.tackleAdvice.tide}
                </h2>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl p-3.5">
                    <p className="text-[11px] text-white/30 font-medium">
                      봉돌 (텅스텐)
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {briefing.tackleAdvice.sinkerGuide.tungsten || "—"}
                    </p>
                    <p className="text-[11px] text-white/30 font-medium mt-2">
                      봉돌 (납)
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {briefing.tackleAdvice.sinkerGuide.lead || "—"}
                    </p>
                    <p className="text-[10px] text-[#c9a84c] mt-2">
                      {briefing.tackleAdvice.sinkerGuide.note}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3.5">
                    <p className="text-[11px] text-white/30 font-medium">
                      라인
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {briefing.tackleAdvice.lineGuide.mainLine}
                    </p>
                    {briefing.tackleAdvice.lineGuide.leader && (
                      <p className="text-xs text-white/50 mt-1">
                        리더: {briefing.tackleAdvice.lineGuide.leader}
                      </p>
                    )}
                    {briefing.tackleAdvice.lineGuide.length && (
                      <p className="text-xs font-semibold text-[#c9a84c] mt-0.5">
                        최소 {briefing.tackleAdvice.lineGuide.length}
                      </p>
                    )}
                  </div>
                  {briefing.tackleAdvice.lureGuide && (
                    <div className="bg-white/5 rounded-xl p-3.5">
                      <p className="text-[11px] text-white/30 font-medium">
                        루어/미끼
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {briefing.tackleAdvice.lureGuide.type}{" "}
                        {briefing.tackleAdvice.lureGuide.size}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {briefing.tackleAdvice.lureGuide.colors.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 bg-[#7dd3fc]/10 text-[#7dd3fc] text-[10px] rounded-full font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#c9a84c] mt-2">
                        {briefing.tackleAdvice.lureGuide.note}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 커뮤니티 조황 */}
            {briefing.communityInsights.length > 0 && (
              <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-[#7dd3fc]" />
                  커뮤니티 조황 인사이트
                </h2>
                <div className="space-y-2">
                  {briefing.communityInsights.map((ins, i) => (
                    <a
                      key={i}
                      href={ins.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-[#7dd3fc]/10 text-[#7dd3fc] rounded-full shrink-0 mt-0.5 font-semibold">
                          {ins.source}
                        </span>
                        <p className="text-xs text-white/70 line-clamp-2">
                          {ins.title}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* 날씨 체크리스트 */}
            <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <ListChecks size={20} className="text-[#c9a84c]" />
                날씨 체크리스트
              </h2>
              <div className="space-y-3">
                {briefing.weatherChecklist.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 text-white/60">
                      <ItemIcon name={item.icon} size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold ${priorityColor(item.priority)}`}
                      >
                        {item.item}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {item.reason}
                      </p>
                    </div>
                    {item.coupangQuery && (
                      <a
                        href={`https://www.coupang.com/np/search?q=${encodeURIComponent(item.coupangQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 transition-colors"
                      >
                        <ShoppingCart size={14} className="text-[#c9a84c]" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 기본 준비물 */}
            <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Backpack size={20} className="text-white/50" />
                기본 준비물
              </h2>
              <div className="space-y-2.5">
                {briefing.basicChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-8 flex items-center justify-center bg-white/5 rounded-xl shrink-0 text-white/60">
                      <ItemIcon name={item.icon} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">
                        {item.item}
                      </p>
                      <p className="text-[10px] text-white/30">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 장비 추천 (쿠팡) */}
            {briefing.gearSuggestions.length > 0 && (
              <section className="rounded-2xl bg-white/5 backdrop-blur-[12px] border border-white/10 p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#c9a84c]" />
                  추천 장비 (당일배송)
                </h2>
                <div className="space-y-2">
                  {briefing.gearSuggestions.map((g, i) => (
                    <a
                      key={i}
                      href={g.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                    >
                      <div className="size-10 flex items-center justify-center bg-white/5 rounded-xl shrink-0 text-white/60">
                        <ItemIcon name={g.icon} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {g.name}
                        </p>
                        <p className="text-[10px] text-white/50 truncate">
                          {g.reason}
                        </p>
                      </div>
                      <div className="size-8 flex items-center justify-center rounded-lg bg-[#c9a84c]/10 shrink-0">
                        <ExternalLink size={16} className="text-[#c9a84c]" />
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-[9px] text-white/20 text-center mt-3">
                  ※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로 수수료를
                  제공받습니다
                </p>
              </section>
            )}

            {/* 알림 설정 */}
            <section className="rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 p-5">
              <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Bell size={20} className="text-[#c9a84c]" />
                브리핑 알림 설정
              </h2>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                출조 전날{" "}
                {(briefing.tripPlan.alertHour ?? 14) < 12
                  ? `오전 ${briefing.tripPlan.alertHour ?? 14}시`
                  : `오후 ${(briefing.tripPlan.alertHour ?? 14) - 12}시`}
                에 이 브리핑을 알림으로 받습니다. 쿠팡 당일배송 주문 가능
                시간입니다.
              </p>
              <button
                onClick={handleSetAlert}
                disabled={alertSet}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  alertSet
                    ? "bg-[#7dd3fc]/20 text-[#7dd3fc] cursor-default"
                    : "bg-[#c9a84c] text-[#080d14] hover:opacity-90"
                }`}
              >
                {alertSet ? "알림이 설정되었습니다" : "출조 전날 알림 받기"}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
