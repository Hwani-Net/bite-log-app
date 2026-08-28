import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '@/lib/retryFetch';

describe('fetchWithRetry', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns the response directly when the first attempt succeeds', async () => {
    const ok = new Response('ok', { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(ok);
    const res = await fetchWithRetry('https://example.com', {});
    expect(res).toBe(ok);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries once after a connection failure and returns the retry result', async () => {
    const ok = new Response('ok', { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ConnectTimeoutError'))
      .mockResolvedValueOnce(ok);
    global.fetch = fetchMock;
    const res = await fetchWithRetry('https://example.com', {});
    expect(res).toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a clean non-ok HTTP response — that is the caller\'s decision', async () => {
    const notFound = new Response('nope', { status: 404 });
    const fetchMock = vi.fn().mockResolvedValue(notFound);
    global.fetch = fetchMock;
    const res = await fetchWithRetry('https://example.com', {});
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up and throws after exhausting retries', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('still down'));
    global.fetch = fetchMock;
    await expect(fetchWithRetry('https://example.com', {}, 1)).rejects.toThrow(
      'still down',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2); // initial attempt + 1 retry
  });

  it('honors a custom retry count', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    global.fetch = fetchMock;
    await expect(fetchWithRetry('https://example.com', {}, 3)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  // 2026-08-29 — retries=1(기본값)에 타임아웃이 없어, thefishing.kr이 정말
  // 응답하지 않는(연결 실패가 아니라 그냥 느린) 콜드 쿼리마다 플랫폼 기본
  // 커넥트 타임아웃(~10.6초)을 두 번 그대로 반복해 실측 21초가 나왔다
  // (사용자가 "항구 필터가 느리다"고 지적한 원인 — 항구 칩은 이 fetch의
  // 파생값이다). 매 시도에 명시적 timeoutMs를 걸고, 그 타임아웃 자체로
  // 실패했을 땐 재시도하지 않아야 한다 — 재시도해도 똑같이 그 시간을 또
  // 기다릴 뿐이다.
  it('passes an AbortSignal so each attempt has an explicit timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = fetchMock;
    await fetchWithRetry('https://example.com', {}, 1, 5000);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // Vercel 프로덕션에서는 AbortSignal.timeout()이 만드는 에러의
  // `.name`이 로컬 Node와 다르게 나와(재현: boat-calendar 콜드 쿼리가
  // 이 방식 배포 후에도 그대로 ~21초) 이름 문자열 비교로는 "우리가 건
  // 타임아웃"을 못 가려냈다. 지금 구현은 우리 setTimeout이 실제로
  // 먼저 울렸는지를 불리언으로 직접 추적하므로, 그 시나리오를 가짜
  // 타이머로 재현해서 검증한다 — 에러 이름은 아무거나 상관없다.
  it('does not retry when our own timer fires first, regardless of the error name', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            // 런타임마다 이름이 다를 수 있는 걸 흉내 — 우리 코드는 이
            // 이름을 보지 않아야 한다.
            reject(new Error('some runtime-specific abort error'));
          });
        });
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const promise = fetchWithRetry('https://example.com', {}, 1, 5000);
      const assertion = expect(promise).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
      // 재시도해봤자 같은 타임아웃을 또 기다릴 뿐이라 1회만 시도한다.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still retries a fast connection-level failure (not our timeout)', async () => {
    const ok = new Response('ok', { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok);
    global.fetch = fetchMock;
    const res = await fetchWithRetry('https://example.com', {}, 1, 5000);
    expect(res).toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
