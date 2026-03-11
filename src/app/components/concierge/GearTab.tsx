'use client';

import { trackAffiliateClick } from '@/services/affiliateService';

interface GearTabProps {
  locale: string;
  recommendedGear: any[];
}

export default function GearTab({ locale, recommendedGear }: GearTabProps) {
  return (
    <div className="space-y-6 pb-24">
      {/* Recommended Gear */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
              🛍️ {locale === 'ko' ? '추천 장비' : 'Recommended Gear'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {locale === 'ko' ? '쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받습니다' : 'Affiliate links included'}
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-md">AD</span>
        </div>

        <div className="flex flex-col gap-3">
          {recommendedGear.length > 0 ? (
            recommendedGear.map((gear, i) => (
              <a
                key={i}
                href={gear.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAffiliateClick(gear.id, gear.species)}
                className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
              >
                {gear.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 relative">
                    <img src={gear.image} alt={gear.name} className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    <span className="material-symbols-outlined text-slate-300 transform group-hover:scale-110 transition-transform">inventory_2</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="font-bold text-sm text-slate-900 truncate group-hover:text-primary transition-colors">{gear.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{gear.description}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{gear.priceString}</span>
                  <div className="flex items-center gap-0.5 text-[9px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    {locale === 'ko' ? '쿠팡에서 보기' : 'View on Coupang'}
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
              <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">shopping_bag</span>
              <p className="text-sm font-medium text-slate-500">
                {locale === 'ko' ? '추천 장비가 없습니다' : 'No recommended gear'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Floating Action Buttons Area (Placeholder for spacing) */}
      <div className="h-16" />
    </div>
  );
}
