import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('USER').notNull(),
  location: text('location'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  notifyWatering: boolean('notify_watering').default(true),
  notifyReminders: boolean('notify_reminders').default(true),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const plantCategories = pgTable('plant_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const plants = pgTable('plants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  localName: text('local_name'),
  scientificName: text('scientific_name').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id').references(() => plantCategories.id),
  imageUrl: text('image_url').notNull(),
  sunlight: text('sunlight').notNull(),
  watering: text('watering').notNull(),
  soil: text('soil').notNull(),
  temperature: text('temperature').notNull(),
  difficulty: text('difficulty').notNull(),
  toxicity: text('toxicity').notNull(),
  petSafe: boolean('pet_safe').default(true),
  recommendedFrequencyDays: integer('recommended_frequency_days').default(5),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userPlants = pgTable('user_plants', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  plantId: text('plant_id').references(() => plants.id),
  nickname: text('nickname').notNull(),
  acquiredAt: timestamp('acquired_at').notNull(),
  location: text('location').notNull(),
  notes: text('notes'),
  customImageUrl: text('custom_image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wateringSchedules = pgTable('watering_schedules', {
  id: text('id').primaryKey(),
  userPlantId: text('user_plant_id').references(() => userPlants.id, { onDelete: 'cascade' }),
  frequencyDays: integer('frequency_days').notNull(),
  lastWateredAt: timestamp('last_watered_at'),
  nextWateringAt: timestamp('next_watering_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wateringLogs = pgTable('watering_logs', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').references(() => wateringSchedules.id, { onDelete: 'cascade' }),
  wateredAt: timestamp('watered_at').defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  userPlantId: text('user_plant_id').references(() => userPlants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  reminderType: text('reminder_type').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  completedAt: timestamp('completed_at'),
  status: text('status').default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const plantHealthRecords = pgTable('plant_health_records', {
  id: text('id').primaryKey(),
  userPlantId: text('user_plant_id').references(() => userPlants.id, { onDelete: 'cascade' }),
  condition: text('condition').notNull(),
  notes: text('notes').notNull(),
  imageUrl: text('image_url'),
  recordedAt: timestamp('recorded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  authorId: text('author_id').references(() => users.id),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  status: text('status').default('PUBLISHED'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const articleCategories = pgTable('article_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
