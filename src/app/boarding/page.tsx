'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useAppStore } from '@/store/appStore';
import { BoardingPassProfile, getBoardingPassProfile, saveBoardingPassProfile } from '@/services/boardingPassService';
import {
  FishingVessel,
  VesselSearchResult,
  searchFishingVessels,
  preloadAllVessels,
  extractRegion,
  isVesselValid,
  getNaksiHaePlayStoreUrl,
  getNaksiHaeAppStoreUrl,
} from '@/services/fishingVesselService';

type Tab = 'safety' | 'pass' | 'guide';

// ─── 안전 등급 계산 ───────────────────────────────────────────────────────────
function getSafetyGrade(vessel: FishingVessel): {
  grade: 'safe' | 'caution' | 'danger';
  label: string;
  reason: string;
} {
  const validUntil = vessel.bsnStEndDt?.split('~')[1]?.trim();
  if (!validUntil) return { grade: 'danger', label: '위험', reason: '신고기간 정보 없음' };

  const endDate = new Date(validUntil.replace(/\./g, '-'));
  const now = new Date();
  const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { grade: 'danger', label: '위험 ⛔', reason: `신고기간 만료 (${Math.abs(daysLeft)}일 경과)` };
  }
  if (daysLeft <= 30) {
    return { grade: 'caution', label: '주의 ⚠️', reason: `신고기간 ${daysLeft}일 남음` };
  }
  return { grade: 'safe', label: '정상', reason: `${daysLeft}일 후 만료` };
}

const gradeStyle = {
  safe:    { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', card: 'border-slate-100', dot: 'bg-emerald-400' },
  caution: { badge: 'bg-amber-50 text-amber-700 border-amber-200',    card: 'border-amber-200',  dot: 'bg-amber-400' },
  danger:  { badge: 'bg-red-50 text-red-700 border-red-200',          card: 'border-red-300',    dot: 'bg-red-500 animate-pulse' },
};

// ─── 어선 안전 카드 ───────────────────────────────────────────────────────────
function VesselSafetyCard({
  vessel,
  onSelect,
}: {
  vessel: FishingVessel;
  onSelect: (v: FishingVessel) => void;
}) {
  const safety = getSafetyGrade(vessel);
  const style = gradeStyle[safety.grade];
  const region = extractRegion(vessel.fshNtNm);

  return (
    <button
      onClick={() => onSelect(vessel)}
      className={`w-full text-left bg-white rounded-2xl border-2 ${style.card} p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* 안전 dot */}
        <div className={`size-3 rounded-full mt-1.5 shrink-0 ${style.dot}`} />

        <div className="flex-1 min-w-0">
          {/* 선박명 + 등급 배지 */}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-base font-black text-slate-900">{vessel.fsboNm}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
              {safety.label}
            </span>
          </div>

          {/* 위험 사유 */}
          {safety.grade !== 'safe' && (
            <p className={`text-xs font-bold mb-1 ${safety.grade === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
              {safety.reason}
            </p>
          )}

          {/* 지역 */}
          <p className="text-xs text-slate-500 mb-2 truncate">📍 {region}</p>

          {/* 핵심 정보 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <span className="material-symbols-outlined text-[14px] text-primary">anchor</span>
              {vessel.shpmHangNm.split(' ').slice(-1)[0]}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <span className="material-symbols-outlined text-[14px] text-primary">groups</span>
              최대 {vessel.maxPsrNum}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <span className="material-symbols-outlined text-[14px] text-slate-400">scale</span>
              {vessel.fsboTotTons}t
            </span>
          </div>
        </div>

        <span className="material-symbols-outlined text-slate-300 mt-1 shrink-0">chevron_right</span>
      </div>
    </button>
  );
}

// ─── 어선 상세 시트 ───────────────────────────────────────────────────────────
function VesselDetailSheet({
  vessel,
  onClose,
}: {
  vessel: FishingVessel;
  onClose: () => void;
}) {
  const safety = getSafetyGrade(vessel);
  const style = gradeStyle[safety.grade];
  const isAndroid =
    typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const appUrl = isAndroid ? getNaksiHaePlayStoreUrl() : getNaksiHaeAppStoreUrl();

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900">{vessel.fsboNm}</h2>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${style.badge}`}>
                  {safety.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{vessel.fshNtNm}</p>
            </div>
            <button
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* 위험/주의 알림 박스 */}
          {safety.grade === 'danger' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
              <p className="text-sm font-black text-red-700 mb-1">⛔ 승선 전 확인 필요</p>
              <p className="text-xs text-red-600 leading-relaxed">
                이 어선의 낚시어선업 신고기간이 <strong>만료</strong>됐습니다. 
                영업 중이라면 불법영업일 수 있으며, 사고 시 보상을 받지 못할 수 있습니다.
                선사에 신고기간 갱신 여부를 직접 확인하세요.
              </p>
            </div>
          )}
          {safety.grade === 'caution' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-sm font-black text-amber-700 mb-1">⚠️ 신고기간 임박</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                {safety.reason}. 출항 전 선사에 갱신 여부를 확인하는 것을 권장합니다.
              </p>
            </div>
          )}

          {/* 정보 그리드 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: 'anchor', label: '선적항', value: vessel.shpmHangNm },
              { icon: 'scale', label: '총톤수', value: `${vessel.fsboTotTons}t` },
              { icon: 'groups', label: '최대 승객', value: vessel.maxPsrNum, highlight: true },
              { icon: 'person', label: '최대 선원', value: vessel.maxShcrNum },
              { icon: 'event_available', label: '신고 유효기간', value: vessel.bsnStEndDt },
              { icon: 'badge', label: '어업허가', value: vessel.fshryApvPermNm },
            ].map(({ icon, label, value, highlight }) => (
              <div
                key={label}
                className={`${label === '신고 유효기간' || label === '어업허가' ? 'col-span-2' : ''} ${highlight ? 'bg-blue-50' : 'bg-slate-50'} rounded-2xl p-3`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1 ${highlight ? 'text-blue-500' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">{icon}</span>
                  {label}
                </p>
                <p className={`text-sm font-bold ${highlight ? 'text-blue-800' : 'text-slate-800'}`}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>

          {/* 정원 초과 안내 */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-slate-600 mb-1">📋 소비자 체크포인트</p>
            <ul className="space-y-1.5">
              {[
                '예약 인원이 최대 승객 수를 초과하는지 확인',
                '신고 유효기간이 출항일 기준 유효한지 확인',
                '어업허가 번호가 존재하는지 확인',
              ].map((item) => (
                <li key={item} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[14px] mt-0.5 shrink-0">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 낚시해 공식 확인 CTA */}
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full bg-slate-900 text-white rounded-2xl px-5 py-4 active:scale-95 transition-transform"
          >
            <div>
              <p className="font-black text-sm">낚시해(海)에서 최신정보 확인</p>
              <p className="text-xs text-white/60 mt-0.5">해양수산부 공식 앱</p>
            </div>
            <span className="material-symbols-outlined text-xl">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── 신고방법 탭 ──────────────────────────────────────────────────────────────
function GuideTab() {
  const isAndroid =
    typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const appUrl = isAndroid ? getNaksiHaePlayStoreUrl() : getNaksiHaeAppStoreUrl();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 mb-4">정식 출항신고 절차</h2>
        <div className="space-y-3">
          {[
            { step: '1', icon: 'download', color: 'bg-blue-500', title: '낚시해(海) 앱 설치', desc: '해양수산부 공식 앱. 무료 설치.' },
            { step: '2', icon: 'person_add', color: 'bg-violet-500', title: '본인인증 1회 등록', desc: '이후 원터치로 승선 신고 가능.' },
            { step: '3', icon: 'qr_code_scanner', color: 'bg-emerald-500', title: 'QR 발급 후 선장 스캔', desc: '선장이 QR 스캔 → 명부 자동 제출.' },
            { step: '4', icon: 'sailing', color: 'bg-orange-500', title: '출항 완료', desc: '미신고 시 500만원 이하 벌금 (법 제22조).' },
          ].map(({ icon, color, title, desc }) => (
            <div key={title} className="flex gap-3">
              <div className={`size-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-white text-[18px]">{icon}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-1">🐟 BITE Log 안전확인의 역할</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          BITE Log는 공공데이터를 기반으로 낚시어선의 <strong>정식 신고 여부, 정원, 유효기간</strong>을 
          예약 전에 미리 확인할 수 있게 합니다. 실제 출항신고는 낚시해(海) 앱에서 하세요.
        </p>
      </div>

      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl p-4 active:scale-95 transition-transform"
      >
        <div>
          <p className="font-black text-sm">낚시해(海) 앱 다운로드</p>
          <p className="text-xs text-white/80 mt-0.5">해양수산부 공식 승선 신고 앱</p>
        </div>
        <span className="material-symbols-outlined text-2xl">open_in_new</span>
      </a>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function BoatSafetyPage() {
  const locale = useAppStore((s) => s.locale);
  const [activeTab, setActiveTab] = useState<Tab>('safety');

  // 승선패스 상태
  const [profile, setProfile] = useState<BoardingPassProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [emergency, setEmergency] = useState('');

  // 어선 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<VesselSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<FishingVessel | null>(null);

  useEffect(() => {
    const p = getBoardingPassProfile();
    if (p) {
      setProfile(p);
      setName(p.name);
      setBirthDate(p.birthDate);
      setGender(p.gender);
      setEmergency(p.emergencyContact);
    } else {
      setIsEditing(true);
    }
    // 1페이지 즉시 표시 (캐시 비면 자동으로 API 1페이지 fetch)
    searchFishingVessels('', 1, 30).then(setSearchResult);
    // 나머지 전체 데이터 백그라운드 로딩 (무소음)
    preloadAllVessels();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile: BoardingPassProfile = { name, birthDate, gender, emergencyContact: emergency };
    saveBoardingPassProfile(newProfile);
    setProfile(newProfile);
    setIsEditing(false);
  };

  const handleVesselSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const result = await searchFishingVessels(query, 1, 20);
      setSearchResult(result);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleVesselSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleVesselSearch]);

  const qrData = profile
    ? JSON.stringify({ ...profile, app: 'BITE Log', version: '1.0', ts: Date.now() })
    : '';

  // 위험 어선 수 계산 (danger + caution)
  const warningCount = searchResult?.vessels.filter(v => getSafetyGrade(v).grade !== 'safe').length ?? 0;

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'safety', icon: 'security', label: '안전확인' },
    { id: 'pass',   icon: 'badge',    label: '승선패스' },
    { id: 'guide',  icon: 'info',     label: '신고방법' },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col pt-safe pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2">
        <Link
          href="/"
          className="size-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-primary active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {locale === 'ko' ? '낚시배 안전확인' : 'Boat Safety Check'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">예약 전 꼭 확인하세요</p>
        </div>
      </header>

      {/* 히어로 배너 */}
      <div className="px-4 mt-3 mb-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 size-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 size-20 bg-white/5 rounded-full translate-y-6 -translate-x-4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-amber-400 text-2xl">shield</span>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest">소비자 보호</p>
            </div>
            <p className="text-base font-black leading-snug mb-3">
              예약한 낚시배,<br/>
              <span className="text-amber-400">정식 허가된 배</span>인지 확인하셨나요?
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              신고기간 만료 · 정원 초과 · 허가 없는 어선은 사고 시 보상이 어렵습니다.
              출항 전 공공데이터로 미리 확인하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 space-y-3">

        {/* ── TAB: 안전확인 (PRIMARY) ── */}
        {activeTab === 'safety' && (
          <>
            {/* 검색창 */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="예약한 배 이름 또는 항구 검색..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
              {searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResult(null); searchFishingVessels('', 1, 30).then(setSearchResult); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : isSearching ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : null}
            </div>

            {/* 어선 목록 — 검색어 없으면 1페이지(최신 100척), 있으면 필터 결과 */}
            <>
              {/* 검색 결과 헤더 (검색어 있을 때만) */}
              {searchQuery && searchResult && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-slate-500">
                    {isSearching ? '검색 중...' : `"${searchQuery}" — ${searchResult.totalCount}척 검색됨`}
                  </p>
                  <div className="flex items-center gap-3">
                    {[
                      { dot: 'bg-emerald-400', label: '정상' },
                      { dot: 'bg-amber-400', label: '주의' },
                      { dot: 'bg-red-500', label: '위험' },
                    ].map(({ dot, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`size-2 rounded-full ${dot}`} />
                        <p className="text-[10px] text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 검색어 없을 때 안내 헤더 */}
              {!searchQuery && searchResult && searchResult.vessels.length > 0 && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-medium text-slate-400">최근 등록 어선 {searchResult.vessels.length}척</p>
                  <div className="flex items-center gap-3">
                    {[
                      { dot: 'bg-emerald-400', label: '정상' },
                      { dot: 'bg-amber-400', label: '주의' },
                      { dot: 'bg-red-500', label: '위험' },
                    ].map(({ dot, label }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`size-2 rounded-full ${dot}`} />
                        <p className="text-[10px] text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 결과 없음 */}
              {searchQuery && searchResult?.vessels.length === 0 && !isSearching && (
                <div className="flex flex-col items-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
                  <p className="text-sm font-bold text-slate-500 mb-1">"{searchQuery}" 검색 결과 없음</p>
                  <p className="text-xs text-slate-400 text-center">
                    배 이름이나 항구 이름을 다시 확인해 주세요
                  </p>
                </div>
              )}

              {/* 어선 카드 목록 */}
              <div className="space-y-2.5">
                {searchResult?.vessels.map((vessel) => (
                  <VesselSafetyCard
                    key={vessel.fsboNo}
                    vessel={vessel}
                    onSelect={setSelectedVessel}
                  />
                ))}
              </div>
            </>
          </>
        )}

        {/* ── TAB: 승선패스 ── */}
        {activeTab === 'pass' && (
          <>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-sky-900 mb-0.5">📋 개인 승선 정보 QR</p>
              <p className="text-xs text-sky-700 leading-relaxed">
                선장에게 이름·생년월일을 빠르게 전달하는 용도입니다. 법적 출항신고는 낚시해(海) 앱을 이용하세요.
              </p>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-5">승선자 정보 입력</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">이름 (본명)</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">생년월일</label>
                    <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">성별</label>
                    <div className="flex gap-2">
                      {(['M', 'F'] as const).map((g) => (
                        <button key={g} type="button" onClick={() => setGender(g)}
                          className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${gender === g ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          {g === 'M' ? '남성' : '여성'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">비상연락처</label>
                    <input type="tel" required value={emergency} onChange={e => setEmergency(e.target.value)}
                      pattern="[0-9]{3}-[0-9]{3,4}-[0-9]{4}" placeholder="010-0000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                  </div>
                </div>
                <button type="submit"
                  className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform">
                  저장 및 QR 발급
                </button>
                {profile && (
                  <button type="button" onClick={() => setIsEditing(false)}
                    className="w-full mt-2 text-slate-500 font-bold py-3 rounded-xl active:bg-slate-50 transition-colors">
                    취소
                  </button>
                )}
              </form>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
                  <div className="h-16 bg-gradient-to-r from-primary to-cyan-500 relative flex items-center px-6">
                    <span className="text-white font-black tracking-widest text-lg">BOARDING PASS</span>
                    <div className="absolute -bottom-3 left-0 right-0 h-6 bg-white rounded-t-[50%]" />
                  </div>
                  <div className="p-8 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-slate-50">
                      <QRCode value={qrData} size={200} level="M" fgColor="#0f172a" bgColor="#ffffff" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-6 mb-1">Passenger</p>
                    <h3 className="text-2xl font-black text-slate-900">{profile?.name}</h3>
                    <div className="w-full h-px bg-slate-100 my-6 flex items-center">
                      <div className="size-4 rounded-full bg-slate-50 -ml-2 border-r border-slate-100" />
                      <div className="border-t-2 border-dashed border-slate-200 flex-1" />
                      <div className="size-4 rounded-full bg-slate-50 -mr-2 border-l border-slate-100" />
                    </div>
                    <div className="w-full grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">DOB</p>
                        <p className="text-sm font-bold text-slate-800">{profile?.birthDate.replace(/-/g, '.')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Gender</p>
                        <p className="text-sm font-bold text-slate-800">{profile?.gender === 'M' ? 'Male' : 'Female'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Emergency</p>
                        <p className="text-sm font-bold text-slate-800">{profile?.emergencyContact}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(true)}
                    className="w-full bg-slate-50 py-4 text-sm font-bold text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2 border-t border-slate-100">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    정보 수정하기
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: 신고방법 ── */}
        {activeTab === 'guide' && <GuideTab />}
      </div>

      {/* 어선 상세 시트 */}
      {selectedVessel && (
        <VesselDetailSheet vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />
      )}
    </div>
  );
}
