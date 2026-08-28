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
    // 시각을 고정하면 창 계산이 결정적이다 — 프로덕트 로직을 테스트에
    // 복제하던 초판을 교차검수 지적으로 교체.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 10, 0)); // 10:00
    try {
      saveNotificationPreferences({ quietHoursStart: 12, quietHoursEnd: 13 });
      expect(sendLocalNotification('t', 'b')).toBe(true);
      expect(constructed).toEqual(['t']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns false inside a midnight-wrapping quiet window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 2, 0)); // 02:00 — 23~06 창 안
    try {
      saveNotificationPreferences({ quietHoursStart: 23, quietHoursEnd: 6 });
      expect(sendLocalNotification('t', 'b')).toBe(false);
      expect(constructed).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
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
