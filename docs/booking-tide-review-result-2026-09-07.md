# 출조일 물때 달력 — 독립 검수 결과 (2026-09-07)

리뷰 계약: `docs/booking-tide-calendar-2026-09-07.md`. 읽기 전용 검수, 소스 미편집·git 변경·커밋·배포 없음(`git log -3` HEAD `a683b80`, 이번 검수로도 불변).

## 실행한 명령과 결과

```
node node_modules/vitest/vitest.mjs run __tests__/unit/bookingTide.test.ts __tests__/unit/apiClient.test.ts __tests__/unit/instrumentation.test.ts
```
→ 3 files, 16 tests, 전부 PASS.

```
node node_modules/vitest/vitest.mjs run __tests__/unit/boatCalendarService.test.ts __tests__/unit/boatAvailabilityFilter.test.ts
```
→ 2 files, 17 tests, 전부 PASS.

```
npx playwright test e2e/booking-recovery.spec.ts e2e/booking-region.spec.ts e2e/booking-port-coverage.spec.ts --reporter=list
```
→ 25 passed (22.8s). 컴패니언 포스팅 테스트는 실행하지 않음. 콜드캐시 항구(홍원항)·지역 전환 케이스 포함해 전부 통과.

```
grep -rn 'fetch("/api/\|fetch(`/api/' src/
```
→ 0 hits.

## 검증된 사항

- **`apiFetch` 경유 원칙 준수**: `src/services/tideService.ts`의 `fetchStationTides`가 `apiFetch("/api/tide?...", { signal, timeout: 10000, retries: 0, context: "Tide forecast" })`를 쓴다. 프로젝트 CLAUDE.md의 검증 grep이 0건. 호출자(`BookingDatePicker.tsx`의 `controller.signal` 전달, `tideService.ts`의 레거시 `fetchTideData`의 signal-less 호출) 모두 새 시그니처(`code, date, signal?`)와 호환.
- **호출자 취소와 재시도 가능한 실패의 구분**: `apiClient.ts`가 `signal ? AbortSignal.any([signal, controller.signal]) : controller.signal`로 호출자 시그널과 자체 타임아웃을 합성하고, catch에서 `if (signal?.aborted) throw err;`를 재시도 판단보다 먼저 검사한다 — 호출자가 월/관측소를 바꿔 취소한 요청이 재시도로 오분류되지 않는다. `apiClient.test.ts`로 확인.
- **콜드캐시 항구 노출**: `src/data/portCoords.ts`의 각 항구에 `regionCode: "1" | "2" | "3" | "130"`(서해/동해/남해/제주, `boatListingService.ts`의 `REGION_FILTERS` 코드와 일치)이 있고, `booking/page.tsx`의 `portOptions`가 실시간 응답 항구와 `PORT_COORDS`의 알려진 항구(지역·검색어로 필터링)를 `extractPorts`로 합집합한다. `extractPorts`가 쓰는 `shortPort()`는 `">"` 구분자가 없는 순수 항구명도 그대로 반환해 `PORT_COORDS` 키를 직접 넣어도 정상 동작한다. e2e로 디렉터리 캐시가 빈 상태에서도 홍원항 칩이 뜨는 것을 확인.
- **잔여좌석 0석을 마감으로 정규화**: `src/services/boatCalendarService.ts`의 `parseBoatCalendarHtml`이 `예약하기` 셀에서 `remainingSeats === 0`이면 `status`를 `"available"`에서 `"full"`로 덮어쓴다(`if (seats) remainingSeats = Number(seats);` → `if (remainingSeats === 0) status = "full";`). `seats`는 정규식 매치 문자열이라 `"0"`도 truthy라 정상 파싱됨을 확인. 기존 `src/lib/boatAvailabilityFilter.ts`가 이미 `day.remainingSeats === 0 → { state: "full" }`로 같은 규칙을 적용하고 있어, 이번 변경은 소스(달력 파서) 단계에서 같은 규칙을 중복 정규화한 것으로 두 계층이 일치한다. `boatCalendarService.test.ts`에 `남은인원 0` → `status:'full'`, 같은 셀을 `1`로 바꾸면 `status:'available'`인 대조 케이스가 있고 통과함을 확인. 실제 uid=3896, 9/7 셀처럼 `예약하기` 버튼이 있어도 잔여 0석인 실데이터 패턴을 이 가드가 정확히 마감으로 처리한다.

## 검증되지 않은 경계 (의도적으로 범위 밖, 결함 아님)

- **프로덕션 배포 증거 없음**: `instrumentation.ts`의 커넥트 타임아웃 연장이 실제 프로덕션의 `UND_ERR_CONNECT_TIMEOUT`을 없애는지는 확인하지 않았다. `package.json`/`vercel.json`/`.nvmrc`에 Node 버전 핀이 없어 로컬(Node v24.15.0 + undici 7.29.1) 실측이 Vercel 런타임에도 성립하는지 이 리포지토리만으로 확정할 수 없다. 재배포 후 프로덕션 로그로만 판정 가능.
- **실기기 iOS/WebKit 미검증**: `playwright.config.ts`에 `Desktop Chrome` 프로젝트만 있어 네이티브 `<input type="date">` 피커 억제는 Chromium 계열에서만 실측했다. 실제 iOS Safari 엔진 동작은 검증하지 않았다.

## 채점 (0–20)

| 항목 | 점수 | 근거 |
|---|---|---|
| Acceptance | 19 | 지정된 유닛 33/33(16+17), 지정된 e2e 25/25 전부 통과. |
| Correctness | 19 | apiFetch 경유·취소/재시도 구분·항구 합집합·잔여좌석 0 정규화 모두 코드로 직접 확인, 결함 없음. |
| Verification | 17 | 검증 폭은 탄탄하나 프로덕션 undici/Node 버전, 실기기 WebKit 두 경계는 범위 밖으로 미검증. |
| Scope/Safety | 19 | 소스 미편집·커밋 없음, 컴패니언 포스팅 테스트 미실행, 정책 위반 없음. |
| Traceability | 19 | 각 항목이 파일·라인·테스트명으로 재현 가능. |
| **합계** | **93/100** | |

## 판정

**PASS (93/100, 기준 85 이상, 치명적 결함 없음, 블로커 없음).** 남은 두 경계(프로덕션 undici/Node 버전 실측, 실기기 iOS 네이티브 피커 검증)는 결함이 아니라 로컬 검수의 근본적 한계이며, 재배포 후 실측과 WebKit 대상 e2e 추가로만 닫을 수 있다.
