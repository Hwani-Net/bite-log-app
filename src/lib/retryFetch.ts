// thefishing.kr's own connection/TLS handshake is intermittently slow
// enough to trip the runtime's ~10s default connect timeout even while the
// site is up — confirmed live: a direct request succeeded in 9.7s, right at
// that edge, while our server-side fetch died at ~10.7s with the same
// ConnectTimeoutError this session already saw in production. A retry opens
// a fresh connection rather than waiting on the stalled one, so it recovers
// most of these without adding latency to the normal, already-fast path.
// Only retries a fetch()-level failure (the connection itself failing) —
// callers still decide what to do with a clean non-ok HTTP response.
//
// 2026-08-28: 재시도만으로는 부족했다. 프로덕션에서 thefishing.kr 요청이
// **전부** 실패하고 있었고(지역·어종·페이지·날짜 필터 전멸, 캐시된 URL
// 하나만 응답), 원인은 함수 리전이 미국이라 한국 서버에서 200KB대 HTML을
// 받는 데 걸리는 시간이 실행 한도를 넘긴 것이었다. `vercel.json` 의
// `"regions": ["icn1"]`(서울)이 그 근본 대응이고, 이 재시도는 그 위에서
// 남은 간헐 실패를 흡수하는 역할이다. 리전 설정을 지우면 같은 증상이
// 그대로 돌아온다.
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
