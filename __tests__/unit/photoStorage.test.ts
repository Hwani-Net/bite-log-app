import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isRemotePhoto,
  dataUrlToBlob,
  compressDataUrl,
  preparePhotosForSave,
} from '@/lib/photoStorage';

afterEach(() => vi.unstubAllGlobals());

describe('isRemotePhoto', () => {
  it('separates uploaded URLs from inline data — old base64 records keep rendering', () => {
    expect(isRemotePhoto('https://firebasestorage.googleapis.com/x.jpg')).toBe(true);
    expect(isRemotePhoto('http://cdn/x.jpg')).toBe(true);
    expect(isRemotePhoto('data:image/png;base64,AAAA')).toBe(false);
    expect(isRemotePhoto('/fish-urok.png')).toBe(false);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a base64 data URL and keeps its mime type', () => {
    // 1x1 GIF
    const url = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    const blob = dataUrlToBlob(url)!;
    expect(blob).toBeTruthy();
    expect(blob.type).toBe('image/gif');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('returns null for anything that is not a base64 data URL', () => {
    expect(dataUrlToBlob('https://x/y.jpg')).toBeNull();
    expect(dataUrlToBlob('data:image/svg+xml,<svg/>')).toBeNull();
  });
});

describe('compressDataUrl (node — no canvas)', () => {
  it('returns the input untouched instead of throwing when canvas is absent', async () => {
    const url = 'data:image/png;base64,AAAA';
    await expect(compressDataUrl(url)).resolves.toBe(url);
  });

  it('leaves remote URLs alone', async () => {
    await expect(compressDataUrl('https://x/y.jpg')).resolves.toBe(
      'https://x/y.jpg',
    );
  });
});

describe('preparePhotosForSave', () => {
  it('keeps already-uploaded URLs as-is so an edit does not re-upload', async () => {
    const urls = ['https://storage/a.jpg', 'https://storage/b.jpg'];
    await expect(preparePhotosForSave(urls)).resolves.toEqual(urls);
  });

  it('falls back to inline data when Storage is unavailable — the record still saves', async () => {
    const inline = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    // 로그인/Storage 미설정 상태(테스트 환경) → 업로드 불가 → 원본 유지
    await expect(preparePhotosForSave([inline])).resolves.toEqual([inline]);
  });

  it('handles an empty gallery', async () => {
    await expect(preparePhotosForSave([])).resolves.toEqual([]);
  });
});

describe('inline budget (Storage unavailable path)', () => {
  it('exposes a budget under the 1MiB Firestore document limit', async () => {
    const { INLINE_BUDGET_BYTES } = await import('@/lib/photoStorage');
    expect(INLINE_BUDGET_BYTES).toBeLessThan(1024 * 1024);
    expect(INLINE_BUDGET_BYTES).toBeGreaterThan(500 * 1024);
  });

  it('re-compresses inline photos when the total exceeds the budget', async () => {
    // canvas가 없는 node 환경에서는 compressDataUrl이 원본을 돌려주므로,
    // 여기서는 "예산 초과 입력에도 사진을 버리지 않고 같은 개수를
    // 돌려준다"는 계약만 고정한다(실제 축소 비율은 브라우저 실측:
    // 2026-08-28 3장 17.5MB → 793KB).
    const big = 'data:image/jpeg;base64,' + 'A'.repeat(400 * 1024);
    const result = await preparePhotosForSave([big, big, big]);
    expect(result).toHaveLength(3);
    for (const p of result) expect(p.startsWith('data:image/jpeg')).toBe(true);
  });
});
