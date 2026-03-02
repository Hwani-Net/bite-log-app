import {
  CatchRecord,
  DataService,
  UserStats,
  PeriodFilter,
} from '@/types';

const STORAGE_KEY = 'fishlog_catches';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getNow(): string {
  return new Date().toISOString();
}

function loadRecords(): CatchRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records: CatchRecord[] = raw ? JSON.parse(raw) : [];
    // Backward compatibility: default visibility to 'public' for old records
    return records.map(r => ({ ...r, visibility: r.visibility || 'public' }));
  } catch {
    return [];
  }
}

function saveRecords(records: CatchRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function filterByPeriod(records: CatchRecord[], period: PeriodFilter): CatchRecord[] {
  if (period === 'all') return records;
  const now = new Date();
  let cutoff: Date;
  switch (period) {
    case 'week':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    default:
      return records;
  }
  return records.filter((r) => new Date(r.date) >= cutoff);
}

function computeStats(records: CatchRecord[]): UserStats {
  const uniqueDates = new Set(records.map((r) => r.date));
  const totalTrips = uniqueDates.size;
  const totalCatch = records.reduce((sum, r) => sum + r.count, 0);
  const avgCatchPerTrip = totalTrips > 0 ? Math.round((totalCatch / totalTrips) * 10) / 10 : 0;
  const maxSizeCm = records.reduce((max, r) => Math.max(max, r.sizeCm ?? 0), 0);

  // Species breakdown
  const speciesMap = new Map<string, number>();
  records.forEach((r) => {
    speciesMap.set(r.species, (speciesMap.get(r.species) ?? 0) + r.count);
  });
  const speciesBreakdown = Array.from(speciesMap.entries())
    .map(([species, count]) => ({
      species,
      count,
      percentage: totalCatch > 0 ? Math.round((count / totalCatch) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend
  const monthMap = new Map<string, number>();
  records.forEach((r) => {
    const key = r.date.substring(0, 7); // YYYY-MM
    monthMap.set(key, (monthMap.get(key) ?? 0) + r.count);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, count]) => ({
      month,
      label: `${parseInt(month.split('-')[1])}월`,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Top spots
  const spotMap = new Map<string, { visits: Set<string>; totalCatch: number; spot: typeof records[0]['location'] }>();
  records.forEach((r) => {
    const key = r.location.name;
    if (!spotMap.has(key)) {
      spotMap.set(key, { visits: new Set(), totalCatch: 0, spot: r.location });
    }
    const entry = spotMap.get(key)!;
    entry.visits.add(r.date);
    entry.totalCatch += r.count;
  });
  const topSpots = Array.from(spotMap.values())
    .map((v) => ({ spot: v.spot, visits: v.visits.size, totalCatch: v.totalCatch }))
    .sort((a, b) => b.totalCatch - a.totalCatch)
    .slice(0, 5);

  return { totalTrips, totalCatch, avgCatchPerTrip, maxSizeCm, speciesBreakdown, monthlyTrend, topSpots };
}

export const localStorageService: DataService = {
  async getCatchRecords() {
    return loadRecords().sort((a, b) => b.date.localeCompare(a.date));
  },

  async getCatchRecord(id: string) {
    return loadRecords().find((r) => r.id === id) ?? null;
  },

  async addCatchRecord(data) {
    const records = loadRecords();
    const now = getNow();
    const record: CatchRecord = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      visibility: data.visibility || 'public',
    };
    records.push(record);
    saveRecords(records);
    return record;
  },

  async updateCatchRecord(id, data) {
    const records = loadRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Record not found');
    records[idx] = { ...records[idx], ...data, updatedAt: getNow() };
    saveRecords(records);
    return records[idx];
  },

  async deleteCatchRecord(id) {
    const records = loadRecords().filter((r) => r.id !== id);
    saveRecords(records);
  },

  async getUserStats(period: PeriodFilter = 'all') {
    const all = loadRecords();
    const filtered = filterByPeriod(all, period);
    return computeStats(filtered);
  },
};
