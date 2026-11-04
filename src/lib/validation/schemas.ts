import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(80, 'Full name must be 80 characters or fewer.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long.')
    .max(128, 'Password is too long.'),
  location: z
    .string()
    .trim()
    .max(80, 'Location must be 80 characters or fewer.')
    .optional()
    .default('Metro Manila, Philippines'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const imagePathSchema = z
  .string()
  .trim()
  .refine(
    (val) =>
      val.startsWith('/api/uploads/') ||
      val.startsWith('/images/') ||
      val.startsWith('https://') ||
      val.startsWith('http://'),
    'Please upload a valid image.'
  );

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80).optional(),
  location: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(400, 'Bio must be 400 characters or fewer.').optional(),
  avatarUrl: imagePathSchema.nullable().optional(),
  notifyWatering: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long.')
    .max(128),
});

export const plantCreateSchema = z.object({
  name: z.string().trim().min(2, 'Common name is required.').max(100),
  localName: z.string().trim().max(100).optional().default(''),
  scientificName: z.string().trim().min(3, 'Scientific name is required.').max(140),
  description: z.string().trim().min(12, 'Provide a helpful plant description.').max(1500),
  categoryId: z.string().trim().min(1, 'Category is required.'),
  imageUrl: imagePathSchema,
  sunlight: z.string().trim().min(2).max(120),
  watering: z.string().trim().min(2).max(120),
  soil: z.string().trim().min(2).max(160),
  temperature: z.string().trim().min(2).max(80),
  difficulty: z.enum(['Easy', 'Moderate', 'Advanced']),
  toxicity: z.string().trim().min(2).max(160),
  petSafe: z.boolean().default(true),
  recommendedFrequencyDays: z.coerce.number().int().min(1).max(60).default(5),
});

export const plantUpdateSchema = plantCreateSchema.partial();

export const userPlantCreateSchema = z.object({
  plantId: z.string().trim().min(1, 'Please select a plant from the catalog.'),
  nickname: z
    .string()
    .trim()
    .min(1, 'Give your plant a nickname.')
    .max(80, 'Nickname must be 80 characters or fewer.'),
  acquiredAt: z.string().trim().min(4, 'Acquisition date is required.'),
  location: z
    .string()
    .trim()
    .min(2, 'Specify where this plant lives (e.g., East Balcony).')
    .max(100),
  notes: z.string().trim().max(600).optional().default(''),
  customImageUrl: imagePathSchema.nullable().optional(),
  createDefaultSchedule: z.boolean().optional().default(true),
});

export const userPlantUpdateSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  acquiredAt: z.string().trim().min(4).optional(),
  location: z.string().trim().min(2).max(100).optional(),
  notes: z.string().trim().max(600).optional(),
  customImageUrl: imagePathSchema.nullable().optional(),
});

export const wateringScheduleCreateSchema = z.object({
  userPlantId: z.string().trim().min(1, 'Select one of your plants.'),
  frequencyDays: z.coerce
    .number()
    .int()
    .min(1, 'Frequency must be at least every 1 day.')
    .max(60, 'Frequency cannot exceed 60 days.'),
  nextWateringAt: z.string().trim().min(4, 'Next watering date is required.'),
});

export const wateringScheduleUpdateSchema = z.object({
  frequencyDays: z.coerce.number().int().min(1).max(60).optional(),
  nextWateringAt: z.string().trim().min(4).optional(),
});

export const wateringCompleteSchema = z.object({
  notes: z.string().trim().max(300).optional().default('Routine morning watering completed.'),
});

export const reminderCreateSchema = z.object({
  userPlantId: z.string().trim().nullable().optional().default(null),
  title: z.string().trim().min(2, 'Reminder title is required.').max(120),
  description: z.string().trim().max(400).optional().default(''),
  reminderType: z.enum(['WATERING', 'FERTILIZING', 'PRUNING', 'REPOTTING', 'CUSTOM']),
  scheduledAt: z.string().trim().min(4, 'Scheduled date is required.'),
});

export const reminderUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(400).optional(),
  reminderType: z.enum(['WATERING', 'FERTILIZING', 'PRUNING', 'REPOTTING', 'CUSTOM']).optional(),
  scheduledAt: z.string().trim().min(4).optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
});

export const healthRecordCreateSchema = z.object({
  condition: z.enum([
    'Healthy',
    'Needs Water',
    'Overwatered',
    'Pest Infestation',
    'Disease',
    'Needs Attention',
  ]),
  notes: z.string().trim().min(3, 'Please describe your observation.').max(800),
  imageUrl: imagePathSchema.nullable().optional().default(null),
  recordedAt: z.string().trim().optional(),
});

export const articleCreateSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters.').max(160),
  categoryId: z.string().trim().min(1, 'Select an article category.'),
  excerpt: z.string().trim().min(10).max(320),
  content: z.string().trim().min(30, 'Article content must be at least 30 characters.'),
  imageUrl: imagePathSchema.default('/images/hero-atelier.jpg'),
  seasonTag: z.string().trim().max(60).default('Year-Round PH'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

export const adminUserUpdateSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['USER', 'ADMIN']).optional(),
  active: z.boolean().optional(),
});
