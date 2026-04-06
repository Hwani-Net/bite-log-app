"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
}

export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
}: SkeletonProps) {
  const baseClass = "bg-slate-200/60 dark:bg-slate-700/40 skeleton";

  const variantClass = {
    text: "rounded-md h-4",
    circular: "rounded-full",
    rectangular: "rounded-2xl",
  }[variant];

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card rounded-2xl p-4 space-y-3 ${className}`}>
      <Skeleton variant="text" className="w-1/3 h-3" />
      <Skeleton variant="text" className="w-full h-5" />
      <Skeleton variant="text" className="w-2/3 h-3" />
    </div>
  );
}
