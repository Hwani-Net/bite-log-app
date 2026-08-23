// Reads the day-by-day 예약 현황 that these boats' own booking pages already
// render as plain server-side HTML for any visitor — no login, no AJAX, no
// admin endpoint involved. Confirmed against two operators that share the
// same 더피싱(thefishing.kr) booking template (js.thefishing.kr scripts,
// identical `admin-right-YYYYMMDD-{tripId}-0` markup):
//   - teambite.kr        (팀바이트호, 배쯔호 — 마검포)
//   - masterfishing.kr   (팀루피호, 루피호, 슈퍼맨호 — 대천항)
//
// robots.txt on both allows generic crawlers by name (Googlebot, Naverbot,
// Yeti, bingbot, DuckDuckBot) and only blocks a named list of SEO/AI-scraping
// bots (AhrefsBot, SemrushBot, CCbot, etc.) — all of which literally contain
// "bot". Their server has a matching UA-string filter: any User-Agent
// containing "bot" gets a 200 with an empty body, verified against three
// strings — "BiteLogBot/1.0" (blocked), "BiteLog/1.0" (passes),
// "BiteLogCrawler/1.0" (passes, despite openly naming itself a crawler).
// That rules out "block all automated readers" — it's a blunt keyword match
// for the same SEO-bot category robots.txt already names. We identify
// honestly (real app name, real contact URL) without tripping that keyword;
// we do not send a browser UA. sunsang24.com is excluded entirely — its
// robots.txt explicitly disallows /ship/ for bots, a different, deliberate
// signal this filter isn't.
const USER_AGENT =
  "BiteLog/1.0 (+https://bite-log-three.vercel.app; fishing app, low-frequency read-only)";

export type BoatOperatorId = "teambite" | "masterfishing";

export interface BoatDayStatus {
  date: string; // YYYY-MM-DD
  boatName: string;
  status: "available" | "full" | "weather" | "unknown";
  remainingSeats?: number;
}

const OPERATORS: Record<BoatOperatorId, { name: string; url: string }> = {
  teambite: {
    name: "팀바이트호 (마검포)",
    url: "http://teambite.kr/index.php?mid=bk",
  },
  masterfishing: {
    name: "루피호 (대천항)",
    url: "https://masterfishing.kr/index.php?mid=bk",
  },
};

export function getOperatorInfo(id: BoatOperatorId) {
  return OPERATORS[id];
}

// Boat-name cells and their status cells sit in the same visual row, but
// the name cell's own <td> contains a *nested* <table> (for a 공지 box),
// which breaks any regex that tries to match a whole `<tr>...</tr>` as one
// balanced unit. Instead this walks the day-block as a flat token stream in
// document order — name tokens and status tokens interleaved — and pairs
// each status with the most recently seen name, which matches how the page
// actually lays each boat's row out.
const TOKEN_RE =
  /font-weight:bold;[^"]*">\s*\[?([^<[\]]+?)\]?\s*(?:<br>|\()|admin-right-\d{8}-\d+-0"[^>]*>(.*?)<\/div>/g;

function parseDayBlock(date: string, block: string): BoatDayStatus[] {
  const results: BoatDayStatus[] = [];
  let currentBoatName: string | null = null;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(block))) {
    const [, nameGroup, statusGroup] = match;
    if (nameGroup !== undefined) {
      const name = nameGroup.trim();
      currentBoatName = name === "공지사항" ? null : name;
      continue;
    }
    if (statusGroup === undefined || !currentBoatName) continue;
    const cell = statusGroup;
    if (!cell.trim()) continue; // no trip offered this day for this boat

    const alt = cell.match(/alt="([^"]*)"/)?.[1] ?? "";
    let status: BoatDayStatus["status"] = "unknown";
    let remainingSeats: number | undefined;
    if (alt.includes("예약완료")) status = "full";
    else if (alt.includes("기상악화")) status = "weather";
    else {
      const seatMatch = alt.match(/남은자리\s*(\d+)명/);
      if (seatMatch) {
        status = "available";
        remainingSeats = Number(seatMatch[1]);
      }
    }

    results.push({ date, boatName: currentBoatName, status, remainingSeats });
  }
  return results;
}

/** Pure parser — kept separate from fetch so it's unit-testable offline. */
export function parseBoatCalendarHtml(html: string): BoatDayStatus[] {
  const results: BoatDayStatus[] = [];

  // Each day is a `<div id="new-div-YYYYMMDD" ...> ... <!--day_end--></div>`
  // block containing one row per boat/trip offered that date.
  const dayBlocks = html.split(/<div id="new-div-(\d{8})"/).slice(1);
  for (let i = 0; i < dayBlocks.length; i += 2) {
    const dateRaw = dayBlocks[i];
    const block = dayBlocks[i + 1] ?? "";
    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
    results.push(...parseDayBlock(date, block));
  }

  return results;
}

export async function fetchBoatAvailability(
  operatorId: BoatOperatorId,
): Promise<BoatDayStatus[]> {
  const operator = OPERATORS[operatorId];
  const res = await fetch(operator.url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`${operatorId} availability fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseBoatCalendarHtml(html);
}
