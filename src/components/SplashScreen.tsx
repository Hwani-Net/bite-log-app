'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Phase 1: enter (logo animates in) 0~800ms
    const holdTimer = setTimeout(() => setPhase('hold'), 800);
    // Phase 2: hold (sparkles + ripple) 800~2200ms
    const exitTimer = setTimeout(() => setPhase('exit'), 2200);
    // Phase 3: exit (fade out) 2200~2800ms → unmount
    const doneTimer = setTimeout(() => onFinish(), 2800);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');

        .splash-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center top, #0c4a6e 0%, #0a1628 55%, #060d18 100%);
          overflow: hidden;
          transition: opacity 0.6s ease;
        }
        .splash-root.exit { opacity: 0; }

        /* ── 물결 배경 ── */
        .wave-bg {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 40%;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%230369a1' fill-opacity='0.15' d='M0,192L60,181.3C120,171,240,149,360,154.7C480,160,600,192,720,197.3C840,203,960,181,1080,165.3C1200,149,1320,139,1380,133.3L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom;
          background-size: cover;
          animation: waveSlide 4s ease-in-out infinite alternate;
        }
        @keyframes waveSlide {
          from { transform: translateX(-20px); }
          to   { transform: translateX(20px); }
        }

        /* ── 리플 링 ── */
        .ripple-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(56, 189, 248, 0.35);
          animation: rippleExpand 2.4s ease-out infinite;
        }
        .ripple-ring:nth-child(2) { animation-delay: 0.8s; }
        .ripple-ring:nth-child(3) { animation-delay: 1.6s; }
        @keyframes rippleExpand {
          0%   { width: 80px;  height: 80px;  opacity: 0.8; }
          100% { width: 340px; height: 340px; opacity: 0; }
        }

        /* ── 로고 ── */
        .logo-wrap {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          opacity: 0;
          transform: translateY(24px) scale(0.92);
          transition: all 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .logo-wrap.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .logo-text {
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 56px;
          letter-spacing: -2px;
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .logo-bite {
          color: #38bdf8;
          text-shadow:
            0 0 20px rgba(56, 189, 248, 0.9),
            0 0 60px rgba(56, 189, 248, 0.5),
            0 0 100px rgba(56, 189, 248, 0.2);
          animation: glowPulse 2s ease-in-out infinite alternate;
        }
        @keyframes glowPulse {
          from { text-shadow: 0 0 20px rgba(56,189,248,0.8), 0 0 50px rgba(56,189,248,0.4); }
          to   { text-shadow: 0 0 30px rgba(56,189,248,1),   0 0 80px rgba(56,189,248,0.7), 0 0 120px rgba(56,189,248,0.3); }
        }
        .logo-log {
          color: #ffffff;
          font-weight: 700;
          font-size: 48px;
        }

        .logo-divider {
          width: 60px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          margin: 14px 0 10px;
          animation: dividerGrow 0.6s ease-out 0.5s both;
        }
        @keyframes dividerGrow {
          from { width: 0; opacity: 0; }
          to   { width: 60px; opacity: 1; }
        }

        .logo-kr {
          font-size: 15px;
          color: #94a3b8;
          font-weight: 500;
          letter-spacing: 4px;
          text-transform: uppercase;
        }
        .logo-tagline {
          font-size: 12px;
          color: #64748b;
          margin-top: 6px;
          letter-spacing: 1px;
        }

        /* ── 스파클 ── */
        .sparkle {
          position: absolute;
          border-radius: 50%;
          background: #38bdf8;
          animation: sparklePop 1.8s ease-in-out infinite;
          opacity: 0;
        }
        .sparkle.gold { background: #fbbf24; }
        @keyframes sparklePop {
          0%   { transform: scale(0); opacity: 0; }
          40%  { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(0.2); opacity: 0; }
        }

        /* ── 물고기 ── */
        .fish-jump {
          position: absolute;
          font-size: 22px;
          animation: fishArc 2.4s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(56,189,248,0.6));
        }
        @keyframes fishArc {
          0%   { transform: translateY(0)   rotate(-30deg); opacity: 0; }
          20%  { opacity: 1; }
          50%  { transform: translateY(-60px) rotate(10deg); opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(0)   rotate(-30deg); opacity: 0; }
        }

        /* ── 로딩 바 ── */
        .loading-bar-track {
          position: absolute;
          bottom: 52px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 2px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
        }
        .loading-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #0ea5e9, #38bdf8);
          border-radius: 99px;
          animation: loadFill 2.4s ease-out forwards;
        }
        @keyframes loadFill {
          from { width: 0%; }
          to   { width: 100%; }
        }

        /* ── BETA 뱃지 ── */
        .beta-badge {
          position: absolute;
          top: 52px; right: 24px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #38bdf8;
          border: 1px solid rgba(56,189,248,0.4);
          padding: 2px 8px;
          border-radius: 99px;
          background: rgba(56,189,248,0.08);
        }
      `}</style>

      <div className={`splash-root${phase === 'exit' ? ' exit' : ''}`}>
        {/* 물결 배경 */}
        <div className="wave-bg" />

        {/* BETA 뱃지 */}
        <span className="beta-badge">BETA</span>

        {/* 리플 링 3개 */}
        <div className="ripple-ring" style={{ animationDelay: '0s' }} />
        <div className="ripple-ring" style={{ animationDelay: '0.8s' }} />
        <div className="ripple-ring" style={{ animationDelay: '1.6s' }} />

        {/* 스파클 점들 */}
        {[
          { size: 5, top: '30%', left: '20%', delay: '0s' },
          { size: 3, top: '25%', left: '75%', delay: '0.4s' },
          { size: 6, top: '65%', left: '15%', delay: '0.8s', gold: true },
          { size: 4, top: '60%', left: '80%', delay: '1.2s' },
          { size: 5, top: '40%', left: '85%', delay: '0.6s', gold: true },
          { size: 3, top: '72%', left: '55%', delay: '1.0s' },
        ].map((s, i) => (
          <div
            key={i}
            className={`sparkle${s.gold ? ' gold' : ''}`}
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* 물고기 점프 */}
        <div className="fish-jump" style={{ bottom: '32%', left: '38%', animationDelay: '0.6s' }}>
          🐟
        </div>

        {/* 메인 로고 */}
        <div className={`logo-wrap${phase !== 'enter' ? ' visible' : ''}`}>
          <div className="logo-text">
            <span className="logo-bite">BITE</span>
            <span className="logo-log"> Log</span>
          </div>
          <div className="logo-divider" />
          <span className="logo-kr">바이트로그</span>
          <span className="logo-tagline">입질의 순간을 기록하다</span>
        </div>

        {/* 로딩 바 */}
        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>
      </div>
    </>
  );
}
