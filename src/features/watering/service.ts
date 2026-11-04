import { randomUUID } from 'node:crypto';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/app-error';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import { requireOwnedUserPlant } from '@/features/my-plants/service';
import type {
  SafeUser,
  WateringLog,
  WateringSchedule,
  WateringScheduleDetailed,
} from '@/types/domain';

function enrichSchedule(schedule: WateringSchedule): WateringScheduleDetailed {
  const store = getStore();
  const up = store.userPlants.get(schedule.userPlantId);
  const plant = up ? store.plants.get(up.plantId) : undefined;

  const logs: WateringLog[] = [];
  for (const log of store.wateringLogs.values()) {
    if (log.scheduleId === schedule.id) {
      logs.push(log);
    }
  }
  logs.sort(
    (a, b) => new Date(b.wateredAt).getTime() - new Date(a.wateredAt).getTime()
  );

  return {
    ...schedule,
    userPlantNickname: up?.nickname ?? 'Personal Plant',
    plantName: plant?.name ?? 'Specimen',
    plantImageUrl: up?.customImageUrl ?? plant?.imageUrl ?? '/images/hero-atelier.jpg',
    location: up?.location ?? 'Home Garden',
    logs,
  };
}

function requireOwnedSchedule(userId: string, scheduleId: string): WateringSchedule {
  const store = getStore();
  const schedule = store.wateringSchedules.get(scheduleId);
  if (!schedule) {
    throw new NotFoundError('Watering schedule not found.');
  }
  const up = store.userPlants.get(schedule.userPlantId);
  if (!up || up.userId !== userId) {
    throw new AuthorizationError('You do not have permission to modify this schedule.');
  }
  return schedule;
}

export function listWateringSchedules(userId: string): WateringScheduleDetailed[] {
  const store = getStore();
  const results: WateringScheduleDetailed[] = [];

  for (const schedule of store.wateringSchedules.values()) {
    const up = store.userPlants.get(schedule.userPlantId);
    if (up && up.userId === userId) {
      results.push(enrichSchedule(schedule));
    }
  }

  results.sort(
    (a, b) =>
      new Date(a.nextWateringAt).getTime() - new Date(b.nextWateringAt).getTime()
  );
  return results;
}

export function createWateringSchedule(
  user: SafeUser,
  input: {
    userPlantId: string;
    frequencyDays: number;
    nextWateringAt: string;
  }
): WateringScheduleDetailed {
  const store = getStore();
  const ownedPlant = requireOwnedUserPlant(user.id, input.userPlantId);

  for (const existing of store.wateringSchedules.values()) {
    if (existing.userPlantId === ownedPlant.id) {
      throw new ConflictError(
        `A watering schedule already exists for ${ownedPlant.nickname}. Edit the existing schedule instead.`
      );
    }
  }

  const now = new Date().toISOString();
  const nextIso = new Date(input.nextWateringAt).toISOString();

  const schedule: WateringSchedule = {
    id: `ws_${randomUUID().slice(0, 8)}`,
    userPlantId: ownedPlant.id,
    frequencyDays: input.frequencyDays,
    lastWateredAt: null,
    nextWateringAt: nextIso,
    createdAt: now,
    updatedAt: now,
  };

  store.wateringSchedules.set(schedule.id, schedule);
  recordActivity(
    user.id,
    user.name,
    `Created ${input.frequencyDays}-day watering schedule`,
    ownedPlant.nickname
  );
  persistStore(store);
  return enrichSchedule(schedule);
}

export function updateWateringSchedule(
  user: SafeUser,
  scheduleId: string,
  updates: {
    frequencyDays?: number;
    nextWateringAt?: string;
  }
): WateringScheduleDetailed {
  const store = getStore();
  const schedule = requireOwnedSchedule(user.id, scheduleId);

  if (updates.frequencyDays !== undefined) {
    schedule.frequencyDays = updates.frequencyDays;
  }
  if (updates.nextWateringAt !== undefined) {
    schedule.nextWateringAt = new Date(updates.nextWateringAt).toISOString();
  }
  schedule.updatedAt = new Date().toISOString();

  store.wateringSchedules.set(schedule.id, schedule);
  persistStore(store);
  return enrichSchedule(schedule);
}

export function deleteWateringSchedule(user: SafeUser, scheduleId: string): void {
  const store = getStore();
  const schedule = requireOwnedSchedule(user.id, scheduleId);

  for (const [logId, log] of store.wateringLogs.entries()) {
    if (log.scheduleId === schedule.id) {
      store.wateringLogs.delete(logId);
    }
  }

  store.wateringSchedules.delete(schedule.id);
  persistStore(store);
}

export function completeWateringSchedule(
  user: SafeUser,
  scheduleId: string,
  notes: string
): WateringScheduleDetailed {
  const store = getStore();
  const schedule = requireOwnedSchedule(user.id, scheduleId);
  const ownedPlant = store.userPlants.get(schedule.userPlantId);

  const now = new Date();
  const nextDate = new Date(now.getTime());
  nextDate.setDate(nextDate.getDate() + schedule.frequencyDays);

  schedule.lastWateredAt = now.toISOString();
  schedule.nextWateringAt = nextDate.toISOString();
  schedule.updatedAt = now.toISOString();
  store.wateringSchedules.set(schedule.id, schedule);

  const log: WateringLog = {
    id: `wlog_${randomUUID().slice(0, 8)}`,
    scheduleId: schedule.id,
    wateredAt: now.toISOString(),
    notes: notes || 'Watered thoroughly until drainage runoff.',
    createdAt: now.toISOString(),
  };
  store.wateringLogs.set(log.id, log);

  recordActivity(
    user.id,
    user.name,
    'Completed scheduled watering',
    ownedPlant?.nickname ?? 'Plant'
  );
  persistStore(store);

  return enrichSchedule(schedule);
}
