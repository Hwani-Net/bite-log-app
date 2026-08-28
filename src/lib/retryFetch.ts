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
//
// 2026-08-29: 그 재시도조차 "타임아웃 없이 재시도"였다는 게 문제였다.
// init에 signal이 없으면 fetch()는 플랫폼 기본 커넥트 타임아웃에 걸려서야
// 실패하는데, 재시도가 그 실패를 또 한 번 그대로 반복해 총 대기가
// ~21초까지 갔다. 처음엔 `AbortSignal.timeout()`이 만드는 에러의
// `.name === "TimeoutError"`로 "우리가 건 타임아웃"을 가려내려 했는데,
// 로컬 Node에선 그렇게 나와도 Vercel 프로덕션에서는 **재현되지 않았다**
// (boat-calendar 콜드 쿼리가 배포 후에도 그대로 ~21.1~21.5초, HTTP 503 —
// 실측 5회 전부). Next.js가 라우트 핸들러의 fetch()를 캐싱용으로 감싸면서
// AbortSignal이나 에러 이름 처리를 다르게 할 가능성이 있어, 런타임이
// 실제로 무엇을 "TimeoutError"라고 부르는지에 기대는 방식 자체가
// 신뢰할 수 없었다.
//
// 그래서 에러 이름 문자열에 의존하지 않는다. 우리가 만든 타이머가
// 실제로 먼저 울렸는지를 직접 불리언으로 추적해, 그 경우에만 재시도를
// 건너뛴다 — 런타임이 그 순간의 실패를 뭐라고 부르든 상관없다.
//
// 2026-08-29 배포 후 재실측: 이걸로도 boat-calendar 콜드 쿼리 2/3이
// 여전히 ~21.4~21.8초였다. timeoutMs=12000으로는 우리 타이머가 절대
// 먼저 안 울린다는 뜻이었다 — 플랫폼 자체의 커넥트 타임아웃이 그보다
// 짧게(~10.5~10.9초, 최초 발견 때의 "~10.6~10.7초"와 일치) AbortSignal과
// 무관하게 독자적으로 먼저 발동하고 있었다. 그러면 우리 setTimeout은
// 결코 안 울리고, ourTimeoutFired는 계속 false로 남아 매번 "재시도할
// 가치 있는 빠른 연결 실패"로 오판해 그 ~10.6초를 또 반복했다.
// timeoutMs를 그 플랫폼 한계보다 짧게 잡아야 우리 쪽이 항상 먼저
// 발동해서 이 판정 자체가 의미를 갖는다.
//
// thefishing.kr 자체의 정상 응답 시간도 같은 자리(직접 측정으로 부하가
// 몰릴 때 최대 ~10.5초까지 봤다)에 걸쳐 있어서, 플랫폼 한계보다 확실히
// 짧으면서 그 정상 응답 범위를 다 덮는 값은 없다 — 두 구간이 사실상
// 겹친다. 9초는 그 사이 어딘가에 둔 절충이다: 플랫폼 한계보다 확실히
// 짧아 우리 판정이 대부분 제대로 작동하고, thefishing.kr이 정말 느린
// 순간(9~10.5초)엔 가끔 그 응답을 놓치고 조기 실패로 처리할 수 있다.
// 그래도 "실패를 두 배로 기다리는 것"보다는 "느린 걸 빨리, 깔끔하게
// 실패로 보고하고 다시 시도 버튼을 주는 것"이 낫다는 판단이다.
export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = 9_000,
): Promise<Response> {
  const controller = new AbortController();
  let ourTimeoutFired = false;
  const timer = setTimeout(() => {
    ourTimeoutFired = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (retries <= 0 || ourTimeoutFired) throw err;
    return fetchWithRetry(input, init, retries - 1, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}
