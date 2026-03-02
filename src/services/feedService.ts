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
  where,
  limit,
  increment,
  runTransaction,
  Firestore,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseReady } from '@/lib/firebase';
import { getDataService, isUsingFirestore } from '@/services/dataServiceFactory';
import { CatchRecord, PublicFeedItem, FeedComment } from '@/types';

// ====================================================================
// Feed Service — Firestore-backed public feed with localStorage fallback
// ====================================================================

// --------------- helpers ---------------

function getDb(): Firestore | null {
  if (!isFirebaseReady()) return null;
  return getFirebaseDb();
}

// --------------- recordToFeedItem (shared) ---------------

export function recordToFeedItem(record: CatchRecord): PublicFeedItem {
  return {
    id: record.id,
    userId: record.userId || 'anonymous',
    userDisplayName: record.userId ? record.userId.slice(0, 6) : '익명 낚시인',
    date: record.date,
    location: {
      name: record.location.name,
      region: record.location.region,
    },
    species: record.species,
    count: record.count,
    sizeCm: record.sizeCm,
    photos: record.photos.slice(0, 1),
    weather: record.weather,
    tide: record.tide,
    createdAt: record.createdAt,
    likeCount: record.likeCount || 0,
    commentCount: 0,
    sourceRecordId: record.id,
    comments: [],
  };
}

// ====================================================================
// 1. GET PUBLIC FEED
// ====================================================================

export async function getPublicFeed(): Promise<PublicFeedItem[]> {
  const db = getDb();

  // Firestore path: publicFeed collection, ordered by createdAt desc
  if (db) {
    try {
      const feedRef = collection(db, 'publicFeed');
      const q = query(feedRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const items: PublicFeedItem[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Load comments sub-collection
        const commentsRef = collection(db, 'publicFeed', docSnap.id, 'comments');
        const commentsSnap = await getDocs(query(commentsRef, orderBy('createdAt', 'asc')));
        const comments: FeedComment[] = commentsSnap.docs.map((c) => ({
          id: c.id,
          ...c.data(),
        })) as FeedComment[];

        items.push({
          id: docSnap.id,
          userId: data.userId || 'anonymous',
          userDisplayName: data.userDisplayName || '익명 낚시인',
          date: data.date,
          location: data.location || { name: '알 수 없음' },
          species: data.species,
          count: data.count,
          sizeCm: data.sizeCm,
          photos: data.photos || [],
          weather: data.weather,
          tide: data.tide,
          createdAt: data.createdAt,
          likeCount: data.likeCount || 0,
          commentCount: comments.length,
          sourceRecordId: data.sourceRecordId,
          comments,
        });
      }
      return items;
    } catch (err) {
      console.warn('[FeedService] Firestore read failed, falling back to localStorage:', err);
    }
  }

  // Fallback: localStorage (single-user)
  const dataService = getDataService();
  const allRecords = await dataService.getCatchRecords();
  return allRecords
    .filter((r) => r.visibility === 'public')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(recordToFeedItem);
}

// ====================================================================
// 2. PUBLISH / UNPUBLISH
// ====================================================================

export async function publishToFeed(record: CatchRecord): Promise<void> {
  const db = getDb();
  if (!db) return;

  const feedRef = collection(db, 'publicFeed');
  await addDoc(feedRef, {
    userId: record.userId || 'anonymous',
    userDisplayName: record.userId ? record.userId.slice(0, 6) : '익명 낚시인',
    date: record.date,
    location: { name: record.location.name, region: record.location.region },
    species: record.species,
    count: record.count,
    sizeCm: record.sizeCm || null,
    photos: record.photos.slice(0, 1),
    weather: record.weather || null,
    tide: record.tide || null,
    createdAt: record.createdAt,
    likeCount: 0,
    sourceRecordId: record.id,
  });
}

export async function unpublishFromFeed(sourceRecordId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const feedRef = collection(db, 'publicFeed');
  const q = query(feedRef, where('sourceRecordId', '==', sourceRecordId));
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'publicFeed', docSnap.id));
  }
}

// ====================================================================
// 3. TOGGLE VISIBILITY (with dual-write)
// ====================================================================

export async function toggleVisibility(
  recordId: string,
  newVisibility: 'public' | 'private'
): Promise<CatchRecord> {
  const dataService = getDataService();
  const updated = await dataService.updateCatchRecord(recordId, { visibility: newVisibility });

  // Dual-write to publicFeed
  if (newVisibility === 'public') {
    await publishToFeed(updated);
  } else {
    await unpublishFromFeed(recordId);
  }

  return updated;
}

// ====================================================================
// 4. LIKES (Firestore transaction for atomicity)
// ====================================================================

export function getLikedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('fishlog_likes');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export async function toggleLike(feedItemId: string): Promise<{ liked: boolean; newCount: number }> {
  const liked = getLikedSet();
  const wasLiked = liked.has(feedItemId);

  // Update local liked set
  if (wasLiked) { liked.delete(feedItemId); } else { liked.add(feedItemId); }
  if (typeof window !== 'undefined') {
    localStorage.setItem('fishlog_likes', JSON.stringify([...liked]));
  }

  const db = getDb();
  let newCount = 0;

  if (db) {
    try {
      const feedDocRef = doc(db, 'publicFeed', feedItemId);
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(feedDocRef);
        if (!snap.exists()) return;
        const current = snap.data().likeCount || 0;
        newCount = Math.max(0, current + (wasLiked ? -1 : 1));
        txn.update(feedDocRef, { likeCount: newCount });
      });
    } catch (err) {
      console.warn('[FeedService] Like transaction failed:', err);
    }
  } else {
    // localStorage fallback
    const dataService = getDataService();
    const record = await dataService.getCatchRecord(feedItemId);
    if (record) {
      newCount = Math.max(0, (record.likeCount || 0) + (wasLiked ? -1 : 1));
      await dataService.updateCatchRecord(feedItemId, { likeCount: newCount });
    }
  }

  return { liked: !wasLiked, newCount };
}

// ====================================================================
// 5. COMMENTS (Firestore sub-collection)
// ====================================================================

export async function addComment(
  feedItemId: string,
  userId: string,
  displayName: string,
  content: string
): Promise<FeedComment | null> {
  const db = getDb();
  if (!db) return null;

  const commentsRef = collection(db, 'publicFeed', feedItemId, 'comments');
  const newComment = {
    userId,
    userDisplayName: displayName,
    content,
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(commentsRef, newComment);
  return { id: docRef.id, ...newComment };
}

export async function getComments(feedItemId: string): Promise<FeedComment[]> {
  const db = getDb();
  if (!db) return [];

  const commentsRef = collection(db, 'publicFeed', feedItemId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FeedComment[];
}
