// One search box, two sources (더피싱 + 낚시뚜) that don't share a schema —
// this is the one thing they both need: a case-insensitive substring test
// across whichever fields a caller considers searchable for its boat shape.

/**
 * Empty/whitespace-only keyword matches everything (no filter applied).
 * Normalized to NFC before comparing — macOS decomposes Hangul into
 * jamo (NFD) by default in text input, which would otherwise silently
 * fail to match server data that's already composed (NFC).
 */
export function matchesKeyword(
  keyword: string,
  ...fields: (string | undefined)[]
): boolean {
  const q = keyword.trim().normalize("NFC").toLowerCase();
  if (!q) return true;
  return fields.some((f) => !!f && f.normalize("NFC").toLowerCase().includes(q));
}
