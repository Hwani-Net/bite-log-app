import { test, expect } from '@playwright/test';
import fs from 'fs';

// 4차 GOAL-4 — 피드 댓글 실왕복. 동출 모집 e2e의 전례대로 실제
// Firestore(+익명 인증)를 관통한다: REST로 내 소유의 피드 글을 만들고,
// UI에서 댓글을 달아 신원(익명 낚시인)·규칙 정합(content 스키마)·카운트
// 증분(writeBatch)을 검증한 뒤, 소유자 토큰으로 글을 지워 잔여물을
// 남기지 않는다. 시딩이 실패하면(키 부재 등) 명시적으로 skip.
test.describe('Feed comments round trip — /feed', () => {
  test('a UI comment lands with a real identity and bumps the count', async ({
    page,
  }) => {
    const envText = fs.existsSync('.env.local')
      ? fs.readFileSync('.env.local', 'utf-8')
      : '';
    const key = envText.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/)?.[1]?.trim();
    test.skip(!key, 'no Firebase key in .env.local');

    const marker = `e2e피드-${Date.now().toString(36)}`;
    const auth = await (
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true }),
        },
      )
    ).json();
    const { idToken, localId } = auth as { idToken: string; localId: string };
    const created = (await (
      await fetch(
        `https://firestore.googleapis.com/v1/projects/bite-log-app/databases/(default)/documents/publicFeed?key=${key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fields: {
              userId: { stringValue: localId },
              userDisplayName: { stringValue: marker },
              species: { stringValue: '우럭' },
              date: { stringValue: '2026-08-28' },
              count: { integerValue: '3' },
              likeCount: { integerValue: '0' },
              commentCount: { integerValue: '0' },
              createdAt: { stringValue: new Date().toISOString() },
              photos: { arrayValue: {} },
              location: {
                mapValue: { fields: { name: { stringValue: '오천항' } } },
              },
            },
          }),
        },
      )
    ).json()) as { name?: string };
    test.skip(!created.name, 'feed seed rejected');
    const docPath = created.name!;

    try {
      await page.goto('/feed');
      const card = page.locator('article').filter({ hasText: marker });
      await expect(card).toBeVisible({ timeout: 20000 });

      await card.getByRole('button', { name: /댓글/ }).click();
      await card.getByPlaceholder(/댓글을 입력/).fill('e2e 왕복 댓글');
      await card.getByPlaceholder(/댓글을 입력/).press('Enter');

      // 낙관 렌더 + 실저장: 화면에 뜨고, 작성자는 하드코딩 "나"가 아니라
      // 익명 낚시인이다.
      await expect(card.getByText('e2e 왕복 댓글')).toBeVisible({
        timeout: 15000,
      });
      await expect(card.getByText('익명 낚시인')).toBeVisible();

      // 서버 카운트가 배치로 함께 올랐다.
      await expect
        .poll(async () => {
          const after = (await (
            await fetch(`https://firestore.googleapis.com/v1/${docPath}?key=${key}`, {
              headers: { Authorization: `Bearer ${idToken}` },
            })
          ).json()) as {
            fields?: { commentCount?: { integerValue?: string } };
          };
          return after.fields?.commentCount?.integerValue;
        }, { timeout: 15000 })
        .toBe('1');
    } finally {
      await fetch(`https://firestore.googleapis.com/v1/${docPath}?key=${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
    }
  });
});
