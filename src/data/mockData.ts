import { CatchRecord } from '@/types';

export const MOCK_CATCHES: Omit<CatchRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    date: '2026-02-28', location: { name: '거제도 장목포', region: '경남' },
    species: '감성돔', count: 3, sizeCm: 42, photos: [], visibility: 'public',
    memo: '조류가 좋아서 입질이 활발했다.',
  },
  {
    date: '2026-02-25', location: { name: '통영 소매물도', region: '경남' },
    species: '참돔', count: 2, sizeCm: 38, photos: [], visibility: 'public',
    memo: '포인트 변경 후 연속 히트!',
  },
  {
    date: '2026-02-20', location: { name: '여수 금오도', region: '전남' },
    species: '농어', count: 1, sizeCm: 58, photos: [], visibility: 'public',
    memo: '올해 최대 사이즈 갱신!',
  },
  {
    date: '2026-02-15', location: { name: '제주 한림항', region: '제주' },
    species: '볼락', count: 8, sizeCm: 22, photos: [], visibility: 'public',
    memo: '볼락 폭발! 워밍이 채비 효과 좋았음.',
  },
  {
    date: '2026-02-10', location: { name: '부산 기장', region: '부산' },
    species: '광어', count: 2, sizeCm: 45, photos: [], visibility: 'public',
    memo: '라이트 지깅 채비',
  },
  {
    date: '2026-01-28', location: { name: '거제도 장목포', region: '경남' },
    species: '우럭', count: 5, sizeCm: 30, photos: [], visibility: 'public',
  },
  {
    date: '2026-01-20', location: { name: '통영 소매물도', region: '경남' },
    species: '감성돔', count: 4, sizeCm: 35, photos: [], visibility: 'public',
    memo: '이른 아침 시간대가 최고',
  },
  {
    date: '2026-01-12', location: { name: '여수 금오도', region: '전남' },
    species: '참돔', count: 3, sizeCm: 40, photos: [], visibility: 'public',
  },
  {
    date: '2025-12-28', location: { name: '제주 한림항', region: '제주' },
    species: '방어', count: 1, sizeCm: 55, photos: [], visibility: 'public',
    memo: '겨울 방어 시즌! 강력한 파이팅',
  },
  {
    date: '2025-12-15', location: { name: '부산 기장', region: '부산' },
    species: '고등어', count: 12, sizeCm: 28, photos: [], visibility: 'public',
    memo: '고등어 떼가 들어옴',
  },
];

export function seedMockData(): void {
  if (typeof window === 'undefined') return;
  const key = 'fishlog_catches';
  const existing = localStorage.getItem(key);
  if (existing) return; // don't overwrite existing data

  const now = new Date().toISOString();
  const records: CatchRecord[] = MOCK_CATCHES.map((c, i) => ({
    ...c,
    id: `mock-${Date.now()}-${i}`,
    createdAt: now,
    updatedAt: now,
  }));
  localStorage.setItem(key, JSON.stringify(records));
}
