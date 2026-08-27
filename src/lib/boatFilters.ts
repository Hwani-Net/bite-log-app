// Port/capacity narrowing on top of whatever's already loaded — no new
// server requests, same spirit as keywordMatch.ts.

import { shortPort } from "@/services/myBoatService";

export type CapacityBucket = "small" | "medium" | "large";

/**
 * "12인승" → 12. thefishing.kr's capacity field isn't always that clean
 * (seen blank, and free-text variants) — anything without a number
 * followed by 인승 returns null rather than guessing.
 */
export function parseCapacity(capacity: string): number | null {
  const m = capacity.match(/(\d+)\s*인승/);
  return m ? Number(m[1]) : null;
}

/** 소형 ≤10명 · 중형 11~18명 · 대형 19명+. Unparseable capacity → null. */
export function capacityBucket(capacity: string): CapacityBucket | null {
  const seats = parseCapacity(capacity);
  if (seats === null) return null;
  if (seats <= 10) return "small";
  if (seats <= 18) return "medium";
  return "large";
}

/** Unique ports (an areaPath's last segment), in first-seen order. */
export function extractPorts(areaPaths: string[]): string[] {
  const seen = new Set<string>();
  const ports: string[] = [];
  for (const path of areaPaths) {
    const port = shortPort(path);
    if (port && !seen.has(port)) {
      seen.add(port);
      ports.push(port);
    }
  }
  return ports;
}
