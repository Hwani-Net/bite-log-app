// KHOA 바다낚시지수 API (GetFcstFishingApiServicev2)
// apiId: SV_AP_01_004 / publicDataPk: 15142486
// Key: NEXT_PUBLIC_KHOA_API_KEY (data.go.kr 공공데이터포털)

export type FishingGrade = "매우좋음" | "좋음" | "보통" | "나쁨" | "매우나쁨";

export interface FishingSpotIndex {
  placeName: string;
  lat: number;
  lng: number;
  gubun: "갯바위" | "선상";
  date: string; // YYYYMMDD
  timePeriod: string; // "오전" | "오후"
  targetFish: string; // 대상어종
  totalIndex: FishingGrade;
  waveHeightMin: number; // m
  waveHeightMax: number;
  waterTempMin: number; // ℃
  waterTempMax: number;
  currentSpeedMin: number; // kn
  currentSpeedMax: number;
  windSpeedMin: number; // m/s
  windSpeedMax: number;
  tidalInfo: string; // 물때
}

export interface FishingIndexData {
  location: string;
  spots: FishingSpotIndex[];
}

// KHOA 갯바위 낚시 포인트 목록 (위경도 포함)
// placeName은 KHOA API에 등록된 공식 명칭과 최대한 일치시킴
const FISHING_LOCATIONS: {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}[] = [
  // 서해
  {
    code: "incheon",
    name: "인천",
    lat: 37.4536,
    lng: 126.6006,
    region: "서해",
  },
  { code: "ansan", name: "안산", lat: 37.2148, lng: 126.6088, region: "서해" },
  { code: "taean", name: "태안", lat: 36.8923, lng: 126.1381, region: "서해" },
  {
    code: "boryeong",
    name: "보령",
    lat: 36.3255,
    lng: 126.4816,
    region: "서해",
  },
  { code: "gunsan", name: "군산", lat: 35.9764, lng: 126.5658, region: "서해" },
  { code: "buan", name: "부안", lat: 35.7295, lng: 126.7296, region: "서해" },
  // 남해
  { code: "mokpo", name: "목포", lat: 34.7816, lng: 126.38, region: "남해" },
  { code: "wando", name: "완도", lat: 34.3111, lng: 126.7561, region: "남해" },
  { code: "yeosu", name: "여수", lat: 34.7356, lng: 127.7658, region: "남해" },
  {
    code: "tongyeong",
    name: "통영",
    lat: 34.8251,
    lng: 128.4344,
    region: "남해",
  },
  { code: "geoje", name: "거제", lat: 34.8799, lng: 128.6211, region: "남해" },
  { code: "busan", name: "부산", lat: 35.0911, lng: 129.0358, region: "남해" },
  { code: "gijang", name: "기장", lat: 35.2444, lng: 129.2145, region: "남해" },
  // 동해
  { code: "pohang", name: "포항", lat: 36.0493, lng: 129.3802, region: "동해" },
  { code: "uljin", name: "울진", lat: 36.9929, lng: 129.4011, region: "동해" },
  {
    code: "samcheok",
    name: "삼척",
    lat: 37.4499,
    lng: 129.1648,
    region: "동해",
  },
  {
    code: "donghae",
    name: "동해",
    lat: 37.4975,
    lng: 129.1436,
    region: "동해",
  },
  {
    code: "gangneung",
    name: "강릉",
    lat: 37.7519,
    lng: 128.8762,
    region: "동해",
  },
  { code: "sokcho", name: "속초", lat: 38.2045, lng: 128.6015, region: "동해" },
  // 제주
  { code: "jeju", name: "제주", lat: 33.5256, lng: 126.5432, region: "제주" },
  {
    code: "seogwipo",
    name: "서귀포",
    lat: 33.2405,
    lng: 126.5638,
    region: "제주",
  },
  {
    code: "gimnyeong",
    name: "김녕",
    lat: 33.5568,
    lng: 126.7704,
    region: "제주",
  },
  { code: "aewol", name: "애월", lat: 33.4638, lng: 126.3109, region: "제주" },
  {
    code: "mosulpo",
    name: "모슬포",
    lat: 33.2136,
    lng: 126.2481,
    region: "제주",
  },
];

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function findNearestFishingLocation(
  lat: number,
  lng: number,
): (typeof FISHING_LOCATIONS)[0] {
  let nearest = FISHING_LOCATIONS[0];
  let minDist = haversineDistance(lat, lng, nearest.lat, nearest.lng);
  for (const loc of FISHING_LOCATIONS.slice(1)) {
    const d = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (d < minDist) {
      minDist = d;
      nearest = loc;
    }
  }
  return nearest;
}

export const FISHING_GRADE_CONFIG: Record<
  FishingGrade,
  { color: string; bg: string; label: string; score: number }
> = {
  매우좋음: {
    color: "#4ade80",
    bg: "bg-emerald-500/15",
    label: "매우좋음",
    score: 100,
  },
  좋음: { color: "#c9a84c", bg: "bg-[#c9a84c]/15", label: "좋음", score: 75 },
  보통: { color: "#7dd3fc", bg: "bg-sky-400/15", label: "보통", score: 50 },
  나쁨: { color: "#fb923c", bg: "bg-orange-400/15", label: "나쁨", score: 25 },
  매우나쁨: {
    color: "#f87171",
    bg: "bg-red-400/15",
    label: "매우나쁨",
    score: 5,
  },
};

interface KhoaFishingItem {
  seafsPstnNm?: string; // 위치명
  lat?: string;
  lot?: string;
  predcYmd?: string; // YYYYMMDD
  predcNoonSeCd?: string; // 오전 | 오후
  seafsTgfshNm?: string; // 대상어종
  tdlvHrCn?: string; // 물때
  minWvhgt?: string; // 최소파고(m)
  maxWvhgt?: string; // 최대파고(m)
  minWtem?: string; // 최저수온(℃)
  maxWtem?: string; // 최고수온(℃)
  minCrsp?: string; // 최저유속(kn)
  maxCrsp?: string; // 최대유속(kn)
  minWspd?: string; // 최저풍속(m/s)
  maxWspd?: string; // 최고풍속(m/s)
  totalIndex?: string; // 바다낚시지수
}

function parseGrade(raw?: string): FishingGrade {
  if (!raw) return "보통";
  const normalized = raw.trim().replace(/\s+/g, "");
  if (normalized === "매우좋음" || normalized === "매우 좋음")
    return "매우좋음";
  if (normalized === "좋음") return "좋음";
  if (normalized === "보통") return "보통";
  if (normalized === "나쁨") return "나쁨";
  if (normalized === "매우나쁨" || normalized === "매우 나쁨")
    return "매우나쁨";
  return "보통";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItems(data: any): KhoaFishingItem[] {
  return (
    data?.response?.body?.items?.item ||
    data?.getTideFcstHghLw?.body?.items?.item ||
    data?.result?.data ||
    []
  );
}

export const REGIONS = ["서해", "남해", "동해", "제주"] as const;
export type FishingRegion = (typeof REGIONS)[number];

export function getLocationsByRegion(region: FishingRegion) {
  return FISHING_LOCATIONS.filter((l) => l.region === region);
}

export function getLocationByCode(code: string) {
  return FISHING_LOCATIONS.find((l) => l.code === code) ?? null;
}

export async function fetchFishingIndex(
  lat: number,
  lng: number,
  gubun: "갯바위" | "선상" = "갯바위",
  date?: string,
  locationCode?: string,
): Promise<FishingIndexData | null> {
  const location = locationCode
    ? (getLocationByCode(locationCode) ?? findNearestFishingLocation(lat, lng))
    : findNearestFishingLocation(lat, lng);
  const reqDate =
    date || new Date().toISOString().split("T")[0].replace(/-/g, "");

  const params = new URLSearchParams({
    gubun,
    placeName: location.name,
    reqDate,
  });

  try {
    const res = await fetch(`/api/fishing-index?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const items: KhoaFishingItem[] = extractItems(data);

    if (!items || items.length === 0) return null;

    const spots: FishingSpotIndex[] = items.map((item) => ({
      placeName: item.seafsPstnNm || location.name,
      lat: parseFloat(item.lat || String(location.lat)),
      lng: parseFloat(item.lot || String(location.lng)),
      gubun,
      date: item.predcYmd || reqDate,
      timePeriod: item.predcNoonSeCd || "오전",
      targetFish: item.seafsTgfshNm || "미상",
      totalIndex: parseGrade(item.totalIndex),
      waveHeightMin: parseFloat(item.minWvhgt || "0"),
      waveHeightMax: parseFloat(item.maxWvhgt || "0"),
      waterTempMin: parseFloat(item.minWtem || "0"),
      waterTempMax: parseFloat(item.maxWtem || "0"),
      currentSpeedMin: parseFloat(item.minCrsp || "0"),
      currentSpeedMax: parseFloat(item.maxCrsp || "0"),
      windSpeedMin: parseFloat(item.minWspd || "0"),
      windSpeedMax: parseFloat(item.maxWspd || "0"),
      tidalInfo: item.tdlvHrCn || "",
    }));

    return { location: location.name, spots };
  } catch (err) {
    console.warn("[fishingIndexService] Failed to fetch:", err);
    return null;
  }
}
