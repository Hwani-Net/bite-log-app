import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vercel의 함수 서버는 UTC, 사용자 브라우저는 대개 KST(UTC+9)다. 렌더
// 중(useEffect 밖에서) new Date()로 시·월 같은 로컬 값을 구해 그 값이
// 무조건(로딩 게이트 없이) 그려지는 내용을 바꾸면, 서버가 그린 HTML과
// 클라이언트 첫 하이드레이션이 다른 값을 "지금"으로 표시해 React #418로
// 깨진다.
//
// 2026-08-28 전수조사에서 실측된 두 화면:
//  - /concierge: PeakTimeline의 currentHour, OverviewTab의 월 라벨.
//  - /bite-forecast: 헤더의 timeLabel(아침/낮/저녁/밤) — 이건 `loading`
//    게이트 밖(항상 그려지는 헤더)이라 실제 원인이었다. 같은 파일의
//    TideTimeline·WaterTempTimeline·예약 CTA도 new Date()를 쓰지만 전부
//    tideData/marine/biteTime이 fetch 전 null·loading=true인 동안은
//    애초에 안 그려져 무해하다 — 그래서 이 테스트는 파일 전체의 모든
//    new Date() 호출을 금지하지 않고, 실제로 고쳤던 세 지점이 마운트
//    이후에만 값을 채우는 패턴을 유지하는지만 고정한다.
const guarded: { file: string; state: string }[] = [
  { file: 'src/app/components/concierge/PeakTimeline.tsx', state: 'currentHour' },
  { file: 'src/app/components/concierge/OverviewTab.tsx', state: 'now' },
  { file: 'src/app/bite-forecast/page.tsx', state: 'currentMinutes' },
  { file: 'src/app/bite-forecast/page.tsx', state: 'timeLabel' },
];

describe('server/client clock skew — 마운트 후에만 시각을 읽는다', () => {
  for (const { file, state } of guarded) {
    it(`${file.split(/[\\/]/).pop()}의 ${state}는 useState + useEffect로 마운트 후에만 채워진다`, () => {
      const src = readFileSync(join(process.cwd(), file), 'utf8');
      const stateDecl = new RegExp(`useState<[^>]*>\\(null\\)`);
      const setterName = `set${state.charAt(0).toUpperCase()}${state.slice(1)}`;
      expect(src).toMatch(new RegExp(`const \\[${state}, ${setterName}\\]`));
      expect(src).toMatch(stateDecl);
      // setter 호출이 useEffect 콜백 안에 있는지 — 텍스트 순서로 대략
      // 검증(정밀 AST가 아니라 회귀를 잡는 최소 신호).
      const setterCallIdx = src.indexOf(`${setterName}(`, src.indexOf(`const [${state}`));
      const nearestEffectBefore = src.lastIndexOf('useEffect(', setterCallIdx);
      expect(nearestEffectBefore).toBeGreaterThan(-1);
      // 그 useEffect와 setter 호출 사이에 함수 바디가 안 끝나야(같은
      // 블록) 한다 — 최소 신호로 "), []);" 가 setter 호출보다 늦게
      // 나오는지 확인한다.
      const effectCloseIdx = src.indexOf('}, []);', nearestEffectBefore);
      expect(effectCloseIdx).toBeGreaterThan(setterCallIdx);
    });
  }
});
