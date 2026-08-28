import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  CHAT_HISTORY_KEY,
  CHAT_HISTORY_LIMIT,
} from '@/lib/chatHistory';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('chat history persistence', () => {
  it('round-trips a conversation', () => {
    const history = [
      { role: 'user' as const, text: '우럭 시즌은?' },
      { role: 'model' as const, text: '가을이 좋습니다.' },
    ];
    saveChatHistory(history);
    expect(loadChatHistory()).toEqual(history);
    expect(store.has(CHAT_HISTORY_KEY)).toBe(true);
  });

  it('keeps only the most recent turns', () => {
    const many = Array.from({ length: CHAT_HISTORY_LIMIT + 5 }, (_, i) => ({
      role: 'user' as const,
      text: `q${i}`,
    }));
    saveChatHistory(many);
    const loaded = loadChatHistory();
    expect(loaded).toHaveLength(CHAT_HISTORY_LIMIT);
    expect(loaded[loaded.length - 1].text).toBe(`q${many.length - 1}`);
  });

  it('drops malformed entries instead of crashing the chat', () => {
    store.set(
      CHAT_HISTORY_KEY,
      JSON.stringify([
        { role: 'user', text: 'ok' },
        { role: 'alien', text: 'bad role' },
        { role: 'model' },
        null,
        'string',
      ]),
    );
    expect(loadChatHistory()).toEqual([{ role: 'user', text: 'ok' }]);
  });

  it('returns empty for corrupt or missing storage, and clears cleanly', () => {
    expect(loadChatHistory()).toEqual([]);
    store.set(CHAT_HISTORY_KEY, 'not json');
    expect(loadChatHistory()).toEqual([]);
    saveChatHistory([{ role: 'user', text: 'x' }]);
    clearChatHistory();
    expect(loadChatHistory()).toEqual([]);
  });
});
