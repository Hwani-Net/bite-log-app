import { UserProfile, Badge } from '@/types';
import { RankingCategory, RankingData, RankingEntry, RankingService } from '@/types/ranking';

const AVATARS = ['🎣', '🐟', '🦈', '🐠', '🐡', '🦀', '🐙', '🦑', '🐚', '🪸', '🌊', '⚓'];

function makeBadge(type: string, name: string): Badge {
  return { id: `badge-${type}`, type: type as Badge['type'], name, description: '', earnedAt: new Date().toISOString() };
}

const MOCK_USERS: UserProfile[] = [
  { id: 'u1', uid: 'u1', displayName: '바다의전설', photoURL: undefined, level: 42, totalCatch: 58, badges: [makeBadge('master', '마스터 낚시꾼')], createdAt: '', updatedAt: '' },
  { id: 'u2', uid: 'u2', displayName: '도시어부K', photoURL: undefined, level: 38, totalCatch: 42, badges: [makeBadge('expert', '전문가')], createdAt: '', updatedAt: '' },
  { id: 'u3', uid: 'u3', displayName: '강태공언니', photoURL: undefined, level: 35, totalCatch: 39, badges: [makeBadge('expert', '전문가')], createdAt: '', updatedAt: '' },
  { id: 'u4', uid: 'u4', displayName: '울진의아들', photoURL: undefined, level: 30, totalCatch: 35, badges: [makeBadge('intermediate', '중수')], createdAt: '', updatedAt: '' },
  { id: 'u5', uid: 'u5', displayName: '낚시광마크', photoURL: undefined, level: 28, totalCatch: 31, badges: [makeBadge('intermediate', '중수')], createdAt: '', updatedAt: '' },
  { id: 'u6', uid: 'u6', displayName: '보리보리쌀', photoURL: undefined, level: 25, totalCatch: 28, badges: [makeBadge('intermediate', '중수')], createdAt: '', updatedAt: '' },
  { id: 'u7', uid: 'u7', displayName: '캐스팅마스터', photoURL: undefined, level: 20, totalCatch: 26, badges: [makeBadge('beginner', '초보')], createdAt: '', updatedAt: '' },
  { id: 'u8', uid: 'u8', displayName: '포항물개', photoURL: undefined, level: 18, totalCatch: 23, badges: [makeBadge('beginner', '초보')], createdAt: '', updatedAt: '' },
  { id: 'u9', uid: 'u9', displayName: '목포바지락', photoURL: undefined, level: 15, totalCatch: 18, badges: [makeBadge('beginner', '초보')], createdAt: '', updatedAt: '' },
  { id: 'me', uid: 'me', displayName: '어복충만한나', photoURL: undefined, level: 22, totalCatch: 14, badges: [makeBadge('intermediate', '중수')], createdAt: '', updatedAt: '' },
];

const SIZE_DATA: Record<string, number> = {
  u1: 72, u2: 68, u3: 65, u4: 61, u5: 58, u6: 55, me: 58, u7: 52, u8: 48, u9: 42,
};

const VARIETY_DATA: Record<string, number> = {
  u1: 18, u2: 15, u3: 14, u4: 12, u5: 11, u6: 10, me: 8, u7: 7, u8: 6, u9: 5,
};

function getAvatar(index: number): string {
  return AVATARS[index % AVATARS.length];
}

function buildEntries(category: RankingCategory): RankingEntry[] {
  const users = [...MOCK_USERS];

  let getValue: (u: UserProfile) => number;
  let getLabel: (v: number) => string;

  switch (category) {
    case 'catch':
      getValue = (u) => u.totalCatch;
      getLabel = (v) => `${v}마리`;
      break;
    case 'size':
      getValue = (u) => SIZE_DATA[u.uid] ?? 0;
      getLabel = (v) => `${v}cm`;
      break;
    case 'variety':
      getValue = (u) => VARIETY_DATA[u.uid] ?? 0;
      getLabel = (v) => `${v}종`;
      break;
  }

  return users
    .map((u, i) => ({
      rank: 0,
      user: { ...u, photoURL: getAvatar(i) },
      value: getValue(u),
      label: getLabel(getValue(u)),
    }))
    .sort((a, b) => b.value - a.value)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function getCurrentSeasonLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 시즌`;
}

function getSeasonEndDate(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return end.toISOString();
}

export const mockRankingService: RankingService = {
  async getRanking(category: RankingCategory): Promise<RankingData> {
    const entries = buildEntries(category);
    const myEntry = entries.find((e) => e.user.uid === 'me') ?? null;
    const topThree = entries.slice(0, 3);
    const rest = entries.slice(3, 10);

    return {
      category,
      seasonLabel: getCurrentSeasonLabel(),
      seasonEndDate: getSeasonEndDate(),
      myRank: myEntry,
      topThree,
      rest,
    };
  },
};
