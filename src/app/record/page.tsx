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
import { CatchRecord, FISH_SPECIES, TideRecordData, RecordVisibility } from '@/types';

export default function RecordPage() {
  const t = useAppStore((s) => s.t);
  const locale = useAppStore((s) => s.locale);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const geo = useGeolocation();

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
  const [visibility, setVisibility] = useState<RecordVisibility>('public');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<FishAIResult | null>(null);

  // Auto-detect location on page load
  useEffect(() => {
    if (locationMode === 'auto' && !autoDetected) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function detectLocation() {
    const result = await geo.requestLocation();
    if (result) {
      setLocationName(result.locationName);
      setGpsLat(result.position.lat);
      setGpsLng(result.position.lng);
      setAutoDetected(true);
      
      // Fetch Weather & Tide concurrently
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
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setAiResult(null);
  }

  async function handleAIAnalysis() {
    if (photos.length === 0 || aiAnalyzing) return;
    setAiAnalyzing(true);
    setAiResult(null);
    try {
      const result = await identifyFish(photos[0]);
      if (result && result.species !== 'unknown') {
        setAiResult(result);
        // Auto-fill species if it matches known species
        const matched = FISH_SPECIES.find(s => s === result.koreanName);
        if (matched) {
          setSpecies(matched);
        } else {
          setSpecies(result.koreanName);
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
    if (!locationName.trim() || !species) return;
    setSaving(true);

    try {
      const recordData: Omit<CatchRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        date,
        location: {
          name: locationName.trim(),
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

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400';

  return (
    <div className="page-enter relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 justify-between border-b border-slate-200/50 dark:border-slate-800">
        <button onClick={() => router.back()} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('record.title')}</h2>
        <div className="flex w-10 items-center justify-end">
          <button type="submit" form="record-form" className="text-primary text-base font-bold leading-normal tracking-wide shrink-0">
            {saving ? '...' : t('record.submit')}
          </button>
        </div>
      </header>

      <form id="record-form" onSubmit={handleSubmit} className="flex-1 pb-24">
        {/* Photo upload */}
        <div className="p-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-6 py-10 transition-all hover:border-primary/50 cursor-pointer"
          >
            {photos.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">add</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-primary/10 p-4 rounded-full">
                  <span className="material-symbols-outlined text-3xl text-primary">add_photo_alternate</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{t('record.addPhoto')}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-normal text-center">
                    {locale === 'ko' ? '최고의 순간을 기록으로 남겨보세요' : 'Capture your best moments'}
                  </p>
                </div>
                <button type="button" className="mt-2 flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-6 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95">
                  {locale === 'ko' ? '사진 선택' : 'Choose Photo'}
                </button>
              </>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />

        {/* AI Fish Analysis */}
        {photos.length > 0 && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={handleAIAnalysis}
              disabled={aiAnalyzing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {aiAnalyzing ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-base">progress_activity</span>
                  {locale === 'ko' ? 'AI 분석 중...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">smart_toy</span>
                  {locale === 'ko' ? '🐟 AI 어종 분석' : '🐟 AI Fish ID'}
                </>
              )}
            </button>
            {aiResult && (
              <div className={`mt-2 p-3 rounded-xl text-sm ${
                aiResult.confidence > 0 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
              }`}>
                {aiResult.confidence > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">{aiResult.koreanName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 font-medium">
                        {aiResult.confidence}% 확신
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{aiResult.description}</p>
                  </div>
                ) : (
                  <p className="text-amber-700 dark:text-amber-300">{aiResult.description}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 space-y-4">
          {/* ===== GPS Location Card ===== */}
          <div className="glass-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                {t('record.location')}
              </span>
              <div className="flex items-center gap-2">
                {locationMode === 'auto' && (
                  <button
                    type="button"
                    onClick={() => { setLocationMode('manual'); }}
                    className="text-[10px] text-slate-400 hover:text-primary transition-colors"
                  >
                    {t('record.manualInput')}
                  </button>
                )}
                {locationMode === 'manual' && (
                  <button
                    type="button"
                    onClick={() => { setLocationMode('auto'); detectLocation(); }}
                    className="text-[10px] text-primary font-semibold"
                  >
                    GPS
                  </button>
                )}
              </div>
            </div>

            {/* GPS status indicator */}
            {locationMode === 'auto' && (
              <div className="mb-2">
                {geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                    <span className="material-symbols-outlined text-sm animate-spin">my_location</span>
                    {t('record.detectingLocation')}
                  </div>
                )}
                {autoDetected && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {t('record.locationDetected')}
                    {gpsLat && gpsLng && (
                      <span className="text-slate-400 ml-1">
                        ({gpsLat.toFixed(4)}, {gpsLng.toFixed(4)})
                      </span>
                    )}
                  </div>
                )}
                {geo.error && !geo.loading && (
                  <div className="flex items-center gap-2 text-xs text-amber-500">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {t('record.locationFailed')}
                    <button type="button" onClick={detectLocation} className="text-primary font-semibold underline ml-1">
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
              required
            />
          </div>

          {/* ===== Weather Card (auto-fetched) ===== */}
          {(weather || weatherLoading) && (
            <div className="glass-card rounded-2xl p-4 shadow-sm">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base text-primary">cloud</span>
                {t('record.weather')}
              </span>

              {weatherLoading ? (
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse py-2">
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                  {t('record.loadingWeather')}
                </div>
              ) : weather && (
                <div className="grid grid-cols-4 gap-2">
                  {/* Condition */}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary/5">
                    <span className="material-symbols-outlined text-xl text-primary">{weather.icon}</span>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">
                      {locale === 'ko' ? weather.conditionKo : weather.conditionEn}
                    </span>
                  </div>
                  {/* Temperature */}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                    <span className="material-symbols-outlined text-xl text-orange-500">thermostat</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{weather.tempC}°C</span>
                    <span className="text-[9px] text-slate-400">{t('record.temp')}</span>
                  </div>
                  {/* Wind */}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <span className="material-symbols-outlined text-xl text-blue-500">air</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{weather.windSpeed}</span>
                    <span className="text-[9px] text-slate-400">m/s</span>
                  </div>
                  {/* Humidity */}
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                    <span className="material-symbols-outlined text-xl text-teal-500">water_drop</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{weather.humidity}%</span>
                    <span className="text-[9px] text-slate-400">{t('record.humidity')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== Tide Card (auto-fetched) ===== */}
          {(tide || tideLoading) && (
            <div className="mb-4 glass-card rounded-xl p-4 border border-primary/20 bg-blue-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm">water</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {locale === 'ko' ? '물때 정보' : 'Tide'}
                </span>
                {tideLoading && <span className="text-[10px] text-primary animate-pulse ml-auto">{t('record.detectingLocation')}</span>}
              </div>
              
              {!tideLoading && tide ? (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">📍 {tide.stationName} 관측소 기준</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {tide.tides.map((t, i) => (
                      <span key={i} className={`flex items-center gap-1 font-semibold ${t.type === 'High' ? 'text-blue-500' : 'text-cyan-500'}`}>
                        {t.type === 'High' ? ( locale === 'ko' ? '▲ 고조' : '▲ High' ) : ( locale === 'ko' ? '▼ 저조' : '▼ Low' )} {t.time}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-6 flex items-center">
                  <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="glass-card rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">calendar_month</span>
                {t('record.date')}
              </span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
          </div>

          {/* Species */}
          <div className="glass-card rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">set_meal</span>
                {t('record.species')}
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
            <div className="glass-card rounded-2xl p-4 shadow-sm overflow-hidden">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base text-primary shrink-0">set_meal</span>
                <span className="truncate">{t('record.count')}</span>
              </span>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="size-9 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-600 dark:text-slate-200">
                  <span className="material-symbols-outlined text-lg">remove</span>
                </button>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{count}</span>
                <button type="button" onClick={() => setCount((c) => c + 1)} className="size-9 flex items-center justify-center bg-primary rounded-lg shadow-sm text-white">
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 shadow-sm">
              <label className="flex flex-col gap-2">
                <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">straighten</span>
                  {t('record.size')}
                </span>
                <input type="number" value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="0.0" min={0} max={300} className={`${inputCls} text-center font-bold`} />
              </label>
            </div>
          </div>

          {/* Memo */}
          <div className="glass-card rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                {t('record.memo')}
              </span>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t('record.memoHint')} rows={4} className={`${inputCls} resize-none`} />
            </label>
          </div>

          {/* Visibility Toggle */}
          <div className="glass-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">
                  {visibility === 'public' ? 'public' : 'lock'}
                </span>
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {locale === 'ko' ? '조과 공개' : 'Share to Feed'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {visibility === 'public'
                      ? (locale === 'ko' ? '다른 낚시인들이 내 조과를 볼 수 있어요' : 'Others can see your catch')
                      : (locale === 'ko' ? '나만 볼 수 있어요' : 'Only you can see this')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisibility(v => v === 'private' ? 'public' : 'private')}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${visibility === 'public' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${visibility === 'public' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Fixed bottom save button */}
        <div className="fixed bottom-[84px] left-0 right-0 flex justify-center p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-50">
          <div className="w-full max-w-lg">
          <button
            type="submit"
            disabled={saving || !locationName.trim() || !species}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-teal-accent text-white font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? (locale === 'ko' ? '저장 중...' : 'Saving...') : t('record.submit')}
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}
