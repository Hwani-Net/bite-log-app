'use client';

import { create } from 'zustand';
import { Locale, createT } from '@/lib/i18n';

type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  locale: Locale;
  theme: ThemeMode;
  t: ReturnType<typeof createT>;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  initFromStorage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: 'ko',
  theme: 'light',
  t: createT('ko'),

  setLocale: (locale) => {
    if (typeof window !== 'undefined') localStorage.setItem('fishlog_locale', locale);
    set({ locale, t: createT(locale) });
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fishlog_theme', theme);
      applyTheme(theme);
    }
    set({ theme });
  },

  initFromStorage: () => {
    if (typeof window === 'undefined') return;
    const savedLocale = (localStorage.getItem('fishlog_locale') as Locale) || 'ko';
    const savedTheme = (localStorage.getItem('fishlog_theme') as ThemeMode) || 'light';
    applyTheme(savedTheme);
    set({ locale: savedLocale, theme: savedTheme, t: createT(savedLocale) });
  },
}));

/** V4: .dark class on <html> — matches @custom-variant dark (&:is(.dark *)) */
function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  let isDark: boolean;
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDark = theme === 'dark';
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update theme-color meta for mobile browsers
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#101a22' : '#f6f7f8');
  }
}
