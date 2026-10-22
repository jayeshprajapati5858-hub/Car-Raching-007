import * as THREE from 'three';

export interface TrafficVehicle {
  id: string;
  mesh: THREE.Group;
  x: number;
  z: number;
  speedMps: number;
  laneIndex: number; // 0, 1, 2, 3, 4
  type: 'sedan' | 'suv' | 'truck' | 'van' | 'sports' | 'hatchback';
  length: number;
  width: number;
  passed: boolean;
  nearMissAwarded: boolean;
}

export class HighwayTrafficManager {
  public readonly root = new THREE.Group();
  public traffic: TrafficVehicle[] = [];
  private nextId = 1;
  private spawnTimer = 0;
  private densityMultiplier: number;

  constructor(difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    // Heavy rush hour traffic density multiplier
    this.densityMultiplier = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 2.2 : 1.6;
  }

  public update(dt: number, playerX: number, playerZ: number, playerSpeedMps: number) {
    // Spawn traffic ahead of player with dense pacing
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (0.7 + Math.random() * 0.9) / this.densityMultiplier;
      this.spawnVehicle(playerZ - 190);
    }

    // Update existing traffic
    const removeIds: string[] = [];
    for (const t of this.traffic) {
      t.z -= t.speedMps * dt;

      // Gentle natural lane drifting/weaving for realistic traffic
      const baseLaneX = t.laneIndex === 0 ? -7.6 : t.laneIndex === 1 ? -3.8 : t.laneIndex === 2 ? 0 : t.laneIndex === 3 ? 3.8 : 7.6;
      t.x = baseLaneX + Math.sin(t.z * 0.035 + Number(t.id.replace('traffic_', ''))) * 0.25;

      // If player passed traffic (traffic is now behind player by > 35m)
      if (t.z > playerZ + 35) {
        removeIds.push(t.id);
      } else {
        t.mesh.position.set(t.x, 0, t.z);
      }
    }

    // Remove culled traffic
    if (removeIds.length > 0) {
      this.traffic = this.traffic.filter((t) => {
        if (removeIds.includes(t.id)) {
          this.root.remove(t.mesh);
          return false;
        }
        return true;
      });
    }
  }

  private spawnVehicle(targetZ: number) {
    const lanes = [-7.6, -3.8, 0, 3.8, 7.6];
    const laneIdx = Math.floor(Math.random() * lanes.length);
    const x = lanes[laneIdx];

    // Ensure no overlapping traffic at target spawn Z
    const tooClose = this.traffic.some((t) => Math.abs(t.z - targetZ) < 32 && t.laneIndex === laneIdx);
    if (tooClose) return;

    const types: ('sedan' | 'suv' | 'truck' | 'van' | 'sports' | 'hatchback')[] = [
      'sedan',
      'suv',
      'truck',
      'van',
      'sports',
      'hatchback',
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    const speedMps =
      type === 'truck'
        ? 12 + Math.random() * 5
        : type === 'sports'
        ? 24 + Math.random() * 7
        : 16 + Math.random() * 6;
    const length = type === 'truck' ? 6.5 : type === 'suv' ? 4.8 : type === 'van' ? 4.6 : 4.2;
    const width = type === 'truck' ? 2.4 : type === 'suv' ? 2.1 : 1.95;

    const mesh = this.createDetailedVehicleMesh(type);
    mesh.position.set(x, 0, targetZ);
    this.root.add(mesh);

    this.traffic.push({
      id: `traffic_${this.nextId++}`,
      mesh,
      x,
      z: targetZ,
      speedMps,
      laneIndex: laneIdx,
      type,
      length,
      width,
      passed: false,
      nearMissAwarded: false,
    });
  }

  private createDetailedVehicleMesh(
    type: 'sedan' | 'suv' | 'truck' | 'van' | 'sports' | 'hatchback'
  ): THREE.Group {
    const group = new THREE.Group();
    const color = new THREE.Color().setHSL(Math.random(), 0.75, 0.48);

    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.22,
      metalness: 0.85,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.05,
      metalness: 0.3,
    });
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x141821,
      roughness: 0.6,
      metalness: 0.2,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.8,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc0c8d8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.0,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xef4444,
      emissiveIntensity: 2.0,
    });

    const bodyHeight = type === 'truck' ? 2.1 : type === 'suv' ? 1.7 : type === 'van' ? 1.8 : 1.25;
    const bodyLength = type === 'truck' ? 6.2 : type === 'suv' ? 4.8 : type === 'van' ? 4.6 : 4.3;
    const bodyWidth = type === 'truck' ? 2.3 : type === 'suv' ? 2.0 : 1.9;

    // Main Chassis
    const chassisGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.55, bodyLength);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = bodyHeight * 0.38;
    chassis.castShadow = true;
    group.add(chassis);

    // Cabin / Greenhouse
    const cabinGeo = new THREE.BoxGeometry(
      bodyWidth * 0.86,
      bodyHeight * 0.45,
      bodyLength * 0.52
    );
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, bodyHeight * 0.72, type === 'truck' ? -0.8 : 0.05);
    cabin.castShadow = true;
    group.add(cabin);

    // Bumpers & Grille
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.96, 0.25, 0.15), bumperMat);
    frontBumper.position.set(0, 0.32, -bodyLength / 2 - 0.07);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.96, 0.25, 0.15), bumperMat);
    rearBumper.position.set(0, 0.32, bodyLength / 2 + 0.07);
    group.add(frontBumper, rearBumper);

    // Headlights & Taillights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
    hlLeft.position.set(-bodyWidth * 0.36, bodyHeight * 0.42, -bodyLength / 2 - 0.09);
    const hlRight = new THREE.Mesh(hlGeo, headlightMat);
    hlRight.position.set(bodyWidth * 0.36, bodyHeight * 0.42, -bodyLength / 2 - 0.09);

    const tlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    const tlLeft = new THREE.Mesh(tlGeo, taillightMat);
    tlLeft.position.set(-bodyWidth * 0.36, bodyHeight * 0.42, bodyLength / 2 + 0.09);
    const tlRight = new THREE.Mesh(tlGeo, taillightMat);
    tlRight.position.set(bodyWidth * 0.36, bodyHeight * 0.42, bodyLength / 2 + 0.09);
    group.add(hlLeft, hlRight, tlLeft, tlRight);

    // 4 Wheels
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.28, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelX = bodyWidth / 2 + 0.05;
    const wheelZOffset = bodyLength * 0.32;
    const wheelZList = [-wheelZOffset, wheelZOffset];

    for (const wz of wheelZList) {
      for (const wxDir of [-1, 1]) {
        const wheelGroup = new THREE.Group();
        const tire = new THREE.Mesh(tireGeo, wheelMat);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheelGroup.add(tire, rim);
        wheelGroup.position.set(wxDir * wheelX, 0.36, wz);
        wheelGroup.castShadow = true;
        group.add(wheelGroup);
      }
    }

    return group;
  }

  public dispose() {
    this.root.clear();
    this.traffic = [];
  }
}
