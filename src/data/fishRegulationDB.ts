// Fish Regulation Database — Korean fishing regulations (금어기/포획금지 규정)
// Source: 해양수산부 수산자원관리법, 수산자원관리법 시행령/시행규칙
// Last verified: 2026-03-04
// NOTE: This is a simplified reference. Always check official 해양수산부 regulations.

export interface FishRegulation {
  species: string;
  speciesEn: string;
  emoji: string;
  // Closed season (금어기)
  closedSeason: { start: string; end: string; note?: string } | null;
  // Minimum catch size (포획금지체장, cm)
  minSizeCm: number | null;
  // Daily catch limit (마릿수 제한)
  dailyLimit: number | null;
  // Regional restrictions
  regionalNotes: string[];
  // Penalty info
  penaltyNote: string;
  // Source/legal reference
  legalRef: string;
  // Category
  category: 'saltwater' | 'freshwater' | 'both';
  // Extra tips
  tipKo: string;
}

// Korean fishing regulations database
// Sources: 수산자원관리법 시행규칙 별표 1~7, 해양수산부 고시
export const FISH_REGULATION_DB: FishRegulation[] = [
  // ── 해수어 (Saltwater) ─────────────────────────────
  {
    species: '주꾸미',
    speciesEn: 'Webfoot Octopus',
    emoji: '🐙',
    closedSeason: { start: '5/1', end: '8/31', note: '산란기 보호' },
    minSizeCm: null,
    dailyLimit: null,
    regionalNotes: ['서해·남해 전역 적용'],
    penaltyNote: '금어기 위반 시 300만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표30',
    category: 'saltwater',
    tipKo: '금어기 해제 직후(9월)가 최고 시즌! 에기 색상은 주황·빨강 추천.',
  },
  {
    species: '감성돔',
    speciesEn: 'Black Sea Bream',
    emoji: '🐠',
    closedSeason: { start: '5/1', end: '6/30', note: '산란기 보호 (일부 해역)' },
    minSizeCm: 25,
    dailyLimit: 10,
    regionalNotes: [
      '전 해역 포획금지 체장 25cm 미만',
      '일부 해역 금어기가 다를 수 있음',
      '제주 해역은 별도 규정',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '25cm 미만은 반드시 방류! 줄자 필수 지참.',
  },
  {
    species: '참돔',
    speciesEn: 'Red Sea Bream',
    emoji: '🎏',
    closedSeason: null,
    minSizeCm: 24,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 24cm 미만',
      '타이라바/인치쿠 낚시 시 슬롯 사이즈 확인',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '24cm 이상만 킵! 바늘 수거 후 방류 시 생존율 높음.',
  },
  {
    species: '우럭',
    speciesEn: 'Black Rockfish',
    emoji: '🪨',
    closedSeason: null,
    minSizeCm: 23,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 23cm 미만 (조피볼락)',
      '낚시어선 유어 면허 없이 가능',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '23cm 미만은 즉시 방류. 수심 30m 이상에서 올린 물고기는 부력 조절 실패 → 방류 불가능할 수 있음.',
  },
  {
    species: '광어',
    speciesEn: 'Olive Flounder',
    emoji: '🐠',
    closedSeason: null,
    minSizeCm: 35,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 35cm 미만',
      '특히 방류 해역에서는 더 엄격하게 적용',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '35cm 미만 즉시 방류! 방류 시 물에 몇 초간 담갔다 놓아주면 생존율 UP.',
  },
  {
    species: '볼락',
    speciesEn: 'Korean Rockfish',
    emoji: '🐡',
    closedSeason: null,
    minSizeCm: 15,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 15cm 미만',
      '야간 볼락 루어 낚시 시 특히 주의',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '15cm 미만은 즉시 방류. 작은 볼락이 많이 올라오면 포인트 이동 추천.',
  },
  {
    species: '고등어',
    speciesEn: 'Chub Mackerel',
    emoji: '🐟',
    closedSeason: null,
    minSizeCm: 21,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 21cm 미만',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '21cm 미만 방류. 배 위에서 줄자 재기 어려우면 손 한 뼘(약 20cm)과 비교.',
  },
  {
    species: '방어',
    speciesEn: 'Yellowtail',
    emoji: '🐟',
    closedSeason: null,
    minSizeCm: 30,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 30cm 미만',
      '지깅 시 30cm 미만 잔챙이 주의',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '30cm 미만 즉시 방류. 겨울 방어가 가장 맛있음 (11~1월).',
  },
  {
    species: '전갱이',
    speciesEn: 'Horse Mackerel',
    emoji: '🐟',
    closedSeason: null,
    minSizeCm: 15,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 15cm 미만',
    ],
    penaltyNote: '체장 미달 포획 시 100만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4',
    category: 'saltwater',
    tipKo: '15cm 미만 방류. 미끼용 전갱이도 체장 규정 적용됨!',
  },
  {
    species: '대구',
    speciesEn: 'Pacific Cod',
    emoji: '🐟',
    closedSeason: { start: '1/16', end: '2/15', note: '산란기 보호 (일부 해역)' },
    minSizeCm: 35,
    dailyLimit: null,
    regionalNotes: [
      '진해만 해역 금어기 1/16~2/15',
      '전 해역 포획금지 체장 35cm 미만',
    ],
    penaltyNote: '금어기 및 체장 미달 위반 시 300만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4, 별표30',
    category: 'saltwater',
    tipKo: '겨울 대구 낚시 시 금어기 주의. 특히 진해만 해역은 별도 규정.',
  },
  {
    species: '갑오징어',
    speciesEn: 'Cuttlefish',
    emoji: '🦑',
    closedSeason: { start: '5/1', end: '8/31', note: '산란기 보호' },
    minSizeCm: null,
    dailyLimit: null,
    regionalNotes: [
      '서해·남해 전역 적용',
      '에깅(에기 루어) 낚시도 동일 적용',
    ],
    penaltyNote: '금어기 위반 시 300만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표30',
    category: 'saltwater',
    tipKo: '금어기 해제 후 9~11월이 시즌. 산란 개체는 반드시 방류.',
  },
  {
    species: '쥐노래미',
    speciesEn: 'Greenling',
    emoji: '🐟',
    closedSeason: { start: '11/1', end: '12/31', note: '산란기 보호' },
    minSizeCm: 20,
    dailyLimit: null,
    regionalNotes: [
      '전 해역 포획금지 체장 20cm 미만',
      '산란기(11~12월) 금어기 주의',
    ],
    penaltyNote: '금어기 및 체장 미달 위반 시 300만원 이하 과태료',
    legalRef: '수산자원관리법 시행규칙 별표4, 별표30',
    category: 'saltwater',
    tipKo: '겨울 방파제 낚시 시 노래미 금어기 주의! 11~12월은 산란기.',
  },
  // ── 담수어 (Freshwater) ─────────────────────────────
  {
    species: '배스',
    speciesEn: 'Largemouth Bass',
    emoji: '🐟',
    closedSeason: null,
    minSizeCm: null,
    dailyLimit: null,
    regionalNotes: [
      '외래종 — 포획 후 방류 금지 (수거 의무)',
      '생태계교란종으로 지정',
    ],
    penaltyNote: '방류 시 200만원 이하 과태료',
    legalRef: '생태계교란 생물 관리에 관한 규정',
    category: 'freshwater',
    tipKo: '⚠️ 배스는 외래종! 잡으면 방사 금지, 수거 의무. 살아서 이동도 금지.',
  },
  {
    species: '블루길',
    speciesEn: 'Bluegill',
    emoji: '🐟',
    closedSeason: null,
    minSizeCm: null,
    dailyLimit: null,
    regionalNotes: [
      '외래종 — 포획 후 방류 금지 (수거 의무)',
      '생태계교란종으로 지정',
    ],
    penaltyNote: '방류 시 200만원 이하 과태료',
    legalRef: '생태계교란 생물 관리에 관한 규정',
    category: 'freshwater',
    tipKo: '⚠️ 블루길은 외래종! 잡으면 수거 의무. 방류 시 과태료 부과.',
  },
];

// ── Helpers ─────────────────────────────────────────────────

/** Get regulation for a specific species */
export function getRegulation(speciesName: string): FishRegulation | undefined {
  return FISH_REGULATION_DB.find(r => r.species === speciesName);
}

/** Get all species currently in closed season */
export function getClosedSpecies(month: number, day: number): FishRegulation[] {
  return FISH_REGULATION_DB.filter(r => {
    if (!r.closedSeason) return false;
    const [startM, startD] = r.closedSeason.start.split('/').map(Number);
    const [endM, endD] = r.closedSeason.end.split('/').map(Number);
    const current = month * 100 + day;
    const start = startM * 100 + startD;
    const end = endM * 100 + endD;
    return current >= start && current <= end;
  });
}

/** Get all species with minimum size requirements */
export function getSpeciesWithMinSize(): FishRegulation[] {
  return FISH_REGULATION_DB.filter(r => r.minSizeCm !== null);
}

/** Search regulations by keyword */
export function searchRegulations(query: string): FishRegulation[] {
  const q = query.toLowerCase().trim();
  if (!q) return FISH_REGULATION_DB;
  return FISH_REGULATION_DB.filter(r =>
    r.species.includes(q) ||
    r.speciesEn.toLowerCase().includes(q) ||
    r.regionalNotes.some(n => n.includes(q)) ||
    r.tipKo.includes(q) ||
    r.category.includes(q)
  );
}

/** Check if catching this species is currently legal */
export function isCatchLegal(speciesName: string, sizeCm: number | null, month: number, day: number): {
  legal: boolean;
  violations: string[];
} {
  const reg = getRegulation(speciesName);
  if (!reg) return { legal: true, violations: [] };

  const violations: string[] = [];

  // Check closed season
  if (reg.closedSeason) {
    const [startM, startD] = reg.closedSeason.start.split('/').map(Number);
    const [endM, endD] = reg.closedSeason.end.split('/').map(Number);
    const current = month * 100 + day;
    const start = startM * 100 + startD;
    const end = endM * 100 + endD;
    if (current >= start && current <= end) {
      violations.push(`현재 금어기 기간 (${reg.closedSeason.start}~${reg.closedSeason.end})`);
    }
  }

  // Check minimum size
  if (reg.minSizeCm && sizeCm !== null && sizeCm < reg.minSizeCm) {
    violations.push(`포획금지 체장 미달 (${sizeCm}cm < 최소 ${reg.minSizeCm}cm)`);
  }

  return {
    legal: violations.length === 0,
    violations,
  };
}
