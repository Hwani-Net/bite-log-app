'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/appStore';


const NAV_ITEMS = [
  { href: '/', icon: 'home', labelKey: 'nav.home' },
  { href: '/feed', icon: 'public', labelKey: 'nav.feed' },
  { href: '/concierge', icon: 'auto_awesome', labelKey: 'nav.ai' },
  { href: '/ranking', icon: 'emoji_events', labelKey: 'ranking.title' },
  { href: '/settings', icon: 'settings', labelKey: 'nav.settings' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const t = useAppStore((s) => s.t);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 h-16" />
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200">
      <div className="mx-auto max-w-md flex items-center justify-around h-16 px-2 pb-2 pt-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'text-[24px]' : 'text-[22px]'}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'} leading-normal`}>
                {t(item.labelKey)}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
