import { FirebaseApp, initializeApp, getApps } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { Analytics, getAnalytics, isSupported, logEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID };

// Check if Firebase config is available (env vars set)
function isConfigured(): boolean {
  return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let analyticsInstance: Analytics | null = null;

function getApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null; // SSR safety
  if (!isConfigured()) return null;
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const a = getApp();
  if (!a) return null;
  authInstance = getAuth(a);
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const a = getApp();
  if (!a) return null;
  dbInstance = getFirestore(a);
  return dbInstance;
}

// Storage는 사진 업로드 경로에서만 쓰므로 지연 로드 — 안 쓰는 사용자
// 번들에 SDK를 얹지 않는다(5차 GOAL-3). 타입은 유지해야 호출부가
// ref()/uploadBytes()에 그대로 넘길 수 있다.
let storageInstance: FirebaseStorage | null = null;
export async function getFirebaseStorage(): Promise<FirebaseStorage | null> {
  if (storageInstance) return storageInstance;
  const a = getApp();
  if (!a || !firebaseConfig.storageBucket) return null;
  try {
    const { getStorage } = await import('firebase/storage');
    storageInstance = getStorage(a);
    return storageInstance;
  } catch {
    return null;
  }
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance) return analyticsInstance;
  const a = getApp();
  if (!a) return null;
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(a);
      return analyticsInstance;
    }
  } catch (err) {
    console.warn('Analytics not supported', err);
  }
  return null;
}

// Helper function to log events easily
export async function logAppEvent(eventName: string, eventParams?: Record<string, unknown>) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    } else {
      console.log('[Mock Analytics]', eventName, eventParams);
    }
  } catch (err) {
    console.warn('Failed to log event', err);
  }
}

/** Check if Firebase is ready to use */
export function isFirebaseReady(): boolean {
  return typeof window !== 'undefined' && isConfigured();
}
