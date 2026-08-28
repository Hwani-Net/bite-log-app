# 기억×예보 개선 리스트 (Memory × Forecast)

작성 2026-08-28. 전체 앱 조사(booking 제외 11개 라우트 + 서비스 계층 전수)
결과에서 뽑은 다음 작업 축. 조사 원문 요지는 아래 "조사 스냅샷" 참조.

## 결 (전략)

BiteLog에는 **기억 층**(조과기록·DNA·배지·개인화)과 **지능 층**(날씨·물때·
해양·입질지수)이 둘 다 있는데, 지금은 서로 값을 하나도 주고받지 않는 두
사일로다. 200건 기록의 베테랑과 첫날 사용자가 똑같은 예보를 본다.
**이 둘을 잇는 것**이 경쟁사가 못 베끼는 차별화다 — 이 사용자의 기록은
BiteLog에만 있으니까. booking 축의 결("낚시인 편에서 기억·데이터·이익
대변")의 다음 장이다.

## M. 본선 — 기억이 예보가 된다

| # | 항목 | 내용 |
|---|------|------|
| M1 | 기록에 시간 축 | CatchRecord에 caughtAt(잡은 시각, optional) — 현재 날짜뿐이라 시간 기반 분석 전부가 "저장 버튼 누른 시각"으로 오염됨 |
| M2 | 기록에 물때 축 | 저장 시점에 이미 계산되는 tide.currentPhase(N물/조금/사리)가 버려지고 있음 — 스냅샷으로 보존 |
| M3 | DNA 버그 2건 | bestTide가 물때가 아니라 **관측소 지명**을 집계(항상 "인천"이 최고 물때로 나옴), bestTimeSlot이 저장 시각 기반("소파에서 밤에 기록하면 야행성 낚시인") |
| M4 | 나의 조건표 | 기록에 이미 저장된 수온·풍속·물때를 구간화 → 구간별 평균 마릿수. 신규 인프라 0 |
| M5 | 예보×내 기록 | /bite-forecast에 "이 조건에서 너는 평균 N마리 (M회)" 스트립, 홈 인사이트 배너를 개인 프로필+오늘 점수 결합으로(현재 insights[0] 한 줄만 쓰고 6개 필드 버림) |
| M6 | AI가 나를 안다 | AI 마스터 채팅 시스템 프롬프트에 내 기록 요약 주입(현재 200건 베테랑에게도 일반 FAQ 답변) |
| M7 | PRO 정직화 | bite-forecast "시크릿 포인트"가 하드코딩 3개 배열을 유료로 팜 — 사용자 실기록 topSpots×오늘 점수로 교체 |

## P. 프리플라이트 — 본선이 설 땅 정리 (조사에서 나온 실결함)

| # | 항목 | 내용 |
|---|------|------|
| P1 | GPS 파괴 버그 | /records/detail 편집 저장이 location을 {name}만으로 덮어써 **제목만 고쳐도 좌표가 지워짐** |
| P2 | API 키 노출 | preTripBriefingService가 /api/gemini 프록시를 두고도 generativelanguage.googleapis.com을 클라이언트에서 직접 호출(키 인라인) |
| P3 | 죽은 홈 잔해 | src/app/components/home/ 5개 파일(대체 홈 구현, 아무도 import 안 함) — 삭제된 /live-dashboard로 가는 404 링크 포함. src/data/mockData.ts도 0 importer |
| P4 | 문서 어긋남 | CLAUDE.md 앱 구조에 삭제된 live-dashboard가 남고 실존 라우트(trip-plan/stats/settings/catch-value/fishdex) 누락 |

## A. 이익 대변 — 규정 지킴이

| # | 항목 | 내용 |
|---|------|------|
| A1 | 기록 시점 규정 검증 | /record 저장 때 isCatchLegal(어종·체장·날짜) — 금어기/체장 미달이면 벌칙 안내와 함께 경고(함수는 이미 있는데 실제 물고기를 검증한 적이 없음). 최대 300만원 과태료에서 사용자를 보호 |

## 보류 (이번 축 아님 — 다음 리스트 후보)

- 알림 실화(theme 2.7: 금어기 해제 D-3 — 유일하게 실제로 울릴 수 있는 알림), 설정 토글 키 불일치, 초기화 버튼 정직화, 전체 데이터 내보내기
- 피드 N+1·댓글 "나" 고정·조건 매칭 피드, 랭킹 비공개 기록 문제
- 죽은 서비스 정리 잔여(~1,300 LOC): noticeParser/viralGear/fishingIndex/seasonForecast/aiRateLimiter/apiFetch 채택 여부, PWA manifest 색·A2HS·sw 라우트, Capacitor 죽은 플러그인
- 사진 base64 → Firebase Storage(1MiB 문서 한계), 채비/미끼 필드

## 조사 스냅샷 (2026-08-28 기준 사실)

- 실 API: Open-Meteo(키 불요), KHOA·Naver·Gemini·KAMIS(키), YouTube RSS(키 불요)
- @mock-data 태그 7곳(전부 폴백 경로, UI 표시 관행 양호) + **미태그 하드코딩**: 시크릿 포인트(유료·고위험), getMockTideData(무표시), 컨시어지 지식베이스 4개, 쿠팡 링크 13개
- 0 importer 서비스 ~1,750 LOC(위 보류 목록), 단일 importer에 몰린 고가치 서비스(personalization·fishingDna·badge)
- 서명 키스토어·플레이 서비스계정 JSON은 **git 미추적 + .gitignore 등재 확인**(2026-08-28 git ls-files 실측) — 유출 아님
