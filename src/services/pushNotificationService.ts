/**
 * Push Notification Service
 * Uses Firebase Cloud Messaging (FCM) for push notifications
 * Free tier: unlimited messages
 *
 * Notification types:
 * - Bite time alerts (입질 최적 시간 알림)
 * - News alerts (내 관심 지역 조과 소식)
 * - Badge earned (새 배지 획득)
 */

export interface NotificationPreferences {
  biteTimeAlert: boolean;
  newsAlert: boolean;
  badgeAlert: boolean;
  seasonOpenAlert: boolean; // 금어기 해제 임박(4차 GOAL-2 알림)
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;   // 0-23
  regions: string[];       // ['east', 'west', 'south', 'jeju']
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  biteTimeAlert: true,
  newsAlert: true,
  badgeAlert: true,
  seasonOpenAlert: true,
  quietHoursStart: 23,
  quietHoursEnd: 6,
  regions: ['all'] };

const PREFS_STORAGE_KEY = 'fishlog_notification_prefs';
const FCM_TOKEN_KEY = 'fishlog_fcm_token';

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save notification preferences
 */
export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): void {
  if (typeof window === 'undefined') return;

  const current = getNotificationPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
  prefsCache = updated;
  prefsListeners.forEach((cb) => cb());
}

// ── useSyncExternalStore 어댑터 (설정 UI용) ──────────────────────────
// localStorage는 외부 스토어다 — effect에서 setState로 미러링하면 React
// 19 린트가 막고, suppressHydrationWarning은 하이드레이션 때 속성 패치를
// 건너뛰어 서버의 disabled가 DOM에 눌어붙는다(4차 GOAL-3에서 실측).
// 스냅샷은 참조 안정성이 필요해서 캐시로 관리한다.
let prefsCache: NotificationPreferences | null = null;
const prefsListeners = new Set<() => void>();

export function subscribeNotificationPreferences(cb: () => void): () => void {
  prefsListeners.add(cb);
  return () => prefsListeners.delete(cb);
}

export function getNotificationPreferencesSnapshot(): NotificationPreferences {
  if (!prefsCache) prefsCache = getNotificationPreferences();
  return prefsCache;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!isPushSupported()) return 'denied';

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): string {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Send a local notification (for bite time alerts).
 * 실제로 발화했는지 boolean으로 알린다 — 권한 없음·조용한 시간 등으로
 * 생략된 것을 발화로 착각해 dedupe 마커를 찍으면 그 알림은 영영
 * 유실된다(4차 GOAL-2 교차검수에서 잡힌 버그 클래스).
 */
export function sendLocalNotification(
  title: string,
  body: string,
  icon: string = '/icons/icon-192x192.png',
  tag?: string
): boolean {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;

  const prefs = getNotificationPreferences();

  // Check quiet hours
  const hour = new Date().getHours();
  if (prefs.quietHoursStart < prefs.quietHoursEnd) {
    if (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd) return false;
  } else {
    if (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd) return false;
  }

  try {
    new Notification(title, {
      body,
      icon,
      tag: tag || 'fishlog',
      badge: '/icons/icon-72x72.png' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule bite time alert
 */
export function scheduleBiteTimeAlert(
  optimalTime: string, // "16:30"
  score: number
): void {
  const prefs = getNotificationPreferences();
  if (!prefs.biteTimeAlert) return;

  const [hours, minutes] = optimalTime.split(':').map(Number);
  const now = new Date();
  const alertTime = new Date();
  alertTime.setHours(hours, minutes - 30, 0, 0); // 30분 전 알림

  if (alertTime <= now) return; // 이미 지난 시간

  const delay = alertTime.getTime() - now.getTime();

  setTimeout(() => {
    sendLocalNotification(
      ' 입질 최적 시간 30분 전!',
      `${optimalTime}에 입질 확률 ${score}%! 지금 준비하세요.`,
      '/icons/icon-192x192.png',
      'bite-time'
    );
  }, delay);
}

/**
 * Send badge earned notification
 */
export function notifyBadgeEarned(
  badgeName: string,
  badgeIcon: string
): void {
  const prefs = getNotificationPreferences();
  if (!prefs.badgeAlert) return;

  sendLocalNotification(
    ' 새 배지 획득!',
    `"${badgeName}" 배지를 획득했습니다!`,
    '/icons/icon-192x192.png',
    'badge'
  );
}

/**
 * Send news alert notification
 */
export function notifyNewFishingNews(
  title: string,
  region: string
): void {
  const prefs = getNotificationPreferences();
  if (!prefs.newsAlert) return;

  sendLocalNotification(
    ' 새 조과 소식!',
    title,
    '/icons/icon-192x192.png',
    'news'
  );
}
