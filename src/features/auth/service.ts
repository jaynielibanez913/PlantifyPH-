import { randomUUID } from 'node:crypto';
import {
  AuthenticationError,
  ConflictError,
} from '@/lib/errors/app-error';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { getStore, recordActivity } from '@/lib/store/memory-db';
import { toSafeUser } from '@/lib/auth/session';
import type { SafeUser, User } from '@/types/domain';

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
  location: string;
}): SafeUser {
  const store = getStore();
  const normalizedEmail = input.email.trim().toLowerCase();

  for (const existing of store.users.values()) {
    if (existing.email.toLowerCase() === normalizedEmail) {
      throw new ConflictError('An account with this email address already exists.');
    }
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: `usr_${randomUUID()}`,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(input.password),
    role: 'USER',
    location: input.location || 'Metro Manila, Philippines',
    bio: 'Growing healthier plants across the Philippines.',
    avatarUrl: null,
    notifyWatering: true,
    notifyReminders: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  store.users.set(newUser.id, newUser);
  recordActivity(newUser.id, newUser.name, 'Registered a PlantifyPH account', newUser.location);
  return toSafeUser(newUser);
}

export function authenticateUser(input: {
  email: string;
  password: string;
}): SafeUser {
  const store = getStore();
  const normalizedEmail = input.email.trim().toLowerCase();

  let matchedUser: User | undefined;
  for (const candidate of store.users.values()) {
    if (candidate.email.toLowerCase() === normalizedEmail) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser || !matchedUser.active) {
    throw new AuthenticationError('Invalid email address or password.');
  }

  const valid = verifyPassword(input.password, matchedUser.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email address or password.');
  }

  return toSafeUser(matchedUser);
}
