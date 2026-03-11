// Fishing Vessel Service — 해양수산부 낚시어선업 신고정보 API
// Public API: https://www.data.go.kr/data/15074088/openapi.do
// Endpoint: http://apis.data.go.kr/1192000/select0230List/getselect0230List

export interface FishingVessel {
  fsboNo: string;      // 어선번호
  fsboNm: string;      // 어선명
  fshNtNm: string;     // 신고확인번호 (지역 포함)
  fsboTotTons: string; // 총톤수
  shpmHangNm: string;  // 선적항
  maxShcrNum: string;  // 최대 선원 수
  maxPsrNum: string;   // 최대 승객 수
  bsnStEndDt: string;  // 유효기간
  fshryApvPermNm: string; // 어업인허가번호
}

export interface VesselSearchResult {
  vessels: FishingVessel[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  isDemo: boolean;
}

// Demo data — 승인 전 또는 API 키 없을 때 사용
const DEMO_VESSELS: FishingVessel[] = [
  {
    fsboNo: 'DEMO001',
    fsboNm: '바다랑호',
    fshNtNm: '인천광역시 옹진군 제2023-042호',
    fsboTotTons: '7.5',
    shpmHangNm: '인천광역시 옹진군 자월항',
    maxShcrNum: '2명',
    maxPsrNum: '15명',
    bsnStEndDt: '2023.05.15 ~ 2025.05.15',
    fshryApvPermNm: '옹진군 연안복합어업 제2019-003호',
  },
  {
    fsboNo: 'DEMO002',
    fsboNm: '신풍호',
    fshNtNm: '경기도 안산시 제2023-018호',
    fsboTotTons: '9.77',
    shpmHangNm: '경기도 안산시 탄도항',
    maxShcrNum: '2명',
    maxPsrNum: '19명',
    bsnStEndDt: '2022.06.09 ~ 2026.06.09',
    fshryApvPermNm: '안산시 연안복합어업 제2020-011호',
  },
  {
    fsboNo: 'DEMO003',
    fsboNm: '목성호',
    fshNtNm: '부산광역시 서구 제2022-008호',
    fsboTotTons: '12.3',
    shpmHangNm: '부산광역시 서구 암남항',
    maxShcrNum: '3명',
    maxPsrNum: '25명',
    bsnStEndDt: '2022.01.15 ~ 2026.01.15',
    fshryApvPermNm: '서구 연안복합어업 제2019-001호',
  },
  {
    fsboNo: 'DEMO004',
    fsboNm: '해운낚시호',
    fshNtNm: '전라남도 여수시 제2024-031호',
    fsboTotTons: '6.2',
    shpmHangNm: '전라남도 여수시 거문도항',
    maxShcrNum: '2명',
    maxPsrNum: '12명',
    bsnStEndDt: '2024.03.20 ~ 2026.03.20',
    fshryApvPermNm: '여수시 연안자망어업 제2021-007호',
  },
];

// ─── 메모리 캐시 ─────────────────────────────────────────────────────────────
// 공공데이터포털 API는 fsboNm 파라미터로 서버사이드 검색을 지원하지 않음.
// → 전체 3,952척을 최초 1회 병렬 로드 후 캐싱 → 클라이언트 사이드 필터링.
let vesselCache: FishingVessel[] | null = null;
let cacheLoadedAt: number = 0;
let cacheLoadingPromise: Promise<FishingVessel[]> | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분
const CHUNK_SIZE = 100;
const API_BASE = 'https://apis.data.go.kr/1192000/select0230List/getselect0230List';

export type LoadProgress = { loaded: number; total: number };

/** 단일 페이지 fetch — 실패 시 빈 배열 반환 */
async function fetchPage(apiKey: string, pageNo: number): Promise<FishingVessel[]> {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: String(pageNo),
    numOfRows: String(CHUNK_SIZE),
    type: 'json',
  });
  try {
    const res = await fetch(`${API_BASE}?${params}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const raw = await res.json();
    if (!raw || Object.keys(raw).length === 0) return [];
    const body = raw.responseJson?.body ?? raw.response?.body ?? raw.body;
    const rawItems = body?.item ?? body?.items?.item ?? body?.items ?? [];
    return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  } catch {
    return [];
  }
}

/**
 * 전체 어선 데이터 병렬 로드.
 * onProgress: (loaded, total) 콜백으로 UI 진행바 업데이트.
 */
async function loadAllVessels(
  apiKey: string,
  onProgress?: (p: LoadProgress) => void
): Promise<FishingVessel[]> {
  const now = Date.now();
  if (vesselCache && now - cacheLoadedAt < CACHE_TTL_MS) return vesselCache;

  // 중복 요청 방지 — 이미 로딩 중이면 같은 Promise 공유
  if (cacheLoadingPromise) return cacheLoadingPromise;

  cacheLoadingPromise = (async () => {
    // 1단계: totalCount 확인
    const totalCountRes = await fetch(
      `${API_BASE}?${new URLSearchParams({ serviceKey: apiKey, pageNo: '1', numOfRows: '1', type: 'json' })}`,
      { signal: AbortSignal.timeout(8_000) }
    ).then(r => r.json()).catch(() => null);
    const total = Number(totalCountRes?.responseJson?.header?.totalCount ?? 3952);
    const totalPages = Math.ceil(total / CHUNK_SIZE);

    onProgress?.({ loaded: 0, total });

    // 2단계: 모든 페이지 순차 배치 로드 (5페이지씩, 200ms 간격)
    const allVessels: FishingVessel[] = [];
    const BATCH_SIZE = 5;

    for (let batch = 1; batch <= totalPages; batch += BATCH_SIZE) {
      const pages = Array.from(
        { length: Math.min(BATCH_SIZE, totalPages - batch + 1) },
        (_, i) => batch + i
      );
      const results = await Promise.all(pages.map(p => fetchPage(apiKey, p)));

      // 빈 결과 1회 재시도
      for (let i = 0; i < results.length; i++) {
        if (results[i].length === 0 && pages[i] <= totalPages) {
          await new Promise(r => setTimeout(r, 300));
          results[i] = await fetchPage(apiKey, pages[i]);
        }
      }

      results.forEach(r => allVessels.push(...r));

      // 매 배치마다 캐시 즉시 반영 (검색이 캐시를 참조하므로)
      vesselCache = allVessels;
      cacheLoadedAt = Date.now();
      onProgress?.({ loaded: allVessels.length, total });

      // API rate limit 방지: 배치 간 200ms 대기
      if (batch + BATCH_SIZE <= totalPages) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    cacheLoadingPromise = null;
    console.log(`[fishingVesselService] ✅ All ${allVessels.length}/${total} vessels cached`);
    return allVessels;
  })();

  return cacheLoadingPromise;
}

/**
 * 전체 어선 데이터 백그라운드 프리로드.
 * 첫 페이지(100척)를 즉시 로드/콜백하고, 나머지를 병렬로 계속 로딩.
 */
export async function preloadAllVessels(
  onProgress?: (p: LoadProgress) => void
): Promise<number> {
  const apiKey = process.env.NEXT_PUBLIC_FISHING_VESSEL_API_KEY;
  if (!apiKey) return 0;
  const vessels = await loadAllVessels(apiKey, onProgress);
  return vessels.length;
}

/**
 * 어선 검색 — 전체 캐시에서 클라이언트 사이드 필터링.
 * query 없으면 현재 캐시 첫 N건 반환 (1페이지 즉시 표시).
 */
export async function searchFishingVessels(
  query: string = '',
  page: number = 1,
  numOfRows: number = 30
): Promise<VesselSearchResult> {
  const apiKey = process.env.NEXT_PUBLIC_FISHING_VESSEL_API_KEY;

  if (!apiKey) {
    return getDemoResult(query);
  }

  const q = query.trim();

  // 캐시가 있으면 즉시 사용 (로딩 중이어도)
  const cached = vesselCache ?? [];

  if (!q) {
    // 검색어 없음 → 현재 캐시 첫 N건 표시
    if (cached.length > 0) {
      return {
        vessels: cached.slice(0, numOfRows),
        totalCount: cached.length,
        pageNo: 1,
        numOfRows,
        isDemo: false,
      };
    }
    // 캐시가 아직 비어있으면 1페이지를 직접 fetch
    try {
      const firstPage = await fetchPage(apiKey, 1);
      return {
        vessels: firstPage.slice(0, numOfRows),
        totalCount: firstPage.length,
        pageNo: 1,
        numOfRows,
        isDemo: false,
      };
    } catch {
      return getDemoResult(query);
    }
  }

  // 검색어 있음 → 현재 캐시 전체 필터링
  if (cached.length === 0) {
    // 아직 로딩 전 → 캐시 완료까지 대기 후 검색
    try {
      const all = await loadAllVessels(apiKey);
      const filtered = all.filter(v =>
        v.fsboNm.includes(q) || v.shpmHangNm.includes(q) || v.fshNtNm.includes(q)
      );
      const start = (page - 1) * numOfRows;
      return { vessels: filtered.slice(start, start + numOfRows), totalCount: filtered.length, pageNo: page, numOfRows, isDemo: false };
    } catch { return getDemoResult(query); }
  }

  const filtered = cached.filter(v =>
    (v.fsboNm || '').includes(q) || (v.shpmHangNm || '').includes(q) || (v.fshNtNm || '').includes(q)
  );
  const start = (page - 1) * numOfRows;
  return {
    vessels: filtered.slice(start, start + numOfRows),
    totalCount: filtered.length,
    pageNo: page,
    numOfRows,
    isDemo: false,
  };
}

/** 캐시를 강제 초기화 */
export function clearVesselCache(): void {
  vesselCache = null;
  cacheLoadedAt = 0;
  cacheLoadingPromise = null;
}

/** 현재 캐시 상태 */
export function getVesselCacheState(): { loaded: number; isReady: boolean } {
  return {
    loaded: vesselCache?.length ?? 0,
    isReady: vesselCache !== null,
  };
}


function getDemoResult(query: string): VesselSearchResult {
  // 데모 모드: 이름/항구/지역으로 클라이언트 필터링 가능
  const q = query.trim();
  const vessels = q
    ? DEMO_VESSELS.filter(v =>
        v.fsboNm.includes(q) ||
        v.shpmHangNm.includes(q) ||
        v.fshNtNm.includes(q)
      )
    : DEMO_VESSELS;

  return {
    vessels,
    totalCount: vessels.length,
    pageNo: 1,
    numOfRows: 20,
    isDemo: true,
  };
}

/**
 * Extract region name from 신고확인번호 (e.g. "부산광역시 서구 제2022-008호" → "부산광역시 서구")
 */
export function extractRegion(fshNtNm: string): string {
  const match = fshNtNm.match(/^(.+?)\s+제\d{4}/);
  return match ? match[1] : fshNtNm;
}

/**
 * Check if vessel license is valid
 */
export function isVesselValid(bsnStEndDt: string): boolean {
  if (!bsnStEndDt) return false;
  const endPart = bsnStEndDt.split('~')[1]?.trim();
  if (!endPart) return false;
  const endDate = new Date(endPart.replace(/\./g, '-'));
  return endDate > new Date();
}

/**
 * Generate 낚시해(海) app deep-link URL
 * (Official MOF app for actual boarding declaration)
 */
export function getNaksiHaeUrl(): string {
  // Try to open 낚시해 app or redirect to download
  return 'intent://ffbUser0801#Intent;scheme=naksihae;package=kr.go.ffbUser0801;end';
}

export function getNaksiHaePlayStoreUrl(): string {
  return 'https://play.google.com/store/apps/details?id=kr.go.ffbUser0801';
}

export function getNaksiHaeAppStoreUrl(): string {
  return 'https://apps.apple.com/kr/app/id1479202959';
}
