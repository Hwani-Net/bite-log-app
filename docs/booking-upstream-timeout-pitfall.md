---
title: 더피싱 콜드 연결 제한과 fetch 제한은 함께 조정해야 함
created: 2026-09-07
type: pitfall
source: project
---

# Summary

## Symptom

Vercel 서울 리전의 `/api/boat-listings`·`/api/boat-calendar`가 원본 데이터가 살아 있는데도 503과 재시도 화면을 반환했다.

## Cause

호출부 `fetchWithRetry`의 15초 AbortSignal 예산을 늘린 뒤에도 `src/instrumentation.ts`의 Undici `connectTimeout`이 15초로 남아 있었다. 콜드 연결은 fetch 예산보다 먼저 Undici에서 `UND_ERR_CONNECT_TIMEOUT`으로 종료될 수 있다.

## Fix

더피싱 origin에만 Undici 연결 제한과 fetch 제한을 각각 45초로 맞추고, 달력의 두 단계 조회를 감싸는 클라이언트 예산을 95초로 조정했다. 다른 origin의 전역 제한은 바꾸지 않았다.

## Prevention

외부 프록시 제한을 바꿀 때는 `fetchWithRetry`의 AbortSignal, `instrumentation.ts`의 Undici `connectTimeout`, 호출자 `apiFetch` timeout을 한 세트로 확인한다. 배포 후에는 캐시를 우회한 실제 API 요청과 브라우저 여정을 함께 확인하고 Vercel 로그에 `ConnectTimeoutError`·`AbortError`가 없는지 확인한다.

## Evidence

2026-09-07 배포 `dpl_12iwnj6UGkyHgdSkh1Uk4u4YnLQ2`에서 프로덕션 `https://bite-log-three.vercel.app`을 실제 Chromium으로 검증했다. 9월 25일·28일 홍원항/오천항 여정 6건이 모두 통과했고, 전수 클릭 307개·항구 조합 213개·선박 목록 API 43건은 모두 성공 응답이었다.
