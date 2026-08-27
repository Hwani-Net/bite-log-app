# booking 2차 GOAL 실행 문서 (C 항목)

작성 2026-08-28. `docs/booking-improvements.md`의 보류(C) 항목을 실행 가능한
GOAL로 변환한 문서. 1차(`docs/booking-goals.md`, 10/10 DONE)의 후속이며,
**이 문서 + 한 줄 명령이면 구현→검증→기록까지 진행**된다.

배경: `central/rules/goal-loop-execution-pattern.md`. 이 문서는 그 패턴의
goals 문서 골격을 이 프로젝트에 맞게 채운 것이다.

C12(플랫폼 간 자동 동일선박 판별)는 **하지 않기로 결정**된 항목 — 이 문서
범위에 없다.

## 한 줄 명령 사용법

| 명령 | 동작 |
|------|------|
| `다음 GOAL 실행` | 아래 상태표에서 첫 번째 TODO를 공통 프로토콜로 수행 |
| `GOAL-N 실행` | 지정 GOAL만 수행 (의존 GOAL이 TODO면 먼저 보고) |
| `/loop 다음 GOAL 실행` | GOAL을 연속 수행. 종료 조건: 상태표 전부 DONE, 또는 BLOCKED 발생, 또는 3회 반복 도달 — 셋 중 먼저 오는 것 |

## 공통 실행 프로토콜 (모든 GOAL 동일 — 1차 문서와 같음)

1. **구현** — CLAUDE.md 11단계 파이프라인 순서 엄수
2. **검증 게이트** (전부 통과해야 다음 단계):
   - `npm run lint` — 에러 0
   - `npx vitest run` — 전체 통과 (신규 로직은 유닛 테스트 동반 필수)
   - `npx playwright test e2e/booking.spec.ts` — 통과 (GOAL의 수용 기준을 검증하는 e2e를 추가한 뒤 실행. 개수 변화만 보는 얕은 단언 금지 — 실제 내용을 단언)
   - `npm run build` — 에러 0
3. **실패 시** — 수정 후 재검증, GOAL당 최대 3회. 3회 실패 시 즉시 중단하고 `GOAL-N BLOCKED: <사유>` 보고 (무한 재시도 금지)
4. **커밋** — Conventional Commits, GOAL당 논리 단위 커밋
5. **독립 검토** — `z-ai/glm-5.3-flash`(OpenRouter, `E:\Orca\Agent\ox-alpha-pilot-20260826\ox.py` 기본 모델)로 GOAL별 diff 리뷰. 지적은 근거 확인 후 반영/반박을 증거 열에 기록. 7/10 문턱 유지
6. **배포·확인** — `vercel --prod` 배포 → 라이브 URL 200 + 해당 화면 스크린샷 확인
7. **상태표 갱신** — 아래 표의 상태를 DONE으로, 증거 열에 커밋 해시 + 검증 결과 한 줄
8. **완료 토큰** — `GOAL-N DONE` 출력. 루프 모드면 다음 TODO로, 아니면 종료

## 상태표

| GOAL | 항목 | 의존 | 상태 | 증거 |
|------|------|------|------|------|
| 1 | 내 위치 거리순 정렬 (C10) | — | DONE | 커밋 21a130d(기능)+후속 1커밋(리뷰 반영). src/data/portCoords.ts — 더피싱 4개 권역 목록에서 실제 수집한 항구 34곳을 OSM Nominatim으로 지오코딩(6곳은 소재지 리 단위 근사, ODbL 표기, 기억이 아니라 실측: 진두항이 기억상 '안면도'가 아니라 실데이터 '영흥도'였음). 동명 항구 안전장치: within 지역 힌트(모항=태안 등 4곳)가 어긋나면 엉뚱한 거리 대신 미등록 취급. src/lib/portDistance.ts — haversine+안정 정렬(미등록은 원래 순서로 뒤, 숨김 없음), 거리순은 sortByVerdict 앞에 적용해 '안 탄다' 하단 유지. 유닛 255/255(신규 8: 대천↔오천 실거리, 한국 bbox sanity로 좌표 오타 클래스 전부 차단, within 거부, 정렬 안정성). e2e 26/26(신규 1: listings API를 fixture로 mock — 라이브 0척인 날 조용히 skip되는 구조를 리뷰 지적으로 제거하고 오천<평택<제주<미등록 정확한 순서+토글 오프 복원 단언). 기존 e2e 2건이 h3 형제 span 로케이터로 깨진 걸 잡아 DOM 형제 구조 유지로 수정. 교차검수(z-ai/glm-5.3-flash, $0.0023) 반영 6건(동명 항구 가드·e2e mock 전환·geoError 토글 정리·role=alert+대비+aria-describedby·bbox 테스트·ODbL), 반박 3건(하버사인 2N 계산은 ≤50척 규모에서 무의미, mount 실패 무음은 의도적 백그라운드 향상, maximumAge 캐시는 거부 상태에선 캐시된 위치 자체가 없음). 라이브(https://bite-log-three.vercel.app/booking) 200, 대천항 좌표 주입 후 거리순 토글 → ~0km(대천항 드림호)→~11km(영목항)→오름차순 정렬+라벨 스크린샷 확인(screenshots/goals2/goal1/live-distance-sort.png) |
| 2 | "예약 가능만 보기" 토글 (C9) | — | DONE | 커밋 01cf49c(기능)+후속 1커밋(리뷰 반영). src/lib/boatAvailabilityFilter.ts 순수 판정 — 확실한 full만 숨김 가능, none/날짜없음/형식오류/요청실패는 전부 unknown으로 계속 표시("확인 불가" 배지, 오탐 숨김 금지 계약), "available인데 잔여 0석" 모순 표기는 full로 방어. 페이지: 옵트인 칩 → 현재 페이지 배들만 기존 /api/boat-calendar를 동시성 3으로 조회, (uid,월) sessionStorage 캐시(리뷰 반영으로 TTL 10분 — 잔여석은 실시간 데이터라 세션 내내 신뢰하면 풀린 마감을 계속 숨김), 재토글 시 unknown만 재시도, 진행 표시 n/total, 잔여 N석 배지, 낚시뚜 미적용 문구. 유닛 260/260(신규 9). e2e 27/27(신규 1: listings+달력 route mock으로 가능/마감/503 3종 한 화면 — full만 숨김·실패 유지·오프 복원·**토글 전 달력 요청 0건**·재토글 시 캐시 재사용을 요청 카운트로 단언). 구현 중 실수 1건을 e2e가 잡음: 새 effect를 searchBoats 선언 위에 넣어 TDZ ReferenceError로 페이지 전체가 죽었는데 e2e 19건 동반 실패로 즉시 발견·수정(선언 아래로 이동). 교차검수(z-ai/glm-5.3-flash, $0.0025) 반영 2건(캐시 TTL, 잔여 0석 방어), 반박 1건(searchDate 빈 상태 키 오염 — 마운트 직후 ms 단위 과도기이고 effect 가드로 쓰기 자체가 불가). 라이브(https://bite-log-three.vercel.app/booking) 200, 실데이터 토글 온 → "잔여 21석"(오디세이호)+"확인 불가" 배지, 안내 문구, 20척 유지(이날 확실 마감 0척) 스크린샷 확인(screenshots/goals2/goal2/live-available-only.png) |
| 3 | 동출 모집 v1 (C11) | — | DONE | 커밋 dbd80bf(기능)+후속 1커밋(리뷰 반영). **소유권 설계를 문서 초안(localStorage 익명 키)보다 강하게 변경**: 기존 rules가 모든 쓰기에 auth를 요구하는 원칙임을 확인하고, Firebase 익명 인증을 프로젝트에 활성화(gcloud Identity Toolkit API로 직접, 가역적)해 비로그인 사용자도 signInAnonymously로 uid를 받아 서버가 authorUid==request.auth.uid로 마감/삭제를 강제. rules: 필드 검증 create(hasOnly로 임의 필드 차단+타입·크기 제한), owner만 status→closed update, owner delete — 배포 완료. v1 공지된 한계(contact 전역 공개·미래 날짜 무제한·rate limit 없음)는 rules 주석에 문서화. UI: /booking 접힘 기본 섹션(열 때만 Firestore 읽기 — lazy 회귀 조건), 작성 폼(배 datalist=검색결과+내 선사 카드, 과거 날짜·연락처 검증), 본인 글 마감/삭제(2단계 삭제, 실패 피드백 — 다른 기기 세션이면 rules가 거부함을 안내), 로드 실패를 빈 게시판으로 위장하지 않는 재시도 UI, 안전 문구. 배 상세엔 where(boatUid==) 단일 쿼리로 그 배 open 글만. 유닛 264/264(신규 6: 오늘 포함 미래 필터, 동일 날짜 tie는 먼저 올린 글 우선, boatUid 필터, 소유권). e2e 29/29(신규 2: **실 Firestore+익명 인증 관통 왕복** — 글 작성→카드 렌더→2단계 삭제로 잔여물 없이 자가 정리, 강화된 rules 아래서 통과했으므로 rules 실검증 겸함; 과거 날짜·연락처 누락 폼 검증). 교차검수(z-ai/glm-5.3-flash, $0.0017)가 치명 버그 발견: orderBy(date asc)+limit(50)만 쓰면 지난 글 50건이 창을 점령해 미래 글이 영영 안 보임 → where(date>=today) 서버 필터로 수정(동일 필드라 복합 인덱스 불요). 그 외 반영 7건(hasOnly·boatUid/port/createdAt 타입 검증·배 상세 단일 쿼리·로드 실패 구분·마감/삭제 피드백·2단계 삭제·접기 토글), 반박 2건(serverTimestamp는 동일 날짜 tie 순서에만 영향이라 v1 보류, load 취소 플래그는 클릭 핸들러라 언마운트 경로가 페이지 이탈뿐). 중간에 라이브 listings 지연으로 기존 e2e 6건이 일시 실패했으나 재실행 전체 통과+직접 프로브 9.8s로 외부 요인 확인(내 변경과 무관). 라이브(https://bite-log-three.vercel.app/booking) 200, 프로덕션에서 실제 글 작성→카드(마감/삭제 버튼 포함) 스크린샷→2단계 삭제→잔여 0까지 왕복 확인(screenshots/goals2/goal3/live-companion-post.png) |

상태표가 단일 진실이다. 세션이 바뀌어도 이 표만 읽으면 이어서 실행 가능해야
한다 — 진행 상황을 표 밖에 두지 않는다.

## GOAL 정의

각 GOAL: 범위 / 수용 기준(관찰 가능) / 검증 / 회귀 케이스.

### GOAL-1 · 내 위치 거리순 정렬 (C10)

- **범위**: `src/data/portCoords.ts` 신설 — 더피싱 areaPath 마지막 세그먼트
  표기와 일치하는 주요 출항지 30~40개 `{ 항구명: { lat, lng } }` 하드코딩
  (서해·남해·동해 주요 항 — 현재 검색 결과에 실제로 나오는 항구 우선).
  `src/lib/portDistance.ts` — haversine, areaPath→좌표 매칭, 거리순 정렬
  (좌표 없는 항구의 배는 원래 순서를 유지한 채 뒤로 — 숨기지 않음).
  /booking 검색 그리드에 "거리순" 정렬 토글 칩: 기존 geolocation 결과 재사용,
  권한 거부·미지원이면 칩 비활성 + 짧은 안내. 카드에 "~NNkm" 표시.
- **수용 기준**: ① 위치 허용 + 거리순 선택 → 보이는 카드가 가까운 항구 순
  ② 각 카드에 거리 라벨 표시 ③ 좌표 미등록 항구의 배는 목록 끝에 원래 순서
- **검증**: 유닛 — haversine(알려진 두 항구 간 거리 근사 단언), 매칭
  (정확 일치·미등록), 정렬 안정성(미등록 배 상대 순서 유지). e2e —
  `context.setGeolocation` + 권한 부여로 위치 모킹 → 거리순 토글 → 카드
  순서와 거리 라벨의 실제 값 단언.
- **회귀**: 거리순 미선택 시 기존 정렬(sortByVerdict의 'never' 하단 처리
  포함) 불변. 위치 거부 시 나머지 화면 동작 불변.

### GOAL-2 · "예약 가능만 보기" 토글 (C9)

- **범위**: /booking 검색 그리드에 옵트인 토글. 켜면 현재 페이지의 더피싱
  배들(페이지당 최대 20척)에 대해 기존 `/api/boat-calendar?uid=&ym=`를
  **동시성 3 + sessionStorage 캐시(같은 uid·월은 세션 내 재사용)** 로
  조회해 searchDate에 잔여석 있는 배만 남긴다. 조회 실패·달력에 그 날짜
  없음인 배는 숨기지 않고 "확인 불가" 배지로 유지(오탐 숨김 금지). 로딩
  중 진행 표시(n/전체). 낚시뚜 디렉터리는 달력 소스가 없으므로 토글 대상
  아님을 문구로 명시.
  **보류 해제 근거**: 보류 사유였던 "목록 20척마다 달력 요청 부하"를
  옵트인(사용자가 켠 경우에만) + 페이지 단위 상한 + 세션 캐시 + 동시성
  제한으로 통제 — 배 상세 진입 시 이미 쓰는 같은 API를 같은 예의로 쓴다.
- **수용 기준**: ① 토글 온 → 해당 날짜 마감 배가 사라지고 잔여석 있는
  배만 남음 ② 확인 실패 배는 "확인 불가"로 계속 표시 ③ 토글 오프 → 전체
  복원 ④ 같은 세션에서 토글 재사용 시 추가 요청 없음(캐시)
- **검증**: 유닛 — 달력 응답→날짜별 가용 판정(잔여석/마감/날짜 없음/
  형식 오류), 캐시 키 로직. e2e — `/api/boat-calendar` route mock으로
  일부 uid만 available 주입 → 토글 후 남는 카드의 배 이름 단언 + 실패
  주입 배의 "확인 불가" 단언 + 토글 오프 복원.
- **회귀**: 토글을 켜지 않으면 달력 요청 0건(기존 요청 수 불변 — e2e에서
  요청 카운트 단언). 기존 키워드·항구·정원 필터와 중첩 동작.

### GOAL-3 · 동출 모집 v1 (C11)

- **범위**: Firestore `companionPosts` 컬렉션 + `src/services/companionService.ts`
  — `{ boatUid?, boatName, port?, date, seatsWanted, note, contact,
  authorKey, authorName, status: 'open'|'closed', createdAt }`.
  작성·소유권은 피드의 기존 익명 관행을 따른다: 로그인 사용자는 uid,
  비로그인은 로컬 익명 키(localStorage 발급)를 authorKey로 저장하고 그
  키가 있는 기기에서만 마감/삭제 노출(강한 보안이 아니라 UX 소유권 —
  피드 좋아요와 같은 수준). 닉네임 입력(기본 '익명 낚시인').
  `firestore.rules`에 companionPosts 규칙 추가(create는 필수 필드 검증,
  update는 status 마감 전이만) 후 `firebase deploy --only firestore:rules`.
  UI: /booking에 "동출 모집" 섹션(open만·예정일 가까운 순, 지난 날짜 자동
  제외, lazy 로드 — 초기 로드 요청에 얹지 않음), 작성 폼(배는 검색 결과/
  내 선사 카드에서 선택 또는 직접 입력, 연락은 오픈채팅 링크 등 자유
  텍스트 + 외부 만남 주의 문구), 배 상세 페이지에 그 배의 open 모집 노출.
  댓글·좋아요·신고는 v1 범위 밖.
- **수용 기준**: ① 작성 → 목록 카드 렌더(배·날짜·모집 인원·연락처)
  ② 작성 기기에서만 마감 버튼 노출, 마감 글은 기본 목록에서 제외
  ③ 지난 날짜 글 자동 제외 ④ 배 상세에서 해당 배 모집 글 노출
- **검증**: 유닛 — 정렬·필터(open/미래 날짜/배별)·소유권 판정 순수 함수.
  e2e — Firestore 실계정 왕복은 로컬 dev에서 실제 저장까지, 어려우면
  최소한 폼 검증·빈 상태·작성 버튼 흐름 + 서비스 목록 렌더를 검증하고
  실저장 왕복은 라이브 검증(step 6)에서 스크린샷으로 확인.
- **회귀**: 기존 피드·기록 CRUD 전 테스트 통과. /booking 초기 로드의
  네트워크 요청 수 불변(모집 목록은 lazy). firestore.rules 변경이 기존
  컬렉션 접근을 깨지 않음(기존 e2e 통과로 확인).

---

## 루프 안전 (중앙 규칙 준수)

- 반복 상한: 루프 1회 = GOAL 1개, 최대 3회. 무제한 반복 금지.
- GOAL당 수정 재시도 상한 3회 — 초과 시 `GOAL-N BLOCKED` 보고 후 정지.
- 종료 토큰: 전 GOAL DONE 시 `ALL GOALS DONE`, 차단 시 `GOAL-N BLOCKED: <사유>`.
- 상태는 이 문서의 상태표가 단일 진실 — 세션이 바뀌어도 표만 읽으면 이어서 실행 가능.
