'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem('fishlog_splash_shown');
    if (shown) return;
    sessionStorage.setItem('fishlog_splash_shown', '1');
    setVisible(true);
    const fadeTimer = setTimeout(() => setFadeOut(true), 1500);
    const hideTimer = setTimeout(() => setVisible(false), 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #162030 0%, #101a22 70%)',
        transition: 'opacity 0.6s ease-out',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(19,146,236,0.08) 1px, transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{ marginBottom: '12px', opacity: 0.9 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="rgba(19,146,236,0.15)" />
            <path d="M10 28C14 20 20 16 24 16C28 16 34 20 38 28" stroke="#1392ec" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <ellipse cx="24" cy="30" rx="5" ry="3.5" fill="#1392ec" fillOpacity="0.9" />
            <circle cx="26" cy="28.5" r="1" fill="white" />
          </svg>
        </div>

        <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.04em', fontFamily: "Inter, Pretendard, sans-serif", lineHeight: 1 }}>
          FishLog
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#94a3b8', fontFamily: "Noto Sans KR, Pretendard, sans-serif", letterSpacing: '0.02em' }}>
          나의 낚시 일지
        </p>
        <div style={{ width: '40px', height: '2px', background: '#1392ec', margin: '16px auto 0', borderRadius: '1px' }} />
      </div>

      <p style={{ position: 'absolute', bottom: '48px', margin: 0, fontSize: '12px', color: '#475569', fontFamily: "Noto Sans KR, Pretendard, sans-serif", letterSpacing: '0.01em' }}>
        AI가 분석한 나만의 낚시 데이터
      </p>
    </div>
  );
}
