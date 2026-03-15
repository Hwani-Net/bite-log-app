# BITE Log — Project Context

> **최종 갱신**: 2026-03-15 (현재)
> **경로**: `e:/AI_Programing/Fishing/fish-log`
> **서버**: `npm run dev -- -p 3013`
> **Firebase**: `bite-log-app` (hwanizero01@gmail.com, admin@gpt-korea.com) → https://bite-log-app.web.app
> **NLM**: `ce527c4c-a5bd-4215-a349-ee9ac92fa655` (BITE Log 피크타임 리서치, 15소스)

---

## 🌟 북극성 (존재 이유)

**한국 낚시인의 "정보 분산 고통"을 AI로 해결하는 유일한 앱.**

- 경쟁사 11개 중 LLM 활용 0개 → 1~2년 선점 기회
- 수익 모델: 프리미엄 구독 (₩4,900/월) + 커머스 제휴 수수료
- 손익 분기: 프로 회원 **11명**이면 LLM 비용(₩4~5만/월) 커버

**에이전트 자문 3가지** (작업 시작 전 스스로에게 물어볼 것):
1. "이 작업이 북극성(정보 분산 해결)에 기여하는가?"
2. "이 작업의 완료 기준은 사용자 관점인가, 기술 관점인가?"
3. "이 작업이 Anti-Scope를 침범하지 않는가?"

---

## 🤖 Agent Operational Protocol (ADR-007)

> **Antigravity(Pro) - Claude Code(CLI) 듀얼 에이전트 시스템**

1. **실행 주체 분리**: 모든 실무 코딩, 디버깅, 패키지 설치, 빌드 테스트는 **Claude Code**가 담당한다. Antigravity는 직접 코드를 수정하지 않고 `run_command`를 통해 구체적인 지시(프롬프트 합성)만 내린다.
2. **자율 복구(Self-Healing)**: Claude Code 호출 시 반드시 검증 명령어(예: `npm run build`, `npm test`)를 포함하여, 에러 발생 시 Claude Code가 스스로 수정 루프를 돌게 한다.
3. **무조건 실행**: 인증(NLM login 등)이나 환경 설정 오류 발견 시 대표님께 묻지 말고 즉시 백그라운드 명령으로 자율 복구한 뒤 보고한다.
4. **망각 방지**: 매 세션 시작 시 `docs/PROJECT_CONTEXT.md`와 `docs/PITFALLS.md`를 필독하여 이전의 결정과 실수를 동기화한다.

## 🎭 Dual Agent 전략 (Claude Code First)

> **Antigravity(나)는 두뇌, Claude Code는 손**으로 동작하며, 크레딧 효율을 극대화한다.

1.  **Antigravity (Orchestrator - 5% 리소스)**
    -   **Stitch 기반 UI/UX 설계**: 고해상도 디자인 소스 및 HTML 추출
    -   **전략 및 기획**: 비즈니스 로직 설계, 페르소나 자문, PRD 최종 승인
    -   **시각적 QA**: 브라우저 서브에이전트를 통한 E2E 시각적 검증 및 녹화
    -   **Claude Code 제어**: `run_command`로 Claude Code를 호출하여 실무 작업 위임

2.  **Claude Code (Worker - 95% 리소스)**
    -   **모든 코드 구현**: API 연동, 컴포넌트 로직 완성, 리팩터링
    -   **검증 및 디버깅**: 테스트 코드 작성, 빌드 에러 해결, 유닛 테스트 수행
    -   **문서화**: 상세 기획안(PRD) 초안 작성 및 기술 문서 업데이트

---

## 🚫 Anti-Scope (절대 안 만들 것)

- ❌ 선사 예약/결제 직접 처리 (링크 연결만)
- ❌ 실시간 채팅/커뮤니티 (밴드/카페가 이미 있음)
- ❌ 하드웨어 연동 (어탐기, 전동릴)
- ❌ 데스크톱 앱 (모바일 PWA 전용)
- ❌ 자체 지도 엔진 (카카오맵 연동만)

---

## 📊 현재 진행률: 100% (Phase 9 완료)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 기반 | 리브랜딩, 홈 디자인, 라이트 통일 | ✅ 완료 |
| 2 API | 날씨, 조류, 뉴스, AI 컨시어지 | ✅ 완료 |
| 3 핵심기능 | 조과등록 고도화, Auth, 랭킹 | ✅ 완료 (3A+3B+3C) |
| 4 배포 | PWA, TWA, 플레이스토어 | ✅ 완료 |
| 5 LLM | 공지파서, 시즌예측, 바이럴, 알림, 챗봇 | ✅ 완료 (5/5) |
| 6 승선명부 | 해수부 API, 지오펜싱 | ✅ API 연동 완료 (지오펜싱 잔여) |
| 7 UX 폴리시 | AI 탭 UI, 피크 타임라인, SEO, 상세 예측 | ✅ 완료 |
| 8 PRO 페이월 | 상태관리, 디자인, 제한 로직, 법무 | ✅ 완료 |
| 9 함대 레이더 | 실시간 선박 밀집도 히트맵 및 프리미엄 상세 시트 | ✅ 완료 (2026-03-15) |

---

## ✅ TODO (미완료 항목만)

### 🔴 남은 TODO (Tier 3 — 우선순위 순)
- [ ] 음성 기록 (Tier 3 #11) — Web Speech API, 음성 파싱, 리뷰 패널, 폼 자동채움
- [ ] 낚시 DNA 분석 — /stats DNA 탭, 아키타입 히어로 카드, 2x2 통계, 개선 포인트
- [ ] 금어기 법규 QA (Tier 3 #10) — /regulations 페이지, 14어종 규정 DB, 적법성 체크 위젯

---

## 📝 ADR (Architecture Decision Records)

| 날짜 | 결정 | 이유 | 기각된 대안 |
|------|------|------|------------|
| 2026-02 | **Firebase** (not Supabase) | 무료 티어 + Auth + Hosting 통합 | Supabase: RLS 강점이나 인프라 관리 부담 |
| 2026-02 | **Next.js 16** (not Vite) | SSR + PWA + API 라우트 통합 | Vite: SPA만, API 라우트 없음 |
| 2026-02 | **Tailwind v4** (not Vanilla CSS) | 본격 웹앱 규모, 유틸리티 생산성 | Vanilla: 유지보수 어려움 |
| 2026-02 | **Zustand** (not Redux) | 보일러플레이트 최소, 번들 사이즈 작음 | Redux: 과잉 |
| 2026-03 | **라이트 모드 전용** | 매거진 스타일 통일, dark: 408개 제거 | 다크 모드 유지: 유지보수 2배 |
| 2026-03 | **localStorage 폴백** | Firebase 미연결 시에도 앱 작동 보장 | Firebase 전용: 오프라인 불가 |
| 2026-03-11 | **피크타임 A안(Split Independent)** | 환경/조석/어종 독립 가중합. 9월 주꾸미 쌍봉패턴 정확히 재현 | B안(Uniform Blend): 어종 특성 희석 |
| 2026-03-12 | **Firebase 프로젝트 `bite-log-app`으로 이전** | `fishlog-diary-2026`이 hwanizero01@gmail.com 계정 목록에 없어 신규 생성. pwa_build_request.json + metadataBase + privacy URL 일괄 변경 | 기존 프로젝트 유지: 계정 접근 불가 |
| 2026-03-14 | **Phase 8: PRO 페이월 테스트 (A안) 채택** | PG(결제) 개발 전 유저 결제 의향(전환율) 선제적 검증. AI전문가챗봇/시크릿포인트 등에 페이월 적용. | B안(즉시 결제연동): 리소스/리스크 큼 |
| 2026-03-14 | **Phase 6: 승선명부 기능 제거 결정** | 미완성 상태. 자동 지오펜싱은 개인정보/무결성 리스크가 크고, 선장 도입 동인이 낮아 전략적 폐기. | C안(QR/오프라인 완성): ROI 낮음 |
| 2026-03-14 | **`output: 'export'` 제거 → Next.js 서버 모드** | `next.config.ts`의 `output: 'export'`는 dynamic API Routes(`force-dynamic`)와 함께 사용 불가. Firebase Hosting은 정적 파일만 서빙하므로 API 프록시를 Next.js 서버가 아닌 내부 Route Handler로 유지하면서 정적 export를 포기. | static export 유지: API 라우트 전부 삭제 필요 |
| 2026-03-14 | **KHOA/Naver CORS → 내부 API 프록시** | 브라우저에서 `openapi.naver.com`, `www.khoa.go.kr` 직접 호출 시 CORS 오류. `/api/tide`, `/api/naver` Route Handler로 서버 사이드 프록시 구축. | 클라이언트 직접 호출: CORS 차단 |
| 2026-03-15 | **비즈니스 가설 피벗 (Freemium 2.0)** | "미끼는 무료로, 그물은 유료로" 전략 고도화. **(Free)** 주꾸미/문어 대목에 실시간 지역별 조황 전광판 오픈. **(PRO)** **실시간 함대 밀집 레이더 (Fleet Radar)** 도입. AIS/V-PASS 데이터를 가공해 "지금 배들이 쓸어담고 있는 중심지"와 "내 배의 위치"를 비교 제공. 선장에게 포인트를 옮겨달라 제안하거나, 개인 보트 유저에게는 최강의 타겟팅 툴 제공. | 단순 좌표 추천: 선장 통제권 하에서 무용지물 |

---

## 🔧 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (Turbopack) |
| 스타일 | Tailwind CSS v4 |
| 상태관리 | Zustand |
| DB | Firebase Firestore + localStorage |
| 인증 | Firebase Auth (Google) |
| AI | Gemini 2.0 Flash |
| 차트 | Recharts |
| i18n | 자체 구현 (ko/en) |

---

## 📚 참고 문서 (⚠️ 원본 필독 — 요약으로 대체 금지)

| 문서 | 위치 | 분량 | 내용 |
|------|------|------|------|
| **LLM 전략 v2** | `docs/LLM_STRATEGY.md` | 289줄 | 피처 상세 스펙, 출력 예시, 페르소나 6명, 커머스 연계, 수익 모델 |
| **비용 정밀 산정** | `docs/FEASIBILITY_REVIEW.md` | 132줄 | 토큰별 비용, 리스크 등급, 수익 시뮬레이션 |
| 삽질 기록 | `docs/PITFALLS.md` | — | 반복 실수 방지 |

> ⚠️ **다음 에이전트에게**: 위 두 문서는 1시간 논의 결과물입니다.
> PROJECT_CONTEXT.md만 읽고 "이해했다"고 착각하지 마세요.
> 피처 구현 전에 반드시 LLM_STRATEGY.md 원본을 전문(全文) 읽으세요.

---

<details>
<summary>📦 완료된 항목 (아카이브)</summary>

### Phase 1: 기반
- [x] FishLog → BITE Log 리브랜딩
- [x] 매거진 라이트 스타일 홈 디자인
- [x] 전체 페이지 라이트 스타일 통일 (13개 파일, dark: 408개 제거)
- [x] 데모 데이터 실사화 (어종별 AI 생성 이미지, 동적 날짜 5개)
- [x] 데이터 초기화 버튼 (설정 > 데이터 관리)
- [x] BottomNav 라이트 전용 통일
- [x] 다국어 지원 (ko/en) + 테마 설정
- [x] Hydration 깜빡임 해결 (스켈레톤)

### Phase 2: API 연동
- [x] 날씨 API (OpenWeather)
- [x] 조류 API (KHOA, CORS 프록시)
- [x] 낚시 뉴스 (네이버 + YouTube mock)
- [x] AI 컨시어지 (날씨+물때+트렌드)
- [x] 쿠팡파트너스 어필리에이트
- [x] 입질 시간 예측 (HeroCard)
- [x] Firebase 프로젝트 셋업
- [x] YouTube API graceful 폴백

### Phase 3: 핵심 기능
- [x] 사진 촬영 → AI 어종 자동 인식 (4-Step Wizard, 2026-02)
- [x] Google 로그인 실제 연동 (signInWithPopup + onAuthStateChanged)
- [x] Local→Firebase 데이터 마이그레이션 (migrateLocalToFirestore 자동)
- [x] 유저 프로필 동기화 (설정 페이지 + 로그아웃)
- [x] Firebase publicFeed 기반 리더보드 (getFirebaseRanking)
- [x] LIVE/DEMO 뱃지, 빈 시즌 empty state, 내 순위 플로팅 패널

### Phase 4: PWA 배포
- [x] next.config static export (→ 이후 서버 모드로 전환, ADR)
- [x] Service Worker (오프라인)
- [x] TWA → APK → Play Store

### Phase 5: LLM 킬러 피처
- [x] #1 자연어 공지 파서 (/tools/notice-parser)
- [x] #2 치어 방류 시즌 예측 (/season-forecast, 시군 단위 30개 사이트)
- [x] #3 SNS 바이럴 모니터링 (/viral-gear + 홈 위젯)
- [x] #4 맞춤 오픈런 알림 (/alerts, 구독 CRUD + 규칙 매칭)
- [x] #9 어종별 전문가 챗봇 (/concierge 어종칩+Quick Reply+자유입력)
- [x] 뉴스 관련성 필터 (50+ 낚시 키워드), 소스 필터 (blog/news/youtube)
- [x] 시즌 예측 페이지 리디자인 (카드 시트 + 방류 테이블)
- [x] Windy 날씨 7일 예보 탭

### Phase 7: UX 폴리시
- [x] AI 탭 채팅창 높이 최적화 (flex-1 + calc(100dvh))
- [x] 24시간 피크 타임라인 — getPeakFishingWindows() + PeakTimeline
- [x] 피크타임 v2 알고리즘 (Split Independent) — 환경/조석/어종 독립 가중합
- [x] 피크 카드 터치 드래그 스크롤 (useDragScroll)
- [x] SEO og 태그 — layout.tsx openGraph/Twitter/metadataBase + og-image.png
- [x] 실시간 뉴스 링크 수리 — 네이버 데드링크 → 실제 유튜브/블로그 링크
- [x] Play Store versionCode 11, internal 트랙 배포
- [x] KHOA/Naver CORS → 내부 Route Handler 프록시 (/api/tide, /api/naver)
- [x] `output: 'export'` 제거 → Next.js 서버 모드 (ADR)
- [x] Hydration 불일치 수정 (SplashWrapper useEffect 지연)
- [x] Drift Guard 도입 (drift-guard init)

### Phase 8: PRO 페이월 (2026-03-14)
- [x] Zustand `isPro` + `chatbotCredits` 전역 상태 (subscriptionStore.ts)
- [x] PaywallBottomSheet.tsx — 라이트 전용 바텀시트 UI
- [x] 컨시어지 일일 3회 제한 + 페이월 연동
- [x] 시크릿 포인트 조회 시 페이월 연동
- [x] Firebase Analytics 이벤트 로깅 (paywall_impression, cta_click, dismiss)

### Phase 9: 실시간 함대 레이더 (2026-03-15)
- [x] AIS 동적 위치 + 정적 톤수 MMSI 조인 API (/api/fleet)
- [x] Heatmap & Tonnage Marker 시각화 + 프리미엄 상세 시트 (2x2 그리드, 스피드 게이지)
- [x] 대형선 반경 500m 회피 소형선 밀집지 추출 알고리즘
- [x] GPS 기반 대형선 근접 푸시 알림 (프론트엔드 목업)

</details>
