import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.mock calls are hoisted — must be before the service import
vi.mock("@/lib/firebase", () => ({
  isFirebaseReady: vi.fn(() => true),
  getFirebaseDb: vi.fn(() => ({})),
}));

const getDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => getDocs(...args),
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
}));

vi.mock("@/services/badgeService", () => ({
  computeBadges: vi.fn(() => []),
}));

import { getFirebaseRanking } from "@/services/rankingService";

/** publicFeed 문서 하나를 snapshot 모양으로 감싼다. */
function feedDoc(partial: Record<string, unknown> = {}) {
  const today = new Date().toISOString().split("T")[0];
  return {
    data: () => ({
      userId: "u1",
      userDisplayName: "테스터",
      species: "우럭",
      count: 3,
      sizeCm: 30,
      date: today,
      createdAt: new Date().toISOString(),
      ...partial,
    }),
  };
}

beforeEach(() => {
  getDocs.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getFirebaseRanking — 빈 순위의 이유를 구분한다", () => {
  it("응답이 늦으면 timeout 으로 표시한다", async () => {
    vi.useFakeTimers();
    // 영영 끝나지 않는 조회 — 내부 5초 타임아웃이 이기게 둔다
    getDocs.mockReturnValue(new Promise(() => {}));

    const pending = getFirebaseRanking("catch");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;

    expect(result.unavailable).toBe("timeout");
    expect(result.topThree).toEqual([]);
  });

  it("권한 오류는 timeout 과 다른 값으로 표시한다", async () => {
    getDocs.mockRejectedValue(
      Object.assign(new Error("Missing or insufficient permissions."), {
        code: "permission-denied",
      }),
    );

    const result = await getFirebaseRanking("catch");

    expect(result.unavailable).toBe("permission");
    expect(result.unavailable).not.toBe("timeout");
  });

  it("분류되지 않는 실패는 error 로 남긴다", async () => {
    getDocs.mockRejectedValue(new Error("boom"));

    const result = await getFirebaseRanking("catch");

    expect(result.unavailable).toBe("error");
  });

  it("집계 대상이 없을 뿐인 경우는 실패가 아니다 — unavailable 이 비어 있다", async () => {
    // 서버가 확인해 준 빈 결과: fromCache 가 false 다
    getDocs.mockResolvedValue({ docs: [], metadata: { fromCache: false } });

    const result = await getFirebaseRanking("catch");

    expect(result.unavailable).toBeUndefined();
    expect(result.topThree).toEqual([]);
  });

  it("백엔드에 못 닿아 캐시로 응답한 빈 결과는 offline 로 표시한다", async () => {
    // Firestore 는 오프라인에서 예외를 던지지 않고 캐시로 성공 응답한다 —
    // 이것을 "데이터 없음"으로 읽으면 장애가 정상 상태로 위장된다.
    getDocs.mockResolvedValue({ docs: [], metadata: { fromCache: true } });

    const result = await getFirebaseRanking("catch");

    expect(result.unavailable).toBe("offline");
  });

  it("세 상태가 서로 구분된다", async () => {
    getDocs.mockRejectedValue(
      Object.assign(new Error("nope"), { code: "permission-denied" }),
    );
    const denied = await getFirebaseRanking("catch");

    getDocs.mockReset();
    getDocs.mockResolvedValue({ docs: [] });
    const empty = await getFirebaseRanking("catch");

    // 사용자에게 같은 "빈 순위"로 보이던 두 상태가 이제 값으로 갈린다
    expect(denied.unavailable).not.toBe(empty.unavailable);
    expect(denied.topThree).toEqual(empty.topThree);
  });
});

describe("getFirebaseRanking — 정상 경로 회귀", () => {
  it("데이터가 있으면 실패 표시 없이 순위를 만든다", async () => {
    getDocs.mockResolvedValue({ docs: [feedDoc(), feedDoc({ userId: "u2" })] });

    const result = await getFirebaseRanking("catch");

    expect(result.unavailable).toBeUndefined();
    expect(result.isRealData).toBe(true);
    expect(result.topThree.length).toBeGreaterThan(0);
    expect(result.topThree[0].rank).toBe(1);
  });
});
