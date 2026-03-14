// AI Concierge Recommendation Service
// Rule-based fishing recommendation engine — $0 cost (no external API calls)
// Uses: season + weather + tide + time → spot/species/gear recommendation

import { WeatherData } from './weatherService';
import { TideData } from './tideService';
import { BiteTimePrediction } from './biteTimeService';

// ─── Types ────────────────────────────────────────────────────

export interface FishingSpot {
  name: string;
  region: string;
  lat: number;
  lng: number;
  type: 'breakwater' | 'port' | 'shore' | 'reef' | 'estuary';
  bestSpecies: string[];
  bestSeasons: number[]; // months 1-12
  description: string;
}

export interface SpeciesInfo {
  name: string;
  emoji: string;
  image?: string; // real fish photo URL
  seasons: number[]; // months 1-12
  optimalTemp: [number, number]; // [min, max] °C
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  techniques: string[];
}

export interface GearItem {
  id: string;
  name: string;
  category: 'rod' | 'reel' | 'line' | 'lure' | 'accessories';
  price: number;
  image: string;
  species: string[]; // target species
  trending: boolean;
  url?: string;
}

export interface ConciergeRecommendation {
  spot: FishingSpot;
  species: SpeciesInfo;
  departureTime: string;
  travelMinutes: number;
  biteScore: number;
  tips: string[];
  gear: GearItem[];
  reasoning: string;
  secretSpot?: FishingSpot; // for PRO users
}

// ─── Data: Korean Fishing Spots ───────────────────────────────

const FISHING_SPOTS: FishingSpot[] = [
  {
    name: '인천 소래포구 방파제',
    region: '인천',
    lat: 37.3911, lng: 126.7355,
    type: 'breakwater',
    bestSpecies: ['우럭', '노래미', '망둥어'],
    bestSeasons: [4, 5, 6, 7, 8, 9, 10],
    description: '수도권 접근성 좋은 가족 낚시 포인트',
  },
  {
    name: '남해 방파제',
    region: '경남',
    lat: 34.7458, lng: 127.8924,
    type: 'breakwater',
    bestSpecies: ['감성돔', '볼락', '학꽁치'],
    bestSeasons: [3, 4, 5, 9, 10, 11],
    description: '남해안 대표 방파제 낚시 포인트',
  },
  {
    name: '울진 후포항',
    region: '경북',
    lat: 36.6781, lng: 129.4524,
    type: 'port',
    bestSpecies: ['가자미', '광어', '우럭'],
    bestSeasons: [5, 6, 7, 8, 9, 10],
    description: '동해안 수심 깊은 항구 낚시터',
  },
  {
    name: '부산 기장 연화리',
    region: '부산',
    lat: 35.2456, lng: 129.2287,
    type: 'reef',
    bestSpecies: ['감성돔', '벵에돔', '참돔'],
    bestSeasons: [4, 5, 6, 9, 10, 11],
    description: '부산 근교 갯바위 포인트, 대물 감성돔 출현',
  },
  {
    name: '서귀포 범섬 포인트',
    region: '제주',
    lat: 33.2253, lng: 126.5144,
    type: 'reef',
    bestSpecies: ['벵에돔', '참돔', '다금바리'],
    bestSeasons: [5, 6, 7, 8, 9, 10, 11],
    description: '제주 최고의 갯바위 포인트',
  },
  {
    name: '태안 만리포 해변',
    region: '충남',
    lat: 36.7897, lng: 126.1432,
    type: 'shore',
    bestSpecies: ['노래미', '도다리', '광어'],
    bestSeasons: [4, 5, 6, 9, 10],
    description: '서해안 모래 해변 원투 낚시 포인트',
  },
  {
    name: '여수 돌산공원',
    region: '전남',
    lat: 34.7248, lng: 127.7816,
    type: 'breakwater',
    bestSpecies: ['감성돔', '농어', '볼락'],
    bestSeasons: [3, 4, 5, 10, 11, 12],
    description: '여수 대표 야간 낚시 포인트',
  },
  {
    name: '포항 구룡포항',
    region: '경북',
    lat: 35.9896, lng: 129.5573,
    type: 'port',
    bestSpecies: ['오징어', '학꽁치', '고등어'],
    bestSeasons: [8, 9, 10, 11],
    description: '가을 오징어 시즌 핫스팟',
  },
  {
    name: '보령 원산도 방파제',
    region: '충남',
    lat: 36.3478, lng: 126.3692,
    type: 'breakwater',
    bestSpecies: ['우럭', '노래미', '쥐노래미'],
    bestSeasons: [4, 5, 6, 7, 8, 9],
    description: '서해 섬 방파제 가족 낚시 포인트',
  },
  {
    name: '속초 청호동 방파제',
    region: '강원',
    lat: 38.1982, lng: 128.5957,
    type: 'breakwater',
    bestSpecies: ['가자미', '노래미', '고등어'],
    bestSeasons: [5, 6, 7, 8, 9, 10],
    description: '속초 시내 접근 용이한 방파제',
  },
];

// ─── Data: Secret PRO Spots ──────────────────────────────────

const SECRET_FISHING_SPOTS: FishingSpot[] = [
  {
    name: '거문도 서쪽 콧부리',
    region: '전남',
    lat: 34.0045, lng: 127.3012,
    type: 'reef',
    bestSpecies: ['감성돔', '참돔', '긴꼬리벵에돔'],
    bestSeasons: [1, 2, 3, 10, 11, 12],
    description: '명인들만 아는 대물 감성돔 포인트, 급류 지대',
  },
  {
    name: '추자도 절명여',
    region: '제주',
    lat: 33.8542, lng: 126.3124,
    type: 'reef',
    bestSpecies: ['감성돔', '벵에돔', '부시리'],
    bestSeasons: [4, 5, 6, 9, 10, 11],
    description: '대한민국 최고의 갯바위 포인트, 6자 감성돔 출몰',
  },
  {
    name: '가거도 대리 포인트',
    region: '전남',
    lat: 34.0532, lng: 125.1235,
    type: 'reef',
    bestSpecies: ['감성돔', '농어', '볼락'],
    bestSeasons: [1, 2, 6, 7, 11, 12],
    description: '국토 최서남단, 평생 한 번은 가봐야 할 성지',
  },
];

// ─── Data: Fish Species by Season ─────────────────────────────

const SPECIES_DB: SpeciesInfo[] = [
  { name: '감성돔', emoji: '🐟', image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fimgnews.naver.net%2Fimage%2F5119%2F2017%2F05%2F12%2F0000593409_001_20170512060327273.png&type=l340_165', seasons: [3, 4, 5, 10, 11, 12], optimalTemp: [12, 22], difficulty: 'intermediate', techniques: ['찌낚시', '원투낚시'] },
  { name: '우럭', emoji: '🐡', seasons: [4, 5, 6, 7, 8, 9, 10], optimalTemp: [10, 25], difficulty: 'beginner', techniques: ['외줄낚시', '루어낚시'] },
  { name: '볼락', emoji: '🐠', image: 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTExMjdfMzEg%2FMDAxNzY0MjMwMzY2ODI5.D02DZ_0aJMFTE4xNn1bJEgN-muC5HLCXx99OUNQN7JEg.BSx5RD94P2d9lKw5Zudg1kYsPMVQGxQgcpJC_jTX00Yg.JPEG%2F20251126_015326.jpg&type=a340', seasons: [11, 12, 1, 2, 3], optimalTemp: [5, 15], difficulty: 'beginner', techniques: ['메바링', '볼락루어'] },
  { name: '농어', emoji: '🐟', image: 'https://search.pstatic.net/sunny/?src=https%3A%2F%2Fmblogthumb-phinf.pstatic.net%2FMjAyNDEyMzFfMjI5%2FMDAxNzM1NjMzNTA0NDkw.CY892IopGCGUR7f-lbrSjVhj-Q8vZ7c3r0wO7jbveEog.oG5NISyB3Y5-CB1QmjxgN7tyHxkb19Bw14ZkloU7Pq8g.JPEG%2FIMG_6904.jpg%3Ftype%3Dw800&type=a340', seasons: [5, 6, 7, 8, 9], optimalTemp: [15, 28], difficulty: 'advanced', techniques: ['루어낚시', '미노우'] },
  { name: '참돔', emoji: '🐟', seasons: [4, 5, 6, 9, 10, 11], optimalTemp: [14, 24], difficulty: 'advanced', techniques: ['타이라바', '참돔찌낚시'] },
  { name: '노래미', emoji: '🐟', image: 'https://search.pstatic.net/sunny/?src=https%3A%2F%2Fwww.innak.kr%2Fdata%2Ffile%2Fpdspictorial%2F50_20061122_134854_1.jpg&type=a340', seasons: [3, 4, 5, 6, 9, 10, 11], optimalTemp: [8, 20], difficulty: 'beginner', techniques: ['찌낚시', '다운샷'] },
  { name: '고등어', emoji: '🐟', seasons: [8, 9, 10, 11], optimalTemp: [15, 25], difficulty: 'beginner', techniques: ['사비키', '찌낚시'] },
  { name: '오징어', emoji: '🦑', seasons: [8, 9, 10, 11], optimalTemp: [15, 22], difficulty: 'intermediate', techniques: ['에기낚시', '봉돌채비'] },
  { name: '벵에돔', emoji: '🐟', seasons: [5, 6, 7, 8, 9, 10], optimalTemp: [16, 26], difficulty: 'advanced', techniques: ['찌낚시', '반유동'] },
  { name: '광어', emoji: '🐟', seasons: [5, 6, 7, 8, 9], optimalTemp: [14, 24], difficulty: 'intermediate', techniques: ['다운샷', '루어'] },
  { name: '도다리', emoji: '🐟', seasons: [2, 3, 4, 5], optimalTemp: [8, 18], difficulty: 'beginner', techniques: ['원투낚시', '청갯지렁이'] },
  { name: '망둥어', emoji: '🐟', seasons: [9, 10, 11], optimalTemp: [12, 22], difficulty: 'beginner', techniques: ['원투낚시', '미끼낚시'] },
  { name: '학꽁치', emoji: '🐟', seasons: [10, 11, 12, 1, 2], optimalTemp: [8, 18], difficulty: 'beginner', techniques: ['학꽁치채비', '찌낚시'] },
  { name: '가자미', emoji: '🐟', seasons: [11, 12, 1, 2, 3, 4], optimalTemp: [5, 15], difficulty: 'beginner', techniques: ['원투낚시', '카드채비'] },
];

// ─── Data: Trending Gear ──────────────────────────────────────

const GEAR_DB: GearItem[] = [
  // Rods
  { id: 'rod-1', name: '다이와 갯바위 1.5-530', category: 'rod', price: 380000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIXdRg77TJro2W2OLgABkOBYqjxjabsY-0FZXiNUNeqrak_xRCxG9qPXnwQHioc8dCOavNF_p2Ec8t6NOWQ7eb53DimDUmJT_r2v05CrSxDzah5PmozHnrGBH8wY0bPTOGdALgX3s3FOWsWR80qrcNYu1b0ohGdPHMGb3rXRxU-RTpR3V3KJtj1KNHkZq5E1N_P0OmC0Gq-cDOATyouqfL_eAdlBDWQR3zAPUdE8sqt-g-huu5-dMPDWmn8R-xyxz0t9O25dLLjUri', species: ['감성돔', '벵에돔', '참돔'], trending: true },
  { id: 'rod-2', name: '메이저크래프트 루어로드 ML', category: 'rod', price: 165000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIXdRg77TJro2W2OLgABkOBYqjxjabsY-0FZXiNUNeqrak_xRCxG9qPXnwQHioc8dCOavNF_p2Ec8t6NOWQ7eb53DimDUmJT_r2v05CrSxDzah5PmozHnrGBH8wY0bPTOGdALgX3s3FOWsWR80qrcNYu1b0ohGdPHMGb3rXRxU-RTpR3V3KJtj1KNHkZq5E1N_P0OmC0Gq-cDOATyouqfL_eAdlBDWQR3zAPUdE8sqt-g-huu5-dMPDWmn8R-xyxz0t9O25dLLjUri', species: ['농어', '우럭', '광어'], trending: false },
  // Reels
  { id: 'reel-1', name: '다이와 23 레갈리스 LT3000', category: 'reel', price: 128000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS-sjkpFiv6qQaDh3QiJxjMb5MkWbk_oPaWdaMJyTNMeyxZp7vS_2rR7XvHVDA6NMzTJymkZnO2I80rFLb-H-PnuhGmQIBWtKcL_WVyVCZKjnIbzxVXVnwXtwCN9PpSLJ8qjJtLfY5w6XmjC630aAavdF3XocauvqaNUEZ55YuNZnGy1gWGn1I_QIPtLsM2ibvVayDk-kFyIR9TVY9xN7lO8gSa8j_ovGoWfrzUEc-2cq5Pg6Gqfq8dntBkJt1E9dMc9OwYZJntfkc', species: ['감성돔', '참돔', '농어'], trending: true },
  { id: 'reel-2', name: '시마노 세도나 C3000', category: 'reel', price: 89000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS-sjkpFiv6qQaDh3QiJxjMb5MkWbk_oPaWdaMJyTNMeyxZp7vS_2rR7XvHVDA6NMzTJymkZnO2I80rFLb-H-PnuhGmQIBWtKcL_WVyVCZKjnIbzxVXVnwXtwCN9PpSLJ8qjJtLfY5w6XmjC630aAavdF3XocauvqaNUEZ55YuNZnGy1gWGn1I_QIPtLsM2ibvVayDk-kFyIR9TVY9xN7lO8gSa8j_ovGoWfrzUEc-2cq5Pg6Gqfq8dntBkJt1E9dMc9OwYZJntfkc', species: ['우럭', '노래미', '가자미'], trending: false },
  // Lures
  { id: 'lure-1', name: '에기왕 Q 3.5호 핑크', category: 'lure', price: 15000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH_wFIpljKpsc3egIpdFKpTfDWIWY1ZIXK-L0goovoB5v9DqyYgNqWeBnGK0IvxqrlqmOgo3NcrhCzjaAa0DkTuVPAqGglwdV2005U1HzE6um9r7LFlKsSIKpTOycsr1JuXKW4l9mgpMkhExy5ZvU1GuS1q_v97GP1WTL7pKJIbFEARoceZNFdJI7lW6do5z0-lNvMhTT5H7kENNJEbL1b0nqwizE-r4k6NyDNZQ7b5xx7wh5rGbxnjLeQyWd9OnK5EJwnOJYMuQTt', species: ['오징어'], trending: true },
  { id: 'lure-2', name: '타이라바 세트 80g', category: 'lure', price: 25000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH_wFIpljKpsc3egIpdFKpTfDWIWY1ZIXK-L0goovoB5v9DqyYgNqWeBnGK0IvxqrlqmOgo3NcrhCzjaAa0DkTuVPAqGglwdV2005U1HzE6um9r7LFlKsSIKpTOycsr1JuXKW4l9mgpMkhExy5ZvU1GuS1q_v97GP1WTL7pKJIbFEARoceZNFdJI7lW6do5z0-lNvMhTT5H7kENNJEbL1b0nqwizE-r4k6NyDNZQ7b5xx7wh5rGbxnjLeQyWd9OnK5EJwnOJYMuQTt', species: ['참돔', '광어'], trending: true },
  { id: 'lure-3', name: '미노우 110mm 홀로그램', category: 'lure', price: 18000, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH_wFIpljKpsc3egIpdFKpTfDWIWY1ZIXK-L0goovoB5v9DqyYgNqWeBnGK0IvxqrlqmOgo3NcrhCzjaAa0DkTuVPAqGglwdV2005U1HzE6um9r7LFlKsSIKpTOycsr1JuXKW4l9mgpMkhExy5ZvU1GuS1q_v97GP1WTL7pKJIbFEARoceZNFdJI7lW6do5z0-lNvMhTT5H7kENNJEbL1b0nqwizE-r4k6NyDNZQ7b5xx7wh5rGbxnjLeQyWd9OnK5EJwnOJYMuQTt', species: ['농어', '광어'], trending: false },
  // Accessories
  { id: 'acc-1', name: '볼락 전용 지그헤드 세트', category: 'accessories', price: 8500, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAH_wFIpljKpsc3egIpdFKpTfDWIWY1ZIXK-L0goovoB5v9DqyYgNqWeBnGK0IvxqrlqmOgo3NcrhCzjaAa0DkTuVPAqGglwdV2005U1HzE6um9r7LFlKsSIKpTOycsr1JuXKW4l9mgpMkhExy5ZvU1GuS1q_v97GP1WTL7pKJIbFEARoceZNFdJI7lW6do5z0-lNvMhTT5H7kENNJEbL1b0nqwizE-r4k6NyDNZQ7b5xx7wh5rGbxnjLeQyWd9OnK5EJwnOJYMuQTt', species: ['볼락'], trending: false },
];

// ─── Core Logic ───────────────────────────────────────────────

/** Get current month (1-12) */
function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

/** Get optimal departure time based on bite prediction */
function getOptimalDepartureTime(travelMinutes: number): string {
  const hour = new Date().getHours();

  // If it's nighttime (21-03), recommend dawn departure
  if (hour >= 21 || hour <= 3) {
    const dawnStart = 4;
    const departHour = Math.max(0, dawnStart - Math.floor(travelMinutes / 60));
    return `${String(departHour).padStart(2, '0')}:${String(travelMinutes % 60).padStart(2, '0')}`;
  }

  // If it's early morning (4-8), go now
  if (hour >= 4 && hour <= 8) {
    return '지금 출발!';
  }

  // Daytime — recommend dusk session
  if (hour >= 9 && hour <= 14) {
    const duskStart = 16;
    const departHour = Math.max(0, duskStart - Math.floor(travelMinutes / 60));
    return `${String(departHour).padStart(2, '0')}:${String(travelMinutes % 60).padStart(2, '0')}`;
  }

  // Late afternoon — go now for dusk
  return '지금 출발!';
}

/** Estimate travel time (km → minutes, assuming 60km/h avg) */
function estimateTravelMinutes(distKm: number): number {
  return Math.round(distKm / 60 * 60);
}

/** Haversine distance in km */
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lng2 - lng1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

/** Score a spot based on season, weather, and user location */
function scoreSpot(
  spot: FishingSpot,
  month: number,
  weather: WeatherData | null,
  userLat: number,
  userLng: number,
): number {
  let score = 0;

  // Season match (+40 points)
  if (spot.bestSeasons.includes(month)) score += 40;

  // Distance penalty (-0.5 per km, max -30)
  const dist = getDistanceKm(userLat, userLng, spot.lat, spot.lng);
  score -= Math.min(30, dist * 0.5);

  // Weather bonus
  if (weather) {
    // Good weather bonus (+15)
    const ws = weather.windSpeed ?? 5;
    if (ws <= 5) score += 15;
    else if (ws <= 10) score += 5;
    else score -= 10; // strong wind penalty

    // Temperature sweet spot (+10)
    if (weather.tempC >= 12 && weather.tempC <= 25) score += 10;
    else if (weather.tempC >= 5 && weather.tempC < 12) score += 5;
  }

  // Spot type variety bonus
  if (spot.type === 'breakwater') score += 5; // accessible
  if (spot.type === 'reef') score += 3; // exciting

  return Math.max(0, score);
}

/** Score a species for current conditions */
function scoreSpecies(
  species: SpeciesInfo,
  month: number,
  weather: WeatherData | null,
): number {
  let score = 0;

  // Season match (+50)
  if (species.seasons.includes(month)) score += 50;
  else return 0; // out of season = skip entirely

  // Temperature match (+25)
  if (weather?.tempC) {
    if (weather.tempC >= species.optimalTemp[0] && weather.tempC <= species.optimalTemp[1]) {
      score += 25;
    } else {
      const diff = Math.min(
        Math.abs(weather.tempC - species.optimalTemp[0]),
        Math.abs(weather.tempC - species.optimalTemp[1])
      );
      score += Math.max(0, 15 - diff * 2);
    }
  } else {
    score += 10; // no weather data — neutral
  }

  // Difficulty bonus (easier = higher for general recommendation)
  if (species.difficulty === 'beginner') score += 10;
  else if (species.difficulty === 'intermediate') score += 5;

  return score;
}

/** Generate tips based on conditions */
function generateTips(
  weather: WeatherData | null,
  biteTime: BiteTimePrediction | null,
  species: SpeciesInfo,
): string[] {
  const tips: string[] = [];
  const hour = new Date().getHours();

  // Weather-based tips
  if (weather) {
    if ((weather.windSpeed ?? 0) > 8) {
      tips.push('⚠️ 바람이 강합니다. 무거운 봉돌과 안전장비를 준비하세요.');
    }
    if (weather.tempC < 5) {
      tips.push('🧤 체감온도가 낮습니다. 방한복 필수!');
    }
    if (weather.tempC > 28) {
      tips.push('☀️ 무더위 주의! 자외선 차단과 수분 보충을 챙기세요.');
    }
    if (weather.conditionKo.includes('비') || weather.conditionKo.includes('소나기')) {
      tips.push('🌧️ 비 소식이 있습니다. 우비와 방수가방을 챙기세요.');
    }
  }

  // Time-based tips
  if (hour >= 4 && hour <= 6) {
    tips.push('🌅 새벽 매직아워! 입질이 가장 활발한 시간입니다.');
  } else if (hour >= 17 && hour <= 19) {
    tips.push('🌇 해질녘 황금시간대. 대물 확률이 높아집니다.');
  }

  // Bite-based tips
  if (biteTime) {
    if (biteTime.score >= 75) {
      tips.push('🟢 오늘은 최고의 낚시 컨디션! 대물을 기대하세요.');
    } else if (biteTime.score < 35) {
      tips.push('🟡 조건이 까다롭습니다. 인내심을 갖고 도전하세요.');
    }
  }

  // Species-specific tips
  tips.push(`🎣 ${species.name} 추천 기법: ${species.techniques.join(', ')}`);

  return tips.slice(0, 4); // max 4 tips
}

// ─── Main Export ──────────────────────────────────────────────

/**
 * Generate AI concierge recommendation based on current conditions.
 * Pure rule-based — NO external API calls, $0 cost.
 */
export function generateRecommendation(
  weather: WeatherData | null,
  tideData: TideData | null,
  biteTime: BiteTimePrediction | null,
  userLat: number,
  userLng: number,
  isPro = false,
): ConciergeRecommendation {
  const month = getCurrentMonth();

  // 1. Score and rank spots
  const scoredSpots = FISHING_SPOTS
    .map(spot => ({ spot, score: scoreSpot(spot, month, weather, userLat, userLng) }))
    .sort((a, b) => b.score - a.score);

  const bestSpot = scoredSpots[0].spot;

  // 2. Find best species for this spot + conditions
  const spotSpecies = SPECIES_DB.filter(sp =>
    bestSpot.bestSpecies.includes(sp.name)
  );

  const scoredSpecies = spotSpecies
    .map(sp => ({ species: sp, score: scoreSpecies(sp, month, weather) }))
    .sort((a, b) => b.score - a.score);

  // Fallback: if no spot species match season, find any in-season species
  const bestSpecies = scoredSpecies[0]?.species
    ?? SPECIES_DB
      .filter(sp => sp.seasons.includes(month))
      .sort((a, b) => scoreSpecies(b, month, weather) - scoreSpecies(a, month, weather))[0]
    ?? SPECIES_DB[0];

  // 3. Calculate travel
  const distKm = getDistanceKm(userLat, userLng, bestSpot.lat, bestSpot.lng);
  const travelMinutes = estimateTravelMinutes(distKm);
  const departureTime = getOptimalDepartureTime(travelMinutes);

  // 4. Match gear to species
  const matchedGear = GEAR_DB
    .filter(g => g.species.some(s => s === bestSpecies.name))
    .sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0))
    .slice(0, 3);

  // Fallback: if no matching gear, show trending gear
  const recommendedGear = matchedGear.length > 0
    ? matchedGear
    : GEAR_DB.filter(g => g.trending).slice(0, 3);

  // 5. Generate tips
  const tips = generateTips(weather, biteTime, bestSpecies);

  // 6. Reasoning
  const reasoning = buildReasoning(bestSpot, bestSpecies, month, weather, biteTime);

  return {
    spot: bestSpot,
    species: bestSpecies,
    departureTime,
    travelMinutes,
    biteScore: biteTime?.score ?? 50,
    tips,
    gear: recommendedGear,
    reasoning,
    secretSpot: isPro ? SECRET_FISHING_SPOTS[Math.floor(Math.random() * SECRET_FISHING_SPOTS.length)] : undefined,
  };
}

function buildReasoning(
  spot: FishingSpot,
  species: SpeciesInfo,
  month: number,
  weather: WeatherData | null,
  biteTime: BiteTimePrediction | null,
): string {
  const parts: string[] = [];

  parts.push(`${month}월은 ${species.name}의 시즌입니다.`);

  if (weather) {
    parts.push(`현재 기온 ${weather.tempC}°C, 풍속 ${weather.windSpeed}m/s.`);
    if (species.optimalTemp[0] <= (weather.tempC ?? 15) && (weather.tempC ?? 15) <= species.optimalTemp[1]) {
      parts.push('수온이 적정 범위에 있어 활성도가 높습니다.');
    }
  }

  parts.push(`${spot.name}은 ${spot.description}.`);

  if (biteTime && biteTime.score >= 55) {
    parts.push(`입질 확률 ${biteTime.score}%로 좋은 조건입니다.`);
  }

  return parts.join(' ');
}

/** Get all in-season species for display */
export function getInSeasonSpecies(): SpeciesInfo[] {
  const month = getCurrentMonth();
  return SPECIES_DB.filter(sp => sp.seasons.includes(month));
}

/** Get trending gear items */
export function getTrendingGear(): GearItem[] {
  return GEAR_DB.filter(g => g.trending);
}

// ─── Spot Finder (포인트 추천) ─────────────────────────────────

export interface RankedSpot {
  spot: FishingSpot;
  score: number;
  distanceKm: number;
  travelMinutes: number;
  bestSpeciesNow: string[];
  matchReason: string;
}

/**
 * Return TOP N fishing spots ranked by current conditions.
 * Pure rule-based — $0 cost.
 */
export function getTopSpots(
  weather: WeatherData | null,
  userLat: number,
  userLng: number,
  limit = 5,
): RankedSpot[] {
  const month = getCurrentMonth();

  return FISHING_SPOTS
    .map((spot) => {
      const score = scoreSpot(spot, month, weather, userLat, userLng);
      const distKm = getDistanceKm(userLat, userLng, spot.lat, spot.lng);
      const travelMin = estimateTravelMinutes(distKm);

      // Find in-season species for this spot
      const bestSpeciesNow = spot.bestSpecies.filter((name) => {
        const sp = SPECIES_DB.find((s) => s.name === name);
        return sp && sp.seasons.includes(month);
      });

      // Build reason
      const parts: string[] = [];
      if (spot.bestSeasons.includes(month)) parts.push(`${month}월 시즌`);
      if (bestSpeciesNow.length > 0) parts.push(`${bestSpeciesNow.join('·')} 가능`);
      if (distKm < 50) parts.push('근거리');
      else if (distKm < 150) parts.push('중거리');
      const matchReason = parts.join(' | ') || spot.description;

      return { spot, score, distanceKm: Math.round(distKm), travelMinutes: travelMin, bestSpeciesNow, matchReason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Catch Report (조황 리포트) ────────────────────────────────

export interface CatchReportData {
  period: string;     // e.g. "2026년 3월"
  totalTrips: number;
  totalFish: number;
  topSpecies: { name: string; count: number; pct: number }[];
  topSpots: { name: string; count: number }[];
  bestDay: { date: string; count: number } | null;
  biggestFish: { species: string; sizeCm: number; date: string } | null;
  avgPerTrip: number;
  trendVsPrev: number | null;   // % change vs previous month
  monthSummary: string;
}

/**
 * Generate a fishing catch report from the user's records.
 * Pure data analysis — $0 cost.
 */
export function generateCatchReport(
  records: { date: string; species?: string; location?: { name?: string }; quantity?: number; sizeCm?: number }[],
  monthOffset = 0,
): CatchReportData {
  const now = new Date();
  const targetMonth = now.getMonth() + 1 - monthOffset;
  const targetYear = now.getFullYear() - (targetMonth <= 0 ? 1 : 0);
  const actualMonth = targetMonth <= 0 ? targetMonth + 12 : targetMonth;
  const prefix = `${targetYear}-${String(actualMonth).padStart(2, '0')}`;
  const prevPrefix = actualMonth === 1
    ? `${targetYear - 1}-12`
    : `${targetYear}-${String(actualMonth - 1).padStart(2, '0')}`;

  const monthRecords = records.filter((r) => r.date.startsWith(prefix));
  const prevRecords = records.filter((r) => r.date.startsWith(prevPrefix));

  // Species tally
  const speciesMap = new Map<string, number>();
  let totalFish = 0;
  monthRecords.forEach((r) => {
    const qty = r.quantity ?? 1;
    totalFish += qty;
    const sp = r.species || '미확인';
    speciesMap.set(sp, (speciesMap.get(sp) ?? 0) + qty);
  });
  const topSpecies = [...speciesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, pct: totalFish > 0 ? Math.round((count / totalFish) * 100) : 0 }));

  // Spot tally
  const spotMap = new Map<string, number>();
  monthRecords.forEach((r) => {
    const loc = r.location?.name || '미확인';
    spotMap.set(loc, (spotMap.get(loc) ?? 0) + 1);
  });
  const topSpots = [...spotMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  // Best day
  const dayMap = new Map<string, number>();
  monthRecords.forEach((r) => {
    const qty = r.quantity ?? 1;
    dayMap.set(r.date, (dayMap.get(r.date) ?? 0) + qty);
  });
  const bestDayEntry = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayEntry ? { date: bestDayEntry[0], count: bestDayEntry[1] } : null;

  // Biggest fish
  const withSize = monthRecords.filter((r) => r.sizeCm && r.sizeCm > 0);
  const biggest = withSize.sort((a, b) => (b.sizeCm ?? 0) - (a.sizeCm ?? 0))[0];
  const biggestFish = biggest
    ? { species: biggest.species || '미확인', sizeCm: biggest.sizeCm!, date: biggest.date }
    : null;

  // Unique trip days
  const uniqueDays = new Set(monthRecords.map((r) => r.date));
  const totalTrips = uniqueDays.size;
  const avgPerTrip = totalTrips > 0 ? Math.round((totalFish / totalTrips) * 10) / 10 : 0;

  // Trend vs previous month
  const prevFish = prevRecords.reduce((sum, r) => sum + (r.quantity ?? 1), 0);
  const trendVsPrev = prevFish > 0 ? Math.round(((totalFish - prevFish) / prevFish) * 100) : null;

  // Summary text
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const monthLabel = monthNames[actualMonth - 1];
  let monthSummary: string;
  if (totalTrips === 0) {
    monthSummary = `${monthLabel}에는 아직 출조 기록이 없습니다. 첫 출조를 계획해보세요!`;
  } else {
    const top = topSpecies[0]?.name ?? '다양한 어종';
    monthSummary = `${monthLabel} ${totalTrips}회 출조, 총 ${totalFish}마리를 잡았습니다.` +
      ` 주력 어종은 ${top}${topSpecies[0] ? `(${topSpecies[0].pct}%)` : ''}입니다.` +
      (trendVsPrev !== null
        ? ` 전월 대비 ${trendVsPrev >= 0 ? '+' : ''}${trendVsPrev}% ${trendVsPrev >= 0 ? '↑' : '↓'}`
        : '');
  }

  return {
    period: `${targetYear}년 ${monthLabel}`,
    totalTrips, totalFish, topSpecies, topSpots,
    bestDay, biggestFish, avgPerTrip, trendVsPrev,
    monthSummary,
  };
}
