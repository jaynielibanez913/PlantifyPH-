import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors/app-error';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { getStore, persistStore, recordActivity } from '@/lib/store/memory-db';
import { toSafeUser } from '@/lib/auth/session';
import type { SafeUser } from '@/types/domain';

export function getUserProfile(userId: string): SafeUser {
  const store = getStore();
  const user = store.users.get(userId);
  if (!user || !user.active) {
    throw new NotFoundError('User account not found.');
  }
  return toSafeUser(user);
}

export function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    location?: string;
    bio?: string;
    avatarUrl?: string | null;
    notifyWatering?: boolean;
    notifyReminders?: boolean;
  }
): SafeUser {
  const store = getStore();
  const user = store.users.get(userId);
  if (!user || !user.active) {
    throw new NotFoundError('User account not found.');
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.location !== undefined) user.location = updates.location;
  if (updates.bio !== undefined) user.bio = updates.bio;
  if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
  if (updates.notifyWatering !== undefined) user.notifyWatering = updates.notifyWatering;
  if (updates.notifyReminders !== undefined) user.notifyReminders = updates.notifyReminders;
  user.updatedAt = new Date().toISOString();

  store.users.set(user.id, user);
  recordActivity(user.id, user.name, 'Updated profile preferences', user.location);
  return toSafeUser(user);
}

export function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): void {
  const store = getStore();
  const user = store.users.get(userId);
  if (!user || !user.active) {
    throw new NotFoundError('User account not found.');
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new AuthenticationError('Current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    throw new ValidationError('New password must be different from your current password.');
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  store.users.set(user.id, user);
  recordActivity(user.id, user.name, 'Changed account password', 'Account Security');
}

export function deactivateUserAccount(userId: string): void {
  const store = getStore();
  const user = store.users.get(userId);
  if (!user) {
    throw new NotFoundError('User account not found.');
  }
  user.active = false;
  user.updatedAt = new Date().toISOString();
  store.users.set(user.id, user);

  for (const [sessionId, session] of store.sessions.entries()) {
    if (session.userId === userId) {
      store.sessions.delete(sessionId);
    }
  }
  persistStore(store);
}
