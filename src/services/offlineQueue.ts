const DB_NAME = 'fishlog-offline';
const STORE_NAME = 'pending-records';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface PendingRecord {
  id?: number;
  data: Record<string, unknown>;
  timestamp: string;
}

/** Queue a record for later sync when offline */
export async function enqueueOfflineRecord(data: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add({
    data,
    timestamp: new Date().toISOString(),
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending offline records */
export async function getPendingRecords(): Promise<PendingRecord[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a synced record from the queue */
export async function removePendingRecord(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/** Sync all pending records using provided service */
export async function syncPendingRecords(
  addRecord: (data: Record<string, unknown>) => Promise<unknown>
): Promise<number> {
  const pending = await getPendingRecords();
  let synced = 0;

  for (const record of pending) {
    try {
      await addRecord(record.data);
      if (record.id) await removePendingRecord(record.id);
      synced++;
    } catch (err) {
      console.error('Sync failed for record:', record.id, err);
    }
  }

  return synced;
}
