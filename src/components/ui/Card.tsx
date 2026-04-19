"use client";

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  glass = true,
  onClick }: CardProps) {
  const base = glass
    ? "glass-card rounded-2xl p-4 shadow-sm"
    : "bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50";

  return (
    <div
      className={`${base} ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
