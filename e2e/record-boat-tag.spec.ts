import { test, expect } from '@playwright/test';
import { STORE_KEY } from '@/services/myBoatService';

// Verifies the full loop: tag a new catch record with a boat on /record,
// then see it summarized on that boat's own detail page. Runs logged out,
// so getDataService() resolves to the localStorage-backed implementation —
// no auth setup needed, and no live thefishing.kr dependency either (the
// boat is seeded directly, the detail page's own calendar fetch failing
// live doesn't block the catch-summary section, which reads from
// localStorage independently).

const KNOWN_UID = '4247';

test.describe('Catch record boat tagging', () => {
  test.beforeEach(async ({ page }) => {
    // Seeded before any app script runs, so the "탄 배" selector has
    // something to show — it only renders when at least one known boat
    // exists (favorite, verdict, or ride history).
    await page.addInitScript(
      ({ uid, storeKey }) => {
        localStorage.setItem(
          storeKey,
          JSON.stringify({
            [uid]: {
              uid,
              favorite: false,
              verdict: 'again',
              memo: '',
              rides: [],
              goneStreak: 0,
              snapshots: [
                {
                  name: '오이도 몬스터호',
                  areaPath: '서해권 > 경기도 > 시흥시 > 오이도',
                  seenAt: '2026-08-01T00:00:00.000Z',
                },
              ],
            },
          }),
        );
      },
      { uid: KNOWN_UID, storeKey: STORE_KEY },
    );
  });

  test('a boat-tagged record shows up as a catch summary on that boat\'s detail page', async ({
    page,
  }) => {
    await page.goto('/record');

    // Skip the photo step — "직접 입력" jumps straight to the form.
    await page.getByRole('button', { name: '직접 입력' }).click();

    const boatSelect = page.getByLabel('탄 배');
    await expect(boatSelect).toBeVisible({ timeout: 10000 });
    await boatSelect.selectOption({ label: '오이도 몬스터호' });

    const speciesSelect = page.getByLabel('어종');
    await speciesSelect.selectOption('우럭');
    // Count defaults to 1 (no aria-label on the +/- buttons to target) —
    // that's fine, "1건 · 총 1마리" still distinguishes a real summary from
    // an empty/zeroed one.

    const submit = page.getByRole('button', { name: '기록 저장' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto(`/booking/boat/${KNOWN_UID}`);
    const summary = page.getByText('이 배에서 내 조과');
    await expect(summary).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('기록 1건 · 총 1마리')).toBeVisible();
    await expect(page.getByText('우럭 1마리')).toBeVisible();
  });

  test('a record saved with no boat selected leaves other boats\' summaries untouched', async ({
    page,
  }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();

    // Deliberately leave "탄 배" at its default ("선택 안 함") — this is
    // the regression case: untagged records must not silently attach to
    // whatever boat happens to be in storage.
    const speciesSelect = page.getByLabel('어종');
    await speciesSelect.selectOption('광어');

    const submit = page.getByRole('button', { name: '기록 저장' });
    await expect(submit).toBeEnabled();
    await submit.click();
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto(`/booking/boat/${KNOWN_UID}`);
    await expect(page.getByText('이 배에서 내 조과')).toHaveCount(0);
  });
});
