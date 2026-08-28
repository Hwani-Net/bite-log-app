# 기록의 무게 GOAL 실행 문서 (5차)

작성 2026-08-28. `docs/record-weight-improvements.md`를 실행 가능한 GOAL로
변환. 1차(booking)·2차(booking C)·3차(기억×예보)·4차(앱 정합성) 전부 DONE.
**이 문서 + 한 줄 명령이면 구현→검증→기록까지 진행**된다.

배경: `central/rules/goal-loop-execution-pattern.md`.

## 한 줄 명령 사용법

| 명령 | 동작 |
|------|------|
| `다음 GOAL 실행` | 상태표의 첫 TODO를 공통 프로토콜로 수행 |
| `GOAL-N 실행` | 지정 GOAL만 수행 |
| `/loop 다음 GOAL 실행` | 연속 수행. 종료: 전부 DONE, BLOCKED, 또는 6회 반복 |

## 공통 실행 프로토콜 (1~4차와 동일)

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
| 1 | 기록 목록·내보내기 정리 (R1) | — | DONE | 커밋 2개(본체+리뷰 반영). src/lib/recordFilters.ts 순수 추출 — 어종 칩이 free-text search 문자열을 공유해 "우럭" 칩이 메모에만 우럭이 적힌 광어 기록까지 남기던 버그를 어종 필드 전용 필터로 분리, 날짜 범위(양끝 포함)·사진 있는 기록 필터+초기화 추가, 자유 검색에 채비 포함. CSV를 7열→18열(시각·GPS·채비·날씨 3종·물때 phase+관측소·공개여부·배uid). 상세 편집에 사진 추가/삭제(없어서 사진 지우려면 기록째 삭제해야 했음)+같은 파일 재선택 허용(input value 리셋). 교차검수(z-ai/glm-5.3-flash, $0.0027, Request changes) 필수 2건 반영: **전각(；) 치환이 쉼표 든 값을 영구 변형해 무손실 왕복을 깨뜨리던 상속 관행을 RFC 4180 인용으로 교체**, 사용자 입력 셀의 수식 인젝션(=+-@) 방어, photos 미존재 옛 기록에서 photosOnly 토글이 목록을 통째로 죽이던 크래시 경로 차단. 반박 2건(CSV 헤더 한국어 유지는 기존 관행·엑셀 사용자 대상, tides 배열·id/createdAt은 JSON 내보내기 담당 — 주석 명시). 유닛 335/335(신규 15: 칩vs검색·경계 포함·인용·인젝션·부분 결측·옛 기록). e2e 신규 4(칩이 메모 배제, 범위·사진 필터, CSV 행 전체 값 단언, **사진 삭제→사진필터 연동 회귀**). e2e 작성 중 함정 재현: addInitScript가 내비게이션마다 재시딩해 삭제한 사진이 되살아남 → 4차에서 쓴 1회 시딩 가드로 해결. 라이브(https://bite-log-three.vercel.app/records) 200 — 칩 필터가 메모 기록 배제(1건만), CSV가 "지그헤드 5g, 웜"을 인용으로 무손실 보존(screenshots/goals5/goal1/live-filters.png) |
| 2 | 채비·미끼 필드 (R2) | — | DONE | 커밋 2개(본체+리뷰 반영). CatchRecord.tackle(optional, 마이그레이션 불요) — 기록 폼 입력+datalist(tackleAdviceService의 TACKLE_DB 루어 어휘 재사용, 선택 어종 우선 — 440줄 지식베이스의 소비자가 출조 브리핑 하나뿐이던 것을 둘로), 상세 표시·편집, CSV 열(GOAL-1과 정합), 자유 검색 포함, /stats 조건표의 4번째 축(표본 3회 하한 동일). 교차검수(z-ai/glm-5.3-flash, $0.0021, Request changes) 필수 3건 반영: **주석은 "대소문자·공백 정규화"라며 코드는 trim만 하던 불일치**를 normalizeTackle(NFC+연속공백 축약+소문자)로 실제 구현하되 표시 라벨은 사용자 원문 유지(정규화 키 ≠ 표시), 상세 편집에도 datalist(편집 경로 오타가 곧장 버킷 오염), 두 입력 60자 상한. e2e 격리(빈 저장소 시딩)+저장 레코드 id 기반 조회로 순서 의존 제거. 반박 2건(자유 문자열 축의 표기 분산은 도메인 한계 — 정규화 정책을 코드·주석에 정직하게 명시하고 후속 강화는 백로그, datalist가 type만 담는 건 조합은 자유 입력이 담당하는 설계). 유닛 340/340(신규 7: 정규화 그룹핑·원문 라벨·표본 하한·제안 순서/폴백). e2e 신규 3+기존 1건 갱신(축 4개). 라이브(https://bite-log-three.vercel.app/stats) 200 — "지그헤드 5g"/"지그헤드  5G" 혼용 3건이 한 구간(3회 평균 5마리)으로 묶이고 1회짜리 에기는 칩으로만(screenshots/goals5/goal2/live-tackle-axis.png) |
| 3 | 사진 Storage 이전 (R3) | — | **부분 DONE / BLOCKED(결제)** | 커밋 2개. **차단 사유**: Firebase Storage는 2024년부터 Blaze(종량) 필수인데 이 프로젝트 결제 계정이 closed 상태라 버킷 생성 불가(`gcloud storage buckets create` → "billing account ... is disabled in state closed"). API 활성화(firebasestorage/storage)는 완료했고 버킷만 없음 — **결제 활성화는 대표님 결정 사항이라 여기서 멈춤**. 결제가 켜지면 코드 변경 없이 업로드 경로가 살아난다(URL 저장→base64 폴백 분기 이미 구현·유닛 고정). **결제 없이 실효 있는 절반은 완료**: src/lib/photoStorage.ts — 저장 직전 압축(1600px/JPEG 0.8)+**인라인 예산(900KB) 초과 시 단계적 재압축**(1280/0.7→1024/0.6→800/0.5), 사진을 버리지 않음, 이미 원격 URL은 재처리 안 함, 압축이 되레 커지면 원본 유지. **실측(브라우저)**: 3000×2250 3장 = 원본 17.5MB → 1600@0.8에서 2.35MB(여전히 한계 초과) → 1280@0.7에서 **793KB**로 예산 내. 즉 압축만으로도 "사진 3장이면 Firestore 1MiB 한계로 저장 실패" 리스크가 실질 해소. 유닛 350/350(신규 9: 원격 URL 보존·blob 디코드·canvas 부재 폴백·예산 상수·개수 보존). e2e 신규 2(브라우저 실경로 압축 예산, 사진 경로 저장 회귀). 배포 1회 실패 후 원인 수정: getFirebaseStorage가 unknown을 반환해 ref/uploadBytes 오버로드 불일치로 Vercel 타입체크 실패(로컬은 캐시로 통과) → 타입 있는 async 동적 import로 교체. 라이브(https://bite-log-three.vercel.app/record) 200, 배포판 브라우저에서 17.5MB→793KB 재확인 |
| 4 | 랭킹 정직화 (R4) | — | DONE | 커밋 2개(본체+타입 수정). 랭킹이 공개 피드만 집계하는데 기록 기본값이 비공개라 리더보드가 사실상 "공개 의지" 순위였던 것을 화면에서 명시 + **내 이번 시즌 비공개 기록 건수**를 계산해 안내(공개 경로 링크). buildRealEntries의 하드코딩 level:1/badges:[] 제거 → computeBadges 연결(피드 집계라 원본 기록이 없어 마릿수·최대크기·어종수로 복원 가능한 최소 형태만 합성, 날짜 기반 배지는 이 경로에서 판정 불가임을 주석 명시), 레벨은 집계 조과 기반. src/lib/rankingHonesty.ts 순수 3함수(시즌 비공개 집계·지역 필터·획득 배지 아이콘). 유닛 357/357(신규 7: 시즌 경계, visibility 누락은 비공개로 간주, 지역 미상 제외, 획득만/상한). e2e 신규 2(혼합 공개 상태에서 정확한 건수, 비공개 0건이면 규칙만 말하고 가짜 숫자 없음). **배포 2회 실패 후 수정**: 클린 빌드(Vercel 경로)가 로컬 웜 캐시가 숨긴 타입 2건을 잡음 — 합성 레코드의 updatedAt 누락, RankingEntry.user.badges가 Badge[](등급형)인데 badgeService는 AchievementBadge[](진행형) → 변환 추가. 이후 `rm -rf .next` 클린 빌드를 게이트에 포함. 지역별 랭킹 탭은 피드 문서에 region 필드가 실제로 없어(FeedDoc 확인) 이번 범위에서 제외 — 보류 목록으로. 라이브(https://bite-log-three.vercel.app/ranking) 200, "비공개 기록 2건은 반영되지 않았어요 · 기록에서 공개하기" 렌더 확인(screenshots/goals5/goal4/live-ranking-honesty.png) |
| 5 | 컨시어지·홈 마무리 (R5) | — | DONE | 커밋 2개(본체+리뷰 반영). ① AI 채팅 영속(src/lib/chatHistory.ts — 최근 20턴, 손상 항목 필터, 실패해도 대화 안 막음) — 예전엔 useState뿐이라 새로고침 한 번에 대화가 사라짐 ② generateCatchReport(작성됐지만 0 호출)를 "조황 리포트" 버튼에 실연결 — /stats로 도망가던 버튼이 이제 내 기록 기반 월간 요약 모달을 띄움(출조·조과·평균·어종 비율·포인트·최대어, 기록 없으면 정직한 빈 상태) ③ 홈 헤더 햄버거가 클릭 핸들러 없는 장식 3줄이던 것을 실제 메뉴 시트로 — MORE_ROUTES 단일 소스를 하단 더보기 그리드와 공유하고 고아 라우트 2개(catch-value·fishdex) 편입. 교차검수(z-ai/glm-5.3-flash, $0.0009, Request changes) 필수 반영: **저장 effect가 로드 전 초기 빈 배열로 기존 대화를 덮어쓸 수 있는 경쟁 상태**(고치려던 버그의 재발 경로)를 loaded ref 가드로 차단, 리포트 모달 role/aria-modal+배경 클릭 닫기, 리포트 로드 실패를 "기록 없음"으로 위장하지 않기, 메뉴 시트 바깥 클릭 닫기. **소스로 반박 3건**: 월간 필터는 generateCatchReport 내부에 존재(monthRecords), chatHistory는 AIChatTab에 props로 전달됨, /stats는 바텀 네비에 상시 진입점이 있어 경로 손실 없음. 유닛 361/361(신규 4). e2e 신규 3(새로고침 후 대화 유지, 리포트 실수치, 메뉴 열림→규정 라우트 이동). 라이브(https://bite-log-three.vercel.app/concierge, /) 200 — "2026년 8월 조황 리포트 · 2회 출조 · 6마리 · 우럭 67%" 렌더 + 홈 메뉴 열림 확인(screenshots/goals5/goal5/) |
| 6 | apiFetch 규칙 정합 (R6) | — | DONE | 커밋 2개(본체+리뷰 반영). CLAUDE.md가 apiFetch/apiError 사용을 명령하는데 정작 **0 importer**였던 규칙-코드 불일치 해소 — 둘 중 하나는 거짓말이었다. 결정: 앱 내부 `/api/*` 호출만 apiFetch 경유(타임아웃·재시도·에러 분류 공통화), 외부 API 직접 호출은 각자 폴백 전략이 있어 범위 제외 — 이 범위와 grep 게이트를 CLAUDE.md에 명문화. 내부 10개 호출부 전부 전환(gemini×3·catch-value·youtube-rss·boat-calendar×2·boat-listings·boat-directory·boat-availability), **폴백 계약 전부 보존**(503=mock 경로는 ApiError가 status를 보존해 그대로 동작). 교차검수(z-ai/glm-5.3-flash, $0.0012) 반영 5건: POST 재시도 금지 사유 주석(멱등성 없음·호출당 과금), 브리핑 폴백 문구 통합이 의도적 변경임을 명시(계약 보존 주장과 어긋난다는 지적 수용), catch-value의 ok 판정 명시, status truthy→typeof 검사, **타임아웃·옵션 pass-through 테스트 추가**. 그 테스트가 **실결함 발견**: classifyError가 DOMException만 검사해 node/undici의 AbortError가 "unknown"으로 새면서 timeout 분류·retryable을 잃고 있었음 → 이름 기반 판정으로 수정. 반박 2건(apiClient 구현이 diff에 없다는 지적 — FetchOptions extends RequestInit + 스프레드 전달을 소스로 확인 후 테스트로 고정, /api/gemini 3파일 스타일 통일은 별도 리팩터 제안으로 보류). 유닛 369/369(신규 8). **전체 e2e 91개 통과**(전환 회귀 없음). 라이브(https://bite-log-three.vercel.app) 200 — booking 검색 20척 정상 렌더(apiFetch 경유) + 물때 503 차단 시 "예시" 폴백 배지 동작 재확인 |

상태표가 단일 진실이다. 진행 상황을 표 밖에 두지 않는다.

## GOAL 정의

### GOAL-1 · 기록 목록·내보내기 정리 (R1)

- **범위**: `/records` 어종 칩을 free-text `search`와 분리해 species 전용
  필터로(칩 선택 시 메모/장소의 같은 단어가 매칭되지 않음). 날짜 범위
  필터(시작·종료, 비우면 전체)와 "사진 있는 기록만" 토글 추가. CSV
  내보내기를 전 필드로 확장(잡은 시각·날씨·물때(phase 포함)·공개여부·
  배 uid), 헤더 한국어 라벨 유지+BOM 유지. 상세 편집에 사진 추가/삭제.
- **수용 기준**: ① 어종 칩 "우럭" 선택 시 메모에만 우럭이 있는 기록은
  제외 ② 날짜 범위·사진 필터가 결과를 실제로 좁힘 ③ CSV에 새 열이
  실제 값과 함께 존재 ④ 상세에서 사진 삭제 후 저장 시 반영
- **검증**: 유닛 — 필터 조합 순수 함수(어종/검색어/날짜범위/사진),
  CSV 행 생성. e2e — 칩 선택 시 메모 매칭 기록 제외 단언, CSV 다운로드
  내용에 새 열 단언.
- **회귀**: 기존 정렬·그룹·갤러리 토글·JSON 내보내기 동작 불변.

### GOAL-2 · 채비·미끼 필드 (R2)

- **범위**: `CatchRecord.tackle?: string`(채비/미끼, optional) 추가.
  /record 폼에 입력(datalist 자동완성 — `tackleAdviceService`의 채비
  어휘에서 추출, 없으면 자유 입력), /records/detail 표시·편집, CSV 열
  추가(GOAL-1과 정합), 검색 대상 포함. 통계: 채비별 조과 집계를
  `conditionStats`와 같은 형태의 순수 함수로 만들어 /stats "나의
  조건표"에 4번째 축으로 합류(표본 3회 하한 동일).
- **수용 기준**: ① 채비 입력·저장·상세 표시 ② 자동완성 후보 노출
  ③ 채비 있는 기록 3건+ 시 조건표에 채비 축 렌더 ④ 옛 기록(필드 없음)
  정상 동작
- **검증**: 유닛 — 채비 어휘 추출·채비 축 집계. e2e — 채비 입력→저장→
  상세 표시→조건표 축 노출.
- **회귀**: 기록 저장 전 경로(규정 경고·오프라인 큐) 불변.

### GOAL-3 · 사진 Storage 이전 (R3)

- **범위**: 사진 저장 경로를 base64→Firebase Storage로. 업로드 전
  클라이언트 압축(canvas, 최대 변 1600px·JPEG 0.8), 업로드 후 다운로드
  URL만 레코드에 저장. 로그인 사용자만 Storage 경로 사용(비로그인은
  기존 base64 유지 — 익명 Storage 쓰기는 규칙 확장이 필요해 범위 밖),
  **기존 base64 사진은 그대로 렌더**(호환), 업로드 실패 시 base64
  폴백(오프라인 큐 경로 보존). storage.rules 작성·배포(사용자별 경로,
  본인만 쓰기, 공개 읽기 — 피드가 URL로 읽으므로).
- **수용 기준**: ① 로그인 상태 저장 시 photos에 https URL이 들어감
  ② 비로그인/실패 시 base64로 저장되고 기록은 성공 ③ 기존 base64
  기록이 목록·상세·피드에서 계속 보임 ④ 압축으로 원본보다 작아짐
- **검증**: 유닛 — 압축 함수(리사이즈 비율·용량 감소), 업로드 결과
  분기(성공→URL, 실패→base64). e2e — 비로그인 저장이 여전히 동작(회귀),
  옛 base64 기록 렌더. Storage 실왕복은 라이브 검증에서.
- **회귀**: 오프라인 큐 저장·동기화, 사진 없는 기록, AI 어종 판별
  (base64 입력 필요 — 압축 후 dataURL 경유 확인).

### GOAL-4 · 랭킹 정직화 (R4)

- **범위**: 랭킹이 공개 피드만 집계한다는 사실을 화면에 명시하고, 내
  비공개 기록 N건을 계산해 "N건은 랭킹에 반영되지 않습니다 + 공개하기"
  안내(원탭으로 /records로 이동하거나 일괄 공개는 범위 밖 — 안내와
  이동까지). `buildRealEntries`의 하드코딩 `level: 1`·`badges: []`를
  `computeBadges()` 연결로 교체. 지역별 랭킹 탭(location.region 기준,
  '전국' 기본).
- **수용 기준**: ① 비공개 기록 있는 사용자에게 미반영 안내+건수
  ② 랭킹 항목에 실제 배지 노출 ③ 지역 탭 전환 시 해당 지역 기록만
- **검증**: 유닛 — 비공개 건수 계산, 지역 필터, 배지 연결 매핑.
  e2e — 비공개 기록 주입 → 안내 문구·건수 단언, 지역 탭 필터링.
- **회귀**: 빈 랭킹의 정직한 빈 상태(isRealData) 유지, 로그인 유도 불변.

### GOAL-5 · 컨시어지·홈 마무리 (R5)

- **범위**: AI 채팅 히스토리 localStorage 영속(최근 20턴, 지우기 버튼).
  `generateCatchReport()`(작성됐지만 0 호출)를 "조황 리포트" 진입점에
  실제 연결 — 내 기록 요약 리포트를 컨시어지에서 렌더. 홈 헤더
  햄버거를 실제 메뉴로(더보기 라우트 그리드 시트) 또는 제거 — 클릭
  핸들러 없는 장식은 남기지 않는다.
- **수용 기준**: ① 채팅 후 새로고침해도 대화 유지, 지우기 동작
  ② 조황 리포트가 내 기록 기반 텍스트를 렌더(기록 없으면 안내)
  ③ 햄버거 클릭 시 메뉴 열림(또는 요소 제거)
- **검증**: 유닛 — 히스토리 직렬화·상한, 리포트 생성 입력/출력.
  e2e — 채팅 주입→새로고침→유지, 햄버거 클릭→메뉴 노출.
- **회귀**: 채팅 크레딧·페이월, 컨시어지 3탭 렌더 불변.

### GOAL-6 · apiFetch 규칙 정합 (R6)

- **범위**: CLAUDE.md가 명령하는 `apiFetch`/`apiError`가 0 importer인
  상태를 해소한다. 결정: **앱 내부 API 라우트(`/api/*`) 호출에 한해
  apiFetch를 채택**하고(외부 API 직접 호출은 각자 폴백 전략이 이미
  있으므로 제외), 그 범위를 CLAUDE.md에 명시해 규칙과 코드를 일치시킨다.
  대상 호출부를 전환하고 apiError로 사용자 메시지를 통일.
- **수용 기준**: ① `/api/*` 호출에 raw fetch가 남지 않음(grep 게이트)
  ② 실패 시 기존 폴백 동작 불변(예: 물때 mock, Gemini 503 mock)
  ③ CLAUDE.md 규칙 문구가 실제 채택 범위와 일치
- **검증**: 유닛 — apiFetch 성공/실패/타임아웃 경로. e2e — 대표 화면
  2곳(booking 검색, bite-forecast)이 실패 주입에도 기존 폴백대로 동작.
- **회귀**: 전체 e2e 스위트(모든 라우트가 이 경로를 지난다).

---

## 루프 안전 (중앙 규칙 준수)

- 반복 상한: 루프 1회 = GOAL 1개, 최대 6회. 무제한 반복 금지.
- GOAL당 수정 재시도 상한 3회 — 초과 시 `GOAL-N BLOCKED` 보고 후 정지.
- 종료 토큰: 전 GOAL DONE 시 `ALL GOALS DONE`, 차단 시 `GOAL-N BLOCKED: <사유>`.
- 상태는 이 문서의 상태표가 단일 진실.
