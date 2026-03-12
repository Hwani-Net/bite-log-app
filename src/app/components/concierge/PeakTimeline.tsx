'use client';

import { useMemo, useState } from 'react';
import { TideData } from '@/services/tideService';
import { getSpeciesPeakWindows, TimelineSlot } from '@/services/biteTimeService';
import { getSpeciesConditions } from '@/services/speciesBiteService';
import { useDragScroll } from '@/hooks/useDragScroll';

interface PeakTimelineProps {
  tideData: TideData | null;
  locale: string;
}

const GRADE_COLORS: Record<TimelineSlot['grade'], { bar: string; bg: string; ring: string }> = {
  peak: { bar: 'bg-gradient-to-t from-orange-500 to-amber-400', bg: 'bg-amber-50', ring: 'ring-amber-400' },
  good: { bar: 'bg-gradient-to-t from-blue-500 to-cyan-400', bg: 'bg-blue-50', ring: 'ring-blue-400' },
  fair: { bar: 'bg-gradient-to-t from-slate-400 to-slate-300', bg: 'bg-slate-50', ring: 'ring-slate-300' },
  low:  { bar: 'bg-slate-200', bg: 'bg-slate-50', ring: 'ring-slate-200' },
};

// Species list for filter chips
const SPECIES_LIST = getSpeciesConditions().map(s => ({ name: s.species, emoji: s.emoji }));

export default function PeakTimeline({ tideData, locale }: PeakTimelineProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const dragRef = useDragScroll();
  const peakCardsDragRef = useDragScroll();

  const slots = useMemo(
    () => getSpeciesPeakWindows(tideData, selectedSpecies),
    [tideData, selectedSpecies],
  );
  const currentHour = new Date().getHours();
  
  // Find best slots for summary — always show ALL peak + good slots (not just golden)
  const peakSlots = slots.filter(s => s.grade === 'peak' || s.grade === 'good');
  const bestSlots = peakSlots;

  // Group consecutive best hours into ranges
  const ranges = useMemo(() => {
    const sorted = bestSlots.sort((a, b) => a.hour - b.hour);
    const groups: { start: number; end: number; tags: string[] }[] = [];
    for (const slot of sorted) {
      const last = groups[groups.length - 1];
      if (last && slot.hour === last.end + 1) {
        last.end = slot.hour;
        slot.tags.forEach(t => { if (!last.tags.includes(t)) last.tags.push(t); });
      } else {
        groups.push({ start: slot.hour, end: slot.hour, tags: [...slot.tags] });
      }
    }
    return groups;
  }, [bestSlots]);

  const maxScore = Math.max(...slots.map(s => s.score), 1);

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-amber-500 text-xl">schedule</span>
        <h3 className="text-base font-bold text-slate-900">
          {locale === 'ko' ? '⏰ 피크 타임 예측' : '⏰ Peak Time Forecast'}
        </h3>
      </div>

      {/* Species Filter Chips — drag to scroll */}
      <div className="relative mb-3">
        <div
          ref={dragRef}
          className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 px-1"
        >
          <button
            onClick={() => setSelectedSpecies(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              selectedSpecies === null
                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white border-transparent shadow-md shadow-primary/30 scale-105'
                : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'
            }`}
          >
            {locale === 'ko' ? '🎣 전체' : '🎣 All'}
          </button>
          {SPECIES_LIST.map(sp => (
            <button
              key={sp.name}
              onClick={() => setSelectedSpecies(prev => prev === sp.name ? null : sp.name)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap ${
                selectedSpecies === sp.name
                  ? 'bg-gradient-to-r from-primary to-cyan-500 text-white border-transparent shadow-md shadow-primary/30 scale-105'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'
              }`}
            >
              {sp.emoji} {sp.name}
            </button>
          ))}
        </div>
        {/* Right fade overlay — scroll hint */}
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
      </div>

      {/* Species badge */}
      {selectedSpecies && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gradient-to-r from-primary/5 to-cyan-400/5 rounded-xl border border-primary/10">
          <span className="text-xs text-primary font-bold">
            {SPECIES_LIST.find(s => s.name === selectedSpecies)?.emoji} {selectedSpecies}
          </span>
          <span className="text-[10px] text-slate-400">
            {locale === 'ko' ? '시간대별 활성도 반영' : 'Hourly activity applied'}
          </span>
        </div>
      )}

      {/* Peak Summary Cards — drag to scroll */}
      {ranges.length > 0 && (
        <div className="relative mb-4">
          {/* Force-hide scrollbar on webkit browsers */}
          <style>{`[data-peak-cards]::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }`}</style>
          <div
            ref={peakCardsDragRef}
            data-peak-cards=""
            className="flex gap-2 pb-1 cursor-grab active:cursor-grabbing"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {ranges.map((range, i) => {
              const isGolden = range.tags.some(t => t.includes('골든'));
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl border ${
                    isGolden
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-sm shadow-amber-200/50'
                      : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {isGolden && <span className="text-sm">⭐</span>}
                    <span className={`text-xs font-bold ${isGolden ? 'text-amber-700' : 'text-blue-700'}`}>
                      {isGolden ? (locale === 'ko' ? '골든타임' : 'Golden Time') : (locale === 'ko' ? '피크' : 'Peak')}
                    </span>
                  </div>
                  <p className={`text-sm font-bold ${isGolden ? 'text-amber-900' : 'text-blue-900'}`}>
                    {`${String(range.start).padStart(2, '0')}:00 ~ ${String(range.end + 1).padStart(2, '0')}:00`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {range.tags.filter(t => !t.includes('골든')).slice(0, 2).map((tag, j) => (
                      <span key={j} className="text-[10px] text-slate-500">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Right fade overlay — scroll hint */}
          <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
        </div>
      )}

      {/* 24h Timeline Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-end gap-[2px] h-28">
          {slots.map((slot) => {
            const height = Math.max(15, (slot.score / maxScore) * 100);
            const isCurrent = slot.hour === currentHour;
            const colors = GRADE_COLORS[slot.grade];

            return (
              <div
                key={slot.hour}
                className="flex-1 flex flex-col items-center justify-end relative group"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                  <p className="font-bold">{slot.label} — {slot.score}점</p>
                  {slot.tags.slice(0, 2).map((t, i) => (
                    <p key={i} className="text-[8px] text-slate-300">{t}</p>
                  ))}
                </div>

                {/* Golden time star */}
                {slot.isGoldenTime && (
                  <span className="text-[8px] mb-0.5 animate-pulse">⭐</span>
                )}

                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${colors.bar} ${
                    isCurrent ? 'ring-2 ring-offset-1 ' + colors.ring : ''
                  }`}
                  style={{ height: `${height}%`, minHeight: '6px' }}
                />

                {/* Current time marker */}
                {isCurrent && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hour Labels */}
        <div className="flex gap-[2px] mt-1.5 border-t border-slate-100 pt-1">
          {slots.map((slot) => (
            <div
              key={slot.hour}
              className={`flex-1 text-center text-[7px] ${
                slot.hour === currentHour 
                  ? 'text-primary font-bold' 
                  : slot.hour % 3 === 0 ? 'text-slate-500' : 'text-transparent'
              }`}
            >
              {slot.hour}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
            {locale === 'ko' ? '피크' : 'Peak'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
            {locale === 'ko' ? '좋음' : 'Good'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            {locale === 'ko' ? '보통' : 'Fair'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            {locale === 'ko' ? '낮음' : 'Low'}
          </span>
          <span className="flex items-center gap-0.5 text-primary font-bold">
            ▲ {locale === 'ko' ? '현재' : 'Now'}
          </span>
        </div>
      </div>
    </div>
  );
}
