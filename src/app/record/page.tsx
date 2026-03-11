'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { enqueueOfflineRecord } from '@/services/offlineQueue';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchWeather, WeatherData } from '@/services/weatherService';
import { fetchTideData } from '@/services/tideService';
import { identifyFish, FishAIResult } from '@/services/fishAIService';
import { parseVoiceInput, applyParsedResult, VoiceParsedResult } from '@/services/voiceParseService';
import { CatchRecord, FISH_SPECIES, TideRecordData, RecordVisibility } from '@/types';

export default function RecordPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const geo = useGeolocation();

  // ===== 2-Step: photo → form (or skip straight to form) =====
  const [step, setStep] = useState<'photo' | 'form'>('photo');

  // ===== Form state =====
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [locationName, setLocationName] = useState('');
  const [species, setSpecies] = useState('');
  const [count, setCount] = useState(1);
  const [sizeCm, setSizeCm] = useState('');
  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [tide, setTide] = useState<TideRecordData | null>(null);
  const [tideLoading, setTideLoading] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | undefined>();
  const [gpsLng, setGpsLng] = useState<number | undefined>();
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [autoDetected, setAutoDetected] = useState(false);
  // #6 김짜증: 비공개가 기본
  const [visibility, setVisibility] = useState<RecordVisibility>('private');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<FishAIResult | null>(null);

  // ===== Voice recording state =====
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'review'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<VoiceParsedResult | null>(null);
  const [voiceFilled, setVoiceFilled] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ===== Auto-detect GPS when entering form step =====
  useEffect(() => {
    if (step === 'form' && locationMode === 'auto' && !autoDetected) {
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
        fetchTideData(result.position.lat, result.position.lng)
      ]).then(([w, t]) => {
        setWeather(w);
        setTide(t);
      }).finally(() => {
        setWeatherLoading(false);
        setTideLoading(false);
      });
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - photos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos((prev) => [...prev, ev.target!.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setAiResult(null);
    setSpecies('');
  }

  async function handleAIAnalysis() {
    if (photos.length === 0 || aiAnalyzing) return;
    setAiAnalyzing(true);
    setAiResult(null);
    try {
      const result = await identifyFish(photos[0]);
      if (result && result.species !== 'unknown') {
        setAiResult(result);
        const matched = FISH_SPECIES.find(s => s === result.koreanName);
        setSpecies(matched || result.koreanName);
        // Auto-fill size if AI estimated it and user hasn't entered one
        if (result.estimatedSizeCm && !sizeCm) {
          setSizeCm(String(result.estimatedSizeCm));
        }
      } else {
        setAiResult(result);
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!species) return;
    setSaving(true);

    try {
      const recordData: Omit<CatchRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        date,
        location: {
          name: locationName.trim() || (locale === 'ko' ? '위치 미지정' : 'Unknown'),
          lat: gpsLat,
          lng: gpsLng,
        },
        species,
        count,
        sizeCm: sizeCm ? Number(sizeCm) : undefined,
        photos,
        memo: memo.trim() || undefined,
        weather: weather ? {
          condition: weather.condition,
          tempC: weather.tempC,
          windSpeed: weather.windSpeed,
          humidity: weather.humidity,
        } : undefined,
        tide: tide || undefined,
        visibility,
      };

      try {
        await getDataService().addCatchRecord(recordData);
      } catch {
        await enqueueOfflineRecord(recordData);
      }
      router.push('/');
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  // #3 김짜증: 빠른 기록 = 바로 폼으로
  function skipToForm() {
    setStep('form');
  }

  // ===== Voice Recording (Web Speech API) =====
  function startVoiceRecording() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert(locale === 'ko' ? '이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome 또는 Samsung Internet을 사용해 주세요.' : 'Speech recognition not supported. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    setVoiceState('listening');
    setVoiceTranscript('');
    setVoiceParsed(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setVoiceTranscript(transcript);
      const parsed = parseVoiceInput(transcript);
      setVoiceParsed(parsed);
      setVoiceState('review');
    };

    recognition.onerror = () => {
      setVoiceState('idle');
    };

    recognition.onend = () => {
      if (voiceState === 'listening') setVoiceState('idle');
    };

    recognition.start();
  }

  function cancelVoice() {
    recognitionRef.current?.stop();
    setVoiceState('idle');
    setVoiceTranscript('');
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
    setVoiceState('idle');
    setStep('form');
  }

  // After photo taken, go to form
  function proceedToForm() {
    setStep('form');
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-900 placeholder:text-slate-400 text-base';

  return (
    <div className="page-enter relative z-10 min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Header — #4: 이전 버튼은 여기에 (하단 아님) */}
      <header className="sticky top-0 z-50 flex items-center bg-white/90 backdrop-blur-md px-4 py-3 justify-between border-b border-slate-100">
        <button
          onClick={() => step === 'form' && photos.length > 0 ? setStep('photo') : router.back()}
          className="text-slate-900 flex size-11 shrink-0 items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('record.title')}</h2>
        <div className="w-11" />
      </header>

      {/* ===== STEP: PHOTO (optional) ===== */}
      {step === 'photo' && (
        <div className="px-4 pt-6 pb-32 space-y-5 animate-fadeIn">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 transition-all hover:border-primary/50 cursor-pointer shadow-sm"
          >
            {photos.length > 0 ? (
              <div className="flex gap-3 flex-wrap justify-center">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-lg ring-2 ring-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-3xl">add</span>
                  </div>
                )}
                {/* AI analyzing indicator on photo */}
                {aiAnalyzing && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-violet-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    {locale === 'ko' ? 'AI 분석 중...' : 'Analyzing...'}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-primary/10 to-teal-accent/10 p-6 rounded-full">
                  <span className="material-symbols-outlined text-5xl text-primary">add_photo_alternate</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-slate-900 text-xl font-bold leading-tight">{t('record.photoGuide')}</p>
                  <p className="text-slate-400 text-sm font-normal text-center">
                    {t('record.photoSubGuide')}
                  </p>
                </div>
                <button type="button" className="mt-3 flex min-w-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-gradient-to-r from-primary to-teal-accent text-white text-base font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95 gap-2">
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                  {t('record.addPhoto')}
                </button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} className="hidden" />

          {/* AI result badge (shows while still on photo step) */}
          {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-2xl">🐟</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700">{aiResult.koreanName} <span className="font-normal text-emerald-500">({aiResult.confidence}%)</span></p>
                <p className="text-xs text-emerald-600">{aiResult.description}</p>
                {(aiResult.estimatedSizeCm || aiResult.estimatedWeightKg) && (
                  <p className="text-xs text-emerald-500 mt-0.5">
                    📏 {aiResult.estimatedSizeCm ? `약 ${aiResult.estimatedSizeCm}cm` : ''}
                    {aiResult.estimatedSizeCm && aiResult.estimatedWeightKg ? ' · ' : ''}
                    {aiResult.estimatedWeightKg ? `약 ${aiResult.estimatedWeightKg}kg` : ''}
                  </p>
                )}
                {aiResult.fishingTip && (
                  <p className="text-xs text-teal-600 mt-0.5">💡 {aiResult.fishingTip}</p>
                )}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="fixed bottom-[84px] left-0 right-0 flex flex-col gap-3 justify-center items-center p-4 bg-white/90 backdrop-blur-md z-50 border-t border-slate-100">
            <div className="w-full max-w-lg flex flex-col gap-2">
              {/* Voice review panel */}
              {voiceState === 'review' && voiceParsed && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-1">
                  <p className="text-xs text-violet-500 font-semibold mb-1">🎤 인식된 내용</p>
                  <p className="text-sm text-slate-700 mb-2">&quot;{voiceTranscript}&quot;</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {voiceParsed.species && <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">🐟 {voiceParsed.species}</span>}
                    {voiceParsed.count && <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">× {voiceParsed.count}마리</span>}
                    {voiceParsed.sizeCm && <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">📏 {voiceParsed.sizeCm}cm</span>}
                    {voiceParsed.locationHint && <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">📍 {voiceParsed.locationHint}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelVoice} className="flex-1 h-11 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm active:scale-95 transition-transform">다시 말하기</button>
                    <button type="button" onClick={confirmVoice} className="flex-1 h-11 rounded-xl bg-violet-500 text-white font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-violet-200">확인 → 기록</button>
                  </div>
                </div>
              )}

              {/* Voice listening indicator */}
              {voiceState === 'listening' && (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-semibold text-red-600">듣는 중... 말씀해 주세요</span>
                  </div>
                  <button type="button" onClick={cancelVoice} className="text-xs text-slate-400 hover:text-red-500 transition-colors">취소</button>
                </div>
              )}

              {voiceState === 'idle' && (
                photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={proceedToForm}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-teal-accent text-white font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    {t('record.next')}
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {/* 🎤 Voice record button */}
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-base shadow-xl shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-xl">mic</span>
                      {locale === 'ko' ? '음성으로 기록' : 'Voice Record'}
                    </button>
                    {/* ⚡ Quick form button */}
                    <button
                      type="button"
                      onClick={skipToForm}
                      className="h-14 px-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-lg">bolt</span>
                      {locale === 'ko' ? '직접 입력' : 'Manual'}
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: FORM (everything in one scroll) ===== */}
      {step === 'form' && voiceFilled.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl p-3 animate-fadeIn">
          <span className="material-symbols-outlined text-violet-500 text-base mt-0.5">mic</span>
          <div>
            <p className="text-xs font-semibold text-violet-700 mb-0.5">음성으로 자동 채움</p>
            <p className="text-xs text-violet-500">{voiceFilled.join(' · ')}</p>
          </div>
          <button type="button" onClick={() => setVoiceFilled([])} className="ml-auto text-slate-300 hover:text-slate-500">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
      {step === 'form' && (
        <form id="record-form" onSubmit={handleSubmit} className="px-4 pt-4 pb-32 space-y-4 animate-fadeIn">

          {/* Photo summary (if any) */}
          {photos.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
              <div className="flex gap-1.5">
                {photos.slice(0, 3).map((p, i) => (
                  <div key={i} className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`#${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{photos.length}{locale === 'ko' ? '장 사진' : ' photo(s)'}</p>
                {aiAnalyzing && (
                  <p className="text-xs text-violet-500 animate-pulse flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                    {locale === 'ko' ? 'AI 분석 중...' : 'Analyzing...'}
                  </p>
                )}
                {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
                  <p className="text-xs font-medium text-emerald-600">🤖 AI: {aiResult.koreanName} ({aiResult.confidence}%)</p>
                )}
              </div>
            </div>
          )}

          {/* ===== Species — #2: AI result is just a pre-fill, not a separate step ===== */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">set_meal</span>
                {t('record.species')}
                {aiResult && aiResult.confidence > 0 && !aiAnalyzing && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    🤖 AI {locale === 'ko' ? '추천' : 'suggested'}
                  </span>
                )}
              </span>
              <select value={species} onChange={(e) => setSpecies(e.target.value)} className={`${inputCls} appearance-none`} required>
                <option value="" disabled>{t('record.selectSpecies')}</option>
                {FISH_SPECIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Count + Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 overflow-hidden">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base text-primary shrink-0">set_meal</span>
                <span className="truncate">{t('record.count')}</span>
              </span>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="size-11 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-xl">remove</span>
                </button>
                <span className="text-2xl font-bold text-slate-900">{count}</span>
                <button type="button" onClick={() => setCount((c) => c + 1)} className="size-11 flex items-center justify-center bg-primary rounded-lg shadow-sm text-white active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-xl">add</span>
                </button>
              </div>
            </div>

            {/* #5 김짜증: 사이즈 placeholder "선택사항" */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
              <label className="flex flex-col gap-2">
                <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">straighten</span>
                  {t('record.size')}
                </span>
                <input
                  type="number"
                  value={sizeCm}
                  onChange={(e) => setSizeCm(e.target.value)}
                  placeholder={locale === 'ko' ? '선택사항' : 'Optional'}
                  min={0}
                  max={300}
                  className={`${inputCls} text-center font-bold`}
                />
              </label>
            </div>
          </div>

          {/* ===== Location Card — GPS auto in background ===== */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                {t('record.location')}
              </span>
              <div className="flex items-center gap-2">
                {locationMode === 'auto' ? (
                  <button type="button" onClick={() => setLocationMode('manual')} className="text-xs text-slate-400 hover:text-primary transition-colors py-1 px-2">
                    {t('record.manualInput')}
                  </button>
                ) : (
                  <button type="button" onClick={() => { setLocationMode('auto'); detectLocation(); }} className="text-xs text-primary font-semibold py-1 px-2">
                    GPS
                  </button>
                )}
              </div>
            </div>

            {/* GPS status */}
            {locationMode === 'auto' && (
              <div className="mb-2">
                {geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                    <span className="material-symbols-outlined text-sm animate-spin">my_location</span>
                    {t('record.detectingLocation')}
                  </div>
                )}
                {autoDetected && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {t('record.locationDetected')}
                    {gpsLat && gpsLng && (
                      <span className="text-slate-400 ml-1">({gpsLat.toFixed(4)}, {gpsLng.toFixed(4)})</span>
                    )}
                  </div>
                )}
                {geo.error && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {t('record.locationFailed')}
                    <button type="button" onClick={detectLocation} className="text-primary font-semibold underline ml-1 py-1">
                      {t('record.retryLocation')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t('record.locationHint')}
              className={inputCls}
            />
          </div>

          {/* Weather (auto, collapsed) */}
          {(weather || weatherLoading) && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base text-primary">cloud</span>
                {t('record.weather')}
              </span>
              {weatherLoading ? (
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse py-1">
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                  {t('record.loadingWeather')}
                </div>
              ) : weather && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary/5">
                    <span className="material-symbols-outlined text-xl text-primary">{weather.icon}</span>
                    <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
                      {locale === 'ko' ? weather.conditionKo : weather.conditionEn}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-50">
                    <span className="material-symbols-outlined text-xl text-orange-500">thermostat</span>
                    <span className="text-xs font-bold text-slate-900">{weather.tempC}°C</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50">
                    <span className="material-symbols-outlined text-xl text-blue-500">air</span>
                    <span className="text-xs font-bold text-slate-900">{weather.windSpeed}m/s</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-teal-50">
                    <span className="material-symbols-outlined text-xl text-teal-500">water_drop</span>
                    <span className="text-xs font-bold text-slate-900">{weather.humidity}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tide (auto, collapsed) */}
          {(tide || tideLoading) && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">water</span>
                <span className="text-xs font-bold text-slate-700">{locale === 'ko' ? '물때 정보' : 'Tide'}</span>
                {tideLoading && <span className="text-[10px] text-primary animate-pulse ml-auto">{t('record.detectingLocation')}</span>}
              </div>
              {!tideLoading && tide ? (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">📍 {tide.stationName}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {tide.tides.map((t, i) => (
                      <span key={i} className={`flex items-center gap-1 font-semibold ${t.type === 'High' ? 'text-blue-500' : 'text-cyan-500'}`}>
                        {t.type === 'High' ? (locale === 'ko' ? '▲ 고조' : '▲ High') : (locale === 'ko' ? '▼ 저조' : '▼ Low')} {t.time}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-6 flex items-center">
                  <div className="w-1/2 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">calendar_month</span>
                {t('record.date')}
              </span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
          </div>

          {/* Memo */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                {t('record.memo')}
              </span>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t('record.memoHint')} rows={2} className={`${inputCls} resize-none`} />
            </label>
          </div>

          {/* Visibility — #6: 비공개 기본 */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">
                  {visibility === 'public' ? 'public' : 'lock'}
                </span>
                <div>
                  <span className="text-sm font-semibold text-slate-800">
                    {locale === 'ko' ? '조과 공개' : 'Share to Feed'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {visibility === 'public'
                      ? (locale === 'ko' ? '다른 낚시인들이 내 조과를 볼 수 있어요' : 'Others can see your catch')
                      : (locale === 'ko' ? '나만 볼 수 있어요' : 'Only you can see this')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisibility(v => v === 'private' ? 'public' : 'private')}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${visibility === 'public' ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${visibility === 'public' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* #4: 하단은 저장 버튼 하나만 — 풀 와이드 */}
          <div className="fixed bottom-[84px] left-0 right-0 flex justify-center p-4 bg-white/90 backdrop-blur-md z-50 border-t border-slate-100">
            <div className="w-full max-w-lg">
              <button
                type="submit"
                disabled={saving || !species}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-teal-accent text-white font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40 disabled:shadow-none"
              >
                {saving
                  ? (locale === 'ko' ? '저장 중...' : 'Saving...')
                  : t('record.submit')}
              </button>
            </div>
          </div>
        </form>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
