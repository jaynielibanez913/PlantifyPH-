import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@/lib/errors/app-error';
import { getStore, recordActivity } from '@/lib/store/memory-db';
import type {
  Plant,
  PlantCategory,
  PlantDifficulty,
  PlantWithCategory,
  SafeUser,
} from '@/types/domain';

export function listPlantCategories(): PlantCategory[] {
  const store = getStore();
  return Array.from(store.plantCategories.values());
}

export function listPlants(filters?: {
  search?: string;
  categoryId?: string;
  difficulty?: string;
  petSafeOnly?: boolean;
  page?: number;
  limit?: number;
}): {
  items: PlantWithCategory[];
  total: number;
  page: number;
  totalPages: number;
} {
  const store = getStore();
  const q = filters?.search?.trim().toLowerCase() ?? '';
  const categoryId = filters?.categoryId?.trim() ?? '';
  const difficulty = filters?.difficulty?.trim() ?? '';
  const petSafeOnly = Boolean(filters?.petSafeOnly);

  const enriched: PlantWithCategory[] = [];
  for (const plant of store.plants.values()) {
    if (categoryId && categoryId !== 'all' && plant.categoryId !== categoryId) {
      continue;
    }
    if (difficulty && difficulty !== 'all' && plant.difficulty !== difficulty) {
      continue;
    }
    if (petSafeOnly && !plant.petSafe) {
      continue;
    }
    if (q) {
      const haystack = `${plant.name} ${plant.localName} ${plant.scientificName} ${plant.description}`.toLowerCase();
      if (!haystack.includes(q)) {
        continue;
      }
    }

    const category = store.plantCategories.get(plant.categoryId);
    enriched.push({
      ...plant,
      categoryName: category?.name ?? 'Indoor Plants',
    });
  }

  enriched.sort((a, b) => a.name.localeCompare(b.name));

  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters?.limit ?? 24));
  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    items: enriched.slice(start, start + limit),
    total,
    page,
    totalPages,
  };
}

export function getPlantById(plantId: string): PlantWithCategory {
  const store = getStore();
  const plant = store.plants.get(plantId);
  if (!plant) {
    throw new NotFoundError('Plant specimen not found in catalog.');
  }
  const category = store.plantCategories.get(plant.categoryId);
  return {
    ...plant,
    categoryName: category?.name ?? 'Indoor Plants',
  };
}

export function createPlant(
  actor: SafeUser,
  input: {
    name: string;
    localName?: string;
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
  }
): PlantWithCategory {
  const store = getStore();
  if (!store.plantCategories.has(input.categoryId)) {
    throw new NotFoundError('Selected plant category does not exist.');
  }

  for (const existing of store.plants.values()) {
    if (existing.scientificName.toLowerCase() === input.scientificName.toLowerCase()) {
      throw new ConflictError('A plant with this scientific name already exists in the catalog.');
    }
  }

  const now = new Date().toISOString();
  const plant: Plant = {
    id: `plt_${randomUUID().slice(0, 8)}`,
    name: input.name,
    localName: input.localName ?? '',
    scientificName: input.scientificName,
    description: input.description,
    categoryId: input.categoryId,
    imageUrl: input.imageUrl,
    sunlight: input.sunlight,
    watering: input.watering,
    soil: input.soil,
    temperature: input.temperature,
    difficulty: input.difficulty,
    toxicity: input.toxicity,
    petSafe: input.petSafe,
    recommendedFrequencyDays: input.recommendedFrequencyDays,
    createdAt: now,
    updatedAt: now,
  };

  store.plants.set(plant.id, plant);
  recordActivity(actor.id, actor.name, 'Added plant to catalog', plant.name);
  return getPlantById(plant.id);
}

export function updatePlant(
  actor: SafeUser,
  plantId: string,
  updates: Partial<Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>>
): PlantWithCategory {
  const store = getStore();
  const existing = store.plants.get(plantId);
  if (!existing) {
    throw new NotFoundError('Plant specimen not found.');
  }

  if (updates.categoryId && !store.plantCategories.has(updates.categoryId)) {
    throw new NotFoundError('Selected plant category does not exist.');
  }

  const updated: Plant = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store.plants.set(plantId, updated);
  recordActivity(actor.id, actor.name, 'Updated catalog plant', updated.name);
  return getPlantById(plantId);
}

export function deletePlant(actor: SafeUser, plantId: string): void {
  const store = getStore();
  const existing = store.plants.get(plantId);
  if (!existing) {
    throw new NotFoundError('Plant specimen not found.');
  }

  store.plants.delete(plantId);
  recordActivity(actor.id, actor.name, 'Removed plant from catalog', existing.name);
}
