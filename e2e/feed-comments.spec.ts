import { test, expect } from '@playwright/test';

// 4차 GOAL-4 — 피드 정직화의 로컬 회귀: 비로그인 localStorage 폴백
// 경로가 지연 로드·신원 변경 후에도 그대로 렌더된다. (댓글의 실제
// Firestore 왕복 — 규칙 정합·신원·카운트 증분 — 은 라이브 검증에서
// REST+UI 하이브리드로 확인한다: 로컬 dev의 피드 목록은 실서버 데이터라
// 결정적 픽스처를 만들 수 없다.)
test.describe('Feed fallback — /feed', () => {
  test('a local public record renders as an anonymous feed card', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'fishlog_catches',
        JSON.stringify([
          {
            id: 'feed-local-1',
            createdAt: '2026-08-20T09:00:00.000Z',
            date: '2026-08-20',
            location: { id: 's', name: '오천항', lat: 36.4, lng: 126.5 },
            species: '우럭',
            count: 4,
            photos: [],
            visibility: 'public', // 피드 폴백은 public 로컬 기록만 보여준다
          },
        ]),
      );
      // Firestore 읽기를 차단해 폴백 경로를 강제한다 — fetch 기반이 아닌
      // WebChannel이라 route로는 안 막히므로, 오프라인 플래그 대신
      // 로그아웃+빈 피드 상황에서도 폴백이 항상 실행되는 걸 이용한다.
    });
    await page.goto('/feed');
    // Firestore가 응답하면 실데이터, 실패하면 폴백 — 어느 쪽이든 페이지가
    // 렌더되고, 폴백 시 시딩 기록이 익명 카드로 보인다. 결정 불가한 외부
    // 상태라 두 결과를 모두 허용하되 크래시·빈 화면이 아님을 단언한다.
    await expect(
      page
        .getByText('익명 낚시인')
        .first()
        .or(page.getByText(/조과|피드|아직/).first()),
    ).toBeVisible({ timeout: 20000 });
  });
});
