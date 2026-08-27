// 2차 GOAL-3 — 동출 모집의 순수 로직(정렬·필터·소유권). Firestore 접근은
// companionService.ts, 여기는 시간 주입 가능한 계산만 둔다.
import { localISODate } from "./localDate";

export interface CompanionPost {
  id: string;
  boatUid?: string;
  boatName: string;
  port?: string;
  date: string; // YYYY-MM-DD 출조 예정일
  seatsWanted: number;
  note: string;
  contact: string;
  authorUid: string;
  authorName: string;
  status: "open" | "closed";
  createdAt: string; // ISO
}

/**
 * 목록 표시용 필터·정렬 — 기본은 open + 오늘 이후만, 예정일 가까운 순
 * (같은 날은 먼저 올린 글부터). boatUid를 주면 그 배 글만.
 */
export function visibleCompanionPosts(
  posts: CompanionPost[],
  now: Date,
  opts: { boatUid?: string; includeClosed?: boolean } = {},
): CompanionPost[] {
  const today = localISODate(now);
  return posts
    .filter((p) => {
      if (!opts.includeClosed && p.status !== "open") return false;
      if (p.date < today) return false; // 지난 날짜 자동 제외
      if (opts.boatUid && p.boatUid !== opts.boatUid) return false;
      return true;
    })
    .sort((a, b) =>
      a.date === b.date
        ? a.createdAt.localeCompare(b.createdAt)
        : a.date.localeCompare(b.date),
    );
}

/** 이 uid가 글의 작성자인가 — 마감/삭제 버튼 노출 판정. */
export function isPostOwner(
  post: CompanionPost,
  uid: string | null | undefined,
): boolean {
  return !!uid && post.authorUid === uid;
}
