import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sw = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

describe('service worker caching strategy', () => {
  it('serves document navigations network-first, not from cache', () => {
    // 재방문자에게 옛 HTML을 주면 그 HTML이 가리키는 청크가 새 배포에 없어
    // 앱이 통째로 죽는다(2026-08-28 사용자 보고). HTML은 배포본과 항상
    // 맞아야 하므로 navigate 분기는 반드시 네트워크 우선이어야 한다.
    const navigate = sw.match(
      /request\.mode === "navigate"[\s\S]{0,200}?respondWith\((\w+)/,
    );
    expect(navigate?.[1]).toBe('networkFirstWithTimeout');
  });

  it('registers the navigate branch before the generic page fallback', () => {
    expect(sw.indexOf('request.mode === "navigate"')).toBeLessThan(
      sw.lastIndexOf('staleWhileRevalidate(request, CACHE_NAME)'),
    );
  });
});
