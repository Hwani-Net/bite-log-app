import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import {
  CatchRecord,
  DataService,
  UserStats,
  PeriodFilter,
} from '@/types';
import { publishToFeed, unpublishFromFeed } from '@/services/feedService';

// Helper: compute stats from records
function computeStats(records: CatchRecord[]): UserStats {
  const uniqueDates = new Set(records.map((r) => r.date));
  const totalTrips = uniqueDates.size;
  const totalCatch = records.reduce((sum, r) => sum + r.count, 0);
  const avgCatchPerTrip = totalTrips > 0 ? Math.round((totalCatch / totalTrips) * 10) / 10 : 0;
  const maxSizeCm = records.reduce((max, r) => Math.max(max, r.sizeCm ?? 0), 0);

  const speciesMap = new Map<string, number>();
  records.forEach((r) => {
    speciesMap.set(r.species, (speciesMap.get(r.species) ?? 0) + r.count);
  });
  const speciesBreakdown = Array.from(speciesMap.entries())
    .map(([species, count]) => ({
      species,
      count,
      percentage: totalCatch > 0 ? Math.round((count / totalCatch) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const monthMap = new Map<string, number>();
  records.forEach((r) => {
    const key = r.date.substring(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + r.count);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, count]) => ({
      month,
      label: `${parseInt(month.split('-')[1])}월`,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const spotMap = new Map<string, { visits: Set<string>; totalCatch: number; spot: CatchRecord['location'] }>();
  records.forEach((r) => {
    const key = r.location.name;
    if (!spotMap.has(key)) {
      spotMap.set(key, { visits: new Set(), totalCatch: 0, spot: r.location });
    }
    const entry = spotMap.get(key)!;
    entry.visits.add(r.date);
    entry.totalCatch += r.count;
  });
  const topSpots = Array.from(spotMap.values())
    .map((v) => ({ spot: v.spot, visits: v.visits.size, totalCatch: v.totalCatch }))
    .sort((a, b) => b.totalCatch - a.totalCatch)
    .slice(0, 5);

  return { totalTrips, totalCatch, avgCatchPerTrip, maxSizeCm, speciesBreakdown, monthlyTrend, topSpots };
}

function filterByPeriod(records: CatchRecord[], period: PeriodFilter): CatchRecord[] {
  if (period === 'all') return records;
  const now = new Date();
  let cutoff: Date;
  switch (period) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    default:
      return records;
  }
  return records.filter((r) => new Date(r.date) >= cutoff);
}

function getDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized — check Firebase config');
  return db;
}

export function createFirestoreService(uid: string): DataService {
  return {
    async getCatchRecords() {
      const catchesRef = collection(getDb(), 'users', uid, 'catches');
      const q = query(catchesRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CatchRecord));
    },

    async getCatchRecord(id: string) {
      const docRef = doc(getDb(), 'users', uid, 'catches', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as CatchRecord;
    },

    async addCatchRecord(data) {
      const catchesRef = collection(getDb(), 'users', uid, 'catches');
      const now = new Date().toISOString();
      const record = { ...data, userId: uid, createdAt: now, updatedAt: now };
      const docRef = await addDoc(catchesRef, record);
      const saved = { ...record, id: docRef.id } as CatchRecord;

      // Dual-write: publish to global feed if public
      if (saved.visibility === 'public') {
        publishToFeed(saved).catch((e) => console.warn('[Dual-Write] publish failed:', e));
      }

      return saved;
    },

    async updateCatchRecord(id, data) {
      const docRef = doc(getDb(), 'users', uid, 'catches', id);

      // Detect visibility change for dual-write
      const prevSnap = await getDoc(docRef);
      const prevVis = prevSnap.exists() ? prevSnap.data().visibility : undefined;

      const updates = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(docRef, updates);
      const snap = await getDoc(docRef);
      const updated = { id: snap.id, ...snap.data() } as CatchRecord;

      // Dual-write logic on visibility change
      if (data.visibility && data.visibility !== prevVis) {
        if (data.visibility === 'public') {
          publishToFeed(updated).catch((e) => console.warn('[Dual-Write] publish failed:', e));
        } else {
          unpublishFromFeed(id).catch((e) => console.warn('[Dual-Write] unpublish failed:', e));
        }
      }

      return updated;
    },

    async deleteCatchRecord(id) {
      const docRef = doc(getDb(), 'users', uid, 'catches', id);
      await deleteDoc(docRef);
    },

    async getUserStats(period: PeriodFilter = 'all') {
      const all = await this.getCatchRecords();
      const filtered = filterByPeriod(all, period);
      return computeStats(filtered);
    },
  };
}
