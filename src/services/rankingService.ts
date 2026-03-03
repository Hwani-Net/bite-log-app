import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseReady } from '@/lib/firebase';
import { RankingCategory, RankingData, RankingEntry } from '@/types/ranking';

// ====================================================================
// Firebase Ranking Service
// Reads from publicFeed collection and aggregates real data
// Falls back to mock data when Firebase is unavailable
// ====================================================================

// --------------- Types ---------------
interface FeedDoc {
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  species: string;
  count: number;
  sizeCm?: number | null;
  date: string;
  createdAt: string;
}

interface UserAggregate {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalCount: number;
  maxSizeCm: number;
  speciesSet: Set<string>;
}

// --------------- Mock data (fallback) ---------------
const AVATARS = ['🎣', '🐟', '🦈', '🐠', '🐡', '🦀', '🐙', '🦑', '🐚', '🪸', '🌊', '⚓'];

const MOCK_DATA = {
  catch: [
    { uid: 'u1', displayName: '바다의전설', value: 58, label: '58마리' },
    { uid: 'u2', displayName: '도시어부K', value: 42, label: '42마리' },
    { uid: 'u3', displayName: '강태공언니', value: 39, label: '39마리' },
    { uid: 'u4', displayName: '울진의아들', value: 35, label: '35마리' },
    { uid: 'u5', displayName: '낚시광마크', value: 31, label: '31마리' },
    { uid: 'u6', displayName: '보리보리쌀', value: 28, label: '28마리' },
    { uid: 'u7', displayName: '캐스팅마스터', value: 26, label: '26마리' },
    { uid: 'u8', displayName: '포항물개', value: 23, label: '23마리' },
    { uid: 'u9', displayName: '목포바지락', value: 18, label: '18마리' },
    { uid: 'u10', displayName: '여수밤바다', value: 12, label: '12마리' },
  ],
  size: [
    { uid: 'u1', displayName: '바다의전설', value: 72, label: '72cm' },
    { uid: 'u2', displayName: '도시어부K', value: 68, label: '68cm' },
    { uid: 'u3', displayName: '강태공언니', value: 65, label: '65cm' },
    { uid: 'u4', displayName: '울진의아들', value: 61, label: '61cm' },
    { uid: 'u5', displayName: '낚시광마크', value: 58, label: '58cm' },
    { uid: 'u6', displayName: '보리보리쌀', value: 55, label: '55cm' },
    { uid: 'u7', displayName: '캐스팅마스터', value: 52, label: '52cm' },
    { uid: 'u8', displayName: '포항물개', value: 48, label: '48cm' },
    { uid: 'u9', displayName: '목포바지락', value: 42, label: '42cm' },
    { uid: 'u10', displayName: '여수밤바다', value: 38, label: '38cm' },
  ],
  variety: [
    { uid: 'u1', displayName: '바다의전설', value: 18, label: '18종' },
    { uid: 'u2', displayName: '도시어부K', value: 15, label: '15종' },
    { uid: 'u3', displayName: '강태공언니', value: 14, label: '14종' },
    { uid: 'u4', displayName: '울진의아들', value: 12, label: '12종' },
    { uid: 'u5', displayName: '낚시광마크', value: 11, label: '11종' },
    { uid: 'u6', displayName: '보리보리쌀', value: 10, label: '10종' },
    { uid: 'u7', displayName: '캐스팅마스터', value: 7, label: '7종' },
    { uid: 'u8', displayName: '포항물개', value: 6, label: '6종' },
    { uid: 'u9', displayName: '목포바지락', value: 5, label: '5종' },
    { uid: 'u10', displayName: '여수밤바다', value: 4, label: '4종' },
  ],
};

function getMockRanking(category: RankingCategory, myUid?: string): RankingData {
  const list = MOCK_DATA[category];
  const entries: RankingEntry[] = list.map((item, i) => ({
    rank: i + 1,
    user: {
      id: item.uid,
      uid: item.uid,
      displayName: item.displayName,
      photoURL: AVATARS[i % AVATARS.length],
      level: 10,
      totalCatch: 0,
      badges: [],
      createdAt: '',
      updatedAt: '',
    },
    value: item.value,
    label: item.label,
  }));

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3, 10);
  const myRank = myUid ? entries.find(e => e.user.uid === myUid) ?? null : null;

  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return {
    category,
    seasonLabel: `${now.getFullYear()}년 ${now.getMonth() + 1}월 시즌`,
    seasonEndDate: end.toISOString(),
    myRank,
    topThree,
    rest,
    isRealData: false,
  };
}

// --------------- Season window ---------------
function getSeasonStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function getSeasonEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}
function getSeasonLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 시즌`;
}

// --------------- Firebase aggregation ---------------
async function fetchAndAggregate(): Promise<Map<string, UserAggregate>> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not ready');

  const seasonStart = getSeasonStart().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const feedRef = collection(db, 'publicFeed');
  // Fetch recent public catches (max 500 for aggregation)
  const q = query(feedRef, orderBy('createdAt', 'desc'), limit(500));
  const snapshot = await getDocs(q);

  const aggregates = new Map<string, UserAggregate>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as FeedDoc;

    // Filter to current season
    if (data.date < seasonStart) continue;

    const uid = data.userId || 'anonymous';
    if (!aggregates.has(uid)) {
      aggregates.set(uid, {
        uid,
        displayName: data.userDisplayName || '익명 낚시인',
        photoURL: data.userPhotoURL,
        totalCount: 0,
        maxSizeCm: 0,
        speciesSet: new Set(),
      });
    }

    const agg = aggregates.get(uid)!;
    agg.totalCount += data.count || 0;
    if (data.sizeCm && data.sizeCm > agg.maxSizeCm) {
      agg.maxSizeCm = data.sizeCm;
    }
    if (data.species) agg.speciesSet.add(data.species);
  }

  return aggregates;
}

function buildRealEntries(
  aggregates: Map<string, UserAggregate>,
  category: RankingCategory
): RankingEntry[] {
  const list = Array.from(aggregates.values());

  let getValue: (a: UserAggregate) => number;
  let getLabel: (v: number) => string;

  switch (category) {
    case 'catch':
      getValue = a => a.totalCount;
      getLabel = v => `${v}마리`;
      break;
    case 'size':
      getValue = a => a.maxSizeCm;
      getLabel = v => v > 0 ? `${v}cm` : '-';
      break;
    case 'variety':
      getValue = a => a.speciesSet.size;
      getLabel = v => `${v}종`;
      break;
  }

  return list
    .filter(a => getValue(a) > 0)
    .map(a => ({
      rank: 0,
      user: {
        id: a.uid,
        uid: a.uid,
        displayName: a.displayName,
        photoURL: a.photoURL || AVATARS[Math.abs(a.uid.charCodeAt(0)) % AVATARS.length],
        level: 1,
        totalCatch: a.totalCount,
        badges: [],
        createdAt: '',
        updatedAt: '',
      },
      value: getValue(a),
      label: getLabel(getValue(a)),
    }))
    .sort((a, b) => b.value - a.value)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

// --------------- Main exported function ---------------
export async function getFirebaseRanking(
  category: RankingCategory,
  myUid?: string
): Promise<RankingData> {
  // Try Firebase first
  if (isFirebaseReady()) {
    try {
      const aggregates = await fetchAndAggregate();

      // If no real data yet, fall back to mock but mark it
      if (aggregates.size === 0) {
        return getMockRanking(category, myUid);
      }

      const entries = buildRealEntries(aggregates, category);
      const topThree = entries.slice(0, 3);
      const rest = entries.slice(3, 10);
      const myRank = myUid ? entries.find(e => e.user.uid === myUid) ?? null : null;

      return {
        category,
        seasonLabel: getSeasonLabel(),
        seasonEndDate: getSeasonEnd().toISOString(),
        myRank,
        topThree,
        rest,
        isRealData: true,
      };
    } catch (err) {
      console.warn('[RankingService] Firebase read failed, using mock:', err);
    }
  }

  return getMockRanking(category, myUid);
}

// Legacy mock export kept for backward compatibility
export const mockRankingService = {
  getRanking: (category: RankingCategory) => Promise.resolve(getMockRanking(category)),
};
