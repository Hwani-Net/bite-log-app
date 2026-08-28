import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 전역 에러 바운더리는 실제 크래시 때만 보이는 화면이라 조용히 사라지거나
// 망가져도 아무도 모른다. 존재와 복구 수단만이라도 고정한다(렌더 검증은
// 프로덕션 빌드가 필요해 배포 전 수동 확인 — screenshots/error-boundary.png).
const file = join(process.cwd(), 'src', 'app', 'global-error.tsx');

describe('global error boundary', () => {
  it('exists — 없으면 Next 기본 "Application error" 화면으로 되돌아간다', () => {
    expect(existsSync(file)).toBe(true);
  });

  it('offers both recovery actions and surfaces the cause', () => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('다시 시도');
    expect(src).toContain('캐시 비우고 새로고침');
    expect(src).toContain('caches.delete');
    expect(src).toContain('unregister');
    expect(src).toContain('error.message');
  });
});
