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
  AlertTriangle,
  History,
} from "lucide-react";
import type {
  BoatCalendar,
  BoatCalendarDay,
} from "@/services/boatCalendarService";
import {
  getMyBoat,
  updateMyBoat,
  addRide,
  recordSnapshot,
  diffLatestSnapshots,
  markGoneStreak,
  isGone,
  shortPort,
  type MyBoat,
  type BoatVerdict,
  type SnapshotChange,
} from "@/services/myBoatService";
import { getDataService } from "@/services/dataServiceFactory";
import { apiFetch } from "@/lib/apiClient";
import {
  summarizeCatchesForBoat,
  type BoatCatchSummary,
} from "@/lib/boatCatchStats";
import {
  visibleCompanionPosts,
  type CompanionPost,
} from "@/lib/companionPosts";
import { listCompanionPostsForBoat } from "@/services/companionService";
import {
  biteGradeForDate,
  BITE_GRADE_LABEL,
  BITE_GRADE_DOT_COLOR,
  type BiteGrade,
} from "@/lib/calendarBiteOverlay";

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
  const [snapshotChange, setSnapshotChange] = useState<SnapshotChange | null>(null);
  const [boatGone, setBoatGone] = useState(false);
  const [catchSummary, setCatchSummary] = useState<BoatCatchSummary | null>(null);

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

  // "이 배에서 내 조과" — records/page.tsx의 "탄 배" 태그와 조인한다.
  // 태그된 기록이 하나도 없으면 요약 자체를 숨기므로(엄격히 null vs
  // 빈 배열 구분 없이 렌더 조건만 recordCount로 본다), 로그인 안 한
  // 사용자나 태그를 써본 적 없는 사용자에게는 조용히 아무것도 안 보인다.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getDataService()
      .getCatchRecords()
      .then((records) => {
        if (cancelled) return;
        setCatchSummary(summarizeCatchesForBoat(records, uid));
      })
      .catch(() => {
        // 조과 요약은 부가 정보 — 못 불러와도 나머지 화면(판정/달력)은 정상 동작해야 한다.
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // 이 배의 동출 모집 글 — 없으면 섹션째 숨긴다. 부가 정보라 실패는 무음.
  const [companions, setCompanions] = useState<CompanionPost[]>([]);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    listCompanionPostsForBoat(uid)
      .then((posts) => {
        if (cancelled) return;
        setCompanions(visibleCompanionPosts(posts, new Date(), { boatUid: uid }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    apiFetch<BoatCalendar & { ok?: boolean }>(
      `/api/boat-calendar?uid=${uid}&ym=${ym}`,
      { context: "boat-calendar", retries: 0 },
    )
      .then((data) => {
        if (cancelled) return;
        if (data.ok === false || !data.meta) {
          throw new Error("malformed boat-calendar response");
        }
        setCalendar(data);

        if (!data.meta.name) {
          // The fetch succeeded — this isn't the network/parse failure the
          // catch block below handles — but thefishing.kr's page had no
          // recognizable boat identity in it. That can mean the listing
          // itself is gone, or just a one-off glitch on their end, so a
          // single hit only counts toward a streak (isGone requires 2+)
          // rather than declaring it gone immediately.
          setBoatGone(isGone(markGoneStreak(uid, true)));
          setSnapshotChange(null);
          return;
        }
        setBoatGone(false);
        markGoneStreak(uid, false);
        // Auto-snapshot every visit, not just favoriting — this is what
        // lets a later visit notice the boat got renamed or repriced.
        const priceLine = data.days.find((d) => d.priceLine)?.priceLine;
        const boat = recordSnapshot(uid, {
          name: data.meta.name,
          areaPath: data.meta.areaPath,
          imageUrl: data.meta.imageUrl,
          priceLine,
        });
        setSnapshotChange(diffLatestSnapshots(boat));
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
        {/* 소멸 감지 — 자동 매칭은 하지 않는다(오판 위험). 같은 배가 다른
            uid 로 재등록됐는지는 사용자가 예약 검색에서 직접 확인해야 한다. */}
        {boatGone && (
          <section
            role="alert"
            className="rounded-2xl bg-red-500/10 border border-red-500/30 p-3 flex gap-2"
          >
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-red-200 leading-relaxed">
              이 배는 더피싱에서 더 이상 확인되지 않습니다. 선사가 폐업했거나
              다른 이름으로 재등록했을 수 있어요. 혹시 같은 배라면 예약
              검색에서 직접 찾아 새로 즐겨찾기해 주세요 — 자동으로 연결하지는
              않습니다.
            </p>
          </section>
        )}

        {/* 이름·모항·가격 변경 감지 — 방문할 때마다 스냅샷을 남기고 직전
            스냅샷과 비교한다. 판정·이력은 uid를 따라가므로 이름이 바뀌어도
            그대로 유지된다. */}
        {snapshotChange && (snapshotChange.nameChanged || snapshotChange.portChanged) && (
          <section
            role="status"
            className="rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/30 p-3 flex gap-2"
          >
            <History size={16} className="text-[#c9a84c] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#c9a84c] leading-relaxed">
              <span className="font-semibold">이름·모항 변경 </span>
              이 배는 이전에 &lsquo;{snapshotChange.previous.name}(
              {shortPort(snapshotChange.previous.areaPath)})&rsquo;였습니다.
            </p>
          </section>
        )}
        {snapshotChange?.priceChanged && (
          <section
            role="status"
            className="rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/30 p-3 flex gap-2"
          >
            <History size={16} className="text-[#c9a84c] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#c9a84c] leading-relaxed">
              <span className="font-semibold">가격 변동 </span>
              지난 조회 대비: {snapshotChange.previous.priceLine || "정보 없음"} →{" "}
              {snapshotChange.current.priceLine || "정보 없음"}
            </p>
          </section>
        )}

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

        {/* 이 배에서 내 조과 — records/page.tsx에서 "탄 배"로 태그된 기록만
            집계한다. 태그된 기록이 없으면 카드째 숨긴다. */}
        {catchSummary && catchSummary.recordCount > 0 && (
          <section className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-2">
            <h2 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Fish size={12} className="text-[#c9a84c]" aria-hidden="true" />
              이 배에서 내 조과
            </h2>
            <p className="text-xs text-white/70">
              기록 {catchSummary.recordCount}건 · 총 {catchSummary.totalCount}마리
            </p>
            {catchSummary.bySpecies.length > 0 && (
              <p className="text-[11px] text-white/40">
                {catchSummary.bySpecies
                  .map((s) => `${s.species} ${s.count}마리`)
                  .join(" · ")}
              </p>
            )}
          </section>
        )}

        {/* 이 배 동출 모집 — /booking 동출 게시판에서 이 배(uid)로 태그된
            open 글만. 없으면 섹션째 숨긴다. */}
        {companions.length > 0 && (
          <section
            data-testid="boat-companions"
            className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-2"
          >
            <h2 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Users size={12} className="text-[#7dd3fc]" aria-hidden="true" />
              이 배 동출 모집
            </h2>
            {companions.map((post) => (
              <div key={post.id} className="text-xs text-white/70">
                <span className="font-semibold text-white">
                  {post.date.slice(5).replace("-", "/")}
                </span>{" "}
                · {post.seatsWanted}명 모집 · {post.authorName}
                {post.note && (
                  <span className="text-white/45"> — {post.note}</span>
                )}
                <span className="block text-[11px] text-[#7dd3fc]/90 break-all">
                  연락: {post.contact}
                </span>
              </div>
            ))}
          </section>
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
              {grid.map((cell, i) => {
                if (cell === null) return <div key={`pad-${i}`} />;
                // 물때 지수는 예약 가능한 날에만 보여준다 — 마감/출조없음
                // 날짜에 조건이 좋다고 표시해봐야 예약할 수 없으니 의미가
                // 없다. biteGradeForDate는 날짜만으로 계산되는 순수 함수라
                // 매 렌더 호출해도 비용이 없다(새 요청 없음).
                const grade: BiteGrade | null =
                  cell.status === "available" ? biteGradeForDate(cell.date) : null;
                return (
                  <button
                    key={cell.date}
                    onClick={() =>
                      setSelectedDate((cur) => (cur === cell.date ? null : cell.date))
                    }
                    data-bite-grade={grade ?? undefined}
                    className={`relative h-16 rounded-lg p-1 text-left flex flex-col transition-colors ${
                      cell.status === "available"
                        ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : cell.status === "full"
                          ? "bg-white/3 border border-white/8"
                          : "bg-transparent border border-transparent"
                    } ${selectedDate === cell.date ? "ring-2 ring-[#c9a84c]" : ""}`}
                  >
                    {grade && (
                      <>
                        {/* 점 자체는 순수 장식 — 색만으로 등급을 전달하면
                            안 되니(WCAG 1.4.1) 실제 접근성 텍스트는 아래
                            sr-only 로 버튼 안에 직접 넣는다. 별도 span에
                            aria-label 만 얹으면 그 값이 버튼의 접근성 이름
                            계산에 포함되는지가 스크린리더마다 갈린다. */}
                        <span
                          aria-hidden="true"
                          className={`absolute top-1.5 right-1.5 size-2 rounded-full ${BITE_GRADE_DOT_COLOR[grade]}`}
                        />
                        <span className="sr-only"> {BITE_GRADE_LABEL[grade]}</span>
                      </>
                    )}
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
                );
              })}
            </div>
          )}
          {calendar && !error && (
            <div className="px-1 pt-2 mt-1 border-t border-white/5 space-y-1">
              <div
                role="group"
                aria-label="물때 지수 범례"
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                {(Object.keys(BITE_GRADE_LABEL) as BiteGrade[]).map((g) => (
                  <span
                    key={g}
                    className="flex items-center gap-1 text-[9px] text-white/40"
                  >
                    <span
                      className={`size-1.5 rounded-full ${BITE_GRADE_DOT_COLOR[g]}`}
                      aria-hidden="true"
                    />
                    {BITE_GRADE_LABEL[g]}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-white/25">
                달 주기(사리/조금) 기반 — 실제 조황은 날씨·파고에 따라 달라질 수 있어요
              </p>
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
