export type UserRole = 'USER' | 'ADMIN';

export type PlantCategorySlug =
  | 'indoor-plants'
  | 'outdoor-plants'
  | 'succulents'
  | 'cactus'
  | 'herbs'
  | 'vegetables'
  | 'flowers'
  | 'tropical-plants'
  | 'trees';

export type PlantDifficulty = 'Easy' | 'Moderate' | 'Advanced';

export type PlantCondition =
  | 'Healthy'
  | 'Needs Water'
  | 'Overwatered'
  | 'Pest Infestation'
  | 'Disease'
  | 'Needs Attention';

export type ReminderType =
  | 'WATERING'
  | 'FERTILIZING'
  | 'PRUNING'
  | 'REPOTTING'
  | 'CUSTOM';

export type ReminderStatus = 'PENDING' | 'COMPLETED';

export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  location: string;
  bio: string;
  avatarUrl: string | null;
  notifyWatering: boolean;
  notifyReminders: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PlantCategory {
  id: string;
  name: string;
  slug: PlantCategorySlug;
  description: string;
  createdAt: string;
}

export interface Plant {
  id: string;
  name: string;
  localName: string;
  scientificName: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  sunlight: string;
  watering: string;
  soil: string;
  temperature: string;
  difficulty: PlantDifficulty;
  toxicity: string;
  petSafe: boolean;
  recommendedFrequencyDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlantWithCategory extends Plant {
  categoryName: string;
}

export interface UserPlant {
  id: string;
  userId: string;
  plantId: string;
  nickname: string;
  acquiredAt: string;
  location: string;
  notes: string;
  customImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlantDetailed extends UserPlant {
  plant: PlantWithCategory;
  latestCondition: PlantCondition;
  wateringSchedule: WateringSchedule | null;
}

export interface WateringSchedule {
  id: string;
  userPlantId: string;
  frequencyDays: number;
  nextWateringAt: string;
  lastWateredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WateringScheduleDetailed extends WateringSchedule {
  userPlantNickname: string;
  plantName: string;
  plantImageUrl: string;
  location: string;
  logs: WateringLog[];
}

export interface WateringLog {
  id: string;
  scheduleId: string;
  wateredAt: string;
  notes: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  userPlantId: string | null;
  title: string;
  description: string;
  reminderType: ReminderType;
  scheduledAt: string;
  completedAt: string | null;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDetailed extends Reminder {
  plantLabel: string | null;
}

export interface PlantHealthRecord {
  id: string;
  userPlantId: string;
  condition: PlantCondition;
  notes: string;
  imageUrl: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Article {
  id: string;
  authorId: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  readTimeMinutes: number;
  seasonTag: string;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  actorName: string;
  action: string;
  targetName: string;
  createdAt: string;
}
