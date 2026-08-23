"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Trophy,
  Menu,
  BarChart2,
  Anchor,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/records", icon: BookOpen, label: "기록" },
  { href: "/stats", icon: BarChart2, label: "통계" },
  { href: "/ranking", icon: Trophy, label: "랭킹" },
  { href: "/booking", icon: Anchor, label: "예약" },
  { href: "/concierge", icon: Menu, label: "AI" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted)
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#080d14]/40 backdrop-blur-2xl border-t border-white/5 h-16 safe-bottom" />
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#080d14]/40 backdrop-blur-2xl border-t border-white/5 safe-bottom">
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
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-h-[48px] min-w-[48px] justify-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a84c] rounded-lg ${
                isActive
                  ? "text-[#c9a84c]"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <Icon
                size={isActive ? 24 : 22}
                strokeWidth={isActive ? 2.5 : 1.8}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={`font-space-grotesk tracking-[0.15em] text-[0.45rem] uppercase ${isActive ? "font-bold" : "font-medium"} leading-normal`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[#c9a84c] nav-glow" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
