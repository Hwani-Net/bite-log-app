"use client";

import { Lightbulb } from "lucide-react";

interface TipEntry {
  months: number[];
  tip: string;
}

const FISHING_TIPS: TipEntry[] = [
  {
    months: [3, 4, 5],
    tip: "봄철 감성돔은 새벽 물때 직후가 입질 피크입니다. 밑밥을 꾸준히 뿌려 포인트를 형성하세요.",
  },
  {
    months: [3, 4, 5],
    tip: "수온이 오르기 시작한 봄은 볼락 야간 루어 시즌입니다. LED 집어등이 효과적입니다.",
  },
  {
    months: [6, 7, 8],
    tip: "여름 갯바위는 새벽 2~6시가 황금 시간대입니다. 낮에는 수온이 높아 입질이 줄어듭니다.",
  },
  {
    months: [6, 7, 8],
    tip: "장마철에는 육수가 유입된 직후 농어·숭어 포인트가 형성됩니다.",
  },
  {
    months: [9, 10, 11],
    tip: "가을은 방어·부시리 지깅 최적기입니다. 수심 20~40m 중층을 공략하세요.",
  },
  {
    months: [9, 10, 11],
    tip: "갈치 배낚시 시즌입니다. 케미 야광 채비와 생미끼 조합이 마릿수에 유리합니다.",
  },
  {
    months: [12, 1, 2],
    tip: "겨울 우럭은 바닥 구조물 주변에 집중합니다. 메탈지그 느린 폴링이 효과적입니다.",
  },
  {
    months: [12, 1, 2],
    tip: "겨울 감성돔은 씨알이 굵습니다. 물때 맞춰 썰물 전후 1시간을 노리세요.",
  },
];

export default function DailyFishingTip() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const monthTips = FISHING_TIPS.filter((t) => t.months.includes(currentMonth));
  if (monthTips.length === 0) return null;

  const tip = monthTips[currentDay % monthTips.length];

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-3 flex items-start gap-3">
      <Lightbulb
        size={16}
        className="shrink-0 mt-0.5"
        color="#c9a84c"
        strokeWidth={1.5}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
          오늘의 낚시 팁
        </p>
        <p className="text-sm text-white/80 leading-relaxed">{tip.tip}</p>
      </div>
    </div>
  );
}
