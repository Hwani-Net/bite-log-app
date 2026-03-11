'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage, CHAT_SPECIES, getQuickReplies } from '@/services/fishExpertChatService';

interface AIChatTabProps {
  locale: string;
  chatHistory: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  selectedSpecies: string | null;
  setChatInput: (val: string) => void;
  setSelectedSpecies: (val: string | null | ((prev: string | null) => string | null)) => void;
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

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="mb-3">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
          🤖 {locale === 'ko' ? 'AI 낚시 마스터' : 'AI Fishing Master'}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {locale === 'ko' ? '어종을 선택하고 무엇이든 물어보세요. 낚시 채비, 물때, 팁을 알려드려요.' : 'Select a species and ask anything.'}
        </p>
      </div>

      {/* Species selector chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2 shrink-0">
        {CHAT_SPECIES.map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSpecies(prev => prev === sp ? null : sp)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              selectedSpecies === sp
                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white border-transparent shadow-lg shadow-primary/30 scale-105'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
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
            className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-all whitespace-nowrap disabled:opacity-50"
          >
            💡 {q}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-gradient-to-b from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 p-4 overflow-y-auto flex flex-col gap-4 shadow-inner mb-3">
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-70 py-4">
            <span className="material-symbols-outlined text-3xl text-primary/40 mb-2">smart_toy</span>
            <p className="text-xs font-semibold">{locale === 'ko' ? '낚시에 대해 물어보세요 🎣' : 'Ask about fishing 🎣'}</p>
            <p className="text-xs mt-1 text-center px-4">
              {locale === 'ko' 
                ? '특정 어종의 공략법, 물때표 보는 법, 장비 구성 등 무엇이든 환영합니다.' 
                : 'Tips, tackle recommendations, tide interpretation - anything goes.'}
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} className="h-2" />
      </div>

      {/* Free-form Input */}
      <div className="flex gap-2 shrink-0 bg-white p-2 rounded-full border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        <input
          type="text"
          className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-slate-400"
          placeholder={locale === 'ko' ? `${selectedSpecies ? selectedSpecies + ' ' : ''}질문을 입력하세요...` : 'Ask a question...'}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && chatInput.trim() && !chatLoading) {
              onSend(chatInput.trim());
            }
          }}
        />
        <button
          disabled={!chatInput.trim() || chatLoading}
          onClick={() => {
            if (chatInput.trim() && !chatLoading) onSend(chatInput.trim());
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 disabled:from-slate-200 disabled:to-slate-300 text-white flex items-center justify-center transition-all shrink-0 shadow-md shadow-primary/20 hover:shadow-lg disabled:shadow-none"
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>

      {chatHistory.length > 0 && (
        <button
          onClick={onClear}
          className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 w-full text-center transition-colors uppercase tracking-wider"
        >
          {locale === 'ko' ? '대화 기록 지우기' : 'Clear Chat History'}
        </button>
      )}
    </div>
  );
}
