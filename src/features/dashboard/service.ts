import { getStore } from '@/lib/store/memory-db';
import { listUserPlants } from '@/features/my-plants/service';
import { listWateringSchedules } from '@/features/watering/service';
import { listReminders } from '@/features/reminders/service';
import { listPublishedArticles } from '@/features/articles/service';
import type {
  ActivityEvent,
  Article,
  ReminderDetailed,
  UserPlantDetailed,
  WateringScheduleDetailed,
} from '@/types/domain';

export interface DashboardSummary {
  metrics: {
    totalPlants: number;
    healthyPlants: number;
    plantsNeedingAttention: number;
    dueWateringCount: number;
    pendingRemindersCount: number;
  };
  ownedPlants: UserPlantDetailed[];
  upcomingWatering: WateringScheduleDetailed[];
  pendingReminders: ReminderDetailed[];
  recentActivities: ActivityEvent[];
  latestArticles: Article[];
}

export function getUserDashboardSummary(userId: string): DashboardSummary {
  const store = getStore();
  const ownedPlants = listUserPlants(userId);
  const schedules = listWateringSchedules(userId);
  const reminders = listReminders(userId);
  const latestArticles = listPublishedArticles().slice(0, 3);

  const healthyPlants = ownedPlants.filter(
    (p) => p.latestCondition === 'Healthy'
  ).length;
  const plantsNeedingAttention = ownedPlants.length - healthyPlants;

  const endOfTomorrow = new Date();
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const dueWateringCount = schedules.filter(
    (s) => new Date(s.nextWateringAt).getTime() <= endOfTomorrow.getTime()
  ).length;

  const pendingReminders = reminders.filter((r) => r.status === 'PENDING');

  const recentActivities = store.activities
    .filter((event) => event.userId === userId)
    .slice(0, 6);

  return {
    metrics: {
      totalPlants: ownedPlants.length,
      healthyPlants,
      plantsNeedingAttention,
      dueWateringCount,
      pendingRemindersCount: pendingReminders.length,
    },
    ownedPlants,
    upcomingWatering: schedules.slice(0, 5),
    pendingReminders: pendingReminders.slice(0, 5),
    recentActivities,
    latestArticles,
  };
}
