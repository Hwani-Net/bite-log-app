# BITE Log — Project Context

> **최종 갱신**: 2026-03-03 (13:10 KST)
> **경로**: `e:/AI_Programing/Fishing/fish-log`
> **서버**: `npm run dev -- -p 3002`

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

## 📊 현재 진행률: ~75%

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 기반 | 리브랜딩, 홈 디자인, 라이트 통일 | ✅ 완료 |
| 2 API | 날씨, 조류, 뉴스, AI 컨시어지 | ✅ 완료 |
| 3 핵심기능 | 조과등록 고도화, Auth, 랭킹 | ✅ 완료 (3A+3B+3C) |
| 4 배포 | PWA, TWA, 플레이스토어 | ✅ 완료 |
| 5 LLM | 공지파서, 시즌예측, 바이럴, 알림, 챗봇 | ✅ 완료 (5/5) |
| 6 승선명부 | 해수부 API, 지오펜싱 | ⚠️ UI만 완료 |

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

### Phase 6: 전자승선명부
- [x] 승선자 프로필 입력 및 오프라인 QR 승선권 발급 UI (/boarding)
- [ ] 해양수산부 API 연동 신청
- [ ] GPS 지오펜싱 + 선장 대시보드

### 🔴 남은 TODO (우선순위 순)
- [x] Gemini API 403 해결 (AI Studio 전용 키 발급, .next 캐시 클리어)
- [ ] 프로덕션 빌드 & Play Store 업데이트
- [x] 홈 시즌 예측 위젯 업데이트 (fishSeasonDB 동적 데이터 + 어종 칩)
- [x] 물때+날씨 상세 예측 페이지 (/bite-forecast — 점수 링, 4요소 분석, 조석 타임라인, 팁)
- [x] 실시간 조황 대시보드 (/live-dashboard — 전국 요약, 해역별, 어종 랭킹, 뉴스 티커)
- [ ] 금어기 법규 QA (Tier 3 #10)
- [ ] 음성 기록 (Tier 3 #11)

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
