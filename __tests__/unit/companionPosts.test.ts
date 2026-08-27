import { describe, it, expect } from 'vitest';
import {
  visibleCompanionPosts,
  isPostOwner,
  type CompanionPost,
} from '@/lib/companionPosts';

const NOW = new Date(2026, 9, 15, 10); // 2026-10-15

function post(partial: Partial<CompanionPost>): CompanionPost {
  return {
    id: 'p1',
    boatName: '몬스터호',
    date: '2026-10-20',
    seatsWanted: 2,
    note: '',
    contact: 'open.kakao.com/abc',
    authorUid: 'u1',
    authorName: '익명 낚시인',
    status: 'open',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

describe('visibleCompanionPosts', () => {
  const posts = [
    post({ id: 'a', date: '2026-10-20', createdAt: '2026-10-02T00:00:00Z' }),
    post({ id: 'b', date: '2026-10-16', boatUid: '4247' }),
    post({ id: 'c', date: '2026-10-20', createdAt: '2026-10-01T00:00:00Z' }),
    post({ id: 'd', date: '2026-10-14' }), // 지난 날짜
    post({ id: 'e', date: '2026-10-18', status: 'closed' }),
  ];

  it('keeps only open future posts, nearest date first, older post first on ties', () => {
    expect(visibleCompanionPosts(posts, NOW).map((p) => p.id)).toEqual([
      'b',
      'c', // 10-20 중 먼저 올라온 글
      'a',
    ]);
  });

  it('treats today as still visible — the trip has not happened yet', () => {
    const todayPost = post({ id: 't', date: '2026-10-15' });
    expect(visibleCompanionPosts([todayPost], NOW).map((p) => p.id)).toEqual(['t']);
  });

  it('filters by boatUid and can include closed posts on request', () => {
    expect(
      visibleCompanionPosts(posts, NOW, { boatUid: '4247' }).map((p) => p.id),
    ).toEqual(['b']);
    expect(
      visibleCompanionPosts(posts, NOW, { includeClosed: true }).map((p) => p.id),
    ).toContain('e');
  });
});

describe('isPostOwner', () => {
  it('is true only for the exact author uid', () => {
    expect(isPostOwner(post({}), 'u1')).toBe(true);
    expect(isPostOwner(post({}), 'u2')).toBe(false);
    expect(isPostOwner(post({}), null)).toBe(false);
    expect(isPostOwner(post({}), undefined)).toBe(false);
  });
});
