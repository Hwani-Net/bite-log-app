"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import {
  FISH_REGULATION_DB,
  FishRegulation,
  getClosedSpecies,
  searchRegulations,
  isCatchLegal,
} from "@/data/fishRegulationDB";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  AlertTriangle,
  Fish,
  BookOpen,
} from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

// ── Status badge component ────────────────────────────────────────────────────
function StatusBadge({
  reg,
  month,
  day,
}: {
  reg: FishRegulation;
  month: number;
  day: number;
}) {
  const inClosed =
    reg.closedSeason &&
    (() => {
      const [startM, startD] = reg.closedSeason!.start.split("/").map(Number);
      const [endM, endD] = reg.closedSeason!.end.split("/").map(Number);
      const current = month * 100 + day;
      return current >= startM * 100 + startD && current <= endM * 100 + endD;
    })();

  if (inClosed) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        금어기 중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
      포획 가능
    </span>
  );
}

// ── Regulation card ───────────────────────────────────────────────────────────
function RegulationCard({
  reg,
  month,
  day,
  expanded,
  onToggle,
}: {
  reg: FishRegulation;
  month: number;
  day: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { legal, violations } = isCatchLegal(reg.species, null, month, day);

  return (
    <div
      className={`bg-white/5 backdrop-blur-[12px] rounded-2xl border overflow-hidden transition-all ${
        !legal ? "border-red-500/30" : "border-white/10"
      }`}
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <Fish className="w-6 h-6 text-white/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">{reg.species}</h3>
            <StatusBadge reg={reg} month={month} day={day} />
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">{reg.speciesEn}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {reg.minSizeCm && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] font-bold">
              {reg.minSizeCm}cm↑
            </span>
          )}
          <ChevronRight
            size={14}
            className={`text-white/20 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 animate-fadeIn border-t border-white/5">
          {/* Violations warning */}
          {violations.length > 0 && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400">현재 위반 사항</p>
                {violations.map((v, i) => (
                  <p key={i} className="text-xs text-red-400/80 mt-0.5">
                    • {v}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Closed season info */}
          {reg.closedSeason && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
              <DynamicIcon
                name="calendar_today"
                size={16}
                className="text-red-400"
              />
              <div>
                <p className="text-xs font-semibold text-white/50">금어기</p>
                <p className="text-xs text-white font-bold">
                  {reg.closedSeason.start} ~ {reg.closedSeason.end}
                </p>
                {reg.closedSeason.note && (
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {reg.closedSeason.note}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Min size */}
          {reg.minSizeCm && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
              <DynamicIcon
                name="straighten"
                size={16}
                className="text-[#c9a84c]"
              />
              <div>
                <p className="text-xs font-semibold text-white/50">
                  포획금지 체장
                </p>
                <p className="text-xs text-white font-bold">
                  {reg.minSizeCm}cm 미만 포획 금지
                </p>
              </div>
            </div>
          )}

          {/* Daily limit */}
          {reg.dailyLimit && (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
              <DynamicIcon name="info" size={16} className="text-[#7dd3fc]" />
              <div>
                <p className="text-xs font-semibold text-white/50">
                  일일 포획 제한
                </p>
                <p className="text-xs text-white font-bold">
                  {reg.dailyLimit}마리/일
                </p>
              </div>
            </div>
          )}

          {/* Regional notes */}
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs font-semibold text-white/50 mb-1.5 flex items-center gap-1">
              <DynamicIcon name="info" size={14} className="text-[#c9a84c]" />
              해역별 규정
            </p>
            {reg.regionalNotes.map((note, i) => (
              <p key={i} className="text-xs text-white/70 ml-5">
                • {note}
              </p>
            ))}
          </div>

          {/* Penalty */}
          <div className="flex items-start gap-2 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-3">
            <DynamicIcon
              name="shield"
              size={16}
              className="text-[#c9a84c] mt-0.5"
            />
            <div>
              <p className="text-xs font-semibold text-[#c9a84c]">과태료</p>
              <p className="text-xs text-white/70">{reg.penaltyNote}</p>
              <p className="text-[10px] text-[#c9a84c]/60 mt-0.5">
                {reg.legalRef}
              </p>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2 bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 rounded-xl p-3">
            <DynamicIcon
              name="lightbulb"
              size={14}
              className="text-[#7dd3fc] mt-0.5"
            />
            <p className="text-xs text-[#7dd3fc]/80">{reg.tipKo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick check widget ────────────────────────────────────────────────────────
function QuickCheckWidget() {
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [inputSize, setInputSize] = useState("");
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const result = useMemo(() => {
    if (!selectedSpecies) return null;
    const size = inputSize ? parseInt(inputSize) : null;
    return isCatchLegal(selectedSpecies, size, month, day);
  }, [selectedSpecies, inputSize, month, day]);

  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-br from-[#c9a84c] to-[#7dd3fc]">
      <div className="rounded-2xl bg-[#0f141b] p-5">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <DynamicIcon name="check" size={16} className="text-[#c9a84c]" />
          빠른 적법성 체크
        </h2>
        <div className="flex gap-2 mb-3">
          <select
            aria-label="어종 선택"
            value={selectedSpecies}
            onChange={(e) => setSelectedSpecies(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white appearance-none"
          >
            <option value="" className="bg-[#0f141b]">
              어종 선택
            </option>
            {FISH_REGULATION_DB.map((r) => (
              <option
                key={r.species}
                value={r.species}
                className="bg-[#0f141b]"
              >
                {r.species}
              </option>
            ))}
          </select>
          <div className="relative flex items-center">
            <input
              aria-label="체장(cm) 입력"
              type="number"
              value={inputSize}
              onChange={(e) => setInputSize(e.target.value)}
              placeholder="예: 25"
              min={0}
              max={300}
              className="w-24 bg-white/10 border border-white/20 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white placeholder:text-white/30 text-center"
            />
            <span className="absolute right-2.5 text-[10px] text-white/30 pointer-events-none">
              cm
            </span>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-xl p-3 ${result.legal ? "bg-[#c9a84c]/20" : "bg-red-500/20"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <DynamicIcon
                name={result.legal ? "check" : "close"}
                size={18}
                className={result.legal ? "text-[#c9a84c]" : "text-red-400"}
              />
              <span
                className={`text-sm font-bold ${result.legal ? "text-[#c9a84c]" : "text-red-400"}`}
              >
                {result.legal ? "포획 가능합니다" : "현재 포획 불가"}
              </span>
            </div>
            {result.violations.length > 0 && (
              <div className="space-y-0.5 mt-1">
                {result.violations.map((v, i) => (
                  <p key={i} className="text-xs text-white/70">
                    · {v}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RegulationsPage() {
  const locale = useAppStore((s) => s.locale);
  const isKo = locale === "ko";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "closed" | "size">("all");

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  // dateKey is stable within a day — safe useMemo dependency
  const dateKey = month * 100 + day;

  const closedNow = getClosedSpecies(month, day);

  const filteredRegulations = useMemo(() => {
    let results = searchQuery
      ? searchRegulations(searchQuery)
      : FISH_REGULATION_DB;
    if (filterTab === "closed") {
      // 현재 날짜가 금어기 범위 안에 있는 어종만 표시
      results = results.filter((r) => {
        if (!r.closedSeason) return false;
        const [startM, startD] = r.closedSeason.start.split("/").map(Number);
        const [endM, endD] = r.closedSeason.end.split("/").map(Number);
        return dateKey >= startM * 100 + startD && dateKey <= endM * 100 + endD;
      });
    } else if (filterTab === "size") {
      results = results.filter((r) => r.minSizeCm !== null);
    }
    return results;
  }, [searchQuery, filterTab, dateKey]);

  const tabs = [
    {
      key: "all" as const,
      label: isKo ? "전체" : "All",
      count: FISH_REGULATION_DB.length,
    },
    {
      key: "closed" as const,
      label: isKo ? "금어기" : "Closed",
      count: closedNow.length,
    },
    {
      key: "size" as const,
      label: isKo ? "체장 규정" : "Min Size",
      count: FISH_REGULATION_DB.filter((r) => r.minSizeCm).length,
    },
  ];

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
        >
          <ArrowLeft size={20} className="text-white/50" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">
            {isKo ? "금어기·법규 가이드" : "Fishing Regulations"}
          </h1>
          <p className="text-[10px] text-white/30">
            {isKo
              ? "수산자원관리법 기준 · 참고용"
              : "Based on Korean Fisheries Law"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-full px-2.5 py-1">
          <DynamicIcon name="shield" size={14} className="text-[#c9a84c]" />
          <span className="text-[10px] font-bold text-[#c9a84c]">
            {month}월
          </span>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* Quick check widget */}
        <QuickCheckWidget />

        {/* Closed season alert */}
        {closedNow.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-400">
                현재 금어기 어종 ({closedNow.length}종)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {closedNow.map((r) => (
                <span
                  key={r.species}
                  className="text-xs px-2.5 py-1 bg-red-500/20 text-red-300 rounded-full font-semibold"
                >
                  {r.species} ({r.closedSeason!.start}~{r.closedSeason!.end})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* FishDex link card */}
        <Link
          href="/fishdex"
          className="flex items-center gap-3 bg-surface rounded-2xl p-4 mb-4 hover:bg-white/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/20 flex items-center justify-center">
            <BookOpen size={20} className="text-[#c9a84c]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">
              물고기 사전 (FishDex)
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              방언·지역명으로 어종 검색
            </p>
          </div>
          <ChevronRight size={16} className="text-white/30 shrink-0" />
        </Link>

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isKo ? "어종으로 검색 (예: 감성돔, 우럭)" : "Search species..."
            }
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#c9a84c]/50 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
            >
              <DynamicIcon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex h-9 items-center rounded-xl bg-white/5 border border-white/5 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex cursor-pointer h-full grow items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all ${
                filterTab === tab.key
                  ? "bg-[#c9a84c] text-[#080d14]"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] ${filterTab === tab.key ? "text-[#080d14]/60" : "text-white/30"}`}
              >
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
            <p className="text-sm font-bold text-white/30 mt-3">
              {isKo ? "검색 결과가 없습니다" : "No results found"}
            </p>
            <p className="text-xs text-white/20 mt-1">
              {isKo ? "어종 이름을 확인해 주세요" : "Check the species name"}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-3 text-center">
          <p className="text-[10px] text-[#c9a84c]/70">
            {isKo
              ? "본 정보는 수산자원관리법 기준 참고용입니다. 정확한 규정은 해양수산부 공식 고시를 확인하세요."
              : "Reference only. Check official regulations from the Ministry of Oceans and Fisheries."}
          </p>
        </div>

        {/* Data source */}
        <p className="text-[10px] text-white/20 text-center pb-4">
          {isKo
            ? "출처: 수산자원관리법 시행규칙 별표4, 별표30 · 해양수산부 고시"
            : "Source: Korean Fisheries Resource Management Act"}
        </p>
      </div>
    </div>
  );
}
