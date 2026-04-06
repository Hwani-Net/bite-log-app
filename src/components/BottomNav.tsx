"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import {
  Home,
  Radar,
  Sparkles,
  Trophy,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/fleet-radar", icon: Radar, labelKey: "nav.fleet" },
  { href: "/concierge", icon: Sparkles, labelKey: "nav.ai" },
  { href: "/ranking", icon: Trophy, labelKey: "ranking.title" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const t = useAppStore((s) => s.t);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted)
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/50 h-16 safe-bottom" />
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700/50 safe-bottom">
      <div className="mx-auto max-w-md flex items-center justify-around h-16 px-2 pb-2 pt-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all ${
                isActive
                  ? "text-primary"
                  : "text-slate-400 dark:text-slate-500 hover:text-primary"
              }`}
            >
              <Icon
                size={isActive ? 24 : 22}
                strokeWidth={isActive ? 2.5 : 1.8}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={`text-[10px] ${isActive ? "font-bold" : "font-medium"} leading-normal`}
              >
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
