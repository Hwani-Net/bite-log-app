# BITE Log — Project Context

> **최종 갱신**: 2026-03-14 (현재)
> **경로**: `e:/AI_Programing/Fishing/fish-log`
> **서버**: `npm run dev -- -p 3013`
> **Firebase**: `bite-log-app` (hwanizero01@gmail.com, admin@gpt-korea.com) → https://bite-log-app.web.app

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

## 🚫 Anti-Scope (절대 안 만들 것)

- ❌ 선사 예약/결제 직접 처리 (링크 연결만)
- ❌ 실시간 채팅/커뮤니티 (밴드/카페가 이미 있음)
- ❌ 하드웨어 연동 (어탐기, 전동릴)
- ❌ 데스크톱 앱 (모바일 PWA 전용)
- ❌ 자체 지도 엔진 (카카오맵 연동만)

---

## 📊 현재 진행률: 100% 🎉

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 기반 | 리브랜딩, 홈 디자인, 라이트 통일 | ✅ 완료 |
| 2 API | 날씨, 조류, 뉴스, AI 컨시어지 | ✅ 완료 |
| 3 핵심기능 | 조과등록 고도화, Auth, 랭킹 | ✅ 완료 (3A+3B+3C) |
| 4 배포 | PWA, TWA, 플레이스토어 | ✅ 완료 |
| 5 LLM | 공지파서, 시즌예측, 바이럴, 알림, 챗봇 | ✅ 완료 (5/5) |
| 6 승선명부 | 해수부 API, 지오펜싱 | ✅ API 연동 완료 (지오펜싱 잔여) |
| 7 UX 폴리시 | AI 탭 UI, 피크 타임라인, SEO | ✅ 완료 |

---

## ✅ TODO

### Phase 3A: 조과 등록 고도화 (`/record`)
- [x] 사진 촬영 → AI 어종 자동 인식 (4-Step Wizard 구현, Mock 펴백)
- [x] 위치 자동 탐지 (GPS)
- [x] 입력 UX 개선 (스텝 폼)

### Phase 3B: Firebase Auth 완성 ✅
- [x] Google 로그인 실제 연동 (signInWithPopup + onAuthStateChanged)
- [x] Local→Firebase 데이터 마이그레이션 (migrateLocalToFirestore 자동)
- [x] 유저 프로필 동기화 (설정 페이지에서 프로필 표시 + 로그아웃)

### Phase 3C: 랭킹 실데이터 ✅
- [x] Firebase publicFeed 기반 리더보드 (getFirebaseRanking)
- [x] LIVE/DEMO 뱃지 표시
- [x] 빈 시즌 empty state
- [x] 내 순위 플로팅 패널 (로그인 시 실제 프로필 사진)
- [x] publishToFeed 실명/프로필 사진 dual-write 수정

### Phase 4: PWA 배포 ✅
- [x] next.config static export
- [x] Service Worker (오프라인)
- [x] TWA → APK → Play Store

### Phase 5: LLM 킬러 피처 ✅
- [x] #1 자연어 공지 파서 (완료 - /tools/notice-parser)
- [x] #2 치어 방류 시즌 예측 (완료 - /season-forecast, 시군 단위 30개 사이트, 해역 탭 리디자인)
- [x] #3 SNS 바이럴 모니터링 (풀버전) — /viral-gear + 홈 위젯
- [x] #4 맞춤 오픈런 알림 — /alerts (구독 CRUD + 규칙 매칭 + 시뮬레이션)
- [x] #9 어종별 전문가 챗봇 — /concierge 하단 통합 (어종칩+Quick Reply+자유입력)

### Phase 5+: 추가 개선 (Phase 5 이후 완료)
- [x] 뉴스 관련성 필터 (50+ 낚시 키워드 기반)
- [x] 뉴스 소스 필터 (blog/news/youtube 분리)
- [x] 시즌 예측 페이지 전면 리디자인 (카드 시트 + 방류 테이블)
- [x] Windy 날씨 7일 예보 탭
- [x] 뉴스 이미지 중복 수정 (그라디언트 배경 분화)

### Phase 8: PRO 페이월 테스트 (수익화 가설 검증) 🆕
- [ ] Zustand 전역 상태에 `isPro` 및 무료 체험 횟수(예: `chatbotCredits`) 추가
- [ ] 프리미엄 페이월(Paywall) 바텀시트 UI 컴포넌트 생성 ("PRO 버전 사전 예약 시 1개월 무료")
- [ ] 컨시어지(전문가 챗봇) 일일 3회 제한 로직 및 페이월 연동
- [ ] 시크릿 포인트(예: 잘 잡히는 구체적 좌표 등) 조회 시 페이월 연동
- [ ] 페이월 CTA 클릭 시 Firebase Analytics 이벤트 로깅 (전환율 측정용)

### Phase 7: UX 폴리시 (2026-03-10~11)
- [x] AI 탭 채팅창 높이 최적화 — flex-1 + calc(100dvh) 동적 높이 (2026-03-10)
- [x] AI 마스터 탭 헤더 잘림 버그 — requestAnimationFrame scroll-to-top (2026-03-10)
- [x] AI 마스터 탭 FAB 겹침 해결 — chat 탭 FAB 숨김 (2026-03-10)
- [x] FAB 버튼 데드링크 수정 — 포인트추천→/bite-forecast, 조황리포트→/stats (2026-03-10)
- [x] 24시간 피크 타임라인 (C안) — getPeakFishingWindows() + PeakTimeline 컴포넌트 (2026-03-11)
- [x] 어종별 피크타임 반영 — 어종 시간 선호도 배열 + 피크 타임라인 필터 칩 (2026-03-11)
- [x] **피크타임 v2 알고리즘** — A안(Split Independent) 채택. 환경/조석/어종 독립 채널 가중합. 10어종 계절별 seasonalActivity 데이터 (2026-03-11)
- [x] 피크 카드 터치 드래그 스크롤 — useDragScroll + data-peak-cards webkit 스크롤바 숨김 (2026-03-11)
- [x] NLM 리서치 적재 — `peaktime` 노트북 (ce527c4c), 7개 소스 (2026-03-11)
- [x] 피크카드 버그 수정 — 골든타임 존재 시 peak+good 카드 숨김 문제 해결 (2026-03-11)
- [x] 프로덕션 빌드 재검증 — `next build` 0 errors, 25페이지 정적 생성, pentagonal-audit 92/100 PASS (2026-03-11)
- [x] 프로젝트 감사 (`/감사 프로젝트`) — 8항목 중 4 PASS / 1 FAIL(SEO og태그) / 3 SKIP → **등급 B** (2026-03-12)
- [x] SEO og 태그 추가 — layout.tsx openGraph/Twitter/metadataBase + og-image.png 생성 (2026-03-12)
- [x] **Play Store 업데이트 배포** — versionCode 9, internal 트랙, Firebase 호스팅 최신화 포함 (2026-03-14)

### 🔴 남은 TODO (우선순위 순)
- [x] Gemini API 403 해결 (AI Studio 전용 키 발급, .next 캐시 클리어)
- [x] 프로덕션 빌드 (2026-03-03 성공, 에러 0, 24페이지)
- [x] Play Store 업데이트 — 자동 배포 파이프라인 완성 (`scripts/deploy-to-play.mjs`, 2026-03-04)
- [x] 이용약관 보강 (7조→13조, 이메일 수정, 개인정보방침 연계)
- [x] 홈 시즌 예측 위젯 업데이트 (fishSeasonDB 동적 데이터 + 어종 칩)
- [x] 물때+날씨 상세 예측 페이지 (/bite-forecast — 점수 링, 4요소 분석, 조석 타임라인, 팁)
- [x] 실시간 조황 대시보드 (/live-dashboard — 전국 요약, 해역별, 어종 랭킹, 뉴스 티커)
- [x] 음성 기록 (Tier 3 #11) — Web Speech API, 음성 파싱, 리뷰 패널, 폼 자동채움 (2026-03-04)
- [x] 낚시 DNA 분석 — /stats DNA 탭, 아키타입 히어로 카드, 2x2 통계, 개선 포인트 (2026-03-04)
- [x] 금어기 법규 QA (Tier 3 #10) — /regulations 페이지, 14어종 규정 DB, 적법성 체크 위젯 (2026-03-04)
- [x] 🚀 프로덕션 최종 검증 (랄프 테스트 E2E) 완료 — 전 라우트 에러 0건 (2026-03-10)
- [x] 어종별 피크타임 — 어종 시간 선호도 × 조석 피크 (2026-03-11)
- [x] 피크타임 v2 데이터 고도화 — 부족 5종 리서치 + NLM 교차검증 완료. 광어 해질녘 미세보정 (2026-03-11)

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

### Phase 1: 기반 (완료)
- [x] FishLog → BITE Log 리브랜딩
- [x] 매거진 라이트 스타일 홈 디자인
- [x] 전체 페이지 라이트 스타일 통일 (13개 파일, dark: 408개 제거)
- [x] 데모 데이터 실사화 (어종별 AI 생성 이미지, 동적 날짜 5개)
- [x] 데이터 초기화 버튼 (설정 > 데이터 관리)
- [x] BottomNav 라이트 전용 통일
- [x] 다국어 지원 (ko/en) + 테마 설정
- [x] Hydration 깜빡임 해결 (스켈레톤)

### Phase 2: API 연동 (완료)
- [x] 날씨 API (OpenWeather)
- [x] 조류 API (KHOA, CORS 프록시)
- [x] 낚시 뉴스 (네이버 + YouTube mock)
- [x] AI 컨시어지 (날씨+물때+트렌드)
- [x] 쿠팡파트너스 어필리에이트
- [x] 입질 시간 예측 (HeroCard)
- [x] Firebase 프로젝트 셋업
- [x] YouTube API graceful 폴백

</details>
