# 앱 정합성 GOAL 실행 문서 (4차)

작성 2026-08-28. `docs/app-integrity-improvements.md`를 실행 가능한 GOAL로
변환. 1차(booking)·2차(booking C)·3차(기억×예보) 전부 DONE. **이 문서 +
한 줄 명령이면 구현→검증→기록까지 진행**된다.

배경: `central/rules/goal-loop-execution-pattern.md`.

## 한 줄 명령 사용법

| 명령 | 동작 |
|------|------|
| `다음 GOAL 실행` | 아래 상태표에서 첫 번째 TODO를 공통 프로토콜로 수행 |
| `GOAL-N 실행` | 지정 GOAL만 수행 (의존 GOAL이 TODO면 먼저 보고) |
| `/loop 다음 GOAL 실행` | GOAL 연속 수행. 종료: 전부 DONE, BLOCKED, 또는 6회 반복 — 먼저 오는 것 |

## 공통 실행 프로토콜 (1~3차와 동일)

1. **구현** — CLAUDE.md 11단계 파이프라인 순서 엄수
2. **검증 게이트**: `npm run lint` 에러 0 → `npx vitest run` 전체 통과(신규 로직 유닛 필수) → `npx playwright test` 해당 spec 통과(수용 기준 e2e, 얕은 단언 금지) → `npm run build` 에러 0
3. **실패 시** — 수정 후 재검증, GOAL당 최대 3회 초과 시 `GOAL-N BLOCKED: <사유>` 보고 후 정지
4. **커밋** — Conventional Commits, GOAL당 논리 단위
5. **독립 검토** — `z-ai/glm-5.3-flash`(ox.py 기본)로 diff 리뷰, 반영/반박 근거 기록, 7/10 문턱
6. **배포·확인** — `vercel --prod` → 라이브 200 + 해당 화면 스크린샷
7. **상태표 갱신** — DONE + 증거
8. **완료 토큰** — `GOAL-N DONE`

## 상태표

| GOAL | 항목 | 의존 | 상태 | 증거 |
|------|------|------|------|------|
| 1 | 어종 목록 정합 (I1) | — | DONE | 커밋 f4f01b4(본체)+1커밋(리뷰 반영). FISH_SPECIES에 주꾸미·갑오징어 추가(규정DB 금어기 어종인데 기록 폼에서 선택 불가하던 구멍 — 3차 GOAL-6 e2e 작성 중 발견된 그 불일치). 홈·기록목록의 값까지 동일한 FISH_COLORS 복제 2벌을 src/lib/fishColors.ts로 통합 — Record<(typeof FISH_SPECIES)[number], string> 타입이라 어종 추가 시 색 누락이면 컴파일 에러(첫 방어선) + 유닛 커버 검사(이중). 미등록 자유 입력 어종 폴백 명시, 폴백 톤 통일 의도 문서화. 유닛 300/300(신규 4: 전 어종 커버, 색 중복=복붙 사고 검사, 폴백, 신규 어종 고정). e2e 신규 1(주꾸미 선택→금어기 경고 — 규정 지킴이 커버 실확장 증명). 교차검수(z-ai/glm-5.3-flash, $0.0015, Approve with comments) 반영 3건(캐스트 의도 주석, 폴백 통일 문서화, 색 중복 검사), 반박 2건(9/1 무경고 경계는 유닛이 커버+"항상 경고 아님"은 기존 e2e 무경고 저장 경로 2개가 e2e 레벨 커버, '직접 입력'과 기본 경로는 같은 폼·같은 셀렉트라 별도 커버 불요). 후속 제안 채택 안 함 1건(FishSpecies가 string 유니온이라 사실상 비강제 — 규정DB 매핑 타입 강제는 보류 목록). 라이브(https://bite-log-three.vercel.app/record) 200, 어종 옵션 14종 확인+주꾸미 금어기 경고 렌더(screenshots/goals4/goal1/live-jukumi-guard.png) |
| 2 | 금어기 해제 D-3 알림 실화 (I2) | 1 | TODO | |
| 3 | 설정 정직화 (I3) | — | TODO | |
| 4 | 피드 정직화 (I4) | — | TODO | |
| 5 | 죽은 코드·거짓 문구 대청소 (I5) | 2 | TODO | |
| 6 | PWA 정합 (I6) | — | TODO | |

상태표가 단일 진실이다. 진행 상황을 표 밖에 두지 않는다.

## GOAL 정의

### GOAL-1 · 어종 목록 정합 (I1)

- **범위**: `FISH_SPECIES`(types/index.ts)에 주꾸미·갑오징어 추가(규정DB
  14종 중 기록 폼에서 선택 불가하던 핵심 어종 — '기타'는 유지). 홈
  `page.tsx`와 `records/page.tsx`에 중복 정의된 `FISH_COLORS`를
  `src/lib/fishColors.ts` 한 곳으로 통합하고 신규 어종 포함 전 어종
  커버 + 미등록 어종 폴백 색 명시. 규정 지킴이(catchLegality)·시즌
  리마인더가 새 어종에서 실제로 작동하는지 확인.
- **수용 기준**: ① 기록 폼 어종 선택지에 주꾸미·갑오징어 ② 주꾸미를
  금어기 날짜로 저장 시도 → 규정 경고 렌더(3차 GOAL-6 기능이 커버 확장)
  ③ FISH_COLORS 정의가 소스에 정확히 1곳 ④ 어떤 어종이든 색 폴백 보장
- **검증**: 유닛 — 색 매핑 전 어종 커버·폴백. e2e — 기록 폼에서 주꾸미
  선택→금어기 경고(고정 날짜). grep — FISH_COLORS 정의 1곳.
- **회귀**: 기존 기록(12종) 렌더·통계 색 불변. record-legality 기존 e2e.

### GOAL-2 · 금어기 해제 D-3 알림 실화 (I2) — 의존: GOAL-1

- **범위**: `src/lib/seasonOpenAlert.ts`(순수, 시간 주입) — 규정DB의
  closedSeason 어종별 해제일(end 다음날) 계산(연말 경계 포함), D-3~D-0
  창 판정, `getAutoDetectedPrefs(records)`(openRunAlertService에 이미
  구현된 상위 어종 추출)와 교차해 "내 어종"만, 어종·연도별 1회 발화
  dedupe(localStorage 마커, 지난 항목 정리). `AppInitializer`에서 앱 열
  때 1회 검사 → `sendLocalNotification`("주꾸미 금어기가 3일 뒤
  해제돼요 (9/1)"). 권한 없으면 조용히 생략.
- **수용 기준**: ① 시간 주입 시 D-3~D-0 창에서만 알림 대상 ② 같은
  날/시즌 재방문 시 재발화 없음 ③ 기록에 없는 어종은 대상 아님
  ④ closedSeason 없는 어종 무시
- **검증**: 유닛 — 해제일 계산(12/31 경계), 창 판정, dedupe, 어종 매칭.
  e2e — 기록+clock 고정+notifications 권한 부여로 앱 열기 → dedupe
  마커 기록됨(발화의 관찰 가능한 흔적) + 재로드 시 마커 불변.
- **회귀**: 기록 없는 사용자·권한 거부 상태에서 무동작. AppInitializer
  기존 초기화(테마·SW·오프라인 큐) 불변.

### GOAL-3 · 설정 정직화 (I3)

- **범위**: 설정의 알림 토글 3개를
  `pushNotificationService.getNotificationPreferences()/saveNotificationPreferences()`
  (fishlog_notification_prefs — 실제로 읽히고 강제되는 키)로 연결하고
  죽은 biteLog_notif_* 키 제거. quietHours(이미 sendLocalNotification이
  강제함) 시작/종료 시간 UI 노출. "조과 기록 초기화"를
  `getDataService()` 경유로 바꿔 로그인 사용자에게도 실동작하게 하고
  (dataService에 삭제 메서드 없으면 추가), 지우는 항목(기록·알림
  구독·좋아요·브리핑 예약·오프라인 큐)을 확인 다이얼로그에 열거 후 실제
  삭제. "내 데이터 전부 내려받기" — 기록+알림 구독+동출 글 등 로컬
  데이터를 JSON 1파일로.
- **수용 기준**: ① 토글 변경 → fishlog_notification_prefs에 반영, 끈
  항목의 알림이 발송 함수에서 실제 차단 ② quietHours 변경 저장 ③ 초기화
  실행 → 열거된 localStorage 키 전부 삭제(로그아웃 상태 기준; 로그인
  경로는 dataService 호출로 코드 검증) ④ 내려받기 → JSON 파일 다운로드
- **검증**: 유닛 — prefs 저장/차단 판정, 내보내기 페이로드 조립. e2e —
  토글→키 반영, 초기화→키 삭제, 다운로드 이벤트 발생.
- **회귀**: 기존 설정(테마·로케일·로그인) 동작 불변.

### GOAL-4 · 피드 정직화 (I4)

- **범위**: 댓글 작성자 하드코딩("me","나") 제거 — 로그인 사용자는
  displayName/uid, 비로그인은 동출 모집(2차 GOAL-3) 전례대로 익명
  인증(ensureAuthUid) uid + "익명 낚시인" 표시(rules의 auth 요구와 UI를
  일치시킴 — 익명 댓글 허용이 rules 계약 안에서 가능함을 확인하고,
  필요하면 comments rules를 companionPosts 수준으로 정비 후 배포).
  N+1 제거 — publishToFeed가 commentCount:0을 쓰고 addComment가 부모
  commentCount를 increment, getPublicFeed는 아이템별 댓글 getDocs를
  하지 않으며 댓글은 아이템 펼칠 때만 로드(기존 getComments — 현재
  0 importer — 를 실사용).
- **수용 기준**: ① 남이 볼 때 댓글 작성자가 "나"가 아니라 작성자
  표시명 ② 피드 목록 로드 시 Firestore 읽기가 아이템당 1회가 아님(1
  쿼리+펼친 아이템만) ③ 댓글 수 표시 정확(증분 반영)
- **검증**: 유닛 — 표시명 결정·카운트 증분 로직(순수부). e2e — 동출
  모집 전례의 자가 정리 왕복(익명 인증으로 내 피드 글 publish→댓글→
  표시명 단언→글 삭제) 또는 로컬 dev 실왕복이 어려우면 최소 폼
  게이트·표시명 렌더 검증 + 라이브 검증에서 실왕복.
- **회귀**: 기존 피드 렌더·좋아요·필터 e2e/동작 불변. 기존 댓글(구
  스키마, count 없음) 표시 정상.

### GOAL-5 · 죽은 코드·거짓 문구 대청소 (I5) — 의존: GOAL-2

- **범위**: 0-importer 삭제(재확인 후): noticeParserService,
  viralGearService, fishingIndexService + `/api/fishing-index`,
  seasonForecastService, aiRateLimiter. `/alerts` "어떻게 작동하나요?"
  문구를 실동작(수동 구독 + GOAL-2 금어기 해제 알림 + 포그라운드 한정)
  에 맞게 재작성 — 실행된 적 없는 공지 파서 설명 제거. 미태그 mock에
  @mock-data 태그: conciergeService 지식베이스 4개,
  affiliateService.GEAR_DATABASE, tideService.getMockTideData.
  getMockTideData가 4개 실패 경로에서 **무표시**로 반환되는 조용한
  가짜 — TideData에 mocked 플래그를 달아 홈·bite-forecast·기록 저장의
  물때 표시에 "예시" 배지(뉴스 페이지 관행), 기록 저장 시에는 mock
  물때를 저장하지 않음(가짜 데이터가 통계·조건표를 오염시키지 않게).
- **수용 기준**: ① 삭제 파일 참조 0 + 빌드 그린 ② /alerts 문구에 공지
  파서 언급 없음, 실동작 설명 존재 ③ mock 물때 사용 시 화면에 "예시"
  표시 ④ mock 물때가 CatchRecord.tide로 저장되지 않음
- **검증**: grep(삭제 심볼 0), 유닛 — mock 플래그 전파·저장 제외. e2e —
  /alerts 문구, 물때 API 실패 mock 주입 시 "예시" 배지.
- **회귀**: 물때 실데이터 경로 표시 불변. 전체 스위트.

### GOAL-6 · PWA 정합 (I6)

- **범위**: `public/manifest.json` theme_color/background_color를 실제
  다크 팔레트(#080d14)로(설치 스플래시 흰 번쩍임 제거). `public/sw.js`
  STATIC_PAGES에 /booking·/trip-plan·/catch-value·/fishdex·/alerts 추가
  + 캐시 버전 올림. A2HS — beforeinstallprompt 캡처 훅 + 설정 페이지에
  "홈 화면에 추가" 버튼(이벤트 없으면 버튼 숨김 — iOS 등).
- **수용 기준**: ① manifest 색이 #080d14 계열 ② sw.js가 해당 라우트
  포함+버전 증가 ③ beforeinstallprompt 발생 시 설치 버튼 노출·클릭 시
  prompt() 호출, 미발생 시 버튼 없음
- **검증**: e2e — manifest/sw.js를 fetch해 내용 단언, 설치 버튼은
  CustomEvent('beforeinstallprompt') 시뮬레이션으로 노출·호출 검증.
- **회귀**: SW 업데이트 후 기존 페이지 캐시 동작(스킵 웨이팅 정책
  유지), 오프라인 큐 불변.

---

## 루프 안전 (중앙 규칙 준수)

- 반복 상한: 루프 1회 = GOAL 1개, 최대 6회. 무제한 반복 금지.
- GOAL당 수정 재시도 상한 3회 — 초과 시 `GOAL-N BLOCKED` 보고 후 정지.
- 종료 토큰: 전 GOAL DONE 시 `ALL GOALS DONE`, 차단 시 `GOAL-N BLOCKED: <사유>`.
- 상태는 이 문서의 상태표가 단일 진실.
