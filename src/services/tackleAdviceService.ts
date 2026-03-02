/**
 * Tackle Advice Service
 * 어종별, 물때별, 조류별 채비(봉돌/라인/루어) 추천 로직
 * Used by Pre-Trip Briefing System
 */

export interface TackleAdvice {
  species: string;
  tide: string;           // e.g. "4물 (조류 보통)"
  sinkerGuide: SinkerGuide;
  lineGuide: LineGuide;
  lureGuide?: LureGuide;
  generalTips: string[];
}

export interface SinkerGuide {
  tungsten?: string;   // e.g. "6~14호"
  lead?: string;       // e.g. "12~18호"
  note: string;
}

export interface LineGuide {
  mainLine: string;    // e.g. "합사 0.6~1호"
  leader?: string;     // e.g. "카본 2~3호"
  length?: string;     // e.g. "최소 100m"
}

export interface LureGuide {
  type: string;        // e.g. "미니에기"
  size?: string;       // e.g. "2.5호"
  colors: string[];    // e.g. ["국방색", "닭새우"]
  note: string;
}

// 물때 계산: 1~30물 중 조류 세기 분류
// 음력 1일 = 1물 기준 (사리: 7~8물, 조금: 13~15물)
export type TidePhase = 'neap' | 'moderate' | 'spring'; // 조금/보통/사리

/**
 * 물때 번호(1~15)로 조류 세기 분류
 */
export function getTidePhase(tideNum: number): TidePhase {
  const n = ((tideNum - 1) % 15) + 1; // 1~15 범위로 정규화
  if (n >= 13 || n <= 2) return 'neap';    // 조금 (13~15, 1~2물)
  if (n >= 7 && n <= 9) return 'spring';  // 사리 (7~9물)
  return 'moderate';
}

/**
 * 물때 번호로 설명 텍스트 반환
 */
export function getTideLabel(tideNum: number): string {
  const phase = getTidePhase(tideNum);
  const phaseLabel = { neap: '조금 (약한 조류)', moderate: '보통 조류', spring: '사리 (강한 조류)' }[phase];
  return `${tideNum}물 — ${phaseLabel}`;
}

// ─── 어종별 채비 데이터베이스 ──────────────────────────────────

const TACKLE_DB: Record<string, {
  sinker: Record<TidePhase, SinkerGuide>;
  line: LineGuide;
  lure?: Record<TidePhase, LureGuide>;
  tips: string[];
}> = {

  '주꾸미': {
    sinker: {
      neap:     { tungsten: '4~8호', lead: '8~12호', note: '조류 약함, 가벼운 봉돌로 바닥 탐색' },
      moderate: { tungsten: '6~14호', lead: '12~18호', note: '보통 조류, 수심 20~30m 기준' },
      spring:   { tungsten: '10~20호', lead: '16~28호', note: '조류 강함, 무거운 봉돌 필수' },
    },
    line: { mainLine: '합사 0.6~1호', leader: '카본 1.5~2호', length: '최소 100m' },
    lure: {
      neap:     { type: '에기', size: '2호', colors: ['오렌지', '핑크'], note: '천천히 액션' },
      moderate: { type: '미니에기', size: '2.5호', colors: ['국방색', '닭새우', '오렌지'], note: '최근 미니에기 조과 좋음' },
      spring:   { type: '에기', size: '3호', colors: ['국방색', '자연색'], note: '빠른 세팅, 무거운 에기' },
    },
    tips: [
      '바닥층 위주로 탐색 (주꾸미는 저층 어종)',
      '에기 투하 후 바닥 찍은 뒤 살짝 들어올리는 액션',
      '선상낚시의 경우 직결채비 추천',
      '조류 방향 확인 후 업 or 다운 캐스팅 결정',
    ],
  },

  '볼락': {
    sinker: {
      neap:     { lead: '2~5호', note: '조류 약할 때 가벼운 지그헤드' },
      moderate: { lead: '3~7호', note: '중간 조류' },
      spring:   { lead: '5~10호', note: '조류 강할 때 무거운 지그헤드' },
    },
    line: { mainLine: '합사 0.3~0.6호', leader: '카본 1~1.5호', length: '최소 50m' },
    lure: {
      neap:     { type: '웜', size: '2인치', colors: ['차트', '핑크', '화이트'], note: '야간엔 밝은 색상' },
      moderate: { type: '웜 + 지그헤드', size: '2인치', colors: ['클리어', '그린펌킨'], note: '낮에는 자연색' },
      spring:   { type: '웜', size: '2인치', colors: ['차트', '레드'], note: '조류 강할 때 어필도 높은 색상' },
    },
    tips: [
      '야간 낚시가 주 -> 헤드랜턴 필수',
      '방파제 테트라포드 틈새 공략',
      '1.5~2g 지그헤드가 범용성 최고',
      '조류 흐르는 방향으로 캐스팅 후 흘려보내기',
    ],
  },

  '감성돔': {
    sinker: {
      neap:     { lead: '2~3호', note: '조금 때는 가벼운 봉돌, 자연스러운 흘림' },
      moderate: { lead: '3~5호', note: '반유동 or 전유동 채비' },
      spring:   { lead: '5~8호', note: '사리 때는 무거운 봉돌 + 고정채비 병행' },
    },
    line: { mainLine: '모노 3~5호 or 합사 1~1.5호', leader: '카본 3~5호', length: '최소 80m' },
    tips: [
      '밑밥(집어제+크릴)은 출조 전날 해동',
      '아침 첫 물 때가 황금 타임',
      '찌는 조류에 맞게 반유동/전유동 선택',
      '채비 5m 이상 간격 유지',
    ],
  },

  '농어': {
    sinker: {
      neap:     { note: '가벼운 루어 (10~20g) 표층 탐색' },
      moderate: { note: '중간 루어 (20~40g) 표층~중층' },
      spring:   { lead: '30~50g', note: '조류 빠를 때 바이브레이션, 무거운 루어' },
    },
    line: { mainLine: '합사 1~1.5호', leader: '카본 4~6호', length: '최소 150m' },
    lure: {
      neap:     { type: '미노우', size: '120mm', colors: ['차트', '핑크실버'], note: '표층 워킹' },
      moderate: { type: '미노우/바이브', size: '130mm', colors: ['홀로그램', '블루실버'], note: '표층~중층' },
      spring:   { type: '바이브레이션', size: '70~90mm', colors: ['차트', '레드'], note: '빠른 조류엔 바이브' },
    },
    tips: [
      '새벽/저녁 골든타임 공략',
      '파도와 조류가 만나는 포인트 집중',
      '트위칭 → 스테이 액션 반복',
      '형광등 조명 근처 포인트 공략 (야간)',
    ],
  },

  '방어': {
    sinker: {
      neap:     { tungsten: '100~150g', note: '수심 50~80m, 조류 약할 때 가벼운 지그' },
      moderate: { tungsten: '150~250g', note: '수심 60~100m, 슬로우지깅' },
      spring:   { tungsten: '200~300g', note: '조류 강할 때 무거운 지그로 빠르게 침강' },
    },
    line: { mainLine: '합사 PE2~4호', leader: '카본 10~16호', length: '최소 300m' },
    lure: {
      neap:     { type: '슬로우지그', size: '150g', colors: ['핑크', '실버'], note: '슬로우폴 액션' },
      moderate: { type: '슬로우지그', size: '200g', colors: ['핑크', '차트', '오렌지'], note: '원피치지깅' },
      spring:   { type: '지그', size: '250~300g', colors: ['실버', '차트'], note: '고속지깅' },
    },
    tips: [
      '선장 지시 수심 준수',
      '지그 착저 후 즉시 드래그 체크',
      'PE라인 300m 이상 필수',
      '갈고리 드래그 설정 중요 (너무 세면 라인 버팀)',
    ],
  },

  '우럭': {
    sinker: {
      neap:     { lead: '20~40호', note: '바닥 탐색, 조류 약할 때' },
      moderate: { lead: '30~60호', note: '방파제 및 선상 기준' },
      spring:   { lead: '50~80호', note: '조류 강할 때 무거운 봉돌' },
    },
    line: { mainLine: '나일론 4~6호 or 합사 1~2호', leader: '카본 5~8호', length: '최소 100m' },
    tips: [
      '카드채비 2~3단 사용',
      '갯지렁이 or 새우 미끼',
      '바닥에서 50cm 이내로 채비 유지',
      '입질 후 2~3초 여유 주고 챔질',
    ],
  },
};

/**
 * 어종 + 물때 번호로 채비 추천 생성
 */
export function getTackleAdvice(species: string, tideNum: number): TackleAdvice | null {
  const db = TACKLE_DB[species];
  if (!db) return null;

  const phase = getTidePhase(tideNum);
  const tideLabel = getTideLabel(tideNum);

  return {
    species,
    tide: tideLabel,
    sinkerGuide: db.sinker[phase],
    lineGuide: db.line,
    lureGuide: db.lure?.[phase],
    generalTips: db.tips,
  };
}

/**
 * 날씨 조건에 따른 추가 준비물 체크리스트 생성
 */
export interface ChecklistItem {
  icon: string;
  item: string;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
  coupangQuery?: string; // 쿠팡 검색어 (구매 추천 시)
}

export function getWeatherChecklist(params: {
  temp: number;       // 기온 (℃)
  windSpeed: number;  // 풍속 (m/s)
  rain: boolean;      // 비 여부
  uv?: number;        // 자외선 지수
  humidity?: number;  // 습도
}): ChecklistItem[] {
  const { temp, windSpeed, rain, uv = 0 } = params;
  const items: ChecklistItem[] = [];

  // 기온별 체크리스트
  if (temp <= 5) {
    items.push({ icon: '🧥', item: '방한 내피 + 방한복', reason: `기온 ${temp}℃ — 체감온도 더 낮음`, priority: 'essential', coupangQuery: '낚시 방한복' });
    items.push({ icon: '🔥', item: '핫팩 10개 이상', reason: '손발 보온 필수', priority: 'essential', coupangQuery: '핫팩 40매' });
    items.push({ icon: '🧤', item: '방한 낚시 장갑', reason: '손이 얼면 라인 컨트롤 불가', priority: 'essential', coupangQuery: '낚시 방한 장갑' });
  } else if (temp <= 12) {
    items.push({ icon: '🧥', item: '방한 자켓', reason: `기온 ${temp}℃, 바람 체감 추움`, priority: 'essential', coupangQuery: '방수 낚시 자켓' });
    items.push({ icon: '🔥', item: '핫팩 5개', reason: '예비 보온', priority: 'recommended', coupangQuery: '핫팩' });
  } else if (temp >= 28) {
    items.push({ icon: '❄️', item: '얼음물 2L 이상', reason: `기온 ${temp}℃ — 탈수 위험`, priority: 'essential' });
    items.push({ icon: '🧢', item: '챙 넓은 모자', reason: '직사광선 차단', priority: 'essential' });
  }

  // 자외선
  if (uv >= 8) {
    items.push({ icon: '🕶️', item: '선글라스 (편광)', reason: `자외선 지수 ${uv} — 매우 강함`, priority: 'essential', coupangQuery: '편광 낚시 선글라스' });
    items.push({ icon: '🧴', item: '자외선 차단제 SPF50+', reason: '장시간 야외, 피부 화상 위험', priority: 'essential', coupangQuery: '선크림 SPF50' });
  } else if (uv >= 5) {
    items.push({ icon: '🕶️', item: '선글라스', reason: `자외선 지수 ${uv} — 강함`, priority: 'recommended' });
    items.push({ icon: '🧴', item: '선크림', reason: '장시간 노출', priority: 'recommended' });
  }

  // 비
  if (rain) {
    items.push({ icon: '🌧️', item: '우비 (상하의 분리형)', reason: '강수 예보, 방수 자켓 단독은 부족', priority: 'essential', coupangQuery: '낚시 우비' });
    items.push({ icon: '🥾', item: '미끄럼 방지 워킹화', reason: '젖은 방파제 위험', priority: 'essential' });
    items.push({ icon: '📦', item: '방수백 (태클박스용)', reason: '장비 침수 방지', priority: 'recommended' });
  }

  // 바람
  if (windSpeed >= 8) {
    items.push({ icon: '⚠️', item: '배멀미약 (전날 복용)', reason: `풍속 ${windSpeed}m/s — 선상 출렁임 심함`, priority: 'essential', coupangQuery: '멀미약' });
    items.push({ icon: '🩹', item: '배멀미 패치', reason: '선상낚시 필수', priority: 'essential' });
  } else if (windSpeed >= 5) {
    items.push({ icon: '💊', item: '배멀미약 챙기기', reason: `풍속 ${windSpeed}m/s`, priority: 'recommended' });
  }

  // 기본 필수 준비물
  const essentials: ChecklistItem[] = [
    { icon: '🧊', item: '아이스박스 + 얼음', reason: '어획물 신선도 유지', priority: 'essential' },
    { icon: '💧', item: '식수 1L 이상', reason: '장시간 출조 탈수 방지', priority: 'essential' },
    { icon: '📱', item: '보조배터리', reason: 'GPS + 앱 사용, 배터리 소모 짝큼', priority: 'essential' },
    { icon: '🩺', item: '상비약 (진통제, 소화제)', reason: '현장 응급 대비', priority: 'recommended' },
    { icon: '🆔', item: '신분증', reason: '선상낚시 탑승 필수', priority: 'essential' },
    { icon: '🛡️', item: '구명조끼 (자동팽창식)', reason: '안전 필수 — 선상낚시 착용 의무', priority: 'essential', coupangQuery: '자동팽창식 구명조끼' },
  ];

  return [...items, ...essentials];
}
