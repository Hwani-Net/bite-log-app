'use client';

interface QuickStatsProps {
  totalCatch: number;
  thisMonth: number;
  maxSize: number;
  locale: string;
}

export default function QuickStats({ totalCatch, thisMonth, maxSize, locale }: QuickStatsProps) {
  const isKo = locale === 'ko';
  const items = [
    { label: isKo ? '전체' : 'Total', value: totalCatch, unit: isKo ? '마리' : '', icon: 'phishing' },
    { label: isKo ? '월간' : 'Month', value: thisMonth, unit: isKo ? '마리' : '', icon: 'calendar_month' },
    { label: isKo ? '최대 조과' : 'Max', value: maxSize || '--', unit: maxSize ? 'cm' : '', icon: 'straighten' },
  ];

  return (
    <section className="px-4 pt-3">
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex divide-x divide-slate-100 dark:divide-slate-700/50">
        {items.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3.5 px-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="material-symbols-outlined text-xs text-slate-400 dark:text-slate-500">{item.icon}</span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">{item.value}</span>
              {item.unit && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{item.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
