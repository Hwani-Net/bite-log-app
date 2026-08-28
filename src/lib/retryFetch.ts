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
// 2026-08-29: 그 재시도조차 "타임아웃 없이 재시도"였다는 게 문제였다.
// init에 signal이 없으면 fetch()는 플랫폼 기본 커넥트 타임아웃(위 주석의
// ~10.6초)에 걸려서야 실패하는데, 재시도가 그 실패를 또 한 번 그대로
// 반복해 총 대기가 ~21초까지 갔다(라이브 실측: date=2026-08-31 콜드
// 쿼리 3회 모두 21140~21160ms). 사용자가 "항구 필터가 느리다"고 한 게
// 바로 이거였다 — 항구 칩은 이 fetch가 끝나야 뜨는 파생 값이라, fetch가
// 21초 걸리면 항구 칩도 21초 걸린다.
//
// 이제 매 시도마다 명시적 타임아웃을 걸고, 우리가 건 타임아웃으로
// 실패한 경우엔 재시도하지 않는다 — 똑같이 12초를 또 기다릴 뿐 성공
// 확률이 오르지 않는다. 재시도는 "연결이 빨리 끊어진" 경우(TLS/DNS
// 순간 실패 등, 보통 1초 안에 실패)에만 값어치가 있고, 그런 실패는
// timeoutMs와 무관하게 빠르므로 총 대기에 큰 영향이 없다.
export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = 12_000,
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const isOurTimeout = err instanceof Error && err.name === "TimeoutError";
    if (retries <= 0 || isOurTimeout) throw err;
    return fetchWithRetry(input, init, retries - 1, timeoutMs);
  }
}
