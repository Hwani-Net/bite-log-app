'use client';

import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { logAppEvent } from '@/lib/firebase';

export default function PaywallBottomSheet() {
  const { isPaywallOpen, paywallFeature, closePaywall, isPro } = useSubscriptionStore();
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);

  useEffect(() => {
    if (isPaywallOpen) {
      if (isPro) {
        // Just in case Pro users somehow open this, close it immediately
        closePaywall();
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
      logAppEvent('paywall_impression', { feature: paywallFeature });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isPaywallOpen, paywallFeature, isPro, closePaywall]);

  if (!isRendered) return null;

  const getCopy = () => {
    switch (paywallFeature) {
      case 'chatbot':
        return {
          title: '무료 챗봇 이용 횟수 소진',
          desc: '오늘 제공된 무료 전문가 챗봇 질문 3회를 모두 사용했습니다. PRO 버전에서 무제한으로 AI 컨시어지에게 물어보세요!',
        };
      case 'secret_point':
        return {
          title: 'PRO 전용 시크릿 포인트 탐색',
          desc: '현지인들만 아는 최고급 포인트 정보는 PRO 회원에게만 공개됩니다. 다음 출조 성공률을 200% 올려보세요.',
        };
      default:
        return {
          title: 'BITE Log PRO',
          desc: '빅데이터 기반 낚시 인텔리전스로 남들보다 먼저 폭조 기회를 잡으세요.',
        };
    }
  };

  const copy = getCopy();

  const handlePreRegister = () => {
    logAppEvent('paywall_cta_click', { feature: paywallFeature, action: 'pre_register' });
    setIsToastOpen(true);
    setTimeout(() => {
      setIsToastOpen(false);
      closePaywall();
    }, 2500);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      logAppEvent('paywall_dismiss', { feature: paywallFeature, reason: 'backdrop' });
      closePaywall();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white w-full rounded-t-3xl p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transform transition-transform duration-300 relative ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Grabber */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6" />

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="material-symbols-outlined text-white text-4xl">
              workspace_premium
            </span>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              {copy.title}
            </h2>
            <p className="text-slate-600 leading-relaxed text-[15px] px-2">
              {copy.desc}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 w-full border border-slate-100">
            <ul className="space-y-3 text-left">
              {[
                { icon: 'forum', text: 'AI 컨시어지 무제한 질문' },
                { icon: 'location_on', text: '지역별 시크릿 배스 포인트 무제한 열람' },
                { icon: 'notifications_active', text: '실시간 카카오톡 오픈런 알림 10개 (무료 1개)' },
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <span className="material-symbols-outlined text-blue-500 text-xl">{item.icon}</span>
                  <span className="text-slate-700 text-[15px] font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full space-y-3 pt-2">
            <button 
              onClick={handlePreRegister}
              className="w-full relative overflow-hidden group bg-slate-900 text-white rounded-2xl py-4 font-bold text-lg shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              PRO 사전 예약하고 1개월 무료받기
            </button>
            <button 
              onClick={() => {
                logAppEvent('paywall_dismiss', { feature: paywallFeature, reason: 'cancel_btn' });
                closePaywall();
              }}
              className="w-full py-3 text-slate-500 font-medium active:bg-slate-100 rounded-xl transition-colors"
            >
              다음에 할게요
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div 
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center justify-center space-y-2 z-[60] transition-all duration-300 ${
          isToastOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
        <p className="font-bold text-center">사전 예약이 완료되었습니다!<br/><span className="text-sm font-medium opacity-80 mt-1 block">정식 출시 시 알림을 보내드릴게요 :)</span></p>
      </div>
    </div>
  );
}
