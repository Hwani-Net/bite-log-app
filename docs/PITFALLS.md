# BITE Log — Pitfalls (삽질 기록)

> 다음 에이전트가 같은 실수를 반복하지 않도록.
> **해결 완료된 삽질만 기록한다.** 진행 중 문제는 기록 불필요.

---

## ❌ Hydration 깜빡임 (DEMO↔실데이터 플래싱)
- **증상**: 첫 렌더 시 DEMO 데이터 → useEffect 로드 후 실데이터로 전환 → 화면 깜빡
- **원인**: `useState([])` 초기값이 비어있어 즉시 DEMO 폴백 표시
- **해결**: `recordsLoading` 상태 추가 → 로딩 중 스켈레톤 → 완료 후 최종 결정
- **🚫 금지**: 초기 렌더에서 조건부 데이터(DEMO vs 실데이터)를 즉시 결정하지 말 것

## ❌ YouTube API 400 에러 (콘솔 오염)
- **증상**: API 키 미설정 시 빨간 에러가 콘솔에 스택트레이스와 함께 표시
- **원인**: `if (!res.ok) throw new Error(...)` — 에러를 throw하면 dev mode에서 전체 스택 노출
- **해결**: `throw` → `console.warn` + `return getMockYouTube()` 조용한 폴백
- **🚫 금지**: 외부 API 실패를 `throw`로 전파하지 말 것. 항상 graceful 폴백.

## ❌ Regex 기반 코드 치환으로 구문 파손
- **증상**: DEMO_RECORDS 배열에서 `,,` 이중 쉼표 발생 → tsc 에러
- **원인**: `replace_file_content`에서 줄 단위 regex로 복합 객체 배열을 치환
- **해결**: 블록 단위 교체 (전체 DEMO_RECORDS 블록을 한번에 교체)
- **🚫 금지**: JSON/객체 배열을 regex 줄 단위로 수정하지 말 것. 항상 블록 단위.

## ❌ 브라우저 콘솔에 코드 붙여넣기 안 됨
- **증상**: localStorage.removeItem 명령을 콘솔에 붙여넣기 불가
- **원인**: 브라우저 보안 정책 — "allow pasting" 먼저 입력 필요
- **해결**: 앱 내 설정 페이지에 데이터 초기화 버튼 추가
- **🚫 금지**: 사용자에게 콘솔 명령을 붙여넣으라고 안내하지 말 것. UI 버튼으로 해결.

## ❌ Unsplash 이미지 URL 만료
- **증상**: 외부 Unsplash URL 사용 시 시간 지나면 404
- **원인**: Unsplash 무료 이미지 URL은 영구 보장 아님
- **해결**: AI generate_image로 자체 이미지 생성 → public/ 폴더에 로컬 저장
- **🚫 금지**: 프로덕션에서 외부 이미지 URL 직접 참조하지 말 것. 로컬 복사 필수.

## ❌ 시뮬레이션/테스트 알림이 새벽에 작동 안 함 (2026-03-03)
- **증상**: "테스트 알림 발송" 클릭해도 아무 반응 없음
- **원인**: `sendLocalNotification()`이 quietHours(23:00~06:00) 체크 → 새벽 시간에 차단
- **해결**: 시뮬레이션 함수에서 `sendLocalNotification` 우회 → 직접 `new Notification()` 생성
- **🚫 금지**: 시뮬레이션/테스트 전송 함수를 quietHours 로직이 있는 공용 함수에 연결하지 말 것. 테스트는 항상 직접 `new Notification()` 사용.

## ❌ Gemini API 403 — Firebase 키 ≠ Gemini 키 (2026-03-03)
- **증상**: Gemini API 호출 시 403 Forbidden, 모든 AI 기능(공지파서, 챗봇 등) 사용 불가
- **원인**: `.env.local`의 `NEXT_PUBLIC_GEMINI_API_KEY`에 Firebase API 키(`AIzaSyBJE_Jp...`)를 넣어놨음. Firebase 키는 `generativelanguage.googleapis.com`에 권한이 없음.
- **해결**: Google AI Studio(https://aistudio.google.com/apikey)에서 별도의 Gemini API 전용 키 발급 → `.env.local`에 교체 → `.next` 캐시 삭제(`rm -rf .next`) → dev 서버 재시작
- **🚫 금지**: Firebase API 키를 Gemini API 키로 사용하지 말 것. 반드시 AI Studio에서 별도 발급.
- **추가 주의**: `.env.local` 변경 후 반드시 `.next` 캐시 삭제 필요 — Next.js가 이전 환경변수를 캐시하는 경우가 있음.

## ❌ Marine API 수온 0°C — 내륙 좌표 문제 (2026-03-03)
- **증상**: HeroCard에 "수온 0°C" 표시 → 모든 어종별 입질 점수 대폭 하락 (-15점/어종)
- **원인**: Open-Meteo Marine API에 내륙 좌표(서울 37.56, 126.97) 전송 → `wave_height: null`, `sea_surface_temperature: 3.7°C` (인천 앞바다 값) → `Math.round(null)` = NaN → 극저수온 판정
- **해결**: 
  1. `marineService.ts`에 한국 해안 10개 기준점 추가 → 파고 null이면 가장 가까운 해안으로 자동 보정
  2. `biteTimeService.ts`에서 SST 0°C를 unreliable로 취급 → airTemp 폴백
  3. NaN 방어 추가 (`isNaN(waveHeight)` 체크)
- **🚫 금지**: Marine API 응답의 null/NaN 값을 그대로 Math 연산에 넣지 말 것. 반드시 null 체크 후 처리.

## ❌ Play Store 출시 노트 — 개발 내부 용어 사용 금지 (2026-03-04)
- **증상**: "원스톱 자동배포 파이프라인 검증" 등 개발 내부 용어가 Play Console 출시 노트에 노출됨
- **원인**: 자동 배포 스크립트 테스트 시 릴리즈 노트를 개발자 관점으로 작성
- **해결**: 출시 노트는 항상 사용자 관점 ("AI 어종 예측 추가, UI 개선" 등 기능 중심) 으로 작성
- **🚫 금지**: "파이프라인 검증", "빌드 테스트", "API 연동 확인" 등 기술 내부 용어 절대 금지

## ❌ Firebase 프로젝트 계정 불일치 — deploy 실패 (2026-03-12)
- **증상**: `npx firebase deploy` 실행 시 "Failed to get Firebase project fishlog-diary-2026" 오류
- **원인**: 로컬 `.firebaserc`의 프로젝트 ID(`fishlog-diary-2026`)가 현재 로그인된 계정(`hwanizero01@gmail.com`)의 프로젝트 목록에 없음
- **해결**: `firebase projects:list`로 접근 가능한 프로젝트 확인 → `firebase projects:create bite-log-app` 으로 신규 생성 → `firebase use bite-log-app` 으로 전환
- **🚫 금지**: deploy 실패 시 바로 재시도 금지. 먼저 `firebase login:list` + `projects:list`로 계정·프로젝트 매핑 확인 필수
- **추가 주의**: 프로젝트 변경 시 `pwa_build_request.json`의 host/iconUrl/webManifestUrl, `layout.tsx`의 metadataBase, Play Console 개인정보처리방침 URL 도 함께 변경해야 함

## ❌ Play Store 비공개 테스트 — 국가/지역 미설정으로 출시 불가 (2026-03-12)
- **증상**: 비공개 테스트 트랙에 빌드를 추가했는데 출시 불가 오류 발생
- **원인**: 비공개(Alpha) 트랙은 내부 테스트와 달리 국가/지역을 명시적으로 선택해야 함
- **해결**: 트랙 관리 → 국가/지역 탭 → "국가/지역 추가" → 대한민국 선택 → 저장
- **🚫 금지**: 비공개 테스트 설정 시 국가/지역 탭을 빠뜨리지 말 것

## ❌ Antigravity가 직접 코드 수정 (ADR-007 Dual Agent 위반) (2026-03-14)
- **증상**: API 키 등 단순 코드 수정 시 Antigravity(Pro)가 직접 파일을 편집하여 크레딧 낭비 및 Claude Code의 자율치유 루프(Self-Healing) 무력화.
- **원인**: 에이전트가 "단순한 수정은 내가 직접 하는 게 빠르겠다"라고 구시대적인 방식으로 잘못 판단함.
- **해결**: 모든 코딩/디버깅 작업은 반드시 `run_command`를 통해 `npx @anthropic-ai/claude-code --dangerously-skip-permissions -p "..."` 방식으로 Claude Code에게 위임. 프롬프트에는 수정할 대상 파일 경로와 검증 커맨드(예: npm run build)를 명시하여 Claude Code가 스스로 완벽히 수정할 때까지 반복하게 해야 함.
- **🚫 금지**: Antigravity가 `replace_file_content` 등의 파일 수정 도구로 애플리케이션 코드를 직접 수정하는 행위 절대 금지. 오직 Claude Code 호출로만 해결할 것.

## ❌ `output: 'export'`와 dynamic API Routes 동시 사용 불가 (2026-03-14)
- **증상**: `next build` 시 "Page with `dynamic = 'force-dynamic'` cannot be exported" 에러
- **원인**: `next.config.ts`의 `output: 'export'`는 순수 정적 파일만 생성. `force-dynamic` 또는 `revalidate=0`이 붙은 Route Handler가 하나라도 있으면 빌드 자체가 실패함
- **해결**: `output: 'export'` 라인 제거 → Next.js 기본 서버 모드로 전환. Firebase Hosting은 정적 파일 배포에만 사용하고 API 라우트는 Next.js 서버가 처리
- **🚫 금지**: `output: 'export'` 상태에서 API Routes(`/api/*`) 추가 금지. 둘은 공존 불가.

## ❌ KHOA/Naver API 브라우저 직접 호출 → CORS 차단 (2026-03-14)
- **증상**: 브라우저에서 `openapi.naver.com`, `www.khoa.go.kr` 직접 fetch 시 CORS 에러로 응답 차단
- **원인**: 두 API 모두 서버 사이드 전용. 브라우저 origin에 CORS 헤더를 내려주지 않음. Naver는 `X-Naver-Client-Secret` 같은 민감 키를 클라이언트에 노출시키는 문제도 있음
- **해결**: `/api/tide`, `/api/naver` 내부 Route Handler(서버) 생성 → 클라이언트는 내부 엔드포인트만 호출. 키는 서버 환경변수에서만 참조
- **🚫 금지**: 외부 API 키(Naver secret 등)를 `NEXT_PUBLIC_` 접두사로 클라이언트에 노출하지 말 것. 프록시 Route Handler 패턴 필수.

## ❌ PRO 기능 활성화 후 UI 빈 화면 (시크릿 포인트) (2026-03-14)
- **증상**: PRO 구독 전환(`isPro = true`) 후 시크릿 포인트 섹션이 빈 화면으로 표시됨
- **원인**: `isPro`는 true인데 `secretSpot` 데이터가 null이거나 없을 때 조건부 렌더링이 아무것도 표시 안 함. 또한 이전 세션의 stale Zustand persist 캐시가 `isPro = false`를 물고 있어 페이월이 사라지지 않는 경우도 발생
- **해결**: `OverviewTab.tsx`에 `secretSpot` 없을 때 기본 안내 메시지 표시 로직 추가. `subscriptionStore`의 persist key를 v2 → v3으로 bump하여 stale 캐시 강제 무효화
- **🚫 금지**: PRO 전환 후 기능 활성화 테스트 없이 배포 금지. persist key는 store 구조 변경 시마다 반드시 bump할 것.

## ❌ Hydration 불일치 — useState 초기값에서 sessionStorage 접근 (2026-03-14)
- **증상**: `SplashWrapper`가 SSR 렌더와 CSR 첫 렌더에서 다른 값 반환 → React Hydration 경고 + 스플래시 화면 깜빡임
- **원인**: `useState(() => { if (typeof window === 'undefined') return false; return !sessionStorage.getItem(...) })` 패턴은 SSR에선 false, CSR 첫 렌더에선 sessionStorage 기반 값 → 불일치
- **해결**: `useState(false)` (SSR 동일값) + `useEffect(() => { setShowSplash(!sessionStorage.getItem(...)) }, [])` 로 sessionStorage 접근을 마운트 이후로 지연
- **🚫 금지**: `useState` 초기값 함수 안에서 `sessionStorage`, `localStorage`, `window.*` 등 브라우저 전용 API 직접 참조 금지. 반드시 `useEffect`로 분리할 것.

## ❌ 환경/인증 창 (NLM 등) 대표님께 수동 입력 요구 (2026-03-14)
- **증상**: NLM 인증 만료 시 "터미널에서 nlm login을 입력해 주세요"라고 대표님께 지시하며 떠넘김.
- **원인**: 해당 쉘 명령어(UI 인증창 팝업)가 구동 시스템 브라우저를 띄우는 특성을 오해하여 에이전트가 백그라운드 명령어(`run_command`)로 실행할 수 없다고 착각함.
- **해결**: NLM 에러, Firebase Login 등 UI 인증 창을 띄워야 하는 복구 커맨드도 `run_command` (WaitMsBeforeAsync=5000)를 활용하여 백그라운드 호출하면 대표님 환경(Windows)에 직접 자동으로 창이 열림.
- **🚫 금지**: 터미널 명령어를 통해 해결 가능한 환경 복구 창 띄우기나 디버깅 명령을 대표님께 수동으로 복사/붙여넣기 하라고 지시하는 것 절대 금지. 무조건 스스로 커맨드를 실행하여 해결할 것.
