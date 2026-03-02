import { CatchRecord } from '@/types';

export interface AchievementBadge {
  id: string;
  icon: string;         // Material Symbol name
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  earned: boolean;
  progress: number;     // 0~1
  requirement: number;
  current: number;
}

const BADGE_DEFS = [
  {
    id: 'first-catch',
    icon: 'stars',
    name: { ko: '첫 조과', en: 'First Catch' },
    desc: { ko: '첫 번째 조과를 기록하세요', en: 'Record your first catch' },
    check: (r: CatchRecord[]) => ({ current: Math.min(r.length, 1), requirement: 1 }),
  },
  {
    id: 'catch-10',
    icon: 'military_tech',
    name: { ko: '10마리 돌파', en: '10 Fish Club' },
    desc: { ko: '총 10마리 이상 조과', en: 'Catch 10 or more fish total' },
    check: (r: CatchRecord[]) => {
      const total = r.reduce((s, c) => s + c.count, 0);
      return { current: Math.min(total, 10), requirement: 10 };
    },
  },
  {
    id: 'catch-50',
    icon: 'emoji_events',
    name: { ko: '50마리 클럽', en: '50 Fish Club' },
    desc: { ko: '총 50마리 이상 조과', en: 'Catch 50 or more fish total' },
    check: (r: CatchRecord[]) => {
      const total = r.reduce((s, c) => s + c.count, 0);
      return { current: Math.min(total, 50), requirement: 50 };
    },
  },
  {
    id: 'catch-100',
    icon: 'workspace_premium',
    name: { ko: '100마리 전설', en: 'Century Fisher' },
    desc: { ko: '총 100마리 이상 조과', en: 'Catch 100 or more fish total' },
    check: (r: CatchRecord[]) => {
      const total = r.reduce((s, c) => s + c.count, 0);
      return { current: Math.min(total, 100), requirement: 100 };
    },
  },
  {
    id: 'big-fish-40',
    icon: 'phishing',
    name: { ko: '40cm 대어', en: '40cm Trophy' },
    desc: { ko: '40cm 이상 물고기를 잡으세요', en: 'Catch a fish 40cm or bigger' },
    check: (r: CatchRecord[]) => {
      const max = r.reduce((m, c) => Math.max(m, c.sizeCm ?? 0), 0);
      return { current: max >= 40 ? 1 : 0, requirement: 1 };
    },
  },
  {
    id: 'big-fish-60',
    icon: 'trophy',
    name: { ko: '60cm 대물', en: '60cm Monster' },
    desc: { ko: '60cm 이상의 대물을 기록하세요', en: 'Record a 60cm+ monster fish' },
    check: (r: CatchRecord[]) => {
      const max = r.reduce((m, c) => Math.max(m, c.sizeCm ?? 0), 0);
      return { current: max >= 60 ? 1 : 0, requirement: 1 };
    },
  },
  {
    id: 'variety-5',
    icon: 'diversity_3',
    name: { ko: '다양한 어종', en: 'Variety Fisher' },
    desc: { ko: '5종류 이상의 어종을 잡으세요', en: 'Catch 5 or more different species' },
    check: (r: CatchRecord[]) => {
      const species = new Set(r.map((c) => c.species));
      return { current: Math.min(species.size, 5), requirement: 5 };
    },
  },
  {
    id: 'trips-10',
    icon: 'sailing',
    name: { ko: '10회 출조', en: '10 Trips' },
    desc: { ko: '10번 이상 출조하세요', en: 'Go on 10 or more fishing trips' },
    check: (r: CatchRecord[]) => {
      const dates = new Set(r.map((c) => c.date));
      return { current: Math.min(dates.size, 10), requirement: 10 };
    },
  },
  {
    id: 'spots-5',
    icon: 'explore',
    name: { ko: '탐험가', en: 'Explorer' },
    desc: { ko: '5곳 이상의 포인트를 방문하세요', en: 'Fish at 5 or more different spots' },
    check: (r: CatchRecord[]) => {
      const spots = new Set(r.map((c) => c.location.name));
      return { current: Math.min(spots.size, 5), requirement: 5 };
    },
  },
  {
    id: 'ai-master',
    icon: 'smart_toy',
    name: { ko: 'AI 마스터', en: 'AI Master' },
    desc: { ko: 'AI 어종 인식을 10회 사용하세요', en: 'Use AI fish recognition 10 times' },
    check: (r: CatchRecord[]) => {
      const aiUsed = r.filter(c => c.memo?.includes('AI') || c.memo?.includes('ai')).length;
      return { current: Math.min(aiUsed, 10), requirement: 10 };
    },
  },
  {
    id: 'night-fisher',
    icon: 'dark_mode',
    name: { ko: '야간 조사', en: 'Night Fisher' },
    desc: { ko: '야간(20시~05시)에 5회 기록하세요', en: 'Record 5 catches at night' },
    check: (r: CatchRecord[]) => {
      const nightCatches = r.filter(c => {
        const hour = new Date(c.createdAt).getHours();
        return hour >= 20 || hour < 5;
      }).length;
      return { current: Math.min(nightCatches, 5), requirement: 5 };
    },
  },
  {
    id: 'streak-7',
    icon: 'local_fire_department',
    name: { ko: '7일 연속 출조', en: '7-Day Streak' },
    desc: { ko: '7일 연속으로 출조하세요', en: 'Fish 7 days in a row' },
    check: (r: CatchRecord[]) => {
      const dates = [...new Set(r.map(c => c.date))].sort();
      let maxStreak = 1, streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else { streak = 1; }
      }
      if (dates.length <= 1) maxStreak = dates.length;
      return { current: Math.min(maxStreak, 7), requirement: 7 };
    },
  },
  {
    id: 'five-seas',
    icon: 'public',
    name: { ko: '전국 바다 정복', en: 'Five Seas' },
    desc: { ko: '동해·서해·남해·제주 4개 해역 정복', en: 'Fish in all 4 sea regions' },
    check: (r: CatchRecord[]) => {
      const regions = new Set<string>();
      const regionMap: Record<string, string[]> = {
        east: ['동해', '속초', '강릉', '삼척', '울진', '포항'],
        west: ['서해', '인천', '태안', '보령', '군산', '영광'],
        south: ['남해', '통영', '거제', '여수', '완도', '사천'],
        jeju: ['제주', '서귀포'],
      };
      r.forEach(c => {
        const loc = c.location.name;
        for (const [region, keywords] of Object.entries(regionMap)) {
          if (keywords.some(kw => loc.includes(kw))) regions.add(region);
        }
      });
      return { current: Math.min(regions.size, 4), requirement: 4 };
    },
  },
  {
    id: 'photo-master',
    icon: 'photo_camera',
    name: { ko: '인증샷 마스터', en: 'Photo Master' },
    desc: { ko: '사진이 포함된 기록 20개 달성', en: 'Record 20 catches with photos' },
    check: (r: CatchRecord[]) => {
      const withPhotos = r.filter(c => c.photos && c.photos.length > 0).length;
      return { current: Math.min(withPhotos, 20), requirement: 20 };
    },
  },
  {
    id: 'season-all',
    icon: 'calendar_month',
    name: { ko: '사계절 낚시꾼', en: 'All-Season Fisher' },
    desc: { ko: '봄·여름·가을·겨울 모두 출조하세요', en: 'Fish in all 4 seasons' },
    check: (r: CatchRecord[]) => {
      const seasons = new Set<string>();
      r.forEach(c => {
        const month = new Date(c.date).getMonth() + 1;
        if (month >= 3 && month <= 5) seasons.add('spring');
        else if (month >= 6 && month <= 8) seasons.add('summer');
        else if (month >= 9 && month <= 11) seasons.add('fall');
        else seasons.add('winter');
      });
      return { current: Math.min(seasons.size, 4), requirement: 4 };
    },
  },
] as const;

export function computeBadges(records: CatchRecord[]): AchievementBadge[] {
  return BADGE_DEFS.map((def) => {
    const { current, requirement } = def.check(records);
    return {
      id: def.id,
      icon: def.icon,
      name: def.name,
      description: def.desc,
      earned: current >= requirement,
      progress: Math.min(current / requirement, 1),
      requirement,
      current,
    };
  });
}
