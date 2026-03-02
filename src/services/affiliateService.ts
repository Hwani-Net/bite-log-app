/**
 * Affiliate Service — Coupang Partners Integration
 * Recommends fishing gear based on fish species
 * Revenue model: CPS (Cost Per Sale) commission
 *
 * Note: Affiliate links use Coupang Partners deep links
 * Commission rate: 3~4% per sale
 */

export interface GearRecommendation {
  id: string;
  species: string;
  category: string;
  name: string;
  description: string;
  priceRange: string;
  affiliateUrl: string;
  icon: string;
  image?: string; // product photo path
}

// Species-specific gear recommendations
const GEAR_DATABASE: Record<string, GearRecommendation[]> = {
  '감성돔': [
    { id: 'gsd-1', species: '감성돔', category: '릴', name: '다이와 엑셀러 RV 2500 릴', description: '가벼운 바디에 부드러운 드래그, 감성돔 챔질에 최적', priceRange: '8~15만원', affiliateUrl: 'https://link.coupang.com/a/dVUTSR', icon: '🎰' },
    { id: 'gsd-2', species: '감성돔', category: '찌', name: '마리수 감성돔 구멍찌 세트', description: '조류에 강한 구멍찌, 감도 최상급', priceRange: '2~5만원', affiliateUrl: 'https://link.coupang.com/a/dVUYHW', icon: '🔴' },
    { id: 'gsd-3', species: '감성돔', category: '미끼', name: '냉동 각크릴 블록 밑밥용', description: '감성돔 밑밥+미끼 겸용, 신선도 유지', priceRange: '3~6만원', affiliateUrl: 'https://link.coupang.com/a/dVU2BW', icon: '🦐' },
  ],
  '볼락': [
    { id: 'br-1', species: '볼락', category: '루어', name: '골든훅 볼락 지그헤드 전사이즈', description: '야간 볼락 루어 필수, 아징 지그헤드 세트', priceRange: '1~3만원', affiliateUrl: 'https://link.coupang.com/a/dVTQFn', icon: '🪝', image: 'https://thumbnail.coupangcdn.com/thumbnails/remote/230x230ex/image/vendor_inventory/4ab2/03259bf4bf730b20505dc95088160423052ec1759e495744575a4ec8b9d6.jpg' },
    { id: 'br-2', species: '볼락', category: '웜', name: '너츠 2인치 그럽웜 50개', description: '우럭 볼락웜 광어웜 배스웜 세트', priceRange: '1~2만원', affiliateUrl: 'https://link.coupang.com/a/dVTSS7', icon: '🪱', image: 'https://shopping-phinf.pstatic.net/main_8415157/84151572662.jpg?type=f300' },
    { id: 'br-3', species: '볼락', category: '대', name: '워터맨 올드보이 볼락 루어대', description: '내만 방파제 락피쉬 전용 루어대', priceRange: '5~12만원', affiliateUrl: 'https://link.coupang.com/a/dVTTTj', icon: '🎣', image: 'https://shopping-phinf.pstatic.net/main_8720253/87202537077.jpg?type=f300' },
  ],
  '농어': [
    { id: 'ne-1', species: '농어', category: '루어', name: '쇼크 미노우 싱킹 로켓미노우', description: '표층~중층 바이브로 대물 농어 공략', priceRange: '2~5만원', affiliateUrl: 'https://link.coupang.com/a/dVVaVr', icon: '🐟' },
    { id: 'ne-2', species: '농어', category: '대', name: '시마노 시버스 문샷 10ft', description: '원투 + 파워 겸비, 대물 농어 랜딩까지', priceRange: '10~20만원', affiliateUrl: 'https://link.coupang.com/a/dVVcUX', icon: '🎣' },
  ],
  '우럭': [
    { id: 'ur-1', species: '우럭', category: '채비', name: '백경 빙빙 2단 우럭 채비', description: '방파제 우럭 필수, 2단 카드로 효율 UP', priceRange: '0.5~1.5만원', affiliateUrl: 'https://link.coupang.com/a/dVVeEl', icon: '🪢' },
    { id: 'ur-2', species: '우럭', category: '미끼', name: '소프트웜 인조 지렁이 미끼', description: '우럭 미끼용 소프트웜, 장기 보관 가능', priceRange: '1~2만원', affiliateUrl: 'https://link.coupang.com/a/dVVhcX', icon: '🪱' },
  ],
  '방어': [
    { id: 'by-1', species: '방어', category: '지깅', name: '히트페이스 라톰 슬로우지그 200g', description: '수직 지깅으로 대물 방어 공략', priceRange: '1.5~4만원', affiliateUrl: 'https://link.coupang.com/a/dVVjfT', icon: '⚡' },
    { id: 'by-2', species: '방어', category: '대', name: '지존낚시 방어 지깅로드 MH', description: '방어·부시리 전용 파워 로드', priceRange: '15~30만원', affiliateUrl: 'https://link.coupang.com/a/dVVkD1', icon: '🎣' },
  ],
};

// Default gear for any species
const DEFAULT_GEAR: GearRecommendation[] = [
  { id: 'def-1', species: '공통', category: '소품', name: '손피싱 캐리어 멀티 태클박스', description: '모든 소품을 깔끔하게 정리', priceRange: '2~5만원', affiliateUrl: 'https://link.coupang.com/a/dVTXQJ', icon: '🧰', image: 'https://shopping-phinf.pstatic.net/main_8556734/85567347909.jpg?type=f300' },
  { id: 'def-2', species: '공통', category: '의류', name: '방수 낚시 자켓', description: '비바람에도 끄떡없는 고어텍스급 방수', priceRange: '5~15만원', affiliateUrl: 'https://link.coupang.com/a/dVTZoH', icon: '🧥', image: 'https://shopping-phinf.pstatic.net/main_9050404/90504042024.1.jpg?type=f300' },
  { id: 'def-3', species: '공통', category: '안전', name: '알바트로스 자동팽창식 구명조끼', description: '선상낚시 필수 안전장비', priceRange: '5~10만원', affiliateUrl: 'https://link.coupang.com/a/dVT1Hu', icon: '🦺', image: 'https://shopping-phinf.pstatic.net/main_8639489/86394892634.1.jpg?type=f300' },
];

/**
 * Get gear recommendations for a fish species
 */
export function getGearRecommendations(species: string): GearRecommendation[] {
  const speciesGear = GEAR_DATABASE[species] || [];
  return [...speciesGear, ...DEFAULT_GEAR];
}

/**
 * Get popular gear across all species
 */
export function getPopularGear(): GearRecommendation[] {
  const allGear: GearRecommendation[] = [];
  for (const gear of Object.values(GEAR_DATABASE)) {
    allGear.push(gear[0]); // First item from each species
  }
  return [...allGear, ...DEFAULT_GEAR];
}

/**
 * Get gear for the record detail page
 */
export function getRecordGear(species: string, count: number = 3): GearRecommendation[] {
  const all = getGearRecommendations(species);
  return all.slice(0, count);
}

/**
 * Track affiliate click (for analytics)
 */
export function trackAffiliateClick(gearId: string, species: string): void {
  if (typeof window === 'undefined') return;

  try {
    const clicks = JSON.parse(localStorage.getItem('fishlog_affiliate_clicks') || '[]');
    clicks.push({ gearId, species, timestamp: new Date().toISOString() });
    // Keep last 100 clicks
    localStorage.setItem(
      'fishlog_affiliate_clicks',
      JSON.stringify(clicks.slice(-100))
    );
  } catch {
    // Ignore storage errors
  }
}
