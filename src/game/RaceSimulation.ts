import * as THREE from 'three';
import { computeEffectiveCarStats } from '../data/cars';
import { audioManager } from '../services/AudioManager';
import {
  ActiveRaceConfig,
  CameraMode,
  CarCustomization,
  CarId,
  CarStats,
  CountdownStage,
  PlayerSettings,
  RacePhase,
  RacerStandingsEntry,
} from '../types/game';
import { BuiltCarRig, buildProceduralCar } from './CarBuilder';
import { ParticlePool } from './ParticleSystem';
import { controlInputs, liveTelemetry } from './RaceBridge';
import { BuiltTrackWorld } from './TrackBuilder';

interface RacerVehicleState {
  id: string;
  name: string;
  isPlayer: boolean;
  isCivilian: boolean;
  carId: CarId;
  color: string;
  rig: BuiltCarRig;
  stats: CarStats;

  // Spatial & kinematics
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;             // Orientation in radians (0 points along -Z)
  speedMps: number;        // Forward speed in meters/second
  lateralSpeedMps: number; // Sideways drift velocity
  steerAngle: number;      // Current wheel steering angle
  wheelSpinAngle: number;
  bodyPitch: number;
  bodyRoll: number;

  // Racing state
  sampleIndex: number;
  lap: number;
  checkpointIndex: number;
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number;
  currentLapStartMs: number;
  bestLapMs: number | null;

  // Player-specific or AI-specific
  nitroAmount: number;
  nitroActive: boolean;
  isDrifting: boolean;
  driftScoreCurrent: number;
  driftScoreTotal: number;
  nearMissCount: number;
  nearMissCooldowns: Record<string, number>;

  // AI parameters
  targetLaneOffset: number;
  laneChangeTimer: number;
  aiSkillMultiplier: number;
}

const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _toOther = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();

const AI_NAMES = ['K. Takahashi', 'V. Vance', 'M. Rossi', 'E. Lindqvist', 'R. Mercer', 'T. Sato'];
const AI_CARS: CarId[] = ['vortex_gtr', 'kuroshi_raijin', 'apex_specter', 'hyperion_valkyrie'];
const AI_COLORS = ['#f97316', '#ef4444', '#a855f7', '#10b981', '#eab308', '#ec4899'];

export class RaceSimulation {
  private readonly scene: THREE.Scene;
  private readonly track: BuiltTrackWorld;
  private readonly config: ActiveRaceConfig;
  private readonly racers: RacerVehicleState[] = [];
  private readonly particles: ParticlePool;

  private racePhase: RacePhase = 'READY';
  private readyRemaining = 0.2;
  private countdownRemaining = 3.0;
  private goBannerRemaining = 0;
  private countdownStage: CountdownStage = null;
  private lastCountdownBeepInt = 4;
  private elapsedMs = 0;
  private raceCompletedTriggered = false;
  private cameraShakeIntensity = 0;
  private hitstopRemaining = 0;

  private camInitialized = false;
  private readonly currentCamPos = new THREE.Vector3();
  private readonly currentCamLook = new THREE.Vector3();

  private readonly minX: number;
  private readonly maxSpan: number;
  private readonly centerX: number;
  private readonly centerZ: number;

  constructor(
    scene: THREE.Scene,
    track: BuiltTrackWorld,
    config: ActiveRaceConfig,
    playerCarId: CarId,
    playerStats: CarStats,
    playerCustom: CarCustomization,
    isSoftwareGl: boolean
  ) {
    this.scene = scene;
    this.track = track;
    this.config = config;
    this.particles = new ParticlePool(isSoftwareGl ? 65 : 140);
    this.scene.add(this.particles.mesh);

    // Precompute bounding box for minimap
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const s of track.samples) {
      if (s.point.x < minX) minX = s.point.x;
      if (s.point.x > maxX) maxX = s.point.x;
      if (s.point.z < minZ) minZ = s.point.z;
      if (s.point.z > maxZ) maxZ = s.point.z;
    }
    this.minX = minX;
    this.centerX = (minX + maxX) * 0.5;
    this.centerZ = (minZ + maxZ) * 0.5;
    this.maxSpan = Math.max(1, Math.max(maxX - minX, maxZ - minZ) * 1.15);

    this.spawnRacers(playerCarId, playerStats, playerCustom, isSoftwareGl);
    this.syncTelemetry(60);
  }

  private spawnRacers(
    playerCarId: CarId,
    playerStats: CarStats,
    playerCustom: CarCustomization,
    isSoftwareGl: boolean
  ) {
    const totalCount = 1 + this.config.aiCount;
    const sampleCount = this.track.samples.length;
    const isTrafficMode = this.config.mode === 'traffic_run';

    for (let i = 0; i < totalCount; i++) {
      const isPlayer = i === 0;
      const isCivilian = !isPlayer && isTrafficMode;

      // Grid placement behind start line (or spread ahead for traffic run)
      let spawnSampleIdx: number;
      let laneOffset: number;

      if (isPlayer) {
        spawnSampleIdx = (sampleCount - 4) % sampleCount;
        laneOffset = -2.8;
      } else if (isCivilian) {
        spawnSampleIdx = Math.floor(((i * 45 + 25) % sampleCount));
        laneOffset = (i % 2 === 0 ? 1 : -1) * 3.6;
      } else {
        const row = Math.floor(i / 2);
        spawnSampleIdx = (sampleCount - 4 + row * 3) % sampleCount;
        laneOffset = i % 2 === 1 ? 2.8 : -2.8;
      }

      const sample = this.track.samples[spawnSampleIdx];
      const spawnPos = sample.point.clone().addScaledVector(sample.right, laneOffset);
      const spawnYaw = Math.atan2(-sample.tangent.x, -sample.tangent.z);

      const carId: CarId = isPlayer
        ? playerCarId
        : isCivilian
        ? 'vortex_gtr'
        : AI_CARS[i % AI_CARS.length];

      const color = isPlayer ? playerCustom.bodyColor : AI_COLORS[(i - 1) % AI_COLORS.length];
      const custom: CarCustomization = isPlayer
        ? playerCustom
        : {
            bodyColor: color,
            wheelColor: '#cbd5e1',
            accentColor: '#38bdf8',
            skinId: 'factory_stock',
          };

      const rig = buildProceduralCar(carId, custom, isSoftwareGl);
      rig.root.position.copy(spawnPos);
      rig.root.rotation.y = spawnYaw;
      this.scene.add(rig.root);

      const diffMult =
        this.config.aiDifficulty === 'beginner'
          ? 0.82
          : this.config.aiDifficulty === 'normal'
          ? 0.94
          : 1.03;

      const aiStats = computeEffectiveCarStats(carId, {
        engine: this.config.aiDifficulty === 'hard' ? 3 : 1,
        tires: 2,
        brakes: 2,
        nitro: 1,
      });

      this.racers.push({
        id: isPlayer ? 'player' : `ai_${i}`,
        name: isPlayer ? 'YOU' : isCivilian ? `Traffic ${i}` : AI_NAMES[(i - 1) % AI_NAMES.length],
        isPlayer,
        isCivilian,
        carId,
        color,
        rig,
        stats: isPlayer ? playerStats : aiStats,
        position: spawnPos,
        velocity: new THREE.Vector3(),
        yaw: spawnYaw,
        speedMps: 0,
        lateralSpeedMps: 0,
        steerAngle: 0,
        wheelSpinAngle: 0,
        bodyPitch: 0,
        bodyRoll: 0,
        sampleIndex: spawnSampleIdx,
        lap: 1,
        checkpointIndex: 0,
        totalProgress: 0,
        finished: false,
        finishTimeMs: 0,
        currentLapStartMs: 0,
        bestLapMs: null,
        nitroAmount: 100,
        nitroActive: false,
        isDrifting: false,
        driftScoreCurrent: 0,
        driftScoreTotal: 0,
        nearMissCount: 0,
        nearMissCooldowns: {},
        targetLaneOffset: laneOffset,
        laneChangeTimer: 2 + i * 1.3,
        aiSkillMultiplier: isCivilian ? 0.52 : diffMult * (0.96 + (i % 3) * 0.03),
      });
    }
  }

  public resetPlayerToTrack() {
    const player = this.racers[0];
    if (!player) return;
    const s = this.track.samples[player.sampleIndex];
    player.position.copy(s.point);
    player.yaw = Math.atan2(-s.tangent.x, -s.tangent.z);
    player.speedMps = 0;
    player.lateralSpeedMps = 0;
    player.steerAngle = 0;
    player.rig.root.position.copy(player.position);
    player.rig.root.rotation.y = player.yaw;
  }

  public update(
    rawDt: number,
    camera: THREE.PerspectiveCamera,
    cameraMode: CameraMode,
    settings: PlayerSettings,
    isPaused: boolean,
    onRaceFinished: (outcome: {
      finished: boolean;
      position: number;
      totalRacers: number;
      elapsedMs: number;
      bestLapMs: number | null;
      driftScore: number;
      nearMisses: number;
    }) => void
  ) {
    const dt = Math.min(rawDt, 0.05);
    const fps = rawDt > 0.001 ? Math.round(1 / rawDt) : 60;

    if (isPaused) {
      audioManager.updateVehicleAudio(0, 0, false, false, true);
      return;
    }

    if (controlInputs.resetRequested) {
      controlInputs.resetRequested = false;
      this.resetPlayerToTrack();
    }

    // Brief impact hitstop for heavy collisions (30-50ms)
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= dt;
      this.updateCamera(dt, camera, cameraMode, settings);
      return;
    }

    // State Machine: READY -> COUNTDOWN -> RACING -> FINISHED
    if (this.racePhase === 'READY') {
      this.readyRemaining -= dt;
      this.countdownStage = null;
      if (this.readyRemaining <= 0) {
        this.racePhase = 'COUNTDOWN';
        this.countdownRemaining = 3.0;
        this.countdownStage = '3';
        this.lastCountdownBeepInt = 3;
        audioManager.playCountdownBeep(false);
      }
      this.updateCamera(dt, camera, cameraMode, settings);
      this.syncTelemetry(fps);
      return;
    }

    if (this.racePhase === 'COUNTDOWN') {
      this.countdownRemaining -= dt;
      if (this.countdownRemaining > 0) {
        const ceilVal = Math.max(1, Math.min(3, Math.ceil(this.countdownRemaining)));
        this.countdownStage = String(ceilVal) as '3' | '2' | '1';
        if (ceilVal < this.lastCountdownBeepInt) {
          this.lastCountdownBeepInt = ceilVal;
          audioManager.playCountdownBeep(false);
        }
        this.updateCamera(dt, camera, cameraMode, settings);
        this.syncTelemetry(fps);
        return;
      } else {
        // Transition COUNTDOWN -> RACING and show "GO!" for 0.7s
        this.racePhase = 'RACING';
        this.countdownRemaining = 0;
        this.goBannerRemaining = 0.7;
        this.countdownStage = 'GO';
        this.lastCountdownBeepInt = 0;
        audioManager.playCountdownBeep(true);
      }
    }

    if (this.racePhase === 'RACING') {
      if (this.goBannerRemaining > 0) {
        this.goBannerRemaining = Math.max(0, this.goBannerRemaining - dt);
        this.countdownStage = this.goBannerRemaining > 0 ? 'GO' : null;
      } else {
        this.countdownStage = null;
      }
    } else if (this.racePhase === 'FINISHED') {
      this.countdownStage = null;
    }

    const player = this.racers[0];
    if (!player.finished) {
      this.elapsedMs += dt * 1000;
    }

    // Update all vehicles
    for (let i = 0; i < this.racers.length; i++) {
      const r = this.racers[i];
      if (r.isPlayer && !r.finished) {
        this.stepPlayerPhysics(r, dt, settings);
      } else {
        this.stepAIPhysics(r, dt, player.totalProgress);
      }
      this.updateProgressAndCheckpoints(r);
      this.animateCarVisualRig(r, dt);
    }

    this.resolveCarToCarInteractions(dt, settings);
    this.particles.update(dt);
    this.updateCamera(dt, camera, cameraMode, settings);

    // Update vehicle audio
    const speedKmh = Math.abs(player.speedMps) * 3.6;
    const maxKmh = player.stats.topSpeed;
    const gearRatio = (speedKmh % (maxKmh / 5)) / (maxKmh / 5);
    const rpmNorm = THREE.MathUtils.clamp(0.2 + gearRatio * 0.65 + (speedKmh / maxKmh) * 0.25, 0, 1);
    audioManager.updateVehicleAudio(speedKmh, rpmNorm, player.isDrifting, player.nitroActive, false);

    if (player.finished && !this.raceCompletedTriggered) {
      this.raceCompletedTriggered = true;
      this.racePhase = 'FINISHED';
      this.goBannerRemaining = 0;
      this.countdownStage = null;
      this.syncTelemetry(fps);
      onRaceFinished({
        finished: true,
        position: liveTelemetry.position,
        totalRacers: liveTelemetry.totalRacers,
        elapsedMs: player.finishTimeMs,
        bestLapMs: player.bestLapMs,
        driftScore: player.driftScoreTotal,
        nearMisses: player.nearMissCount,
      });
      return;
    }

    this.syncTelemetry(fps);
  }

  private stepPlayerPhysics(r: RacerVehicleState, dt: number, settings: PlayerSettings) {
    const maxSpeedMps = r.stats.topSpeed / 3.6;
    const accelRate = 18 + (r.stats.acceleration / 100) * 19;
    const brakeRate = 32 + (r.stats.braking / 100) * 24;
    const gripFactor = 6.5 + (r.stats.handling / 100) * 5.5;

    // Nitro handling
    const wantsNitro = controlInputs.nitro && r.nitroAmount > 2 && r.speedMps > 8;
    r.nitroActive = wantsNitro;
    if (r.nitroActive) {
      r.nitroAmount = Math.max(0, r.nitroAmount - dt * 26);
    } else {
      const rechargeRate = r.isDrifting ? 14 : 4.5;
      r.nitroAmount = Math.min(100, r.nitroAmount + dt * rechargeRate);
    }

    const effectiveMaxSpeed = r.nitroActive
      ? maxSpeedMps * (1.16 + (r.stats.nitroPower / 100) * 0.08)
      : maxSpeedMps;

    // Longitudinal acceleration / braking / reverse
    if (controlInputs.throttle) {
      const speedRatio = Math.max(0, r.speedMps / effectiveMaxSpeed);
      const curveFactor = Math.max(0.18, 1 - Math.pow(speedRatio, 1.7));
      const nitroBoost = r.nitroActive ? 14 + (r.stats.nitroPower / 100) * 10 : 0;
      r.speedMps += (accelRate * curveFactor + nitroBoost) * dt;
    } else if (controlInputs.brake) {
      if (r.speedMps > 1.5) {
        r.speedMps -= brakeRate * dt;
      } else {
        // Reverse gear
        r.speedMps = Math.max(-16, r.speedMps - 14 * dt);
      }
    } else {
      // Rolling resistance & aerodynamic drag
      r.speedMps = THREE.MathUtils.damp(r.speedMps, 0, 0.85, dt);
    }

    r.speedMps = THREE.MathUtils.clamp(r.speedMps, -16, effectiveMaxSpeed);

    // Steering input
    let steerInput = 0;
    if (controlInputs.useAnalog) {
      steerInput = -controlInputs.analogSteer; // +1 left yaw, -1 right yaw
    } else {
      if (controlInputs.left) steerInput += 1;
      if (controlInputs.right) steerInput -= 1;
    }
    steerInput *= settings.steeringSensitivity;

    // Speed-dependent steering authority so car never spins out uncontrollably
    const absSpeed = Math.abs(r.speedMps);
    const steerAuthority = absSpeed < 1.2 ? 0 : THREE.MathUtils.clamp(1.12 - (absSpeed / maxSpeedMps) * 0.42, 0.48, 1.1);
    const reverseSign = r.speedMps >= -0.2 ? 1 : -1;

    const targetSteerAngle = steerInput * 0.46 * steerAuthority;
    r.steerAngle = THREE.MathUtils.damp(r.steerAngle, targetSteerAngle, 14, dt);

    // Drift mechanics
    const wantsDrift = controlInputs.drift && absSpeed > 15 && Math.abs(steerInput) > 0.15;
    const yawRate = r.steerAngle * (wantsDrift ? 3.2 : 2.35) * reverseSign;
    r.yaw += yawRate * dt;

    if (wantsDrift) {
      const targetSlip = -steerInput * Math.min(13, absSpeed * 0.24);
      r.lateralSpeedMps = THREE.MathUtils.damp(r.lateralSpeedMps, targetSlip, 6, dt);
      r.isDrifting = true;
      const pointsRate = Math.abs(r.lateralSpeedMps) * (absSpeed * 0.9);
      r.driftScoreCurrent += pointsRate * dt;
      r.driftScoreTotal += pointsRate * dt;
    } else {
      r.lateralSpeedMps = THREE.MathUtils.damp(r.lateralSpeedMps, 0, gripFactor, dt);
      if (Math.abs(r.lateralSpeedMps) < 2.2) {
        r.isDrifting = false;
        r.driftScoreCurrent = 0;
      }
    }

    // Compute world velocity from forward + lateral slip
    _forwardVec.set(-Math.sin(r.yaw), 0, -Math.cos(r.yaw));
    _rightVec.set(Math.cos(r.yaw), 0, -Math.sin(r.yaw));

    r.position.addScaledVector(_forwardVec, r.speedMps * dt);
    r.position.addScaledVector(_rightVec, r.lateralSpeedMps * dt);

    // Track surface snapping & Barrier collision
    const closest = this.track.getClosestSample(r.position, r.sampleIndex);
    r.sampleIndex = closest.index;

    // Smoothly follow track elevation
    r.position.y = THREE.MathUtils.damp(r.position.y, closest.sample.point.y, 18, dt);

    const maxHalfRoad = this.track.roadWidth * 0.5 - 1.15;
    if (Math.abs(closest.lateralOffset) > maxHalfRoad) {
      const sign = Math.sign(closest.lateralOffset);
      const penetration = Math.abs(closest.lateralOffset) - maxHalfRoad;
      r.position.addScaledVector(closest.sample.right, -sign * penetration);

      // Align car gently back toward track tangent so it scrapes rather than getting stuck
      const trackYaw = Math.atan2(-closest.sample.tangent.x, -closest.sample.tangent.z);
      let angleDiff = trackYaw - r.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      r.yaw += angleDiff * 0.35;

      // Speed penalty and impact feedback
      if (penetration > 0.12 && absSpeed > 10) {
        r.speedMps *= 0.86;
        r.lateralSpeedMps = -sign * 3.5;
        this.cameraShakeIntensity = Math.min(0.45, (absSpeed / maxSpeedMps) * 0.35);
        audioManager.playCollision(absSpeed / maxSpeedMps);
        if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }

        // Spawn barrier sparks
        const sparkX = r.position.x + closest.sample.right.x * sign * 0.95;
        const sparkZ = r.position.z + closest.sample.right.z * sign * 0.95;
        for (let s = 0; s < 5; s++) {
          this.particles.spawn(
            sparkX,
            r.position.y + 0.45,
            sparkZ,
            (Math.random() - 0.5) * 8,
            2 + Math.random() * 5,
            (Math.random() - 0.5) * 8,
            0.28,
            0.45,
            0.1,
            1.0,
            0.65,
            0.15
          );
        }
      }
    }

    // Suspension pitch & roll visual lean
    const targetPitch = controlInputs.throttle ? -0.028 : controlInputs.brake ? 0.038 : 0;
    const targetRoll = -r.steerAngle * Math.min(1, absSpeed / 25) * 0.14;
    r.bodyPitch = THREE.MathUtils.damp(r.bodyPitch, targetPitch, 10, dt);
    r.bodyRoll = THREE.MathUtils.damp(r.bodyRoll, targetRoll, 10, dt);

    // Emit dual-tire drift smoke or nitro exhaust particles
    if (r.isDrifting && absSpeed > 13) {
      const rearPos = r.position.clone().addScaledVector(_forwardVec, -1.45);
      for (let side = -1; side <= 1; side += 2) {
        const tireX = rearPos.x + _rightVec.x * side * 0.82 + (Math.random() - 0.5) * 0.35;
        const tireZ = rearPos.z + _rightVec.z * side * 0.82 + (Math.random() - 0.5) * 0.35;
        this.particles.spawn(
          tireX,
          rearPos.y + 0.16,
          tireZ,
          (Math.random() - 0.5) * 2.2 - _forwardVec.x * 1.5,
          0.9 + Math.random() * 1.4,
          (Math.random() - 0.5) * 2.2 - _forwardVec.z * 1.5,
          0.52,
          0.7,
          2.25,
          0.86,
          0.9,
          0.96
        );
      }
    }

    if (r.nitroActive) {
      const exhaustPos = r.position.clone().addScaledVector(_forwardVec, -2.35);
      const isCore = Math.random() > 0.45;
      this.particles.spawn(
        exhaustPos.x + (Math.random() - 0.5) * 0.78,
        exhaustPos.y + 0.3,
        exhaustPos.z + (Math.random() - 0.5) * 0.78,
        -_forwardVec.x * 7.5 + (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.4,
        -_forwardVec.z * 7.5 + (Math.random() - 0.5) * 1.2,
        0.22,
        0.58,
        0.14,
        isCore ? 0.98 : 0.18,
        isCore ? 0.48 : 0.78,
        isCore ? 0.12 : 1.0
      );
    }
  }

  private stepAIPhysics(r: RacerVehicleState, dt: number, playerTotalProgress: number) {
    const sampleCount = this.track.samples.length;
    const lookAheadSteps = r.isCivilian ? 6 : 10;
    const lookSample = this.track.samples[(r.sampleIndex + lookAheadSteps) % sampleCount];
    const farSample = this.track.samples[(r.sampleIndex + 22) % sampleCount];

    // Periodic lane shifting for overtaking variety
    r.laneChangeTimer -= dt;
    if (r.laneChangeTimer <= 0 && !r.isCivilian) {
      r.laneChangeTimer = 3.5 + Math.random() * 4;
      const maxOffset = this.track.roadWidth * 0.32;
      r.targetLaneOffset = (Math.random() * 2 - 1) * maxOffset;
    }

    // Corner curvature estimation to slow down realistically for sharp turns
    const curTangent = this.track.samples[r.sampleIndex].tangent;
    const cornerAlignment = Math.max(0, curTangent.dot(farSample.tangent)); // 1 = straight, < 0.7 = sharp turn
    const cornerSpeedFactor = 0.62 + 0.38 * Math.pow(cornerAlignment, 1.8);

    // Fair rubber-banding catch-up balancing for non-civilian AI racers
    let catchupFactor = 1.0;
    if (!r.isCivilian && !r.finished) {
      const progressDelta = playerTotalProgress - r.totalProgress;
      if (progressDelta > 0.15) catchupFactor = 1.08;
      else if (progressDelta < -0.18) catchupFactor = 0.93;
    }

    const baseMaxMps = (r.stats.topSpeed / 3.6) * r.aiSkillMultiplier * catchupFactor;
    const desiredSpeedMps = r.isCivilian ? 28 : baseMaxMps * cornerSpeedFactor;

    r.speedMps = THREE.MathUtils.damp(r.speedMps, desiredSpeedMps, 2.6, dt);

    // Steer toward lookahead point + lane offset
    const targetPoint = lookSample.point.clone().addScaledVector(lookSample.right, r.targetLaneOffset);
    const dx = targetPoint.x - r.position.x;
    const dz = targetPoint.z - r.position.z;
    const desiredYaw = Math.atan2(-dx, -dz);

    let yawDiff = desiredYaw - r.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

    const maxTurn = 3.2 * dt;
    const appliedTurn = THREE.MathUtils.clamp(yawDiff, -maxTurn, maxTurn);
    r.yaw += appliedTurn;
    r.steerAngle = THREE.MathUtils.clamp(yawDiff * 0.6, -0.4, 0.4);
    r.bodyRoll = -r.steerAngle * 0.1;

    _forwardVec.set(-Math.sin(r.yaw), 0, -Math.cos(r.yaw));
    r.position.addScaledVector(_forwardVec, r.speedMps * dt);

    const closest = this.track.getClosestSample(r.position, r.sampleIndex);
    r.sampleIndex = closest.index;
    r.position.y = THREE.MathUtils.damp(r.position.y, closest.sample.point.y, 15, dt);
  }

  private resolveCarToCarInteractions(dt: number, settings: PlayerSettings) {
    const player = this.racers[0];

    // Decrement near-miss cooldowns
    for (const key of Object.keys(player.nearMissCooldowns)) {
      player.nearMissCooldowns[key] -= dt;
      if (player.nearMissCooldowns[key] <= 0) {
        delete player.nearMissCooldowns[key];
      }
    }

    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];

        _toOther.subVectors(b.position, a.position);
        _toOther.y = 0;
        const distSq = _toOther.lengthSq();

        // Near-miss check for player at high speed
        if (a.isPlayer && distSq < 25 && distSq >= 6.8 && a.speedMps > 24 && !a.nearMissCooldowns[b.id]) {
          a.nearMissCount++;
          a.nearMissCooldowns[b.id] = 2.5;
          a.nitroAmount = Math.min(100, a.nitroAmount + 12);
          audioManager.playCheckpoint();
        }

        // Physical collision response (radius ~ 2.5m combined)
        const minSep = 2.55;
        if (distSq < minSep * minSep && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minSep - dist;
          _toOther.divideScalar(dist);

          a.position.addScaledVector(_toOther, -overlap * 0.5);
          b.position.addScaledVector(_toOther, overlap * 0.5);

          const avgSpeed = (a.speedMps + b.speedMps) * 0.5;
          a.speedMps = THREE.MathUtils.lerp(a.speedMps, avgSpeed * 0.92, 0.4);
          b.speedMps = THREE.MathUtils.lerp(b.speedMps, avgSpeed * 0.92, 0.4);

          if (a.isPlayer || b.isPlayer) {
            this.cameraShakeIntensity = 0.35;
            this.hitstopRemaining = 0.032; // Crisp 32ms impact hitstop
            audioManager.playCollision(0.85);
            if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(35);
            }
            const midX = (a.position.x + b.position.x) * 0.5;
            const midY = (a.position.y + b.position.y) * 0.5 + 0.5;
            const midZ = (a.position.z + b.position.z) * 0.5;
            for (let s = 0; s < 6; s++) {
              this.particles.spawn(
                midX,
                midY,
                midZ,
                (Math.random() - 0.5) * 10,
                2.5 + Math.random() * 5,
                (Math.random() - 0.5) * 10,
                0.3,
                0.48,
                0.08,
                1.0,
                0.72,
                0.2
              );
            }
          }
        }
      }
    }
  }

  private updateProgressAndCheckpoints(r: RacerVehicleState) {
    const cpCount = this.track.checkpoints.length;
    const nextCpIdx = (r.checkpointIndex + 1) % cpCount;
    const nextCp = this.track.checkpoints[nextCpIdx];

    const distSq = r.position.distanceToSquared(nextCp.point);
    const gateRadius = this.track.roadWidth * 0.85;

    if (distSq <= gateRadius * gateRadius) {
      r.checkpointIndex = nextCpIdx;
      if (r.isPlayer && nextCpIdx !== 0) {
        audioManager.playCheckpoint();
      }

      // Crossed Start/Finish line after completing all checkpoints
      if (nextCpIdx === 0) {
        const lapTime = this.elapsedMs - r.currentLapStartMs;
        if (r.bestLapMs === null || lapTime < r.bestLapMs) {
          r.bestLapMs = Math.round(lapTime);
        }
        r.currentLapStartMs = this.elapsedMs;

        if (r.lap >= this.config.laps) {
          if (!r.finished) {
            r.finished = true;
            r.finishTimeMs = Math.round(this.elapsedMs);
          }
        } else {
          r.lap++;
        }
      }
    }

    const sampleProgress = r.sampleIndex / this.track.samples.length;
    r.totalProgress =
      (r.lap - 1) * cpCount + r.checkpointIndex + (sampleProgress % (1 / cpCount));
  }

  private animateCarVisualRig(r: RacerVehicleState, dt: number) {
    r.rig.root.position.copy(r.position);
    r.rig.root.rotation.y = r.yaw;

    r.rig.chassisGroup.rotation.x = r.bodyPitch;
    r.rig.chassisGroup.rotation.z = r.bodyRoll;

    // Front wheel steering
    r.rig.wheelSteerPivots[0].rotation.y = r.steerAngle;
    r.rig.wheelSteerPivots[1].rotation.y = r.steerAngle;

    // 4-wheel rolling spin
    r.wheelSpinAngle -= (r.speedMps / 0.37) * dt;
    for (let w = 0; w < 4; w++) {
      r.rig.wheelSpinGroups[w].rotation.x = r.wheelSpinAngle;
    }

    // Brake light brightening
    const isBraking = r.isPlayer && controlInputs.brake;
    r.rig.taillightMat.emissiveIntensity = isBraking ? 3.5 : 1.3;

    // Nitro dual flame plumes
    const showFlames = r.nitroActive;
    r.rig.nitroFlames[0].visible = showFlames;
    r.rig.nitroFlames[1].visible = showFlames;
    if (showFlames) {
      const flicker = 0.85 + Math.random() * 0.45;
      r.rig.nitroFlames[0].scale.set(1, flicker, 1);
      r.rig.nitroFlames[1].scale.set(1, flicker, 1);
    }
  }

  private updateCamera(
    dt: number,
    camera: THREE.PerspectiveCamera,
    cameraMode: CameraMode,
    settings: PlayerSettings
  ) {
    const player = this.racers[0];
    if (!player) return;

    _forwardVec.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    _rightVec.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

    if (cameraMode === 'hood') {
      _camTargetPos.copy(player.position).addScaledVector(_forwardVec, 0.35);
      _camTargetPos.y += 1.32;
      _camLookAt.copy(player.position).addScaledVector(_forwardVec, 20);
      _camLookAt.y += 1.05;
      this.currentCamPos.copy(_camTargetPos);
      this.currentCamLook.copy(_camLookAt);
    } else {
      // Aspect-ratio adaptive pullback for mobile portrait screens so the car never dominates the viewport
      const aspect = camera.aspect || 1.6;
      const portraitPullback = aspect < 1.0 ? (1.0 - Math.max(0.45, aspect)) * 3.4 : 0;
      const portraitHeightLift = portraitPullback * 0.24;

      // Balanced Arcade Chase (8.8m back, 3.3m high) / Far Chase (11.2m back, 4.1m high)
      const distBack = (cameraMode === 'far_chase' ? 11.2 : 8.8) + portraitPullback;
      const heightUp = (cameraMode === 'far_chase' ? 4.1 : 3.3) + portraitHeightLift;

      // Subtle lateral swing stabilization during drift + turn anticipation
      const driftSwing = THREE.MathUtils.clamp(player.lateralSpeedMps * 0.08, -0.85, 0.85);
      const turnLookOffset = -player.steerAngle * 2.8;

      _camTargetPos
        .copy(player.position)
        .addScaledVector(_forwardVec, -distBack)
        .addScaledVector(_rightVec, driftSwing);
      _camTargetPos.y = Math.max(player.position.y + 2.2, player.position.y + heightUp);

      // Clamp camera inside the road corridor so it never clips through roadside buildings
      const camSample = this.track.getClosestSample(_camTargetPos, player.sampleIndex);
      const maxCamLateral = this.track.roadWidth * 0.52;
      if (Math.abs(camSample.lateralOffset) > maxCamLateral) {
        const excess = Math.abs(camSample.lateralOffset) - maxCamLateral;
        const sign = Math.sign(camSample.lateralOffset);
        _camTargetPos.addScaledVector(camSample.sample.right, -sign * excess);
      }
      _camTargetPos.y = Math.max(_camTargetPos.y, camSample.sample.point.y + 2.2);

      // Look 12.0m ahead down the road so the car sits in the lower third and shows expansive road ahead
      _camLookAt
        .copy(player.position)
        .addScaledVector(_forwardVec, 12.0)
        .addScaledVector(_rightVec, turnLookOffset);
      _camLookAt.y = player.position.y + 1.25;

      if (!this.camInitialized) {
        this.camInitialized = true;
        this.currentCamPos.copy(_camTargetPos);
        this.currentCamLook.copy(_camLookAt);
      } else {
        const dampLambda = settings.reducedMotion ? 22 : 12.5;
        this.currentCamPos.x = THREE.MathUtils.damp(this.currentCamPos.x, _camTargetPos.x, dampLambda, dt);
        this.currentCamPos.y = THREE.MathUtils.damp(this.currentCamPos.y, _camTargetPos.y, dampLambda, dt);
        this.currentCamPos.z = THREE.MathUtils.damp(this.currentCamPos.z, _camTargetPos.z, dampLambda, dt);

        this.currentCamLook.x = THREE.MathUtils.damp(this.currentCamLook.x, _camLookAt.x, 16, dt);
        this.currentCamLook.y = THREE.MathUtils.damp(this.currentCamLook.y, _camLookAt.y, 16, dt);
        this.currentCamLook.z = THREE.MathUtils.damp(this.currentCamLook.z, _camLookAt.z, 16, dt);
      }
    }

    camera.position.copy(this.currentCamPos);

    // Apply decaying camera shake on impact + subtle nitro vibration
    if (!settings.reducedMotion) {
      const nitroShake = player.nitroActive ? 0.036 : 0;
      const totalShake = this.cameraShakeIntensity + nitroShake;
      if (totalShake > 0.004) {
        camera.position.x += (Math.random() - 0.5) * totalShake;
        camera.position.y += (Math.random() - 0.5) * totalShake * 0.8;
      }
      if (this.cameraShakeIntensity > 0.005) {
        this.cameraShakeIntensity = THREE.MathUtils.damp(this.cameraShakeIntensity, 0, 8, dt);
      } else {
        this.cameraShakeIntensity = 0;
      }
    } else {
      this.cameraShakeIntensity = 0;
    }

    camera.lookAt(this.currentCamLook);

    // Speed-reactive FOV widening
    const speedRatio = THREE.MathUtils.clamp(Math.abs(player.speedMps) / 85, 0, 1);
    const nitroFovBonus = player.nitroActive && !settings.reducedMotion ? 8.5 : 0;
    const targetFov = settings.reducedMotion ? 60 : 58 + speedRatio * 14 + nitroFovBonus;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7.5, dt);
      camera.updateProjectionMatrix();
    }
  }

  private syncTelemetry(fps: number) {
    const player = this.racers[0];
    if (!player) return;

    const competitiveRacers = this.racers.filter((r) => !r.isCivilian);
    const sorted = [...competitiveRacers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalProgress - a.totalProgress;
    });

    const playerRank = Math.max(1, sorted.findIndex((r) => r.isPlayer) + 1);
    const speedKmh = Math.round(Math.abs(player.speedMps) * 3.6);
    const maxKmh = player.stats.topSpeed;
    const gear = Math.min(6, Math.max(1, Math.floor((speedKmh / maxKmh) * 6) + 1));
    const rpmNorm = THREE.MathUtils.clamp(0.18 + ((speedKmh % (maxKmh / 5)) / (maxKmh / 5)) * 0.82, 0.12, 1);

    // Check wrong-way
    const trackTangent = this.track.samples[player.sampleIndex].tangent;
    _forwardVec.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const alignment = _forwardVec.dot(trackTangent);

    liveTelemetry.racePhase = this.racePhase;
    liveTelemetry.countdownStage = this.countdownStage;
    liveTelemetry.speedKmh = speedKmh;
    liveTelemetry.rpmNormalized = rpmNorm;
    liveTelemetry.gear = gear;
    liveTelemetry.nitroAmount = Math.round(player.nitroAmount);
    liveTelemetry.nitroActive = player.nitroActive;
    liveTelemetry.isDrifting = player.isDrifting;
    liveTelemetry.driftScoreCurrent = Math.round(player.driftScoreCurrent);
    liveTelemetry.driftScoreTotal = Math.round(player.driftScoreTotal);
    liveTelemetry.nearMissCount = player.nearMissCount;
    liveTelemetry.lap = player.lap;
    liveTelemetry.totalLaps = this.config.laps;
    liveTelemetry.position = playerRank;
    liveTelemetry.totalRacers = competitiveRacers.length;
    liveTelemetry.elapsedMs = Math.round(this.elapsedMs);
    liveTelemetry.currentLapMs = Math.round(this.elapsedMs - player.currentLapStartMs);
    liveTelemetry.bestLapMs = player.bestLapMs;
    liveTelemetry.countdownValue =
      this.countdownStage === '3'
        ? 3
        : this.countdownStage === '2'
        ? 2
        : this.countdownStage === '1'
        ? 1
        : this.countdownStage === 'GO'
        ? 0
        : -1;
    liveTelemetry.checkpointIndex = player.checkpointIndex;
    liveTelemetry.totalCheckpoints = this.track.checkpoints.length;
    liveTelemetry.wrongWay = alignment < -0.35 && speedKmh > 15;
    liveTelemetry.fps = fps;
    liveTelemetry.minimapPoints = this.track.minimapNormalized;

    const standings: RacerStandingsEntry[] = sorted.map((r) => ({
      id: r.id,
      name: r.name,
      isPlayer: r.isPlayer,
      carId: r.carId,
      lap: r.lap,
      checkpointIndex: r.checkpointIndex,
      totalProgress: r.totalProgress,
      finished: r.finished,
      finishTimeMs: r.finishTimeMs,
      color: r.color,
    }));
    liveTelemetry.standings = standings;

    liveTelemetry.minimapRacers = this.racers.map((r) => ({
      x: 0.5 + (r.position.x - this.centerX) / this.maxSpan,
      y: 0.5 + (r.position.z - this.centerZ) / this.maxSpan,
      isPlayer: r.isPlayer,
      color: r.isPlayer ? '#38bdf8' : r.isCivilian ? '#94a3b8' : r.color,
    }));
  }

  public dispose() {
    liveTelemetry.racePhase = 'READY';
    liveTelemetry.countdownStage = null;
    liveTelemetry.countdownValue = -1;
    this.scene.remove(this.particles.mesh);
    this.particles.dispose();
    for (const r of this.racers) {
      this.scene.remove(r.rig.root);
      r.rig.dispose();
    }
  }
}
