import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashPassword } from '@/lib/security/password';
import type {
  ActivityEvent,
  Article,
  ArticleCategory,
  Plant,
  PlantCategory,
  PlantHealthRecord,
  Reminder,
  Session,
  User,
  UserPlant,
  WateringLog,
  WateringSchedule,
} from '@/types/domain';

export interface PlantifyStore {
  users: Map<string, User>;
  sessions: Map<string, Session>;
  plantCategories: Map<string, PlantCategory>;
  plants: Map<string, Plant>;
  userPlants: Map<string, UserPlant>;
  wateringSchedules: Map<string, WateringSchedule>;
  wateringLogs: Map<string, WateringLog>;
  reminders: Map<string, Reminder>;
  healthRecords: Map<string, PlantHealthRecord>;
  articleCategories: Map<string, ArticleCategory>;
  articles: Map<string, Article>;
  activities: ActivityEvent[];
}

interface SerializedStore {
  users: Array<[string, User]>;
  sessions: Array<[string, Session]>;
  plantCategories: Array<[string, PlantCategory]>;
  plants: Array<[string, Plant]>;
  userPlants: Array<[string, UserPlant]>;
  wateringSchedules: Array<[string, WateringSchedule]>;
  wateringLogs: Array<[string, WateringLog]>;
  reminders: Array<[string, Reminder]>;
  healthRecords: Array<[string, PlantHealthRecord]>;
  articleCategories: Array<[string, ArticleCategory]>;
  articles: Array<[string, Article]>;
  activities: ActivityEvent[];
}

const STORE_FILE = path.join(os.tmpdir(), 'plantifyph-store-v1.json');

declare global {
  var _plantifyStore: PlantifyStore | undefined;
  var _plantifyStoreMtime: number | undefined;
}

function daysFromNowIso(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function serializeStore(store: PlantifyStore): SerializedStore {
  return {
    users: Array.from(store.users.entries()),
    sessions: Array.from(store.sessions.entries()),
    plantCategories: Array.from(store.plantCategories.entries()),
    plants: Array.from(store.plants.entries()),
    userPlants: Array.from(store.userPlants.entries()),
    wateringSchedules: Array.from(store.wateringSchedules.entries()),
    wateringLogs: Array.from(store.wateringLogs.entries()),
    reminders: Array.from(store.reminders.entries()),
    healthRecords: Array.from(store.healthRecords.entries()),
    articleCategories: Array.from(store.articleCategories.entries()),
    articles: Array.from(store.articles.entries()),
    activities: store.activities,
  };
}

function deserializeStore(raw: SerializedStore): PlantifyStore {
  return {
    users: new Map(raw.users),
    sessions: new Map(raw.sessions),
    plantCategories: new Map(raw.plantCategories),
    plants: new Map(raw.plants),
    userPlants: new Map(raw.userPlants),
    wateringSchedules: new Map(raw.wateringSchedules),
    wateringLogs: new Map(raw.wateringLogs),
    reminders: new Map(raw.reminders),
    healthRecords: new Map(raw.healthRecords),
    articleCategories: new Map(raw.articleCategories),
    articles: new Map(raw.articles),
    activities: raw.activities ?? [],
  };
}

import {
  initializeAndSyncFirestore,
  persistStoreToFirestore,
  syncDocToFirestore,
} from './firestore-store';
import {
  initializeTursoTables,
  persistStoreToTurso,
} from '@/lib/turso/store';

declare global {
  var _plantifyStore: PlantifyStore | undefined;
  var _plantifyStoreMtime: number | undefined;
  var _firestoreInitialized: boolean | undefined;
  var _tursoInitialized: boolean | undefined;
}

export function persistStore(store?: PlantifyStore): void {
  const target = store ?? globalThis._plantifyStore;
  if (!target) return;
  try {
    const tmpFile = `${STORE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(serializeStore(target)), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
    const stat = fs.statSync(STORE_FILE);
    globalThis._plantifyStoreMtime = stat.mtimeMs;
  } catch (err) {
    console.warn('[PlantifyPH] Could not persist store snapshot file:', err);
  }

  // Asynchronously persist to real Firestore database
  persistStoreToFirestore(target).catch((err) => {
    console.error('[PlantifyPH] Error persisting store snapshot to Firestore:', err);
  });

  // Asynchronously persist to real Turso (libsql) database
  persistStoreToTurso(target).catch((err) => {
    console.error('[PlantifyPH] Error persisting store snapshot to Turso:', err);
  });
}

function createSeededStore(): PlantifyStore {
  const now = new Date().toISOString();

  const users = new Map<string, User>();
  const adminUser: User = {
    id: 'usr_admin_ph',
    name: 'Jayniel Ibanez',
    email: 'admin@plantify.ph',
    passwordHash: hashPassword('PlantifyAdmin123!'),
    role: 'ADMIN',
    location: 'Quezon City, Metro Manila',
    bio: 'Curator of Philippine endemic flora, urban tropical gardens, and sustainable home substrates.',
    avatarUrl: null,
    notifyWatering: true,
    notifyReminders: true,
    active: true,
    createdAt: daysFromNowIso(-90),
    updatedAt: now,
  };

  const demoGardener: User = {
    id: 'usr_maria_ph',
    name: 'Maria Clara Santos',
    email: 'maria.santos@plantify.ph',
    passwordHash: hashPassword('PlantifyUser123!'),
    role: 'USER',
    location: 'Makati City, Metro Manila',
    bio: 'Condo balcony plant collector growing Philippine native aroids, calamansi, and culinary herbs.',
    avatarUrl: null,
    notifyWatering: true,
    notifyReminders: true,
    active: true,
    createdAt: daysFromNowIso(-45),
    updatedAt: now,
  };

  users.set(adminUser.id, adminUser);
  users.set(demoGardener.id, demoGardener);

  const categoryDefs: Array<{
    id: string;
    name: string;
    slug: PlantCategory['slug'];
    description: string;
  }> = [
    {
      id: 'cat_indoor',
      name: 'Indoor Plants',
      slug: 'indoor-plants',
      description: 'Shade-adapted foliage suited for Philippine condos, living rooms, and sunlit windows.',
    },
    {
      id: 'cat_tropical',
      name: 'Tropical Plants',
      slug: 'tropical-plants',
      description: 'Endemic and humid-loving tropical specimens native to Philippine forests.',
    },
    {
      id: 'cat_outdoor',
      name: 'Outdoor Plants',
      slug: 'outdoor-plants',
      description: 'Sun-hardy lanai, courtyard, and garden plants built for tropical monsoons.',
    },
    {
      id: 'cat_herbs',
      name: 'Herbs',
      slug: 'herbs',
      description: 'Fragrant kitchen herbs for Filipino cooking and sunny apartment sills.',
    },
    {
      id: 'cat_vegetables',
      name: 'Vegetables',
      slug: 'vegetables',
      description: 'Productive backyard and container edibles suited for Bahay Kubo gardens.',
    },
    {
      id: 'cat_flowers',
      name: 'Flowers',
      slug: 'flowers',
      description: 'Ornamental Philippine blooms with cascading bracts and fragrant blossoms.',
    },
    {
      id: 'cat_succulents',
      name: 'Succulents',
      slug: 'succulents',
      description: 'Drought-tolerant fleshy rosettes that thrive in gritty pumice mixes.',
    },
    {
      id: 'cat_cactus',
      name: 'Cactus',
      slug: 'cactus',
      description: 'Arid sculptural specimens requiring bright dry balconies and minimal watering.',
    },
    {
      id: 'cat_trees',
      name: 'Trees',
      slug: 'trees',
      description: 'Compact fruiting citrus and native courtyard canopy trees.',
    },
  ];

  const plantCategories = new Map<string, PlantCategory>();
  for (const cat of categoryDefs) {
    plantCategories.set(cat.id, { ...cat, createdAt: daysFromNowIso(-90) });
  }

  const seededPlants: Plant[] = [
    {
      id: 'plt_alocasia_zebrina',
      name: 'Zebra Plant',
      localName: 'Tigre / Alocasia Zebrina',
      scientificName: 'Alocasia zebrina',
      description:
        'An iconic Philippine endemic aroid prized from Luzon to Mindanao for its sculptural sagittate leaves and banded zebra-striped petioles. Thrives in humid, airy shaded courtyards.',
      categoryId: 'cat_tropical',
      imageUrl: '/images/alocasia-zebrina.jpg',
      sunlight: 'Bright indirect light; shield from harsh afternoon Tag-init sun',
      watering: 'Every 4–5 days; keep chunky mix lightly moist, never soggy',
      soil: 'Chunky aroid mix: 40% coco chips, 30% pumice, 20% vermicast, 10% CRH',
      temperature: '22°C – 31°C (65–80% humidity)',
      difficulty: 'Moderate',
      toxicity: 'Contains calcium oxalate crystals — keep away from cats and dogs',
      petSafe: false,
      recommendedFrequencyDays: 4,
      createdAt: daysFromNowIso(-80),
      updatedAt: now,
    },
    {
      id: 'plt_medinilla_magnifica',
      name: 'Philippine Orchid Grape',
      localName: 'Kapa-kapa',
      scientificName: 'Medinilla magnifica',
      description:
        'Known locally as Kapa-kapa, this regal Philippine native epiphyte produces dramatic pendulous panicles of rose-pink bracts beneath leathery, deeply veined dark green leaves.',
      categoryId: 'cat_flowers',
      imageUrl: '/images/medinilla-magnifica.jpg',
      sunlight: 'Filtered morning sun with dappled afternoon shade',
      watering: 'Every 4 days during dry months; mist foliage in air-conditioned rooms',
      soil: 'Fast-draining epiphytic blend with coco cubes, charcoal, and sphagnum',
      temperature: '20°C – 29°C (high tropical humidity)',
      difficulty: 'Moderate',
      toxicity: 'Non-toxic to household pets',
      petSafe: true,
      recommendedFrequencyDays: 4,
      createdAt: daysFromNowIso(-78),
      updatedAt: now,
    },
    {
      id: 'plt_asplenium_nidus',
      name: "Bird's Nest Fern",
      localName: 'Dapo / Pakpak Lawin',
      scientificName: 'Asplenium nidus',
      description:
        'Lush glossy apple-green fronds unfurling from a fuzzy central rosette. Widely grown across Philippine lanais and shaded condo balconies, completely safe around pets.',
      categoryId: 'cat_indoor',
      imageUrl: '/images/biophilic-loft.jpg',
      sunlight: 'Medium to bright indirect light; tolerates shaded rooms',
      watering: 'Every 5 days; water the soil perimeter rather than the central crown',
      soil: 'Coco peat, fine orchid bark, and composted leaf mold',
      temperature: '21°C – 32°C',
      difficulty: 'Easy',
      toxicity: 'Non-toxic to cats and dogs (ASPCA safe)',
      petSafe: true,
      recommendedFrequencyDays: 5,
      createdAt: daysFromNowIso(-75),
      updatedAt: now,
    },
    {
      id: 'plt_monstera_deliciosa',
      name: 'Swiss Cheese Plant',
      localName: 'Monstera',
      scientificName: 'Monstera deliciosa',
      description:
        'Architectural climbing tropical foliage with fenestrated emerald leaves. Adapts effortlessly to warm Philippine living spaces when given a coco-pole support.',
      categoryId: 'cat_indoor',
      imageUrl: '/images/hero-atelier.jpg',
      sunlight: 'Bright indirect light near an east-facing window',
      watering: 'Every 6–7 days once the top 5 cm of mix dries out',
      soil: 'Well-aerated coco chips, pumice, and worm castings',
      temperature: '20°C – 33°C',
      difficulty: 'Easy',
      toxicity: 'Mildly toxic if chewed by pets',
      petSafe: false,
      recommendedFrequencyDays: 6,
      createdAt: daysFromNowIso(-70),
      updatedAt: now,
    },
    {
      id: 'plt_calamansi',
      name: 'Philippine Lime',
      localName: 'Calamansi / Kalamansi',
      scientificName: 'Citrus × microcarpa',
      description:
        'A beloved staple of Filipino households producing fragrant white blossoms and tart, vitamin-rich citrus year-round in sunny balconies, rooftops, and patios.',
      categoryId: 'cat_trees',
      imageUrl: '/images/courtyard-atrium.jpg',
      sunlight: 'Full direct sunlight (6+ hours daily for heavy fruiting)',
      watering: 'Every 2–3 days in terracotta pots during hot dry months',
      soil: 'Loamy garden soil amended with river sand, vermicast, and CRH',
      temperature: '24°C – 35°C',
      difficulty: 'Easy',
      toxicity: 'Citrus essential oils may upset sensitive pets if ingested in quantity',
      petSafe: false,
      recommendedFrequencyDays: 3,
      createdAt: daysFromNowIso(-68),
      updatedAt: now,
    },
    {
      id: 'plt_hoya_imbricata',
      name: 'Shingle Wax Plant',
      localName: 'Hoya / Baging',
      scientificName: 'Hoya imbricata',
      description:
        'Fascinating Philippine native shingling epiphyte whose mottled silver-and-olive circular leaves flatten tightly against driftwood or cedar mounts.',
      categoryId: 'cat_tropical',
      imageUrl: '/images/biophilic-loft.jpg',
      sunlight: 'Bright filtered light',
      watering: 'Every 3–4 days when mounted; every 6 days in airy bark pots',
      soil: 'Mounted on driftwood with sphagnum pad or coarse pine bark + charcoal',
      temperature: '23°C – 32°C',
      difficulty: 'Advanced',
      toxicity: 'Non-toxic and pet-friendly',
      petSafe: true,
      recommendedFrequencyDays: 4,
      createdAt: daysFromNowIso(-64),
      updatedAt: now,
    },
    {
      id: 'plt_sweet_basil',
      name: 'Sweet Thai & Genovese Basil',
      localName: 'Sulasi / Balanoy',
      scientificName: 'Ocimum basilicum',
      description:
        'Fast-growing aromatic culinary herb that flourishes in warm Philippine sun when pinched regularly above leaf nodes to encourage bushy branching.',
      categoryId: 'cat_herbs',
      imageUrl: '/images/hero-atelier.jpg',
      sunlight: 'Full morning sun (5–6 hours); light shade at noon in April–May',
      watering: 'Every 2 days; keep evenly moist in container planters',
      soil: 'Rich organic potting mix with coco coir and vermicompost',
      temperature: '23°C – 34°C',
      difficulty: 'Easy',
      toxicity: 'Completely safe and edible for pets and humans',
      petSafe: true,
      recommendedFrequencyDays: 2,
      createdAt: daysFromNowIso(-60),
      updatedAt: now,
    },
    {
      id: 'plt_espada_snake',
      name: 'Snake Plant',
      localName: 'Espada / Buntot Tigre',
      scientificName: 'Dracaena trifasciata',
      description:
        'Resilient upright sword-leaved classic seen across Filipino porches and offices. Tolerates low light, air-conditioning, and busy travel schedules.',
      categoryId: 'cat_succulents',
      imageUrl: '/images/courtyard-atrium.jpg',
      sunlight: 'Low indirect light to bright sunny windows',
      watering: 'Every 12–14 days; allow soil to dry completely between waterings',
      soil: '50% pumice, 30% garden loam, 20% carbonized rice hull (CRH)',
      temperature: '18°C – 35°C',
      difficulty: 'Easy',
      toxicity: 'Contains saponins — mildly toxic if ingested by pets',
      petSafe: false,
      recommendedFrequencyDays: 12,
      createdAt: daysFromNowIso(-58),
      updatedAt: now,
    },
    {
      id: 'plt_talong',
      name: 'Philippine Long Purple Eggplant',
      localName: 'Talong',
      scientificName: 'Solanum melongena',
      description:
        'High-yielding heirloom Filipino slender purple eggplant ideal for 5-gallon grow bags on sunny rooftops and backyard raised beds.',
      categoryId: 'cat_vegetables',
      imageUrl: '/images/courtyard-atrium.jpg',
      sunlight: 'Full tropical sun (6–8 hours daily)',
      watering: 'Every 2 days; consistent moisture prevents blossom end stress',
      soil: 'Deep fertile loam enriched with aged compost and crushed eggshells',
      temperature: '24°C – 34°C',
      difficulty: 'Easy',
      toxicity: 'Leaves contain solanine; harvest ripe fruits only',
      petSafe: false,
      recommendedFrequencyDays: 2,
      createdAt: daysFromNowIso(-55),
      updatedAt: now,
    },
    {
      id: 'plt_golden_barrel',
      name: 'Golden Barrel Cactus',
      localName: 'Bola ng Ginto Cactus',
      scientificName: 'Kroenleinia grusonii',
      description:
        'Ribbed globe cactus crowned with warm golden spines. Thrives under covered rain-sheltered Philippine balconies with abundant sunlight.',
      categoryId: 'cat_cactus',
      imageUrl: '/images/alocasia-zebrina.jpg',
      sunlight: 'Bright direct sun under rain cover during Habagat season',
      watering: 'Every 18–21 days; keep bone-dry during rainy typhoon weeks',
      soil: '70% pumice and volcanic scoria, 20% CRH, 10% sifted vermicast',
      temperature: '20°C – 38°C',
      difficulty: 'Easy',
      toxicity: 'Non-toxic flesh, but sharp spines require elevated placement',
      petSafe: true,
      recommendedFrequencyDays: 18,
      createdAt: daysFromNowIso(-50),
      updatedAt: now,
    },
  ];

  const plants = new Map<string, Plant>();
  for (const plant of seededPlants) {
    plants.set(plant.id, plant);
  }

  const userPlants = new Map<string, UserPlant>();
  const up1: UserPlant = {
    id: 'up_zebrina_1',
    userId: demoGardener.id,
    plantId: 'plt_alocasia_zebrina',
    nickname: 'Tigre on the Lanai',
    acquiredAt: daysFromNowIso(-40).slice(0, 10),
    location: 'East Balcony Louvers',
    notes: 'Potted in custom Benguet pumice + coco cube mix. Unfurled a 32cm leaf last week.',
    customImageUrl: null,
    createdAt: daysFromNowIso(-40),
    updatedAt: now,
  };
  const up2: UserPlant = {
    id: 'up_kapa_2',
    userId: demoGardener.id,
    plantId: 'plt_medinilla_magnifica',
    nickname: 'Lola Rosa Kapa-kapa',
    acquiredAt: daysFromNowIso(-28).slice(0, 10),
    location: 'Shaded Atrium Corner',
    notes: 'Two rose-pink flower panicles forming; misting around pebble tray on dry afternoons.',
    customImageUrl: null,
    createdAt: daysFromNowIso(-28),
    updatedAt: now,
  };
  const up3: UserPlant = {
    id: 'up_calamansi_3',
    userId: demoGardener.id,
    plantId: 'plt_calamansi',
    nickname: 'Sunny Calamansi Pot',
    acquiredAt: daysFromNowIso(-60).slice(0, 10),
    location: 'South Sun Ledge',
    notes: 'Top-dressed with vermicast; watching lower leaves during dry wind spells.',
    customImageUrl: null,
    createdAt: daysFromNowIso(-60),
    updatedAt: now,
  };
  const up4: UserPlant = {
    id: 'up_dapo_4',
    userId: demoGardener.id,
    plantId: 'plt_asplenium_nidus',
    nickname: 'Study Desk Dapo',
    acquiredAt: daysFromNowIso(-19).slice(0, 10),
    location: 'Home Office Bookshelf',
    notes: 'Zero crispy tips since moving 1.5m back from the AC vent.',
    customImageUrl: null,
    createdAt: daysFromNowIso(-19),
    updatedAt: now,
  };

  for (const item of [up1, up2, up3, up4]) {
    userPlants.set(item.id, item);
  }

  const wateringSchedules = new Map<string, WateringSchedule>();
  const wateringLogs = new Map<string, WateringLog>();

  const ws1: WateringSchedule = {
    id: 'ws_1',
    userPlantId: up1.id,
    frequencyDays: 4,
    lastWateredAt: daysFromNowIso(-3),
    nextWateringAt: daysFromNowIso(1),
    createdAt: daysFromNowIso(-40),
    updatedAt: now,
  };
  const ws2: WateringSchedule = {
    id: 'ws_2',
    userPlantId: up2.id,
    frequencyDays: 4,
    lastWateredAt: daysFromNowIso(-4),
    nextWateringAt: daysFromNowIso(0),
    createdAt: daysFromNowIso(-28),
    updatedAt: now,
  };
  const ws3: WateringSchedule = {
    id: 'ws_3',
    userPlantId: up3.id,
    frequencyDays: 3,
    lastWateredAt: daysFromNowIso(-4),
    nextWateringAt: daysFromNowIso(-1),
    createdAt: daysFromNowIso(-60),
    updatedAt: now,
  };
  const ws4: WateringSchedule = {
    id: 'ws_4',
    userPlantId: up4.id,
    frequencyDays: 5,
    lastWateredAt: daysFromNowIso(-2),
    nextWateringAt: daysFromNowIso(3),
    createdAt: daysFromNowIso(-19),
    updatedAt: now,
  };

  for (const ws of [ws1, ws2, ws3, ws4]) {
    wateringSchedules.set(ws.id, ws);
  }

  const log1: WateringLog = {
    id: 'wlog_1',
    scheduleId: ws1.id,
    wateredAt: daysFromNowIso(-3),
    notes: 'Flushed pot with rainwater collected on balcony until clear runoff.',
    createdAt: daysFromNowIso(-3),
  };
  const log2: WateringLog = {
    id: 'wlog_2',
    scheduleId: ws4.id,
    wateredAt: daysFromNowIso(-2),
    notes: 'Watered around outer rim of pot to protect central fern nest.',
    createdAt: daysFromNowIso(-2),
  };
  wateringLogs.set(log1.id, log1);
  wateringLogs.set(log2.id, log2);

  const reminders = new Map<string, Reminder>();
  const rem1: Reminder = {
    id: 'rem_1',
    userId: demoGardener.id,
    userPlantId: up3.id,
    title: 'Top-dress Sunny Calamansi with vermicast',
    description: 'Apply 2 tbsp slow-release organic vermicompost around drip line for fruit set.',
    reminderType: 'FERTILIZING',
    scheduledAt: daysFromNowIso(1),
    completedAt: null,
    status: 'PENDING',
    createdAt: daysFromNowIso(-7),
    updatedAt: now,
  };
  const rem2: Reminder = {
    id: 'rem_2',
    userId: demoGardener.id,
    userPlantId: up1.id,
    title: 'Wipe Tigre Alocasia leaf undersides with neem',
    description: 'Preventive monthly wipe against spider mites during dry warm afternoons.',
    reminderType: 'CUSTOM',
    scheduledAt: daysFromNowIso(2),
    completedAt: null,
    status: 'PENDING',
    createdAt: daysFromNowIso(-5),
    updatedAt: now,
  };
  const rem3: Reminder = {
    id: 'rem_3',
    userId: demoGardener.id,
    userPlantId: up2.id,
    title: 'Prune spent Kapa-kapa flower stalk',
    description: 'Use sterilized shears once pink bracts finish blooming.',
    reminderType: 'PRUNING',
    scheduledAt: daysFromNowIso(5),
    completedAt: null,
    status: 'PENDING',
    createdAt: daysFromNowIso(-3),
    updatedAt: now,
  };
  for (const rem of [rem1, rem2, rem3]) {
    reminders.set(rem.id, rem);
  }

  const healthRecords = new Map<string, PlantHealthRecord>();
  const hr1: PlantHealthRecord = {
    id: 'hr_1',
    userPlantId: up1.id,
    condition: 'Healthy',
    notes: 'Firm zebra stems and glossy new spear leaf emerging 4cm taller than previous leaf.',
    imageUrl: '/images/alocasia-zebrina.jpg',
    recordedAt: daysFromNowIso(-3),
    createdAt: daysFromNowIso(-3),
  };
  const hr2: PlantHealthRecord = {
    id: 'hr_2',
    userPlantId: up2.id,
    condition: 'Healthy',
    notes: 'Budding bracts vibrant rose-pink; humidity holding steady around 70%.',
    imageUrl: '/images/medinilla-magnifica.jpg',
    recordedAt: daysFromNowIso(-2),
    createdAt: daysFromNowIso(-2),
  };
  const hr3: PlantHealthRecord = {
    id: 'hr_3',
    userPlantId: up3.id,
    condition: 'Needs Water',
    notes: 'Top 4cm of terracotta pot dried quickly after windy afternoon; slight leaf curl noticed.',
    imageUrl: '/images/courtyard-atrium.jpg',
    recordedAt: daysFromNowIso(-1),
    createdAt: daysFromNowIso(-1),
  };
  const hr4: PlantHealthRecord = {
    id: 'hr_4',
    userPlantId: up4.id,
    condition: 'Healthy',
    notes: 'Three bright green fronds unfurling smoothly from center rosette.',
    imageUrl: '/images/biophilic-loft.jpg',
    recordedAt: daysFromNowIso(-4),
    createdAt: daysFromNowIso(-4),
  };
  for (const hr of [hr1, hr2, hr3, hr4]) {
    healthRecords.set(hr.id, hr);
  }

  const articleCategories = new Map<string, ArticleCategory>([
    [
      'acat_seasonal',
      {
        id: 'acat_seasonal',
        name: 'Philippine Seasons',
        slug: 'philippine-seasons',
        createdAt: daysFromNowIso(-90),
      },
    ],
    [
      'acat_substrates',
      {
        id: 'acat_substrates',
        name: 'Soil & Substrates',
        slug: 'soil-substrates',
        createdAt: daysFromNowIso(-90),
      },
    ],
    [
      'acat_edibles',
      {
        id: 'acat_edibles',
        name: 'Urban Edibles',
        slug: 'urban-edibles',
        createdAt: daysFromNowIso(-90),
      },
    ],
    [
      'acat_pests',
      {
        id: 'acat_pests',
        name: 'Plant Health & Pests',
        slug: 'plant-health-pests',
        createdAt: daysFromNowIso(-90),
      },
    ],
  ]);

  const seededArticles: Article[] = [
    {
      id: 'art_habagat_taginit',
      authorId: adminUser.id,
      authorName: adminUser.name,
      categoryId: 'acat_seasonal',
      categoryName: 'Philippine Seasons',
      title: 'Adapting Your Plant Routine Between Tag-init and Habagat',
      slug: 'adapting-plant-routine-tag-init-and-habagat',
      excerpt:
        'How to recalibrate watering intervals, airflow, and rain protection across the Philippines dry summer months and southwest monsoon rains.',
      content: `Gardening in the Philippines means designing around two distinct macro-seasons rather than four temperate ones: Tag-init (the intense warm dry months from March to May) and Habagat (the humid, rain-heavy southwest monsoon from June through October), followed by cooler Amihan breezes.\n\nDuring Tag-init, balcony temperatures in Metro Manila, Cebu, and Davao regularly climb past 34°C. Terracotta pots on sunny ledges lose moisture twice as fast. Shift watering to 6:00–7:30 AM so roots hydrate before midday transpiration peaks, and hang 50% knitted shade net for endemic forest plants like Alocasia zebrina and Medinilla magnifica.\n\nOnce Habagat arrives, overwatering—not drought—becomes the primary threat. Ambient humidity stays above 80%, slowing evaporation dramatically. Elevate outdoor pots on clay feet or steel grates so drainage holes never sit in pooled rainwater, pause watering on succulents and cacti under eaves, and prune dense inner foliage to boost airflow against fungal leaf spot.`,
      imageUrl: '/images/courtyard-atrium.jpg',
      readTimeMinutes: 5,
      seasonTag: 'Habagat & Tag-init',
      status: 'PUBLISHED',
      publishedAt: daysFromNowIso(-21),
      createdAt: daysFromNowIso(-21),
      updatedAt: now,
    },
    {
      id: 'art_aroid_substrate_ph',
      authorId: adminUser.id,
      authorName: adminUser.name,
      categoryId: 'acat_substrates',
      categoryName: 'Soil & Substrates',
      title: 'The Filipino Aroid Mix: Coco Chips, Benguet Pumice & CRH',
      slug: 'filipino-aroid-mix-coco-chips-pumice-crh',
      excerpt:
        'Build an ultra-breathable, locally sourced potting medium using washed coconut husk cubes, pumice stone, vermicast, and carbonized rice hull.',
      content: `Standard dense garden loam compacts quickly in humid tropical condos, suffocating delicate Philodendron, Anthurium, and Alocasia roots. Fortunately, the Philippines has abundant, sustainable local amendments that rival expensive imported mixes.\n\nStart by soaking coco chips and coco peat twice in fresh water to flush excess coastal salts (tannins and sodium). Combine 4 parts washed coco cubes, 3 parts 5–8mm pumice for permanent aeration pockets, 2 parts pure African nightcrawler vermicast for gentle slow-release nutrition, and 1 part Carbonized Rice Hull (CRH / ipa) to sweeten drainage and deter soil gnats.\n\nWhen you water this chunky mix, water should cascade through the drainage holes within three seconds—leaving damp, oxygenated pockets around white feeder roots.`,
      imageUrl: '/images/alocasia-zebrina.jpg',
      readTimeMinutes: 4,
      seasonTag: 'Beginner Tutorial',
      status: 'PUBLISHED',
      publishedAt: daysFromNowIso(-14),
      createdAt: daysFromNowIso(-14),
      updatedAt: now,
    },
    {
      id: 'art_balcony_calamansi',
      authorId: adminUser.id,
      authorName: adminUser.name,
      categoryId: 'acat_edibles',
      categoryName: 'Urban Edibles',
      title: 'Fruiting Calamansi & Culinary Herbs on a High-Rise Condo Balcony',
      slug: 'fruiting-calamansi-and-herbs-condo-balcony',
      excerpt:
        'A step-by-step guide to harvesting year-round Calamansi, Sulasi basil, and tanglad in compact urban containers.',
      content: `Even a narrow 1.2-meter condominium balcony can supply fresh Calamansi, Sulasi (sweet basil), and siling labuyo if matched to your building exposure.\n\nSouth- and west-facing balconies receive the 6+ hours of direct sunlight that grafted Calamansi trees need to set heavy flower flushes. Choose at least a 12-inch breathable terracotta or fabric pot with sandy loam + 20% pumice. To trigger synchronized flowering after harvest, let the top third of soil dry lightly for 4–5 days, then drench deeply and top-dress with vermicompost and crushed eggshells.\n\nPair the base perimeter with shallow planters of Sulasi basil—pinching the central stem just above two lateral leaf nodes every two weeks doubles harvestable stems while preventing premature bolting.`,
      imageUrl: '/images/hero-atelier.jpg',
      readTimeMinutes: 6,
      seasonTag: 'Urban Balcony',
      status: 'PUBLISHED',
      publishedAt: daysFromNowIso(-9),
      createdAt: daysFromNowIso(-9),
      updatedAt: now,
    },
    {
      id: 'art_gentle_pest_defense',
      authorId: adminUser.id,
      authorName: adminUser.name,
      categoryId: 'acat_pests',
      categoryName: 'Plant Health & Pests',
      title: 'Gentle Neem & Castile Soap Care for Mealybugs and Spider Mites',
      slug: 'gentle-neem-castile-care-mealybugs-spider-mites',
      excerpt:
        'Spot early leaf stippling before pests spread across indoor shelves, using pet-conscious botanical sprays.',
      content: `Warm indoor corners next to air-conditioning units create dry microclimates where two-spotted spider mites and cottony mealybugs multiply along leaf petioles.\n\nInspect the undersides of Alocasia, Calathea, and Hoya foliage weekly whenever you water. If you spot fine webbing or white waxy clusters in leaf axils, isolate the pot immediately. Dab visible mealybugs with 70% isopropyl alcohol on a cotton swab, then emulsify 5 ml cold-pressed neem oil with 3 ml pure liquid Castile soap in 1 liter of lukewarm water.\n\nSpray leaf undersides in the evening—never before direct morning sun, which can scorch oil-coated leaves—and repeat once every 7 days for three cycles to break the egg hatch window.`,
      imageUrl: '/images/biophilic-loft.jpg',
      readTimeMinutes: 5,
      seasonTag: 'Plant Protection',
      status: 'PUBLISHED',
      publishedAt: daysFromNowIso(-4),
      createdAt: daysFromNowIso(-4),
      updatedAt: now,
    },
  ];

  const articles = new Map<string, Article>();
  for (const art of seededArticles) {
    articles.set(art.id, art);
  }

  const activities: ActivityEvent[] = [
    {
      id: randomUUID(),
      userId: demoGardener.id,
      actorName: demoGardener.name,
      action: 'Logged health observation (Needs Water)',
      targetName: 'Sunny Calamansi Pot',
      createdAt: daysFromNowIso(-1),
    },
    {
      id: randomUUID(),
      userId: demoGardener.id,
      actorName: demoGardener.name,
      action: 'Completed scheduled watering',
      targetName: 'Study Desk Dapo',
      createdAt: daysFromNowIso(-2),
    },
    {
      id: randomUUID(),
      userId: demoGardener.id,
      actorName: demoGardener.name,
      action: 'Completed scheduled watering',
      targetName: 'Tigre on the Lanai',
      createdAt: daysFromNowIso(-3),
    },
    {
      id: randomUUID(),
      userId: adminUser.id,
      actorName: adminUser.name,
      action: 'Published gardening guide',
      targetName: 'Gentle Neem & Castile Soap Care for Mealybugs and Spider Mites',
      createdAt: daysFromNowIso(-4),
    },
  ];

  return {
    users,
    sessions: new Map<string, Session>(),
    plantCategories,
    plants,
    userPlants,
    wateringSchedules,
    wateringLogs,
    reminders,
    healthRecords,
    articleCategories,
    articles,
    activities,
  };
}

export function getStore(): PlantifyStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const stat = fs.statSync(STORE_FILE);
      if (
        !globalThis._plantifyStore ||
        globalThis._plantifyStoreMtime !== stat.mtimeMs
      ) {
        const raw = JSON.parse(
          fs.readFileSync(STORE_FILE, 'utf-8')
        ) as SerializedStore;
        globalThis._plantifyStore = deserializeStore(raw);
        globalThis._plantifyStoreMtime = stat.mtimeMs;
      }
      return globalThis._plantifyStore;
    }
  } catch (err) {
    console.warn('[PlantifyPH] Rebuilding store snapshot:', err);
  }

  if (!globalThis._plantifyStore) {
    globalThis._plantifyStore = createSeededStore();
    persistStore(globalThis._plantifyStore);
  }

  if (!globalThis._firestoreInitialized) {
    globalThis._firestoreInitialized = true;
    initializeAndSyncFirestore(globalThis._plantifyStore).catch((err) => {
      console.error('[PlantifyPH] Async Firestore sync failed:', err);
    });
  }

  if (!globalThis._tursoInitialized) {
    globalThis._tursoInitialized = true;
    persistStoreToTurso(globalThis._plantifyStore).catch((err) => {
      console.error('[PlantifyPH] Async Turso sync failed:', err);
    });
  }

  return globalThis._plantifyStore;
}

export function recordActivity(
  userId: string,
  actorName: string,
  action: string,
  targetName: string
): void {
  const store = getStore();
  store.activities.unshift({
    id: randomUUID(),
    userId,
    actorName,
    action,
    targetName,
    createdAt: new Date().toISOString(),
  });
  if (store.activities.length > 100) {
    store.activities.length = 100;
  }
  persistStore(store);
}
