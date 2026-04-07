"use client";

import { useRef, useEffect } from "react";
import {
  ChatMessage,
  CHAT_SPECIES,
  getQuickReplies,
} from "@/services/fishExpertChatService";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { Send, Sparkles } from "lucide-react";

interface AIChatTabProps {
  locale: string;
  chatHistory: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  selectedSpecies: string | null;
  setChatInput: (val: string) => void;
  setSelectedSpecies: (
    val: string | null | ((prev: string | null) => string | null),
  ) => void;
  onSend: (msg: string) => void;
  onClear: () => void;
}

export default function AIChatTab({
  locale,
  chatHistory,
  chatInput,
  chatLoading,
  selectedSpecies,
  setChatInput,
  setSelectedSpecies,
  onSend,
  onClear,
}: AIChatTabProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { isPro, chatbotCredits } = useSubscriptionStore();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="mb-3 flex justify-between items-start gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            🤖 {locale === "ko" ? "AI 낚시 마스터" : "AI Fishing Master"}
          </h3>
          <p className="text-xs text-white/50 mt-1">
            {locale === "ko"
              ? "어종을 선택하고 무엇이든 물어보세요."
              : "Select a species and ask anything."}
          </p>
        </div>
        {!isPro && (
          <div className="bg-[#c9a84c]/10 shrink-0 text-[#c9a84c] px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-[#c9a84c]/20 whitespace-nowrap">
            {locale === "ko"
              ? `무료 질문 ${chatbotCredits}/3`
              : `Credits ${chatbotCredits}/3`}
          </div>
        )}
      </div>

      {/* Species selector chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2 shrink-0">
        {CHAT_SPECIES.map((sp) => (
          <button
            key={sp}
            onClick={() =>
              setSelectedSpecies((prev) => (prev === sp ? null : sp))
            }
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              selectedSpecies === sp
                ? "bg-[#c9a84c] text-[#080d14] border-transparent shadow-lg shadow-[#c9a84c]/30 scale-105"
                : "bg-white/5 text-white/70 border-white/10 hover:border-[#c9a84c]/40"
            }`}
          >
            {sp}
          </button>
        ))}
      </div>

      {/* Quick Reply Buttons */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2 shrink-0">
        {getQuickReplies(selectedSpecies).map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            disabled={chatLoading}
            className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#c9a84c] hover:bg-white/10 transition-all whitespace-nowrap disabled:opacity-50"
          >
            💡 {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-white/[0.02] rounded-2xl border border-white/5 p-4 overflow-y-auto flex flex-col gap-4 mb-3">
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40 py-4">
            <Sparkles size={28} className="text-[#c9a84c]/40 mb-2" />
            <p className="text-xs font-semibold">
              {locale === "ko"
                ? "낚시에 대해 물어보세요 🎣"
                : "Ask about fishing 🎣"}
            </p>
            <p className="text-xs mt-1 text-center px-4 text-white/30">
              {locale === "ko"
                ? "특정 어종의 공략법, 물때표 보는 법, 장비 구성 등 무엇이든 환영합니다."
                : "Tips, tackle recommendations, tide interpretation - anything goes."}
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#c9a84c] text-[#080d14] rounded-2xl rounded-br-sm"
                    : "bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              <span
                className="w-2 h-2 bg-[#c9a84c]/60 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-[#c9a84c]/60 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-[#c9a84c]/60 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} className="h-2" />
      </div>

      {/* Free-form Input */}
      <div className="flex gap-2 shrink-0 bg-white/5 p-2 rounded-full border border-white/10 focus-within:ring-2 focus-within:ring-[#c9a84c]/20 focus-within:border-[#c9a84c]/50 transition-all mb-2">
        <input
          type="text"
          className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none text-white placeholder:text-white/30"
          placeholder={
            locale === "ko"
              ? `${selectedSpecies ? selectedSpecies + " " : ""}질문을 입력하세요...`
              : "Ask a question..."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && chatInput.trim() && !chatLoading) {
              onSend(chatInput.trim());
            }
          }}
        />
        <button
          disabled={!chatInput.trim() || chatLoading}
          onClick={() => {
            if (chatInput.trim() && !chatLoading) onSend(chatInput.trim());
          }}
          aria-label={locale === "ko" ? "메시지 전송" : "Send message"}
          className="w-10 h-10 rounded-full bg-[#c9a84c] disabled:bg-white/10 text-[#080d14] disabled:text-white/30 flex items-center justify-center transition-all shrink-0"
        >
          <Send size={14} />
        </button>
      </div>

      {chatHistory.length > 0 && (
        <button
          onClick={onClear}
          className="text-[10px] font-bold text-white/30 hover:text-white/60 w-full text-center transition-colors uppercase tracking-wider"
        >
          {locale === "ko" ? "대화 기록 지우기" : "Clear Chat History"}
        </button>
      )}
    </div>
  );
}
