import { describe, it, expect } from 'vitest';
import { deleteAllRecords } from '@/lib/dataReset';
import type { CatchRecord } from '@/types';

function fakeService(ids: string[], failOn?: string) {
  const deleted: string[] = [];
  return {
    deleted,
    getCatchRecords: async () =>
      ids.map((id) => ({ id }) as unknown as CatchRecord),
    deleteCatchRecord: async (id: string) => {
      if (id === failOn) throw new Error('network');
      deleted.push(id);
    },
  };
}

describe('deleteAllRecords', () => {
  it('deletes everything and reports a clean result', async () => {
    const svc = fakeService(['a', 'b', 'c']);
    expect(await deleteAllRecords(svc)).toEqual({
      total: 3,
      deleted: 3,
      failed: false,
    });
    expect(svc.deleted).toEqual(['a', 'b', 'c']);
  });

  it('stops on the first failure and reports honest progress — the UI can tell the user', async () => {
    const svc = fakeService(['a', 'b', 'c'], 'b');
    expect(await deleteAllRecords(svc)).toEqual({
      total: 3,
      deleted: 1,
      failed: true,
    });
    expect(svc.deleted).toEqual(['a']); // b에서 멈춤 — c는 시도 안 함
  });

  it('handles an empty account without touching delete', async () => {
    const svc = fakeService([]);
    expect(await deleteAllRecords(svc)).toEqual({
      total: 0,
      deleted: 0,
      failed: false,
    });
  });
});
