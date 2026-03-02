/**
 * Pre-Trip Briefing Service
 * 출조 전날 오후 2시 발송을 위한 맞춤 브리핑 생성
 *
 * Pipeline:
 * 1. 날씨 데이터 (weatherService)
 * 2. 조수/물때 데이터 (tideService)
 * 3. 커뮤니티 조황 (fishingNewsService — 카페글 검색)
 * 4. 채비 추천 (tackleAdviceService)
 * 5. 장비 딥링크 (affiliateService)
 * → Gemini AI 종합 → 구조화된 브리핑 반환
 */

import { fetchTideData } from './tideService';
import { fetchCommunityInsights } from './fishingNewsService';
import { getTackleAdvice, getWeatherChecklist, ChecklistItem, TackleAdvice } from './tackleAdviceService';
import { getGearRecommendations } from './affiliateService';

// ─── Types ──────────────────────────────────────────────────────

export interface TripPlan {
  date: string;             // 출조일 YYYY-MM-DD
  species: string;          // 대상 어종 (주꾸미, 볼락, 감성돔 등)
  location: string;         // 출조 장소 (예: 태안, 통영)
  lat: number;              // 위도
  lng: number;              // 경도
  fishingType: 'shore' | 'boat' | 'breakwater' | 'reef';
  charterName?: string;     // 선사명 (선상낚시 시)
  alertHour?: number;       // 알림 시간 (기본 14 = 오후 2시)
}

export interface GearSuggestion {
  name: string;
  reason: string;
  affiliateUrl: string;
  icon: string;
  coupangQuery?: string;
}

export interface CommunityInsight {
  source: string;
  title: string;
  snippet: string;
  link: string;
}

export interface TripBriefing {
  tripPlan: TripPlan;
  weatherChecklist: ChecklistItem[];
  tackleAdvice: TackleAdvice | null;
  communityInsights: CommunityInsight[];
  basicChecklist: ChecklistItem[];
  gearSuggestions: GearSuggestion[];
  aiSummary: string;
  tideInfo: string;
  generatedAt: string;
}

// ─── 기본 선상 준비물 ────────────────────────────────────────────

const BOAT_BASIC_CHECKLIST: ChecklistItem[] = [
  { icon: '🎣', item: '낚싯대 + 릴 세팅 확인', reason: '출발 전 드래그/가이드 체크', priority: 'essential' },
  { icon: '🪝', item: '여분 채비 세트', reason: '밑걸림/라인 끊김 대비 3세트 이상', priority: 'essential' },
  { icon: '🔪', item: '낚시 가위/집게', reason: '채비 교체 필수 도구', priority: 'essential' },
  { icon: '💡', item: '헤드랜턴 + 여분 건전지', reason: '새벽/야간 출조 필수', priority: 'essential' },
  { icon: '📞', item: '선장님 연락처 + 예약 확인', reason: '사전 결제 완료 여부 재확인', priority: 'essential' },
  { icon: '🧪', item: '손 세정제 + 물티슈', reason: '물고기 다룬 후 위생', priority: 'recommended' },
  { icon: '🎒', item: '아이스박스에 얼음 미리 채우기', reason: '출발 당일 아침 준비 번거로움', priority: 'recommended' },
  { icon: '🐟', item: '다시마 + 굵은소금 (활어 보관용)', reason: '전어·볼락 등 신선도 유지', priority: 'optional' },
];

const getShoreBasicChecklist = (tripDate: string): ChecklistItem[] => {
  const month = new Date(tripDate).getMonth() + 1;
  const isMosquitoSeason = month >= 5 && month <= 10;
  
  const base: ChecklistItem[] = [
    { icon: '🔦', item: '헤드랜턴 (야간 방파제)', reason: '발밑 안전 + 채비 작업', priority: 'essential' },
    { icon: '🪝', item: '여분 채비 세트', reason: '밑걸림 대비', priority: 'essential' },
    { icon: '🪑', item: '낚시 의자 or 방석', reason: '장시간 대기 피로 방지', priority: 'optional' },
  ];
  
  if (isMosquitoSeason) {
    base.splice(2, 0, { icon: '🦟', item: '방충제 (모기약)', reason: '방파제/갯가 모기 많음', priority: 'recommended' });
  }
  
  return base;
};

// ─── 물때 번호 추정 (조수 데이터 기반) ────────────────────────────

function estimateTideNum(tideData: Awaited<ReturnType<typeof fetchTideData>>): number {
  // 실제 KHOA API가 물때 번호를 직접 제공하지 않으므로
  // 현재 날짜 기반 대략적 추정 (음력 계산 없이 1~15 순환)
  const now = new Date();
  const dayOfMonth = now.getDate();
  // 음력 1일 기준 근사
  return ((dayOfMonth - 1) % 15) + 1;
}

// ─── Gemini 브리핑 생성 ─────────────────────────────────────────

async function generateAISummary(params: {
  species: string;
  location: string;
  fishingType: string;
  tideNum: number;
  weatherSummary: string;
  communitySummary: string;
  tackleAdvice: TackleAdvice | null;
}): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return '브리핑 생성 실패 (AI 키 없음)';

  const prompt = `당신은 한국의 낚시 전문가 AI입니다. 아래 정보를 보고 출조 전 핵심 브리핑을 한국어로 작성하세요.

어종: ${params.species}
출조지: ${params.location}
낚시 유형: ${params.fishingType}
물때: ${params.tideNum}물
날씨: ${params.weatherSummary}
채비 추천: ${params.tackleAdvice ? JSON.stringify(params.tackleAdvice.sinkerGuide) : '없음'}
커뮤니티 조황 요약:
${params.communitySummary}

위 정보를 종합하여:
1. 오늘 출조 컨디션 총평 (1~2문장, 솔직하게)
2. 핵심 채비 팁 1~2줄
3. 커뮤니티 인사이트 반영한 특이사항

150자 이내로 간결하게 작성. 이모지 포함.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Gemini API error:', res.status, errText);
      // Graceful fallback — 기본 채비 메시지 반환
      return `🎣 ${params.species} 출조 준비! ${params.tideNum}물 기준 채비를 세팅하고, ${params.location} 현지 날씨를 출발 전 재확인하세요.`;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text
      || `🎣 ${params.species} ${params.location} 출조 준비! 채비 점검 후 안전 출조하세요.`;
  } catch (err) {
    console.error('Gemini briefing generation failed:', err);
    return `🎣 ${params.species} ${params.location} 출조! 날씨·물때·채비 준비 잘 하시고 안전한 낚시 되세요.`;
  }
}

// ─── 메인 브리핑 생성 함수 ─────────────────────────────────────

export async function generateTripBriefing(
  tripPlan: TripPlan,
  weatherParams?: { temp: number; windSpeed: number; rain: boolean; uv?: number }
): Promise<TripBriefing> {
  // Default weather if not provided
  const weather = weatherParams ?? { temp: 15, windSpeed: 4, rain: false, uv: 4 };

  // 1. 병렬로 데이터 수집
  const [tideData, communityResult, gearRecs] = await Promise.allSettled([
    fetchTideData(tripPlan.lat, tripPlan.lng, tripPlan.date.replace(/-/g, '')),
    fetchCommunityInsights(tripPlan.species, tripPlan.location),
    Promise.resolve(getGearRecommendations(tripPlan.species)),
  ]);

  // 2. 조수 데이터 처리
  const tideResult = tideData.status === 'fulfilled' ? tideData.value : null;
  const tideNum = estimateTideNum(tideResult);
  const tideInfo = tideResult
    ? tideResult.tides.map(t => `${t.type === 'High' ? '만조' : '간조'} ${t.time}`).join(' / ')
    : '조수 정보 없음';

  // 3. 채비 추천
  const tackleAdvice = getTackleAdvice(tripPlan.species, tideNum);

  // 4. 날씨 체크리스트
  const weatherChecklist = getWeatherChecklist(weather);

  // 5. 커뮤니티 인사이트
  const insights = communityResult.status === 'fulfilled' ? communityResult.value : { articles: [], summary: '없음' };
  const communityInsights: CommunityInsight[] = insights.articles.slice(0, 5).map(a => ({
    source: a.sourceLabel,
    title: a.title,
    snippet: a.description,
    link: a.link,
  }));

  // 6. 장비 딥링크
  const gearList = gearRecs.status === 'fulfilled' ? gearRecs.value : [];
  const gearSuggestions: GearSuggestion[] = gearList.slice(0, 4).map(g => ({
    name: g.name,
    reason: g.description,
    affiliateUrl: g.affiliateUrl,
    icon: g.icon,
  }));

  // 7. AI 종합 브리핑
  const weatherSummary = `기온 ${weather.temp}℃, 풍속 ${weather.windSpeed}m/s${weather.rain ? ', 비 예보' : ''}`;
  const aiSummary = await generateAISummary({
    species: tripPlan.species,
    location: tripPlan.location,
    fishingType: tripPlan.fishingType,
    tideNum,
    weatherSummary,
    communitySummary: insights.summary,
    tackleAdvice,
  });

  // 8. 기본 준비물
  const basicChecklist = tripPlan.fishingType === 'boat'
    ? BOAT_BASIC_CHECKLIST
    : getShoreBasicChecklist(tripPlan.date);

  return {
    tripPlan,
    weatherChecklist,
    tackleAdvice,
    communityInsights,
    basicChecklist,
    gearSuggestions,
    aiSummary,
    tideInfo,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 브리핑 알림 예약 (출조 전날 오후 2시)
 * 실제 알림은 pushNotificationService에서 처리
 */
export function getBriefingAlertTime(tripDate: string, alertHour: number = 14): Date {
  const tripDay = new Date(tripDate);
  const prevDay = new Date(tripDay);
  prevDay.setDate(prevDay.getDate() - 1); // 전날
  prevDay.setHours(alertHour, 0, 0, 0);
  return prevDay;
}
