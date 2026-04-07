"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { fetchWeather, WeatherData } from "@/services/weatherService";
import { fetchTideData, TideData } from "@/services/tideService";
import { fetchMarineData } from "@/services/marineService";
import {
  calculateBiteTime,
  BiteTimePrediction,
} from "@/services/biteTimeService";
import {
  generateRecommendation,
  ConciergeRecommendation,
  getInSeasonSpecies,
} from "@/services/conciergeService";
import {
  getGearRecommendations,
  GearRecommendation,
} from "@/services/affiliateService";
import { chatWithExpert, ChatMessage } from "@/services/fishExpertChatService";
// Import new tab components
import OverviewTab from "../components/concierge/OverviewTab";
import AIChatTab from "../components/concierge/AIChatTab";
import GearTab from "../components/concierge/GearTab";
import { ArrowLeft, Sparkles } from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

type TabType = "overview" | "chat" | "gear";

export default function ConciergePage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const { decreaseChatbotCredit, openPaywall } = useSubscriptionStore();
  const router = useRouter();

  // Core Data State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [biteTime, setBiteTime] = useState<BiteTimePrediction | null>(null);
  const [recommendation, setRecommendation] =
    useState<ConciergeRecommendation | null>(null);
  const [affiliateGear, setAffiliateGear] = useState<GearRecommendation[]>([]);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Expert Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  // In-season species (static for current month)
  const inSeasonSpecies = useMemo(() => getInSeasonSpecies(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!navigator.geolocation) {
          finalize(null, null, 37.5665, 126.978); // default: Seoul
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserCoords({ lat, lng });

            const [w, td, m] = await Promise.all([
              fetchWeather(lat, lng),
              fetchTideData(lat, lng),
              fetchMarineData(lat, lng),
            ]);
            setWeather(w);
            setTideData(td);
            finalize(w, td, lat, lng, m);
          },
          () => finalize(null, null, 37.5665, 126.978),
          { timeout: 5000, maximumAge: 300000 },
        );
      } catch {
        finalize(null, null, 37.5665, 126.978);
      }
    }

    const finalize = (
      w: WeatherData | null,
      td: TideData | null,
      lat: number,
      lng: number,
      m?: Awaited<ReturnType<typeof fetchMarineData>>,
    ) => {
      const bt = calculateBiteTime(w, td, m ?? null);
      setBiteTime(bt);
      const isPro = useSubscriptionStore.getState().isPro;
      const rec = generateRecommendation(w, td, bt, lat, lng, isPro);
      setRecommendation(rec);
      // Load affiliate gear based on recommended species
      if (rec) {
        const gear = getGearRecommendations(rec.species.name);
        setAffiliateGear(gear);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  const handleSendMessage = async (msg: string) => {
    if (!msg.trim()) return;

    // Check PRO Paywall
    if (!decreaseChatbotCredit()) {
      openPaywall("chatbot");
      return;
    }

    const userMsg: ChatMessage = { role: "user", text: msg };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const resp = await chatWithExpert(chatHistory, msg, selectedSpecies);
      setChatHistory((prev) => [...prev, { role: "model", text: resp }]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "model",
          text:
            locale === "ko"
              ? "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
              : "Sorry, an error occurred. Please try again later.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden page-enter bg-[#080d14]">
      {/* Header */}
      <header className="flex flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-3 sticky top-0 z-30 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-[#c9a84c] drop-shadow-sm" />
            <h1
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {locale === "ko" ? "AI 컨시어지" : "AI Concierge"}
            </h1>
          </div>
          <button
            aria-label={locale === "ko" ? "알림" : "Notifications"}
            className="size-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
          >
            <DynamicIcon
              name="notifications"
              size={20}
              className="text-white/70"
            />
          </button>
        </div>

        {/* Segmented Tab Control */}
        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
          <button
            onClick={() => {
              setActiveTab("overview");
              requestAnimationFrame(() => window.scrollTo({ top: 0 }));
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "overview"
                ? "bg-[#c9a84c] text-[#080d14] shadow-md scale-100"
                : "text-white/60 hover:bg-white/10 scale-95"
            }`}
          >
            {locale === "ko" ? "오늘의 조황" : "Overview"}
          </button>
          <button
            onClick={() => {
              setActiveTab("chat");
              requestAnimationFrame(() => window.scrollTo({ top: 0 }));
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "chat"
                ? "bg-[#c9a84c] text-[#080d14] shadow-md scale-100"
                : "text-white/60 hover:bg-white/10 scale-95"
            }`}
          >
            {locale === "ko" ? "AI 마스터" : "AI Master"}
          </button>
          <button
            onClick={() => {
              setActiveTab("gear");
              requestAnimationFrame(() => window.scrollTo({ top: 0 }));
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "gear"
                ? "bg-[#c9a84c] text-[#080d14] shadow-md scale-100"
                : "text-white/60 hover:bg-white/10 scale-95"
            }`}
          >
            {locale === "ko" ? "추천 장비" : "Gear"}
          </button>
        </div>
      </header>

      <main
        className={`flex-1 px-5 pt-5 ${activeTab === "chat" ? "pb-20 flex flex-col" : "pb-20"}`}
        style={
          activeTab === "chat" ? { height: "calc(100dvh - 175px)" } : undefined
        }
      >
        {activeTab === "overview" && (
          <OverviewTab
            locale={locale}
            loading={loading}
            weather={weather}
            tideData={tideData}
            biteTime={biteTime}
            recommendation={recommendation}
            inSeasonSpecies={inSeasonSpecies}
          />
        )}
        {activeTab === "chat" && (
          <AIChatTab
            locale={locale}
            chatHistory={chatHistory}
            chatInput={chatInput}
            chatLoading={chatLoading}
            selectedSpecies={selectedSpecies}
            setChatInput={setChatInput}
            setSelectedSpecies={setSelectedSpecies}
            onSend={handleSendMessage}
            onClear={() => setChatHistory([])}
          />
        )}
        {activeTab === "gear" && (
          <GearTab locale={locale} recommendedGear={affiliateGear} />
        )}
      </main>

      {/* Floating Action Buttons — hidden in chat tab */}
      {activeTab !== "chat" && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 flex gap-2 justify-center pointer-events-none z-30">
          <button
            onClick={() => router.push("/bite-forecast")}
            className="pointer-events-auto bg-[#c9a84c] text-[#080d14] px-4 py-2.5 rounded-full text-xs font-bold shadow-xl shadow-[#c9a84c]/30 flex items-center gap-1 hover:scale-105 transition-transform active:scale-95"
          >
            <DynamicIcon name="explore" size={14} />
            {locale === "ko" ? "포인트 추천" : "Spot Finder"}
          </button>

          <button
            onClick={() => {
              if (activeTab !== "gear") setActiveTab("gear");
            }}
            className="pointer-events-auto bg-[#7dd3fc]/20 border border-[#7dd3fc]/30 text-[#7dd3fc] px-4 py-2.5 rounded-full text-xs font-bold shadow-xl shadow-[#7dd3fc]/10 flex items-center gap-1 hover:scale-105 transition-transform active:scale-95"
          >
            <DynamicIcon name="check" size={14} />
            {locale === "ko" ? "출조 준비" : "Prep"}
          </button>

          <button
            onClick={() => router.push("/stats")}
            className="pointer-events-auto bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 hover:scale-105 transition-transform active:scale-95"
          >
            <DynamicIcon name="info" size={14} />
            {locale === "ko" ? "조황 리포트" : "Report"}
          </button>
        </div>
      )}
    </div>
  );
}
