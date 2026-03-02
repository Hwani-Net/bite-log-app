import { CatchRecord } from '@/types';

/**
 * Generate a shareable catch card as an HTML string that can be used
 * with the Web Share API or rendered as a canvas for image conversion.
 */
export function generateShareText(record: CatchRecord, locale: string): string {
  const lines: string[] = [];

  lines.push(locale === 'ko' ? '🎣 BITE Log 조과 기록' : '🎣 BITE Log Catch Record');
  lines.push('');
  lines.push(`🐟 ${record.species} ${record.count}${locale === 'ko' ? '마리' : ' fish'}`);
  if (record.sizeCm) {
    lines.push(`📏 ${record.sizeCm}cm`);
  }
  lines.push(`📍 ${record.location.name}`);
  lines.push(`📅 ${record.date}`);

  if (record.weather) {
    lines.push(`🌤️ ${record.weather.condition} ${record.weather.tempC}°C`);
  }

  if (record.memo) {
    lines.push('');
    lines.push(`💬 ${record.memo}`);
  }

  lines.push('');
  lines.push('#BITE Log #낚시 #조과');

  return lines.join('\n');
}

/**
 * Share a catch record using the Web Share API.
 * Falls back to clipboard copy if Web Share is not available.
 */
export async function shareCatchRecord(
  record: CatchRecord,
  locale: string
): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  const text = generateShareText(record, locale);

  // Try native Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: locale === 'ko' ? 'BITE Log 조과 기록' : 'BITE Log Catch Record',
        text,
      });
      return { success: true, method: 'share' };
    } catch (err) {
      // User cancelled or share failed — fall through to clipboard
      if ((err as DOMException).name === 'AbortError') {
        return { success: false, method: 'share' };
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'clipboard' };
  }
}
