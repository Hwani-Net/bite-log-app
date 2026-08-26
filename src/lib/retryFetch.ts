// thefishing.kr's own connection/TLS handshake is intermittently slow
// enough to trip the runtime's ~10s default connect timeout even while the
// site is up — confirmed live: a direct request succeeded in 9.7s, right at
// that edge, while our server-side fetch died at ~10.7s with the same
// ConnectTimeoutError this session already saw in production. A retry opens
// a fresh connection rather than waiting on the stalled one, so it recovers
// most of these without adding latency to the normal, already-fast path.
// Only retries a fetch()-level failure (the connection itself failing) —
// callers still decide what to do with a clean non-ok HTTP response.
export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (retries <= 0) throw err;
    return fetchWithRetry(input, init, retries - 1);
  }
}
