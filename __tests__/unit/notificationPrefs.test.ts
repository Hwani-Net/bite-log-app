import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  sendLocalNotification,
} from '@/services/pushNotificationService';

// node 환경 — window/localStorage/Notification을 스텁으로 구성해 설정
// 토글이 연결된 실제 저장소(fishlog_notification_prefs)의 계약을 고정.
const store = new Map<string, string>();
let constructed: string[] = [];

beforeEach(() => {
  store.clear();
  constructed = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  class FakeNotification {
    static permission = 'granted';
    constructor(title: string) {
      constructed.push(title);
    }
  }
  vi.stubGlobal('Notification', FakeNotification);
  vi.stubGlobal('navigator', { serviceWorker: {} });
  // isPushSupported는 'Notification' in window를 보므로 window에도 심는다.
  (globalThis.window as Record<string, unknown>).Notification = FakeNotification;
});
afterEach(() => vi.unstubAllGlobals());

describe('notification preferences', () => {
  it('defaults include the season-open alert switched on', () => {
    expect(getNotificationPreferences().seasonOpenAlert).toBe(true);
    expect(getNotificationPreferences().biteTimeAlert).toBe(true);
  });

  it('partial saves merge and round-trip through the real storage key', () => {
    saveNotificationPreferences({ seasonOpenAlert: false });
    const prefs = getNotificationPreferences();
    expect(prefs.seasonOpenAlert).toBe(false);
    expect(prefs.newsAlert).toBe(true); // 나머지는 기본값 유지
    expect(store.has('fishlog_notification_prefs')).toBe(true);
  });
});

describe('sendLocalNotification firing report', () => {
  it('returns true and constructs when granted outside quiet hours', () => {
    const h = new Date().getHours();
    // 지금 시각을 확실히 비껴가는 1시간짜리 방해 금지 창.
    saveNotificationPreferences({
      quietHoursStart: (h + 2) % 24,
      quietHoursEnd: (h + 3) % 24,
    });
    // 창이 자정을 감싸며 지금을 포함해버리는 드문 조합이면 검증 불가 —
    // 그 경우엔 항상-허용 조합으로 대체(원리는 동일).
    const p = getNotificationPreferences();
    const wraps = p.quietHoursStart > p.quietHoursEnd;
    const blockedNow = wraps
      ? h >= p.quietHoursStart || h < p.quietHoursEnd
      : h >= p.quietHoursStart && h < p.quietHoursEnd;
    if (blockedNow) {
      saveNotificationPreferences({
        quietHoursStart: (h + 5) % 24,
        quietHoursEnd: (h + 6) % 24,
      });
    }
    expect(sendLocalNotification('t', 'b')).toBe(true);
    expect(constructed).toEqual(['t']);
  });

  it('returns false without constructing when permission is denied', () => {
    (
      globalThis.Notification as unknown as { permission: string }
    ).permission = 'denied';
    expect(sendLocalNotification('t', 'b')).toBe(false);
    expect(constructed).toEqual([]);
  });

  it('returns false during an always-on quiet window — skipped, not fired', () => {
    saveNotificationPreferences({ quietHoursStart: 0, quietHoursEnd: 24 });
    expect(sendLocalNotification('t', 'b')).toBe(false);
    expect(constructed).toEqual([]);
  });
});
