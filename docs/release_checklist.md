# BiteLog 출시 준비 체크리스트

**작성일**: 2026-04-20  
**최종 업데이트**: 2026-04-20 (P1 a11y 수정 반영)  
**리뷰어**: reviewer (bitelog-release 팀)  
**검토 범위**: HEAD~6..HEAD (최근 6개 커밋, 커밋 `5cefafa` 포함)

---

## 완료 항목

- [x] 빌드 성공 (에러 0건)
- [x] `/news` 라우트 존재 확인 (`src/app/news/page.tsx`)
- [x] `/feed` 라우트 존재 확인 (`src/app/feed/page.tsx`)
- [x] BottomNav 5탭 구조 복원 확인 (커밋 `64b1fde`)
- [x] rankingService 타임아웃 5s 추가 — Firestore 무한 대기 방지
- [x] stats 빈 상태 UI 개선 — `/record` 진입점 연결 확인
- [x] record 페이지 하단 패딩 `pb-32 → pb-36` 조정
- [x] Windy iframe 삽입 — 출항 날씨 섹션 복원
- [x] 뉴스 섹션 복원 (`fetchTopNews` import 및 상태 연결)
- [x] 커뮤니티 피드 배너 복원 (`/feed` 링크)
- [x] 에러 억제(#10) 검사 — 랭킹 폴백 패턴은 UX 합리적, 허용
- [x] **[P1-01]** ranking 백버튼 `aria-label="뒤로 가기"` 추가 — 직접 확인 (fleet-radar 제거됨 2026-04-21)
- [x] **[P1-02]** regulations select `aria-label="어종 선택"`, input `aria-label="체장(cm) 입력"` 추가 — 직접 확인
- [x] **[P1-03]** records 필터버튼 `aria-label="필터"` 추가 — 직접 확인
- [x] **[P1-04]** stats `<main>` → `<div>` 교체 (중첩 main 제거) — 직접 확인
- [x] **[P1-05]** stats 장식 아이콘 `aria-hidden="true"` 추가 (Award, BarChart3) — 직접 확인
- [x] **[P1-06]** concierge weather null 시 위치 권한 안내 문구 추가 — 직접 확인
- [x] P1 수정 후 빌드 재확인 — 에러 0건 PASS

---

## 미완료 / Deferred (P2 이하)

- [x] **[P1]** `rankingService`: timeout vs 권한 오류 구분 없이 동일 폴백 처리 — **해결** (2026-08-30, `47c5ffb`). 실측에서 전제보다 넓은 결함이 나왔다: Firestore 는 백엔드에 못 닿아도 예외를 던지지 않고 **캐시로 빈 결과를 성공 응답**해, 장애가 "아직 아무도 안 올림"으로 위장됐다. `RankingData.unavailable`(timeout/permission/offline/error)로 사유를 실어 화면에 별도 배너와 재시도를 띄우고, 캐시발 빈 스냅샷을 실패로 판정한다. 유닛 7건 + e2e(Firestore 차단) 추가.
- [x] **[P1 Deferred → 완료]** `/news` 페이지 실제 콘텐츠 — 빌드 라우트 목록에서 `/news` 정적 렌더 확인
- [x] **[P2]** Windy iframe CSP — **재현되지 않아 변경 없이 닫음** (2026-08-30). 이 저장소에는 CSP 자체가 없고(`next.config.ts`·`vercel.json`·`firebase.json`·미들웨어 전수 확인), 배포본 https://bite-log-app.web.app 에서 임베드가 정상 렌더된다(CSP 위반 콘솔 0건, e2e `windy-embed-live.spec.ts`, 스크린샷 `e2e/__screenshots__/windy-embed-live.png`). CSP 가 없는 곳에 `frame-src` 만 넣으면 없던 제약이 생겨 다른 외부 리소스를 깨뜨리므로 추가하지 않는다.
- [x] **[P2]** `stats/page.tsx` 빈 상태 아이콘 의미 불일치 — **해결** (2026-08-30). 지목된 어종 도넛뿐 아니라 **인기 포인트 TOP 5 도 같은 결함**이라 둘 다 고쳤다(도넛 → `PieChart`, 포인트 → `MapPin`; 월별 추이는 `BarChart2` 가 맞아 유지). recharts 가 `PieChart` 이름을 이미 쓰므로 `PieChart as PieChartIcon` 별칭으로 들여온다. e2e `stats-empty-icons.spec.ts` 가 세 아이콘을 못박는다.
- [ ] **[P2]** 포맷 변경과 기능 변경 혼재 커밋 — 다음 PR부터 분리 권고

---

## 배포 권고

**READY TO DEPLOY**

P0 이슈 없음. P1 6건 모두 수정 완료 확인. 빌드 에러 0건. 라우트 연결 확인 완료.

> P2 CSP 이슈는 배포 후 Windy iframe이 실제 차단되는지 확인 후 대응 권고.
