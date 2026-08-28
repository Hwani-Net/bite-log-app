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
| 1 | 프리플라이트 정리 (P1~P4) | — | DONE | 커밋 1074318(본체)+1커밋(리뷰 반영 e2e 보강). ① GPS 파괴 버그 — 상세 편집의 location을 스프레드 병합으로 수정, 다른 동일 패턴 부재를 grep으로 실증(feedService의 {name,region}은 GPS 의도적 제외 설계라 해당 없음). 이미 유실된 과거 데이터는 복구 불가(좌표가 사라진 상태) — 향후 유실만 차단. ② Gemini 키 노출 — 클라이언트 직접 호출을 /api/gemini 프록시로 교체, src에 NEXT_PUBLIC_GEMINI 참조 0 확인(번들에서 키 제거됨), 프록시는 원본 응답·상태코드 패스스루라 파서 호환, 실패 시 폴백 문구는 키 유무가 아니라 일반 실패 문구로 정확. 프로덕션 env에 서버용 GEMINI_API_KEY 존재 확인. 로컬 .env.local엔 서버 키가 없어 로컬 dev에선 AI 요약이 폴백으로 감(로컬 개발 시 GEMINI_API_KEY 추가 필요 — 사용자 안내 사항). Vercel Preview의 NEXT_PUBLIC_GEMINI_API_KEY는 참조 0이므로 제거 가능(사용자 결정 대기). ③ components/home 5개+mockData.ts 삭제(-870줄), src에 live-dashboard 참조 0 확인, 삭제 후 빌드 그린. ④ CLAUDE.md 구조 표 실제 라우트 일치. e2e 신규 1(위치명 변경+메모 변경 후 lat/lng 보존을 데이터 레벨 단언 — 교차검수가 '메모만 바꾸는 초판은 절반 커버리지' 지적해 핵심 케이스로 재작성, id 기반 조회) + 접근성 이름 기반 셀렉터(dev 오버레이 textarea와의 strict 충돌 회피). 교차검수(z-ai/glm-5.3-flash, $0.0020) 반영 2건(핵심 e2e 케이스, saved[0]→find), 반박/실증 4건(다른 편집 경로 부재 grep, 프록시 계약 소스 확인, 폴백 문구 정확성, 삭제 후 빌드 그린). 유닛 264/264, e2e 대상 spec 통과, 빌드 그린. 커밋 정리 실수 1건 자가 수정: git add -A가 스크래치 산출물을 쓸어 담아 리셋 후 의도 파일 10개만 재커밋. 라이브(https://bite-log-three.vercel.app) 200 — 실제 기록의 위치명 변경 후 좌표 보존(36.4396/126.5194 유지) + trip-plan 브리핑이 /api/gemini 프록시 200으로 실제 AI 총평 렌더까지 확인(screenshots/goals3/goal1/live-edit-gps-kept.png, live-briefing-proxy.png) |
| 2 | 기록의 시간·물때 축 + DNA 버그 (M1~M3) | — | DONE | 커밋 0f671cf(본체)+1커밋(리뷰 반영). CatchRecord.caughtTime(HH:mm, optional — 마이그레이션 불요) + /record 시간 입력(기본 지금)·상세 표시·편집. record 폼 date 기본값의 toISOString UTC 함정도 수정(이 버그 클래스 4번째 발견). TideRecordData.currentPhase — 저장 시 계산되고 버려지던 getCurrentPhase().label("들물 3물")을 스냅샷 저장+상세 물때 카드 표시. DNA 버그 2건 수정: bestTide가 관측소 지명을 집계하던 것(항상 "인천"류가 황금 물때) → currentPhase 집계(없는 기록 제외·전무 시 생략), bestTimeSlot이 저장 시각 기반이던 것 → caughtTime 우선·createdAt 폴백+timeSlotEstimated 플래그(/stats에 "일부 추정", 아키타입에도 "(추정)" — 같은 표본에서 나오므로, 리뷰 지적 반영). 유닛 269/269(신규 7: 지명 회귀 방지 not.toBe('보령'), 폴백 혼입 플래그, 형식 불일치 무시). e2e 신규 1(시각 편집 왕복+물때 스냅샷 렌더+편집이 tide를 안 지움 — updateCatchRecord가 필드 병합임을 localStorage.ts 소스와 통과로 실증). 교차검수(z-ai/glm-5.3-flash, $0.0021, Approve with changes) 반영 2건(아키타입 추정 전파, count 가중 의도 주석), 반박 3건(편집 시 tide 유실 — 병합 시맨틱 소스 실증, TideRecordData 축소 손실 — 필드가 애초 2개뿐, caughtTime 시간대 — 로컬 명시 주석 이미 존재). 라이브(https://bite-log-three.vercel.app/stats?tab=dna) 200, 시딩 후 "새벽형 갯바위 낚시인 (추정)"+"새벽 04~06시 80% · 일부 추정"+"황금 물때 들물 3물"(지명 회귀 false 확인) 스크린샷(screenshots/goals3/goal2/live-dna-fixed.png) |
| 3 | 나의 조건표 (M4) | 2 | DONE | 커밋 55282ba(본체)+1커밋(리뷰 반영). src/lib/conditionStats.ts — 순수 집계(기온 4구간/풍속 3구간/물때 phase 그룹), best는 표본 3회(MIN_SAMPLES) 이상 구간만(1회 요행 승격 방지), 축별 결측은 그 축에서만 제외, NaN은 Number.isFinite로 거부(리뷰 지적 — typeof만으론 NaN이 "10°C 미만"으로 새어듦). 기록에 저장된 게 수온이 아니라 기온임을 라벨로 정직하게. tempBucket/windBucket export — GOAL-4의 오늘 조건 매칭이 재사용. /stats 패널: 축별 최고 조건+구간 칩(표본 부족 칩은 흐림 처리하되 수치 공개, best 없으면 "구간당 3회 이상" 안내 — 리뷰 지적으로 lib 계약과 UI 일치화), locale 축 이름, ul/li 시맨틱, 대비 상향. 유닛 276/276(신규 7: 경계값 10/17/24·4/8 정밀, NaN 거부, 표본 하한, 축별 탈락). e2e 신규 3(실수치 단언 "17~24°C 평균 4마리", 표본 2회 축은 칩만+안내, 조건 전무 시 3축 빈 상태). 교차검수(z-ai/glm-5.3-flash, $0.0011) 반영 7건(NaN·locale·계약 일치·흐림·ul·대비·정확 단언), 반박 2건(Tailwind /4·/8은 v4+코드베이스 기존 관행으로 실렌더 확인, e2e 15s 타임아웃은 dev 컴파일 지연 대비 스위트 관행). 라이브(https://bite-log-three.vercel.app/stats) 200, 시딩 후 3축 전부 실수치 렌더+요행 구간 흐림 스크린샷(screenshots/goals3/goal3/live-condition-table.png) |
| 4 | 예보×내 기록 (M5) | 3 | DONE | 커밋 593124e(본체)+1커밋(리뷰 반영). matchTodayConditions — 오늘 조건(기온·풍속·물때)이 속한 구간의 내 과거 실적 조회, 표본 3회 미만 구간은 반환 안 함(빈 결과 = 스트립 미표시, 추정 날조 금지 계약). /bite-forecast "내 기록 기준" 스트립(예보 클러스터 최초의 CatchRecord 소비자), 홈 배너 개인 결합 줄(주력 어종·오늘 점수·스트릭/최강 달 — 계산돼 놓고 버려지던 프로필 필드 활용). **부수 발견·수정: 앱 전체 풍속 단위 버그** — weatherService가 open-meteo 기본 단위(km/h)를 m/s로 표기·저장(biteTime 임계는 의미상 m/s라 바람을 1.6~2.8배 과대평가해 옴). wind_speed_unit=ms로 수정+URL 회귀 유닛 고정. 교차검수(z-ai/glm-5.3-flash, 1차 빈응답 후 재시도 $0.0039 합계)가 혼재 데이터 문제를 정확히 지적 → WIND_UNIT_FIX_DATE(2026-08-28) 컷오프: 정정 전 저장분의 풍속은 실강풍과 구분 불가라 변환 대신 풍속 축에서 제외(기온·물때 무영향, 오염 표본으로 구간 채우기보다 정직) + 컷오프 유닛 케이스. 그 외 반영 4건(non-null 제거·useMemo·물때 라벨 결합 주석·소수 평균/얇은 물때 케이스), 반박 2건(avgCount는 이미 1자리 반올림 — 테스트로 증명, storage 키 하드코딩은 스위트 전체 관행). 유닛 283/283, e2e 신규 3(주입 조건=mock 예보 일치 시 실수치, 기록 없음 미표시, 배너), 빌드 그린. 라이브(https://bite-log-three.vercel.app/bite-forecast, /) 200 — **실예보 대조**로 스트립("오늘 같은 기온 구간(24°C 이상)에서 평균 4마리 · 3회 기록"+풍속 축)과 배너("주력 우럭 · 오늘 조건 65점 · 8월이 최강") 확인(screenshots/goals3/goal4/) |
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
