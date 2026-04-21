export interface FishPrice {
  species: string;
  unit: string;
  priceMin: number;
  priceMax: number;
  priceAvg: number;
  trend: "up" | "down" | "flat";
  trendPct: number;
  date: string;
  market: string;
}

export interface CatchValueData {
  prices: FishPrice[];
  updatedAt: string;
  isLive: boolean;
}

// @mock-data — 수협 위판 시세 모의 데이터 (20종)
const MOCK_PRICES: FishPrice[] = [
  {
    species: "감성돔",
    unit: "kg",
    priceMin: 25000,
    priceMax: 45000,
    priceAvg: 35000,
    trend: "up",
    trendPct: 3.2,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "우럭(조피볼락)",
    unit: "kg",
    priceMin: 12000,
    priceMax: 18000,
    priceAvg: 15000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "참돔",
    unit: "kg",
    priceMin: 30000,
    priceMax: 55000,
    priceAvg: 42000,
    trend: "up",
    trendPct: 5.1,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "광어",
    unit: "kg",
    priceMin: 18000,
    priceMax: 28000,
    priceAvg: 22000,
    trend: "down",
    trendPct: -1.8,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "방어",
    unit: "kg",
    priceMin: 15000,
    priceMax: 25000,
    priceAvg: 20000,
    trend: "up",
    trendPct: 8.3,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "삼치",
    unit: "kg",
    priceMin: 8000,
    priceMax: 15000,
    priceAvg: 11000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "고등어",
    unit: "kg",
    priceMin: 3000,
    priceMax: 6000,
    priceAvg: 4500,
    trend: "down",
    trendPct: -2.1,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "갈치",
    unit: "kg",
    priceMin: 20000,
    priceMax: 40000,
    priceAvg: 28000,
    trend: "up",
    trendPct: 4.5,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "오징어",
    unit: "마리",
    priceMin: 8000,
    priceMax: 16000,
    priceAvg: 12000,
    trend: "down",
    trendPct: -3.2,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "주꾸미",
    unit: "kg",
    priceMin: 10000,
    priceMax: 20000,
    priceAvg: 15000,
    trend: "up",
    trendPct: 6.7,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "볼락",
    unit: "kg",
    priceMin: 15000,
    priceMax: 28000,
    priceAvg: 22000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "노래미",
    unit: "kg",
    priceMin: 8000,
    priceMax: 15000,
    priceAvg: 12000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "농어",
    unit: "kg",
    priceMin: 18000,
    priceMax: 32000,
    priceAvg: 25000,
    trend: "up",
    trendPct: 2.1,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "숭어",
    unit: "kg",
    priceMin: 5000,
    priceMax: 10000,
    priceAvg: 7500,
    trend: "down",
    trendPct: -1.5,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "가자미",
    unit: "kg",
    priceMin: 8000,
    priceMax: 16000,
    priceAvg: 12000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "전복",
    unit: "kg",
    priceMin: 40000,
    priceMax: 80000,
    priceAvg: 60000,
    trend: "up",
    trendPct: 1.2,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "문어",
    unit: "kg",
    priceMin: 25000,
    priceMax: 45000,
    priceAvg: 35000,
    trend: "down",
    trendPct: -2.8,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "낙지",
    unit: "kg",
    priceMin: 30000,
    priceMax: 60000,
    priceAvg: 45000,
    trend: "up",
    trendPct: 3.5,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "홍합",
    unit: "kg",
    priceMin: 2000,
    priceMax: 4000,
    priceAvg: 3000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
  {
    species: "굴",
    unit: "kg",
    priceMin: 8000,
    priceMax: 15000,
    priceAvg: 12000,
    trend: "flat",
    trendPct: 0,
    date: "2026-04-21",
    market: "노량진",
  },
];

const MOCK_DATA: CatchValueData = {
  prices: MOCK_PRICES,
  updatedAt: new Date().toISOString(),
  isLive: false,
};

export async function fetchCatchValue(): Promise<CatchValueData> {
  try {
    const res = await fetch("/api/catch-value", { cache: "no-store" });
    if (!res.ok) {
      return MOCK_DATA;
    }
    const json = await res.json();
    if (!json.ok) {
      return MOCK_DATA;
    }
    return { ...json.data, isLive: true };
  } catch {
    return MOCK_DATA;
  }
}
