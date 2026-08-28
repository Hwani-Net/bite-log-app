import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vercel의 함수 서버는 UTC, 사용자 브라우저는 대개 KST(UTC+9)다. 렌더
// 중(useEffect 밖에서) new Date()로 시·월을 구해 그 값이 화면 내용을
// 바꾸면, 서버가 그린 HTML과 클라이언트 첫 하이드레이션이 다른 값을
// "지금"으로 표시해 React #418로 깨진다 — 2026-08-28 전수조사에서
// /concierge 진입 시 실측(프로덕션 pageerror). 로컬은 서버·브라우저가
// 같은 시간대라 재현되지 않으므로, 소스 레벨로 "마운트 후에만 읽는다"
// 패턴이 유지되는지 고정한다.
const files = [
  join(process.cwd(), 'src/app/components/concierge/PeakTimeline.tsx'),
  join(process.cwd(), 'src/app/components/concierge/OverviewTab.tsx'),
];

describe('concierge — server/client clock skew', () => {
  for (const file of files) {
    it(`${file.split(/[\\/]/).pop()} never reads new Date() outside useEffect`, () => {
      const src = readFileSync(file, 'utf8')
        // 주석 속 설명 문장에도 "new Date()"라는 글자가 나오므로(이
        // 파일들 자체의 주석 포함) 코드가 아닌 줄은 먼저 걷어낸다.
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      // useEffect 콜백 안의 호출은 허용 — 그 블록만 제거하고 나머지에
      // 남은 new Date() 호출이 있으면 렌더 중 직접 호출이다.
      const withoutEffectDateCalls = src.replace(
        /useEffect\(\(\) => \{[\s\S]*?set\w+\(new Date\(\)(?:\.\w+\(\))?\);[\s\S]*?\}, \[\]\);/g,
        '',
      );
      expect(withoutEffectDateCalls).not.toContain('new Date()');
    });
  }
});
