import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadMyBoats,
  saveMyBoats,
  getMyBoat,
  updateMyBoat,
  recordSnapshot,
  toggleFavorite,
  isFavorite,
  listFavorites,
  favoritesFromMap,
  addRide,
  sortByVerdict,
  shortPort,
  diffLatestSnapshots,
  markGoneStreak,
  isGone,
  knownBoatsFromMap,
  listKnownBoats,
  type MyBoatMap,
} from '@/services/myBoatService';

// vitest runs in the node environment (vitest.config.ts), so localStorage
// has to be stubbed. The service reads it directly and guards for its
// absence, which is also what makes it safe during SSR.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
});

const snap = { name: '스텔라호', areaPath: '서해권 > 충청남도 > 보령시 > 대천항' };

describe('load/save', () => {
  it('starts empty and round-trips a saved map', () => {
    expect(loadMyBoats()).toEqual({});
    const boat = updateMyBoat('4247', { memo: '선장님 친절' });
    expect(loadMyBoats()['4247']).toEqual(boat);
    expect(boat.uid).toBe('4247');
  });

  it('returns an empty map instead of throwing on corrupted storage', () => {
    store.set('biteLog_myBoats', '{not json');
    expect(loadMyBoats()).toEqual({});
  });

  it('rejects a stored value that is not an object map', () => {
    store.set('biteLog_myBoats', '["nope"]');
    expect(loadMyBoats()).toEqual({});
  });

  it('survives having no localStorage at all (SSR)', () => {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    expect(loadMyBoats()).toEqual({});
    expect(getMyBoat('4247')).toBeNull();
    expect(() => saveMyBoats({})).not.toThrow();
  });

  it('normalizes a malformed individual entry instead of crashing a reader', () => {
    // localStorage is a trust boundary, not just our own writes — a
    // half-written entry (crashed tab, manual devtools edit, stale schema)
    // must not take down listFavorites/render with it.
    store.set(
      'biteLog_myBoats',
      JSON.stringify({
        '1': { favorite: true }, // missing snapshots/rides/verdict/memo entirely
        '2': null,
        '3': { favorite: 'yes', verdict: 'not-a-real-verdict', snapshots: 'nope' },
      }),
    );
    const map = loadMyBoats();
    expect(map['1']).toEqual({
      uid: '1',
      favorite: true,
      verdict: null,
      memo: '',
      rides: [],
      snapshots: [],
      goneStreak: 0,
    });
    expect(map['2'].favorite).toBe(false);
    expect(map['3'].favorite).toBe(false); // non-boolean input falls back, doesn't coerce
    expect(map['3'].verdict).toBeNull();
    expect(map['3'].snapshots).toEqual([]);
    // The actual failure mode this guards against: reading the latest
    // snapshot off an entry that had none must not throw.
    expect(() => favoritesFromMap(map)).not.toThrow();
  });

  it('does not throw when the storage write itself fails (quota exceeded)', () => {
    (globalThis as unknown as { localStorage: { setItem: () => void } }).localStorage.setItem =
      () => {
        throw new DOMException('quota exceeded');
      };
    expect(() => updateMyBoat('4247', { favorite: true })).not.toThrow();
  });
});

describe('updateMyBoat', () => {
  it('creates a boat with sane defaults on first write', () => {
    const boat = updateMyBoat('4247', { verdict: 'never' });
    expect(boat).toEqual({
      uid: '4247',
      favorite: false,
      verdict: 'never',
      memo: '',
      rides: [],
      snapshots: [],
      goneStreak: 0,
    });
  });

  it('merges into an existing boat without dropping other fields', () => {
    updateMyBoat('4247', { verdict: 'again', memo: '자리 넓음' });
    const boat = updateMyBoat('4247', { favorite: true });
    expect(boat.verdict).toBe('again');
    expect(boat.memo).toBe('자리 넓음');
    expect(boat.favorite).toBe(true);
  });

  it('keeps boats separate by uid', () => {
    updateMyBoat('1', { verdict: 'again' });
    updateMyBoat('2', { verdict: 'never' });
    expect(getMyBoat('1')?.verdict).toBe('again');
    expect(getMyBoat('2')?.verdict).toBe('never');
  });
});

describe('recordSnapshot', () => {
  it('appends the first snapshot with a timestamp', () => {
    const boat = recordSnapshot('4247', snap, '2026-08-01T00:00:00.000Z');
    expect(boat.snapshots).toHaveLength(1);
    expect(boat.snapshots[0].name).toBe('스텔라호');
    expect(boat.snapshots[0].seenAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('does not stack duplicates when nothing changed', () => {
    recordSnapshot('4247', snap, '2026-08-01T00:00:00.000Z');
    recordSnapshot('4247', snap, '2026-08-02T00:00:00.000Z');
    recordSnapshot('4247', snap, '2026-08-03T00:00:00.000Z');
    expect(getMyBoat('4247')?.snapshots).toHaveLength(1);
  });

  it('appends when the boat is renamed — the case that makes this worth storing', () => {
    recordSnapshot('4247', snap, '2026-08-01T00:00:00.000Z');
    recordSnapshot(
      '4247',
      { name: '스텔스호', areaPath: '서해권 > 충청남도 > 보령시 > 오천항' },
      '2026-08-20T00:00:00.000Z',
    );
    const snaps = getMyBoat('4247')!.snapshots;
    expect(snaps).toHaveLength(2);
    expect(snaps[0].name).toBe('스텔라호');
    expect(snaps[1].name).toBe('스텔스호');
  });

  it('appends when only the price changed', () => {
    recordSnapshot('4247', { ...snap, priceLine: '10만원' }, '2026-08-01T00:00:00.000Z');
    recordSnapshot('4247', { ...snap, priceLine: '12만원' }, '2026-08-20T00:00:00.000Z');
    expect(getMyBoat('4247')?.snapshots).toHaveLength(2);
  });
});

describe('favorites', () => {
  it('toggles on and off', () => {
    expect(isFavorite('4247')).toBe(false);
    expect(toggleFavorite('4247', snap)).toBe(true);
    expect(isFavorite('4247')).toBe(true);
    expect(toggleFavorite('4247')).toBe(false);
    expect(isFavorite('4247')).toBe(false);
  });

  it('keeps the verdict and memo when un-favoriting', () => {
    updateMyBoat('4247', { verdict: 'never', memo: '화장실 없음' });
    toggleFavorite('4247', snap);
    toggleFavorite('4247');
    const boat = getMyBoat('4247')!;
    expect(boat.favorite).toBe(false);
    expect(boat.verdict).toBe('never');
    expect(boat.memo).toBe('화장실 없음');
  });

  it('lists only favorites, newest-seen first, with a snapshot to render', () => {
    toggleFavorite('1', { name: '가호', areaPath: '서해권 > A' });
    toggleFavorite('2', { name: '나호', areaPath: '남해권 > B' });
    updateMyBoat('3', { verdict: 'again' }); // not a favorite
    // Force a deterministic order rather than relying on write timing.
    const map = loadMyBoats();
    map['1'].snapshots[0].seenAt = '2026-08-01T00:00:00.000Z';
    map['2'].snapshots[0].seenAt = '2026-08-20T00:00:00.000Z';
    saveMyBoats(map);

    const favs = listFavorites();
    expect(favs.map((f) => f.uid)).toEqual(['2', '1']);
    expect(favs[0].latest?.name).toBe('나호');
  });

  it('still lists a favorite that has no snapshot', () => {
    toggleFavorite('9');
    const favs = listFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0].latest).toBeNull();
  });

  it('favoritesFromMap is pure — works on an in-memory map without touching storage', () => {
    // This is what the booking page actually calls, on its own React state,
    // so it can't have a hidden dependency on localStorage being in sync.
    const map = {
      '1': { uid: '1', favorite: true, verdict: null, memo: '', rides: [], snapshots: [], goneStreak: 0 },
    };
    store.clear(); // storage is empty/stale; the map itself is the source of truth
    expect(favoritesFromMap(map)).toEqual([{ ...map['1'], latest: null }]);
  });
});

describe('addRide', () => {
  it('appends a ride without touching verdict or memo', () => {
    updateMyBoat('4247', { verdict: 'again', memo: '선장님 친절' });
    const boat = addRide('4247', { date: '2026-08-20', memo: '조황 좋음' });
    expect(boat.rides).toEqual([{ date: '2026-08-20', memo: '조황 좋음' }]);
    expect(boat.verdict).toBe('again');
    expect(boat.memo).toBe('선장님 친절');
  });

  it('accumulates multiple rides in order', () => {
    addRide('4247', { date: '2026-07-01' });
    addRide('4247', { date: '2026-08-20' });
    expect(getMyBoat('4247')?.rides.map((r) => r.date)).toEqual([
      '2026-07-01',
      '2026-08-20',
    ]);
  });
});

describe('sortByVerdict', () => {
  const boat = (uid: string) => ({ uid, name: `배${uid}` });

  it('pushes "never" boats to the bottom and leaves everyone else in place', () => {
    const boats = [boat('1'), boat('2'), boat('3'), boat('4')];
    const myBoats: MyBoatMap = {
      '2': { uid: '2', favorite: false, verdict: 'never', memo: '', rides: [], snapshots: [], goneStreak: 0 },
    };
    expect(sortByVerdict(boats, myBoats).map((b) => b.uid)).toEqual([
      '1',
      '3',
      '4',
      '2',
    ]);
  });

  it('is a no-op when nothing is verdict "never"', () => {
    const boats = [boat('1'), boat('2'), boat('3')];
    const myBoats: MyBoatMap = {
      '1': { uid: '1', favorite: false, verdict: 'again', memo: '', rides: [], snapshots: [], goneStreak: 0 },
    };
    expect(sortByVerdict(boats, myBoats).map((b) => b.uid)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('handles multiple "never" boats, keeping their relative order at the bottom', () => {
    const boats = [boat('1'), boat('2'), boat('3'), boat('4')];
    const myBoats: MyBoatMap = {
      '1': { uid: '1', favorite: false, verdict: 'never', memo: '', rides: [], snapshots: [], goneStreak: 0 },
      '3': { uid: '3', favorite: false, verdict: 'never', memo: '', rides: [], snapshots: [], goneStreak: 0 },
    };
    expect(sortByVerdict(boats, myBoats).map((b) => b.uid)).toEqual([
      '2',
      '4',
      '1',
      '3',
    ]);
  });

  it('does not mutate the input array', () => {
    const boats = [boat('1'), boat('2')];
    const myBoats: MyBoatMap = {
      '1': { uid: '1', favorite: false, verdict: 'never', memo: '', rides: [], snapshots: [], goneStreak: 0 },
    };
    sortByVerdict(boats, myBoats);
    expect(boats.map((b) => b.uid)).toEqual(['1', '2']);
  });
});

describe('shortPort', () => {
  it('takes the last segment of an areaPath', () => {
    expect(shortPort('서해권 > 충청남도 > 보령시 > 대천항')).toBe('대천항');
  });

  it('falls back to the whole string when there is no ">"', () => {
    expect(shortPort('대천항')).toBe('대천항');
  });
});

describe('diffLatestSnapshots', () => {
  const base = { name: '스텔라호', areaPath: '서해권 > 충청남도 > 보령시 > 대천항' };

  it('returns null with fewer than two snapshots', () => {
    expect(diffLatestSnapshots(updateMyBoat('1', {}))).toBeNull();
    recordSnapshot('1', base);
    expect(diffLatestSnapshots(getMyBoat('1')!)).toBeNull();
  });

  it('flags a name change', () => {
    recordSnapshot('1', base, '2026-08-01T00:00:00.000Z');
    recordSnapshot('1', { ...base, name: '스텔스호' }, '2026-08-20T00:00:00.000Z');
    const diff = diffLatestSnapshots(getMyBoat('1')!)!;
    expect(diff.nameChanged).toBe(true);
    expect(diff.portChanged).toBe(false);
    expect(diff.priceChanged).toBe(false);
    expect(diff.previous.name).toBe('스텔라호');
    expect(diff.current.name).toBe('스텔스호');
  });

  it('flags a port change even when the name stays the same', () => {
    recordSnapshot('1', base, '2026-08-01T00:00:00.000Z');
    recordSnapshot(
      '1',
      { ...base, areaPath: '서해권 > 충청남도 > 보령시 > 오천항' },
      '2026-08-20T00:00:00.000Z',
    );
    const diff = diffLatestSnapshots(getMyBoat('1')!)!;
    expect(diff.nameChanged).toBe(false);
    expect(diff.portChanged).toBe(true);
  });

  it('flags a price change', () => {
    recordSnapshot('1', { ...base, priceLine: '10만원' }, '2026-08-01T00:00:00.000Z');
    recordSnapshot('1', { ...base, priceLine: '12만원' }, '2026-08-20T00:00:00.000Z');
    const diff = diffLatestSnapshots(getMyBoat('1')!)!;
    expect(diff.priceChanged).toBe(true);
    expect(diff.previous.priceLine).toBe('10만원');
    expect(diff.current.priceLine).toBe('12만원');
  });
});

describe('gone-boat detection', () => {
  it('is not gone after a single empty-parse visit', () => {
    const boat = markGoneStreak('1', true);
    expect(isGone(boat)).toBe(false);
  });

  it('is gone after two consecutive empty-parse visits', () => {
    markGoneStreak('1', true);
    const boat = markGoneStreak('1', true);
    expect(isGone(boat)).toBe(true);
  });

  it('resets the streak the moment a real visit succeeds', () => {
    markGoneStreak('1', true);
    markGoneStreak('1', true);
    const boat = markGoneStreak('1', false);
    expect(isGone(boat)).toBe(false);
    expect(boat.goneStreak).toBe(0);
  });
});

describe('knownBoatsFromMap / listKnownBoats', () => {
  it('includes a favorited boat even with no verdict or rides', () => {
    toggleFavorite('1', snap);
    expect(listKnownBoats().map((b) => b.uid)).toEqual(['1']);
  });

  it('includes a boat with a verdict but never favorited', () => {
    updateMyBoat('1', { verdict: 'again' });
    expect(listKnownBoats().map((b) => b.uid)).toEqual(['1']);
  });

  it('includes a boat with ride history but no verdict or favorite', () => {
    addRide('1', { date: '2026-08-01' });
    expect(listKnownBoats().map((b) => b.uid)).toEqual(['1']);
  });

  it('excludes a boat with none of the three signals', () => {
    updateMyBoat('1', { memo: '메모만 있음' });
    expect(listKnownBoats()).toEqual([]);
  });

  it('sorts by most-recently-seen snapshot, like favoritesFromMap', () => {
    const map: MyBoatMap = {
      '1': {
        uid: '1',
        favorite: false,
        verdict: 'again',
        memo: '',
        rides: [],
        goneStreak: 0,
        snapshots: [{ name: '가호', areaPath: 'A', seenAt: '2026-08-01T00:00:00.000Z' }],
      },
      '2': {
        uid: '2',
        favorite: false,
        verdict: null,
        memo: '',
        rides: [{ date: '2026-08-10' }],
        goneStreak: 0,
        snapshots: [{ name: '나호', areaPath: 'B', seenAt: '2026-08-20T00:00:00.000Z' }],
      },
    };
    expect(knownBoatsFromMap(map).map((b) => b.uid)).toEqual(['2', '1']);
  });
});
