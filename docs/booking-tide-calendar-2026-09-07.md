# 출조일 물때 달력과 데이터 로딩 수정

## 요청과 범위

2026-09-07 사용자 화면: 출조일 2026-09-28에서 선박 목록 로딩 오류. 출조일 달력 안에서 물때, 조류 세기와 고저차를 확인하도록 요청했다. 이전 세션의 예약 화면 수정은 현재 작업 파일에만 있으며 운영 반영 여부와 외부 데이터 장애를 따로 검증한다.

기존 상세 달력, 날짜·항구 좌표·해양 API 도우미, 디자인 토큰과 설치된 의존성을 재사용한다. 실제 예약·결제·게시물 작성, 임의 수위 생성, 무단 공개 배포는 하지 않는다.

## 로컬 확인과 조사 계약

- 확인: src/app/booking/page.tsx, src/app/booking/boat/[uid]/page.tsx, src/services/boatListingService.ts, src/lib/retryFetch.ts, src/services/tideService.ts, src/services/lunarService.ts, src/app/api/tide/route.ts, src/data/portCoords.ts, DESIGN.md.
- 선박 목록: 일자/권역/페이지를 포함한 운영 API와 로컬 서버의 응답 및 실패 시간을 분리 측정한다.
- 기존 물때 API 실패 시 무작위 예시 수위가 반환되는 경로는 새 달력의 정보원으로 사용할 수 없다.
- 조사 목적: KHOA의 현재 예측 고저조 API 주소, 입력·응답 단위 및 관측소·일자 범위를 확인한다. 조류의 실제 유속과 물때 기반 추정은 구별한다.
- 소스 예산: 공식 KHOA/공공데이터포털 2개 우선, 충돌 시 공식 추가 2개 이내. 시장·실무자 자료는 기능 선택이나 수치 근거가 아니므로 사용하지 않는다. 공식 사양과 실제 1일 응답이 일치하면 조사 종료.

## 수용 기준

- 9월 25일/28일 서해·홍원항 조건에서 목록→추가 페이지→상세→뒤로가기 경로가 복구되며, 실패를 선박 없음으로 취급하지 않는다.
- 날짜별 물때와 추정 조류 세기, 선택 위치의 예측 고저차(cm)가 정보 출처·기준 지점과 함께 구별된다. 수위 누락 시 미제공/재시도를 표시한다.
- 월·날짜·항구 변경, 빠른 연속 클릭에서 이전 조건 데이터가 새 조건으로 보이지 않는다. 과거일 선택 차단, 키보드와 모바일 조작 가능.
- 기존 Vitest/Playwright로 성공·장애·복구·날짜 변경 회귀를 검증하고, 실데이터와 테스트용 응답의 결과는 분리한다. tsc/build/lint/drift-guard를 확인한다.

## 상태

로컬 구현·프로덕션 빌드 검증 완료. 공개 운영 반영은 승인 대기이며 운영 복구로 보고하지 않는다.

## 변경과 검증 근거

- `BookingDatePicker`: 기존 예약 상세 달력의 스타일을 재사용한 인라인 월 달력. 음력 물때, 추정 조류 세기, 실제 조석예보 고저차·만조/간조를 구분한다. 월당 날짜별 요청 동시성 3, 성공 캐시 재사용, 변경 시 취소, 실패 재시도. 날짜 변경 시 선택 항구를 유지한다.
- KHOA: [공식 예측 고저조 API](https://www.data.go.kr/data/15156018/openapi.do)와 실제 16개 관측소 응답 확인. 주소·관측소 표·응답 파서를 수정하고 검증된 성공만 캐시한다.
- Vercel 운영 로그에서 `UND_ERR_CONNECT_TIMEOUT`의 10초 연결 제한을 확인했다. `src/instrumentation.ts`는 더피싱 origin만 15초로 조정한다([Node fetch dispatcher](https://nodejs.org/api/globals.html)). 로컬 Node 24.15.0에서 디스패처 연결을 독립 실측했으나, 운영 해결 여부는 배포 후 로그·실제 화면 확인이 필요하다.
- 다른 달의 예약 현황은 상세 GET 후 월 POST를 이어서 실행하므로 클라이언트 예산을 37초로 맞췄다. 잔여 0석은 파서에서 마감으로 통일한다.
- 디렉터리가 부분 캐시일 때 홍원항 선택지가 사라지는 실데이터 회귀를 발견했다. 기존 항구 좌표 테이블의 권역별 알려진 항구를 합쳐 복구했다. 추가 공급자 크롤링을 늘리지 않았다.
- 단위: `node node_modules/vitest/vitest.mjs run` → 42파일, 422개 통과.
- 브라우저: 기존 Playwright Chromium의 예약·복구·지역·항구 25개와 달력·사진·연관 예약 14개, 총 39개 통과. 달력은 390px/1280px에서 9월 7~30일을 모두 클릭했다. 결정론적 장애 테스트의 응답 대체와 실제 API 여정은 구별한다.
- 실제 데이터: 로컬 프로덕션 빌드 `http://localhost:3014`에서 9월 28일 홍원항 1280px/390px, 오천항 1280px 여정 통과. API 대체 없음. 날짜별 물때 화면, 항구 선택, 후속 페이지, 상세의 양수 잔여석 날짜, 선사 링크, 뒤로가기 필터 복원, 홈 복귀를 확인했다. 조회일의 모든 배가 예약 가능하다는 뜻은 아니다.
- 9/28 홍원항(군산 기준) 660cm, 오천항(보령 기준) 710cm가 실제 API 응답과 일치했다. 원본: `.codex/visual-evidence/20260907130841278-hongwon-390/result.json`, `.codex/visual-evidence/20260907130835780-ocheon-1280/result.json`.
- 같은 최종 빌드에서 9월 25일 홍원항 1280px/390px, 오천항 1280px도 3개 통과(17.3초). 군산 528cm, 보령 562cm. 원본: `.codex/visual-evidence/20260907131219662-hongwon-390/result.json`, `.codex/visual-evidence/20260907131214251-ocheon-1280/result.json`. 최종 실데이터 여정 합계 6개이며 실제 결제는 0회다.
- `tsc --noEmit`, 변경 파일 ESLint, `next build` 성공. `npx --no-install drift-guard check` 0.08%(2/2436): 기존 globals.css의 font/shadow 차이이며 이번에 보호 CSS를 변경하지 않았다.

## 독립 검수와 한계

Orca Run `run_49e8176c4661`, 새 Claude Sonnet 5/high 검수 세션. 단위·브라우저 독립 재실행 후 93/100. `apiFetch` 우회 지적을 수정하고 취소 신호 회귀도 검증했다. 최종 출처: `docs/booking-tide-review-result-2026-09-07.md`. 마지막 Dispatch `ctx_4c1f207d97f8`의 정확한 워커를 release하여 보존된 출력과 터미널 종료를 확인했다. 기존 Claude 세션·원본 transcript는 변경하지 않았다.

Codex 내부 브라우저 부트스트랩은 `Importing module "node:process" is not allowed in node_repl` 오류로 막혔다. 이 작업은 **iab QA 통과가 아니라 기존 Playwright Chromium 회귀 검증**이다. 390px는 모바일 크기이며 실기기 iOS/WebKit 검증은 아니다. 예약·결제·동출 글 작성은 하지 않았다. 선사 전용 `aceho.thefishing.kr` 서브도메인은 원본 홈페이지 링크이므로 중앙 목록 도메인과 구분한다.

## 기록 후보 선정

- pitfall: 항구 캐시 적재율은 항구 선택지의 완전성을 보장하지 않음 → `docs/booking-port-cache-pitfall.md`.
- pitfall: 조석예보의 지점·날짜·수위 검증과 결측 처리 → `docs/booking-tide-data-contract.md`.
