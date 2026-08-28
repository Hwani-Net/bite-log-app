import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiFetch } from '@/lib/apiClient';
import { ApiError } from '@/lib/apiError';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string) => Promise<unknown> | unknown) {
  vi.stubGlobal('fetch', (url: string) => Promise.resolve(impl(url)));
}

describe('apiFetch', () => {
  it('returns parsed JSON on success', async () => {
    stubFetch(() => ({ ok: true, json: () => Promise.resolve({ a: 1 }) }));
    await expect(apiFetch<{ a: number }>('/api/x')).resolves.toEqual({ a: 1 });
  });

  it('throws an ApiError carrying the status — 503 stays distinguishable', async () => {
    // 앱 곳곳의 mock 폴백이 503을 구분해야 하므로 status 보존이 계약이다.
    stubFetch(() => ({ ok: false, status: 503, statusText: 'unavailable' }));
    const err = await apiFetch('/api/gemini', { retries: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(503);
  });

  it('does not retry when retries is 0, even for retryable statuses', async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return { ok: false, status: 500, statusText: 'server error' };
    });
    await apiFetch('/api/x', { retries: 0 }).catch(() => {});
    expect(calls).toBe(1);
  });

  it('retries a retryable failure when asked, then throws', async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return { ok: false, status: 500, statusText: 'server error' };
    });
    await apiFetch('/api/x', { retries: 2, retryDelay: 1 }).catch(() => {});
    expect(calls).toBe(3); // 최초 1 + 재시도 2
  });

  it('classifies a thrown network error instead of leaking the raw error', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    const err = await apiFetch('/api/x', { retries: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
  });
});
