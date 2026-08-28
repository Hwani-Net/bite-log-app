import { describe, it, expect } from 'vitest';
import { fishGradient, DEFAULT_FISH_GRADIENT } from '@/lib/fishColors';
import { FISH_SPECIES } from '@/types';

describe('fishGradient', () => {
  it('covers every FISH_SPECIES entry — adding a species without a color fails here', () => {
    for (const species of FISH_SPECIES) {
      if (species === '기타') continue; // 기타는 의도적으로 폴백 색
      expect(fishGradient(species), species).not.toBe(DEFAULT_FISH_GRADIENT);
      expect(fishGradient(species), species).toMatch(/^from-.+ to-.+$/);
    }
  });

  it('falls back for free-typed species outside the list', () => {
    expect(fishGradient('은갈치외계종')).toBe(DEFAULT_FISH_GRADIENT);
    expect(fishGradient('')).toBe(DEFAULT_FISH_GRADIENT);
  });

  it('the new species are selectable and colored — the integrity gap this goal closes', () => {
    expect(FISH_SPECIES).toContain('주꾸미');
    expect(FISH_SPECIES).toContain('갑오징어');
    expect(fishGradient('주꾸미')).toBe('from-red-400 to-orange-300'); // 기존 팔레트 유지
  });
});
