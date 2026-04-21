"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  AlertTriangle,
  Fish,
  X,
  ChevronRight,
  Send,
} from "lucide-react";
import {
  FISH_DEX_DB,
  searchFishDex,
  FishDexEntry,
  DialectEntry,
} from "@/data/fishDexDB";

type CategoryTab = "all" | "saltwater" | "freshwater";

function DialectBadge({ dialect }: { dialect: DialectEntry }) {
  if (!dialect.verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-medium">
        <AlertTriangle size={9} className="shrink-0" />
        {dialect.region}: {dialect.name}
        <span className="text-amber-500/60 text-[9px]">제보됨</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/60 text-[10px] font-medium">
      {dialect.region}: {dialect.name}
    </span>
  );
}

function CategoryBadge({ category }: { category: FishDexEntry["category"] }) {
  if (category === "saltwater") {
    return (
      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
        바다
      </span>
    );
  }
  if (category === "freshwater") {
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
        민물
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
      바다·민물
    </span>
  );
}

function FishCard({
  entry,
  onSelect,
}: {
  entry: FishDexEntry;
  onSelect: () => void;
}) {
  const previewDialects = entry.dialects.slice(0, 3);
  const remaining = entry.dialects.length - previewDialects.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left bg-[#0e1823] rounded-2xl p-4 border border-white/5 hover:border-[#c9a84c]/30 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-white">{entry.name}</span>
            <CategoryBadge category={entry.category} />
          </div>
          <p className="text-[11px] text-white/40 mt-0.5">{entry.nameEn}</p>
        </div>
        <ChevronRight size={14} className="text-white/20 mt-1 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {previewDialects.map((d, i) => (
          <DialectBadge key={i} dialect={d} />
        ))}
        {remaining > 0 && (
          <span className="text-[10px] text-white/30 px-1.5 py-0.5">
            +{remaining}개
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/40">
        <span>제철 {entry.season}</span>
        {entry.methods.slice(0, 2).map((m, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 bg-white/5 rounded-full text-white/50"
          >
            {m}
          </span>
        ))}
      </div>
    </button>
  );
}

function ReportForm({
  fishName,
  onClose,
}: {
  fishName: string;
  onClose: () => void;
}) {
  const [region, setRegion] = useState("");
  const [dialectName, setDialectName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!region.trim() || !dialectName.trim()) return;

    const reports = JSON.parse(localStorage.getItem("fishdex_reports") || "[]");
    reports.push({
      fishName,
      region: region.trim(),
      name: dialectName.trim(),
      submittedAt: new Date().toISOString(),
    });
    localStorage.setItem("fishdex_reports", JSON.stringify(reports));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-[#c9a84c]">
          제보해주셔서 감사합니다.
        </p>
        <p className="text-xs text-white/50 mt-1">검토 후 반영됩니다.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-white">방언 제보하기</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="지역 (예: 경북)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#c9a84c]/50 focus:outline-none transition-all"
        />
        <input
          type="text"
          value={dialectName}
          onChange={(e) => setDialectName(e.target.value)}
          placeholder="방언명 (예: 갱빙어)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#c9a84c]/50 focus:outline-none transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={!region.trim() || !dialectName.trim()}
        className="w-full flex items-center justify-center gap-2 bg-[#c9a84c] disabled:opacity-40 text-[#080d14] font-bold text-sm rounded-xl py-2.5 transition-opacity"
      >
        <Send size={14} />
        제보 제출
      </button>
    </form>
  );
}

function DetailSheet({
  entry,
  onClose,
}: {
  entry: FishDexEntry;
  onClose: () => void;
}) {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0e1823] rounded-t-3xl border-t border-white/10 max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0e1823] px-5 pt-4 pb-3 border-b border-white/5 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{entry.name}</h2>
              <CategoryBadge category={entry.category} />
            </div>
            <p className="text-xs text-white/40 mt-0.5 italic">
              {entry.nameScientific}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={16} className="text-white/50" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-1">영문명</p>
              <p className="text-xs font-semibold text-white">{entry.nameEn}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-1">크기</p>
              <p className="text-xs font-semibold text-white">{entry.size}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-1">제철</p>
              <p className="text-xs font-semibold text-[#c9a84c]">
                {entry.season}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-1">서식지</p>
              <p className="text-xs font-semibold text-white">
                {entry.habitat}
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-white/40 mb-2">낚시 방법</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.methods.map((m, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-[#c9a84c]/15 border border-[#c9a84c]/20 text-[#c9a84c] text-xs rounded-full font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-white/40 mb-1">특징</p>
            <p className="text-xs text-white/70 leading-relaxed">
              {entry.characteristics}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-white/40 mb-2">
              방언 ({entry.dialects.length}개)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.dialects.map((d, i) => (
                <DialectBadge key={i} dialect={d} />
              ))}
            </div>
          </div>

          {showReportForm ? (
            <ReportForm
              fishName={entry.name}
              onClose={() => setShowReportForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowReportForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-[#c9a84c]/30 hover:bg-[#c9a84c]/5 text-white/60 hover:text-[#c9a84c] text-sm font-medium rounded-xl py-3 transition-all"
            >
              <Fish size={15} />
              방언 제보하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FishDexPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryTab>("all");
  const [selected, setSelected] = useState<FishDexEntry | null>(null);

  const filtered = useMemo(() => {
    let results = query ? searchFishDex(query) : FISH_DEX_DB;
    if (category === "saltwater") {
      results = results.filter(
        (e) => e.category === "saltwater" || e.category === "both",
      );
    } else if (category === "freshwater") {
      results = results.filter(
        (e) => e.category === "freshwater" || e.category === "both",
      );
    }
    return results;
  }, [query, category]);

  const tabs: { key: CategoryTab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "saltwater", label: "바다" },
    { key: "freshwater", label: "민물" },
  ];

  return (
    <>
      <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] overflow-x-hidden pb-24">
        <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
          <Link
            href="/"
            className="size-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
          >
            <ArrowLeft size={20} className="text-white/50" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">물고기 사전</h1>
            <p className="text-[10px] text-white/30">
              방언·지역명으로 어종 검색
            </p>
          </div>
          <span className="text-[10px] text-white/30 font-medium">
            {FISH_DEX_DB.length}종
          </span>
        </header>

        <div className="space-y-3 px-4 pt-4">
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle
              size={14}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <p className="text-[11px] text-amber-400/80 leading-relaxed">
              <span className="font-semibold text-amber-400">주의</span> 로
              표시된 방언은 커뮤니티 제보 데이터로, 공식 검증되지 않았습니다.
            </p>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="표준명·방언·영문명으로 검색"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#c9a84c]/50 focus:outline-none transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex h-9 items-center rounded-xl bg-white/5 border border-white/5 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all ${
                  category === tab.key
                    ? "bg-[#c9a84c] text-[#080d14]"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filtered.map((entry) => (
              <FishCard
                key={entry.id}
                entry={entry}
                onSelect={() => setSelected(entry)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-14">
              <Fish size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm font-bold text-white/30">
                검색 결과가 없습니다
              </p>
              <p className="text-xs text-white/20 mt-1">
                표준명, 방언, 영문명으로 검색해 보세요
              </p>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DetailSheet entry={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
