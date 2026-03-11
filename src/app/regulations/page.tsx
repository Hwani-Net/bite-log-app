'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import {
  FISH_REGULATION_DB,
  FishRegulation,
  getClosedSpecies,
  searchRegulations,
  isCatchLegal,
} from '@/data/fishRegulationDB';

// ── Status badge component ────────────────────────────────────────────────────
function StatusBadge({ reg, month, day }: { reg: FishRegulation; month: number; day: number }) {
  const inClosed = reg.closedSeason && (() => {
    const [startM, startD] = reg.closedSeason!.start.split('/').map(Number);
    const [endM, endD] = reg.closedSeason!.end.split('/').map(Number);
    const current = month * 100 + day;
    return current >= startM * 100 + startD && current <= endM * 100 + endD;
  })();

  if (inClosed) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        금어기 중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      포획 가능
    </span>
  );
}

// ── Regulation card ───────────────────────────────────────────────────────────
function RegulationCard({ reg, month, day, expanded, onToggle }: {
  reg: FishRegulation;
  month: number;
  day: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { legal, violations } = isCatchLegal(reg.species, null, month, day);

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        !legal ? 'border-red-200' : 'border-slate-100'
      }`}
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-slate-50 transition-colors"
      >
        <span className="text-2xl">{reg.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{reg.species}</h3>
            <StatusBadge reg={reg} month={month} day={day} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{reg.speciesEn}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {reg.minSizeCm && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
              📏 {reg.minSizeCm}cm↑
            </span>
          )}
          <span className={`material-symbols-outlined text-sm text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 animate-fadeIn border-t border-slate-50">
          {/* Violations warning */}
          {violations.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="material-symbols-outlined text-red-500 text-base mt-0.5">warning</span>
              <div>
                <p className="text-xs font-bold text-red-700">현재 위반 사항</p>
                {violations.map((v, i) => (
                  <p key={i} className="text-xs text-red-600 mt-0.5">• {v}</p>
                ))}
              </div>
            </div>
          )}

          {/* Closed season info */}
          {reg.closedSeason && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <span className="material-symbols-outlined text-red-400 text-base">event_busy</span>
              <div>
                <p className="text-xs font-semibold text-slate-600">금어기</p>
                <p className="text-xs text-slate-800 font-bold">
                  {reg.closedSeason.start} ~ {reg.closedSeason.end}
                </p>
                {reg.closedSeason.note && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{reg.closedSeason.note}</p>
                )}
              </div>
            </div>
          )}

          {/* Min size */}
          {reg.minSizeCm && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <span className="material-symbols-outlined text-amber-500 text-base">straighten</span>
              <div>
                <p className="text-xs font-semibold text-slate-600">포획금지 체장</p>
                <p className="text-xs text-slate-800 font-bold">{reg.minSizeCm}cm 미만 포획 금지</p>
              </div>
            </div>
          )}

          {/* Daily limit */}
          {reg.dailyLimit && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <span className="material-symbols-outlined text-blue-500 text-base">production_quantity_limits</span>
              <div>
                <p className="text-xs font-semibold text-slate-600">일일 포획 제한</p>
                <p className="text-xs text-slate-800 font-bold">{reg.dailyLimit}마리/일</p>
              </div>
            </div>
          )}

          {/* Regional notes */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">info</span>
              해역별 규정
            </p>
            {reg.regionalNotes.map((note, i) => (
              <p key={i} className="text-xs text-slate-700 ml-5">• {note}</p>
            ))}
          </div>

          {/* Penalty */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">gavel</span>
            <div>
              <p className="text-xs font-semibold text-amber-700">과태료</p>
              <p className="text-xs text-amber-800">{reg.penaltyNote}</p>
              <p className="text-[10px] text-amber-500 mt-0.5">📋 {reg.legalRef}</p>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <span className="text-sm mt-0.5">💡</span>
            <p className="text-xs text-emerald-700">{reg.tipKo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick check widget ────────────────────────────────────────────────────────
function QuickCheckWidget() {
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [inputSize, setInputSize] = useState('');
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const result = useMemo(() => {
    if (!selectedSpecies) return null;
    const size = inputSize ? parseInt(inputSize) : null;
    return isCatchLegal(selectedSpecies, size, month, day);
  }, [selectedSpecies, inputSize, month, day]);

  return (
    <div className="bg-gradient-to-br from-primary to-cyan-500 rounded-2xl p-5 text-white shadow-xl shadow-primary/20">
      <h2 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">fact_check</span>
        빠른 적법성 체크
      </h2>
      <div className="flex gap-2 mb-3">
        <select
          value={selectedSpecies}
          onChange={e => setSelectedSpecies(e.target.value)}
          className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/60 appearance-none"
        >
          <option value="" className="text-slate-900">어종 선택</option>
          {FISH_REGULATION_DB.map(r => (
            <option key={r.species} value={r.species} className="text-slate-900">
              {r.emoji} {r.species}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={inputSize}
          onChange={e => setInputSize(e.target.value)}
          placeholder="크기(cm)"
          min={0}
          max={300}
          className="w-24 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/60 text-center"
        />
      </div>

      {result && (
        <div className={`rounded-xl p-3 ${result.legal ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-lg">
              {result.legal ? 'check_circle' : 'cancel'}
            </span>
            <span className="text-sm font-bold">
              {result.legal ? '✅ 포획 가능합니다' : '❌ 현재 포획 불가'}
            </span>
          </div>
          {result.violations.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {result.violations.map((v, i) => (
                <p key={i} className="text-xs text-white/90">⚠️ {v}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RegulationsPage() {
  const locale = useAppStore(s => s.locale);
  const isKo = locale === 'ko';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'closed' | 'size'>('all');

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const closedNow = getClosedSpecies(month, day);

  const filteredRegulations = useMemo(() => {
    let results = searchQuery ? searchRegulations(searchQuery) : FISH_REGULATION_DB;
    if (filterTab === 'closed') {
      results = results.filter(r => r.closedSeason !== null);
    } else if (filterTab === 'size') {
      results = results.filter(r => r.minSizeCm !== null);
    }
    return results;
  }, [searchQuery, filterTab]);

  const tabs = [
    { key: 'all' as const, label: isKo ? '전체' : 'All', count: FISH_REGULATION_DB.length },
    { key: 'closed' as const, label: isKo ? '금어기' : 'Closed', count: FISH_REGULATION_DB.filter(r => r.closedSeason).length },
    { key: 'size' as const, label: isKo ? '체장 규정' : 'Min Size', count: FISH_REGULATION_DB.filter(r => r.minSizeCm).length },
  ];

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-slate-50 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-slate-50 sticky top-0 z-30 backdrop-blur-md">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100"
        >
          <span className="material-symbols-outlined text-slate-500">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900">
            {isKo ? '금어기·법규 가이드' : 'Fishing Regulations'}
          </h1>
          <p className="text-[10px] text-slate-400">
            {isKo ? '수산자원관리법 기준 · 참고용' : 'Based on Korean Fisheries Law'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
          <span className="material-symbols-outlined text-primary text-sm">gavel</span>
          <span className="text-[10px] font-bold text-primary">{month}월</span>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* Quick check widget */}
        <QuickCheckWidget />

        {/* Closed season alert */}
        {closedNow.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-600">
                현재 금어기 어종 ({closedNow.length}종)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {closedNow.map(r => (
                <span key={r.species} className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                  {r.emoji} {r.species} ({r.closedSeason!.start}~{r.closedSeason!.end})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isKo ? '어종으로 검색 (예: 감성돔, 우럭)' : 'Search species...'}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex h-9 items-center rounded-xl bg-slate-200/50 p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex cursor-pointer h-full grow items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all ${
                filterTab === tab.key
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-slate-500'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] ${filterTab === tab.key ? 'text-primary/60' : 'text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Regulation cards */}
        <div className="space-y-3">
          {filteredRegulations.map((reg, idx) => (
            <RegulationCard
              key={reg.species}
              reg={reg}
              month={month}
              day={day}
              expanded={expandedIdx === idx}
              onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredRegulations.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-bold text-slate-600 mt-3">
              {isKo ? '검색 결과가 없습니다' : 'No results found'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isKo ? '어종 이름을 확인해 주세요' : 'Check the species name'}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-[10px] text-amber-600">
            ⚠️ {isKo
              ? '본 정보는 수산자원관리법 기준 참고용입니다. 정확한 규정은 해양수산부 공식 고시를 확인하세요.'
              : 'Reference only. Check official regulations from the Ministry of Oceans and Fisheries.'}
          </p>
        </div>

        {/* Data source */}
        <p className="text-[10px] text-slate-400 text-center pb-4">
          {isKo
            ? '출처: 수산자원관리법 시행규칙 별표4, 별표30 · 해양수산부 고시'
            : 'Source: Korean Fisheries Resource Management Act'}
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
