'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { setDataServiceUser } from '@/services/dataServiceFactory';
import { migrateLocalToFirestore } from '@/services/migrationService';
import { syncPendingRecords } from '@/services/offlineQueue';
import { getDataService } from '@/services/dataServiceFactory';

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
