import { randomUUID } from 'node:crypto';
import { AuthorizationError, NotFoundError } from '@/lib/errors/app-error';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import { requireOwnedUserPlant } from '@/features/my-plants/service';
import type { PlantCondition, PlantHealthRecord, SafeUser } from '@/types/domain';

export function listPlantHealthRecords(
  userId: string,
  userPlantId: string
): PlantHealthRecord[] {
  requireOwnedUserPlant(userId, userPlantId);
  const store = getStore();

  const records: PlantHealthRecord[] = [];
  for (const record of store.healthRecords.values()) {
    if (record.userPlantId === userPlantId) {
      records.push(record);
    }
  }

  records.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  return records;
}

export function createPlantHealthRecord(
  user: SafeUser,
  userPlantId: string,
  input: {
    condition: PlantCondition;
    notes: string;
    imageUrl?: string | null;
    recordedAt?: string;
  }
): PlantHealthRecord {
  const owned = requireOwnedUserPlant(user.id, userPlantId);
  const store = getStore();
  const now = new Date().toISOString();

  const record: PlantHealthRecord = {
    id: `hr_${randomUUID().slice(0, 8)}`,
    userPlantId: owned.id,
    condition: input.condition,
    notes: input.notes,
    imageUrl: input.imageUrl ?? null,
    recordedAt: input.recordedAt ? new Date(input.recordedAt).toISOString() : now,
    createdAt: now,
  };

  store.healthRecords.set(record.id, record);
  recordActivity(
    user.id,
    user.name,
    `Logged health observation (${input.condition})`,
    owned.nickname
  );
  persistStore(store);
  return record;
}

export function deletePlantHealthRecord(user: SafeUser, recordId: string): void {
  const store = getStore();
  const record = store.healthRecords.get(recordId);
  if (!record) {
    throw new NotFoundError('Health observation not found.');
  }

  const owned = store.userPlants.get(record.userPlantId);
  if (!owned || owned.userId !== user.id) {
    throw new AuthorizationError('You do not have permission to delete this health record.');
  }

  store.healthRecords.delete(recordId);
  persistStore(store);
}
