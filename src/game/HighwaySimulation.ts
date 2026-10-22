import * as THREE from 'three';
import { audioManager } from '../services/AudioManager';
import { CarCustomization, CarId, CarStats } from '../types/game';
import { BuiltCarRig, buildProceduralCar } from './CarBuilder';
import { HighwayTrackBuilder } from './HighwayTrackBuilder';
import { HighwayTrafficManager } from './HighwayTrafficManager';
import { ParticlePool } from './ParticleSystem';
import { controlInputs, liveTelemetry } from './RaceBridge';

export interface HighwayGameConfig {
  mode: 'highway_endless' | 'highway_time' | 'highway_mission';
  themeId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  trafficDensity: number;
}

export class HighwaySimulation {
  private readonly scene: THREE.Scene;
  private readonly config: HighwayGameConfig;
  private readonly trackBuilder: HighwayTrackBuilder;
  private readonly trafficManager: HighwayTrafficManager;
  private readonly particles: ParticlePool;
  private readonly playerRig: BuiltCarRig;
  private readonly stats: CarStats;

  private playerZ = 0;
  private playerX = 0;
  private playerLateralVel = 0;
  private playerSpeedMps = 0;
  private nitroAmount = 100;
  private nitroActive = false;

  private durability = 100;
  private distanceMeters = 0;
  private score = 0;
  private nearMissCount = 0;
  private comboMultiplier = 1;
  private comboTimer = 0;
  private elapsedSec = 0;
  private timeLimitSec = 90;
  private gameOver = false;

  constructor(
    scene: THREE.Scene,
    config: HighwayGameConfig,
    playerCarId: CarId,
    playerStats: CarStats,
    playerCustom: CarCustomization,
    isSoftwareGl: boolean
  ) {
    this.scene = scene;
    this.config = config;
    this.stats = playerStats;
    this.trackBuilder = new HighwayTrackBuilder(config.themeId);
    this.trafficManager = new HighwayTrafficManager(config.difficulty);
    this.particles = new ParticlePool(isSoftwareGl ? 60 : 120);

    this.scene.add(this.trackBuilder.root);
    this.scene.add(this.trafficManager.root);
    this.scene.add(this.particles.mesh);

    // Build Player Car
    this.playerRig = buildProceduralCar(playerCarId, playerCustom, isSoftwareGl);
    this.playerRig.root.position.set(0, 0, 0);
    this.scene.add(this.playerRig.root);

    if (config.mode === 'highway_time') {
      this.timeLimitSec = 60;
    }

    audioManager.setRacingActive(true);
  }

  public update(dt: number, cameraMode: string) {
    if (this.gameOver) return;

    this.elapsedSec += dt;

    if (this.config.mode === 'highway_time') {
      this.timeLimitSec -= dt;
      if (this.timeLimitSec <= 0) {
        this.timeLimitSec = 0;
        this.gameOver = true;
        audioManager.setRacingActive(false);
      }
    }

    // Controls
    const throttle = controlInputs.throttle ? 1 : 0;
    const brake = controlInputs.brake ? 1 : 0;
    const steer = controlInputs.useAnalog
      ? controlInputs.analogSteer
      : (controlInputs.left ? -1 : 0) + (controlInputs.right ? 1 : 0);
    const nitro = controlInputs.nitro && this.nitroAmount > 5;

    // Nitro handling
    if (nitro) {
      this.nitroActive = true;
      this.nitroAmount = Math.max(0, this.nitroAmount - dt * 35);
    } else {
      this.nitroActive = false;
      this.nitroAmount = Math.min(100, this.nitroAmount + dt * 15);
    }

    const maxSpeed = (this.stats.topSpeed / 3.6) * (this.nitroActive ? 1.35 : 1.0);
    const acceleration = (this.stats.acceleration / 100) * 18 + 8;
    const brakingPower = (this.stats.braking / 100) * 25 + 15;

    if (throttle > 0.05 || controlInputs.throttle) {
      this.playerSpeedMps += acceleration * dt;
    } else if (brake > 0.05 || controlInputs.brake) {
      this.playerSpeedMps -= brakingPower * dt;
    } else {
      this.playerSpeedMps -= 6.0 * dt;
    }

    if (this.nitroActive) {
      this.playerSpeedMps += 12 * dt;
    }

    this.playerSpeedMps = Math.max(0, Math.min(maxSpeed, this.playerSpeedMps));

    // Steering & Lateral Physics (Smooth arcade control like Quick Play)
    const handling = (this.stats.handling / 100) * 14 + 10;
    const targetLateralSpeed = steer * 13.0;
    this.playerLateralVel = THREE.MathUtils.damp(this.playerLateralVel, targetLateralSpeed, handling, dt);
    this.playerX += this.playerLateralVel * dt;
    this.playerX = Math.max(-8.5, Math.min(8.5, this.playerX));

    // Update Player Z position
    const forwardDist = this.playerSpeedMps * dt;
    this.playerZ -= forwardDist;
    this.distanceMeters += forwardDist;
    this.score += Math.round(forwardDist * this.comboMultiplier);

    // Update track and traffic
    this.trackBuilder.update(this.playerZ);
    this.trafficManager.update(dt, this.playerX, this.playerZ, this.playerSpeedMps);

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1;
      }
    }

    // Collision & Near-Miss Detection
    const playerBox = new THREE.Box3(
      new THREE.Vector3(this.playerX - 0.9, 0, this.playerZ - 2.1),
      new THREE.Vector3(this.playerX + 0.9, 1.4, this.playerZ + 2.1)
    );

    for (const trafficCar of this.trafficManager.traffic) {
      const trafficBox = new THREE.Box3(
        new THREE.Vector3(trafficCar.x - trafficCar.width / 2, 0, trafficCar.z - trafficCar.length / 2),
        new THREE.Vector3(trafficCar.x + trafficCar.width / 2, 1.8, trafficCar.z + trafficCar.length / 2)
      );

      if (playerBox.intersectsBox(trafficBox)) {
        this.durability -= 34;
        this.playerSpeedMps *= 0.35;
        this.comboMultiplier = 1;
        audioManager.playCollision(1.5);

        trafficCar.z -= 4;

        if (this.durability <= 0) {
          this.durability = 0;
          this.gameOver = true;
          audioManager.setRacingActive(false);
        }
        break;
      }

      if (!trafficCar.nearMissAwarded && trafficCar.z <= this.playerZ + 4 && trafficCar.z >= this.playerZ - 6) {
        const latDist = Math.abs(this.playerX - trafficCar.x);
        if (latDist < 3.0) {
          trafficCar.nearMissAwarded = true;
          this.nearMissCount++;
          this.score += 500 * this.comboMultiplier;
          this.comboMultiplier = Math.min(5, this.comboMultiplier + 1);
          this.comboTimer = 4.0;
          audioManager.playCheckpoint();
        }
      }
    }

    // Update Player Rig position & wheel spin
    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = -steer * 0.18;
    this.playerRig.root.rotation.z = -steer * 0.08;

    if (this.playerRig.wheelSteerPivots) {
      for (const pivot of this.playerRig.wheelSteerPivots) {
        pivot.rotation.y = steer * 0.6;
      }
    }
    if (this.playerRig.wheelSpinGroups) {
      for (const spinGroup of this.playerRig.wheelSpinGroups) {
        spinGroup.rotation.x += this.playerSpeedMps * dt * 0.5;
      }
    }

    // Nitro flames & particles
    if (this.playerRig.nitroFlames) {
      const showFlames = this.nitroActive;
      this.playerRig.nitroFlames[0].visible = showFlames;
      this.playerRig.nitroFlames[1].visible = showFlames;
      if (showFlames) {
        const flicker = 0.85 + Math.random() * 0.45;
        this.playerRig.nitroFlames[0].scale.set(1, flicker, 1);
        this.playerRig.nitroFlames[1].scale.set(1, flicker, 1);

        const exhaustPos = this.playerRig.root.position.clone().add(new THREE.Vector3(0, 0.4, 2.3));
        this.particles.spawn(
          exhaustPos.x + (Math.random() - 0.5) * 0.6,
          exhaustPos.y,
          exhaustPos.z + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          6.0 + Math.random() * 3.0,
          0.22,
          0.58,
          0.14,
          0.98,
          0.48,
          0.12
        );
      }
    }

    this.particles.update(dt);

    // Audio update
    audioManager.updateVehicleAudio(
      Math.round(this.playerSpeedMps * 3.6),
      Math.min(1, this.playerSpeedMps / maxSpeed),
      false,
      this.nitroActive,
      false
    );

    // Telemetry update
    liveTelemetry.racePhase = this.gameOver ? 'FINISHED' : 'RACING';
    liveTelemetry.speedKmh = Math.round(this.playerSpeedMps * 3.6);
    liveTelemetry.rpmNormalized = Math.min(1, this.playerSpeedMps / maxSpeed);
    liveTelemetry.nitroAmount = Math.round(this.nitroAmount);
    liveTelemetry.nitroActive = this.nitroActive;
    liveTelemetry.driftScoreTotal = Math.round(this.distanceMeters);
    liveTelemetry.nearMissCount = this.nearMissCount;
    liveTelemetry.elapsedMs = Math.round(this.elapsedSec * 1000);
  }

  public updateCamera(camera: THREE.PerspectiveCamera, cameraMode: string) {
    const backDist = cameraMode === 'far_chase' ? 9.5 : 7.8;
    const height = cameraMode === 'far_chase' ? 3.4 : 2.8;

    const targetPos = new THREE.Vector3(
      this.playerX * 0.4,
      height,
      this.playerZ + backDist
    );
    const lookTarget = new THREE.Vector3(this.playerX * 0.15, 0.7, this.playerZ - 10);

    camera.position.lerp(targetPos, 0.25);
    camera.lookAt(lookTarget);
  }

  public isFinished(): boolean {
    return this.gameOver;
  }

  public getResults() {
    const coins = Math.round(this.score / 25 + this.distanceMeters / 12);
    return {
      distanceMeters: Math.round(this.distanceMeters),
      score: this.score,
      nearMisses: this.nearMissCount,
      coinsEarned: coins,
      elapsedSec: Math.round(this.elapsedSec),
    };
  }

  public dispose() {
    this.scene.remove(this.trackBuilder.root);
    this.scene.remove(this.trafficManager.root);
    this.scene.remove(this.particles.mesh);
    this.scene.remove(this.playerRig.root);
    this.trackBuilder.dispose();
    this.trafficManager.dispose();
    this.particles.dispose();
  }
}
