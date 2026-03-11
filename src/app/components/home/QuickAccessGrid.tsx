'use client';

import Link from 'next/link';

interface QuickAccessGridProps {
  locale: string;
}

const ITEMS = [
  { icon: '🔥', labelKo: '채비 랭킹', labelEn: 'Gear Ranking', href: '/viral-gear', gradient: 'from-orange-500 to-amber-400', shadow: 'shadow-orange-200' },
  { icon: '⚖️', labelKo: '법규 가이드', labelEn: 'Regulations', href: '/regulations', gradient: 'from-slate-600 to-slate-500', shadow: 'shadow-slate-200' },
  { icon: '🌊', labelKo: '날씨 지도', labelEn: 'Weather Map', href: '/live-dashboard', gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-200' },
  { icon: '📊', labelKo: '통계·DNA', labelEn: 'Stats · DNA', href: '/stats?tab=dna', gradient: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-200' },
];

export default function QuickAccessGrid({ locale }: QuickAccessGridProps) {
  const isKo = locale === 'ko';

  return (
    <section className="px-4 pt-3 pb-2">
      <div className="grid grid-cols-4 gap-2">
        {ITEMS.map((item, i) => (
          <Link key={i} href={item.href} className="group">
            <div className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-3 flex flex-col items-center justify-center aspect-square shadow-md ${item.shadow} dark:shadow-none hover:scale-105 active:scale-95 transition-transform`}>
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-[9px] font-bold text-white/90 text-center leading-tight">
                {isKo ? item.labelKo : item.labelEn}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
