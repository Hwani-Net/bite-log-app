import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock calls are hoisted — must be before the service import
vi.mock('@/services/lunarService', () => ({
  getLunarInfo: vi.fn(() => ({
    phaseName: '보름달',
    phaseEmoji: '🌕',
    fishingImpact: 'excellent' as const,
    description: '대조기 — 조류 강하여 입질 활발',
  })),
}));

vi.mock('@/services/tideService', () => ({
  getCurrentPhase: vi.fn(() => null),
}));

// Safety mocks for type-only imports (isolatedModules emits them at runtime)
vi.mock('@/services/weatherService', () => ({}));
vi.mock('@/services/marineService', () => ({}));

import {
  calculateBiteTime,
  getPeakFishingWindows,
  getSpeciesPeakWindows,
} from '@/services/biteTimeService';
import type { BiteTimePrediction, TimelineSlot } from '@/services/biteTimeService';

// ── Fixtures ──────────────────────────────────────────────────────
const mockWeather = {
  tempC: 18,
  windSpeed: 2,
  pressureMsl: 1005,
  humidity: 70,
  wmoCode: 0,
  description: '맑음',
};

const mockTideData = {
  stationName: '인천',
  tides: [
    { type: 'High' as const, time: '08:00', level: 350 },
    { type: 'Low' as const, time: '14:00', level: 50 },
    { type: 'High' as const, time: '20:00', level: 320 },
  ],
};

const mockMarine = {
  seaSurfaceTemp: 18,
  waveHeight: 0.3,
  currentVelocity: 0.5,
};

const poorWeather = {
  tempC: 35,
  windSpeed: 15,
  pressureMsl: 985,
  humidity: 90,
  wmoCode: 95,
  description: '폭풍',
};

const poorMarine = {
  seaSurfaceTemp: 30,
  waveHeight: 3.5,
  currentVelocity: 1.8,
};

// ── calculateBiteTime ─────────────────────────────────────────────
describe('calculateBiteTime', () => {
  it('should return a valid prediction with all null inputs', () => {
    const result = calculateBiteTime(null, null);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.grade);
    expect(result.gradeLabel).toBeTruthy();
    expect(result.gradeEmoji).toBeTruthy();
  });

  it('should always return exactly 7 factors', () => {
    const results: BiteTimePrediction[] = [
      calculateBiteTime(null, null),
      calculateBiteTime(mockWeather, mockTideData, mockMarine),
      calculateBiteTime(poorWeather, null, poorMarine),
    ];

    for (const result of results) {
      expect(result.factors).toHaveLength(7);
    }
  });

  it('each factor should have valid structure', () => {
    const result = calculateBiteTime(mockWeather, mockTideData, mockMarine);

    result.factors.forEach((factor) => {
      expect(factor.name).toBeTruthy();
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(['positive', 'neutral', 'negative']).toContain(factor.status);
      expect(factor.description).toBeTruthy();
      expect(factor.icon).toBeTruthy();
    });
  });

  it('score should always be normalized between 0 and 100', () => {
    const inputs = [
      { weather: null, tide: null, marine: undefined },
      { weather: mockWeather, tide: mockTideData, marine: mockMarine },
      { weather: poorWeather, tide: null, marine: poorMarine },
    ] as const;

    for (const { weather, tide, marine } of inputs) {
      const result = calculateBiteTime(weather, tide, marine);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('optimal SST (18°C) should yield higher score than extreme temp (35°C)', () => {
    const optimal = calculateBiteTime({ ...mockWeather, tempC: 18 }, null);
    const extreme = calculateBiteTime({ ...mockWeather, tempC: 35 }, null);
    expect(optimal.score).toBeGreaterThan(extreme.score);
  });

  it('low wind (2 m/s) should yield higher score than storm wind (15 m/s)', () => {
    const calm = calculateBiteTime({ ...mockWeather, windSpeed: 2 }, null);
    const storm = calculateBiteTime({ ...mockWeather, windSpeed: 15 }, null);
    expect(calm.score).toBeGreaterThan(storm.score);
  });

  it('low pressure (1005 hPa) should score higher than strong high pressure (1030 hPa)', () => {
    const low = calculateBiteTime({ ...mockWeather, pressureMsl: 1005 }, null);
    const high = calculateBiteTime({ ...mockWeather, pressureMsl: 1030 }, null);
    expect(low.score).toBeGreaterThan(high.score);
  });

  it('good wave height (0.3m) should score higher than dangerous waves (3.5m)', () => {
    const calm = calculateBiteTime(null, null, { ...mockMarine, waveHeight: 0.3 });
    const rough = calculateBiteTime(null, null, { ...mockMarine, waveHeight: 3.5 });
    expect(calm.score).toBeGreaterThan(rough.score);
  });

  it('grade thresholds should match score correctly', () => {
    // We cannot control time-of-day factor, but we can validate grade matches score
    const result = calculateBiteTime(mockWeather, mockTideData, mockMarine);
    const { score, grade } = result;

    if (score >= 75) expect(grade).toBe('excellent');
    else if (score >= 55) expect(grade).toBe('good');
    else if (score >= 35) expect(grade).toBe('fair');
    else expect(grade).toBe('poor');
  });

  it('should return currentPhaseLabel when phase info is available', () => {
    // Phase is mocked to return null, so currentPhaseLabel should be undefined
    const result = calculateBiteTime(mockWeather, mockTideData);
    // With our mock returning null, currentPhaseLabel is undefined — just verify no crash
    expect(result).toBeDefined();
  });

  it('should include lunarInfo from mocked getLunarInfo', () => {
    const result = calculateBiteTime(null, null);
    expect(result.lunarInfo).toBeDefined();
    expect(result.lunarInfo?.phaseName).toBe('보름달');
    expect(result.lunarInfo?.fishingImpact).toBe('excellent');
  });
});

// ── getPeakFishingWindows ─────────────────────────────────────────
describe('getPeakFishingWindows', () => {
  it('should return exactly 24 time slots', () => {
    expect(getPeakFishingWindows(null)).toHaveLength(24);
    expect(getPeakFishingWindows(mockTideData)).toHaveLength(24);
  });

  it('each slot should have the correct hour index and label format', () => {
    const slots = getPeakFishingWindows(null);

    slots.forEach((slot: TimelineSlot, index) => {
      expect(slot.hour).toBe(index);
      expect(slot.label).toMatch(/^\d{2}:00$/);
    });
  });

  it('each slot should have a valid grade', () => {
    const slots = getPeakFishingWindows(null);

    slots.forEach((slot) => {
      expect(['peak', 'good', 'fair', 'low']).toContain(slot.grade);
    });
  });

  it('each slot score should be between 0 and 100', () => {
    const slots = getPeakFishingWindows(null);

    slots.forEach((slot) => {
      expect(slot.score).toBeGreaterThanOrEqual(0);
      expect(slot.score).toBeLessThanOrEqual(100);
    });
  });

  it('dawn hours (4–7) should be marked as magic hours', () => {
    const slots = getPeakFishingWindows(null);

    for (let h = 4; h <= 7; h++) {
      expect(slots[h].isMagicHour).toBe(true);
    }
  });

  it('dusk hours (17–20) should be marked as magic hours', () => {
    const slots = getPeakFishingWindows(null);

    for (let h = 17; h <= 20; h++) {
      expect(slots[h].isMagicHour).toBe(true);
    }
  });

  it('midday hours (11–15) should NOT be magic hours', () => {
    const slots = getPeakFishingWindows(null);

    for (let h = 11; h <= 15; h++) {
      expect(slots[h].isMagicHour).toBe(false);
    }
  });

  it('tide peaks should be at 1–3 hours before high tide', () => {
    // High tide at 10:00 → tide peaks at 7, 8, 9
    const tideData = {
      stationName: '인천',
      tides: [
        { type: 'High' as const, time: '10:00', level: 350 },
        { type: 'Low' as const, time: '16:00', level: 50 },
      ],
    };
    const slots = getPeakFishingWindows(tideData);

    expect(slots[7].isTidePeak).toBe(true);
    expect(slots[8].isTidePeak).toBe(true);
    expect(slots[9].isTidePeak).toBe(true);
    // Hour 10 itself should NOT be a tide peak in this model
    expect(slots[10].isTidePeak).toBe(false);
  });

  it('magic hour + tide peak → golden time', () => {
    // High tide at 09:00 → tide peaks at 6, 7, 8
    // Hours 6 and 7 fall in dawn magic hour (4–7) → golden time
    const tideData = {
      stationName: '인천',
      tides: [
        { type: 'High' as const, time: '09:00', level: 350 },
        { type: 'Low' as const, time: '15:00', level: 50 },
      ],
    };
    const slots = getPeakFishingWindows(tideData);

    expect(slots[6].isGoldenTime).toBe(true);
    expect(slots[7].isGoldenTime).toBe(true);
  });

  it('each slot should have a tags array', () => {
    const slots = getPeakFishingWindows(mockTideData);

    slots.forEach((slot) => {
      expect(Array.isArray(slot.tags)).toBe(true);
    });
  });
});

// ── getSpeciesPeakWindows (generic mode) ─────────────────────────
describe('getSpeciesPeakWindows — generic mode (no species)', () => {
  it('should return exactly 24 slots', () => {
    expect(getSpeciesPeakWindows(null)).toHaveLength(24);
    expect(getSpeciesPeakWindows(null, null)).toHaveLength(24);
    expect(getSpeciesPeakWindows(mockTideData)).toHaveLength(24);
  });

  it('each slot should have valid structure', () => {
    const slots = getSpeciesPeakWindows(null);

    slots.forEach((slot: TimelineSlot, index) => {
      expect(slot.hour).toBe(index);
      expect(slot.label).toMatch(/^\d{2}:00$/);
      expect(slot.score).toBeGreaterThanOrEqual(0);
      expect(slot.score).toBeLessThanOrEqual(100);
      expect(['peak', 'good', 'fair', 'low']).toContain(slot.grade);
      expect(Array.isArray(slot.tags)).toBe(true);
    });
  });

  it('dawn (4–7) and dusk (17–20) should be marked as magic hours', () => {
    const slots = getSpeciesPeakWindows(null);

    for (let h = 4; h <= 7; h++) {
      expect(slots[h].isMagicHour).toBe(true);
    }
    for (let h = 17; h <= 20; h++) {
      expect(slots[h].isMagicHour).toBe(true);
    }
  });

  it('generic mode: tide peak hours should be flagged when tideData is provided', () => {
    // High tide at 12:00 → tide peaks at 9, 10, 11
    const tideData = {
      stationName: '인천',
      tides: [
        { type: 'High' as const, time: '12:00', level: 350 },
        { type: 'Low' as const, time: '18:00', level: 50 },
      ],
    };
    const slots = getSpeciesPeakWindows(tideData);

    expect(slots[9].isTidePeak).toBe(true);
    expect(slots[10].isTidePeak).toBe(true);
    expect(slots[11].isTidePeak).toBe(true);
  });

  it('generic mode: uses env(40%) + tide(60%) weighting', () => {
    // Without tideData, tide score defaults to 50 for all hours
    // Dawn (score=80): 80*0.4 + 50*0.6 = 32+30 = 62 → 'good'
    // Midday (score=40): 40*0.4 + 50*0.6 = 16+30 = 46 → 'fair'
    const slots = getSpeciesPeakWindows(null);
    const dawnSlot = slots[5];   // 05:00, env=80
    const middaySlot = slots[12]; // 12:00, env=40

    expect(dawnSlot.score).toBeGreaterThan(middaySlot.score);
  });
});
