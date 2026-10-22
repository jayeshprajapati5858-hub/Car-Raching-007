import { LiveRaceTelemetry } from '../types/game';

export interface VehicleControlInputs {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  analogSteer: number; // -1 (left) to +1 (right), used when wheel or tilt steering is active
  useAnalog: boolean;
  nitro: boolean;
  drift: boolean;
  resetRequested: boolean;
}

export const controlInputs: VehicleControlInputs = {
  throttle: false,
  brake: false,
  left: false,
  right: false,
  analogSteer: 0,
  useAnalog: false,
  nitro: false,
  drift: false,
  resetRequested: false,
};

export function clearControlInputs() {
  controlInputs.throttle = false;
  controlInputs.brake = false;
  controlInputs.left = false;
  controlInputs.right = false;
  controlInputs.analogSteer = 0;
  controlInputs.useAnalog = false;
  controlInputs.nitro = false;
  controlInputs.drift = false;
  controlInputs.resetRequested = false;
}

export const liveTelemetry: LiveRaceTelemetry = {
  racePhase: 'READY',
  countdownStage: null,
  speedKmh: 0,
  rpmNormalized: 0,
  gear: 1,
  nitroAmount: 100,
  nitroActive: false,
  isDrifting: false,
  driftScoreCurrent: 0,
  driftScoreTotal: 0,
  nearMissCount: 0,
  lap: 1,
  totalLaps: 2,
  position: 1,
  totalRacers: 4,
  elapsedMs: 0,
  currentLapMs: 0,
  bestLapMs: null,
  countdownValue: -1,
  checkpointIndex: 0,
  totalCheckpoints: 12,
  wrongWay: false,
  offTrack: false,
  fps: 60,
  standings: [],
  minimapPoints: [],
  minimapRacers: [],
};
