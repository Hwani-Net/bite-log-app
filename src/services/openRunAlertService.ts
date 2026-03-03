// Open-Run Alert Service
// 맞춤 오픈런 알림 — 규칙 기반 매칭 엔진 (LLM 불필요 — 비용 ₩0)
// 낚시 선사 예약 오픈 공지를 감지해 유저 맞춤 알림 발송

import { CatchRecord } from '@/types';
// sendLocalNotification는 조용한 시간 체크가 있어 시뮬레이션에서 직접 new Notification() 사용
import { sendLocalNotification, isPushSupported } from './pushNotificationService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AlertSubscription {
  id: string;
  species: string[];         // ['주꾸미', '볼락'] — 빈 배열이면 전체
  regions: string[];         // ['서해', '남해'] — 빈 배열이면 전체
  keywords: string[];        // 추가 키워드 (예: '오천항', '봄')
  notifyDaysAhead: number;   // N일 전 알림 (1~7)
  isActive: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
}

export interface ParsedNotice {
  date?: string;             // 오픈 예정 날짜 (ISO string)
  species?: string;
  harbor?: string;
  region?: string;
  title: string;
  raw: string;
}

export interface AutoDetectedPref {
  species: string;
  region: string;
  count: number;             // 조과 기록 수
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SUBS_KEY = 'bitelog_alert_subscriptions';
const NOTIFIED_KEY = 'bitelog_alert_notified_ids';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getSubscriptions(): AlertSubscription[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubscription(sub: Omit<AlertSubscription, 'id' | 'createdAt'>): AlertSubscription {
  const newSub: AlertSubscription = {
    ...sub,
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const subs = getSubscriptions();
  subs.push(newSub);
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  return newSub;
}

export function deleteSubscription(id: string): void {
  const subs = getSubscriptions().filter(s => s.id !== id);
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
}

export function toggleSubscription(id: string): void {
  const subs = getSubscriptions().map(s =>
    s.id === id ? { ...s, isActive: !s.isActive } : s
  );
  localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
}

// ─── Auto-Detect Preferences ──────────────────────────────────────────────────

// 지역명 매핑 (항구/위치 → 해역)
const REGION_MAP: Record<string, string> = {
  '서해': '서해', '인천': '서해', '당진': '서해', '오천': '서해',
  '보령': '서해', '군산': '서해', '홍성': '서해', '서산': '서해',
  '태안': '서해', '안면': '서해', '무창포': '서해',
  '남해': '남해', '여수': '남해', '통영': '남해', '거제': '남해',
  '고성': '남해', '사천': '남해', '창원': '남해', '남해군': '남해',
  '동해': '동해', '속초': '동해', '강릉': '동해', '묵호': '동해',
  '삼척': '동해', '포항': '동해', '울산': '동해', '후포': '동해',
  '제주': '제주', '서귀포': '제주',
};

function guessRegion(locationName: string): string {
  for (const [keyword, region] of Object.entries(REGION_MAP)) {
    if (locationName.includes(keyword)) return region;
  }
  return '전국';
}

export function getAutoDetectedPrefs(records: CatchRecord[]): AutoDetectedPref[] {
  if (!records || records.length === 0) return [];

  const speciesMap = new Map<string, number>();
  const regionMap = new Map<string, number>();

  for (const r of records) {
    if (r.species) {
      speciesMap.set(r.species, (speciesMap.get(r.species) || 0) + 1);
    }
    if (r.location?.name) {
      const region = guessRegion(r.location.name);
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    }
  }

  // 상위 3개 어종 + 상위 2개 지역 조합
  const topSpecies = [...speciesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topRegions = [...regionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const result: AutoDetectedPref[] = [];
  for (const [species, count] of topSpecies) {
    const region = topRegions[0]?.[0] ?? '전국';
    result.push({ species, region, count });
  }
  return result;
}

// ─── Matching Engine ──────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

function matchesSubscription(notice: ParsedNotice, sub: AlertSubscription): boolean {
  if (!sub.isActive) return false;

  const noticeText = normalizeText(
    `${notice.title} ${notice.species ?? ''} ${notice.harbor ?? ''} ${notice.region ?? ''} ${notice.raw}`
  );

  // 어종 매칭 (빈 배열 = 전체 매칭)
  if (sub.species.length > 0) {
    const speciesMatch = sub.species.some(s => noticeText.includes(normalizeText(s)));
    if (!speciesMatch) return false;
  }

  // 지역 매칭 (빈 배열 = 전체 매칭)
  if (sub.regions.length > 0 && !sub.regions.includes('전국')) {
    const regionMatch = sub.regions.some(r => {
      // 지역 키워드가 noticeText에 포함되는지
      const regionKeywords = Object.entries(REGION_MAP)
        .filter(([, v]) => v === r)
        .map(([k]) => k);
      return regionKeywords.some(kw => noticeText.includes(normalizeText(kw)));
    });
    if (!regionMatch) return false;
  }

  // 추가 키워드 매칭 (빈 배열 = 무조건 통과)
  if (sub.keywords.length > 0) {
    const kwMatch = sub.keywords.some(k => noticeText.includes(normalizeText(k)));
    if (!kwMatch) return false;
  }

  return true;
}

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markNotified(id: string): void {
  const ids = getNotifiedIds();
  ids.add(id);
  // 최대 200개 유지
  const arr = [...ids].slice(-200);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

export function checkAndNotify(
  subscriptions: AlertSubscription[],
  notices: ParsedNotice[]
): number {
  if (typeof window === 'undefined') return 0;
  if (Notification.permission !== 'granted') return 0;

  const notified = getNotifiedIds();
  let count = 0;

  for (const notice of notices) {
    const noticeId = `${notice.title.slice(0, 30)}_${notice.date ?? 'nodate'}`;
    if (notified.has(noticeId)) continue;

    for (const sub of subscriptions) {
      if (matchesSubscription(notice, sub)) {
        const speciesLabel = sub.species.length > 0 ? sub.species.join('/') : '전 어종';
        const regionLabel = sub.regions.length > 0 ? sub.regions.join('/') : '전국';
        sendLocalNotification(
          `🎣 오픈런 알림! ${speciesLabel} · ${regionLabel}`,
          notice.title,
          '/icons/icon-192x192.png',
          `openrun_${noticeId}`
        );
        markNotified(noticeId);
        count++;
        break; // 같은 공지로 중복 알림 방지
      }
    }
  }

  return count;
}

// ─── Simulation ───────────────────────────────────────────────────────────────
// sendLocalNotification을 우회합니다.
// 이유: sendLocalNotification은 조용한 시간(quietHours) 체크를 파사브하므로,
// 새벽 4시 같은 테스트 시점에 묵음 모드로 차단되는 문제가 있었음.
export function sendSimulationAlert(sub: AlertSubscription): void {
  if (!isPushSupported()) {
    console.warn('[SimAlert] Push not supported in this browser.');
    return;
  }
  if (Notification.permission !== 'granted') {
    console.warn('[SimAlert] Notification permission not granted.');
    return;
  }

  const speciesLabel = sub.species.length > 0 ? sub.species.join('/') : '전 어종';
  const regionLabel = sub.regions.length > 0 ? sub.regions.join('/') : '전국';

  try {
    // 조용한 시간 로직을 완전히 생략하고 직접 발송
    new Notification(`🎣 [테스트] 오픈런 알림 — ${speciesLabel} · ${regionLabel}`, {
      body: '이 알림은 설정 테스트용입니다. 실제 예약 오픈이 아닙니다.',
      tag: 'simulation_test',
      requireInteraction: false,
    });
  } catch (err) {
    console.error('[SimAlert] Notification failed:', err);
  }
}
