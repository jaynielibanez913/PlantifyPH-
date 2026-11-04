import { getTursoClient } from './client';
import type { PlantifyStore } from '@/lib/store/memory-db';
import type {
  ActivityEvent,
  Article,
  ArticleCategory,
  Plant,
  PlantCategory,
  PlantHealthRecord,
  Reminder,
  User,
  UserPlant,
  WateringLog,
  WateringSchedule,
} from '@/types/domain';

let tablesInitialized = false;

export async function initializeTursoTables(): Promise<void> {
  if (tablesInitialized) return;
  const client = getTursoClient();
  try {
    await client.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT,
          role TEXT,
          location TEXT,
          bio TEXT,
          avatar_url TEXT,
          notify_watering INTEGER,
          notify_reminders INTEGER,
          active INTEGER,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS plant_categories (
          id TEXT PRIMARY KEY,
          name TEXT,
          slug TEXT,
          description TEXT,
          created_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS plants (
          id TEXT PRIMARY KEY,
          name TEXT,
          local_name TEXT,
          scientific_name TEXT,
          description TEXT,
          category_id TEXT,
          image_url TEXT,
          sunlight TEXT,
          watering TEXT,
          soil TEXT,
          temperature TEXT,
          difficulty TEXT,
          toxicity TEXT,
          pet_safe INTEGER,
          recommended_frequency_days INTEGER,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS user_plants (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          plant_id TEXT,
          nickname TEXT,
          acquired_at TEXT,
          location TEXT,
          notes TEXT,
          custom_image_url TEXT,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS watering_schedules (
          id TEXT PRIMARY KEY,
          user_plant_id TEXT,
          frequency_days INTEGER,
          last_watered_at TEXT,
          next_watering_at TEXT,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS watering_logs (
          id TEXT PRIMARY KEY,
          schedule_id TEXT,
          watered_at TEXT,
          notes TEXT,
          created_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_plant_id TEXT,
          title TEXT,
          description TEXT,
          reminder_type TEXT,
          scheduled_at TEXT,
          completed_at TEXT,
          status TEXT,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS health_records (
          id TEXT PRIMARY KEY,
          user_plant_id TEXT,
          condition TEXT,
          notes TEXT,
          image_url TEXT,
          recorded_at TEXT,
          created_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS article_categories (
          id TEXT PRIMARY KEY,
          name TEXT,
          slug TEXT,
          created_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY,
          author_id TEXT,
          author_name TEXT,
          category_id TEXT,
          category_name TEXT,
          title TEXT,
          slug TEXT,
          excerpt TEXT,
          content TEXT,
          image_url TEXT,
          read_time_minutes INTEGER,
          season_tag TEXT,
          status TEXT,
          published_at TEXT,
          created_at TEXT,
          updated_at TEXT
        );`,
        `CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          actor_name TEXT,
          action TEXT,
          target_name TEXT,
          created_at TEXT
        );`,
      ],
      'write'
    );
    tablesInitialized = true;
    console.log('[Turso] Tables created/verified successfully.');
  } catch (err) {
    console.warn('[Turso] Error initializing tables:', err);
  }
}

export async function persistPlantToTurso(plant: Plant): Promise<void> {
  try {
    await initializeTursoTables();
    const client = getTursoClient();
    await client.execute({
      sql: `INSERT INTO plants (
        id, name, local_name, scientific_name, description, category_id,
        image_url, sunlight, watering, soil, temperature, difficulty,
        toxicity, pet_safe, recommended_frequency_days, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        local_name=excluded.local_name,
        scientific_name=excluded.scientific_name,
        description=excluded.description,
        category_id=excluded.category_id,
        image_url=excluded.image_url,
        sunlight=excluded.sunlight,
        watering=excluded.watering,
        soil=excluded.soil,
        temperature=excluded.temperature,
        difficulty=excluded.difficulty,
        toxicity=excluded.toxicity,
        pet_safe=excluded.pet_safe,
        recommended_frequency_days=excluded.recommended_frequency_days,
        updated_at=excluded.updated_at;`,
      args: [
        plant.id,
        plant.name,
        plant.localName || '',
        plant.scientificName,
        plant.description,
        plant.categoryId,
        plant.imageUrl,
        plant.sunlight,
        plant.watering,
        plant.soil,
        plant.temperature,
        plant.difficulty,
        plant.toxicity,
        plant.petSafe ? 1 : 0,
        plant.recommendedFrequencyDays,
        plant.createdAt,
        plant.updatedAt,
      ],
    });
    console.log(`[Turso] Saved plant ${plant.id} (${plant.name}) to Turso database.`);
  } catch (err) {
    console.error('[Turso] Error persisting plant:', err);
  }
}

export async function persistUserPlantToTurso(up: UserPlant): Promise<void> {
  try {
    await initializeTursoTables();
    const client = getTursoClient();
    await client.execute({
      sql: `INSERT INTO user_plants (
        id, user_id, plant_id, nickname, acquired_at, location, notes, custom_image_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nickname=excluded.nickname,
        acquired_at=excluded.acquired_at,
        location=excluded.location,
        notes=excluded.notes,
        custom_image_url=excluded.custom_image_url,
        updated_at=excluded.updated_at;`,
      args: [
        up.id,
        up.userId,
        up.plantId,
        up.nickname,
        up.acquiredAt,
        up.location,
        up.notes || '',
        up.customImageUrl || '',
        up.createdAt,
        up.updatedAt,
      ],
    });
    console.log(`[Turso] Saved user plant ${up.id} to Turso database.`);
  } catch (err) {
    console.error('[Turso] Error persisting user plant:', err);
  }
}

export async function deleteFromTurso(tableName: string, id: string): Promise<void> {
  try {
    await initializeTursoTables();
    const client = getTursoClient();
    await client.execute({
      sql: `DELETE FROM ${tableName} WHERE id = ?`,
      args: [id],
    });
    console.log(`[Turso] Deleted record ${id} from table ${tableName}.`);
  } catch (err) {
    console.error(`[Turso] Error deleting record ${id} from ${tableName}:`, err);
  }
}

export async function persistStoreToTurso(store: PlantifyStore): Promise<void> {
  try {
    await initializeTursoTables();
    const client = getTursoClient();

    // Persist plants
    for (const plant of store.plants.values()) {
      await persistPlantToTurso(plant);
    }
    // Persist user plants
    for (const up of store.userPlants.values()) {
      await persistUserPlantToTurso(up);
    }
    // Persist categories
    for (const cat of store.plantCategories.values()) {
      await client.execute({
        sql: `INSERT INTO plant_categories (id, name, slug, description, created_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, description=excluded.description;`,
        args: [cat.id, cat.name, cat.slug, cat.description || '', cat.createdAt],
      });
    }
    // Persist users
    for (const user of store.users.values()) {
      await client.execute({
        sql: `INSERT INTO users (id, name, email, role, location, bio, avatar_url, notify_watering, notify_reminders, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, location=excluded.location, bio=excluded.bio, updated_at=excluded.updated_at;`,
        args: [
          user.id,
          user.name,
          user.email,
          user.role,
          user.location || '',
          user.bio || '',
          user.avatarUrl || '',
          user.notifyWatering ? 1 : 0,
          user.notifyReminders ? 1 : 0,
          user.active ? 1 : 0,
          user.createdAt,
          user.updatedAt,
        ],
      });
    }
    // Persist watering schedules
    for (const ws of store.wateringSchedules.values()) {
      await client.execute({
        sql: `INSERT INTO watering_schedules (id, user_plant_id, frequency_days, last_watered_at, next_watering_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET last_watered_at=excluded.last_watered_at, next_watering_at=excluded.next_watering_at, updated_at=excluded.updated_at;`,
        args: [
          ws.id,
          ws.userPlantId,
          ws.frequencyDays,
          ws.lastWateredAt,
          ws.nextWateringAt,
          ws.createdAt,
          ws.updatedAt,
        ],
      });
    }
    // Persist watering logs
    for (const log of store.wateringLogs.values()) {
      await client.execute({
        sql: `INSERT INTO watering_logs (id, schedule_id, watered_at, notes, created_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET notes=excluded.notes;`,
        args: [log.id, log.scheduleId, log.wateredAt, log.notes || '', log.createdAt],
      });
    }
    // Persist reminders
    for (const rem of store.reminders.values()) {
      await client.execute({
        sql: `INSERT INTO reminders (id, user_id, user_plant_id, title, description, reminder_type, scheduled_at, completed_at, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET completed_at=excluded.completed_at, status=excluded.status, updated_at=excluded.updated_at;`,
        args: [
          rem.id,
          rem.userId,
          rem.userPlantId,
          rem.title,
          rem.description,
          rem.reminderType,
          rem.scheduledAt,
          rem.completedAt || '',
          rem.status,
          rem.createdAt,
          rem.updatedAt,
        ],
      });
    }
    // Persist health records
    for (const hr of store.healthRecords.values()) {
      await client.execute({
        sql: `INSERT INTO health_records (id, user_plant_id, condition, notes, image_url, recorded_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET condition=excluded.condition, notes=excluded.notes, image_url=excluded.image_url;`,
        args: [
          hr.id,
          hr.userPlantId,
          hr.condition,
          hr.notes,
          hr.imageUrl || '',
          hr.recordedAt,
          hr.createdAt,
        ],
      });
    }
    // Persist article categories
    for (const ac of store.articleCategories.values()) {
      await client.execute({
        sql: `INSERT INTO article_categories (id, name, slug, created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug;`,
        args: [ac.id, ac.name, ac.slug, ac.createdAt],
      });
    }
    // Persist articles
    for (const art of store.articles.values()) {
      await client.execute({
        sql: `INSERT INTO articles (id, author_id, author_name, category_id, category_name, title, slug, excerpt, content, image_url, read_time_minutes, season_tag, status, published_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, status=excluded.status, updated_at=excluded.updated_at;`,
        args: [
          art.id,
          art.authorId,
          art.authorName,
          art.categoryId,
          art.categoryName,
          art.title,
          art.slug,
          art.excerpt,
          art.content,
          art.imageUrl || '',
          art.readTimeMinutes,
          art.seasonTag || '',
          art.status,
          art.publishedAt || '',
          art.createdAt,
          art.updatedAt,
        ],
      });
    }
    // Persist activities
    for (const act of store.activities) {
      await client.execute({
        sql: `INSERT INTO activities (id, user_id, actor_name, action, target_name, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO NOTHING;`,
        args: [act.id, act.userId, act.actorName, act.action, act.targetName, act.createdAt],
      });
    }
    console.log('[Turso] Successfully synchronized store with Turso database.');
  } catch (err) {
    console.error('[Turso] Error synchronizing store to Turso:', err);
  }
}
