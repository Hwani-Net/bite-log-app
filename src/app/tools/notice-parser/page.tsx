'use client';

import { useState } from 'react';
import { parseNotice, NoticeParseResult } from '@/services/noticeParserService';

export default function NoticeParserToolsPage() {
  const [input, setInput] = useState('이번주 일요일 대천항 쭈꾸미 출조. 현재 딱 2자리 남았습니다! 서두르세요~');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NoticeParseResult | null>(null);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await parseNotice(input);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-display p-6 pb-20">
      <header className="mb-8">
        <button onClick={() => window.history.back()} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span className="text-sm font-medium">돌아가기</span>
        </button>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
          자연어 공지 파서 <span className="text-xs ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold uppercase">LLM Feature</span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          선사나 낚시점에서 매일 올리는 카카오톡/밴드 텍스트 공지를 입력하면 AI가 정형 데이터로 똑똑하게 파싱합니다.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Input Area */}
        <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <label className="text-sm font-bold text-slate-700 mb-2 flex justify-between">
            <span>공지사항 텍스트 입력</span>
            <button 
              onClick={() => setInput('10/12(토) 오전시간 배 넙치농어 출조합니다! 현재 4자리 여유있음. \n\n*주의사항: 지렁이 미끼 금지')}
              className="text-xs text-primary font-medium hover:underline"
            >
              예제 1
            </button>
          </label>
          <textarea
            className="w-full flex-1 min-h-[250px] p-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-slate-700"
            placeholder="선사나 낚시점 텍스트 공지를 복사해서 붙여넣으세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleParse}
            disabled={loading || !input.trim()}
            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                파싱 중...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                정보 추출하기
              </>
            )}
          </button>
        </div>

        {/* Output Area */}
        <div className="flex-1">
          {result ? (
            <div className={`rounded-2xl p-6 border shadow-sm h-full flex flex-col ${result.isSuccess ? 'bg-white border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                <span className={`material-symbols-outlined text-2xl ${result.isSuccess ? 'text-emerald-500' : 'text-red-500'}`}>
                  {result.isSuccess ? 'check_circle' : 'error'}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {result.isSuccess ? '추출 성공' : '추출 실패 (할루시네이션 방어)'}
                  </h3>
                  <p className="text-xs text-slate-500">신뢰도: {result.confidence}%</p>
                </div>
              </div>

              {result.isSuccess ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">calendar_month</span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">출조일</p>
                      <p className="font-medium text-slate-800">{result.date || '알 수 없음'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">set_meal</span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">어종</p>
                      <div className="flex gap-1 mt-0.5">
                        {result.species.length > 0 ? result.species.map(s => (
                          <span key={s} className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{s}</span>
                        )) : <span className="text-sm text-slate-500">알 수 없음</span>}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">event_seat</span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">잔여 좌석 / 남은 원반</p>
                      <p className="font-bold text-slate-800 text-lg">{result.remainingSeats !== null ? `${result.remainingSeats}자리` : '알 수 없음'}</p>
                    </div>
                  </div>
                  
                  {result.reasoning && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-400 mb-1">AI 추론 근거</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg inline-block border border-slate-100">
                        {result.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">gpp_maybe</span>
                  <p className="text-sm">입력된 텍스트가 낚시 공지사항과 관련이 없거나 필요한 정보를 찾을 수 없습니다.</p>
                  {result.reasoning && (
                     <p className="text-xs text-red-400 mt-2 bg-red-100/50 p-2 rounded-lg">{result.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">document_scanner</span>
              <p className="font-medium">준비 완료</p>
              <p className="text-sm mt-1">왼쪽에서 텍스트를 입력하고 &apos;정보 추출하기&apos; 버튼을 누르세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
