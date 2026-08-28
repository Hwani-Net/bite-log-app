// 4차 GOAL-3 — 조과 기록 전체 삭제(서비스 경유). 부분 실패를 삼키지
// 않고 진행 상황과 함께 돌려준다 — "일부만 지워진 초기화"를 사용자에게
// 정직하게 알리기 위한 형태(교차검수 지적 반영).
import type { DataService } from "@/types";

export interface DeleteAllResult {
  total: number;
  deleted: number;
  failed: boolean;
}

export async function deleteAllRecords(
  service: Pick<DataService, "getCatchRecords" | "deleteCatchRecord">,
): Promise<DeleteAllResult> {
  const records = await service.getCatchRecords();
  let deleted = 0;
  for (const r of records) {
    try {
      await service.deleteCatchRecord(r.id);
      deleted += 1;
    } catch {
      return { total: records.length, deleted, failed: true };
    }
  }
  return { total: records.length, deleted, failed: false };
}
