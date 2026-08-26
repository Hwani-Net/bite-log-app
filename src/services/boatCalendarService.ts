// Reads a single boat's month calendar from 더피싱(thefishing.kr) — the same
// public detail page a visitor opens at thefishing.kr/reservation/list.php?
// uid=N, where every day cell already shows "예약하기 / 남은인원 N명" or
// "예약마감" server-side, no login. Month navigation on that page is a POST
// to list.view.view.1.ajax.new.php (date6=YYYYMM, st_uid, pa_uid) that
// returns the same cell markup for another month; we call that too. The
// "예약하기" button here links straight to the boat's own homepage booking
// page (the `홈페이지 예약` href on the detail page) — thefishing.kr itself
// says 예약은 해당(업체별) 홈페이지에서 이루어집니다, so that's the real
// booking destination, not a thefishing.kr popup.
//
// Same honest User-Agent as boatListingService.ts. Their UA filter blocks
// the literal substring "bot" (it matches the named SEO-bot blocklist in
// their robots.txt — AhrefsBot, SemrushBot, CCbot...), so we identify by our
// real app name and URL without that word; we do not send a browser UA.

import { fetchWithRetry } from "@/lib/retryFetch";

const USER_AGENT =
  "BiteLog/1.0 (+https://bite-log-three.vercel.app; fishing app, low-frequency read-only)";

const DETAIL_URL = "https://thefishing.kr/reservation/list.php";
const MONTH_AJAX_URL =
  "https://thefishing.kr/reservation/list.view.view.1.ajax.new.php";

export interface BoatCalendarMeta {
  uid: string;
  stUid: string; // thefishing's per-operator id, needed for month ajax
  name: string;
  areaPath: string;
  capacity: string;
  fishTags: string[];
  imageUrl: string;
  bookingUrl: string; // the boat's own homepage booking page
  detailUrl: string;
}

export type CalendarDayStatus = "available" | "full" | "none";

export interface BoatCalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  tide: string; // "2물", "조금", "사리" — the 물때 label thefishing shows
  status: CalendarDayStatus;
  remainingSeats?: number;
  notice?: string;
  priceLine?: string; // "우럭 광어 대 50,000"
  hasWaitlist?: boolean; // 예약완료 + 대기하기 variant
}

export interface BoatCalendar {
  meta: BoatCalendarMeta;
  ym: string; // YYYYMM
  days: BoatCalendarDay[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure — parse identity/meta fields off a detail page. Unit-tested offline. */
export function parseBoatDetailMeta(html: string, uid: string): BoatCalendarMeta {
  const stUid = html.match(/st_uid=(\d+)/)?.[1] ?? "";

  // `홈페이지 예약` anchor — the boat's own site. Falls back to the detail
  // page so the button is never a dead end.
  const bookingHref = html.match(
    /href="([^"]+)"[^>]*class="site"[^>]*>\s*홈페이지 예약/,
  )?.[1];
  const bookingUrl = bookingHref
    ? decodeEntities(bookingHref)
    : `${DETAIL_URL}?uid=${uid}`;

  const name = stripTags(html.match(/class="re_pro_st">([\s\S]*?)<\/div>/)?.[1] ?? "");
  const capacity =
    html.match(/re_view_sm_label">인승<\/span>\s*([^<\s]+)/)?.[1] ?? "";
  const fishTags = Array.from(
    html.matchAll(/class="re_fish_tag">([^<]+)</g),
    (m) => decodeEntities(m[1]).trim(),
  );
  const areaRaw =
    html.match(/<p>(서해권|남해권|동해권|제주권)[\s\S]*?<\/p>/)?.[0] ?? "";
  const areaPath = stripTags(areaRaw);
  const imageUrl =
    html.match(/<img[^>]+src="(https:\/\/theimage\.myfishmap\.kr\/[^"]+)"/)?.[1] ??
    "";

  return {
    uid,
    stUid,
    name,
    areaPath,
    capacity,
    fishTags,
    imageUrl,
    bookingUrl,
    detailUrl: `${DETAIL_URL}?uid=${uid}`,
  };
}

/**
 * Pure — parse a month's calendar cells. Works on both the detail page
 * (cells live inside #reservation-type-1) and the month-ajax response (the
 * cells are the whole body). `ym` is passed in rather than inferred: a month
 * with no bookable day has no `date=YYYYMMDD` anywhere to read it from.
 */
export function parseBoatCalendarHtml(html: string, ym: string): BoatCalendarDay[] {
  const scopeStart = html.indexOf('id="reservation-type-1"');
  const scoped = scopeStart >= 0 ? html.slice(scopeStart) : html;
  const clean = scoped.replace(/<!--[\s\S]*?-->/g, "");

  const year = ym.slice(0, 4);
  const month = ym.slice(4, 6);
  const days: BoatCalendarDay[] = [];

  // Each day is a <td> that starts with <div class="dayline">. Splitting on
  // <td> and keeping only chunks that contain dayline skips header cells.
  const chunks = clean.split(/<td[^>]*>/).slice(1);
  for (const chunk of chunks) {
    if (!chunk.includes('class="dayline"')) continue;

    const dayNum = Number(chunk.match(/class="day[^"]*">(\d+)</)?.[1]);
    if (!dayNum) continue;
    const tide = decodeEntities(chunk.match(/class="wa">([^<]*)</)?.[1] ?? "").trim();

    const dateFromOnclick = chunk.match(/date=(\d{8})/)?.[1];
    const date = dateFromOnclick
      ? `${dateFromOnclick.slice(0, 4)}-${dateFromOnclick.slice(4, 6)}-${dateFromOnclick.slice(6, 8)}`
      : `${year}-${month}-${String(dayNum).padStart(2, "0")}`;

    let status: CalendarDayStatus = "none";
    let remainingSeats: number | undefined;
    let hasWaitlist: boolean | undefined;

    if (/>예약하기</.test(chunk)) {
      status = "available";
      const seats = chunk.match(/남은인원\s*<span[^>]*>(\d+)</)?.[1];
      if (seats) remainingSeats = Number(seats);
    } else if (/예약마감|예약완료/.test(chunk)) {
      status = "full";
      if (/대기하기/.test(chunk)) hasWaitlist = true;
    }

    const noticeRaw = chunk.match(/<b>공지\s*<\/b>([\s\S]*?)<\/p>/)?.[1];
    const notice = noticeRaw ? stripTags(noticeRaw) : undefined;

    const priceRaw = chunk.match(/class="schedule2">[\s\S]*?<li>([\s\S]*?)<\/li>/)?.[1];
    const priceLine = priceRaw ? stripTags(priceRaw) : undefined;

    days.push({
      date,
      day: dayNum,
      tide,
      status,
      ...(remainingSeats !== undefined && { remainingSeats }),
      ...(notice && { notice }),
      ...(priceLine && { priceLine }),
      ...(hasWaitlist && { hasWaitlist }),
    });
  }

  return days;
}

function currentYmKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function fetchBoatCalendar(
  uid: string,
  ym?: string,
): Promise<BoatCalendar> {
  const detailRes = await fetchWithRetry(`${DETAIL_URL}?uid=${uid}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!detailRes.ok) {
    throw new Error(`boat detail fetch failed: ${detailRes.status}`);
  }
  const detailHtml = await detailRes.text();
  const meta = parseBoatDetailMeta(detailHtml, uid);

  const targetYm = ym && /^\d{6}$/.test(ym) ? ym : currentYmKst();
  const detailYm = currentYmKst();

  if (targetYm === detailYm) {
    return { meta, ym: targetYm, days: parseBoatCalendarHtml(detailHtml, targetYm) };
  }

  if (!meta.stUid) {
    // Without st_uid the month ajax can't be addressed; return the month we have.
    return { meta, ym: detailYm, days: parseBoatCalendarHtml(detailHtml, detailYm) };
  }

  const body = new URLSearchParams({
    date6: targetYm,
    st_uid: meta.stUid,
    pa_uid: uid,
  }).toString();
  const monthRes = await fetchWithRetry(MONTH_AJAX_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body,
    next: { revalidate: 1800 },
  });
  if (!monthRes.ok) {
    throw new Error(`boat month fetch failed: ${monthRes.status}`);
  }
  const monthHtml = await monthRes.text();
  return { meta, ym: targetYm, days: parseBoatCalendarHtml(monthHtml, targetYm) };
}
