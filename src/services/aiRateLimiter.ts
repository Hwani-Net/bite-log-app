// AI Rate Limiter — localStorage 기반 일일 사용량 제한
// MVP 용이라 서버사이드 검증은 없음 (클라이언트 전용)

const STORAGE_KEY = 'bite_ai_usage';

interface DailyUsage {
  date: string;  // YYYY-MM-DD
  counts: Record<string, number>;  // feature → count
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getUsage(): DailyUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getToday(), counts: {} };
    const parsed: DailyUsage = JSON.parse(raw);
    // Reset if different day
    if (parsed.date !== getToday()) {
      return { date: getToday(), counts: {} };
    }
    return parsed;
  } catch {
    return { date: getToday(), counts: {} };
  }
}

function saveUsage(usage: DailyUsage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

// ─── Daily limits per feature ───────────────────────────────────
export const AI_DAILY_LIMITS: Record<string, number> = {
  'concierge':    5,   // AI 컨시어지 대화 (LLM 호출 — 가장 비쌈)
  'fish-id':      20,  // AI 어종 감별 (Vision — 저렴)
  'notice-parse': 10,  // 공지 파싱 (Text — 저렴)
  'viral-gear':   3,   // 바이럴 장비 (캐싱 권장)
};

/** Check if the feature can be used (within daily limit) */
export function canUseAI(feature: string): boolean {
  const usage = getUsage();
  const current = usage.counts[feature] || 0;
  const limit = AI_DAILY_LIMITS[feature] ?? 10; // fallback
  return current < limit;
}

/** Get remaining uses for a feature */
export function getRemainingUses(feature: string): number {
  const usage = getUsage();
  const current = usage.counts[feature] || 0;
  const limit = AI_DAILY_LIMITS[feature] ?? 10;
  return Math.max(0, limit - current);
}

/** Record one use of a feature. Returns false if limit exceeded. */
export function recordAIUsage(feature: string): boolean {
  if (!canUseAI(feature)) return false;
  const usage = getUsage();
  usage.counts[feature] = (usage.counts[feature] || 0) + 1;
  saveUsage(usage);
  return true;
}

/** Get all usage stats for display */
export function getAIUsageStats(): Record<string, { used: number; limit: number; remaining: number }> {
  const usage = getUsage();
  const stats: Record<string, { used: number; limit: number; remaining: number }> = {};
  for (const [feature, limit] of Object.entries(AI_DAILY_LIMITS)) {
    const used = usage.counts[feature] || 0;
    stats[feature] = { used, limit, remaining: Math.max(0, limit - used) };
  }
  return stats;
}
