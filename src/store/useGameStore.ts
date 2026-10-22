import { create } from 'zustand';
import { CAR_CATALOG, getUpgradeCost, UPGRADE_MAX_LEVEL } from '../data/cars';
import { CAREER_MISSIONS } from '../data/careerMissions';
import { DAILY_MISSIONS_CATALOG } from '../data/dailyMissions';
import { TRACK_CATALOG } from '../data/tracks';
import { audioManager } from '../services/AudioManager';
import { SaveManager } from '../services/SaveManager';
import {
  ActiveRaceConfig,
  CameraMode,
  CarCustomization,
  CarId,
  PlayerSettings,
  RaceResultSummary,
  SaveDataSchema,
  ScreenId,
  UpgradeCategory,
} from '../types/game';
import { clearControlInputs } from '../game/RaceBridge';

interface GameStoreState {
  initialized: boolean;
  saveData: SaveDataSchema;
  screen: ScreenId;
  previewCarId: CarId;
  activeRace: ActiveRaceConfig | null;
  isPaused: boolean;
  cameraMode: CameraMode;
  lastRaceResult: RaceResultSummary | null;
  raceRestartCounter: number;
  customGlbUrl: string | null;
  setCustomGlbUrl: (url: string | null) => void;

  // Actions
  initSave: () => Promise<void>;
  setScreen: (screen: ScreenId) => void;
  setPreviewCarId: (carId: CarId) => void;
  selectCar: (carId: CarId) => void;
  buyCar: (carId: CarId) => boolean;
  upgradeCar: (carId: CarId, category: UpgradeCategory) => boolean;
  updateCustomization: (carId: CarId, partial: Partial<CarCustomization>) => void;
  updateSettings: (partial: Partial<PlayerSettings>) => void;
  setPlayerName: (name: string) => void;
  cycleCameraMode: () => void;

  // Race lifecycle
  startQuickRace: (config?: Partial<ActiveRaceConfig>) => void;
  startCareerMission: (missionId: number) => void;
  setPaused: (paused: boolean) => void;
  restartActiveRace: () => void;
  completeRace: (outcome: {
    finished: boolean;
    position: number;
    totalRacers: number;
    elapsedMs: number;
    bestLapMs: number | null;
    driftScore: number;
    nearMisses: number;
  }) => void;
  quitRaceToMenu: (targetScreen?: ScreenId) => void;

  // Rewards & Cosmetics
  canClaimDailyReward: () => boolean;
  claimDailyReward: () => { granted: boolean; coins: number; streak: number };
  grantSandboxBonusCoins: (amount: number) => void;
  unlockCosmeticWithCoins: (cosmeticId: string, coinCost: number) => boolean;
  unlockGarageThemeWithCoins: (themeId: 'cyber_bay' | 'obsidian_vault' | 'solar_hangar', coinCost: number) => boolean;
  setGarageTheme: (themeId: 'cyber_bay' | 'obsidian_vault' | 'solar_hangar') => void;
  activateSandboxAdFree: () => void;
  updateDailyMissionProgress: (missionId: string, amount: number, isAbsolute?: boolean) => void;
  claimDailyMissionReward: (missionId: string) => { granted: boolean; coins: number; decalId?: string };
  resetAllProgress: () => Promise<void>;
}

function calculateLevelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 120)) + 1);
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const initialSave = SaveManager.loadSyncFallback();

  return {
    initialized: false,
    saveData: initialSave,
    screen: 'main_menu',
    previewCarId: initialSave.selectedCarId,
    activeRace: null,
    isPaused: false,
    cameraMode: 'chase',
    lastRaceResult: null,
    raceRestartCounter: 0,
    customGlbUrl: null,
    setCustomGlbUrl: (url) => {
      set({ customGlbUrl: url });
      if (typeof window !== 'undefined') {
        (window as any).__customGlbUrl = url;
      }
    },

    initSave: async () => {
      const loaded = await SaveManager.load();
      audioManager.updateSettings(
        loaded.settings.masterVolume,
        loaded.settings.musicVolume,
        loaded.settings.sfxVolume,
        loaded.settings.muted
      );
      set({
        initialized: true,
        saveData: loaded,
        previewCarId: loaded.selectedCarId,
      });
    },

    setScreen: (screen) => {
      audioManager.playClick();
      clearControlInputs();
      if (screen !== 'racing') {
        audioManager.setRacingActive(false);
      }
      set((state) => ({
        screen,
        isPaused: false,
        previewCarId: screen === 'garage' ? state.saveData.selectedCarId : state.previewCarId,
      }));
    },

    setPreviewCarId: (carId) => {
      audioManager.playClick();
      set({ previewCarId: carId });
    },

    selectCar: (carId) => {
      const { saveData } = get();
      if (!saveData.ownedCars.includes(carId)) return;
      audioManager.playClick();
      const updated: SaveDataSchema = {
        ...saveData,
        selectedCarId: carId,
      };
      set({ saveData: updated, previewCarId: carId });
      SaveManager.save(updated);
    },

    buyCar: (carId) => {
      const { saveData } = get();
      const carDef = CAR_CATALOG[carId];
      if (!carDef) return false;
      if (saveData.ownedCars.includes(carId)) return false;
      if (saveData.coins < carDef.price) return false;

      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins - carDef.price,
        ownedCars: [...saveData.ownedCars, carId],
        selectedCarId: carId,
      };
      set({ saveData: updated, previewCarId: carId });
      SaveManager.save(updated);
      return true;
    },

    upgradeCar: (carId, category) => {
      const { saveData } = get();
      if (!saveData.ownedCars.includes(carId)) return false;
      const currentLevels = saveData.upgrades[carId] || { engine: 0, tires: 0, brakes: 0, nitro: 0 };
      const currentLvl = currentLevels[category];
      if (currentLvl >= UPGRADE_MAX_LEVEL) return false;

      const cost = getUpgradeCost(carId, category, currentLvl);
      if (saveData.coins < cost) return false;

      audioManager.playCheckpoint();
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins - cost,
        upgrades: {
          ...saveData.upgrades,
          [carId]: {
            ...currentLevels,
            [category]: currentLvl + 1,
          },
        },
      };
      set({ saveData: updated });
      SaveManager.save(updated);
      return true;
    },

    updateCustomization: (carId, partial) => {
      const { saveData } = get();
      audioManager.playClick();
      const current = saveData.customizations[carId];
      const updated: SaveDataSchema = {
        ...saveData,
        customizations: {
          ...saveData.customizations,
          [carId]: {
            ...current,
            ...partial,
          },
        },
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    updateSettings: (partial) => {
      const { saveData } = get();
      const newSettings: PlayerSettings = {
        ...saveData.settings,
        ...partial,
      };
      audioManager.updateSettings(
        newSettings.masterVolume,
        newSettings.musicVolume,
        newSettings.sfxVolume,
        newSettings.muted
      );
      const updated: SaveDataSchema = {
        ...saveData,
        settings: newSettings,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    setPlayerName: (name) => {
      const { saveData } = get();
      const cleanName = name.trim().slice(0, 18) || 'Racer_01';
      const updated: SaveDataSchema = {
        ...saveData,
        playerName: cleanName,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    cycleCameraMode: () => {
      audioManager.playClick();
      const modes: CameraMode[] = ['chase', 'far_chase', 'hood'];
      const current = get().cameraMode;
      const next = modes[(modes.indexOf(current) + 1) % modes.length];
      set({ cameraMode: next });
    },

    startQuickRace: (partialConfig) => {
      audioManager.unlock();
      audioManager.playClick();
      clearControlInputs();

      const trackId = partialConfig?.trackId && TRACK_CATALOG[partialConfig.trackId]?.playable
        ? partialConfig.trackId
        : 'neon_city';
      const trackDef = TRACK_CATALOG[trackId];

      const raceConfig: ActiveRaceConfig = {
        sessionId: `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        mode: partialConfig?.mode || 'quick_race',
        trackId,
        laps: partialConfig?.laps || trackDef.defaultLaps,
        aiCount: partialConfig?.aiCount ?? (partialConfig?.mode === 'time_trial' || partialConfig?.mode === 'drift_challenge' ? 0 : 3),
        aiDifficulty: partialConfig?.aiDifficulty || 'normal',
        missionId: partialConfig?.missionId,
      };

      audioManager.setRacingActive(true);
      set((state) => ({
        activeRace: raceConfig,
        screen: 'racing',
        isPaused: false,
        lastRaceResult: null,
        raceRestartCounter: state.raceRestartCounter + 1,
      }));
    },

    startCareerMission: (missionId) => {
      const mission = CAREER_MISSIONS.find((m) => m.id === missionId);
      if (!mission) return;
      get().startQuickRace({
        mode: mission.mode,
        trackId: mission.trackId,
        laps: mission.laps,
        aiCount: mission.aiCount,
        aiDifficulty: mission.aiDifficulty,
        missionId: mission.id,
      });
    },

    setPaused: (paused) => {
      audioManager.playClick();
      clearControlInputs();
      set({ isPaused: paused });
    },

    restartActiveRace: () => {
      const { activeRace } = get();
      if (!activeRace) return;
      audioManager.playClick();
      clearControlInputs();
      const freshConfig: ActiveRaceConfig = {
        ...activeRace,
        sessionId: `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      audioManager.setRacingActive(true);
      set((state) => ({
        activeRace: freshConfig,
        isPaused: false,
        lastRaceResult: null,
        raceRestartCounter: state.raceRestartCounter + 1,
      }));
    },

    completeRace: (outcome) => {
      const { activeRace, saveData } = get();
      if (!activeRace) return;

      clearControlInputs();
      audioManager.setRacingActive(false);

      // Anti-farming check: verify sessionId has not been claimed yet
      const alreadyClaimed = saveData.claimedRaceSessionIds.includes(activeRace.sessionId);
      if (alreadyClaimed) {
        return;
      }

      let starsEarned = 0;
      let missionPassed = false;
      let coinsEarned = 0;
      let firstClearBonus = 0;
      let xpEarned = 0;

      const elapsedSec = outcome.elapsedMs / 1000;

      if (activeRace.missionId) {
        const mission = CAREER_MISSIONS.find((m) => m.id === activeRace.missionId);
        if (mission) {
          if (mission.mode === 'drift_challenge') {
            const target = mission.targetDriftScore || 1200;
            if (outcome.driftScore >= target) starsEarned = 1;
            if (outcome.driftScore >= target * 1.65) starsEarned = 2;
            if (outcome.driftScore >= target * 2.5) starsEarned = 3;
            missionPassed = starsEarned >= 1;
          } else if (mission.mode === 'time_trial') {
            const target = mission.targetTimeSec || 60;
            if (elapsedSec <= target) starsEarned = 1;
            if (elapsedSec <= target * 0.91) starsEarned = 2;
            if (elapsedSec <= target * 0.84) starsEarned = 3;
            missionPassed = starsEarned >= 1;
          } else if (mission.mode === 'traffic_run') {
            const target = mission.targetTimeSec || 70;
            if (elapsedSec <= target) starsEarned = 1;
            if (elapsedSec <= target * 0.91) starsEarned = 2;
            if (elapsedSec <= target * 0.91 && outcome.nearMisses >= 3) starsEarned = 3;
            missionPassed = starsEarned >= 1;
          } else {
            if (outcome.position <= mission.targetPosition) starsEarned = 1;
            if (outcome.position === 1) starsEarned = 2;
            if (outcome.position === 1 && (!mission.targetTimeSec || elapsedSec <= mission.targetTimeSec)) {
              starsEarned = 3;
            }
            missionPassed = starsEarned >= 1;
          }

          const prevProgress = saveData.missionProgress[mission.id];
          const isFirstClear = (!prevProgress || prevProgress.stars === 0) && missionPassed;

          coinsEarned = missionPassed
            ? mission.rewards.coins + (starsEarned - 1) * 200
            : Math.round(mission.rewards.coins * 0.25);
          firstClearBonus = isFirstClear ? mission.rewards.firstClearBonusCoins : 0;
          xpEarned = missionPassed ? mission.rewards.xp : Math.round(mission.rewards.xp * 0.3);
        }
      } else {
        // Quick Race / Custom Mode rewards
        const placementFactor = outcome.position === 1 ? 1.0 : outcome.position === 2 ? 0.7 : outcome.position === 3 ? 0.5 : 0.35;
        coinsEarned = Math.round((650 * activeRace.laps * placementFactor) + Math.min(500, outcome.driftScore * 0.12) + outcome.nearMisses * 60);
        xpEarned = Math.round(140 * activeRace.laps * placementFactor);
        starsEarned = outcome.position === 1 ? 3 : outcome.position === 2 ? 2 : outcome.position === 3 ? 1 : 0;
        missionPassed = outcome.position <= 3;
      }

      audioManager.playVictory(outcome.position === 1 || missionPassed);

      const newMissionProgress = { ...saveData.missionProgress };
      if (activeRace.missionId) {
        const prev = newMissionProgress[activeRace.missionId] || {
          stars: 0,
          bestTimeMs: null,
          bestDriftScore: 0,
          completedCount: 0,
        };
        newMissionProgress[activeRace.missionId] = {
          stars: Math.max(prev.stars, starsEarned),
          bestTimeMs:
            prev.bestTimeMs === null
              ? outcome.elapsedMs
              : Math.min(prev.bestTimeMs, outcome.elapsedMs),
          bestDriftScore: Math.max(prev.bestDriftScore, Math.floor(outcome.driftScore)),
          completedCount: prev.completedCount + (missionPassed ? 1 : 0),
        };
      }

      const bestTrackTimesMs = { ...saveData.bestTrackTimesMs };
      const prevTrackBest = bestTrackTimesMs[activeRace.trackId];
      if (!prevTrackBest || outcome.elapsedMs < prevTrackBest) {
        bestTrackTimesMs[activeRace.trackId] = Math.round(outcome.elapsedMs);
      }

      const trackLength = TRACK_CATALOG[activeRace.trackId]?.lengthKm || 3.0;
      const newXp = saveData.xp + xpEarned;
      const newLevel = calculateLevelFromXp(newXp);

      const updatedSave: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins + coinsEarned + firstClearBonus,
        xp: newXp,
        level: newLevel,
        totalRaces: saveData.totalRaces + 1,
        totalWins: saveData.totalWins + (outcome.position === 1 ? 1 : 0),
        totalDriftPoints: saveData.totalDriftPoints + Math.floor(outcome.driftScore),
        totalDistanceKm: Number((saveData.totalDistanceKm + trackLength * activeRace.laps).toFixed(1)),
        missionProgress: newMissionProgress,
        bestTrackTimesMs,
        claimedRaceSessionIds: [...saveData.claimedRaceSessionIds.slice(-99), activeRace.sessionId],
      };

      const summary: RaceResultSummary = {
        sessionId: activeRace.sessionId,
        finished: outcome.finished,
        position: outcome.position,
        totalRacers: outcome.totalRacers,
        elapsedMs: outcome.elapsedMs,
        bestLapMs: outcome.bestLapMs,
        driftScore: Math.floor(outcome.driftScore),
        nearMisses: outcome.nearMisses,
        starsEarned,
        coinsEarned,
        firstClearBonus,
        xpEarned,
        missionId: activeRace.missionId,
        missionPassed,
        alreadyClaimed: false,
      };

      set({
        saveData: updatedSave,
        lastRaceResult: summary,
      });
      SaveManager.save(updatedSave);

      // Trigger Daily Mission progress updates
      const store = get();
      if (activeRace.mode.startsWith('highway_')) {
        store.updateDailyMissionProgress('finish_3_highway', 1);
      } else {
        if (activeRace.trackId === 'neon_city' && outcome.position === 1) {
          store.updateDailyMissionProgress('win_neon_race', 1);
        }
      }
      if (outcome.driftScore > 0) {
        store.updateDailyMissionProgress('drift_500m', Math.floor(outcome.driftScore * 0.4));
      }
    },

    quitRaceToMenu: (targetScreen = 'main_menu') => {
      audioManager.playClick();
      clearControlInputs();
      audioManager.setRacingActive(false);
      set({
        screen: targetScreen,
        activeRace: null,
        isPaused: false,
        lastRaceResult: null,
      });
    },

    canClaimDailyReward: () => {
      const { dailyRewardLastClaimedAt } = get().saveData;
      if (!dailyRewardLastClaimedAt) return true;
      const elapsedHours = (Date.now() - dailyRewardLastClaimedAt) / (1000 * 60 * 60);
      return elapsedHours >= 20;
    },

    claimDailyReward: () => {
      const { saveData, canClaimDailyReward } = get();
      if (!canClaimDailyReward()) {
        return { granted: false, coins: 0, streak: saveData.dailyRewardStreak };
      }

      const nextStreak = (saveData.dailyRewardStreak % 7) + 1;
      const rewardTable = [600, 850, 1100, 1400, 1800, 2200, 3500];
      const coins = rewardTable[nextStreak - 1] || 600;

      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins + coins,
        dailyRewardLastClaimedAt: Date.now(),
        dailyRewardStreak: nextStreak,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
      return { granted: true, coins, streak: nextStreak };
    },

    grantSandboxBonusCoins: (amount) => {
      const { saveData } = get();
      if (amount <= 0) return;
      audioManager.playCheckpoint();
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins + amount,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    unlockCosmeticWithCoins: (cosmeticId, coinCost) => {
      const { saveData } = get();
      if (saveData.ownedCosmetics.includes(cosmeticId)) return false;
      if (saveData.coins < coinCost) return false;

      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins - coinCost,
        ownedCosmetics: [...saveData.ownedCosmetics, cosmeticId],
      };
      set({ saveData: updated });
      SaveManager.save(updated);
      return true;
    },

    unlockGarageThemeWithCoins: (themeId, coinCost) => {
      const { saveData } = get();
      const key = `theme_${themeId}`;
      if (saveData.ownedCosmetics.includes(key)) {
        set({ saveData: { ...saveData, garageTheme: themeId } });
        return true;
      }
      if (saveData.coins < coinCost) return false;

      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        coins: saveData.coins - coinCost,
        ownedCosmetics: [...saveData.ownedCosmetics, key],
        garageTheme: themeId,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
      return true;
    },

    setGarageTheme: (themeId) => {
      const { saveData } = get();
      const updated: SaveDataSchema = {
        ...saveData,
        garageTheme: themeId,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    activateSandboxAdFree: () => {
      const { saveData } = get();
      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        adFreeOwned: true,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    updateDailyMissionProgress: (missionId, amount, isAbsolute = false) => {
      const { saveData } = get();
      const missionDef = DAILY_MISSIONS_CATALOG.find((m) => m.id === missionId);
      if (!missionDef) return;

      const currentMissions = { ...saveData.dailyMissions };
      const currentEntry = currentMissions[missionId] || { progress: 0, completed: false, claimed: false };
      if (currentEntry.completed || currentEntry.claimed) return;

      const newProg = isAbsolute ? amount : currentEntry.progress + amount;
      const isCompleted = newProg >= missionDef.target;

      currentMissions[missionId] = {
        ...currentEntry,
        progress: Math.min(missionDef.target, newProg),
        completed: isCompleted,
      };

      const updated: SaveDataSchema = {
        ...saveData,
        dailyMissions: currentMissions,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
    },

    claimDailyMissionReward: (missionId) => {
      const { saveData } = get();
      const missionDef = DAILY_MISSIONS_CATALOG.find((m) => m.id === missionId);
      if (!missionDef) return { granted: false, coins: 0 };

      const currentMissions = { ...saveData.dailyMissions };
      const currentEntry = currentMissions[missionId];
      if (!currentEntry || !currentEntry.completed || currentEntry.claimed) {
        return { granted: false, coins: 0 };
      }

      currentMissions[missionId] = {
        ...currentEntry,
        claimed: true,
      };

      let newCoins = saveData.coins + missionDef.rewardCoins;
      let newCosmetics = [...saveData.ownedCosmetics];
      if (missionDef.rewardDecalId && !newCosmetics.includes(missionDef.rewardDecalId)) {
        newCosmetics.push(missionDef.rewardDecalId);
      }

      audioManager.playVictory(true);
      const updated: SaveDataSchema = {
        ...saveData,
        coins: newCoins,
        ownedCosmetics: newCosmetics,
        dailyMissions: currentMissions,
      };
      set({ saveData: updated });
      SaveManager.save(updated);
      return { granted: true, coins: missionDef.rewardCoins, decalId: missionDef.rewardDecalId };
    },

    resetAllProgress: async () => {
      audioManager.playClick();
      const fresh = await SaveManager.reset();
      set({
        saveData: fresh,
        previewCarId: fresh.selectedCarId,
        screen: 'main_menu',
        activeRace: null,
        lastRaceResult: null,
      });
    },
  };
});
