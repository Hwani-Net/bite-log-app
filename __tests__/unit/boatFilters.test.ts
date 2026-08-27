import { describe, it, expect } from 'vitest';
import { parseCapacity, capacityBucket, extractPorts } from '@/lib/boatFilters';

describe('parseCapacity', () => {
  it('parses a clean "N인승" string', () => {
    expect(parseCapacity('12인승')).toBe(12);
    expect(parseCapacity('9인승')).toBe(9);
  });

  it('parses a "N 인승" with a space', () => {
    expect(parseCapacity('12 인승')).toBe(12);
  });

  it('returns null for an empty string', () => {
    expect(parseCapacity('')).toBeNull();
  });

  it('returns null for text with no capacity number at all', () => {
    expect(parseCapacity('정원 미표기')).toBeNull();
  });

  it('returns null when the number is present but "인승" is missing', () => {
    expect(parseCapacity('12명')).toBeNull();
  });

  it('picks the first number+인승 out of surrounding noise', () => {
    expect(parseCapacity('★특가★ 12인승 신조선')).toBe(12);
  });
});

describe('capacityBucket', () => {
  it('buckets 소형 at 10 and below', () => {
    expect(capacityBucket('9인승')).toBe('small');
    expect(capacityBucket('10인승')).toBe('small');
  });

  it('buckets 중형 from 11 to 18', () => {
    expect(capacityBucket('11인승')).toBe('medium');
    expect(capacityBucket('18인승')).toBe('medium');
  });

  it('buckets 대형 at 19 and above', () => {
    expect(capacityBucket('19인승')).toBe('large');
    expect(capacityBucket('45인승')).toBe('large');
  });

  it('returns null for unparseable capacity — no bucket, not a guess', () => {
    expect(capacityBucket('')).toBeNull();
    expect(capacityBucket('정원 미표기')).toBeNull();
  });
});

describe('extractPorts', () => {
  it('takes the last segment of each areaPath', () => {
    expect(
      extractPorts([
        '서해권 > 충청남도 > 보령시 > 대천항',
        '서해권 > 충청남도 > 서천군 > 홍원항',
      ]),
    ).toEqual(['대천항', '홍원항']);
  });

  it('de-duplicates, keeping first-seen order', () => {
    expect(
      extractPorts([
        '서해권 > 충청남도 > 보령시 > 대천항',
        '서해권 > 충청남도 > 서천군 > 홍원항',
        '서해권 > 충청남도 > 보령시 > 대천항',
      ]),
    ).toEqual(['대천항', '홍원항']);
  });

  it('skips an areaPath that yields no usable port', () => {
    expect(extractPorts(['', '서해권 > 충청남도 > 보령시 > 대천항'])).toEqual([
      '대천항',
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(extractPorts([])).toEqual([]);
  });
});
