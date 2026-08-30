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
// 2026-08-29 — 그날 세 번의 시도가 전부 같은 함정에 빠졌다: "우리가 건
// 타임아웃이면 재시도하지 않는다"를 (1) 에러 이름 문자열로, (2) 우리
// setTimeout이 먼저 울렸는지 불리언으로 판정해봤지만, 둘 다 "우리 타임아웃과
// thefishing.kr의 정상 응답 시간이 같은 자리(~9~10.5초)에 겹친다"는 진짜
// 문제를 피해가지 못했다. 짧게 잡으면(9초) 방금 실측한 정상 응답(9.4~9.6초,
// 우리 서버를 거치지 않은 직접 요청으로 확인)까지 잘라내 대표 화면에서
// "선박 목록을 불러오지 못했습니다"가 뜨는 실사용 장애로 이어졌다. 길게
// 잡으면(12초) 플랫폼 자체의 독자적 커넥트 타임아웃(~10.6~10.9초,
// AbortSignal과 무관하게 발동)이 항상 먼저 이겨서 "우리 타임아웃인지"
// 판정 자체가 죽은 코드가 됐다.
//
// 그래서 "왜 실패했는지" 판정을 접었다. 대신 "얼마나 빨리 실패했는지"만
// 본다 — 재시도가 값어치 있는 유일한 경우는 TLS/DNS 핸드셰이크가 그
// 자리에서 바로 끊어지는 것(보통 1~2초 안에 일어난다)뿐이고, 그건 원인이
// 무엇으로 불리든 "빠른 실패"라는 사실 자체로 구분된다. 응답이 오래
// 걸리다 실패한 경우(우리 타임아웃이든 플랫폼 것이든 thefishing.kr이 그냥
// 느린 것이든) 재시도해봤자 같은 시간을 또 기다릴 뿐이니 재시도하지
// 않는다. timeoutMs는 넉넉하게(15초) 잡아 정상 응답을 더는 조기에
// 잘라내지 않는다 — 그래도 플랫폼 자체 한계(~10.6~10.9초)가 대개 먼저
// 걸려 실질 상한은 비슷하게 유지된다.
//
// 2026-08-30 교차검수(OpenRouter)로 발견: fetch()는 헤더만 도착하면
// resolve되고, 본문(res.text()/res.json())은 호출자가 나중에 별도로
// 읽는다. 그런데 이전 코드는 fetch()가 resolve되자마자 finally에서
// 타이머를 지웠다 — 헤더 이후 본문을 읽는 동안은 아무 타임아웃 보호도
// 없었다는 뜻. 그래서 타이머를 성공 경로에서는 지우지 않고 그대로 살려
// 본문 읽기까지 같은 AbortController가 지키게 한다. 본문을 이미 다 읽은
// 뒤에 뒤늦게 abort()가 울려도 그건 완료된 요청에 대한 아무 효과 없는
// 호출이라 해롭지 않다. 실패(catch) 경로는 지킬 Response가 없으니 그
// 자리에서만 지운다.
const FAST_FAILURE_MS = 2_000;

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const failedFast = Date.now() - startedAt < FAST_FAILURE_MS;
    if (retries <= 0 || !failedFast) throw err;
    return fetchWithRetry(input, init, retries - 1, timeoutMs);
  }
}
