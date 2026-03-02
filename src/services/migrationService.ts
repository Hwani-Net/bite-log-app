import { localStorageService } from './localStorage';
import { createFirestoreService } from './firestoreService';

const MIGRATION_KEY = 'fishlog_migrated';

/**
 * Migrate localStorage records to Firestore on first login.
 * Only runs once per user.
 */
export async function migrateLocalToFirestore(uid: string): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const migrationFlag = `${MIGRATION_KEY}_${uid}`;
  if (localStorage.getItem(migrationFlag) === 'true') {
    return 0; // Already migrated
  }

  const localRecords = await localStorageService.getCatchRecords();
  if (localRecords.length === 0) {
    localStorage.setItem(migrationFlag, 'true');
    return 0;
  }

  const firestoreService = createFirestoreService(uid);
  let migrated = 0;

  for (const record of localRecords) {
    try {
      await firestoreService.addCatchRecord({
        date: record.date,
        location: record.location,
        species: record.species,
        count: record.count,
        sizeCm: record.sizeCm,
        weightKg: record.weightKg,
        photos: record.photos,
        memo: record.memo,
        weather: record.weather,
        tide: record.tide,
        visibility: record.visibility || 'public',
      });
      migrated++;
    } catch (err) {
      console.error('Migration error for record:', record.id, err);
    }
  }

  localStorage.setItem(migrationFlag, 'true');
  console.log(`Migrated ${migrated}/${localRecords.length} records to Firestore`);
  return migrated;
}
