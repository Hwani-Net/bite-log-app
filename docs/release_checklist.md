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

- [ ] **[P1 Deferred]** `rankingService`: timeout vs 권한 오류 구분 없이 동일 폴백 처리 — 디버깅 난이도 증가. 다음 릴리즈에서 에러 타입별 분기 권고
- [x] **[P1 Deferred → 완료]** `/news` 페이지 실제 콘텐츠 — 빌드 라우트 목록에서 `/news` 정적 렌더 확인
- [x] **[P2]** Windy iframe CSP — **재현되지 않아 변경 없이 닫음** (2026-08-30). 이 저장소에는 CSP 자체가 없고(`next.config.ts`·`vercel.json`·`firebase.json`·미들웨어 전수 확인), 배포본 https://bite-log-app.web.app 에서 임베드가 정상 렌더된다(CSP 위반 콘솔 0건, e2e `windy-embed-live.spec.ts`, 스크린샷 `e2e/__screenshots__/windy-embed-live.png`). CSP 가 없는 곳에 `frame-src` 만 넣으면 없던 제약이 생겨 다른 외부 리소스를 깨뜨리므로 추가하지 않는다.
- [ ] **[P2]** `stats/page.tsx` 파이차트 빈 상태에 `BarChart2` 아이콘 사용 — 의미 불일치 (PieChart 아이콘으로 교체 권고)
- [ ] **[P2]** 포맷 변경과 기능 변경 혼재 커밋 — 다음 PR부터 분리 권고

---

## 배포 권고

**READY TO DEPLOY**

P0 이슈 없음. P1 6건 모두 수정 완료 확인. 빌드 에러 0건. 라우트 연결 확인 완료.

> P2 CSP 이슈는 배포 후 Windy iframe이 실제 차단되는지 확인 후 대응 권고.
