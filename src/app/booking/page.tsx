'use client';

import Link from 'next/link';

interface BookingPlatform {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  regions: string[];
  features: string[];
  color: string;
}

const PLATFORMS: BookingPlatform[] = [
  {
    id: 'sunsang24',
    name: '선상24',
    description: '전국 실시간 선상낚시 예약 플랫폼',
    url: 'https://www.sunsang24.com/',
    icon: '⛵',
    regions: ['전국', '동해', '서해', '남해', '제주'],
    features: ['실시간 예약', '조황 정보', '낚싯배 비교'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'thefishing',
    name: '더피싱',
    description: '배낚시·선상낚시 실시간 예약',
    url: 'https://thefishing.kr/',
    icon: '🎣',
    regions: ['전국', '동해', '서해', '남해'],
    features: ['긴급모집', '출조버스', '낚시대회'],
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'naksiga',
    name: '낚시가',
    description: '방파제·갯바위·선상 종합 예약',
    url: 'https://www.naksiga.com/',
    icon: '🐠',
    regions: ['전국', '서해', '남해'],
    features: ['포인트 리뷰', '가격 비교', '초보 가이드'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'fishingcamp',
    name: '피싱캠프',
    description: '낚시 패키지·체험·캠핑 예약',
    url: 'https://www.fishingcamp.co.kr/',
    icon: '⛺',
    regions: ['전국', '남해', '제주'],
    features: ['패키지 상품', '가족 체험', '장비 렌탈'],
    color: 'from-violet-500 to-purple-500',
  },
];

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-cyan-500/5 to-transparent px-5 pt-6 pb-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          홈으로
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          🎣 낚시 예약
        </h1>
        <p className="text-sm text-slate-500">
          검증된 예약 플랫폼으로 바로 연결합니다
        </p>
      </div>

      {/* Platform Cards */}
      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4 pb-24">
        {PLATFORMS.map((platform, i) => (
          <a
            key={platform.id}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {/* Gradient header */}
            <div className={`bg-gradient-to-r ${platform.color} p-4 flex items-center gap-3`}>
              <span className="text-3xl">{platform.icon}</span>
              <div>
                <h3 className="text-lg font-bold text-white">{platform.name}</h3>
                <p className="text-xs text-white/80">{platform.description}</p>
              </div>
              <span className="ml-auto text-white/60 material-symbols-outlined">open_in_new</span>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Regions */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {platform.regions.map(region => (
                  <span
                    key={region}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {region}
                  </span>
                ))}
              </div>

              {/* Features */}
              <div className="flex gap-2 flex-wrap">
                {platform.features.map(feature => (
                  <span
                    key={feature}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                  >
                    ✓ {feature}
                  </span>
                ))}
              </div>
            </div>
          </a>
        ))}

        {/* Coming Soon */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
          <span className="text-3xl mb-2 block">🚀</span>
          <h3 className="text-sm font-bold text-slate-700 mb-1">
            BITE Log 자체 예약 시스템 준비 중
          </h3>
          <p className="text-xs text-slate-400">
            곧 BITE Log 안에서 바로 예약할 수 있습니다!
          </p>
        </div>
      </div>
    </div>
  );
}

