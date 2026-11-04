import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { handleFirestoreError, OperationType } from '@/lib/firebase/errors';
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
import type { PlantifyStore } from './memory-db';

// Validate connection to Firestore as mandated by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connection validated successfully.');
    return true;
  } catch (error) {
    console.warn('[Firestore] Initial connection test note:', error);
    return false;
  }
}

// Convert Firestore document snapshot data safely
function cleanDocData<T>(id: string, data: Record<string, any>): T {
  return {
    ...data,
    id,
  } as T;
}

// Helper to save or update document in Firestore
export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    // Remove functions or undefined values
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

// Helper to delete document from Firestore
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

// Helper to load collection into Map
export async function loadCollectionFromFirestore<T extends { id: string }>(
  collectionName: string
): Promise<Map<string, T>> {
  const result = new Map<string, T>();
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const item = cleanDocData<T>(docSnap.id, docSnap.data());
        result.set(item.id, item);
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
  }
  return result;
}

// Helper to load activities array
export async function loadActivitiesFromFirestore(): Promise<ActivityEvent[]> {
  const list: ActivityEvent[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, 'activities'));
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        list.push(cleanDocData<ActivityEvent>(docSnap.id, docSnap.data()));
      }
    });
    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'activities');
  }
  return list;
}

// Persist the entire store or changed items into Firestore
export async function persistStoreToFirestore(store: PlantifyStore): Promise<void> {
  try {
    const syncTasks: Promise<void>[] = [];

    for (const [id, user] of store.users.entries()) {
      syncTasks.push(syncDocToFirestore('users', id, user));
    }
    for (const [id, cat] of store.plantCategories.entries()) {
      syncTasks.push(syncDocToFirestore('plantCategories', id, cat));
    }
    for (const [id, plant] of store.plants.entries()) {
      syncTasks.push(syncDocToFirestore('plants', id, plant));
    }
    for (const [id, up] of store.userPlants.entries()) {
      syncTasks.push(syncDocToFirestore('userPlants', id, up));
    }
    for (const [id, ws] of store.wateringSchedules.entries()) {
      syncTasks.push(syncDocToFirestore('wateringSchedules', id, ws));
    }
    for (const [id, log] of store.wateringLogs.entries()) {
      syncTasks.push(syncDocToFirestore('wateringLogs', id, log));
    }
    for (const [id, rem] of store.reminders.entries()) {
      syncTasks.push(syncDocToFirestore('reminders', id, rem));
    }
    for (const [id, hr] of store.healthRecords.entries()) {
      syncTasks.push(syncDocToFirestore('healthRecords', id, hr));
    }
    for (const [id, ac] of store.articleCategories.entries()) {
      syncTasks.push(syncDocToFirestore('articleCategories', id, ac));
    }
    for (const [id, art] of store.articles.entries()) {
      syncTasks.push(syncDocToFirestore('articles', id, art));
    }
    await Promise.all(syncTasks);
  } catch (err) {
    console.error('[Firestore] Error persisting store to Firestore:', err);
  }
}

// Load remote documents from Firestore into store map or seed Firestore if empty
export async function initializeAndSyncFirestore(store: PlantifyStore): Promise<void> {
  try {
    const remoteUsers = await loadCollectionFromFirestore<User>('users');
    if (remoteUsers.size > 0) {
      // Remote Firestore has data! Hydrate in-memory store from Firestore
      for (const [id, user] of remoteUsers.entries()) {
        store.users.set(id, user);
      }
      const remoteCategories = await loadCollectionFromFirestore<PlantCategory>('plantCategories');
      for (const [id, cat] of remoteCategories.entries()) {
        store.plantCategories.set(id, cat);
      }
      const remotePlants = await loadCollectionFromFirestore<Plant>('plants');
      for (const [id, plant] of remotePlants.entries()) {
        store.plants.set(id, plant);
      }
      const remoteUserPlants = await loadCollectionFromFirestore<UserPlant>('userPlants');
      for (const [id, up] of remoteUserPlants.entries()) {
        store.userPlants.set(id, up);
      }
      const remoteSchedules = await loadCollectionFromFirestore<WateringSchedule>('wateringSchedules');
      for (const [id, ws] of remoteSchedules.entries()) {
        store.wateringSchedules.set(id, ws);
      }
      const remoteLogs = await loadCollectionFromFirestore<WateringLog>('wateringLogs');
      for (const [id, log] of remoteLogs.entries()) {
        store.wateringLogs.set(id, log);
      }
      const remoteReminders = await loadCollectionFromFirestore<Reminder>('reminders');
      for (const [id, rem] of remoteReminders.entries()) {
        store.reminders.set(id, rem);
      }
      const remoteHealth = await loadCollectionFromFirestore<PlantHealthRecord>('healthRecords');
      for (const [id, hr] of remoteHealth.entries()) {
        store.healthRecords.set(id, hr);
      }
      const remoteArticleCats = await loadCollectionFromFirestore<ArticleCategory>('articleCategories');
      for (const [id, ac] of remoteArticleCats.entries()) {
        store.articleCategories.set(id, ac);
      }
      const remoteArticles = await loadCollectionFromFirestore<Article>('articles');
      for (const [id, art] of remoteArticles.entries()) {
        store.articles.set(id, art);
      }
      const remoteActivities = await loadActivitiesFromFirestore();
      if (remoteActivities.length > 0) {
        store.activities = remoteActivities;
      }
      console.log('[Firestore] Successfully hydrated store from existing Firestore documents.');
    } else {
      // First time initialization: populate Firestore with default seed data
      console.log('[Firestore] Seeding initial collections in Firestore...');
      await persistStoreToFirestore(store);
      console.log('[Firestore] Initial Firestore seeding complete.');
    }
  } catch (err) {
    console.error('[Firestore] Initialization error:', err);
  }
}

