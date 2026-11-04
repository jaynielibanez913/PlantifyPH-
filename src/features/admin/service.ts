import { NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { getStore, recordActivity } from '@/lib/store/memory-db';
import { toSafeUser } from '@/lib/auth/session';
import type {
  ActivityEvent,
  Article,
  SafeUser,
  UserRole,
} from '@/types/domain';

export function getAdminDashboardSummary(): {
  metrics: {
    totalUsers: number;
    activeUsers: number;
    catalogPlants: number;
    plantCategories: number;
    personalPlantsTracked: number;
    publishedArticles: number;
    activeReminders: number;
  };
  recentActivities: ActivityEvent[];
} {
  const store = getStore();
  const allUsers = Array.from(store.users.values());
  const allArticles = Array.from(store.articles.values());
  const activeReminders = Array.from(store.reminders.values()).filter(
    (r) => r.status === 'PENDING'
  ).length;

  return {
    metrics: {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.active).length,
      catalogPlants: store.plants.size,
      plantCategories: store.plantCategories.size,
      personalPlantsTracked: store.userPlants.size,
      publishedArticles: allArticles.filter((a) => a.status === 'PUBLISHED').length,
      activeReminders,
    },
    recentActivities: store.activities.slice(0, 12),
  };
}

export function listAllUsersForAdmin(): Array<
  SafeUser & { ownedPlantsCount: number }
> {
  const store = getStore();
  const plantCounts = new Map<string, number>();
  for (const up of store.userPlants.values()) {
    plantCounts.set(up.userId, (plantCounts.get(up.userId) ?? 0) + 1);
  }

  return Array.from(store.users.values())
    .map((u) => ({
      ...toSafeUser(u),
      ownedPlantsCount: plantCounts.get(u.id) ?? 0,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateUserByAdmin(
  admin: SafeUser,
  input: {
    userId: string;
    role?: UserRole;
    active?: boolean;
  }
): SafeUser {
  const store = getStore();
  const target = store.users.get(input.userId);
  if (!target) {
    throw new NotFoundError('Target user not found.');
  }

  if (target.id === admin.id && input.active === false) {
    throw new ValidationError('Administrators cannot deactivate their own active session.');
  }

  if (input.role !== undefined) target.role = input.role;
  if (input.active !== undefined) target.active = input.active;
  target.updatedAt = new Date().toISOString();

  store.users.set(target.id, target);
  recordActivity(admin.id, admin.name, 'Updated user permissions', target.email);
  return toSafeUser(target);
}

export function listAllArticlesForAdmin(): Article[] {
  const store = getStore();
  return Array.from(store.articles.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
