'use client';

// Client component for record detail using query params for static export

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { shareCatchRecord } from '@/services/shareService';
import { toggleVisibility } from '@/services/feedService';
import { CatchRecord, FISH_SPECIES } from '@/types';

function RecordDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { t, locale } = useAppStore();
  const [record, setRecord] = useState<CatchRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Edit form state
  const [date, setDate] = useState('');
  const [locationName, setLocationName] = useState('');
  const [species, setSpecies] = useState('');
  const [count, setCount] = useState(1);
  const [sizeCm, setSizeCm] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!id) return;
    getDataService().getCatchRecord(id).then((r) => {
      if (r) {
        setRecord(r);
        setDate(r.date);
        setLocationName(r.location.name);
        setSpecies(r.species);
        setCount(r.count);
        setSizeCm(r.sizeCm?.toString() || '');
        setMemo(r.memo || '');
      }
    });
  }, [id]);

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    try {
      const updated = await getDataService().updateCatchRecord(record.id, {
        date,
        location: { name: locationName.trim() },
        species,
        count,
        sizeCm: sizeCm ? Number(sizeCm) : undefined,
        memo: memo.trim() || undefined,
      });
      setRecord(updated);
      setEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!confirm(locale === 'ko' ? '이 기록을 삭제할까요?' : 'Delete this record?')) return;
    await getDataService().deleteCatchRecord(record.id);
    router.push('/records');
  }

  async function handleToggleVisibility() {
    if (!record) return;
    const newVis = (record.visibility || 'private') === 'private' ? 'public' : 'private';
    const updated = await toggleVisibility(record.id, newVis as 'public' | 'private');
    setRecord(updated);
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-900';

  if (!record) {
    return (
      <div className="page-enter relative z-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 animate-pulse">set_meal</span>
          <p className="text-slate-400 mt-2">{locale === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter relative z-10 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md px-4 py-4 justify-between border-b border-slate-200/50">
        <button onClick={() => router.back()} className="text-slate-900 flex size-10 shrink-0 items-center justify-center hover:bg-slate-100:bg-slate-800 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900 flex-1 text-center">
          {editing ? t('record.editTitle') : (locale === 'ko' ? '조과 상세' : 'Catch Detail')}
        </h2>
        <div className="flex items-center gap-1">
          {editing ? (
            <button onClick={() => setEditing(false)} className="text-slate-500 text-sm font-medium px-2">
              {t('common.cancel')}
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-primary size-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button
                onClick={async () => {
                  if (!record) return;
                  const result = await shareCatchRecord(record, locale);
                  if (result.success) {
                    setShareToast(result.method === 'clipboard'
                      ? (locale === 'ko' ? '클립보드에 복사됨!' : 'Copied to clipboard!')
                      : (locale === 'ko' ? '공유 완료!' : 'Shared!'));
                    setTimeout(() => setShareToast(null), 2000);
                  }
                }}
                className="text-primary size-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">share</span>
              </button>
              <button onClick={handleDelete} className="text-red-400 size-10 flex items-center justify-center rounded-full hover:bg-red-50:bg-red-900/20 transition-colors">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
              <button
                onClick={handleToggleVisibility}
                className={`size-10 flex items-center justify-center rounded-full transition-colors ${
                  (record.visibility || 'private') === 'public'
                    ? 'text-green-500 hover:bg-green-50:bg-green-900/20'
                    : 'text-slate-400 hover:bg-slate-100:bg-slate-800'
                }`}
                title={(record.visibility || 'private') === 'public' ? (locale === 'ko' ? '공개 중' : 'Public') : (locale === 'ko' ? '비공개' : 'Private')}
              >
                <span className="material-symbols-outlined text-xl">
                  {(record.visibility || 'private') === 'public' ? 'public' : 'lock'}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Photo hero */}
      {record.photos.length > 0 && (
        <div className="w-full aspect-video bg-slate-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={record.photos[0]} alt={record.species} className="w-full h-full object-cover" />
        </div>
      )}

      {editing ? (
        /* ===== EDIT MODE ===== */
        <div className="px-4 pt-4 space-y-4">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">calendar_month</span>
                {t('record.date')}
              </span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                {t('record.location')}
              </span>
              <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} className={inputCls} />
            </label>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">set_meal</span>
                {t('record.species')}
              </span>
              <select value={species} onChange={(e) => setSpecies(e.target.value)} className={`${inputCls} appearance-none`}>
                {FISH_SPECIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <label className="flex flex-col gap-2">
                <span className="text-slate-800 text-sm font-semibold">{t('record.count')}</span>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                  <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="size-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <span className="text-lg font-bold text-slate-900">{count}</span>
                  <button type="button" onClick={() => setCount((c) => c + 1)} className="size-9 flex items-center justify-center bg-primary rounded-lg shadow-sm text-white">
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </label>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <label className="flex flex-col gap-2">
                <span className="text-slate-800 text-sm font-semibold">{t('record.size')}</span>
                <input type="number" value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="0.0" className={`${inputCls} text-center font-bold`} />
              </label>
            </div>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
            <label className="flex flex-col gap-2">
              <span className="text-slate-800 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                {t('record.memo')}
              </span>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
            </label>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-teal-accent text-white font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? '...' : t('record.submit')}
          </button>
        </div>
      ) : (
        /* ===== VIEW MODE ===== */
        <div className="px-4 pt-6 space-y-4">
          {/* Species + Count */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-xl">set_meal</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{record.species}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {record.count}{locale === 'ko' ? '마리' : ' fish'}
                </span>
                {record.sizeCm && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-500">
                    {record.sizeCm}cm
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                {t('record.date')}
              </div>
              <p className="text-sm font-semibold text-slate-900">{record.date}</p>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                {t('record.location')}
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate">{record.location.name}</p>
              {record.location.lat && record.location.lng && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  📍 {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Weather info */}
          {record.weather && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                <span className="material-symbols-outlined text-sm text-primary">cloud</span>
                {t('record.weather')}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-primary/5">
                  <span className="material-symbols-outlined text-lg text-primary">partly_cloudy_day</span>
                  <span className="text-[10px] font-semibold text-slate-600 text-center">
                    {record.weather.condition}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-50">
                  <span className="material-symbols-outlined text-lg text-orange-500">thermostat</span>
                  <span className="text-xs font-bold text-slate-900">{record.weather.tempC}°C</span>
                </div>
                {record.weather.windSpeed !== undefined && (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50">
                    <span className="material-symbols-outlined text-lg text-blue-500">air</span>
                    <span className="text-xs font-bold text-slate-900">{record.weather.windSpeed}m/s</span>
                  </div>
                )}
                {record.weather.humidity !== undefined && (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-teal-50">
                    <span className="material-symbols-outlined text-lg text-teal-500">water_drop</span>
                    <span className="text-xs font-bold text-slate-900">{record.weather.humidity}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tide info */}
          {record.tide && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm bg-blue-50/50">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                <span className="material-symbols-outlined text-sm text-primary">water</span>
                {locale === 'ko' ? '물때 정보' : 'Tide'}
                <span className="text-[10px] text-slate-400 ml-auto">📍 {record.tide.stationName} 관측소</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {record.tide.tides.map((t, i) => (
                  <span key={i} className={`flex flex-col items-center justify-center p-2 rounded-xl flex-1 min-w-[60px] ${t.type === 'High' ? 'bg-blue-100 text-blue-600' : 'bg-cyan-100 text-cyan-600'}`}>
                    <span className="font-bold mb-0.5">{t.type === 'High' ? ( locale === 'ko' ? '▲ 고조' : '▲ High' ) : ( locale === 'ko' ? '▼ 저조' : '▼ Low' )}</span>
                    <span className="text-slate-600 font-medium">{t.time}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Memo */}
          {record.memo && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <span className="material-symbols-outlined text-sm text-primary">edit_note</span>
                {t('record.memo')}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.memo}</p>
            </div>
          )}

          {/* All photos */}
          {record.photos.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">photo_library</span>
                {locale === 'ko' ? '사진' : 'Photos'} ({record.photos.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {record.photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-[10px] text-slate-400 text-center pt-4">
            {locale === 'ko' ? '작성' : 'Created'}: {new Date(record.createdAt).toLocaleString()}
            {record.updatedAt !== record.createdAt && (
              <> · {locale === 'ko' ? '수정' : 'Updated'}: {new Date(record.updatedAt).toLocaleString()}</>
            )}
          </div>
        </div>
      )}

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full shadow-xl animate-pulse">
          <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
          {shareToast}
        </div>
      )}
    </div>
  );
}

export default function RecordDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
      <RecordDetailContent />
    </Suspense>
  );
}
