import { FISH_SPECIES } from "@/types";

/**
 * "대상 어종 고르기" UI가 쓰는 목록 (trip-plan 출조 계획, alerts 오픈런 알림).
 *
 * 예전엔 이 파일과 alerts 페이지에 9종짜리 목록이 각각 손으로 적혀 있어서,
 * 기록 화면에서는 고를 수 있는 어종을 출조 계획에서는 못 고르는 상태였다
 * (2026-08-28 사용자 지적). 기록 어종(`FISH_SPECIES`)이 곧 이 앱이 다루는
 * 어종이므로 거기서 파생시킨다 — 한쪽만 늘어나는 일이 구조적으로 불가능해진다.
 *
 * '기타'는 자유 입력용 폴백이라 선택 칩에서는 뺀다.
 */
export const SPECIES_LIST: string[] = FISH_SPECIES.filter((s) => s !== "기타");
