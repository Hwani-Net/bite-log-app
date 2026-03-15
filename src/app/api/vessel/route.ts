import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// --- Constants -------------------------------------------------------

/**
 * 선박 등록·입출항 정적 정보 API (공공데이터포털)
 * - 엔드포인트: https://apis.data.go.kr/1192000/VsslEtrynd5
 * - 제공 정보: 선박명, 총톤수 등 AIS 동적 데이터 보완용 정적 정보
 * - 키 설정: FISHING_VESSEL_API_KEY 환경 변수 (64자 hex 형식)
 * - 공공데이터포털 신청: https://www.data.go.kr/data/15074088/openapi.do
 */
const VESSEL_API_BASE = 'https://apis.data.go.kr/1192000/VsslEtrynd5';

// --- Types -----------------------------------------------------------

/** /api/vessel 응답의 개별 선박 레코드 */
interface VesselInfo {
  /** IMO 번호 (식별자) */
  imoNo: string;
  /** MMSI (AIS 동적 데이터와 조인 키) */
  mmsi: string;
  /** 선박명 */
  shipName: string;
  /** 선박 종류 코드 */
  shipType: string;
  /** 총톤수 (GT) */
  tonnage: number;
  /** 선체 전장 (m) */
  length: number;
  /** 호출부호 */
  callSign: string;
  /** 선적항 */
  portOfRegistry: string;
  /** 국적 코드 */
  flag: string;
}

// --- Structured Logging ----------------------------------------------

interface LogPayload {
  timestamp: string;
  event: string;
  params?: unknown;
  error?: unknown;
  duration?: number;
  [key: string]: unknown;
}

function structuredLog(level: 'info' | 'warn' | 'error', payload: LogPayload): void {
  const entry = JSON.stringify(payload);
  if (level === 'info')  console.info(entry);
  if (level === 'warn')  console.warn(entry);
  if (level === 'error') console.error(entry);
}

// --- Zod schema ------------------------------------------------------

/** GET /api/vessel 쿼리 파라미터 스키마 */
const VesselQuerySchema = z.object({
  /** MMSI로 특정 선박 조회 */
  mmsi: z.string().regex(/^\d{9}$/, "'mmsi' must be a 9-digit numeric string").optional(),
  /** 선박명 부분 검색 */
  shipName: z.string().min(1).max(100).optional(),
  /** 페이지 번호 (기본값: 1) */
  pageNo: z
    .string()
    .regex(/^\d+$/, "'pageNo' must be a positive integer")
    .optional()
    .transform((v) => (v != null ? Number(v) : 1)),
  /** 페이지당 결과 수 (기본값: 100, 최대: 1000) */
  numOfRows: z
    .string()
    .regex(/^\d+$/, "'numOfRows' must be a positive integer")
    .optional()
    .transform((v) => (v != null ? Math.min(Number(v), 1000) : 100)),
});

type VesselQueryParams = z.output<typeof VesselQuerySchema>;

function parseAndValidateQuery(
  searchParams: URLSearchParams,
): { success: true; data: VesselQueryParams } | { success: false; message: string } {
  const raw = {
    mmsi:       searchParams.get('mmsi')       ?? undefined,
    shipName:   searchParams.get('shipName')   ?? undefined,
    pageNo:     searchParams.get('pageNo')     ?? undefined,
    numOfRows:  searchParams.get('numOfRows')  ?? undefined,
  };

  const result = VesselQuerySchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join('; ');
    return { success: false, message };
  }
  return { success: true, data: result.data };
}

// --- Mock data -------------------------------------------------------

const MOCK_VESSELS: VesselInfo[] = [
  {
    imoNo: '9000001',
    mmsi: '440001000',
    shipName: '해랑호',
    shipType: 'fishing',
    tonnage: 2.5,
    length: 8,
    callSign: 'HLRA1',
    portOfRegistry: '통영',
    flag: 'KR',
  },
  {
    imoNo: '9000002',
    mmsi: '440001001',
    shipName: '돌고래호',
    shipType: 'leisure',
    tonnage: 1.8,
    length: 6,
    callSign: 'HLRB2',
    portOfRegistry: '거제',
    flag: 'KR',
  },
  {
    imoNo: '9000003',
    mmsi: '440001002',
    shipName: '대성호',
    shipType: 'fishing',
    tonnage: 9.77,
    length: 18,
    callSign: 'HLRC3',
    portOfRegistry: '부산',
    flag: 'KR',
  },
  {
    imoNo: '9000004',
    mmsi: '440001003',
    shipName: '바다로호',
    shipType: 'leisure',
    tonnage: 2.0,
    length: 5,
    callSign: 'HLRD4',
    portOfRegistry: '여수',
    flag: 'KR',
  },
  {
    imoNo: '9000005',
    mmsi: '440001004',
    shipName: '금풍호',
    shipType: 'cargo',
    tonnage: 15.0,
    length: 25,
    callSign: 'HLRE5',
    portOfRegistry: '인천',
    flag: 'KR',
  },
];

// --- Helpers ---------------------------------------------------------

/**
 * apis.data.go.kr 응답 JSON에서 item 배열을 추출한다.
 * 표준 형식: { response: { body: { items: { item: [...] } } } }
 */
function extractItems(json: unknown): Array<Record<string, unknown>> {
  if (json == null || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;

  // 표준 공공데이터 형식
  const resp  = obj['response']  as Record<string, unknown> | undefined;
  const body  = resp?.['body']   as Record<string, unknown> | undefined;
  const items = body?.['items']  as Record<string, unknown> | undefined;
  const item  = items?.['item'];
  if (Array.isArray(item))                      return item as Array<Record<string, unknown>>;
  if (item != null && typeof item === 'object') return [item as Record<string, unknown>];

  // 혹시 odcloud 형식 { data: [...] } 으로 오는 경우 대비
  if (Array.isArray(obj['data'])) return obj['data'] as Array<Record<string, unknown>>;

  return [];
}

/**
 * 응답 아이템을 VesselInfo 로 매핑한다.
 * 공공데이터포털 필드명 변형(camelCase / UPPER_CASE / 한글) 모두 처리.
 */
function mapVesselItem(item: Record<string, unknown>): VesselInfo {
  return {
    imoNo: String(
      item['imoNo']    ?? item['IMO_NO']  ?? item['imo']    ?? item['IMO']    ??
      item['imoNum']   ?? item['IMO_NUM'] ?? item['국제해사기구번호'] ?? '',
    ),
    mmsi: String(
      item['mmsi']     ?? item['MMSI']    ?? item['mmsiNo'] ?? item['MMSI_NO'] ??
      item['국제이동통신해상조난안전시스템'] ?? '',
    ),
    shipName: String(
      item['vsslNm']   ?? item['VSSL_NM'] ?? item['shipNm'] ?? item['SHIP_NM'] ??
      item['선박명']   ?? item['선명']    ?? '',
    ),
    shipType: String(
      item['vsslTp']   ?? item['VSSL_TP'] ?? item['shipTp'] ?? item['SHIP_TP'] ??
      item['vsslKnd']  ?? item['VSSL_KND'] ?? item['선박종류'] ?? item['선박종류코드'] ?? '',
    ),
    tonnage: Number(
      item['gt']       ?? item['GT']      ?? item['grossTon']    ?? item['GROSS_TON']    ??
      item['grossTnge'] ?? item['GROSS_TNGE'] ?? item['총톤수'] ?? 0,
    ),
    length: Number(
      item['loa']      ?? item['LOA']     ?? item['shpLoa']   ?? item['SHP_LOA']   ??
      item['vsslLen']  ?? item['VSSL_LEN'] ?? item['선체전장'] ?? 0,
    ),
    callSign: String(
      item['callSign'] ?? item['CALL_SIGN'] ?? item['callSgn']  ?? item['CALL_SGN'] ??
      item['호출부호'] ?? '',
    ),
    portOfRegistry: String(
      item['portNm']   ?? item['PORT_NM'] ?? item['regPort']  ?? item['REG_PORT'] ??
      item['선적항']   ?? '',
    ),
    flag: String(
      item['ntlCd']    ?? item['NTL_CD']  ?? item['natCd']    ?? item['NAT_CD']    ??
      item['국적코드'] ?? item['국적']    ?? '',
    ),
  };
}

/**
 * API 수준 오류 코드를 확인한다 (공공데이터포털 표준 오류 패턴).
 * 정상이면 null, 오류면 오류 메시지 문자열 반환.
 */
function checkApiError(json: unknown): string | null {
  if (json == null || typeof json !== 'object') return null;
  const obj  = json as Record<string, unknown>;
  const resp = obj['response'] as Record<string, unknown> | undefined;
  const header = resp?.['header'] as Record<string, unknown> | undefined;
  const code: string = String(header?.['resultCode'] ?? '');
  const msg:  string = String(header?.['resultMsg']  ?? '');

  if (code && code !== '00' && code !== '000' && code !== '0000') {
    return `API error — code: ${code}, msg: ${msg}`;
  }
  if (msg && (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('servicekey'))) {
    return `API key error — msg: ${msg}`;
  }
  return null;
}

// --- Data fetcher ----------------------------------------------------

/**
 * VsslEtrynd5 API에서 선박 정적 정보를 조회한다.
 *
 * serviceKey 이중 인코딩 방지:
 *   공공데이터포털 키는 hex 문자열이지만 일부 키는 Base64+URL 인코딩 상태로 발급됨.
 *   URLSearchParams.set() 사용 시 이중 인코딩 위험이 있으므로 template string 사용.
 */
async function fetchVessels(params: VesselQueryParams): Promise<{
  data: VesselInfo[];
  fallback: boolean;
}> {
  const apiKey = process.env.FISHING_VESSEL_API_KEY;

  if (!apiKey) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.key_missing',
      error: { message: 'FISHING_VESSEL_API_KEY environment variable is not set — returning mock data' },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  // 추가 쿼리 파라미터 조합 (serviceKey는 이중 인코딩 방지를 위해 분리)
  const extra = new URLSearchParams({
    resultType: 'json',
    numOfRows:  String(params.numOfRows),
    pageNo:     String(params.pageNo),
  });
  if (params.mmsi)     extra.set('mmsi',   params.mmsi);
  if (params.shipName) extra.set('vsslNm', params.shipName);

  const urlStr = `${VESSEL_API_BASE}?serviceKey=${apiKey}&${extra.toString()}`;

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'vessel.api.request',
    endpoint: 'apis.data.go.kr/VsslEtrynd5',
    url: urlStr.replace(apiKey, '[REDACTED]'),
    params,
  });

  // 1) HTTP 요청
  let res: Response;
  try {
    res = await fetch(urlStr, { cache: 'no-store' });
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.unreachable',
      error: { message: 'VsslEtrynd5 API unreachable', cause: String(err) },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.http_error',
      error: { message: `VsslEtrynd5 API HTTP ${res.status}`, body: body.slice(0, 500) },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  // 2) 본문 읽기
  let rawText: string;
  try {
    rawText = await res.text();
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.body_read_error',
      error: { message: 'VsslEtrynd5 API body read failed', cause: String(err) },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  // 3) JSON 파싱
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch (err) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.parse_error',
      error: {
        message: 'VsslEtrynd5 API returned non-JSON',
        preview: rawText.slice(0, 200),
        cause: String(err),
      },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  // 4) API 수준 오류 확인
  const apiError = checkApiError(json);
  if (apiError) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.api_level_error',
      error: { message: apiError },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  // 5) 아이템 추출 및 매핑
  const items = extractItems(json);

  if (items.length === 0) {
    structuredLog('warn', {
      timestamp: new Date().toISOString(),
      event: 'vessel.api.empty_result',
      error: { message: 'VsslEtrynd5 API returned empty dataset' },
    });
    return { data: applyMockFilters(params), fallback: true };
  }

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'vessel.api.field_sample',
    fields: Object.keys(items[0]),
    sample: items[0],
    totalItems: items.length,
  });

  const data = items
    .map(mapVesselItem)
    .filter((v) => v.shipName !== '' || v.mmsi !== '' || v.imoNo !== '');

  structuredLog('info', {
    timestamp: new Date().toISOString(),
    event: 'vessel.api.success',
    count: data.length,
  });

  return { data, fallback: false };
}

/**
 * Mock 데이터에 쿼리 필터를 적용한다.
 */
function applyMockFilters(params: VesselQueryParams): VesselInfo[] {
  let result = MOCK_VESSELS;
  if (params.mmsi)     result = result.filter((v) => v.mmsi === params.mmsi);
  if (params.shipName) result = result.filter((v) => v.shipName.includes(params.shipName!));
  return result;
}

// --- Route handler ---------------------------------------------------

export async function GET(request: NextRequest) {
  const t0 = Date.now();

  try {
    // 1) 쿼리 파라미터 유효성 검사
    const parsed = parseAndValidateQuery(request.nextUrl.searchParams);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.message }, { status: 400 });
    }
    const params = parsed.data;

    // 2) 선박 정적 정보 조회
    const { data, fallback } = await fetchVessels(params);

    const duration = Date.now() - t0;

    structuredLog('info', {
      timestamp: new Date().toISOString(),
      event: 'vessel.get.complete',
      duration,
      count: data.length,
      mock: fallback,
      params,
    });

    return NextResponse.json({
      ok:        true,
      data,
      count:     data.length,
      timestamp: new Date().toISOString(),
      mock:      fallback,
    });
  } catch (err) {
    structuredLog('error', {
      timestamp: new Date().toISOString(),
      event: 'vessel.get.unhandled_error',
      error: String(err),
      duration: Date.now() - t0,
    });
    return NextResponse.json(
      {
        ok:    false,
        error: 'Internal server error',
        mock:  true,
        data:  MOCK_VESSELS,
        count: MOCK_VESSELS.length,
      },
      { status: 500 },
    );
  }
}
