'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';
import { getDataService } from '@/services/dataServiceFactory';
import { CatchRecord } from '@/types';

type SortBy = 'date' | 'size' | 'count';

export default function RecordsPage() {
  const { t, locale } = useAppStore();
  const [records, setRecords] = useState<CatchRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getDataService().getCatchRecords().then(setRecords);
  }, []);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(locale === 'ko' ? '삭제할까요?' : 'Delete?')) return;
    await getDataService().deleteCatchRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => {
    let result = records;

    // Search by species, location, memo
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.species.toLowerCase().includes(q) ||
        r.location.name.toLowerCase().includes(q) ||
        r.memo?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'date':
        result = [...result].sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'size':
        result = [...result].sort((a, b) => (b.sizeCm ?? 0) - (a.sizeCm ?? 0));
        break;
      case 'count':
        result = [...result].sort((a, b) => b.count - a.count);
        break;
    }

    return result;
  }, [records, search, sortBy]);

  // Unique species for quick filter chips
  const speciesList = useMemo(() => {
    const set = new Set(records.map((r) => r.species));
    return Array.from(set);
  }, [records]);

  const sortOptions: { value: SortBy; label: string; icon: string }[] = [
    { value: 'date', label: locale === 'ko' ? '최신순' : 'Newest', icon: 'calendar_today' },
    { value: 'size', label: locale === 'ko' ? '크기순' : 'Size', icon: 'straighten' },
    { value: 'count', label: locale === 'ko' ? '마릿수순' : 'Count', icon: 'tag' },
  ];

  return (
    <div className="page-enter relative z-10 px-4 pt-4 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 mb-4">
        <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('home.recentCatch')}</h1>
        <span className="text-sm text-slate-400 ml-auto">{filtered.length}{locale === 'ko' ? '건' : ''}</span>
      </header>

      {/* Search bar */}
      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'ko' ? '어종, 장소, 메모 검색...' : 'Search species, location, memo...'}
          className="w-full pl-10 pr-12 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-900 dark:text-slate-100"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-xl transition-colors ${showFilters ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          <span className="material-symbols-outlined text-lg">tune</span>
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
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Species chips */}
          {speciesList.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSearch('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !search ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {locale === 'ko' ? '전체' : 'All'}
              </button>
              {speciesList.map((s) => (
                <button
                  key={s}
                  onClick={() => setSearch(search === s ? '' : s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    search === s ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">
            {search ? 'search_off' : 'set_meal'}
          </span>
          <p className="text-slate-400">
            {search
              ? (locale === 'ko' ? '검색 결과가 없습니다' : 'No results found')
              : t('home.noCatches')}
          </p>
        </div>
      ) : (
        /* Records list — tap to view detail */
        <div className="flex flex-col gap-3 pb-4">
          {filtered.map((record) => (
            <Link
              key={record.id}
              href={`/records/detail?id=${record.id}`}
              className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shrink-0 overflow-hidden">
                {record.photos.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.photos[0]} alt={record.species} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-white text-xl">set_meal</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{record.species}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                    {record.count}{t('home.unit.fish')}
                  </span>
                  {record.sizeCm && (
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                      {record.sizeCm}cm
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span className="truncate">{record.location.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>{record.date}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  onClick={(e) => handleDelete(e, record.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label={t('common.delete')}
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
                <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
