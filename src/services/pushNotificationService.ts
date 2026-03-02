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
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;   // 0-23
  regions: string[];       // ['east', 'west', 'south', 'jeju']
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  biteTimeAlert: true,
  newsAlert: true,
  badgeAlert: true,
  quietHoursStart: 23,
  quietHoursEnd: 6,
  regions: ['all'],
};

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
 * Send a local notification (for bite time alerts)
 */
export function sendLocalNotification(
  title: string,
  body: string,
  icon: string = '/icons/icon-192x192.png',
  tag?: string
): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const prefs = getNotificationPreferences();

  // Check quiet hours
  const hour = new Date().getHours();
  if (prefs.quietHoursStart < prefs.quietHoursEnd) {
    if (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd) return;
  } else {
    if (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd) return;
  }

  new Notification(title, {
    body,
    icon,
    tag: tag || 'fishlog',
    badge: '/icons/icon-72x72.png',
  });
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
      '🐟 입질 최적 시간 30분 전!',
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
    '🏆 새 배지 획득!',
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
    '📰 새 조과 소식!',
    title,
    '/icons/icon-192x192.png',
    'news'
  );
}
