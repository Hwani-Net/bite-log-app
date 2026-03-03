'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord } from '@/types';
import {
  AlertSubscription,
  getSubscriptions,
  saveSubscription,
  deleteSubscription,
  toggleSubscription,
  getAutoDetectedPrefs,
  sendSimulationAlert,
} from '@/services/openRunAlertService';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isPushSupported,
} from '@/services/pushNotificationService';

// ─── Config ───────────────────────────────────────────────────────────────────

const SPECIES_LIST = ['주꾸미', '갑오징어', '우럭', '볼락', '광어', '참돔', '감성돔', '한치', '방어'];
const REGION_LIST = ['서해', '남해', '동해', '제주', '전국'];

const LABELS = {
  ko: {
    title: '맞춤 오픈런 알림',
    subtitle: '선호 어종·지역 예약 오픈 즉시 알림',
    permissionBanner: '알림 권한이 필요합니다',
    permissionSub: '예약 오픈런 알림을 받으려면 알림 권한을 허용해주세요',
    allowBtn: '알림 허용',
    permissionDenied: '알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
    autoDetect: 'AI 자동 감지 추천',
    autoDetectSub: '나의 조과 기록 분석 결과',
    addBtn: '+ 구독 추가',
    addTitle: '새 알림 구독',
    speciesLabel: '어종 선택 (복수 가능)',
    speciesAll: '전 어종',
    regionLabel: '지역 선택',
    regionAll: '전국',
    daysLabel: '며칠 전 미리 알림',
    keywordsLabel: '포인트/항구 키워드 (선택)',
    keywordsHint: '오천항, 대천항...',
    saveBtn: '저장',
    cancelBtn: '취소',
    mySubsTitle: '내 구독 목록',
    noSubs: '구독 중인 알림이 없습니다',
    noSubsSub: '위에서 추가해보세요!',
    simulate: '🔔 테스트 알림 발송',
    deleteBtn: '삭제',
    activeBadge: '활성',
    pausedBadge: '일시정지',
    daysAhead: '일 전 알림',
    allSpecies: '전 어종',
    allRegions: '전국',
    howTitle: '어떻게 작동하나요?',
    howDesc: '공지 파서가 선사 공지를 분석하면, 구독 조건과 일치할 때 즉시 알림을 보내드립니다.',
    subscribeChip: '구독하기',
    deleteConfirm: '이 구독을 삭제할까요?',
  },
  en: {
    title: 'Custom Open-Run Alerts',
    subtitle: 'Get notified when bookings open for your favorites',
    permissionBanner: 'Notification permission required',
    permissionSub: 'Allow notifications to receive open-run alerts',
    allowBtn: 'Allow Notifications',
    permissionDenied: 'Permission denied. Enable notifications in browser settings.',
    autoDetect: 'AI Auto-Detect Suggestions',
    autoDetectSub: 'Based on your catch history',
    addBtn: '+ Add Subscription',
    addTitle: 'New Alert Subscription',
    speciesLabel: 'Select Species (multiple)',
    speciesAll: 'All Species',
    regionLabel: 'Select Region',
    regionAll: 'Nationwide',
    daysLabel: 'Notify N days before',
    keywordsLabel: 'Harbor / Keyword (optional)',
    keywordsHint: 'e.g. Ocheon Harbor',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    mySubsTitle: 'My Subscriptions',
    noSubs: 'No active subscriptions',
    noSubsSub: 'Add one above!',
    simulate: '🔔 Send Test Alert',
    deleteBtn: 'Delete',
    activeBadge: 'Active',
    pausedBadge: 'Paused',
    daysAhead: 'd before',
    allSpecies: 'All Species',
    allRegions: 'Nationwide',
    howTitle: 'How it works',
    howDesc: 'When our notice parser detects a booking opening matching your subscription, you&apos;ll get an instant alert.',
    subscribeChip: 'Subscribe',
    deleteConfirm: 'Delete this subscription?',
  },
};

// ─── Permission Banner ────────────────────────────────────────────────────────

function PermissionBanner({ permission, onRequest, locale }: {
  permission: string;
  onRequest: () => void;
  locale: string;
}) {
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;
  if (permission === 'granted') return null;

  return (
    <div className={`mx-4 mt-4 rounded-2xl p-4 ${
      permission === 'denied' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{permission === 'denied' ? '🚫' : '🔔'}</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800">{L.permissionBanner}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {permission === 'denied' ? L.permissionDenied : L.permissionSub}
          </p>
          {permission !== 'denied' && (
            <button
              id="alert-allow-btn"
              onClick={onRequest}
              className="mt-2 text-xs font-bold bg-amber-500 text-white px-4 py-1.5 rounded-xl hover:bg-amber-600 transition-colors"
            >
              {L.allowBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-Detect Chip ────────────────────────────────────────────────────────

function AutoDetectChips({ records, onSubscribe, locale }: {
  records: CatchRecord[];
  onSubscribe: (species: string, region: string) => void;
  locale: string;
}) {
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;
  const prefs = getAutoDetectedPrefs(records);
  if (prefs.length === 0) return null;

  return (
    <section className="px-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🤖</span>
        <div>
          <p className="text-sm font-bold text-slate-800">{L.autoDetect}</p>
          <p className="text-xs text-slate-400">{L.autoDetectSub}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {prefs.map((p) => (
          <button
            key={`${p.species}_${p.region}`}
            onClick={() => onSubscribe(p.species, p.region)}
            className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-sky-100 transition-colors"
          >
            🎣 {p.species} · {p.region}
            <span className="text-sky-400">+</span>{L.subscribeChip}
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Add Subscription Form ────────────────────────────────────────────────────

function AddForm({ onSave, onCancel, initialSpecies, initialRegion, locale }: {
  onSave: (sub: Omit<AlertSubscription, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialSpecies?: string;
  initialRegion?: string;
  locale: string;
}) {
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(
    initialSpecies ? [initialSpecies] : []
  );
  const [selectedRegion, setSelectedRegion] = useState(initialRegion ?? '전국');
  const [daysAhead, setDaysAhead] = useState(3);
  const [keywords, setKeywords] = useState('');

  const toggleSpecies = (s: string) => {
    setSelectedSpecies(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleSave = () => {
    onSave({
      species: selectedSpecies,
      regions: selectedRegion === '전국' || selectedRegion === 'Nationwide' ? [] : [selectedRegion],
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      notifyDaysAhead: daysAhead,
      isActive: true,
    });
  };

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
      <h3 className="text-sm font-bold text-slate-800">{L.addTitle}</h3>

      {/* 어종 선택 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">{L.speciesLabel}</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECIES_LIST.map(s => (
            <button
              key={s}
              onClick={() => toggleSpecies(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                selectedSpecies.includes(s)
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {selectedSpecies.length === 0 && (
          <p className="text-[10px] text-slate-400 mt-1">{L.speciesAll}</p>
        )}
      </div>

      {/* 지역 선택 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">{L.regionLabel}</p>
        <div className="flex flex-wrap gap-1.5">
          {REGION_LIST.map(r => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                selectedRegion === r
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* N일 전 알림 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">
          {L.daysLabel}: <span className="text-sky-600 font-black">{daysAhead}</span>일
        </p>
        <input
          id="alert-days-slider"
          type="range"
          min={1}
          max={7}
          value={daysAhead}
          onChange={e => setDaysAhead(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
          <span>1일</span>
          <span>7일</span>
        </div>
      </div>

      {/* 키워드 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">{L.keywordsLabel}</p>
        <input
          id="alert-keywords-input"
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder={L.keywordsHint}
          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-400"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 text-xs font-semibold text-slate-500 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          {L.cancelBtn}
        </button>
        <button
          id="alert-save-btn"
          onClick={handleSave}
          className="flex-1 text-xs font-bold bg-sky-500 text-white py-2.5 rounded-xl hover:bg-sky-600 transition-colors"
        >
          {L.saveBtn}
        </button>
      </div>
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

function SubCard({ sub, onDelete, onToggle, onSimulate, locale }: {
  sub: AlertSubscription;
  onDelete: () => void;
  onToggle: () => void;
  onSimulate: () => void;
  locale: string;
}) {
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;
  const speciesLabel = sub.species.length > 0 ? sub.species.join(' / ') : L.allSpecies;
  const regionLabel = sub.regions.length > 0 ? sub.regions.join(' / ') : L.allRegions;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 space-y-2 ${
      sub.isActive ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-60'
    }`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">🎣 {speciesLabel}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              sub.isActive
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {sub.isActive ? L.activeBadge : L.pausedBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            📍 {regionLabel} · ⏰ {sub.notifyDaysAhead}{L.daysAhead}
          </p>
          {sub.keywords.length > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              🔍 {sub.keywords.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSimulate}
          className="flex-1 text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-100 py-1.5 rounded-xl hover:bg-sky-100 transition-colors"
        >
          🔔 {L.simulate}
        </button>
        <button
          onClick={onToggle}
          className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          {sub.isActive ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => {
            if (window.confirm(L.deleteConfirm)) onDelete();
          }}
          className="text-[10px] font-semibold text-red-400 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const locale = useAppStore(s => s.locale);
  const L = LABELS[locale as 'ko' | 'en'] ?? LABELS.ko;

  const [permission, setPermission] = useState('default');
  const [subs, setSubs] = useState<AlertSubscription[]>([]);
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formInitSpecies, setFormInitSpecies] = useState<string | undefined>();
  const [formInitRegion, setFormInitRegion] = useState<string | undefined>();

  useEffect(() => {
    if (isPushSupported()) setPermission(getNotificationPermission());
    setSubs(getSubscriptions());
    getDataService().getCatchRecords().then(setRecords).catch(() => {});
  }, []);

  const handleRequestPermission = async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
  };

  const handleSave = (data: Omit<AlertSubscription, 'id' | 'createdAt'>) => {
    saveSubscription(data);
    setSubs(getSubscriptions());
    setShowForm(false);
    setFormInitSpecies(undefined);
    setFormInitRegion(undefined);
  };

  const handleDelete = (id: string) => {
    deleteSubscription(id);
    setSubs(getSubscriptions());
  };

  const handleToggle = (id: string) => {
    toggleSubscription(id);
    setSubs(getSubscriptions());
  };

  const handleQuickSubscribe = (species: string, region: string) => {
    setFormInitSpecies(species);
    setFormInitRegion(region);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">{L.title}</h1>
            <p className="text-xs text-gray-500">{L.subtitle}</p>
          </div>
          <span className="text-2xl">🔔</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-4">

        {/* 알림 권한 배너 */}
        <PermissionBanner
          permission={permission}
          onRequest={handleRequestPermission}
          locale={locale}
        />

        {/* AI 자동 감지 추천 */}
        <AutoDetectChips
          records={records}
          onSubscribe={handleQuickSubscribe}
          locale={locale}
        />

        {/* 구독 추가 버튼 / 폼 */}
        {!showForm ? (
          <div className="px-4">
            <button
              id="alert-add-btn"
              onClick={() => { setFormInitSpecies(undefined); setFormInitRegion(undefined); setShowForm(true); }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md shadow-sky-200 hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="text-lg">+</span>
              {L.addBtn}
            </button>
          </div>
        ) : (
          <AddForm
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setFormInitSpecies(undefined); setFormInitRegion(undefined); }}
            initialSpecies={formInitSpecies}
            initialRegion={formInitRegion}
            locale={locale}
          />
        )}

        {/* 내 구독 목록 */}
        <section className="px-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3">{L.mySubsTitle}</h2>
          {subs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-4xl">🔕</p>
              <p className="text-sm font-semibold text-slate-400">{L.noSubs}</p>
              <p className="text-xs text-slate-300">{L.noSubsSub}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map(sub => (
                <SubCard
                  key={sub.id}
                  sub={sub}
                  locale={locale}
                  onDelete={() => handleDelete(sub.id)}
                  onToggle={() => handleToggle(sub.id)}
                  onSimulate={async () => {
                    // 권한 미허용이면 먼저 요청 후 재시도
                    let perm = permission;
                    if (perm !== 'granted') {
                      perm = await requestNotificationPermission();
                      setPermission(perm);
                    }
                    if (perm === 'granted') {
                      sendSimulationAlert(sub);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* 작동 원리 안내 */}
        <section className="px-4 pb-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-xs font-bold text-slate-700">{L.howTitle}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{L.howDesc}</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
