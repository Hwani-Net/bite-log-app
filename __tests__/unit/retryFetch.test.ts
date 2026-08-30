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

  it('passes an AbortSignal so each attempt has an explicit timeout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    global.fetch = fetchMock;
    await fetchWithRetry('https://example.com', {}, 1, 5000);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // 2026-08-29 — 세 번의 시도가 전부 "실패 이유"로 판정하려다 실패했다:
  // (1) 에러 이름 문자열은 Vercel 프로덕션에서 로컬과 다르게 나왔고,
  // (2) "우리 setTimeout이 먼저 울렸나"는 그 타임아웃 값이 플랫폼 자체
  // 한계(~10.6~10.9초)보다 짧아야만 의미가 있었는데, 짧게 잡으면(9초)
  // thefishing.kr의 정상 응답(그날 실측 9.4~9.6초)까지 잘라내 실사용
  // 장애("선박 목록을 불러오지 못했습니다")로 이어졌다. "왜"가 아니라
  // "얼마나 빨리" 실패했는지만 보는 지금 방식은 그 경계 자체가 필요
  // 없다 — 느리게 실패한 시도는 재시도해도 똑같이 느릴 뿐이라는 사실은
  // 실패 이유와 무관하게 항상 참이다.
  it('does not retry a failure that took a while (not worth repeating)', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new Error('some runtime-specific abort error'));
          });
        });
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const promise = fetchWithRetry('https://example.com', {}, 1, 5000);
      const assertion = expect(promise).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('still retries a failure that happened quickly (a real connection blip)', async () => {
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

  // 2026-08-30 — OpenRouter 교차검수가 발견: 헤더 도착(fetch resolve) 후
  // 본문을 읽는 동안 타임아웃 보호가 사라지는 결함이 있었다. 이 테스트는
  // 그 결함이 있던 코드(성공 즉시 finally에서 타이머 clear)에서는 실패하고,
  // 고친 코드(성공해도 타이머를 살려둠)에서만 통과한다.
  it('keeps the timeout guard alive after returning so a slow body read still aborts', async () => {
    vi.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined;
        return Promise.resolve(new Response('ok'));
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = await fetchWithRetry('https://example.com', {}, 1, 5000);
      expect(res.status).toBe(200);
      expect(capturedSignal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(5000);
      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
