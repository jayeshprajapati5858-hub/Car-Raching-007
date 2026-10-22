import { CAR_CATALOG } from '../data/cars';
import { DAILY_MISSIONS_CATALOG } from '../data/dailyMissions';
import { CarId, SaveDataSchema } from '../types/game';

const DB_NAME = 'NitroRushStreetLegendsDB';
const DB_VERSION = 1;
const STORE_NAME = 'player_save';
const SAVE_KEY = 'save_v1';
const LOCAL_STORAGE_KEY = 'nitro_rush_save_v1';
const CURRENT_SCHEMA_VERSION = 1;

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultDailyMissions(): Record<string, { progress: number; completed: boolean; claimed: boolean }> {
  const missions: Record<string, { progress: number; completed: boolean; claimed: boolean }> = {};
  for (const m of DAILY_MISSIONS_CATALOG) {
    missions[m.id] = { progress: 0, completed: false, claimed: false };
  }
  return missions;
}

export function createDefaultSaveData(): SaveDataSchema {
  const carIds: CarId[] = ['vortex_gtr', 'kuroshi_raijin', 'apex_specter', 'hyperion_valkyrie'];
  const upgrades = {} as SaveDataSchema['upgrades'];
  const customizations = {} as SaveDataSchema['customizations'];

  for (const id of carIds) {
    const def = CAR_CATALOG[id];
    upgrades[id] = { engine: 0, tires: 0, brakes: 0, nitro: 0 };
    customizations[id] = {
      bodyColor: def.defaultBodyColor,
      wheelColor: def.defaultWheelColor,
      accentColor: def.defaultAccentColor,
      skinId: 'factory_stock',
    };
  }

  return {
    version: CURRENT_SCHEMA_VERSION,
    playerName: 'Racer_01',
    level: 1,
    xp: 0,
    coins: 2500, // Starter balance so players can test upgrades immediately
    totalRaces: 0,
    totalWins: 0,
    totalDriftPoints: 0,
    totalDistanceKm: 0,
    highwayBestScore: 0,
    highwayBestDistanceM: 0,
    highwayCompletedMissions: [],
    selectedCarId: 'vortex_gtr',
    ownedCars: ['vortex_gtr'],
    upgrades,
    customizations,
    missionProgress: {},
    bestTrackTimesMs: {},
    dailyRewardLastClaimedAt: null,
    dailyRewardStreak: 0,
    dailyMissions: createDefaultDailyMissions(),
    dailyMissionsDate: getTodayDateString(),
    ownedCosmetics: ['factory_stock'],
    adFreeOwned: false,
    garageTheme: 'cyber_bay',
    claimedRaceSessionIds: [],
    settings: {
      graphicsQuality: 'high',
      steeringMode: 'buttons',
      steeringSensitivity: 1.0,
      masterVolume: 0.8,
      musicVolume: 0.45,
      sfxVolume: 0.85,
      muted: false,
      vibration: true,
      reducedMotion: false,
      language: 'en',
      showFps: false,
    },
  };
}

export function sanitizeAndMigrateSave(raw: unknown): SaveDataSchema {
  const defaults = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  try {
    const data = raw as Partial<SaveDataSchema>;
    const today = getTodayDateString();
    let dailyMissions = data.dailyMissions && typeof data.dailyMissions === 'object' ? data.dailyMissions : defaults.dailyMissions;
    let dailyMissionsDate = typeof data.dailyMissionsDate === 'string' ? data.dailyMissionsDate : today;

    // Reset daily missions if day changed
    if (dailyMissionsDate !== today) {
      dailyMissions = createDefaultDailyMissions();
      dailyMissionsDate = today;
    } else {
      // Ensure all catalog missions exist in loaded record
      for (const m of DAILY_MISSIONS_CATALOG) {
        if (!dailyMissions[m.id]) {
          dailyMissions[m.id] = { progress: 0, completed: false, claimed: false };
        }
      }
    }

    const merged: SaveDataSchema = {
      ...defaults,
      ...data,
      version: CURRENT_SCHEMA_VERSION,
      coins: typeof data.coins === 'number' && Number.isFinite(data.coins) && data.coins >= 0 ? Math.floor(data.coins) : defaults.coins,
      level: typeof data.level === 'number' && data.level >= 1 ? Math.floor(data.level) : defaults.level,
      xp: typeof data.xp === 'number' && data.xp >= 0 ? Math.floor(data.xp) : defaults.xp,
      highwayBestScore: typeof data.highwayBestScore === 'number' && data.highwayBestScore >= 0 ? Math.floor(data.highwayBestScore) : 0,
      highwayBestDistanceM: typeof data.highwayBestDistanceM === 'number' && data.highwayBestDistanceM >= 0 ? Math.floor(data.highwayBestDistanceM) : 0,
      highwayCompletedMissions: Array.isArray(data.highwayCompletedMissions) ? data.highwayCompletedMissions : [],
      ownedCars: Array.isArray(data.ownedCars) && data.ownedCars.includes('vortex_gtr')
        ? (Array.from(new Set(data.ownedCars)) as CarId[])
        : defaults.ownedCars,
      selectedCarId:
        data.selectedCarId && CAR_CATALOG[data.selectedCarId]
          ? data.selectedCarId
          : 'vortex_gtr',
      upgrades: {
        ...defaults.upgrades,
        ...(data.upgrades || {}),
      },
      customizations: {
        ...defaults.customizations,
        ...(data.customizations || {}),
      },
      missionProgress: data.missionProgress && typeof data.missionProgress === 'object' ? data.missionProgress : {},
      bestTrackTimesMs: data.bestTrackTimesMs && typeof data.bestTrackTimesMs === 'object' ? data.bestTrackTimesMs : {},
      dailyMissions,
      dailyMissionsDate,
      claimedRaceSessionIds: Array.isArray(data.claimedRaceSessionIds)
        ? data.claimedRaceSessionIds.slice(-100)
        : [],
      settings: {
        ...defaults.settings,
        ...(data.settings || {}),
      },
    };

    if (!merged.ownedCars.includes(merged.selectedCarId)) {
      merged.selectedCarId = 'vortex_gtr';
    }

    return merged;
  } catch {
    return defaults;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class SaveManager {
  static loadSyncFallback(): SaveDataSchema {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return createDefaultSaveData();
      return sanitizeAndMigrateSave(JSON.parse(raw));
    } catch {
      return createDefaultSaveData();
    }
  }

  static async load(): Promise<SaveDataSchema> {
    try {
      const db = await openDatabase();
      return await new Promise<SaveDataSchema>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SAVE_KEY);
        req.onsuccess = () => {
          db.close();
          if (req.result) {
            const clean = sanitizeAndMigrateSave(req.result);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
            } catch {
              // Ignore quota errors
            }
            resolve(clean);
          } else {
            const fallback = SaveManager.loadSyncFallback();
            resolve(fallback);
          }
        };
        req.onerror = () => {
          db.close();
          resolve(SaveManager.loadSyncFallback());
        };
      });
    } catch {
      return SaveManager.loadSyncFallback();
    }
  }

  static async save(data: SaveDataSchema): Promise<void> {
    const clean = sanitizeAndMigrateSave(data);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore localStorage quota failure
    }

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(clean, SAVE_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    } catch {
      // Fallback already saved to localStorage
    }
  }

  static async reset(): Promise<SaveDataSchema> {
    const fresh = createDefaultSaveData();
    await SaveManager.save(fresh);
    return fresh;
  }
}
