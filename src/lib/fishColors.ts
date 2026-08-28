// 어종별 그라디언트 — 홈과 기록 목록에 값까지 같은 맵이 두 벌 복제돼
// 있던 것을 한 곳으로(4차 GOAL-1). FISH_SPECIES 전 어종을 커버하고,
// 목록 밖 어종(자유 입력)은 슬레이트 폴백 — 색이 없어서 UI가 깨지는
// 어종은 존재할 수 없다.
import { FISH_SPECIES } from "@/types";

// 폴백 톤은 홈 쪽 값으로 통일(기록 목록의 옛 폴백은 slate-600/500로 더
// 어두웠다) — 목록 밖 자유 입력 어종에서만 쓰이는 희귀 경로라 페이지별
// 톤 분기를 유지할 가치가 없다(의도적 단순화).
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
  갈치: "from-slate-300 to-zinc-200",
  삼치: "from-blue-400 to-indigo-300",
  백조기: "from-amber-300 to-yellow-200",
  오징어: "from-pink-400 to-rose-300",
  한치: "from-purple-400 to-fuchsia-300",
  문어: "from-red-500 to-rose-400",
  낙지: "from-orange-500 to-amber-400",
  꽃게: "from-orange-600 to-red-400",
  노래미: "from-lime-600 to-yellow-500",
  열기: "from-rose-500 to-red-400",
  민어: "from-stone-400 to-amber-200",
  부시리: "from-sky-400 to-blue-300",
  도다리: "from-yellow-600 to-amber-500",
  가자미: "from-amber-600 to-orange-500",
  대구: "from-slate-500 to-gray-400",
  전어: "from-teal-400 to-cyan-300",
  붕장어: "from-neutral-500 to-stone-400",
  기타: DEFAULT_FISH_GRADIENT,
};

export function fishGradient(species: string): string {
  // 의도적 러프 캐스트 — 자유 입력 문자열이 흔히 들어오는 함수라 목록
  // 밖 키 조회가 정상 경로고, 그때의 진짜 방어선은 ?? 폴백이다.
  return (
    FISH_GRADIENTS[species as (typeof FISH_SPECIES)[number]] ??
    DEFAULT_FISH_GRADIENT
  );
}
