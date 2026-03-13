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

