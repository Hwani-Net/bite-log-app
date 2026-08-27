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
  Plus,
} from "lucide-react";
import type {
  BoatCalendar,
  BoatCalendarDay,
} from "@/services/boatCalendarService";
import {
  getMyBoat,
  updateMyBoat,
  addRide,
  type MyBoat,
  type BoatVerdict,
} from "@/services/myBoatService";

const VERDICT_OPTIONS: { value: BoatVerdict; label: string }[] = [
  { value: "again", label: "또 탄다" },
  { value: "ok", label: "보통" },
  { value: "never", label: "안 탄다" },
];

// Local date, not toISOString() — see booking/page.tsx for why UTC is wrong
// for a KST default.
function localISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [myBoat, setMyBoat] = useState<MyBoat | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [rideDate, setRideDate] = useState("");

  // Client-only: localStorage isn't available during SSR, and "today" is
  // deliberately not a useState lazy initializer for the same hydration
  // reason as the date-search grid (booking/page.tsx).
  useEffect(() => {
    if (!uid) return;
    const boat = getMyBoat(uid);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyBoat(boat);
    setMemoDraft(boat?.memo ?? "");
    setRideDate(localISODate(new Date()));
  }, [uid]);

  const handleSetVerdict = (verdict: BoatVerdict) => {
    const next = updateMyBoat(uid, {
      verdict: myBoat?.verdict === verdict ? null : verdict,
    });
    setMyBoat(next);
  };

  const handleMemoBlur = () => {
    if (memoDraft === (myBoat?.memo ?? "")) return;
    setMyBoat(updateMyBoat(uid, { memo: memoDraft }));
  };

  const handleAddRide = () => {
    if (!rideDate) return;
    setMyBoat(addRide(uid, { date: rideDate }));
  };

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
      .then((data: BoatCalendar & { ok?: boolean }) => {
        if (cancelled) return;
        if (data.ok === false || !data.meta) {
          throw new Error("malformed boat-calendar response");
        }
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

        {/* 내 기록 — 예약 플랫폼은 만들 수 없는, 이 배에 대한 내 판단과 이력.
            uid로 저장되므로 선사가 이름·모항을 바꿔도(GOAL-3) 그대로 따라간다. */}
        <section className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-3">
          <h2 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em]">
            내 기록
          </h2>
          <div className="flex gap-1.5" role="group" aria-label="내 승선 판정">
            {VERDICT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSetVerdict(opt.value)}
                aria-pressed={myBoat?.verdict === opt.value}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  myBoat?.verdict === opt.value
                    ? opt.value === "never"
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : "bg-[#c9a84c] border-[#c9a84c] text-[#080d14]"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={memoDraft}
            onChange={(e) => setMemoDraft(e.target.value)}
            onBlur={handleMemoBlur}
            placeholder="메모 (예: 화장실 없음, 선장님 친절)"
            aria-label="이 선박에 대한 메모"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/50"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={rideDate}
              onChange={(e) => setRideDate(e.target.value)}
              aria-label="탄 날짜"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c9a84c]/50"
            />
            <button
              type="button"
              onClick={handleAddRide}
              className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/70 hover:border-[#c9a84c]/40 hover:text-white transition-colors"
            >
              <Plus size={13} />
              탄 날짜 추가
            </button>
          </div>
          {myBoat && myBoat.rides.length > 0 && (
            <p className="text-[11px] text-white/40">
              승선 {myBoat.rides.length}회 ·{" "}
              {myBoat.rides.map((r) => r.date).join(", ")}
            </p>
          )}
        </section>

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
