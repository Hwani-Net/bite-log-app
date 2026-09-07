import { parseLocalISODate } from "@/lib/localDate";
import { getTidePhase } from "@/services/tackleAdviceService";

// Traditional numbering, not a station forecast or a measured current speed.
// 7물때식: lunar 1/16 = 7물; 8물때식: lunar 1/16 = 8물.
const lunarDay = new Intl.DateTimeFormat("ko-KR-u-ca-dangi", { day: "numeric" });

export function fishingTideForDate(iso: string, system: 7 | 8 = 7) {
  const date = parseLocalISODate(iso);
  if (!date || lunarDay.resolvedOptions().calendar !== "dangi") return null;
  const day = Number(lunarDay.formatToParts(date).find(p => p.type === "day")?.value);
  if (!Number.isInteger(day) || day < 1 || day > 30) return null;
  const number = (day + system - 2) % 15 + 1;
  const label = system === 7
    ? number === 14 ? "조금" : number === 15 ? "무시" : `${number}물`
    : number === 15 ? "조금" : `${number}물`;
  const strength = getTidePhase(number);
  return { label, strength, strengthLabel: { neap: "약함", moderate: "보통", spring: "강함" }[strength] };
}
