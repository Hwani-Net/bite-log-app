import { DataService } from '@/types';
import { localStorageService } from './localStorage';
import { createFirestoreService } from './firestoreService';

let currentService: DataService = localStorageService;
let currentUid: string | null = null;

/**
 * Switch data service based on auth state.
 * - Logged in → Firestore (with user-scoped data)
 * - Logged out → localStorage fallback
 */
export function setDataServiceUser(uid: string | null): void {
  if (uid && uid !== currentUid) {
    currentService = createFirestoreService(uid);
    currentUid = uid;
  } else if (!uid) {
    currentService = localStorageService;
    currentUid = null;
  }
}

export function getDataService(): DataService {
  return currentService;
}

export function isUsingFirestore(): boolean {
  return currentUid !== null;
}
