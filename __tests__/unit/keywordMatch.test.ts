import { describe, it, expect } from 'vitest';
import { matchesKeyword } from '@/lib/keywordMatch';

describe('matchesKeyword', () => {
  it('matches on the name field', () => {
    expect(matchesKeyword('몬스터', '오이도 몬스터호', '충남 보령시', '우럭')).toBe(true);
  });

  it('matches on the port/area field', () => {
    expect(matchesKeyword('보령', '오이도 몬스터호', '충남 보령시', '우럭')).toBe(true);
  });

  it('matches on the species field', () => {
    expect(matchesKeyword('우럭', '오이도 몬스터호', '충남 보령시', '우럭')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesKeyword('MONSTER', 'Monster호')).toBe(true);
  });

  it('does not match when no field contains the keyword', () => {
    expect(matchesKeyword('참돔', '오이도 몬스터호', '충남 보령시', '우럭')).toBe(false);
  });

  it('treats an empty keyword as matching everything', () => {
    expect(matchesKeyword('', '오이도 몬스터호')).toBe(true);
    expect(matchesKeyword('   ', '오이도 몬스터호')).toBe(true);
  });

  it('skips undefined fields without matching them', () => {
    expect(matchesKeyword('우럭', '몬스터호', undefined, undefined)).toBe(false);
  });

  it('matches across NFD/NFC Hangul normalization mismatches', () => {
    // macOS decomposes Hangul into jamo (NFD) by default in text inputs;
    // server-scraped data is composed (NFC). Without normalizing both
    // sides, an identical-looking keyword silently fails to match.
    const decomposedKeyword = '몬스터'.normalize('NFD');
    const composedName = '오이도 몬스터호'; // already NFC
    expect(decomposedKeyword).not.toBe('몬스터'); // sanity: actually different code points
    expect(matchesKeyword(decomposedKeyword, composedName)).toBe(true);

    const decomposedField = '오이도 몬스터호'.normalize('NFD');
    expect(matchesKeyword('몬스터', decomposedField)).toBe(true);
  });
});
