// "내 선사 카드" — 예약 플랫폼이 만들어 줄 수 없는, 사용자 편에 선 기록.
// 즐겨찾기·승선 판정·메모·승선 이력·조회 시점 스냅샷을 배 하나(uid)에 모아
// 둔다. 저장소를 하나로 둔 이유: 즐겨찾기와 판정과 이력이 각각 따로 살면
// "이 배 예전에 탔던 그 배인가?"를 답할 수 없기 때문이다.
//
// 키는 더피싱 uid. 선사가 배 이름이나 모항을 바꿔도 uid는 유지되므로,
// 이름이 바뀐 배에도 과거의 판정이 그대로 따라붙는다(스냅샷 비교는 GOAL-3).

export const STORE_KEY = "biteLog_myBoats";

export type BoatVerdict = "again" | "ok" | "never";

/** 그 배를 본 시점의 표시 정보. 이름·모항·가격 변경 감지의 기준점이 된다. */
export interface BoatSnapshot {
  name: string;
  areaPath: string;
  fishTypes?: string;
  imageUrl?: string;
  priceLine?: string;
  seenAt: string; // ISO
}

export interface BoatRide {
  date: string; // YYYY-MM-DD
  memo?: string;
}

export interface MyBoat {
  uid: string;
  favorite: boolean;
  verdict: BoatVerdict | null;
  memo: string;
  rides: BoatRide[];
  snapshots: BoatSnapshot[];
  // Consecutive detail-page visits where thefishing.kr returned a page
  // that parsed to an empty name — a fetch that succeeded but found
  // nothing, as opposed to a network failure. Counted rather than acted on
  // after one hit, since a single empty parse can be their own transient
  // hiccup; see markGoneStreak.
  goneStreak: number;
}

export type MyBoatMap = Record<string, MyBoat>;

function emptyBoat(uid: string): MyBoat {
  return {
    uid,
    favorite: false,
    verdict: null,
    memo: "",
    rides: [],
    snapshots: [],
    goneStreak: 0,
  };
}

/**
 * localStorage is a trust boundary, not just our own writes — a stale
 * pre-migration shape, a half-written entry from a crashed tab, or a manual
 * devtools edit can all leave one boat's record malformed. Rebuild each
 * entry onto `emptyBoat` defaults instead of trusting the stored shape, so
 * one bad entry (e.g. a missing `snapshots` array) can't throw deep inside
 * a render (listFavorites reads `snapshots[length - 1]` unguarded).
 */
function normalizeBoat(uid: string, raw: unknown): MyBoat {
  const base = emptyBoat(uid);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<MyBoat>;
  return {
    uid,
    favorite: typeof r.favorite === "boolean" ? r.favorite : base.favorite,
    verdict: r.verdict === "again" || r.verdict === "ok" || r.verdict === "never" ? r.verdict : null,
    memo: typeof r.memo === "string" ? r.memo : base.memo,
    rides: Array.isArray(r.rides) ? r.rides : base.rides,
    snapshots: Array.isArray(r.snapshots) ? r.snapshots : base.snapshots,
    goneStreak: typeof r.goneStreak === "number" ? r.goneStreak : base.goneStreak,
  };
}

/** 저장된 내용이 깨졌거나 서버 렌더 중이면 빈 맵. 절대 throw 하지 않는다. */
export function loadMyBoats(): MyBoatMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: MyBoatMap = {};
    for (const [uid, entry] of Object.entries(parsed as Record<string, unknown>)) {
      map[uid] = normalizeBoat(uid, entry);
    }
    return map;
  } catch {
    return {};
  }
}

export function saveMyBoats(map: MyBoatMap): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    // 용량 초과 등 — 기록을 못 남겨도 예약 흐름 자체는 막지 않는다.
  }
}

export function getMyBoat(uid: string): MyBoat | null {
  return loadMyBoats()[uid] ?? null;
}

/** 없으면 만들고, 있으면 patch 를 병합해 저장한 뒤 결과를 돌려준다. */
export function updateMyBoat(
  uid: string,
  patch: Partial<Omit<MyBoat, "uid">>,
): MyBoat {
  const map = loadMyBoats();
  const next: MyBoat = { ...(map[uid] ?? emptyBoat(uid)), ...patch, uid };
  map[uid] = next;
  saveMyBoats(map);
  return next;
}

/**
 * 그 시점의 표시 정보를 이력에 남긴다. 직전 스냅샷과 이름·모항·가격이
 * 모두 같으면 새로 쌓지 않는다 — 배를 열어볼 때마다 같은 값이 쌓이면
 * "무엇이 언제 바뀌었나"를 읽을 수 없게 되기 때문이다.
 */
export function recordSnapshot(
  uid: string,
  snap: Omit<BoatSnapshot, "seenAt">,
  seenAt: string = new Date().toISOString(),
): MyBoat {
  const boat = getMyBoat(uid) ?? emptyBoat(uid);
  const last = boat.snapshots[boat.snapshots.length - 1];
  const unchanged =
    last &&
    last.name === snap.name &&
    last.areaPath === snap.areaPath &&
    (last.priceLine ?? "") === (snap.priceLine ?? "");
  if (unchanged) return boat;
  return updateMyBoat(uid, {
    snapshots: [...boat.snapshots, { ...snap, seenAt }],
  });
}

/** "서해권 > 충청남도 > 보령시 > 대천항" → "대천항". 마지막 조각이 모항. */
export function shortPort(areaPath: string): string {
  return areaPath.split(">").map((s) => s.trim()).filter(Boolean).at(-1) ?? areaPath;
}

export interface SnapshotChange {
  nameChanged: boolean;
  portChanged: boolean;
  priceChanged: boolean;
  previous: BoatSnapshot;
  current: BoatSnapshot;
}

/**
 * 최근 두 스냅샷을 비교해 무엇이 바뀌었는지 알려준다. recordSnapshot 은
 * 이름·모항·가격이 전부 같으면 새로 쌓지 않으므로, 스냅샷이 2개 이상이면
 * 마지막 둘은 반드시 다르다 — 그래서 "뭐가 바뀌었나"만 가려내면 된다.
 * 스냅샷이 1개 이하(첫 방문 또는 아직 변경 이력 없음)면 null.
 */
export function diffLatestSnapshots(boat: MyBoat): SnapshotChange | null {
  if (boat.snapshots.length < 2) return null;
  const previous = boat.snapshots[boat.snapshots.length - 2];
  const current = boat.snapshots[boat.snapshots.length - 1];
  return {
    nameChanged: previous.name !== current.name,
    portChanged: shortPort(previous.areaPath) !== shortPort(current.areaPath),
    priceChanged: (previous.priceLine ?? "") !== (current.priceLine ?? ""),
    previous,
    current,
  };
}

// Two consecutive empty-parse visits before calling a listing "gone" — one
// miss could just be thefishing.kr's own page glitching, not the boat
// actually being deregistered.
const GONE_STREAK_THRESHOLD = 2;

/**
 * A detail-page visit reports whether thefishing.kr's page parsed to a
 * boat identity or came back empty (fetch succeeded, nothing recognizable
 * in it — distinct from a network failure, which the caller already
 * handles separately and never reaches this function for).
 */
export function markGoneStreak(uid: string, isGone: boolean): MyBoat {
  const boat = getMyBoat(uid) ?? emptyBoat(uid);
  return updateMyBoat(uid, { goneStreak: isGone ? boat.goneStreak + 1 : 0 });
}

export function isGone(boat: MyBoat): boolean {
  return boat.goneStreak >= GONE_STREAK_THRESHOLD;
}

/** 즐겨찾기를 뒤집고 새 상태를 돌려준다. 켤 때는 표시용 스냅샷도 함께 남긴다. */
export function toggleFavorite(
  uid: string,
  snap?: Omit<BoatSnapshot, "seenAt">,
): boolean {
  const current = getMyBoat(uid);
  const nextFavorite = !current?.favorite;
  if (nextFavorite && snap) recordSnapshot(uid, snap);
  return updateMyBoat(uid, { favorite: nextFavorite }).favorite;
}

export function isFavorite(uid: string): boolean {
  return getMyBoat(uid)?.favorite ?? false;
}

/** 탄 날짜를 이력에 추가한다. 판정·메모는 그대로 두고 이력만 늘린다. */
export function addRide(uid: string, ride: BoatRide): MyBoat {
  const boat = getMyBoat(uid) ?? emptyBoat(uid);
  return updateMyBoat(uid, { rides: [...boat.rides, ride] });
}

/**
 * "다시 안 탐" 배는 목록 밖으로 완전히 숨기지 않는다 — 목적이 실수로
 * 재예약하는 걸 막는 것이므로, 보이되 맨 아래로 밀어낸다. Array.sort는
 * 안정 정렬이 보장되므로(V8/Node/모든 현대 엔진), 'never' 여부로만 나누면
 * 나머지는 원래 순서를 그대로 유지한다.
 */
export function sortByVerdict<T extends { uid: string }>(
  items: T[],
  myBoats: MyBoatMap,
): T[] {
  return [...items].sort((a, b) => {
    const aNever = myBoats[a.uid]?.verdict === "never" ? 1 : 0;
    const bNever = myBoats[b.uid]?.verdict === "never" ? 1 : 0;
    return aNever - bNever;
  });
}

export type FavoriteBoat = MyBoat & { latest: BoatSnapshot | null };

/**
 * 즐겨찾기한 배 — 최근에 본 순, 카드 렌더에 쓸 최신 스냅샷 포함. 순수
 * 함수라 이미 React state로 들고 있는 맵에도 그대로 쓸 수 있다 — 화면에서
 * 이걸 다시 localStorage 를 읽어 만들면, 즐겨찾기 토글 경로 밖에서 스토리지가
 * 바뀌었을 때(GOAL-2/3에서 판정·스냅샷 쓰기가 늘어난다) 그 변경이 React
 * state 커밋을 안 거치고 조용히 화면에 반영 안 되는 경로가 생긴다.
 */
export function favoritesFromMap(map: MyBoatMap): FavoriteBoat[] {
  return Object.values(map)
    .filter((b) => b.favorite)
    .map((b) => ({ ...b, latest: b.snapshots[b.snapshots.length - 1] ?? null }))
    .sort((a, b) => (b.latest?.seenAt ?? "").localeCompare(a.latest?.seenAt ?? ""));
}

/** localStorage 를 직접 읽는 버전 — 컴포넌트 밖에서 1회성으로 쓸 때만. */
export function listFavorites(): FavoriteBoat[] {
  return favoritesFromMap(loadMyBoats());
}
