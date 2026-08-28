// 어종별 그라디언트 — 홈과 기록 목록에 값까지 같은 맵이 두 벌 복제돼
// 있던 것을 한 곳으로(4차 GOAL-1). FISH_SPECIES 전 어종을 커버하고,
// 목록 밖 어종(자유 입력)은 슬레이트 폴백 — 색이 없어서 UI가 깨지는
// 어종은 존재할 수 없다.
import { FISH_SPECIES } from "@/types";

export const DEFAULT_FISH_GRADIENT = "from-slate-400 to-slate-300";

const FISH_GRADIENTS: Record<(typeof FISH_SPECIES)[number], string> = {
  농어: "from-blue-500 to-cyan-400",
  우럭: "from-amber-500 to-orange-400",
  참돔: "from-rose-400 to-pink-300",
  감성돔: "from-violet-500 to-purple-400",
  볼락: "from-emerald-500 to-green-400",
  광어: "from-yellow-400 to-amber-300",
  고등어: "from-indigo-500 to-blue-400",
  방어: "from-sky-500 to-cyan-400",
  주꾸미: "from-red-400 to-orange-300",
  숭어: "from-teal-500 to-emerald-400",
  전갱이: "from-cyan-500 to-sky-400",
  학꽁치: "from-lime-500 to-green-300",
  갑오징어: "from-fuchsia-500 to-pink-400",
  기타: DEFAULT_FISH_GRADIENT,
};

export function fishGradient(species: string): string {
  return (
    FISH_GRADIENTS[species as (typeof FISH_SPECIES)[number]] ??
    DEFAULT_FISH_GRADIENT
  );
}
