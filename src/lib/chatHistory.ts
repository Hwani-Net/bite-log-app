// 5차 GOAL-5 — AI 마스터 대화 영속. 예전엔 useState뿐이라 새로고침
// 한 번에 대화가 사라졌다. 최근 N턴만 남긴다(무한 증식 방지).
import type { ChatMessage } from "@/services/fishExpertChatService";

export const CHAT_HISTORY_KEY = "biteLog_chatHistory";
export const CHAT_HISTORY_LIMIT = 20;

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "model") &&
        typeof m.text === "string",
    );
  } catch {
    return [];
  }
}

export function saveChatHistory(history: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify(history.slice(-CHAT_HISTORY_LIMIT)),
    );
  } catch {
    // 저장 실패는 대화를 막지 않는다
  }
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_HISTORY_KEY);
}
