---
title: 예약 검색 필터와 더피싱 연결 재시도는 함께 검증해야 함
created: 2026-09-08
type: pitfall
source: project
---

# Summary

## Symptoms

9월 25일 서해·홍원항을 골라도 선박이 사라지거나, 상세 달력이 `예약 현황 다시 시도` 상태에 머무는 두 증상이 있었다.

## Causes

두 원인은 독립적이었다.

1. 예약 가능 여부를 계산하는 effect가 항구·정원·검색어로 좁힌 `finalFilteredSearchBoats`가 아니라 전체 `searchBoats`를 순회했다. 화면에 보이지 않는 배까지 API를 호출해 원본 연결 실패를 화면 장애로 키웠다.
2. Vercel의 더피싱 연결은 정상 원본이 살아 있어도 HTTPS가 약 15초 뒤 `ETIMEDOUT`/`UND_ERR_CONNECT_TIMEOUT`으로 끊길 수 있었다. HTTPS만 한 번 재시도하면 HTTP 경로도 같은 순간 실패할 때 503이 남았다.

## Fix

- 가용성 조회 대상을 `finalFilteredSearchBoats`로 제한하고, UID 2척 회귀 테스트를 추가했다 (`96d1d42`).
- 더피싱 origin에만 45초 fetch 예산을 유지하고, 명시적 연결 타임아웃이면 HTTPS↔HTTP를 번갈아 최대 3회 시도한다. HTTPS가 기본이며 HTTP는 공개 읽기 전용 원본의 연결 우회에만 사용한다 (`fc2ad24`, `14482b5`).
- 달력의 상세 GET·월 POST 클라이언트 예산은 95초로 유지했다.

## Prevention

필터를 바꿀 때는 화면에 실제 남은 항목과 부수 API 호출 UID를 함께 확인한다. 외부 프록시를 바꿀 때는 fetch AbortSignal, Undici 연결 제한, 호출자 예산을 한 세트로 점검한다. 배포 후에는 캐시가 아닌 실제 API와 브라우저 여정을 동시 실행하고, Vercel 오류·5xx 로그를 별도로 확인한다.

## Evidence

최종 production 배포 `dpl_G1ptwRC9nXeDaGj4LL8Bps6y159L` (`https://bite-log-three.vercel.app`)에서 실제 Chromium 여정을 실행했다.

- `BOOKING_DATE=2026-09-25`: 홍원항 데스크톱·모바일, 오천항 데스크톱 3/3 통과.
- `BOOKING_DATE=2026-09-28`: 홍원항 데스크톱·모바일, 오천항 데스크톱 3/3 통과.
- 두 실행 모두 `mockedApis:false`, `errors:[]`, `completeJourney:true`, 외부 예약 제출 없음. 9월 28일 재실행 직후 Vercel `error`/5xx 조회도 0건이었다.
- 로컬 `npm test`: 42 files / 425 tests 통과. tsc·build·drift-guard(0.08%)도 통과했다.
