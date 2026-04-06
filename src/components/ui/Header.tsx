"use client";

import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  subtitle?: string;
  sticky?: boolean;
}

export default function Header({
  title,
  onBack,
  rightAction,
  subtitle,
  sticky = true,
}: HeaderProps) {
  return (
    <header
      className={`${sticky ? "sticky top-0 z-50" : ""} flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/30`}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
