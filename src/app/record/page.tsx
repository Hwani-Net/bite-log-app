"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { getDataService } from "@/services/dataServiceFactory";
import { enqueueOfflineRecord } from "@/services/offlineQueue";
import { useGeolocation } from "@/hooks/useGeolocation";
import { fetchWeather, WeatherData } from "@/services/weatherService";
import {
  fetchTideData,
  getCurrentPhase,
  type TideData,
} from "@/services/tideService";
import { legalityWarning, type LegalityWarning } from "@/lib/catchLegality";
import { identifyFish, FishAIResult } from "@/services/fishAIService";
import {
  parseVoiceInput,
  applyParsedResult,
  VoiceParsedResult,
} from "@/services/voiceParseService";
import {
  CatchRecord,
  FISH_SPECIES,
  TideRecordData,
  RecordVisibility,
} from "@/types";
import { listKnownBoats, type FavoriteBoat } from "@/services/myBoatService";
import {
  ArrowLeft,
  X,
  Plus,
  Minus,
  Camera,
  ChevronRight,
  Mic,
  Zap,
  Fish,
  Ruler,
  MapPin,
  Cloud,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  FileEdit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Waves,
  Anchor,
} from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

export default function RecordPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const geo = useGeolocation();

  // ===== 2-Step: photo → form (or skip straight to form) =====
  const [step, setStep] = useState<"photo" | "form">("photo");

  const [legalWarning, setLegalWarning] = useState<LegalityWarning | null>(
    null,
  );
  // ===== Form state =====
  // toISOString()은 UTC라 KST 자정~9시에 어제 날짜가 기본이 되는 함정 —
  // 이 세션에서만 네 번째 발견된 같은 버그 클래스(src/lib/localDate.ts 참조).
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  // 잡은 시각 — 기본값은 폼을 연 지금 시각. 기록 데이터에 시간 축을 넣는
  // 첫 필드(이전엔 "저장 버튼 누른 시각"만 있어 시간 분석이 전부 오염).
  const [caughtTime, setCaughtTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [locationName, setLocationName] = useState("");
  const [species, setSpecies] = useState("");
  // "탄 배" — booking에서 쌓인 "내 선사 카드" 이력(myBoatService)에서 고른다.
  // localStorage 라 client-only, 빈 배열로 시작해도 무해(필드 자체가 안 보임).
  const [boatUid, setBoatUid] = useState("");
  const [knownBoats, setKnownBoats] = useState<FavoriteBoat[]>([]);
  useEffect(() => {
    setKnownBoats(listKnownBoats());
  }, []);
  const [count, setCount] = useState(1);
  const [sizeCm, setSizeCm] = useState("");
  const [memo, setMemo] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  // fetchTideData의 원본 TideData를 그대로 든다 — 저장 시점에 필요한
  // 필드만 TideRecordData로 추려 담는다.
  const [tide, setTide] = useState<TideData | null>(null);
  const [tideLoading, setTideLoading] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("auto");
  const [autoDetected, setAutoDetected] = useState(false);
  // #6 김짜증: 비공개가 기본
  const [visibility, setVisibility] = useState<RecordVisibility>("private");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<FishAIResult | null>(null);

  // ===== Voice recording state =====
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "review">(
    "idle",
  );
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<VoiceParsedResult | null>(
    null,
  );
  const [voiceFilled, setVoiceFilled] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ===== Auto-detect GPS when entering form step =====
  useEffect(() => {
    if (step === "form" && locationMode === "auto" && !autoDetected) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ===== Auto-trigger AI when photo is uploaded (background, no separate step) =====
  useEffect(() => {
    if (photos.length > 0 && !aiResult && !aiAnalyzing) {
      handleAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // ===== Auto-fetch weather when coordinates are confirmed (any path) =====
  useEffect(() => {
    if (gpsLat == null || gpsLng == null) return;
    if (weather || weatherLoading) return; // already fetched or in progress
    setWeatherLoading(true);
    fetchWeather(gpsLat, gpsLng)
      .then((w) => setWeather(w))
      .finally(() => setWeatherLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsLat, gpsLng]);

  async function detectLocation() {
    const result = await geo.requestLocation();
    if (result) {
      setLocationName(result.locationName);
      setGpsLat(result.position.lat);
      setGpsLng(result.position.lng);
      setAutoDetected(true);

      setWeatherLoading(true);
      setTideLoading(true);

      Promise.all([
        fetchWeather(result.position.lat, result.position.lng),
        fetchTideData(result.position.lat, result.position.lng),
      ])
        .then(([w, t]) => {
          setWeather(w);
          setTide(t);
        })
        .finally(() => {
          setWeatherLoading(false);
          setTideLoading(false);
        });
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files)
      .slice(0, 3 - photos.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setPhotos((prev) =>
              [...prev, ev.target!.result as string].slice(0, 3),
            );
          }
        };
        reader.readAsDataURL(file);
      });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setAiResult(null);
    setSpecies("");
  }

  async function handleAIAnalysis() {
    if (photos.length === 0 || aiAnalyzing) return;
    setAiAnalyzing(true);
    setAiResult(null);
    try {
      const result = await identifyFish(photos[0]);
      if (result && result.species !== "unknown") {
        setAiResult(result);
        const matched = FISH_SPECIES.find((s) => s === result.koreanName);
        setSpecies(matched || result.koreanName);
        // Auto-fill size if AI estimated it and user hasn't entered one
        if (result.estimatedSizeCm && !sizeCm) {
          setSizeCm(String(result.estimatedSizeCm));
        }
      } else {
        setAiResult(result);
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
    } finally {
      setAiAnalyzing(false);
    }
  }

  // 저장 직전 규정 검사(3차 GOAL-6) — 금어기·체장 미달이면 경고 패널을
  // 띄우고 멈춘다. 저장은 패널의 "그래도 저장"으로만 진행(방류했을 수
  // 있으니 차단이 아니라 확인). 합법·규정DB 밖 어종은 기존 흐름 그대로.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!species) return;
    const warning = legalityWarning(
      species,
      sizeCm === "" ? null : Number(sizeCm),
      date,
    );
    if (warning) {
      setLegalWarning(warning);
      return;
    }
    await persistRecord();
  }

  // 경고가 떠 있는 동안 판정에 쓰인 필드가 바뀌면 경고를 무효화한다 —
  // 안 그러면 "그래도 저장"이 경고받지 않은 새 내용을 그대로 저장한다.
  useEffect(() => {
    setLegalWarning(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, sizeCm, date]);

  // 저장 버튼이 fixed 하단 바라 경고 패널이 뷰포트 밖에 남을 수 있다 —
  // 뜨는 순간 패널로 스크롤해 준다.
  useEffect(() => {
    if (legalWarning) {
      document
        .querySelector('[data-testid="legality-warning"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [legalWarning]);

  async function persistRecord() {
    setLegalWarning(null);
    setSaving(true);

    try {
      const recordData: Omit<CatchRecord, "id" | "createdAt" | "updatedAt"> = {
        date,
        caughtTime: caughtTime || undefined,
        location: {
          name:
            locationName.trim() ||
            (locale === "ko" ? "위치 미지정" : "Unknown"),
          lat: gpsLat,
          lng: gpsLng,
        },
        species,
        count,
        sizeCm: sizeCm ? Number(sizeCm) : undefined,
        photos,
        memo: memo.trim() || undefined,
        weather: weather
          ? {
              condition: weather.condition,
              tempC: weather.tempC,
              windSpeed: weather.windSpeed,
              humidity: weather.humidity,
            }
          : undefined,
        // 물흐름 스냅샷을 함께 보존 — getCurrentPhase는 지금까지 화면
        // 표시용으로만 계산되고 저장 시점에 버려지고 있었다.
        // mock 폴백 물때는 저장하지 않는다 — 지어낸 값이 통계·조건표를
        // 오염시키면 안 된다(4차 GOAL-5).
        tide: tide && !tide.mocked
          ? {
              stationName: tide.stationName,
              tides: tide.tides,
              currentPhase: getCurrentPhase(tide)?.label ?? undefined,
            }
          : undefined,
        visibility,
        boatUid: boatUid || undefined,
      };

      try {
        await getDataService().addCatchRecord(recordData);
      } catch {
        await enqueueOfflineRecord(recordData);
      }
      router.push("/");
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  // #3 김짜증: 빠른 기록 = 바로 폼으로
  function skipToForm() {
    setStep("form");
  }

  // ===== Voice Recording (Web Speech API) =====
  function startVoiceRecording() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult:
        | ((event: {
            results: ArrayLike<ArrayLike<{ transcript: string }>>;
          }) => void)
        | null;
      onerror: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognitionAPI =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert(
        locale === "ko"
          ? "이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 또는 Samsung Internet을 사용해 주세요."
          : "Speech recognition not supported. Please use Chrome.",
      );
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    setVoiceState("listening");
    setVoiceTranscript("");
    setVoiceParsed(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setVoiceTranscript(transcript);
      const parsed = parseVoiceInput(transcript);
      setVoiceParsed(parsed);
      setVoiceState("review");
    };

    recognition.onerror = () => {
      setVoiceState("idle");
    };

    recognition.onend = () => {
      if (voiceState === "listening") setVoiceState("idle");
    };

    recognition.start();
  }

  function cancelVoice() {
    recognitionRef.current?.stop();
    setVoiceState("idle");
    setVoiceTranscript("");
    setVoiceParsed(null);
  }

  function confirmVoice() {
    if (!voiceParsed) return;
    const filled = applyParsedResult(voiceParsed, {
      setSpecies,
      setCount,
      setSizeCm,
      setLocationName,
    });
    setVoiceFilled(filled);
    setVoiceState("idle");
    setStep("form");
  }

  // After photo taken, go to form
  function proceedToForm() {
    setStep("form");
  }

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/30 transition-all text-white placeholder:text-white/30 text-base";

  return (
    <div className="page-enter relative z-10 min-h-screen bg-[#080d14]">
      {/* Header — #4: 이전 버튼은 여기에 (하단 아님) */}
      <header className="sticky top-0 z-50 flex items-center bg-[#080d14]/60 backdrop-blur-xl px-4 py-3 justify-between border-b border-white/5">
        <button
          onClick={() =>
            step === "form" && photos.length > 0
              ? setStep("photo")
              : router.back()
          }
          aria-label="뒤로가기"
          className="text-white/70 flex size-11 shrink-0 items-center justify-center hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[0.1em] uppercase flex-1 text-center">
          {t("record.title")}
        </h2>
        <div className="w-11" />
      </header>

      {/* ===== STEP: PHOTO (optional) ===== */}
      {step === "photo" && (
        <div className="px-4 pt-6 pb-28 space-y-5 animate-fadeIn">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-6 py-14 transition-all hover:border-[#c9a84c]/40 cursor-pointer"
          >
            {photos.length > 0 ? (
              <div className="flex gap-3 flex-wrap justify-center">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(i);
                      }}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                    <Plus size={28} />
                  </div>
                )}
                {/* AI analyzing indicator on photo */}
                {aiAnalyzing && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-violet-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" />
                    {locale === "ko" ? "AI 분석 중..." : "Analyzing..."}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 p-6 rounded-full">
                  <Camera size={48} className="text-[#c9a84c]" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-white text-xl font-bold leading-tight">
                    {t("record.photoGuide")}
                  </p>
                  <p className="text-white/60 text-sm font-normal text-center">
                    {t("record.photoSubGuide")}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-[#c9a84c] text-[#080d14] text-base font-bold shadow-lg shadow-[#c9a84c]/20 transition-transform active:scale-95 gap-2"
                >
                  <Camera size={18} />
                  {t("record.addPhoto")}
                </button>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {/* AI result badge (shows while still on photo step) */}
          {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
            <div className="flex items-center gap-3 bg-[#7dd3fc]/5 border border-[#7dd3fc]/20 rounded-xl p-3">
              <span className="text-xs font-bold text-[#7dd3fc] w-8 text-center">
                {aiResult.koreanName.slice(0, 2)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#7dd3fc]">
                  {aiResult.koreanName}{" "}
                  <span className="font-normal text-[#7dd3fc]/60">
                    ({aiResult.confidence}%)
                  </span>
                </p>
                <p className="text-xs text-white/60">{aiResult.description}</p>
                {(aiResult.estimatedSizeCm || aiResult.estimatedWeightKg) && (
                  <p className="text-xs text-[#7dd3fc]/70 mt-0.5">
                    {aiResult.estimatedSizeCm
                      ? `약 ${aiResult.estimatedSizeCm}cm`
                      : ""}
                    {aiResult.estimatedSizeCm && aiResult.estimatedWeightKg
                      ? " · "
                      : ""}
                    {aiResult.estimatedWeightKg
                      ? `약 ${aiResult.estimatedWeightKg}kg`
                      : ""}
                  </p>
                )}
                {aiResult.fishingTip && (
                  <p className="text-xs text-[#c9a84c]/80 mt-0.5">
                    {aiResult.fishingTip}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="fixed bottom-[84px] left-0 right-0 flex flex-col gap-3 justify-center items-center p-4 bg-[#080d14]/60 backdrop-blur-2xl z-50 border-t border-white/5">
            <div className="w-full max-w-lg flex flex-col gap-2">
              {/* Voice review panel */}
              {voiceState === "review" && voiceParsed && (
                <div className="bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-2xl p-4 mb-1">
                  <p className="text-xs text-[#c9a84c] font-semibold mb-1">
                    인식된 내용
                  </p>
                  <p className="text-sm text-white/70 mb-2">
                    &quot;{voiceTranscript}&quot;
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {voiceParsed.species && (
                      <span className="text-xs px-2 py-1 bg-[#c9a84c]/10 text-[#c9a84c] rounded-full font-medium">
                        {voiceParsed.species}
                      </span>
                    )}
                    {voiceParsed.count && (
                      <span className="text-xs px-2 py-1 bg-[#c9a84c]/10 text-[#c9a84c] rounded-full font-medium">
                        × {voiceParsed.count}마리
                      </span>
                    )}
                    {voiceParsed.sizeCm && (
                      <span className="text-xs px-2 py-1 bg-[#c9a84c]/10 text-[#c9a84c] rounded-full font-medium">
                        {voiceParsed.sizeCm}cm
                      </span>
                    )}
                    {voiceParsed.locationHint && (
                      <span className="text-xs px-2 py-1 bg-[#c9a84c]/10 text-[#c9a84c] rounded-full font-medium">
                        {voiceParsed.locationHint}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelVoice}
                      className="flex-1 h-11 rounded-xl border border-white/10 text-white/60 font-semibold text-sm active:scale-95 transition-transform"
                    >
                      다시 말하기
                    </button>
                    <button
                      type="button"
                      onClick={confirmVoice}
                      className="flex-1 h-11 rounded-xl bg-[#c9a84c] text-[#080d14] font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-[#c9a84c]/20"
                    >
                      확인 → 기록
                    </button>
                  </div>
                </div>
              )}

              {/* Voice listening indicator */}
              {voiceState === "listening" && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-semibold text-red-400">
                      듣는 중... 말씀해 주세요
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelVoice}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}

              {voiceState === "idle" &&
                (photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={proceedToForm}
                    className="w-full h-14 rounded-2xl bg-[#c9a84c] text-[#080d14] font-bold text-lg shadow-xl shadow-[#c9a84c]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    {t("record.next")}
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {/*  Voice record button */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="flex-1 h-14 rounded-2xl glass-morphism border border-[#7dd3fc]/20 text-[#7dd3fc] font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Mic size={20} />
                      {locale === "ko" ? "음성으로 기록" : "Voice Record"}
                    </button>
                    {/*  Quick form button */}
                    <button
                      type="button"
                      onClick={skipToForm}
                      className="h-14 px-4 rounded-2xl bg-[#c9a84c] text-[#080d14] font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Zap size={18} />
                      {locale === "ko" ? "직접 입력" : "Manual"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: FORM (everything in one scroll) ===== */}
      {step === "form" && voiceFilled.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-xl p-3 animate-fadeIn">
          <Mic size={16} className="text-[#c9a84c] mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#c9a84c] mb-0.5">
              음성으로 자동 채움
            </p>
            <p className="text-xs text-white/50">{voiceFilled.join(" · ")}</p>
          </div>
          <button
            type="button"
            onClick={() => setVoiceFilled([])}
            className="ml-auto text-white/20 hover:text-white/50"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {step === "form" && (
        <form
          id="record-form"
          onSubmit={handleSubmit}
          className="px-4 pt-4 pb-28 space-y-4 animate-fadeIn"
        >
          {/* Photo summary (if any) */}
          {photos.length > 0 && (
            <div className="flex items-center gap-3 glass-morphism border border-white/5 rounded-2xl p-3">
              <div className="flex gap-1.5">
                {photos.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p}
                      alt={`#${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60">
                  {photos.length}
                  {locale === "ko" ? "장 사진" : " photo(s)"}
                </p>
                {aiAnalyzing && (
                  <p className="text-xs text-[#7dd3fc] animate-pulse flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    {locale === "ko" ? "AI 분석 중..." : "Analyzing..."}
                  </p>
                )}
                {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
                  <p className="text-xs font-medium text-[#c9a84c]">
                    AI: {aiResult.koreanName} ({aiResult.confidence}%)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ===== Species — #2: AI result is just a pre-fill, not a separate step ===== */}
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <Fish size={16} className="text-[#c9a84c]" />
                {t("record.species")}
                {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c] font-medium">
                    AI {locale === "ko" ? "추천" : "suggested"}
                  </span>
                )}
              </span>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className={`${inputCls} appearance-none`}
                required
              >
                <option value="" disabled>
                  {t("record.selectSpecies")}
                </option>
                {FISH_SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 탄 배 — booking에서 즐겨찾기·판정·승선 이력을 남긴 배가 있을
              때만 보인다. 없으면 필드째로 숨겨서 booking을 안 쓰는 사용자의
              기록 흐름엔 아무 변화가 없다. */}
          {knownBoats.length > 0 && (
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <label className="flex flex-col gap-2">
                <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                  <Anchor size={16} className="text-[#c9a84c]" aria-hidden="true" />
                  {t("record.boat")}
                </span>
                <select
                  value={boatUid}
                  onChange={(e) => setBoatUid(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">{t("record.selectBoat")}</option>
                  {knownBoats.map((b) => (
                    <option key={b.uid} value={b.uid}>
                      {b.latest?.name ?? `선박 #${b.uid}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Count + Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-morphism border border-white/5 rounded-2xl p-4 overflow-hidden">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2 mb-3">
                <Fish size={16} className="text-[#c9a84c] shrink-0" />
                <span className="truncate">{t("record.count")}</span>
              </span>
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="size-11 flex items-center justify-center bg-white/10 rounded-lg text-white/60 active:scale-95 transition-transform"
                >
                  <Minus size={20} />
                </button>
                <span className="text-2xl font-bold text-white">{count}</span>
                <button
                  type="button"
                  onClick={() => setCount((c) => c + 1)}
                  className="size-11 flex items-center justify-center bg-[#c9a84c] rounded-lg text-[#080d14] active:scale-95 transition-transform"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* #5 김짜증: 사이즈 placeholder "선택사항" */}
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <label className="flex flex-col gap-2">
                <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                  <Ruler size={16} className="text-[#c9a84c]" />
                  {t("record.size")}
                </span>
                <input
                  type="number"
                  value={sizeCm}
                  onChange={(e) => setSizeCm(e.target.value)}
                  placeholder={locale === "ko" ? "선택사항" : "Optional"}
                  min={0}
                  max={300}
                  className={`${inputCls} text-center font-bold`}
                />
              </label>
            </div>
          </div>

          {/* ===== Location Card — GPS auto in background ===== */}
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <MapPin size={16} className="text-[#c9a84c]" />
                {t("record.location")}
              </span>
              <div className="flex items-center gap-2">
                {locationMode === "auto" ? (
                  <button
                    type="button"
                    onClick={() => setLocationMode("manual")}
                    className="text-xs text-white/30 hover:text-[#c9a84c] transition-colors py-1 px-2"
                  >
                    {t("record.manualInput")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode("auto");
                      detectLocation();
                    }}
                    className="text-xs text-[#c9a84c] font-semibold py-1 px-2"
                  >
                    GPS
                  </button>
                )}
              </div>
            </div>

            {/* GPS status */}
            {locationMode === "auto" && (
              <div className="mb-2">
                {geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-[#7dd3fc] animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    {t("record.detectingLocation")}
                  </div>
                )}
                {autoDetected && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle size={14} />
                    {t("record.locationDetected")}
                    {gpsLat && gpsLng && (
                      <span className="text-white/30 ml-1">
                        ({gpsLat.toFixed(4)}, {gpsLng.toFixed(4)})
                      </span>
                    )}
                  </div>
                )}
                {geo.error && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <AlertTriangle size={14} />
                    {t("record.locationFailed")}
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="text-[#c9a84c] font-semibold underline ml-1 py-1"
                    >
                      {t("record.retryLocation")}
                    </button>
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t("record.locationHint")}
              className={inputCls}
            />
          </div>

          {/* Weather (auto, collapsed) */}
          {(weather || weatherLoading) && (
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2 mb-3">
                <Cloud size={16} className="text-[#7dd3fc]" />
                {t("record.weather")}
              </span>
              {weatherLoading ? (
                <div className="flex items-center gap-2 text-xs text-[#7dd3fc] animate-pulse py-1">
                  <Loader2 size={14} className="animate-spin" />
                  {t("record.loadingWeather")}
                </div>
              ) : (
                weather && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#c9a84c]/10">
                      <DynamicIcon
                        name={weather.icon}
                        size={20}
                        className="text-[#c9a84c]"
                      />
                      <span className="text-[10px] font-semibold text-white/50 text-center leading-tight">
                        {locale === "ko"
                          ? weather.conditionKo
                          : weather.conditionEn}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-500/10">
                      <Thermometer size={20} className="text-orange-400" />
                      <span className="text-xs font-bold text-white">
                        {weather.tempC}°C
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#7dd3fc]/10">
                      <Wind size={20} className="text-[#7dd3fc]" />
                      <span className="text-xs font-bold text-white">
                        {weather.windSpeed}m/s
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#7dd3fc]/10">
                      <Droplets size={20} className="text-[#7dd3fc]" />
                      <span className="text-xs font-bold text-white">
                        {weather.humidity}%
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Tide (auto, collapsed) */}
          {(tide || tideLoading) && (
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Waves size={14} className="text-[#7dd3fc]" />
                <span className="text-xs font-bold text-white/60">
                  {locale === "ko" ? "물때 정보" : "Tide"}
                </span>
                {tideLoading && (
                  <span className="text-[10px] text-[#7dd3fc] animate-pulse ml-auto">
                    {t("record.detectingLocation")}
                  </span>
                )}
              </div>
              {!tideLoading && tide ? (
                <div>
                  <div className="text-[10px] text-white/30 mb-1">
                    {tide.stationName}
                    {tide.mocked && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                        예시 — 기록엔 저장 안 됨
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {tide.tides.map((t, i) => (
                      <span
                        key={i}
                        className={`flex items-center gap-1 font-semibold ${t.type === "High" ? "text-[#7dd3fc]" : "text-[#c9a84c]"}`}
                      >
                        {t.type === "High"
                          ? locale === "ko"
                            ? "▲ 고조"
                            : "▲ High"
                          : locale === "ko"
                            ? "▼ 저조"
                            : "▼ Low"}{" "}
                        {t.time}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-6 flex items-center">
                  <div className="w-1/2 h-4 bg-white/10 rounded animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Date + 잡은 시각 */}
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <div className="flex gap-3">
              <label className="flex flex-col gap-2 flex-1">
                <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                  <Calendar size={16} className="text-[#c9a84c]" />
                  {t("record.date")}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-2 w-32">
                <span className="text-white/70 text-sm font-semibold">
                  {locale === "ko" ? "잡은 시각" : "Time"}
                </span>
                <input
                  type="time"
                  value={caughtTime}
                  onChange={(e) => setCaughtTime(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Memo */}
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <FileEdit size={16} className="text-[#c9a84c]" />
                {t("record.memo")}
              </span>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={t("record.memoHint")}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </label>
          </div>

          {/* Visibility — #6: 비공개 기본 */}
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DynamicIcon
                  name={visibility === "public" ? "public" : "lock"}
                  size={16}
                  className="text-[#c9a84c]"
                />
                <div>
                  <span className="text-sm font-semibold text-white/70">
                    {locale === "ko" ? "조과 공개" : "Share to Feed"}
                  </span>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {visibility === "public"
                      ? locale === "ko"
                        ? "다른 낚시인들이 내 조과를 볼 수 있어요"
                        : "Others can see your catch"
                      : locale === "ko"
                        ? "나만 볼 수 있어요"
                        : "Only you can see this"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setVisibility((v) => (v === "private" ? "public" : "private"))
                }
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${visibility === "public" ? "bg-[#c9a84c]" : "bg-white/10"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${visibility === "public" ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {/* 규정 경고(3차 GOAL-6) — 금어기·체장 미달을 저장 전에 알린다.
              벌칙·근거 조항까지 보여주되, 방류했을 수 있으니 저장 자체는
              사용자의 선택으로 남긴다. */}
          {legalWarning && (
            <div
              data-testid="legality-warning"
              className="rounded-2xl border border-red-400/40 bg-red-400/10 p-4 space-y-2"
            >
              {/* alert는 헤딩에만 — 패널 전체를 걸면 위반·벌칙·안내가 통째로
                  낭독돼 과하다. */}
              <p role="alert" className="text-sm font-bold text-red-300">
                저장 전에 확인하세요 — 수산자원 규정에 걸릴 수 있어요
              </p>
              {legalWarning.violations.map((v) => (
                <p key={v} className="text-xs text-white/85">
                  · {v}
                </p>
              ))}
              {legalWarning.penaltyNote && (
                <p className="text-xs text-amber-200/90 font-semibold">
                  {legalWarning.penaltyNote}
                </p>
              )}
              {legalWarning.legalRef && (
                <p className="text-[10px] text-white/50">
                  근거: {legalWarning.legalRef}
                </p>
              )}
              <p className="text-[11px] text-white/60">
                방류하셨다면 그대로 기록하셔도 됩니다. 본 안내는 현재 고시
                기준의 참고 정보이며 법적 효력이 없어요 — 과거 날짜 기록은
                당시 규정과 다를 수 있고, 최신 기준은 해양수산부 고시를
                확인하세요.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={persistRecord}
                  disabled={saving}
                  className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-red-400/20 border border-red-400/40 text-red-200 disabled:opacity-50"
                >
                  {locale === "ko" ? "그래도 저장" : "Save anyway"}
                </button>
                <button
                  type="button"
                  onClick={() => setLegalWarning(null)}
                  className="px-4 text-sm py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60"
                >
                  {locale === "ko" ? "다시 확인" : "Review"}
                </button>
              </div>
            </div>
          )}

          {/* #4: 하단은 저장 버튼 하나만 — 풀 와이드 */}
          <div className="fixed bottom-[84px] left-0 right-0 flex justify-center p-4 bg-[#080d14]/60 backdrop-blur-2xl z-50 border-t border-white/5">
            <div className="w-full max-w-lg">
              <button
                type="submit"
                disabled={saving || !species}
                className="w-full h-14 rounded-2xl bg-[#c9a84c] text-[#080d14] font-bold text-lg shadow-xl shadow-[#c9a84c]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 disabled:shadow-none"
              >
                {saving
                  ? locale === "ko"
                    ? "저장 중..."
                    : "Saving..."
                  : t("record.submit")}
              </button>
            </div>
          </div>
        </form>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
