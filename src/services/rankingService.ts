import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getFirebaseDb, isFirebaseReady } from "@/lib/firebase";
import { RankingCategory, RankingData, RankingEntry } from "@/types/ranking";

// ====================================================================
// Firebase Ranking Service
// Reads from publicFeed collection and aggregates real data
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

// --------------- Empty ranking (no real data) ---------------
function getEmptyRanking(category: RankingCategory): RankingData {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    category,
    seasonLabel: `${now.getFullYear()}년 ${now.getMonth() + 1}월 시즌`,
    seasonEndDate: end.toISOString(),
    myRank: null,
    topThree: [],
    rest: [],
    isRealData: true,
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
  if (!db) throw new Error("Firebase not ready");

  const seasonStart = getSeasonStart().toISOString().split("T")[0]; // 'YYYY-MM-DD'

  const feedRef = collection(db, "publicFeed");
  // Fetch recent public catches (max 500 for aggregation)
  const q = query(feedRef, orderBy("createdAt", "desc"), limit(500));
  const snapshot = await getDocs(q);

  const aggregates = new Map<string, UserAggregate>();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as FeedDoc;

    // Filter to current season
    if (data.date < seasonStart) continue;

    const uid = data.userId || "anonymous";
    if (!aggregates.has(uid)) {
      aggregates.set(uid, {
        uid,
        displayName: data.userDisplayName || "익명 낚시인",
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
  category: RankingCategory,
): RankingEntry[] {
  const list = Array.from(aggregates.values());

  let getValue: (a: UserAggregate) => number;
  let getLabel: (v: number) => string;

  switch (category) {
    case "catch":
      getValue = (a) => a.totalCount;
      getLabel = (v) => `${v}마리`;
      break;
    case "size":
      getValue = (a) => a.maxSizeCm;
      getLabel = (v) => (v > 0 ? `${v}cm` : "-");
      break;
    case "variety":
      getValue = (a) => a.speciesSet.size;
      getLabel = (v) => `${v}종`;
      break;
  }

  return list
    .filter((a) => getValue(a) > 0)
    .map((a) => ({
      rank: 0,
      user: {
        id: a.uid,
        uid: a.uid,
        displayName: a.displayName,
        photoURL: a.photoURL || undefined,
        level: 1,
        totalCatch: a.totalCount,
        badges: [],
        createdAt: "",
        updatedAt: "",
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
  myUid?: string,
): Promise<RankingData> {
  // Try Firebase first
  if (isFirebaseReady()) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ranking fetch timeout")), 5000),
      );
      const aggregates = await Promise.race([
        fetchAndAggregate(),
        timeoutPromise,
      ]);

      // No real data yet — return empty ranking
      if (aggregates.size === 0) {
        return getEmptyRanking(category);
      }

      const entries = buildRealEntries(aggregates, category);
      const topThree = entries.slice(0, 3);
      const rest = entries.slice(3, 10);
      const myRank = myUid
        ? (entries.find((e) => e.user.uid === myUid) ?? null)
        : null;

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
      console.error("[RankingService] Firebase read failed:", err);
      return getEmptyRanking(category);
    }
  }

  return getEmptyRanking(category);
}
