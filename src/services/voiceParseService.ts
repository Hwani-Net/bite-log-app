/**
 * voiceParseService.ts
 * Parses voice transcript into catch record fields.
 * Designed for Korean fishing context (새벽 갯바위, 손 젖음, 장갑 착용).
 */

import { FISH_SPECIES } from '@/types';

export interface VoiceParsedResult {
  species?: string;
  count?: number;
  sizeCm?: number;
  locationHint?: string;
  rawText: string;
}

// Korean number words → digits
const KO_NUMBERS: Record<string, number> = {
  '한': 1, '하나': 1, '일': 1,
  '두': 2, '둘': 2, '이': 2,
  '세': 3, '셋': 3, '삼': 3,
  '네': 4, '넷': 4, '사': 4,
  '다섯': 5, '오': 5,
  '여섯': 6, '육': 6,
  '일곱': 7, '칠': 7,
  '여덟': 8, '팔': 8,
  '아홉': 9, '구': 9,
  '열': 10, '십': 10,
};

// Size unit synonyms
const SIZE_UNITS = ['센티', '센치', 'cm', 'CM', '센티미터'];
// Count unit synonyms
const COUNT_UNITS = ['마리', '개', '마리짜리'];

// Location keywords to extract
const LOCATION_KEYWORDS = [
  '방파제', '갯바위', '부두', '선착장', '바다', '민물', '저수지', '강', '호수',
  '항구', '포구', '낚시터', '포인트',
];

/**
 * Fuzzy-match a word against FISH_SPECIES list.
 * Returns the best matching species name or undefined.
 */
function matchSpecies(word: string): string | undefined {
  // Exact match first
  const exact = FISH_SPECIES.find((s) => s === word);
  if (exact) return exact;

  // Partial match (species name contains the word or vice versa)
  const partial = FISH_SPECIES.find(
    (s) => s.includes(word) || word.includes(s)
  );
  return partial;
}

/**
 * Parse Korean number from string, supporting mixed digit+word formats.
 * e.g. "28" → 28, "다섯" → 5, "10" → 10
 */
function parseKoreanNumber(str: string): number | undefined {
  const trimmed = str.trim();
  // Arabic numeral
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  // Korean word
  return KO_NUMBERS[trimmed];
}

/**
 * Main parse function.
 * Input: raw voice transcript string (Korean)
 * Output: VoiceParsedResult with extracted fields
 */
export function parseVoiceInput(text: string): VoiceParsedResult {
  const result: VoiceParsedResult = { rawText: text };
  const normalized = text.replace(/\s+/g, ' ').trim();

  // ── 1. Species detection ──────────────────────────────────────────
  // Try each word (split by space/punctuation)
  const tokens = normalized.split(/[\s,。.!?]+/);
  for (const token of tokens) {
    const matched = matchSpecies(token);
    if (matched) {
      result.species = matched;
      break;
    }
  }

  // ── 2. Size detection (e.g. "28센티", "35cm") ────────────────────
  for (const unit of SIZE_UNITS) {
    const regex = new RegExp(`(\\d+)\\s*${unit}`, 'i');
    const match = normalized.match(regex);
    if (match) {
      const size = parseInt(match[1], 10);
      if (!isNaN(size) && size > 0 && size < 300) {
        result.sizeCm = size;
        break;
      }
    }
  }

  // ── 3. Count detection (e.g. "5마리", "한 마리") ─────────────────
  // Pattern: [number|korean-number] + count-unit
  for (const unit of COUNT_UNITS) {
    // Arabic numeral + unit
    const digitRegex = new RegExp(`(\\d+)\\s*${unit}`);
    const digitMatch = normalized.match(digitRegex);
    if (digitMatch) {
      const count = parseInt(digitMatch[1], 10);
      if (!isNaN(count) && count > 0) {
        result.count = count;
        break;
      }
    }

    // Korean word + unit
    for (const [word, num] of Object.entries(KO_NUMBERS)) {
      const koRegex = new RegExp(`${word}\\s*${unit}`);
      if (koRegex.test(normalized)) {
        result.count = num;
        break;
      }
    }
    if (result.count) break;
  }

  // ── 4. Location hint detection ────────────────────────────────────
  // Named location keywords (갯바위, 방파제, etc.)
  for (const kw of LOCATION_KEYWORDS) {
    if (normalized.includes(kw)) {
      // Grab surrounding context (up to 6 chars before keyword)
      const idx = normalized.indexOf(kw);
      const before = normalized.substring(Math.max(0, idx - 6), idx).trim();
      result.locationHint = before ? `${before}${kw}` : kw;
      break;
    }
  }

  // If no keyword match, try to extract last token as location hint
  if (!result.locationHint && tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    // Only use if it's not a number, unit, or already matched species
    const isUnit = [...SIZE_UNITS, ...COUNT_UNITS].includes(lastToken);
    const isNumber = /^\d+$/.test(lastToken);
    if (!isUnit && !isNumber && lastToken !== result.species) {
      result.locationHint = lastToken;
    }
  }

  return result;
}

/**
 * Apply parsed result to record form state setters.
 * Returns list of fields that were auto-filled.
 */
export function applyParsedResult(
  parsed: VoiceParsedResult,
  setters: {
    setSpecies: (v: string) => void;
    setCount: (v: number) => void;
    setSizeCm: (v: string) => void;
    setLocationName: (v: string) => void;
  }
): string[] {
  const filled: string[] = [];

  if (parsed.species) {
    setters.setSpecies(parsed.species);
    filled.push(`어종: ${parsed.species}`);
  }
  if (parsed.count) {
    setters.setCount(parsed.count);
    filled.push(`마릿수: ${parsed.count}마리`);
  }
  if (parsed.sizeCm) {
    setters.setSizeCm(String(parsed.sizeCm));
    filled.push(`크기: ${parsed.sizeCm}cm`);
  }
  if (parsed.locationHint) {
    setters.setLocationName(parsed.locationHint);
    filled.push(`위치: ${parsed.locationHint}`);
  }

  return filled;
}
