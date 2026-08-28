import { describe, it, expect } from 'vitest';
import { legalityWarning } from '@/lib/catchLegality';

// 실제 규정DB 값 기준: 주꾸미 금어기 5/1~8/31(300만원 이하), 우럭 체장
// 23cm 미만 금지(100만원 이하), 감성돔 금어기 5/1~6/30 + 체장 25cm.
describe('legalityWarning', () => {
  it('warns inside a closed season with the penalty and legal reference', () => {
    const w = legalityWarning('주꾸미', null, '2026-08-28')!;
    expect(w.violations.some((v) => v.includes('금어기'))).toBe(true);
    expect(w.penaltyNote).toContain('300만원');
    expect(w.legalRef).toContain('수산자원관리법');
  });

  it('stays silent right after the season opens', () => {
    expect(legalityWarning('주꾸미', null, '2026-09-01')).toBeNull();
  });

  it('warns on an undersized fish, and not on a legal one', () => {
    const w = legalityWarning('우럭', 10, '2026-10-15')!;
    expect(w.violations.some((v) => v.includes('체장'))).toBe(true);
    expect(w.penaltyNote).toContain('100만원');
    expect(legalityWarning('우럭', 30, '2026-10-15')).toBeNull();
    // 사이즈 미입력이면 체장 판정 불가 → 경고 없음(오탐 금지)
    expect(legalityWarning('우럭', null, '2026-10-15')).toBeNull();
  });

  it('stacks both violations for a closed-season undersized fish', () => {
    const w = legalityWarning('감성돔', 10, '2026-05-15')!;
    expect(w.violations).toHaveLength(2);
  });

  it('is boundary-inclusive on the closed season end date', () => {
    expect(legalityWarning('감성돔', null, '2026-06-30')).not.toBeNull();
    expect(legalityWarning('감성돔', null, '2026-07-01')).toBeNull();
  });

  it('returns null for unknown species and malformed dates', () => {
    expect(legalityWarning('은갈치외계종', 5, '2026-08-28')).toBeNull();
    expect(legalityWarning('주꾸미', null, '2026-13-99')).toBeNull();
  });
});
