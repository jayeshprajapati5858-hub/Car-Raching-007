export type ScreenId =
  | 'main_menu'
  | 'career'
  | 'quick_race'
  | 'garage'
  | 'car_shop'
  | 'daily_rewards'
  | 'daily_missions'
  | 'lucky_spin'
  | 'premium_shop'
  | 'settings'
  | 'profile'
  | 'racing'
  | 'highway_setup'
  | 'monetization_hub';

export type CarId = 'vortex_gtr' | 'apex_specter' | 'kuroshi_raijin' | 'hyperion_valkyrie';

export type TrackId =
  | 'neon_city'
  | 'coastal_highway'
  | 'desert_canyon'
  | 'mountain_pass'
  | 'rainy_downtown'
  | 'industrial_harbor';

export type GameMode =
  | 'quick_race'
  | 'career'
  | 'time_trial'
  | 'drift_challenge'
  | 'traffic_run'
  | 'highway_endless'
  | 'highway_time'
  | 'highway_mission';

export type AIDifficulty = 'beginner' | 'normal' | 'hard';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type SteeringMode = 'buttons' | 'wheel' | 'tilt';

export type CameraMode = 'chase' | 'far_chase' | 'hood';

export type LanguageCode = 'en' | 'hi';

export type UpgradeCategory = 'engine' | 'tires' | 'brakes' | 'nitro';

export interface CarStats {
  topSpeed: number;      // e.g. 240 - 360 KM/H
  acceleration: number;  // 1 - 100 scale
  handling: number;      // 1 - 100 scale
  braking: number;       // 1 - 100 scale
  nitroPower: number;    // 1 - 100 scale
}

export interface CarDefinition {
  id: CarId;
  name: string;
  manufacturer: string;
  classLabel: string;
  price: number;
  unlockMission?: number;
  description: string;
  baseStats: CarStats;
  defaultBodyColor: string;
  defaultWheelColor: string;
  defaultAccentColor: string;
  bodyStyle: 'coupe' | 'supercar' | 'drift' | 'hypercar';
}

export interface CarUpgradeLevels {
  engine: number; // 0 to 5
  tires: number;  // 0 to 5
  brakes: number; // 0 to 5
  nitro: number;  // 0 to 5
}

export interface CarCustomization {
  bodyColor: string;
  wheelColor: string;
  accentColor: string;
  skinId: string;
}

export interface TrackDefinition {
  id: TrackId;
  name: string;
  region: string;
  lengthKm: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  playable: boolean;
  unlockLevel: number;
  description: string;
  theme: {
    skyTop: string;
    skyHorizon: string;
    fogColor: string;
    fogDensity: number;
    roadColor: string;
    curbPrimary: string;
    curbSecondary: string;
    buildingBase: string;
    neonPrimary: string;
    neonSecondary: string;
    groundColor: string;
    sunColor: string;
    sunIntensity: number;
    ambientColor: string;
    hemisphereGround: string;
    isNight: boolean;
  };
  controlPoints: [number, number, number][];
  roadWidth: number;
  defaultLaps: number;
}

export interface CareerMission {
  id: number;
  title: string;
  subtitle: string;
  chapter: number;
  trackId: TrackId;
  mode: GameMode;
  laps: number;
  aiCount: number;
  aiDifficulty: AIDifficulty;
  targetPosition: number;      // For race modes
  targetTimeSec?: number;      // For time trial or 3-star goal
  targetDriftScore?: number;   // For drift challenge
  rewards: {
    coins: number;
    xp: number;
    firstClearBonusCoins: number;
  };
  starCriteria: [string, string, string];
  unlockRequirementText: string;
}

export interface PlayerSettings {
  graphicsQuality: GraphicsQuality;
  steeringMode: SteeringMode;
  steeringSensitivity: number; // 0.5 to 1.8
  masterVolume: number;        // 0 to 1
  musicVolume: number;         // 0 to 1
  sfxVolume: number;           // 0 to 1
  muted: boolean;
  vibration: boolean;
  reducedMotion: boolean;
  language: LanguageCode;
  showFps: boolean;
}

export interface MissionProgress {
  stars: number; // 0 to 3
  bestTimeMs: number | null;
  bestDriftScore: number;
  completedCount: number;
}

export interface DailyMissionDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardDecalId?: string;
}

export interface DailyMissionProgress {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface SaveDataSchema {
  version: number;
  playerName: string;
  level: number;
  xp: number;
  coins: number;
  totalRaces: number;
  totalWins: number;
  totalDriftPoints: number;
  totalDistanceKm: number;
  highwayBestScore: number;
  highwayBestDistanceM: number;
  highwayCompletedMissions: number[];
  selectedCarId: CarId;
  ownedCars: CarId[];
  upgrades: Record<CarId, CarUpgradeLevels>;
  customizations: Record<CarId, CarCustomization>;
  missionProgress: Record<number, MissionProgress>;
  bestTrackTimesMs: Record<string, number>;
  dailyRewardLastClaimedAt: number | null;
  dailyRewardStreak: number;
  dailyMissions: Record<string, DailyMissionProgress>;
  dailyMissionsDate: string;
  ownedCosmetics: string[];
  adFreeOwned: boolean;
  garageTheme: 'cyber_bay' | 'obsidian_vault' | 'solar_hangar';
  claimedRaceSessionIds: string[];
  settings: PlayerSettings;
}

export interface ActiveRaceConfig {
  sessionId: string;
  mode: GameMode;
  trackId: TrackId;
  laps: number;
  aiCount: number;
  aiDifficulty: AIDifficulty;
  missionId?: number;
}

export interface RacerStandingsEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  carId: CarId;
  lap: number;
  checkpointIndex: number;
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number;
  color: string;
}

export type RacePhase = 'READY' | 'COUNTDOWN' | 'RACING' | 'FINISHED';

export type CountdownStage = '3' | '2' | '1' | 'GO' | null;

export interface LiveRaceTelemetry {
  racePhase: RacePhase;
  countdownStage: CountdownStage;
  speedKmh: number;
  rpmNormalized: number;
  gear: number;
  nitroAmount: number; // 0 to 100
  nitroActive: boolean;
  isDrifting: boolean;
  driftScoreCurrent: number;
  driftScoreTotal: number;
  nearMissCount: number;
  lap: number;
  totalLaps: number;
  position: number;
  totalRacers: number;
  elapsedMs: number;
  currentLapMs: number;
  bestLapMs: number | null;
  countdownValue: number; // 3, 2, 1, 0 (GO), -1 (hidden)
  checkpointIndex: number;
  totalCheckpoints: number;
  wrongWay: boolean;
  offTrack: boolean;
  fps: number;
  standings: RacerStandingsEntry[];
  minimapPoints: [number, number][]; // Normalized 0..1 2D track loop
  minimapRacers: { x: number; y: number; isPlayer: boolean; color: string }[];
}

export interface RaceResultSummary {
  sessionId: string;
  finished: boolean;
  position: number;
  totalRacers: number;
  elapsedMs: number;
  bestLapMs: number | null;
  driftScore: number;
  nearMisses: number;
  starsEarned: number;
  coinsEarned: number;
  firstClearBonus: number;
  xpEarned: number;
  missionId?: number;
  missionPassed: boolean;
  alreadyClaimed: boolean;
}
