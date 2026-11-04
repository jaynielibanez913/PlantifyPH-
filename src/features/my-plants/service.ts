import { randomUUID } from 'node:crypto';
import { AuthorizationError, NotFoundError } from '@/lib/errors/app-error';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import { deleteDocFromFirestore } from '@/lib/store/firestore-store';
import { getPlantById } from '@/features/plants/service';
import type {
  PlantCondition,
  PlantHealthRecord,
  SafeUser,
  UserPlant,
  UserPlantDetailed,
  WateringSchedule,
} from '@/types/domain';

function resolveLatestCondition(userPlantId: string): PlantCondition {
  const store = getStore();
  let latest: PlantHealthRecord | null = null;
  for (const record of store.healthRecords.values()) {
    if (record.userPlantId === userPlantId) {
      if (
        !latest ||
        new Date(record.recordedAt).getTime() > new Date(latest.recordedAt).getTime()
      ) {
        latest = record;
      }
    }
  }
  return latest?.condition ?? 'Healthy';
}

function resolveScheduleForPlant(userPlantId: string): WateringSchedule | null {
  const store = getStore();
  for (const schedule of store.wateringSchedules.values()) {
    if (schedule.userPlantId === userPlantId) {
      return schedule;
    }
  }
  return null;
}

export function requireOwnedUserPlant(userId: string, userPlantId: string): UserPlant {
  const store = getStore();
  const userPlant = store.userPlants.get(userPlantId);
  if (!userPlant) {
    throw new NotFoundError('Plant not found in your personal collection.');
  }
  if (userPlant.userId !== userId) {
    throw new AuthorizationError('You can only access plants in your own collection.');
  }
  return userPlant;
}

export function listUserPlants(userId: string): UserPlantDetailed[] {
  const store = getStore();
  const items: UserPlantDetailed[] = [];

  for (const up of store.userPlants.values()) {
    if (up.userId !== userId) {
      continue;
    }
    const plant = getPlantById(up.plantId);
    items.push({
      ...up,
      plant,
      latestCondition: resolveLatestCondition(up.id),
      wateringSchedule: resolveScheduleForPlant(up.id),
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return items;
}

export function getUserPlantDetail(
  userId: string,
  userPlantId: string
): UserPlantDetailed & {
  healthHistory: PlantHealthRecord[];
} {
  const store = getStore();
  const owned = requireOwnedUserPlant(userId, userPlantId);
  const plant = getPlantById(owned.plantId);

  const healthHistory: PlantHealthRecord[] = [];
  for (const rec of store.healthRecords.values()) {
    if (rec.userPlantId === owned.id) {
      healthHistory.push(rec);
    }
  }
  healthHistory.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return {
    ...owned,
    plant,
    latestCondition: healthHistory[0]?.condition ?? 'Healthy',
    wateringSchedule: resolveScheduleForPlant(owned.id),
    healthHistory,
  };
}

export function addUserPlant(
  user: SafeUser,
  input: {
    plantId: string;
    nickname: string;
    acquiredAt: string;
    location: string;
    notes: string;
    customImageUrl?: string | null;
    createDefaultSchedule?: boolean;
  }
): UserPlantDetailed {
  const store = getStore();
  const catalogPlant = getPlantById(input.plantId);
  const now = new Date().toISOString();

  const created: UserPlant = {
    id: `up_${randomUUID().slice(0, 8)}`,
    userId: user.id,
    plantId: catalogPlant.id,
    nickname: input.nickname,
    acquiredAt: input.acquiredAt,
    location: input.location,
    notes: input.notes,
    customImageUrl: input.customImageUrl ?? null,
    createdAt: now,
    updatedAt: now,
  };

  store.userPlants.set(created.id, created);

  // Record initial Healthy baseline
  const baselineId = `hr_${randomUUID().slice(0, 8)}`;
  store.healthRecords.set(baselineId, {
    id: baselineId,
    userPlantId: created.id,
    condition: 'Healthy',
    notes: `Added ${created.nickname} to ${created.location}.`,
    imageUrl: created.customImageUrl ?? catalogPlant.imageUrl,
    recordedAt: now,
    createdAt: now,
  });

  let schedule: WateringSchedule | null = null;
  if (input.createDefaultSchedule !== false) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + catalogPlant.recommendedFrequencyDays);
    schedule = {
      id: `ws_${randomUUID().slice(0, 8)}`,
      userPlantId: created.id,
      frequencyDays: catalogPlant.recommendedFrequencyDays,
      lastWateredAt: now,
      nextWateringAt: nextDate.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    store.wateringSchedules.set(schedule.id, schedule);
  }

  recordActivity(user.id, user.name, 'Added plant to personal collection', created.nickname);
  persistStore(store);

  return {
    ...created,
    plant: catalogPlant,
    latestCondition: 'Healthy',
    wateringSchedule: schedule,
  };
}

export function updateUserPlant(
  user: SafeUser,
  userPlantId: string,
  updates: {
    nickname?: string;
    acquiredAt?: string;
    location?: string;
    notes?: string;
    customImageUrl?: string | null;
  }
): UserPlantDetailed {
  const store = getStore();
  const owned = requireOwnedUserPlant(user.id, userPlantId);

  if (updates.nickname !== undefined) owned.nickname = updates.nickname;
  if (updates.acquiredAt !== undefined) owned.acquiredAt = updates.acquiredAt;
  if (updates.location !== undefined) owned.location = updates.location;
  if (updates.notes !== undefined) owned.notes = updates.notes;
  if (updates.customImageUrl !== undefined) owned.customImageUrl = updates.customImageUrl;
  owned.updatedAt = new Date().toISOString();

  store.userPlants.set(owned.id, owned);
  recordActivity(user.id, user.name, 'Updated personal plant details', owned.nickname);
  persistStore(store);

  return {
    ...owned,
    plant: getPlantById(owned.plantId),
    latestCondition: resolveLatestCondition(owned.id),
    wateringSchedule: resolveScheduleForPlant(owned.id),
  };
}

export function deleteUserPlant(user: SafeUser, userPlantId: string): void {
  const store = getStore();
  const owned = requireOwnedUserPlant(user.id, userPlantId);

  // Cascade delete schedules, watering logs, reminders, and health records
  for (const [wsId, ws] of store.wateringSchedules.entries()) {
    if (ws.userPlantId === owned.id) {
      for (const [logId, log] of store.wateringLogs.entries()) {
        if (log.scheduleId === wsId) {
          store.wateringLogs.delete(logId);
          deleteDocFromFirestore('wateringLogs', logId).catch(() => {});
        }
      }
      store.wateringSchedules.delete(wsId);
      deleteDocFromFirestore('wateringSchedules', wsId).catch(() => {});
    }
  }

  for (const [remId, rem] of store.reminders.entries()) {
    if (rem.userPlantId === owned.id) {
      store.reminders.delete(remId);
      deleteDocFromFirestore('reminders', remId).catch(() => {});
    }
  }

  for (const [hrId, hr] of store.healthRecords.entries()) {
    if (hr.userPlantId === owned.id) {
      store.healthRecords.delete(hrId);
      deleteDocFromFirestore('healthRecords', hrId).catch(() => {});
    }
  }

  store.userPlants.delete(owned.id);
  deleteDocFromFirestore('userPlants', owned.id).catch(() => {});
  recordActivity(user.id, user.name, 'Removed plant from collection', owned.nickname);
  persistStore(store);
}
