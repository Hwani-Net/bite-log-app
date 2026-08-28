"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import { getDataService } from "@/services/dataServiceFactory";
import { CatchRecord } from "@/types";
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronRight,
  MapPin,
  SortAsc,
  Fish,
  X,
  Download,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

import { fishGradient } from "@/lib/fishColors";
import { filterRecords, recordsToCsv } from "@/lib/recordFilters";

type SortBy = "date" | "size" | "count";
type ViewMode = "list" | "gallery";

function exportRecords(records: CatchRecord[], format: "json" | "csv") {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === "json") {
    content = JSON.stringify(records, null, 2);
    filename = `bitelog_records_${new Date().toISOString().slice(0, 10)}.json`;
    mimeType = "application/json";
  } else {
    // 전 필드 CSV — 예전엔 14필드 중 7개만 나갔다(5차 GOAL-1).
    content = recordsToCsv(records);
    filename = `bitelog_records_${new Date().toISOString().slice(0, 10)}.csv`;
    mimeType = "text/csv;charset=utf-8;";
  }

  const blob = new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type GroupedItem =
  | { type: "header"; yearMonth: string; label: string; count: number }
  | { type: "record"; record: CatchRecord };

export default function RecordsPage() {
  const { t, locale } = useAppStore();
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    getDataService().getCatchRecords().then(setRecords);
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(locale === "ko" ? "삭제할까요?" : "Delete?")) return;
    await getDataService().deleteCatchRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => {
    // 어종 칩은 어종 필드 전용 — 예전엔 검색 문자열을 공유해서 "우럭"
    // 칩이 메모에만 우럭이 적힌 다른 어종 기록까지 남겼다(5차 GOAL-1).
    let result = filterRecords(records, {
      search,
      species: speciesFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      photosOnly,
    });

    // Sort
    switch (sortBy) {
      case "date":
        result = [...result].sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "size":
        result = [...result].sort((a, b) => (b.sizeCm ?? 0) - (a.sizeCm ?? 0));
        break;
      case "count":
        result = [...result].sort((a, b) => b.count - a.count);
        break;
    }

    return result;
  }, [records, search, speciesFilter, dateFrom, dateTo, photosOnly, sortBy]);

  // Unique species for quick filter chips
  const speciesList = useMemo(() => {
    const set = new Set(records.map((r) => r.species));
    return Array.from(set);
  }, [records]);

  const groupedItems = useMemo<GroupedItem[]>(() => {
    if (sortBy !== "date") {
      return filtered.map((record) => ({ type: "record", record }));
    }

    const items: GroupedItem[] = [];
    let lastYearMonth = "";

    for (const record of filtered) {
      // record.date format: "YYYY-MM-DD"
      const yearMonth = record.date.slice(0, 7); // "YYYY-MM"

      if (yearMonth !== lastYearMonth) {
        const [year, month] = yearMonth.split("-").map(Number);
        const label =
          locale === "ko"
            ? `${year}년 ${month}월`
            : new Date(year, month - 1).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              });

        const count = filtered.filter(
          (r) => r.date.slice(0, 7) === yearMonth,
        ).length;

        items.push({ type: "header", yearMonth, label, count });
        lastYearMonth = yearMonth;
      }

      items.push({ type: "record", record });
    }

    return items;
  }, [filtered, sortBy, locale]);

  const sortOptions: { value: SortBy; label: string; icon: string }[] = [
    {
      value: "date",
      label: locale === "ko" ? "최신순" : "Newest",
      icon: "calendar_today",
    },
    {
      value: "size",
      label: locale === "ko" ? "크기순" : "Size",
      icon: "straighten",
    },
    {
      value: "count",
      label: locale === "ko" ? "마릿수순" : "Count",
      icon: "tag",
    },
  ];

  return (
    <div className="bg-[#080d14] text-white min-h-dvh page-enter relative z-10 px-4 pt-4 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 mb-4">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </Link>
        <h1 className="text-lg font-bold text-white tracking-[0.1em] uppercase">
          {t("home.recentCatch")}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            <button
              aria-label="리스트 뷰"
              onClick={() => setViewMode("list")}
              className={`size-7 flex items-center justify-center rounded-lg transition-all ${viewMode === "list" ? "bg-[#c9a84c] text-[#080d14]" : "text-white/40 hover:text-white/70"}`}
            >
              <LayoutList size={14} />
            </button>
            <button
              aria-label="갤러리 뷰"
              onClick={() => setViewMode("gallery")}
              className={`size-7 flex items-center justify-center rounded-lg transition-all ${viewMode === "gallery" ? "bg-[#c9a84c] text-[#080d14]" : "text-white/40 hover:text-white/70"}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <div className="relative">
            <button
              aria-label="내보내기"
              onClick={() => setShowExport((v) => !v)}
              className="size-8 flex items-center justify-center rounded-xl text-white/50 hover:bg-white/10 transition-colors"
            >
              <Download size={18} aria-hidden="true" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-10 z-20 flex flex-col gap-1 rounded-2xl bg-[#111820] border border-white/10 p-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => {
                    exportRecords(filtered, "csv");
                    setShowExport(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/70 hover:border-[#c9a84c]/50 transition-colors whitespace-nowrap"
                >
                  CSV 다운로드
                </button>
                <button
                  onClick={() => {
                    exportRecords(filtered, "json");
                    setShowExport(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/70 hover:border-[#c9a84c]/50 transition-colors whitespace-nowrap"
                >
                  JSON 다운로드
                </button>
              </div>
            )}
          </div>
          <span className="text-sm text-white/60">
            {filtered.length}
            {locale === "ko" ? "건" : ""}
          </span>
        </div>
      </header>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            locale === "ko"
              ? "어종, 장소, 메모 검색..."
              : "Search species, location, memo..."
          }
          className="w-full pl-10 pr-12 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/30 transition-all"
        />
        <button
          aria-label="필터"
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-xl transition-colors ${showFilters ? "bg-[#c9a84c] text-[#080d14]" : "text-white/60 hover:bg-white/10"}`}
        >
          <Filter size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Sort */}
          <div className="flex gap-2">
            {sortOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setSortBy(value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  sortBy === value
                    ? "bg-[#c9a84c] text-[#080d14] shadow-sm"
                    : "bg-white/5 text-white/50 border border-white/10"
                }`}
              >
                <DynamicIcon name={icon} size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Species chips — 어종 필드 전용 필터 */}
          {speciesList.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSpeciesFilter("")}
                aria-pressed={!speciesFilter}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !speciesFilter
                    ? "bg-[#c9a84c]/20 text-[#c9a84c]"
                    : "bg-white/5 text-white/60"
                }`}
              >
                {locale === "ko" ? "전체" : "All"}
              </button>
              {speciesList.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeciesFilter(speciesFilter === s ? "" : s)}
                  aria-pressed={speciesFilter === s}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    speciesFilter === s
                      ? "bg-[#c9a84c]/20 text-[#c9a84c]"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 날짜 범위 + 사진 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              aria-label={locale === "ko" ? "시작 날짜" : "From date"}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
            <span className="text-white/40 text-xs">~</span>
            <input
              type="date"
              aria-label={locale === "ko" ? "종료 날짜" : "To date"}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
            <button
              onClick={() => setPhotosOnly((v) => !v)}
              aria-pressed={photosOnly}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                photosOnly
                  ? "bg-[#7dd3fc]/20 text-[#7dd3fc]"
                  : "bg-white/5 text-white/60"
              }`}
            >
              {locale === "ko" ? "사진 있는 기록" : "With photos"}
            </button>
            {(dateFrom || dateTo || photosOnly || speciesFilter || search) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPhotosOnly(false);
                  setSpeciesFilter("");
                  setSearch("");
                }}
                className="text-xs text-[#c9a84c] underline underline-offset-2"
              >
                {locale === "ko" ? "필터 초기화" : "Clear"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <DynamicIcon
            name={search ? "search" : "set_meal"}
            size={48}
            className="text-white/20 mb-3 block"
          />
          <p className="text-white/60">
            {search
              ? locale === "ko"
                ? "검색 결과가 없습니다"
                : "No results found"
              : t("home.noCatches")}
          </p>
          {!search && (
            <Link
              href="/record"
              className="inline-block mt-4 bg-[#c9a84c] text-[#080d14] rounded-xl px-6 py-3 text-sm font-medium"
            >
              첫 조과 기록하기
            </Link>
          )}
        </div>
      ) : viewMode === "gallery" ? (
        /* ── Gallery view ── */
        <div className="grid grid-cols-3 gap-1.5 pb-4">
          {filtered.map((record) => {
            const hasPhoto =
              record.photos.length > 0 &&
              !record.photos[0].startsWith("/fish-");
            const colorClass = fishGradient(record.species);

            return (
              <Link
                key={record.id}
                href={`/records/detail?id=${record.id}`}
                className="relative aspect-square overflow-hidden rounded-xl block group"
              >
                {hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.photos[0]}
                    alt={record.species}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}
                  >
                    <Fish size={28} className="text-white/40" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d14]/90 via-transparent to-transparent" />
                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[10px] font-bold text-white leading-tight truncate">
                    {record.species}
                  </p>
                  <p className="text-[9px] text-white/50 leading-tight">
                    {record.sizeCm
                      ? `${record.sizeCm}cm`
                      : `${record.count}${locale === "ko" ? "마리" : ""}`}
                  </p>
                </div>
                {/* Top-right date badge */}
                <div className="absolute top-1.5 right-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-[#080d14]/70 text-[8px] text-white/60 font-medium backdrop-blur-sm">
                    {record.date.slice(5)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── List view (original) ── */
        <div className="flex flex-col gap-3 pb-4">
          {groupedItems.map((item, idx) => {
            if (item.type === "header") {
              const isFirst = idx === 0;
              return (
                <div
                  key={`header-${item.yearMonth}`}
                  className={`flex items-center justify-between text-xs text-white/40 uppercase tracking-widest pb-1 ${isFirst ? "pt-0" : "pt-4"}`}
                >
                  <span>{item.label}</span>
                  <span className="normal-case tracking-normal text-white/30">
                    {item.count}
                    {locale === "ko" ? "건" : " records"}
                  </span>
                </div>
              );
            }

            const record = item.record;
            return (
              <Link
                key={record.id}
                href={`/records/detail?id=${record.id}`}
                className="flex items-start gap-3 p-3 rounded-2xl glass-morphism border border-white/5 hover:border-[#c9a84c]/30 transition-all active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-[#c9a84c]/40 to-[#7dd3fc]/30 flex items-center justify-center shrink-0 overflow-hidden">
                  {record.photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.photos[0]}
                      alt={record.species}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Fish size={20} className="text-[#c9a84c]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white">
                      {record.species}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#c9a84c]/20 text-[#c9a84c]">
                      {record.count}
                      {t("home.unit.fish")}
                    </span>
                    {record.sizeCm && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc]">
                        {record.sizeCm}cm
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/60">
                    <MapPin size={14} />
                    <span className="truncate">{record.location.name}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-white/60">
                    <DynamicIcon name="calendar_today" size={14} />
                    <span>{record.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                    aria-label={t("common.delete")}
                  >
                    <DynamicIcon name="delete" size={18} />
                  </button>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
