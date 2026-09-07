"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { localISODate, parseLocalISODate } from "@/lib/localDate";
import { fishingTideForDate } from "@/lib/fishingTide";
import { PORT_COORDS } from "@/data/portCoords";
import { fetchStationTides, findNearestStation, tideRangeCm, TIDE_STATIONS, type TideData } from "@/services/tideService";

export default function BookingDatePicker({ value, min, region, port, onChange }: {
  value: string; min: string; region: string; port: string; onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Record<string, TideData | null>>({});
  const cache = useRef<Record<string, TideData>>({});
  const trigger = useRef<HTMLInputElement>(null);
  const scope = `${region}:${port}`;
  const [manualStation, setManualStation] = useState({ scope: "", code: "" });
  const coords = PORT_COORDS[port];
  const defaultCode = coords ? findNearestStation(coords.lat, coords.lng).code
    : ({ "1": "DT_0018", "3": "DT_0014", "2": "DT_0006", "130": "DT_0004" }[region] ?? "DT_0001");
  const stationCode = manualStation.scope === scope && manualStation.code ? manualStation.code : defaultCode;
  const station = TIDE_STATIONS.find(s => s.code === stationCode)!;
  const system = station.lng < 127 && station.lat > 35 ? 7 : 8;
  const dates = useMemo(() => {
    const first = parseLocalISODate(`${month}-01`);
    if (!first) return [];
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  }, [month]);

  useEffect(() => {
    if (!open || !dates.length) return;
    const controller = new AbortController();
    const pending = dates.filter(date => !cache.current[`${stationCode}:${date}`]);
    setResults(Object.fromEntries(dates.flatMap(date => {
      const key = `${stationCode}:${date}`;
      return cache.current[key] ? [[key, cache.current[key]]] : [];
    })));
    let index = 0;
    const load = async () => {
      while (index < pending.length && !controller.signal.aborted) {
        const date = pending[index++];
        const key = `${stationCode}:${date}`;
        const data = await fetchStationTides(stationCode, date.replaceAll("-", ""), controller.signal);
        if (controller.signal.aborted) return;
        if (data) cache.current[key] = data;
        setResults(prev => ({ ...prev, [key]: data }));
      }
    };
    // One visible month only; at most 3 requests, successes reused on reopen.
    void Promise.all(Array.from({ length: 3 }, load));
    return () => controller.abort();
  }, [open, dates, stationCode, retry]);

  const show = () => { setMonth((value || min).slice(0, 7)); setOpen(true); };
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const selectDate = (date: string) => {
    if (!parseLocalISODate(date) || date < min) return;
    onChange(date);
    close();
  };
  const moveMonth = (offset: number) => {
    const first = parseLocalISODate(`${month}-01`);
    if (first) setMonth(localISODate(new Date(first.getFullYear(), first.getMonth() + offset, 1)).slice(0, 7));
  };
  const selectedData = results[`${stationCode}:${value}`] ?? null;
  const selectedRange = tideRangeCm(selectedData);
  const failed = dates.some(d => results[`${stationCode}:${d}`] === null);

  return <div data-testid="booking-date-picker" onKeyDown={e => { if (e.key === "Escape") close(); }}>
    <label className="block">
      <span className="block text-xs text-white/50 mb-1.5 font-medium">
        <Calendar size={12} className="inline mr-1 text-[#c9a84c]" />출조 날짜
      </span>
      <input ref={trigger} type="date" value={value} min={min || undefined} aria-label="출조 날짜"
        aria-controls="booking-tide-calendar"
        onClick={e => { e.preventDefault(); show(); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) { e.preventDefault(); show(); } }}
        onChange={e => selectDate(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c]/50 transition-colors" />
    </label>
    <button type="button" onClick={open ? close : show} aria-expanded={open} aria-controls="booking-tide-calendar"
      className="text-xs text-[#c9a84c] underline underline-offset-2 py-2">{open ? "물때 달력 접기" : "물때·고저차 달력 보기"}</button>
    {open && <section id="booking-tide-calendar" aria-label="출조 물때 달력" className="bg-white/3 border border-white/8 rounded-2xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="물때 이전 달" disabled={month <= min.slice(0, 7)} onClick={() => moveMonth(-1)} className="p-3 rounded-lg text-white/60 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <h3 className="text-sm font-bold text-white" aria-live="polite">{month.replace("-", "년 ")}월</h3>
        <button type="button" aria-label="물때 다음 달" onClick={() => moveMonth(1)} className="p-3 rounded-lg text-white/60"><ChevronRight size={18} /></button>
        <button type="button" aria-label="물때 달력 닫기" onClick={close} className="p-3 rounded-lg text-white/60"><X size={16} /></button>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/60">고저차 기준 지점
        <select aria-label="고저차 기준 지점" value={stationCode} onChange={e => setManualStation({ scope, code: e.target.value })}
          className="min-w-0 flex-1 bg-[#080d14] border border-white/10 rounded-lg px-3 py-2 text-white">
          {TIDE_STATIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>
      <p className="text-[10px] text-white/50">{port ? `${port} 출항 · ` : ""}{station.name} 예보 기준 · {system}물때식<br />날짜 / 물때 / 조류 세기(추정) / 고저차(cm)</p>
      <div className="grid grid-cols-7 text-center text-[10px] text-white/40" aria-hidden="true">
        {["일", "월", "화", "수", "목", "금", "토"].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: parseLocalISODate(`${month}-01`)?.getDay() ?? 0 }, (_, i) => <span key={`blank-${i}`} />)}
        {dates.map((date, i) => {
          const tide = fishingTideForDate(date, system);
          const data = results[`${stationCode}:${date}`];
          const range = tideRangeCm(data ?? null);
          const rangeLabel = data === undefined ? "…" : range === null ? "—" : String(range);
          return <button key={date} type="button" disabled={date < min} aria-pressed={value === date}
            aria-label={`${date} ${tide?.label ?? "물때 미제공"} 조류 ${tide?.strengthLabel ?? "미제공"} 추정 고저차 ${range === null ? "미제공" : `${range}cm`}`}
            onClick={() => selectDate(date)} data-date={date}
            className={`min-w-0 py-2 rounded-lg border text-center disabled:opacity-30 ${value === date ? "bg-[#c9a84c]/20 border-[#c9a84c]" : "bg-white/3 border-white/5 hover:border-white/20"}`}>
            <span className="block text-xs font-bold text-white">{i + 1}</span>
            <span className="block text-[10px] text-[#c9a84c]">{tide?.label ?? "—"}</span>
            <span className="block text-[10px] text-white/60">{tide?.strengthLabel ?? "—"}</span>
            <span className="block text-[10px] text-white/40" data-testid="tide-range">{rangeLabel}</span>
          </button>;
        })}
      </div>
      <p className="text-xs text-white/70" data-testid="selected-tide-summary">{value.slice(5).replace("-", "/")} · {station.name} 고저차 {selectedRange === null ? "미제공" : `${selectedRange}cm`}</p>
      {selectedData && <p className="text-[10px] text-white/50">{selectedData.tides.map(t => `${t.type === "High" ? "만조" : "간조"} ${t.time} ${Math.round(t.level)}cm`).join(" · ")}</p>}
      {failed && <div role="status" className="text-xs text-white/60">일부 고저차를 불러오지 못했습니다. 날짜 선택은 가능합니다.
        <button type="button" onClick={() => setRetry(n => n + 1)} className="block text-[#c9a84c] underline py-2">고저차 다시 시도</button>
      </div>}
      <p className="text-[10px] text-white/40">고저차는 해당 일 최고 만조−최저 간조입니다. 조류 세기는 물때식 추정이며 실측 유속이 아닙니다. 실제 물살은 지형·바람에 따라 달라집니다. <a href="https://www.data.go.kr/data/15156018/openapi.do" target="_blank" rel="noopener noreferrer" className="underline">출처: 국립해양조사원 조석예보</a></p>
    </section>}
  </div>;
}
