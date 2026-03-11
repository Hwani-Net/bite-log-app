import { WeatherData } from './weatherService';
import { TideData, getCurrentPhase } from './tideService';
import { MarineData } from './marineService';
import { getLunarInfo, LunarInfo } from './lunarService';

export interface BiteTimePrediction {
  score: number; // 0-100
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  gradeLabel: string;
  gradeEmoji: string;
  factors: BiteFactor[];
  currentPhaseLabel?: string; // e.g. "들물 3물"
  currentStrengthLabel?: string; // e.g. "유속 강"
  lunarInfo?: LunarInfo;
  seaSurfaceTemp?: number; // °C
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
    return { score: 20, description: '새벽 매직아워 — 최고의 입질 시간대' };
  }
  // Dusk magic hour: 17-20
  if (hour >= 17 && hour <= 20) {
    return { score: 18, description: '해질녘 매직아워 — 활발한 입질' };
  }
  // Night fishing: 21-3
  if (hour >= 21 || hour <= 3) {
    return { score: 10, description: '야간 — 어종에 따라 활동' };
  }
  // Midday: 11-15
  if (hour >= 11 && hour <= 15) {
    return { score: 4, description: '한낮 — 입질 약한 시간대' };
  }
  // Morning/afternoon transition
  return { score: 12, description: '오전/오후 — 보통 활동' };
}

// Wind factor (max 15)
function getWindScore(windSpeed?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (windSpeed === undefined) return { score: 8, status: 'neutral', description: '바람 정보 없음' };
  
  if (windSpeed <= 3) return { score: 15, status: 'positive', description: `미풍 ${windSpeed}m/s — 안정적인 조건` };
  if (windSpeed <= 6) return { score: 12, status: 'positive', description: `약풍 ${windSpeed}m/s — 적당한 먹이활동 유도` };
  if (windSpeed <= 10) return { score: 7, status: 'neutral', description: `보통바람 ${windSpeed}m/s — 채비 조절 필요` };
  return { score: 2, status: 'negative', description: `강풍 ${windSpeed}m/s — 낚시 어려움` };
}

// Sea Surface Temperature factor (max 20) — THE KEY FACTOR
function getSSTScore(sst?: number, airTemp?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  // Use SST if available and realistic, otherwise fall back to air temp
  // SST of exactly 0 is unreliable (often returned for land-locked coordinates)
  const hasSst = sst !== undefined && sst > 0;
  const temp = hasSst ? sst : airTemp;
  const source = hasSst ? '수온' : '기온(추정)';
  
  if (temp === undefined || temp === 0) return { score: 8, status: 'neutral', description: '수온 정보 없음' };

  if (temp >= 14 && temp <= 22) return { score: 20, status: 'positive', description: `${source} ${temp}°C — 최적 활동 수온대` };
  if (temp >= 10 && temp < 14) return { score: 16, status: 'positive', description: `${source} ${temp}°C — 볼락·우럭 적합` };
  if (temp >= 22 && temp <= 26) return { score: 14, status: 'neutral', description: `${source} ${temp}°C — 고수온, 심층 이동 가능` };
  if (temp >= 7 && temp < 10) return { score: 10, status: 'neutral', description: `${source} ${temp}°C — 저수온, 낮 입질 저조` };
  if (temp > 26) return { score: 6, status: 'negative', description: `${source} ${temp}°C — 고수온 스트레스` };
  if (temp < 7) return { score: 4, status: 'negative', description: `${source} ${temp}°C — 극저수온, 활동 극히 저조` };
  return { score: 10, status: 'neutral', description: `${source} ${temp}°C — 보통` };
}

// Tide + Current factor — uses real ocean_current_velocity if available, falls back to "몇 물" estimate (max 20)
function getTideScore(tideData?: TideData | null, currentVelocity?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  const phase = tideData ? getCurrentPhase(tideData) : null;

  // If we have real measured current velocity (from Open-Meteo Marine API)
  if (currentVelocity !== undefined) {
    const phaseLabel = phase ? `${phase.label} · ` : '';
    // 0.3~0.8 m/s is ideal for fishing (moderate current = active feeding)
    if (currentVelocity >= 0.3 && currentVelocity <= 0.8) {
      return { score: 20, status: 'positive', description: `${phaseLabel}유속 ${currentVelocity}m/s — 최적 조류, 입질 활발` };
    }
    if (currentVelocity > 0.8 && currentVelocity <= 1.2) {
      return { score: 16, status: 'positive', description: `${phaseLabel}유속 ${currentVelocity}m/s — 강한 조류, 무거운 채비 추천` };
    }
    if (currentVelocity > 0.1 && currentVelocity < 0.3) {
      return { score: 10, status: 'neutral', description: `${phaseLabel}유속 ${currentVelocity}m/s — 약한 조류` };
    }
    if (currentVelocity > 1.2) {
      return { score: 6, status: 'negative', description: `${phaseLabel}유속 ${currentVelocity}m/s — 매우 강함, 채비 컨트롤 어려움` };
    }
    // Very slow (< 0.1) = slack
    return { score: 4, status: 'negative', description: `${phaseLabel}유속 ${currentVelocity}m/s — 정조, 물 멈춤` };
  }

  // Fallback: estimate from tide phase ("몇 물" system)
  if (!tideData || tideData.tides.length === 0 || !phase) {
    return { score: 8, status: 'neutral', description: '물때 정보 없음' };
  }

  const scoreMap: Record<string, { score: number; status: 'positive' | 'neutral' | 'negative' }> = {
    'peak':     { score: 20, status: 'positive' },
    'strong':   { score: 17, status: 'positive' },
    'moderate': { score: 12, status: 'neutral' },
    'weak':     { score: 6,  status: 'neutral' },
    'slack':    { score: 3,  status: 'negative' },
  };

  const s = scoreMap[phase.strength] || { score: 8, status: 'neutral' as const };
  return {
    score: s.score,
    status: s.status,
    description: `${phase.label} · ${phase.strengthLabel} (추정)`,
  };
}

// Atmospheric pressure factor (max 15) — pressure DROP = fish bite MORE
function getPressureScore(pressureMsl?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (pressureMsl === undefined) return { score: 7, status: 'neutral', description: '기압 정보 없음' };

  // Ideal range for fishing: 1005~1015 hPa (slightly below normal = active feeding)
  // Normal: ~1013 hPa
  if (pressureMsl >= 1000 && pressureMsl <= 1010) {
    return { score: 15, status: 'positive', description: `${pressureMsl}hPa — 저기압 접근, 입질 활성화!` };
  }
  if (pressureMsl > 1010 && pressureMsl <= 1018) {
    return { score: 12, status: 'positive', description: `${pressureMsl}hPa — 표준 기압, 안정적 조건` };
  }
  if (pressureMsl > 1018 && pressureMsl <= 1025) {
    return { score: 8, status: 'neutral', description: `${pressureMsl}hPa — 고기압, 맑고 안정 (입질 보통)` };
  }
  if (pressureMsl > 1025) {
    return { score: 5, status: 'negative', description: `${pressureMsl}hPa — 강한 고기압, 입질 저조 경향` };
  }
  // Very low pressure (< 1000): storm approaching
  return { score: 4, status: 'negative', description: `${pressureMsl}hPa — 저기압 강하, 악천후 주의` };
}

// Wave height factor (max 10) — safety + fishing condition
function getWaveScore(waveHeight?: number): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (waveHeight === undefined || isNaN(waveHeight)) return { score: 5, status: 'neutral', description: '파고 정보 없음' };

  if (waveHeight <= 0.5) return { score: 10, status: 'positive', description: `파고 ${waveHeight}m — 잔잔, 최적 조건` };
  if (waveHeight <= 1.0) return { score: 8, status: 'positive', description: `파고 ${waveHeight}m — 약한 파도, 양호` };
  if (waveHeight <= 1.5) return { score: 6, status: 'neutral', description: `파고 ${waveHeight}m — 보통, 선상낚시 주의` };
  if (waveHeight <= 2.5) return { score: 3, status: 'negative', description: `파고 ${waveHeight}m — 높은 파도, 출조 재고` };
  return { score: 1, status: 'negative', description: `파고 ${waveHeight}m — 위험, 출조 금지 권장` };
}

// Lunar phase factor (max 10) — 사리/조금
function getLunarScore(lunar: LunarInfo): { score: number; status: 'positive' | 'neutral' | 'negative'; description: string } {
  switch (lunar.fishingImpact) {
    case 'excellent':
      return { score: 10, status: 'positive', description: `${lunar.phaseEmoji} ${lunar.phaseName} — ${lunar.description}` };
    case 'good':
      return { score: 7, status: 'positive', description: `${lunar.phaseEmoji} ${lunar.phaseName} — ${lunar.description}` };
    case 'fair':
      return { score: 4, status: 'neutral', description: `${lunar.phaseEmoji} ${lunar.phaseName} — ${lunar.description}` };
    case 'poor':
      return { score: 2, status: 'negative', description: `${lunar.phaseEmoji} ${lunar.phaseName} — ${lunar.description}` };
  }
}

function getGrade(score: number): { grade: BiteTimePrediction['grade']; gradeLabel: string; gradeEmoji: string } {
  if (score >= 75) return { grade: 'excellent', gradeLabel: '최고의 타이밍!', gradeEmoji: '🟢' };
  if (score >= 55) return { grade: 'good', gradeLabel: '좋은 조건', gradeEmoji: '🔵' };
  if (score >= 35) return { grade: 'fair', gradeLabel: '보통', gradeEmoji: '🟡' };
  return { grade: 'poor', gradeLabel: '아쉬운 조건', gradeEmoji: '🔴' };
}

export function calculateBiteTime(
  weather: WeatherData | null,
  tideData: TideData | null,
  marine?: MarineData | null,
): BiteTimePrediction {
  const lunar = getLunarInfo();
  const timeResult = getMagicHourScore();
  // SST of 0 is unreliable (land coordinates) — skip it and let airTemp fallback work
  const reliableSST = marine?.seaSurfaceTemp && marine.seaSurfaceTemp > 0 ? marine.seaSurfaceTemp : undefined;
  const sstResult = getSSTScore(reliableSST, weather?.tempC);
  const tideResult = getTideScore(tideData, marine?.currentVelocity);
  const windResult = getWindScore(weather?.windSpeed);
  const pressureResult = getPressureScore(weather?.pressureMsl);
  const waveResult = getWaveScore(marine?.waveHeight);
  const lunarResult = getLunarScore(lunar);
  const phase = getCurrentPhase(tideData);

  const factors: BiteFactor[] = [
    {
      name: reliableSST !== undefined ? `수온 ${reliableSST}°C` : (weather?.tempC !== undefined ? `수온(기온추정)` : '수온'),
      icon: 'thermostat',
      score: sstResult.score,
      status: sstResult.status,
      description: sstResult.description,
    },
    {
      name: phase?.label || '물 세기',
      icon: 'waves',
      score: tideResult.score,
      status: tideResult.status,
      description: tideResult.description,
    },
    {
      name: '시간대',
      icon: 'schedule',
      score: timeResult.score,
      status: timeResult.score >= 12 ? 'positive' : timeResult.score >= 8 ? 'neutral' : 'negative',
      description: timeResult.description,
    },
    {
      name: '기압',
      icon: 'speed',
      score: pressureResult.score,
      status: pressureResult.status,
      description: pressureResult.description,
    },
    {
      name: '바람',
      icon: 'air',
      score: windResult.score,
      status: windResult.status,
      description: windResult.description,
    },
    {
      name: lunar.phaseName,
      icon: 'dark_mode',
      score: lunarResult.score,
      status: lunarResult.status,
      description: lunarResult.description,
    },
    {
      name: '파고',
      icon: 'tsunami',
      score: waveResult.score,
      status: waveResult.status,
      description: waveResult.description,
    },
  ];

  // Total: max = 20(time) + 20(SST) + 20(tide) + 15(wind) + 15(pressure) + 10(lunar) + 10(wave) = 110
  // Normalize to 0-100
  const rawScore = timeResult.score + sstResult.score + tideResult.score +
    windResult.score + pressureResult.score + lunarResult.score + waveResult.score;
  const score = Math.min(100, Math.round((rawScore / 110) * 100));
  const { grade, gradeLabel, gradeEmoji } = getGrade(score);

  return {
    score, grade, gradeLabel, gradeEmoji, factors,
    currentPhaseLabel: phase?.label,
    currentStrengthLabel: phase?.strengthLabel,
    lunarInfo: lunar,
    seaSurfaceTemp: reliableSST ?? undefined,
  };
}

// ─── Peak Fishing Timeline ──────────────────────────────────────

export interface TimelineSlot {
  hour: number;          // 0-23
  label: string;         // "00:00"
  score: number;         // 0-100 bite score for this hour
  grade: 'peak' | 'good' | 'fair' | 'low'; 
  tags: string[];        // e.g. ["🌅 매직아워", "🌊 들물3물"]
  isMagicHour: boolean;
  isTidePeak: boolean;
  isGoldenTime: boolean; // magic + tide overlap
}

/**
 * Generate 24-hour timeline with per-hour bite scores
 * Combines: magic hour windows + tide peak windows (2-3h before high tide)
 */
export function getPeakFishingWindows(tideData: TideData | null): TimelineSlot[] {
  const slots: TimelineSlot[] = [];

  // --- Magic Hour Ranges ---
  const MAGIC_DAWN = { start: 4, end: 7 };    // 04:00~07:59
  const MAGIC_DUSK = { start: 17, end: 20 };   // 17:00~20:59
  const NIGHT      = { start: 21, end: 3 };    // 21:00~03:59

  // --- Build tide peak hours (들물 3-4물 = 1~3h before high tide) ---
  const tidePeakHours = new Set<number>();
  if (tideData?.tides) {
    for (const tide of tideData.tides) {
      if (tide.type === 'High') {
        const [h] = tide.time.split(':').map(Number);
        // 들물 3-4물 is roughly 1-3 hours before high tide
        for (let offset = 1; offset <= 3; offset++) {
          tidePeakHours.add((h - offset + 24) % 24);
        }
      }
    }
  }

  for (let hour = 0; hour < 24; hour++) {
    let score = 0;
    const tags: string[] = [];
    let isMagicHour = false;
    let isTidePeak = false;

    // Magic hour score
    if (hour >= MAGIC_DAWN.start && hour <= MAGIC_DAWN.end) {
      score += 40;
      tags.push('🌅 새벽 매직아워');
      isMagicHour = true;
    } else if (hour >= MAGIC_DUSK.start && hour <= MAGIC_DUSK.end) {
      score += 35;
      tags.push('🌇 해질녘 매직아워');
      isMagicHour = true;
    } else if (hour >= NIGHT.start || hour <= NIGHT.end) {
      score += 15; // night has some value
      tags.push('🌙 야간');
    } else if (hour >= 8 && hour <= 10) {
      score += 20; // morning transition
      tags.push('☀️ 오전');
    } else if (hour >= 11 && hour <= 15) {
      score += 5; // midday low
      tags.push('☀️ 한낮');
    } else {
      score += 18; // afternoon transition
      tags.push('🌤️ 오후');
    }

    // Tide peak score
    if (tidePeakHours.has(hour)) {
      score += 45;
      tags.push('🌊 들물 피크');
      isTidePeak = true;
    } else if (tideData?.tides) {
      // Check if it's near a low tide (slack) = bad
      const isNearLowTide = tideData.tides.some(t => {
        if (t.type !== 'Low') return false;
        const [h] = t.time.split(':').map(Number);
        return Math.abs(h - hour) <= 1 || Math.abs(h - hour) >= 23;
      });
      if (isNearLowTide) {
        score += 5;
        tags.push('⏸️ 정조');
      } else {
        score += 15; // moderate tide activity
      }
    } else {
      score += 10; // no tide data
    }

    // Cap at 100
    score = Math.min(100, score);

    const isGoldenTime = isMagicHour && isTidePeak;
    if (isGoldenTime) {
      tags.unshift('⭐ 골든타임');
    }

    let grade: TimelineSlot['grade'];
    if (score >= 70) grade = 'peak';
    else if (score >= 50) grade = 'good';
    else if (score >= 30) grade = 'fair';
    else grade = 'low';

    slots.push({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      score,
      grade,
      tags,
      isMagicHour,
      isTidePeak,
      isGoldenTime,
    });
  }

  return slots;
}
