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

describe('apiFetch timeout & classification detail', () => {
  it('aborts after the timeout and classifies it as a retryable ApiError', async () => {
    // fetch가 abort 신호를 받으면 AbortError를 던지는 실제 동작을 흉내낸다.
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    const err = await apiFetch('/api/slow', { timeout: 20, retries: 0 }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).type).toBe('timeout');
    expect((err as ApiError).retryable).toBe(true);
  });

  it('passes fetch options (method/headers/body/cache) straight through', async () => {
    let seen: RequestInit | undefined;
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      seen = init;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    await apiFetch('/api/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
      cache: 'no-store',
      retries: 0,
    });
    expect(seen?.method).toBe('POST');
    expect(seen?.cache).toBe('no-store');
    expect(seen?.body).toBe('{"a":1}');
    expect(seen?.signal).toBeTruthy(); // 타임아웃용 AbortSignal이 붙는다
  });

  it('surfaces a malformed JSON body as an ApiError, not a raw crash', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );
    const err = await apiFetch('/api/x', { retries: 0 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
  });

  // 2026-08-31 Codex 교차검수 발견 — fetch()가 헤더 도착으로 resolve되자마자
  // 타이머를 지워서, 그 다음 res.json()이 멈추는 동안은 아무 타임아웃 보호도
  // 없었다(retryFetch.ts에서 이미 고친 것과 같은 클래스의 결함). 이 테스트는
  // 그 결함이 있던 코드에서는 절대 reject되지 않고 멈춰 있다 — 고친 코드에서만
  // 타임아웃이 res.json() 단계까지 살아남아 정상적으로 실패한다.
  it('keeps the timeout guard alive through res.json() so a stalled body read still aborts', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }),
        });
      });
      const promise = apiFetch('/api/x', { timeout: 5000, retries: 0 });
      const assertion = expect(promise).rejects.toBeInstanceOf(ApiError);
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
