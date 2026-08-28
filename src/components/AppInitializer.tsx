'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { setDataServiceUser } from '@/services/dataServiceFactory';
import { migrateLocalToFirestore } from '@/services/migrationService';
import { syncPendingRecords } from '@/services/offlineQueue';
import { getDataService } from '@/services/dataServiceFactory';
import { pendingSeasonOpenAlerts } from '@/lib/seasonOpenAlert';
import { nextBriefingNotifications } from '@/lib/tripReminders';
import { localISODate } from '@/lib/localDate';
import { sendLocalNotification } from '@/services/pushNotificationService';

export default function AppInitializer() {
  const initFromStorage = useAppStore((s) => s.initFromStorage);
  const theme = useAppStore((s) => s.theme);
  const { user } = useAuth();

  // Init theme/locale from localStorage
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // System theme listener
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', e.matches ? '#101a22' : '#f6f7f8');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Auth state → data service switch + migration
  useEffect(() => {
    if (user) {
      setDataServiceUser(user.uid);
      // Migrate localStorage data on first login
      migrateLocalToFirestore(user.uid).then((count) => {
        if (count > 0) console.log(`Migrated ${count} records to Firestore`);
      });
      // Sync any offline records
      syncPendingRecords(async (data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await getDataService().addCatchRecord(data as any);
      });
    } else {
      setDataServiceUser(null);
    }
  }, [user]);

  // 금어기 해제 D-3 알림(4차 GOAL-2) — 이 앱의 첫 실제로 울리는 알림.
  // 앱을 열 때 1회 검사, (어종,해제일)당 1회만 발화(localStorage dedupe,
  // 지난 해제일 키는 자동 정리돼 내년에 다시 알린다). 알림 권한이 없거나
  // 조용한 시간대면 sendLocalNotification이 알아서 생략한다.
  useEffect(() => {
    let cancelled = false;
    getDataService()
      .getCatchRecords()
      .then((records) => {
        if (cancelled) return;
        const alerts = pendingSeasonOpenAlerts(records, new Date());
        if (alerts.length === 0) return;
        const KEY = 'biteLog_seasonOpenNotified';
        let stored: unknown = [];
        try {
          stored = JSON.parse(localStorage.getItem(KEY) ?? '[]');
        } catch {
          // 깨진 저장값은 새로 시작
        }
        const { notify, sent } = nextBriefingNotifications(
          stored,
          alerts.map((a) => ({ name: a.species, date: a.openDate })),
          localISODate(new Date()),
        );
        for (const t of notify) {
          const alert = alerts.find((a) => a.species === t.name);
          if (!alert) continue;
          sendLocalNotification(
            `${t.name} 금어기 해제 임박`,
            alert.daysLeft === 0
              ? `오늘부터 ${t.name} 금어기가 풀렸어요. 출조 준비!`
              : `${alert.daysLeft}일 뒤(${t.date.slice(5).replace('-', '/')}) 해제돼요. 미리 준비하세요!`,
            undefined,
            `season-open-${t.name}`,
          );
        }
        if (notify.length > 0) localStorage.setItem(KEY, JSON.stringify(sent));
      })
      .catch(() => {
        // 기록을 못 읽으면 알림만 조용히 생략 — 초기화의 다른 일은 영향 없음
      });
    return () => {
      cancelled = true;
    };
  }, [user]); // 로그인 전환 시 데이터 소스가 바뀌므로 재검사

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  return null;
}
