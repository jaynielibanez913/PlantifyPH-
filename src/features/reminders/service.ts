import { randomUUID } from 'node:crypto';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '@/lib/errors/app-error';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import { requireOwnedUserPlant } from '@/features/my-plants/service';
import type {
  Reminder,
  ReminderDetailed,
  ReminderStatus,
  ReminderType,
  SafeUser,
} from '@/types/domain';

function enrichReminder(reminder: Reminder): ReminderDetailed {
  const store = getStore();
  const up = reminder.userPlantId ? store.userPlants.get(reminder.userPlantId) : null;
  return {
    ...reminder,
    plantLabel: up ? up.nickname : null,
  };
}

export function listReminders(userId: string): ReminderDetailed[] {
  const store = getStore();
  const items: ReminderDetailed[] = [];

  for (const rem of store.reminders.values()) {
    if (rem.userId === userId) {
      items.push(enrichReminder(rem));
    }
  }

  items.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'PENDING' ? -1 : 1;
    }
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return items;
}

export function createReminder(
  user: SafeUser,
  input: {
    userPlantId: string | null;
    title: string;
    description: string;
    reminderType: ReminderType;
    scheduledAt: string;
  }
): ReminderDetailed {
  const store = getStore();

  if (input.userPlantId) {
    requireOwnedUserPlant(user.id, input.userPlantId);
  }

  const targetDay = new Date(input.scheduledAt).toISOString().slice(0, 10);

  // Prevent duplicate pending reminders of same type/title/day
  for (const existing of store.reminders.values()) {
    if (
      existing.userId === user.id &&
      existing.status === 'PENDING' &&
      existing.userPlantId === input.userPlantId &&
      existing.reminderType === input.reminderType &&
      existing.title.toLowerCase() === input.title.toLowerCase() &&
      existing.scheduledAt.slice(0, 10) === targetDay
    ) {
      throw new ConflictError(
        'An identical pending reminder is already scheduled for that day.'
      );
    }
  }

  const now = new Date().toISOString();
  const reminder: Reminder = {
    id: `rem_${randomUUID().slice(0, 8)}`,
    userId: user.id,
    userPlantId: input.userPlantId,
    title: input.title,
    description: input.description,
    reminderType: input.reminderType,
    scheduledAt: new Date(input.scheduledAt).toISOString(),
    completedAt: null,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  store.reminders.set(reminder.id, reminder);
  recordActivity(user.id, user.name, `Scheduled ${input.reminderType.toLowerCase()} reminder`, input.title);
  return enrichReminder(reminder);
}

export function updateReminder(
  user: SafeUser,
  reminderId: string,
  updates: {
    title?: string;
    description?: string;
    reminderType?: ReminderType;
    scheduledAt?: string;
    status?: ReminderStatus;
  }
): ReminderDetailed {
  const store = getStore();
  const reminder = store.reminders.get(reminderId);
  if (!reminder) {
    throw new NotFoundError('Reminder not found.');
  }
  if (reminder.userId !== user.id) {
    throw new AuthorizationError('You do not have permission to update this reminder.');
  }

  if (updates.title !== undefined) reminder.title = updates.title;
  if (updates.description !== undefined) reminder.description = updates.description;
  if (updates.reminderType !== undefined) reminder.reminderType = updates.reminderType;
  if (updates.scheduledAt !== undefined) {
    reminder.scheduledAt = new Date(updates.scheduledAt).toISOString();
  }
  if (updates.status !== undefined) {
    reminder.status = updates.status;
    reminder.completedAt =
      updates.status === 'COMPLETED' ? new Date().toISOString() : null;
  }
  reminder.updatedAt = new Date().toISOString();

  store.reminders.set(reminder.id, reminder);
  persistStore(store);
  if (updates.status === 'COMPLETED') {
    recordActivity(user.id, user.name, 'Completed care reminder', reminder.title);
  }
  return enrichReminder(reminder);
}

export function deleteReminder(user: SafeUser, reminderId: string): void {
  const store = getStore();
  const reminder = store.reminders.get(reminderId);
  if (!reminder) {
    throw new NotFoundError('Reminder not found.');
  }
  if (reminder.userId !== user.id) {
    throw new AuthorizationError('You do not have permission to delete this reminder.');
  }
  store.reminders.delete(reminderId);
  persistStore(store);
}
