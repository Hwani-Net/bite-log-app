'use client';

import { useState, useCallback } from 'react';
import SplashScreen from '@/components/SplashScreen';

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('bitelog_splash_shown');
  });

  const handleFinish = useCallback(() => {
    sessionStorage.setItem('bitelog_splash_shown', '1');
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      {children}
    </>
  );
}
