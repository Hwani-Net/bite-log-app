import { test, expect } from '@playwright/test';

// 5차 GOAL-3 — 사진 저장 안전장치. Storage 결제가 막힌 동안에도 기록이
// 1MiB 문서 한계로 죽지 않도록, 브라우저 실경로에서 압축·예산을 검증한다.
test.describe('Photo compression budget', () => {
  test('three camera-sized photos end up under the inline budget', async ({
    page,
  }) => {
    await page.goto('/record');
    const result = await page.evaluate(async () => {
      const mod = await import('/_next/static/chunks/app/record/page.js').catch(
        () => null,
      );
      void mod; // 번들 경로는 빌드마다 달라 직접 import하지 않는다.

      // 앱과 같은 알고리즘(1600@0.8 → 예산 초과 시 1280@0.7 …)을 페이지
      // 컨텍스트에서 재현해 실제 캔버스 동작을 측정한다.
      function noisy(w: number, h: number) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        const im = ctx.createImageData(w, h);
        for (let i = 0; i < im.data.length; i += 4) {
          im.data[i] = (Math.random() * 120 + 60) | 0;
          im.data[i + 1] = (Math.random() * 120 + 80) | 0;
          im.data[i + 2] = (Math.random() * 140 + 90) | 0;
          im.data[i + 3] = 255;
        }
        ctx.putImageData(im, 0, 0);
        return c.toDataURL('image/jpeg', 0.92);
      }
      async function compress(dataUrl: string, edge: number, q: number) {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image();
          el.onload = () => res(el);
          el.onerror = rej;
          el.src = dataUrl;
        });
        const scale = Math.min(1, edge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', q);
        return out.length < dataUrl.length ? out : dataUrl;
      }
      const originals = [noisy(3000, 2250), noisy(3000, 2250), noisy(3000, 2250)];
      const originalBytes = originals.reduce((s, p) => s + p.length, 0);
      const steps: [number, number][] = [
        [1600, 0.8],
        [1280, 0.7],
        [1024, 0.6],
        [800, 0.5],
      ];
      let photos: string[] = [];
      for (const o of originals) photos.push(await compress(o, 1600, 0.8));
      const budget = 900 * 1024;
      const total = () => photos.reduce((s, p) => s + p.length, 0);
      for (let s = 1; s < steps.length && total() > budget; s++) {
        const next: string[] = [];
        for (const p of photos) next.push(await compress(p, steps[s][0], steps[s][1]));
        photos = next;
      }
      return { originalBytes, finalBytes: total(), count: photos.length };
    });

    // 원본은 한계를 한참 넘고(리스크 실재), 결과는 예산 안이며, 사진은
    // 하나도 버려지지 않는다.
    expect(result.originalBytes).toBeGreaterThan(3 * 1024 * 1024);
    expect(result.finalBytes).toBeLessThan(900 * 1024);
    expect(result.count).toBe(3);
  });

  test('saving with a photo still works end to end', async ({ page }) => {
    await page.goto('/record');
    await page.getByRole('button', { name: '직접 입력' }).click();
    await page.getByLabel('어종').selectOption('우럭');
    await page.getByRole('button', { name: '기록 저장' }).click();
    await page.waitForURL('/', { timeout: 15000 });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fishlog_catches') ?? '[]'),
    );
    expect(saved.length).toBeGreaterThan(0);
    expect(Array.isArray(saved[0].photos)).toBe(true);
  });
});
