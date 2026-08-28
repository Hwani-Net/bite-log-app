# 기억×예보 GOAL 실행 문서 (3차)

작성 2026-08-28. `docs/memory-forecast-improvements.md`를 실행 가능한 GOAL로
변환한 문서. 1차(booking-goals.md)·2차(booking-goals-2.md)는 전부 DONE.
**이 문서 + 한 줄 명령이면 구현→검증→기록까지 진행**된다.

배경: `central/rules/goal-loop-execution-pattern.md`.

## 한 줄 명령 사용법

| 명령 | 동작 |
|------|------|
| `다음 GOAL 실행` | 아래 상태표에서 첫 번째 TODO를 공통 프로토콜로 수행 |
| `GOAL-N 실행` | 지정 GOAL만 수행 (의존 GOAL이 TODO면 먼저 보고) |
| `/loop 다음 GOAL 실행` | GOAL을 연속 수행. 종료 조건: 상태표 전부 DONE, 또는 BLOCKED 발생, 또는 6회 반복 도달 — 셋 중 먼저 오는 것 |

## 공통 실행 프로토콜 (1·2차와 동일)

1. **구현** — CLAUDE.md 11단계 파이프라인 순서 엄수
2. **검증 게이트**: `npm run lint` 에러 0 → `npx vitest run` 전체 통과(신규 로직 유닛 필수) → `npx playwright test` 해당 spec 통과(수용 기준 검증 e2e 추가, 얕은 단언 금지) → `npm run build` 에러 0
3. **실패 시** — 수정 후 재검증, GOAL당 최대 3회 초과 시 `GOAL-N BLOCKED: <사유>` 보고 후 정지
4. **커밋** — Conventional Commits, GOAL당 논리 단위
5. **독립 검토** — `z-ai/glm-5.3-flash`(ox.py 기본 모델)로 diff 리뷰, 반영/반박 근거 기록, 7/10 문턱
6. **배포·확인** — `vercel --prod` → 라이브 200 + 해당 화면 스크린샷
7. **상태표 갱신** — DONE + 증거(커밋 해시, 검증 요약)
8. **완료 토큰** — `GOAL-N DONE`

## 상태표

| GOAL | 항목 | 의존 | 상태 | 증거 |
|------|------|------|------|------|
| 1 | 프리플라이트 정리 (P1~P4) | — | TODO | |
| 2 | 기록의 시간·물때 축 + DNA 버그 (M1~M3) | — | TODO | |
| 3 | 나의 조건표 (M4) | 2 | TODO | |
| 4 | 예보×내 기록 (M5) | 3 | TODO | |
| 5 | AI·PRO 정직화 (M6+M7) | — | TODO | |
| 6 | 기록 시점 규정 지킴이 (A1) | — | TODO | |

상태표가 단일 진실이다. 세션이 바뀌어도 이 표만 읽으면 이어서 실행 가능해야
한다 — 진행 상황을 표 밖에 두지 않는다.

## GOAL 정의

### GOAL-1 · 프리플라이트 정리 (P1+P2+P3+P4)

- **범위**: ① `records/detail/page.tsx` 편집 저장의 location 덮어쓰기를
  `{...record.location, name}` 병합으로 수정(GPS 보존) ② `preTripBriefingService.ts`의
  generativelanguage.googleapis.com 직접 호출을 기존 `/api/gemini` 프록시
  경유로 교체(클라이언트 키 노출 제거) ③ `src/app/components/home/` 5개
  파일과 `src/data/mockData.ts` 삭제(0 importer 실측 재확인 후) ④ CLAUDE.md
  앱 구조 표 갱신(live-dashboard 제거, trip-plan/stats/settings/catch-value/fishdex 추가)
- **수용 기준**: ① 좌표 있는 기록의 제목만 편집 저장 → lat/lng 유지
  ② `src/` 클라이언트 코드에 generativelanguage 직접 호출 0건(grep)
  ③ 삭제 파일 참조 0, 빌드 통과
- **검증**: e2e — 위치 좌표를 가진 기록 주입 → 상세 편집(메모 변경) 저장 →
  localStorage에서 lat/lng 보존 단언. grep 게이트(generativelanguage, components/home).
  유닛 — 기존 스위트 전체(삭제 회귀 감지).
- **회귀**: 기존 e2e 전체 통과. trip-plan 브리핑 생성 흐름이 프록시 경유로
  동작(AI 요약 실패 시 기존 폴백 문구 유지 확인).

### GOAL-2 · 기록의 시간·물때 축 + DNA 버그 (M1+M2+M3)

- **범위**: `CatchRecord.caughtTime?: string`("HH:mm", optional — 옛 기록
  마이그레이션 불요) 추가, /record 폼에 시간 입력(기본 = 현재 시각, 사진
  EXIF는 범위 밖), /records/detail 표시·편집. `TideRecordData.currentPhase?: string`
  — 저장 시 이미 계산되는 `getCurrentPhase()` 결과를 함께 저장.
  `fishingDnaService`: bestTide가 stationName(지명)을 집계하는 버그를
  currentPhase 기반으로 수정(phase 없는 기록은 집계 제외, 전부 없으면 항목
  생략), bestTimeSlot을 caughtTime 우선·createdAt 폴백으로 바꾸고 폴백 표본이
  섞이면 "추정" 라벨.
- **수용 기준**: ① 새 기록에 잡은 시각 저장·상세 표시 ② 새 기록에 물때
  표기(N물/조금/사리) 저장 ③ DNA의 최고 물때가 지명이 아니라 물때 ④ 필드
  없는 옛 기록도 화면·통계 정상(빈 값 처리)
- **검증**: 유닛 — DNA 수정 로직(fixture: caughtTime 유무 혼재, phase 유무
  혼재, 지명 회귀 케이스). e2e — 기록 생성 시 시간 입력 → 상세에서 시각
  표시 단언.
- **회귀**: 기존 record/records/stats 관련 테스트 전체. 옛 스키마 기록
  주입 시 렌더 정상.

### GOAL-3 · 나의 조건표 (M4) — 의존: GOAL-2

- **범위**: `src/lib/conditionStats.ts` — CatchRecord[]에서 저장된
  수온(marine/weather)·풍속·물때를 구간화(수온 4구간, 풍속 3구간, 물때
  그룹)해 구간별 {기록 수, 평균 마릿수} 집계(순수 함수, 조건 결측 기록은
  해당 축에서 제외). /stats에 "나의 조건표" 패널 — 축별 최고 구간 하이라이트
  + 표본 수(회) 명시, 표본 부족(<3회) 축은 "기록이 쌓이면" 빈 상태.
- **수용 기준**: ① 조건 데이터 있는 기록 주입 시 구간별 평균·표본 수 표시
  ② 조건 데이터 없는 기록만 있으면 축별 빈 상태 ③ 기록 0건이면 패널 안내만
- **검증**: 유닛 — 구간 경계값·결측 제외·평균 계산. e2e — localStorage 주입
  → /stats 패널의 실제 수치 텍스트 단언.
- **회귀**: 기존 stats 5개 탭 렌더.

### GOAL-4 · 예보×내 기록 (M5) — 의존: GOAL-3

- **범위**: /bite-forecast에 "내 기록 기준" 스트립 — 오늘 조건(수온·풍속·
  물때)이 속한 구간의 내 과거 실적을 conditionStats로 조회해 "이 조건에서
  평균 N마리 (M회 기록)" 표시, 일치 구간 표본 없으면 스트립 미표시(추정치
  날조 금지). 홈 `AIInsightBanner`를 개인 프로필(주력 어종·스트릭)+오늘
  점수 결합 2줄로 업그레이드.
- **수용 기준**: ① 유사 조건 기록 있으면 수치 스트립, 없으면 미표시 ② 홈
  배너에 주력 어종+오늘 점수 결합 문구(기록 없으면 기존 일반 문구 유지)
- **검증**: 유닛 — 오늘 조건→구간 매칭 함수. e2e — 기록 주입 + open-meteo
  route mock으로 오늘 조건 고정 → 스트립 수치 단언 + 기록 없는 컨텍스트
  미표시 단언.
- **회귀**: bite-forecast 기존 렌더(점수 링·타임라인), 홈 기존 섹션.

### GOAL-5 · AI·PRO 정직화 (M6+M7)

- **범위**: `fishExpertChatService`에 프로필 컨텍스트 조립 함수(순수) 추가 —
  `analyzeUserRecords()` 요약(주력 어종·상위 포인트·최고 달·평균 마릿수)을
  시스템 프롬프트에 주입, 기록 없으면 주입 생략. /bite-forecast
  `SecretSpotsSection`의 하드코딩 3개 배열 제거 → 사용자 실기록
  `computeStats().topSpots`×오늘 점수 기반 "나의 포인트" 섹션으로 교체,
  기록 없으면 정직한 빈 상태("기록이 쌓이면 나만의 포인트가 떠요") — 가짜
  유료 콘텐츠 제거가 목적이므로 PRO 게이트 유지 여부는 실기록 기반이 된
  뒤 기존 게이트 그대로.
- **수용 기준**: ① 기록 있는 상태의 채팅 요청 프롬프트에 프로필 요약 포함,
  없으면 미포함 ② 하드코딩 시크릿 포인트 배열 소스에서 제거 ③ 기록 주입
  시 내 상위 포인트 명 렌더, 없으면 빈 상태 문구
- **검증**: 유닛 — 프롬프트 조립(기록 유/무). e2e — 기록 주입 →
  bite-forecast 섹션에 주입한 포인트 명 단언(PRO 게이트 상태는 구현 시
  확인해 게이트 해제 수단을 테스트에 주입).
- **회귀**: 채팅 mock 폴백(Gemini 503) 동작 유지. bite-forecast 나머지 섹션.

### GOAL-6 · 기록 시점 규정 지킴이 (A1)

- **범위**: /record 저장 직전 `isCatchLegal(species, sizeCm, month, day)`
  검사 — 금어기 또는 체장 미달이면 저장 전에 경고 패널(근거 조항·벌칙
  안내 포함, "그래도 저장"/"취소" — 차단이 아니라 보호가 목적, 방류했을
  수도 있으므로). 합법이거나 규정DB에 없는 어종은 경고 없이 기존 흐름.
- **수용 기준**: ① 금어기 어종 저장 시도 → 경고 렌더(조항·벌칙 문구)
  ② 체장 미달 → 경고 ③ 합법 기록은 무경고 저장 ④ "그래도 저장"으로 저장
  가능
- **검증**: 유닛 — 경고 판정 래퍼(금어기 날짜 경계·체장 경계·DB 밖 어종).
  e2e — 금어기 어종(규정DB의 실제 금어기 날짜 기준, 필요 시 clock 고정)으로
  기록 작성 → 경고 텍스트 단언 → 그래도 저장 → 목록 반영.
- **회귀**: 기존 record e2e(합법 기록 무경고 경로).

---

## 루프 안전 (중앙 규칙 준수)

- 반복 상한: 루프 1회 = GOAL 1개, 최대 6회. 무제한 반복 금지.
- GOAL당 수정 재시도 상한 3회 — 초과 시 `GOAL-N BLOCKED` 보고 후 정지.
- 종료 토큰: 전 GOAL DONE 시 `ALL GOALS DONE`, 차단 시 `GOAL-N BLOCKED: <사유>`.
- 상태는 이 문서의 상태표가 단일 진실.
