# BiteLog — Project Rules

> 이 파일이 글로벌 CLAUDE.md보다 우선합니다.

## 프로젝트 개요
낚시 기록·예보·커뮤니티 앱 (Next.js 16 + Firebase).
- Firebase 프로젝트: bite-log-app
- 스택: Next.js 16, React 19, TypeScript, Tailwind v4, Zustand, Leaflet, Recharts
- 테스트: Vitest (유닛) + Playwright (E2E)
- 배포: Firebase App Hosting
- 디자인: AGENTS.md의 Design Token 보호 (drift-guard)

## 파이프라인 (11단계, 순서 엄수)

모든 기능 구현·버그 수정은 아래 11단계를 순차 실행. skip 금지.

| Step | 이름 | 동작 | 통과 기준 |
|------|------|------|----------|
| 1 | 코드작성 | 기능 구현 또는 버그 수정 | 컴파일 에러 0 |
| 2 | 린트 | `npm run lint` | ESLint + TS 에러 0 |
| 3 | 테스트 | `npm run test` + `npm run test:e2e` | 전 테스트 통과 |
| 4 | 커밋 | Conventional Commits (영어) | 논리적 단위 1커밋 |
| 5 | 품질루프 | 5패스(기능/보안/성능/UX/페인포인트) × 2라운드 saturation | 2라운드 연속 ALL PASS |
| 6 | 스크린샷 | Playwright 주요 화면 캡처 (데스크톱+모바일) | Read로 직접 확인 |
| 7 | 교차검수 | 외부 모델 코드 리뷰 (Codex + Gemini) | avg 7/10+ |
| 8 | 빌드 | `npm run build` | 빌드 에러 0, 번들 사이즈 확인 |
| 9 | 배포 | `firebase deploy` 또는 App Hosting | deploy complete |
| 10 | 스모크테스트 | 라이브 URL HTTP 200 + 주요 기능 동작 | 200 응답 |
| 11 | 검증 | Playwright 라이브 사이트 스크린샷 + 시각 확인 | 렌더링 정상 |

### 품질루프 5패스 상세
| Pass | 관점 | 검토 항목 |
|------|------|----------|
| 1 | 기능 | 테스트 통과, 빌드 성공, 의도한 동작 확인 |
| 2 | 보안 | OWASP Top 10, 시크릿 노출, XSS/인젝션 |
| 3 | 성능 | 불필요한 리렌더링, 번들 크기, 이미지 최적화 |
| 4 | UX/접근성 | 전 버튼·링크 클릭 동작, 네비게이션 흐름, 폼 입력·에러 처리, 접근성 |
| 5 | 사용자 페인포인트 | "이 화면에서 사용자가 막히는 곳은?" 관점 검증, 불편사항 PITFALLS 기록 |

### 추가 감지 항목
- **에러 억제 감지 (#10)**: try-catch로 에러 숨기기, console.error→console.log 변경, throw 제거 시 FAIL
- **로컬 최적화 감지 (#20)**: 새 기능 → 라우트 등록, 네비게이션 링크, import 연결이 실제 동작하는지 E2E 검증 필수
- **아키텍처 호환성 (#16)**: API 응답 변경, Firestore 스키마 변경, 공유 타입 변경 시 영향 범위 명시

### 통과 기준
- 각 단계 FAIL → 자동 수정 → 재시도. skip 금지.
- 품질루프: 2라운드 연속 ALL PASS일 때만 통과
- 교차검수: 외부 모델 평균 7/10 미만이면 수정 후 재검수
- 배포 후 검증 없이 보고 금지

## 디자인 규칙
- AGENTS.md의 Design Token 절대 변경 금지 (drift-guard 보호, 2436 토큰 잠금)
- 디자인 시스템 v2.0: DESIGN.md 참조
- 아이콘: Lucide React 전용 (Material Symbols 사용 금지 — 100% 마이그레이션 완료)
- 다크모드: `.dark` class, bg-bg/bg-bg-dark 토큰 사용
- 공유 UI: `src/components/ui/` (Card, Badge, Button, Skeleton 등 10개)
- Mock 데이터: `// @mock-data — [설명]` 태그 필수 (grep @mock-data로 검색)
- 에러 처리: `src/lib/apiError.ts` + `apiClient.ts` (apiFetch 래퍼 사용)

## 앱 구조
```
src/app/
├── alerts/          # 알림
├── bite-forecast/   # 입질 예보
├── booking/         # 예약
├── concierge/       # 컨시어지
├── feed/            # 피드
├── fleet-radar/     # 선단 레이더
├── live-dashboard/  # 라이브 대시보드
├── news/            # 뉴스
├── ranking/         # 랭킹
├── record/          # 기록 (단건)
├── records/         # 기록 (목록)
├── regulations/     # 규정
├── season-forecast/ # 시즌 예보
```
