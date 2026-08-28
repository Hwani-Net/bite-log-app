'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { setDataServiceUser } from '@/services/dataServiceFactory';
import { migrateLocalToFirestore } from '@/services/migrationService';
import { syncPendingRecords } from '@/services/offlineQueue';
import { getDataService } from '@/services/dataServiceFactory';
import {
  pendingSeasonOpenAlerts,
  unnotifiedAlerts,
  markFired,
  SEASON_OPEN_NOTIFIED_KEY,
} from '@/lib/seasonOpenAlert';
import { localISODate } from '@/lib/localDate';
import { initInstallPrompt } from '@/lib/installPrompt';
import {
  sendLocalNotification,
  getNotificationPreferences,
} from '@/services/pushNotificationService';

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
    // 설정의 금어기 해제 토글이 이 게이트를 통해 실제로 작동한다(4차 GOAL-3).
    if (!getNotificationPreferences().seasonOpenAlert) return;
    let cancelled = false;
    getDataService()
      .getCatchRecords()
      .then((records) => {
        if (cancelled) return;
        // 알려진 경합: 첫 로그인 직후엔 위 effect의 Firestore 마이그레이션이
        // 진행 중이라 이번 오픈은 빈/부분 기록을 읽을 수 있다 — 그 경우
        // 마커가 안 찍히므로 다음 앱 오픈에서 자연 복구된다.
        const alerts = pendingSeasonOpenAlerts(records, new Date());
        if (alerts.length === 0) return;
        let stored: unknown = [];
        try {
          stored = JSON.parse(
            localStorage.getItem(SEASON_OPEN_NOTIFIED_KEY) ?? '[]',
          );
        } catch {
          // 깨진 저장값은 새로 시작
        }
        const fired: string[] = [];
        for (const alert of unnotifiedAlerts(alerts, stored)) {
          const [, mm, dd] = alert.openDate.split('-');
          const dateKo = `${Number(mm)}월 ${Number(dd)}일`;
          const ok = sendLocalNotification(
            `${alert.species} 금어기 해제 임박`,
            alert.daysLeft === 0
              ? `오늘부터 ${alert.species} 금어기가 풀렸어요. 출조 준비!`
              : `${alert.daysLeft}일 뒤(${dateKo}) 해제돼요. 미리 준비하세요!`,
            undefined,
            `season-open-${alert.species}`,
          );
          // 실제 발화만 마킹 — 권한 없음·조용한 시간으로 생략된 알림을
          // 마킹하면 다음 오픈의 재시도 기회가 사라진다(교차검수 지적).
          if (ok) fired.push(`${alert.species}|${alert.openDate}`);
        }
        if (fired.length > 0) {
          localStorage.setItem(
            SEASON_OPEN_NOTIFIED_KEY,
            JSON.stringify(markFired(stored, fired, localISODate(new Date()))),
          );
        }
      })
      .catch((err) => {
        // 기록을 못 읽으면 알림만 생략 — 초기화의 다른 일은 영향 없음
        console.warn('season-open alert check skipped:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [user]); // 로그인 전환 시 데이터 소스가 바뀌므로 재검사

  // A2HS 설치 프롬프트 캡처(4차 GOAL-6) — 이벤트는 로드 직후 오므로
  // 여기서 붙잡아 설정 페이지의 설치 버튼이 쓴다.
  useEffect(() => {
    initInstallPrompt();
  }, []);

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
