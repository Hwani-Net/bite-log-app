"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  accentColor?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  unit,
  accentColor = "border-l-primary",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-4 shadow-sm border-l-4 ${accentColor} ${className}`}
    >
      <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-bold text-text-primary dark:text-white">
          {value}
        </span>
        {unit && <span className="text-xs text-text-muted">{unit}</span>}
      </div>
    </div>
  );
}
