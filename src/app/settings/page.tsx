'use client';

import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function SettingsPage() {
  const { t, theme, setTheme, locale, setLocale } = useAppStore();
  const { user, isLoggedIn, signInWithGoogle, signOut, loading } = useAuth();

  const themes = [
    { value: 'light' as const, icon: 'light_mode', label: t('theme.light'), desc: locale === 'ko' ? '밝은 화면' : 'Bright' },
    { value: 'dark' as const, icon: 'dark_mode', label: t('theme.dark'), desc: locale === 'ko' ? '어두운 화면' : 'Dark' },
    { value: 'system' as const, icon: 'devices', label: t('theme.system'), desc: locale === 'ko' ? '기기 설정' : 'Device' },
  ];

  const languages = [
    { value: 'ko' as const, label: '한국어', flag: 'KR' },
    { value: 'en' as const, label: 'English', flag: 'US' },
  ];

  return (
    <div className="page-enter relative z-10 px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">settings</span>
          {t('nav.settings')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {locale === 'ko' ? '앱 환경을 설정하세요' : 'Customize your experience'}
        </p>
      </header>

      {/* Profile / Auth */}
      <section className="mb-6">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 shadow-sm">
          {isLoggedIn && user ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shadow-lg">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-white">🎣</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">
                  {user.displayName || (locale === 'ko' ? '낚시인' : 'Angler')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-medium transition-colors hover:bg-red-100:bg-red-900/40"
              >
                {locale === 'ko' ? '로그아웃' : 'Logout'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎣</span>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-900">
                  {locale === 'ko' ? '로그인하고 기록을 동기화하세요' : 'Sign in to sync your data'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'ko' ? '다른 기기에서도 낚시 기록을 확인할 수 있어요' : 'Access your fishing records across devices'}
                </p>
              </div>
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700">
                  {loading
                    ? (locale === 'ko' ? '로그인 중...' : 'Signing in...')
                    : (locale === 'ko' ? 'Google로 로그인' : 'Sign in with Google')}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">palette</span>
          {locale === 'ko' ? '테마' : 'Theme'}
        </h2>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, icon, label, desc }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                  theme === value
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                    : 'border-transparent hover:bg-slate-50:bg-slate-700/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === value ? 'bg-gradient-to-tr from-primary to-cyan-400 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <span className={`text-xs font-semibold ${theme === value ? 'text-primary' : 'text-slate-400'}`}>
                  {label}
                </span>
                <span className="text-[10px] text-slate-400">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">language</span>
          {locale === 'ko' ? '언어' : 'Language'}
        </h2>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {languages.map(({ value, label, flag }) => (
              <button
                key={value}
                onClick={() => setLocale(value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  locale === value
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-transparent hover:bg-slate-50:bg-slate-700/50'
                }`}
              >
                <span className="text-sm font-bold">{flag}</span>
                <span className={`text-sm font-semibold ${locale === value ? 'text-primary' : 'text-slate-400'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">notifications</span>
          {locale === 'ko' ? '알림 설정' : 'Notifications'}
        </h2>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          {[
            { icon: '🐟', label: locale === 'ko' ? '입질 최적 시간 알림' : 'Bite Time Alert', key: 'biteTimeAlert' },
            { icon: '📰', label: locale === 'ko' ? '조과 뉴스 알림' : 'News Alert', key: 'newsAlert' },
            { icon: '🏆', label: locale === 'ko' ? '배지 획득 알림' : 'Badge Alert', key: 'badgeAlert' },
          ].map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 flex items-center gap-2">
                  <span>{item.icon}</span> {item.label}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              {i < 2 && <div className="h-[1px] bg-slate-100" />}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">link</span>
          {locale === 'ko' ? '바로가기' : 'Quick Links'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/booking" className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
            <span className="text-2xl">🎣</span>
            <span className="text-xs font-medium text-slate-700">{locale === 'ko' ? '낚시 예약' : 'Booking'}</span>
          </Link>
          <Link href="/news" className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
            <span className="text-2xl">🔥</span>
            <span className="text-xs font-medium text-slate-700">{locale === 'ko' ? '조과 소식' : 'News'}</span>
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">info</span>
          {locale === 'ko' ? '정보' : 'About'}
        </h2>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">{locale === 'ko' ? '버전' : 'Version'}</span>
            <span className="text-sm font-medium text-slate-900">1.1.0</span>
          </div>
          <div className="h-[1px] bg-slate-100" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">{locale === 'ko' ? '개발자' : 'Developer'}</span>
            <span className="text-sm font-medium text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-red-400 text-sm">favorite</span>
              BITE Log Team
            </span>
          </div>
          <div className="h-[1px] bg-slate-100" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500">{locale === 'ko' ? '데이터' : 'Data'}</span>
            <span className="text-sm font-medium text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">
                {isLoggedIn ? 'cloud_done' : 'smartphone'}
              </span>
              {isLoggedIn
                ? (locale === 'ko' ? 'Firebase 동기화' : 'Firebase Synced')
                : (locale === 'ko' ? '로컬 저장' : 'Local Storage')}
            </span>
          </div>
          <div className="h-[1px] bg-slate-100" />
          <Link href="/terms" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-slate-500 group-hover:text-primary transition-colors">
              {locale === 'ko' ? '이용약관' : 'Terms of Service'}
            </span>
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          </Link>
          <div className="h-[1px] bg-slate-100" />
          <Link href="/privacy" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-slate-500 group-hover:text-primary transition-colors">
              {locale === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
            </span>
            <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
          </Link>
        </div>
      </section>
      {/* Data Management */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">database</span>
          {locale === 'ko' ? '데이터 관리' : 'Data Management'}
        </h2>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-slate-700 flex items-center gap-2">
                <span>🗑️</span> {locale === 'ko' ? '조과 기록 초기화' : 'Reset Catch Records'}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 ml-7">
                {locale === 'ko' ? '로컬에 저장된 모든 조과 기록을 삭제합니다' : 'Delete all locally saved catch records'}
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm(locale === 'ko'
                  ? '모든 조과 기록이 삭제됩니다. 계속할까요?'
                  : 'All catch records will be deleted. Continue?'
                )) {
                  localStorage.removeItem('fishlog_catches');
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-medium transition-colors hover:bg-red-100 whitespace-nowrap"
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>
      </section>

      <div className="text-center text-xs text-slate-400 mt-6">
        <p>🎣 {locale === 'ko' ? '나만의 낚시 일지' : 'Your Fishing Diary'}</p>
      </div>
    </div>
  );
}
