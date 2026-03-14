'use client';

import { useState, useEffect, useCallback } from 'react';
import SplashScreen from '@/components/SplashScreen';

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  // Always start false (matches SSR); sessionStorage is read only after mount
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Defer sessionStorage access to useEffect to prevent hydration mismatch
    setShowSplash(!sessionStorage.getItem('bitelog_splash_shown'));
  }, []);

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
