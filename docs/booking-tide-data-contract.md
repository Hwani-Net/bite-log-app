---
title: 물때 달력은 검증된 지점·날짜의 조석예보만 쓴다
created: 2026-09-07
type: pitfall
source: official
---

## Symptom

기존 조석 API 주소가 404였고, 관측소 코드와 이름이 맞지 않았다. 레거시 서비스는 실패 때 예시 수위를 만들기 때문에 새 달력의 근거로 사용할 수 없었다.

## Cause

예전 KHOA 주소·응답 형식과 잘못된 관측소 표를 신뢰했다. 예: `DT_0018`은 군산, `DT_0025`는 보령이다.

## Fix

2026-09-07 [공공데이터포털 공식 사양](https://www.data.go.kr/data/15156018/openapi.do)과 실제 응답을 대조했다. HTTPS `tideFcstHghLw/GetTideFcstHghLwApiService`, `obsCode`, 일 단위 `reqDate=YYYYMMDD`를 사용한다. 현재 성공 응답은 최상위 `header`/`body`, `extrSe`는 문자열, `predcTdlvVl`은 cm 수치다.

요청 날짜·관측소 이름·유한한 수위를 확인한 성공만 캐시한다. 오류는 미제공·재시도로 표시하고 예시 수위를 넣지 않는다. 고저차는 하루 최고 만조−최저 간조, 조류 세기는 음력 물때식 추정이며 실측 유속이 아니다.

## Prevention

`__tests__/unit/bookingTide.test.ts`: 군산 2026-09-28 만조 679/708, 간조 48/65 → 660cm. 다른 날짜·혼합 지점·누락 수위·실패를 거부한다. 공통 `apiFetch`를 쓰고 월·지점 변경의 호출자 취소를 재시도하지 않는다. 선박 달력은 `예약하기` 문구가 있어도 잔여 0석이면 마감이다(`boatCalendarService.test.ts`).
