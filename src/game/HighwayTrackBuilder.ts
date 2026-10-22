import * as THREE from 'three';

export interface HighwayEnvironmentTheme {
  id: string;
  name: string;
  skyTop: string;
  skyHorizon: string;
  roadColor: string;
  barrierColor: string;
  buildingBase: string;
  neonColor: string;
  isNight: boolean;
}

export const HIGHWAY_THEMES: Record<string, HighwayEnvironmentTheme> = {
  midnight_express: {
    id: 'midnight_express',
    name: 'Midnight Expressway',
    skyTop: '#04060a',
    skyHorizon: '#0b1329',
    roadColor: '#121622',
    barrierColor: '#0ea5e9',
    buildingBase: '#090d16',
    neonColor: '#38bdf8',
    isNight: true,
  },
  coastal_sunset: {
    id: 'coastal_sunset',
    name: 'Coastal Sunset Highway',
    skyTop: '#1e1b4b',
    skyHorizon: '#f97316',
    roadColor: '#181b25',
    barrierColor: '#f59e0b',
    buildingBase: '#1e293b',
    neonColor: '#fb923c',
    isNight: false,
  },
  desert_freeway: {
    id: 'desert_freeway',
    name: 'Desert Freeway',
    skyTop: '#0f172a',
    skyHorizon: '#ea580c',
    roadColor: '#1a1d26',
    barrierColor: '#f97316',
    buildingBase: '#332924',
    neonColor: '#f97316',
    isNight: false,
  },
};

export class HighwayTrackBuilder {
  public readonly root = new THREE.Group();
  private readonly segmentLength = 120;
  private readonly segmentCount = 6;
  private segments: THREE.Group[] = [];
  private theme: HighwayEnvironmentTheme;

  constructor(themeId: string = 'midnight_express') {
    this.theme = HIGHWAY_THEMES[themeId] || HIGHWAY_THEMES.midnight_express;
    this.buildWorld();
  }

  private buildWorld() {
    for (let i = 0; i < this.segmentCount; i++) {
      const seg = this.createSegment(i * this.segmentLength, i);
      this.segments.push(seg);
      this.root.add(seg);
    }
  }

  private createSegment(zOffset: number, index: number): THREE.Group {
    const group = new THREE.Group();
    group.position.z = zOffset;

    const roadWidth = 20; // 5 lanes * 4m

    // Asphalt Road Plane
    const roadGeo = new THREE.PlaneGeometry(roadWidth, this.segmentLength, 2, 20);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: this.theme.roadColor,
      roughness: 0.45,
      metalness: 0.15,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    group.add(road);

    // Lane Markings (dashed dividing lines)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.85 });
    for (let lane = -1.5; lane <= 1.5; lane += 1.0) {
      if (Math.abs(lane) < 0.1) continue;
      const xPos = lane * 4.0;
      for (let z = -this.segmentLength / 2 + 5; z < this.segmentLength / 2; z += 12) {
        const dashGeo = new THREE.PlaneGeometry(0.25, 6);
        dashGeo.rotateX(-Math.PI / 2);
        const dash = new THREE.Mesh(dashGeo, lineMat);
        dash.position.set(xPos, 0.03, z);
        group.add(dash);
      }
    }

    // Center Double Yellow Lines
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const yLine1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, this.segmentLength), yellowMat);
    yLine1.rotateX(-Math.PI / 2);
    yLine1.position.set(-0.22, 0.03, 0);
    const yLine2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, this.segmentLength), yellowMat);
    yLine2.rotateX(-Math.PI / 2);
    yLine2.position.set(0.22, 0.03, 0);
    group.add(yLine1, yLine2);

    // Concrete Jersey Barriers
    const barrierGeo = new THREE.BoxGeometry(0.8, 1.2, this.segmentLength);
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.5,
      metalness: 0.3,
    });
    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(-roadWidth / 2 - 0.4, 0.6, 0);
    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(roadWidth / 2 + 0.4, 0.6, 0);
    group.add(leftBarrier, rightBarrier);

    // Streetlights & Overhead Gantry Portals
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 7, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const leftPole = new THREE.Mesh(poleGeo, poleMat);
    leftPole.position.set(-roadWidth / 2 - 1.2, 3.5, -this.segmentLength / 2 + 15);
    const rightPole = new THREE.Mesh(poleGeo, poleMat);
    rightPole.position.set(roadWidth / 2 + 1.2, 3.5, -this.segmentLength / 2 + 15);
    group.add(leftPole, rightPole);

    // Overhead Bridge / Overpass on alternate segments
    if (index % 2 === 1) {
      const gantryGroup = new THREE.Group();
      const pillarGeo = new THREE.BoxGeometry(1.2, 8, 1.2);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
      pLeft.position.set(-roadWidth / 2 - 3, 4, 0);
      const pRight = new THREE.Mesh(pillarGeo, pillarMat);
      pRight.position.set(roadWidth / 2 + 3, 4, 0);

      const bridgeSpanGeo = new THREE.BoxGeometry(roadWidth + 8, 1.5, 3.5);
      const bridgeSpan = new THREE.Mesh(bridgeSpanGeo, pillarMat);
      bridgeSpan.position.set(0, 8, 0);
      gantryGroup.add(pLeft, pRight, bridgeSpan);
      group.add(gantryGroup);
    }

    // Illuminated Tunnel on every 4th segment
    if (index % 4 === 2) {
      const tunnelGroup = new THREE.Group();
      const archMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // Tunnel walls & roof
      const tunnelRoof = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 4, 0.8, this.segmentLength), archMat);
      tunnelRoof.position.set(0, 6.4, 0);
      tunnelGroup.add(tunnelRoof);

      // Interior ceiling strip lights
      for (let z = -this.segmentLength / 2 + 10; z < this.segmentLength / 2; z += 20) {
        const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.5), lightMat);
        lightStrip.position.set(0, 5.9, z);
        tunnelGroup.add(lightStrip);
      }
      group.add(tunnelGroup);
    }

    // Distant Skyscrapers / Scenery
    const buildingMat = new THREE.MeshStandardMaterial({
      color: this.theme.buildingBase,
      roughness: 0.3,
      metalness: 0.5,
    });
    for (let side = -1; side <= 1; side += 2) {
      const bGeo = new THREE.BoxGeometry(16, 50 + Math.random() * 40, 60);
      const b = new THREE.Mesh(bGeo, buildingMat);
      b.position.set(side * (roadWidth / 2 + 28), 25, (Math.random() - 0.5) * 40);
      group.add(b);
    }

    return group;
  }

  public update(playerZ: number) {
    for (const seg of this.segments) {
      if (seg.position.z > playerZ + this.segmentLength * 1.5) {
        seg.position.z -= this.segmentCount * this.segmentLength;
      } else if (seg.position.z < playerZ - this.segmentLength * 2.5) {
        seg.position.z += this.segmentCount * this.segmentLength;
      }
    }
  }

  public dispose() {
    this.root.clear();
  }
}
