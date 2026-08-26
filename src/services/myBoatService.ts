// "내 선사 카드" — 예약 플랫폼이 만들어 줄 수 없는, 사용자 편에 선 기록.
// 즐겨찾기·승선 판정·메모·승선 이력·조회 시점 스냅샷을 배 하나(uid)에 모아
// 둔다. 저장소를 하나로 둔 이유: 즐겨찾기와 판정과 이력이 각각 따로 살면
// "이 배 예전에 탔던 그 배인가?"를 답할 수 없기 때문이다.
//
// 키는 더피싱 uid. 선사가 배 이름이나 모항을 바꿔도 uid는 유지되므로,
// 이름이 바뀐 배에도 과거의 판정이 그대로 따라붙는다(스냅샷 비교는 GOAL-3).

const STORE_KEY = "biteLog_myBoats";

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
}

export type MyBoatMap = Record<string, MyBoat>;

function emptyBoat(uid: string): MyBoat {
  return { uid, favorite: false, verdict: null, memo: "", rides: [], snapshots: [] };
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
