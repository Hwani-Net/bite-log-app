"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  MapPin,
  Fish,
} from "lucide-react";
import type {
  BoatCalendar,
  BoatCalendarDay,
} from "@/services/boatCalendarService";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ymToLabel(ym: string): string {
  return `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`;
}

function shiftYm(ym: string, delta: number): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4, 6)) - 1 + delta;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BoatDetailPage() {
  const params = useParams<{ uid: string }>();
  const uid = params?.uid ?? "";

  const [ym, setYm] = useState<string>(currentYm);
  const [calendar, setCalendar] = useState<BoatCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ?date=YYYY-MM-DD from the search grid jumps the calendar to that month
  // and pre-selects the day. Read after mount so server HTML and the
  // client's first render agree (see booking/page.tsx for the same note).
  useEffect(() => {
    const date = new URLSearchParams(window.location.search).get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setYm(date.slice(0, 4) + date.slice(5, 7));
      setSelectedDate(date);
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    fetch(`/api/boat-calendar?uid=${uid}&ym=${ym}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: BoatCalendar) => {
        if (cancelled) return;
        setCalendar(data);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, ym]);

  // Lay the month out on a 7-col grid starting at the correct weekday.
  const grid = useMemo(() => {
    if (!calendar) return [];
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(4, 6)) - 1;
    const firstDow = new Date(y, m, 1).getDay();
    const byDay = new Map(calendar.days.map((d) => [d.day, d]));
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (BoatCalendarDay | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(
        byDay.get(day) ?? {
          date: `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          day,
          tide: "",
          status: "none",
        },
      );
    }
    return cells;
  }, [calendar, ym]);

  const selected = useMemo(
    () => calendar?.days.find((d) => d.date === selectedDate) ?? null,
    [calendar, selectedDate],
  );

  const meta = calendar?.meta;

  return (
    <div className="bg-[#080d14] text-white min-h-dvh min-h-screen page-enter">
      <div className="px-5 pt-6 pb-3">
        <Link
          href="/booking"
          className="inline-flex items-center gap-1 text-sm text-white/40 mb-4 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={14} />
          예약 검색으로
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 pb-28">
        {/* Boat header */}
        {meta ? (
          <section className="rounded-2xl overflow-hidden bg-white/3 border border-white/8">
            {meta.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meta.imageUrl}
                alt={meta.name}
                className="w-full h-44 object-cover"
              />
            )}
            <div className="p-4 space-y-2">
              <p className="text-[11px] text-white/40 flex items-center gap-1">
                <MapPin size={11} />
                {meta.areaPath}
              </p>
              <h1 className="text-lg font-bold text-white leading-tight">
                {meta.name || `선박 #${uid}`}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                {meta.capacity && (
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} />
                    {meta.capacity}
                  </span>
                )}
                {meta.fishTags.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Fish size={11} />
                    {meta.fishTags.join(" · ")}
                  </span>
                )}
              </div>
              <a
                href={meta.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-[#c9a84c] text-[#080d14] text-sm font-bold hover:brightness-110 transition-all"
              >
                홈페이지 예약
                <ExternalLink size={13} />
              </a>
            </div>
          </section>
        ) : (
          <div className="h-72 rounded-2xl bg-white/3 animate-pulse" />
        )}

        {/* Month nav */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setYm((v) => shiftYm(v, -1))}
            className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
            aria-label="이전 달"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold">{ymToLabel(ym)}</span>
          <button
            onClick={() => setYm((v) => shiftYm(v, 1))}
            className="size-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
            aria-label="다음 달"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar */}
        <section className="rounded-2xl bg-white/3 border border-white/8 p-2">
          <div className="grid grid-cols-7 text-center text-[10px] text-white/40 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`py-1 ${i === 0 ? "text-red-400/70" : i === 6 ? "text-blue-400/70" : ""}`}
              >
                {w}
              </div>
            ))}
          </div>

          {loading && !calendar ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-white/3 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-xs text-white/40 text-center py-8">
              예약 현황을 불러오지 못했습니다.{" "}
              {meta && (
                <a
                  href={meta.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  더피싱에서 직접 보기
                </a>
              )}
            </p>
          ) : (
            <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
              {grid.map((cell, i) =>
                cell === null ? (
                  <div key={`pad-${i}`} />
                ) : (
                  <button
                    key={cell.date}
                    onClick={() =>
                      setSelectedDate((cur) => (cur === cell.date ? null : cell.date))
                    }
                    className={`relative h-16 rounded-lg p-1 text-left flex flex-col transition-colors ${
                      cell.status === "available"
                        ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : cell.status === "full"
                          ? "bg-white/3 border border-white/8"
                          : "bg-transparent border border-transparent"
                    } ${selectedDate === cell.date ? "ring-2 ring-[#c9a84c]" : ""}`}
                  >
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-[11px] font-bold ${
                          i % 7 === 0
                            ? "text-red-400"
                            : i % 7 === 6
                              ? "text-blue-400"
                              : "text-white/80"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.tide && (
                        <span className="text-[8px] text-white/30 truncate">{cell.tide}</span>
                      )}
                    </div>
                    <div className="mt-auto">
                      {cell.status === "available" && (
                        <span className="text-[9px] font-bold text-emerald-300">
                          {cell.remainingSeats != null
                            ? `남은 ${cell.remainingSeats}명`
                            : "예약가능"}
                        </span>
                      )}
                      {cell.status === "full" && (
                        <span className="text-[9px] text-white/30">마감</span>
                      )}
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </section>

        {/* Selected-day detail + booking CTA */}
        {selected && meta && (
          <section className="rounded-2xl bg-white/3 border border-[#c9a84c]/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {Number(selected.date.slice(5, 7))}월 {selected.day}일
                {selected.tide && (
                  <span className="ml-2 text-[11px] text-white/40 font-normal">{selected.tide}</span>
                )}
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  selected.status === "available"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : selected.status === "full"
                      ? "bg-white/5 text-white/40 border-white/10"
                      : "bg-white/5 text-white/30 border-white/10"
                }`}
              >
                {selected.status === "available"
                  ? selected.remainingSeats != null
                    ? `남은인원 ${selected.remainingSeats}명`
                    : "예약 가능"
                  : selected.status === "full"
                    ? selected.hasWaitlist
                      ? "예약완료 · 대기 가능"
                      : "예약마감"
                    : "출조 없음"}
              </span>
            </div>
            {selected.priceLine && (
              <p className="text-xs text-white/70">{selected.priceLine}</p>
            )}
            {selected.notice && (
              <p className="text-[11px] text-white/50 leading-relaxed">
                <span className="text-[#c9a84c] font-semibold">공지 </span>
                {selected.notice}
              </p>
            )}
            {selected.status === "available" && (
              <a
                href={meta.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-[#c9a84c] text-[#080d14] text-sm font-bold hover:brightness-110 transition-all"
              >
                {selected.day}일 예약하기
                <ExternalLink size={13} />
              </a>
            )}
            {selected.status === "full" && selected.hasWaitlist && (
              <a
                href={meta.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                대기 신청하러 가기
                <ExternalLink size={13} />
              </a>
            )}
          </section>
        )}

        <p className="text-[10px] text-white/25 px-1 leading-relaxed">
          더피싱 예약 시스템 기준 · 30분마다 갱신 · 예약·결제는 선사 홈페이지에서
          이루어지며 BITE Log는 예약 당사자가 아닙니다.
        </p>
      </div>
    </div>
  );
}
