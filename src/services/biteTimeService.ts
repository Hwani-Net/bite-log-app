// BiteTime — Fishing Bite Prediction Service
// Rule-based algorithm: weather + tide + time → bite probability (0-100%)
// Cost: $0 (no external API calls, uses existing weather & tide data)

import { WeatherData } from './weatherService';
import { TideData } from './tideService';

export interface BiteTimePrediction {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  gradeLabel: string;
  gradeEmoji: string;
  factors: BiteFactor[];
}

export interface BiteFactor {
  name: string;
  icon: string;
  score: number; // 0-100 contribution
  status: 'positive' | 'neutral' | 'negative';
  description: string;
}

// Calculate sunrise/sunset magic hour bonus
function getMagicHourScore(): { score: number; description: string } {
  const hour = new Date().getHours();
  
  // Dawn magic hour: 4-7 AM
  if (hour >= 4 && hour <= 7) {
    return { score: 25, description: '새벽 매직아워 — 최고의 입질 시간대' };
  }
  // Dusk magic hour: 17-20
  if (hour >= 17 && hour <= 20) {
    return { score: 22, description: '해질녘 매직아워 — 활발한 입질' };
  }
  // Night fishing: 21-3
  if (hour >= 21 || hour <= 3) {
    return { score: 12, description: '야간 — 어종에 따라 활동' };
  }
  // Midday: 11-15
  if (hour >= 11 && hour <= 15) {
    return { score: 5, description: '한낮 — 입질 약한 시간대' };
  }
  // Morning/afternoon transition
  return { score: 15, description: '오전/오후 — 보통 활동' };
}

// Wind factor
function getWindScore(windSpeed?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (windSpeed === undefined) return { score: 10, status: 'neutral', description: '바람 정보 없음' };
  
  if (windSpeed <= 3) return { score: 20, status: 'positive', description: `미풍 ${windSpeed}m/s — 안정적인 조건` };
  if (windSpeed <= 6) return { score: 15, status: 'positive', description: `약풍 ${windSpeed}m/s — 적당한 먹이활동 유도` };
  if (windSpeed <= 10) return { score: 8, status: 'neutral', description: `보통바람 ${windSpeed}m/s — 채비 조절 필요` };
  return { score: 2, status: 'negative', description: `강풍 ${windSpeed}m/s — 낚시 어려움` };
}

// Temperature factor
function getTempScore(tempC?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (tempC === undefined) return { score: 10, status: 'neutral', description: '기온 정보 없음' };
  
  if (tempC >= 15 && tempC <= 25) return { score: 20, status: 'positive', description: `${tempC}°C — 최적 수온대` };
  if (tempC >= 10 && tempC < 15) return { score: 14, status: 'neutral', description: `${tempC}°C — 약간 선선, 적합` };
  if (tempC > 25 && tempC <= 30) return { score: 12, status: 'neutral', description: `${tempC}°C — 더운 날, 심층 이동 가능` };
  if (tempC < 5) return { score: 4, status: 'negative', description: `${tempC}°C — 저수온, 활동 저조` };
  if (tempC > 30) return { score: 5, status: 'negative', description: `${tempC}°C — 고수온, 활동 저조` };
  return { score: 10, status: 'neutral', description: `${tempC}°C — 보통` };
}

// Tide factor
function getTideScore(tideData?: TideData | null): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (!tideData || tideData.tides.length === 0) {
    return { score: 10, status: 'neutral', description: '물때 정보 없음' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find nearest tide event
  let nearestDiff = Infinity;
  let nearestTide = tideData.tides[0];

  for (const tide of tideData.tides) {
    const [h, m] = tide.time.split(':').map(Number);
    const tideMinutes = h * 60 + m;
    const diff = Math.abs(currentMinutes - tideMinutes);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestTide = tide;
    }
  }

  // Best: 1-2 hours before/after high tide
  if (nearestTide.type === 'High' && nearestDiff <= 120) {
    return { score: 25, description: `만조 전후 — 최고의 입질 타이밍 (${nearestTide.time})`, status: 'positive' };
  }
  // Good: approaching high tide
  if (nearestTide.type === 'High' && nearestDiff <= 180) {
    return { score: 18, description: `만조 접근 중 — 좋은 타이밍 (${nearestTide.time})`, status: 'positive' };
  }
  // Low tide period
  if (nearestTide.type === 'Low' && nearestDiff <= 60) {
    return { score: 6, description: `간조 중 — 입질 약함 (${nearestTide.time})`, status: 'negative' };
  }

  return { score: 12, description: `물때 전환 중 (${tideData.stationName})`, status: 'neutral' };
}

function getGrade(score: number): { grade: BiteTimePrediction['grade']; gradeLabel: string; gradeEmoji: string } {
  if (score >= 75) return { grade: 'excellent', gradeLabel: '최고의 타이밍!', gradeEmoji: '🟢' };
  if (score >= 55) return { grade: 'good', gradeLabel: '좋은 조건', gradeEmoji: '🔵' };
  if (score >= 35) return { grade: 'fair', gradeLabel: '보통', gradeEmoji: '🟡' };
  return { grade: 'poor', gradeLabel: '아쉬운 조건', gradeEmoji: '🔴' };
}

export function calculateBiteTime(
  weather: WeatherData | null,
  tideData: TideData | null
): BiteTimePrediction {
  const timeResult = getMagicHourScore();
  const windResult = getWindScore(weather?.windSpeed);
  const tempResult = getTempScore(weather?.tempC);
  const tideResult = getTideScore(tideData);

  const factors: BiteFactor[] = [
    {
      name: '시간대',
      icon: 'schedule',
      score: timeResult.score,
      status: timeResult.score >= 15 ? 'positive' : timeResult.score >= 10 ? 'neutral' : 'negative',
      description: timeResult.description,
    },
    {
      name: '물때',
      icon: 'waves',
      score: tideResult.score,
      status: tideResult.status,
      description: tideResult.description,
    },
    {
      name: '바람',
      icon: 'air',
      score: windResult.score,
      status: windResult.status,
      description: windResult.description,
    },
    {
      name: '기온',
      icon: 'thermostat',
      score: tempResult.score,
      status: tempResult.status,
      description: tempResult.description,
    },
  ];

  // Total score (max 25 each × 4 factors = max ~90, then normalize to 0-100)
  const rawScore = timeResult.score + windResult.score + tempResult.score + tideResult.score;
  const score = Math.min(100, Math.round((rawScore / 90) * 100));
  const { grade, gradeLabel, gradeEmoji } = getGrade(score);

  return { score, grade, gradeLabel, gradeEmoji, factors };
}
