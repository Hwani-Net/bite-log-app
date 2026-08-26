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
});
