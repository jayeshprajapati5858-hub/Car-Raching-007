import * as THREE from 'three';
import { TrackDefinition } from '../types/game';

export interface TrackSample {
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

export interface BuiltTrackWorld {
  root: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  roadWidth: number;
  checkpoints: { t: number; point: THREE.Vector3; forward: THREE.Vector3 }[];
  minimapNormalized: [number, number][];
  getClosestSample: (pos: THREE.Vector3, hintIndex?: number) => {
    index: number;
    sample: TrackSample;
    lateralOffset: number;
    distanceSq: number;
  };
  dispose: () => void;
}

const _tempDiff = new THREE.Vector3();

function createAsphaltTexture(
  roadColorHex: string,
  curbPrimaryHex: string,
  curbSecondaryHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = roadColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Fine asphalt aggregate & wet racing line sheen
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.075)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Polished tire racing groove in both lanes
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.fillRect(92, 0, 94, 512);
  ctx.fillRect(326, 0, 94, 512);

  // Alternating painted rumble strips along outer edges
  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? curbPrimaryHex : curbSecondaryHex;
    ctx.fillRect(0, y, 16, 32);
    ctx.fillRect(496, y, 16, 32);
  }

  // Crisp reflective shoulder lines
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(20, 0, 6, 512);
  ctx.fillRect(486, 0, 6, 512);

  // Subtle lane-splitting dashed guide lines in each direction
  ctx.fillStyle = 'rgba(226, 232, 240, 0.32)';
  for (let y = 8; y < 512; y += 64) {
    ctx.fillRect(136, y, 4, 26);
    ctx.fillRect(372, y, 4, 26);
  }

  // Dual center highway divider + glowing cyan cat's-eye dashes
  ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
  ctx.fillRect(250, 0, 3, 512);
  ctx.fillRect(259, 0, 3, 512);

  ctx.fillStyle = '#38bdf8';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(253, y, 6, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 60);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates an architectural skyscraper curtain-wall facade with
 * steel mullions, floor spandrel bands, and warmly/neon-illuminated office windows.
 */
function createBuildingFacadeTexture(
  neonHex: string,
  secondaryHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep architectural glass-steel backing (not pitch black)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 512);

  // Horizontal structural floor spandrel bands
  ctx.fillStyle = '#1e293b';
  for (let y = 0; y < 512; y += 16) {
    ctx.fillRect(0, y, 256, 3);
  }

  // Vertical curtain-wall mullions
  ctx.fillStyle = '#1e293b';
  for (let x = 0; x < 256; x += 24) {
    ctx.fillRect(x, 0, 3, 512);
  }

  // Mechanical mid-tower louver band
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 240, 256, 18);
  ctx.fillStyle = neonHex;
  ctx.fillRect(0, 247, 256, 3);

  // Illuminated windows across floors
  for (let row = 16; row < 496; row += 16) {
    if (row >= 236 && row <= 258) continue;
    const floorLitBias = ((row * 17) % 10) / 10;
    for (let col = 6; col < 246; col += 24) {
      const rand = Math.random();
      if (rand > 0.28 - floorLitBias * 0.15) {
        if (rand > 0.89) {
          ctx.fillStyle = secondaryHex;
        } else if (rand > 0.74) {
          ctx.fillStyle = neonHex;
        } else if (rand > 0.48) {
          ctx.fillStyle = '#fde68a'; // Warm office interior light
        } else {
          ctx.fillStyle = '#e0f2fe'; // Cool daylight LED office
        }
        ctx.globalAlpha = 0.55 + Math.random() * 0.45;
        ctx.fillRect(col, row + 4, 15, 9);
      } else {
        // Unlit reflective window pane
        ctx.fillStyle = '#162238';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(col, row + 4, 15, 9);
      }
    }
  }
  ctx.globalAlpha = 1;

  // Glowing top penthouse sky-lounge crown
  ctx.fillStyle = neonHex;
  ctx.fillRect(0, 2, 256, 6);
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(16, 10, 224, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSponsorBillboardTexture(text: string, subtext: string, primaryHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 160);
  grad.addColorStop(0, '#070b14');
  grad.addColorStop(1, '#111a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 160);

  // Checkered racing flags on left/right edges
  ctx.fillStyle = primaryHex;
  for (let y = 16; y < 144; y += 16) {
    ctx.fillRect((y / 16) % 2 === 0 ? 14 : 30, y, 16, 16);
    ctx.fillRect((y / 16) % 2 === 0 ? 466 : 482, y, 16, 16);
  }

  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 148);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 78);

  ctx.fillStyle = primaryHex;
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtext, 256, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLampPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildTrackWorld(
  trackDef: TrackDefinition,
  maxAnisotropy: number,
  quality: 'low' | 'medium' | 'high'
): BuiltTrackWorld {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const pts = trackDef.controlPoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const roadWidth = trackDef.roadWidth;
  const halfWidth = roadWidth * 0.5;

  const SAMPLE_COUNT = 360;
  const samples: TrackSample[] = [];
  const upVec = new THREE.Vector3(0, 1, 0);

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
    samples.push({ t, point, tangent, right });

    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.z < minZ) minZ = point.z;
    if (point.z > maxZ) maxZ = point.z;
  }

  // Compute normalized 2D minimap points
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const maxSpan = Math.max(spanX, spanZ) * 1.15;
  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;

  const minimapNormalized: [number, number][] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 4) {
    const p = samples[i].point;
    const nx = 0.5 + (p.x - centerX) / maxSpan;
    const ny = 0.5 + (p.z - centerZ) / maxSpan;
    minimapNormalized.push([nx, ny]);
  }

  // 1. Ground Terrain Plane (offset below road at Y = -0.35 to prevent coplanar Z-fighting)
  const groundMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.groundColor),
      roughness: 0.88,
      metalness: 0.1,
    })
  );
  const groundPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1800, 1800)), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.35;
  groundPlane.receiveShadow = quality !== 'low';
  root.add(groundPlane);

  // Night Sky Starfield Dome for Night Circuits
  if (trackDef.theme.isNight && quality !== 'low') {
    const starCount = 380;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 520;
      starPositions[i * 3] = centerX + r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = 80 + r * Math.cos(phi);
      starPositions[i * 3 + 2] = centerZ + r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = trackGeo(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = trackMat(
      new THREE.PointsMaterial({
        color: 0xe0f2fe,
        size: 2.2,
        sizeAttenuation: false,
        fog: false,
      })
    );
    root.add(new THREE.Points(starGeo, starMat));
  }

  // 2. Road Ribbon, Raised Sidewalks & Barrier Walls Geometry
  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  const sidewalkPositions: number[] = [];
  const sidewalkNormals: number[] = [];
  const sidewalkIndices: number[] = [];

  const barrierPositions: number[] = [];
  const barrierNormals: number[] = [];
  const barrierIndices: number[] = [];

  const curbHeight = 0.92;
  const barrierOffset = halfWidth + 0.65;
  const sidewalkOuterOffset = halfWidth + 5.6;

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const s = samples[i % SAMPLE_COUNT];
    const vProgress = i / SAMPLE_COUNT;

    const leftPt = s.point.clone().addScaledVector(s.right, -halfWidth);
    const rightPt = s.point.clone().addScaledVector(s.right, halfWidth);

    roadPositions.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
    roadPositions.push(rightPt.x, rightPt.y + 0.02, rightPt.z);
    roadNormals.push(0, 1, 0, 0, 1, 0);
    roadUvs.push(0, vProgress, 1, vProgress);

    // Sidewalks flanking both sides of the road
    const swLeftIn = s.point.clone().addScaledVector(s.right, -barrierOffset);
    const swLeftOut = s.point.clone().addScaledVector(s.right, -sidewalkOuterOffset);
    const swRightIn = s.point.clone().addScaledVector(s.right, barrierOffset);
    const swRightOut = s.point.clone().addScaledVector(s.right, sidewalkOuterOffset);

    sidewalkPositions.push(
      swLeftOut.x, swLeftOut.y + 0.14, swLeftOut.z,
      swLeftIn.x, swLeftIn.y + 0.14, swLeftIn.z,
      swRightIn.x, swRightIn.y + 0.14, swRightIn.z,
      swRightOut.x, swRightOut.y + 0.14, swRightOut.z
    );
    sidewalkNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

    // Barrier walls
    barrierPositions.push(
      swLeftIn.x, swLeftIn.y, swLeftIn.z,
      swLeftIn.x, swLeftIn.y + curbHeight, swLeftIn.z,
      swRightIn.x, swRightIn.y, swRightIn.z,
      swRightIn.x, swRightIn.y + curbHeight, swRightIn.z
    );
    barrierNormals.push(
      s.right.x, 0.3, s.right.z,
      s.right.x, 0.3, s.right.z,
      -s.right.x, 0.3, -s.right.z,
      -s.right.x, 0.3, -s.right.z
    );

    if (i < SAMPLE_COUNT) {
      const rBase = i * 2;
      roadIndices.push(rBase, rBase + 1, rBase + 2);
      roadIndices.push(rBase + 1, rBase + 3, rBase + 2);

      const swBase = i * 4;
      sidewalkIndices.push(swBase, swBase + 1, swBase + 4);
      sidewalkIndices.push(swBase + 1, swBase + 5, swBase + 4);
      sidewalkIndices.push(swBase + 2, swBase + 3, swBase + 6);
      sidewalkIndices.push(swBase + 3, swBase + 7, swBase + 6);

      const bBase = i * 4;
      barrierIndices.push(bBase, bBase + 1, bBase + 4);
      barrierIndices.push(bBase + 1, bBase + 5, bBase + 4);
      barrierIndices.push(bBase + 2, bBase + 6, bBase + 3);
      barrierIndices.push(bBase + 3, bBase + 6, bBase + 7);
    }
  }

  const roadGeo = trackGeo(new THREE.BufferGeometry());
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);

  const asphaltTex = trackTex(
    createAsphaltTexture(
      trackDef.theme.roadColor,
      trackDef.theme.curbPrimary,
      trackDef.theme.curbSecondary,
      maxAnisotropy
    )
  );
  const roadMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: trackDef.theme.isNight ? 0.32 : 0.58,
      metalness: trackDef.theme.isNight ? 0.35 : 0.14,
    })
  );

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = quality !== 'low';
  root.add(roadMesh);

  // Sidewalk Mesh
  const sidewalkGeo = trackGeo(new THREE.BufferGeometry());
  sidewalkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sidewalkPositions, 3));
  sidewalkGeo.setAttribute('normal', new THREE.Float32BufferAttribute(sidewalkNormals, 3));
  sidewalkGeo.setIndex(sidewalkIndices);
  const sidewalkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.18,
    })
  );
  root.add(new THREE.Mesh(sidewalkGeo, sidewalkMat));

  // Barrier Mesh
  const barrierGeo = trackGeo(new THREE.BufferGeometry());
  barrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(barrierPositions, 3));
  barrierGeo.setAttribute('normal', new THREE.Float32BufferAttribute(barrierNormals, 3));
  barrierGeo.setIndex(barrierIndices);

  const barrierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.curbPrimary),
      emissive: new THREE.Color(trackDef.theme.neonPrimary),
      emissiveIntensity: trackDef.theme.isNight ? 0.45 : 0.14,
      roughness: 0.32,
      metalness: 0.58,
      side: THREE.DoubleSide,
    })
  );
  root.add(new THREE.Mesh(barrierGeo, barrierMat));

  // 3. High-Clearance Slim Truss Start / Finish Gantry Arch at Sample 0
  // Positioned at Y = 9.4m with slim 1.05m LED timing banner so it NEVER blocks camera or road view.
  const s0 = samples[0];
  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(s0.point);
  const yaw0 = Math.atan2(s0.tangent.x, s0.tangent.z);
  gantryGroup.rotation.y = yaw0;

  const towerSpan = halfWidth + 1.85;
  const gantryClearanceY = 9.4;

  const pillarGeo = trackGeo(new THREE.BoxGeometry(0.45, gantryClearanceY + 0.5, 0.45));
  const pillarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.82,
      roughness: 0.25,
    })
  );
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-towerSpan, (gantryClearanceY + 0.5) * 0.5, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(towerSpan, (gantryClearanceY + 0.5) * 0.5, 0);

  // Vertical Neon Accent Strips on Side Towers
  const towerNeonGeo = trackGeo(new THREE.BoxGeometry(0.12, gantryClearanceY - 1.2, 0.5));
  const towerNeonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.neonPrimary),
      emissive: new THREE.Color(trackDef.theme.neonPrimary),
      emissiveIntensity: 1.5,
    })
  );
  const leftTowerNeon = new THREE.Mesh(towerNeonGeo, towerNeonMat);
  leftTowerNeon.position.set(-towerSpan + 0.22, gantryClearanceY * 0.5, 0);
  const rightTowerNeon = new THREE.Mesh(towerNeonGeo, towerNeonMat);
  rightTowerNeon.position.set(towerSpan - 0.22, gantryClearanceY * 0.5, 0);

  // Upper Slim Truss Crossbar
  const trussBarGeo = trackGeo(new THREE.BoxGeometry(towerSpan * 2 + 0.6, 0.28, 0.32));
  const trussBar = new THREE.Mesh(trussBarGeo, pillarMat);
  trussBar.position.set(0, gantryClearanceY + 0.72, 0);

  // Compact High-Clearance LED Start/Finish Banner (1.05m tall, 0.34m deep at Y = 9.4m)
  const bannerTex = trackTex(
    createSponsorBillboardTexture('NITRO RUSH · START / FINISH', 'OFFICIAL CIRCUIT TIMING', trackDef.theme.neonPrimary)
  );
  const bannerGeo = trackGeo(new THREE.BoxGeometry(roadWidth + 1.8, 1.05, 0.34));
  const bannerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: bannerTex,
      emissive: new THREE.Color(trackDef.theme.neonPrimary),
      emissiveIntensity: 0.32,
      roughness: 0.22,
    })
  );
  const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
  bannerMesh.position.set(0, gantryClearanceY, 0);

  // Start Line Checkered Road Strip Decal on Asphalt
  const startLineGeo = trackGeo(new THREE.PlaneGeometry(roadWidth - 0.8, 1.6));
  startLineGeo.rotateX(-Math.PI / 2);
  const startLineMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  const startLineMesh = new THREE.Mesh(startLineGeo, startLineMat);
  startLineMesh.position.set(0, 0.04, 0);

  gantryGroup.add(leftPillar, rightPillar, leftTowerNeon, rightTowerNeon, trussBar, bannerMesh, startLineMesh);
  root.add(gantryGroup);

  // 4. Sequential Checkpoints (12 checkpoints evenly spaced around the loop)
  const CHECKPOINT_COUNT = 12;
  const checkpoints: { t: number; point: THREE.Vector3; forward: THREE.Vector3 }[] = [];
  const cpPylonGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 4.2, 8));
  const cpPylonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.neonSecondary),
      emissive: new THREE.Color(trackDef.theme.neonSecondary),
      emissiveIntensity: 1.15,
      roughness: 0.2,
    })
  );

  for (let c = 0; c < CHECKPOINT_COUNT; c++) {
    const sampleIdx = Math.floor((c / CHECKPOINT_COUNT) * SAMPLE_COUNT) % SAMPLE_COUNT;
    const cs = samples[sampleIdx];
    checkpoints.push({
      t: cs.t,
      point: cs.point.clone(),
      forward: cs.tangent.clone(),
    });

    if (c > 0) {
      const cpLeft = new THREE.Mesh(cpPylonGeo, cpPylonMat);
      cpLeft.position.copy(cs.point).addScaledVector(cs.right, -halfWidth - 0.95);
      cpLeft.position.y += 2.1;

      const cpRight = new THREE.Mesh(cpPylonGeo, cpPylonMat);
      cpRight.position.copy(cs.point).addScaledVector(cs.right, halfWidth + 0.95);
      cpRight.position.y += 2.1;

      root.add(cpLeft, cpRight);
    }
  }

  // 5. Multi-Tiered Architectural City Skyscrapers (Main Towers + Setbacks + Illuminated Windows + Spires + Neon Signs)
  const buildingCount = quality === 'low' ? 75 : quality === 'medium' ? 125 : 170;
  const buildingGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const facadeTex = trackTex(
    createBuildingFacadeTexture(trackDef.theme.neonPrimary, trackDef.theme.neonSecondary, maxAnisotropy)
  );
  const hasWindows = trackDef.id === 'neon_city' || trackDef.id === 'coastal_highway';

  const buildingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(hasWindows ? '#ffffff' : trackDef.theme.buildingBase),
      map: hasWindows ? facadeTex : null,
      emissive: new THREE.Color(hasWindows ? '#ffffff' : '#000000'),
      emissiveMap: hasWindows ? facadeTex : null,
      emissiveIntensity: hasWindows ? (trackDef.theme.isNight ? 0.95 : 0.45) : 0,
      roughness: 0.35,
      metalness: 0.55,
    })
  );

  // Upper Setback Architectural Tier
  const setbackGeo = trackGeo(new THREE.BoxGeometry(0.72, 1, 0.72));
  const roofCrownGeo = trackGeo(new THREE.BoxGeometry(1.04, 0.42, 1.04));
  const roofCrownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.neonPrimary),
      emissive: new THREE.Color(trackDef.theme.neonPrimary),
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );

  // Rooftop Communication Spires
  const spireGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.25, 8.5, 6));
  const spireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: new THREE.Color(trackDef.theme.neonSecondary),
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.2,
    })
  );

  // Vertical Building-Mounted Neon Sign Fins
  const neonFinGeo = trackGeo(new THREE.BoxGeometry(0.35, 9.5, 2.2));
  const neonFinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trackDef.theme.neonSecondary),
      emissive: new THREE.Color(trackDef.theme.neonSecondary),
      emissiveIntensity: 1.6,
      roughness: 0.18,
    })
  );

  const buildingsInstanced = new THREE.InstancedMesh(buildingGeo, buildingMat, buildingCount);
  const setbacksInstanced = new THREE.InstancedMesh(setbackGeo, buildingMat, buildingCount);
  const crownsInstanced = new THREE.InstancedMesh(roofCrownGeo, roofCrownMat, buildingCount);
  const spiresInstanced = new THREE.InstancedMesh(spireGeo, spireMat, buildingCount);
  const neonFinsInstanced = new THREE.InstancedMesh(neonFinGeo, neonFinMat, buildingCount);

  const dummy = new THREE.Object3D();
  const bColor = new THREE.Color();
  let placedBuildings = 0;

  for (let i = 0; i < buildingCount; i++) {
    const sIdx = Math.floor((i / buildingCount) * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = samples[sIdx];
    const side = i % 2 === 0 ? 1 : -1;
    const distFromCenter = halfWidth + 22 + (i % 5) * 10.5;
    const pos = s.point.clone().addScaledVector(s.right, side * distFromCenter);

    const minSafeDistSq = (halfWidth + 16) * (halfWidth + 16);
    const isNearRoad = (p: THREE.Vector3) => {
      for (let check = 0; check < SAMPLE_COUNT; check += 3) {
        const sp = samples[check].point;
        const dx = p.x - sp.x;
        const dz = p.z - sp.z;
        if (dx * dx + dz * dz < minSafeDistSq) return true;
      }
      return false;
    };

    if (isNearRoad(pos)) {
      pos.addScaledVector(s.right, side * 32);
      if (isNearRoad(pos)) {
        continue;
      }
    }

    const w = 12 + (i % 4) * 4.5;
    const d = 12 + ((i * 3) % 4) * 4.5;
    const h = trackDef.id === 'neon_city' ? 28 + (i % 8) * 13 : 16 + (i % 6) * 10;
    const setbackH = h * 0.28;
    const yaw = Math.atan2(s.tangent.x, s.tangent.z);

    // Main Tower Shaft
    dummy.position.set(pos.x, pos.y + h * 0.5 - 0.5, pos.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    buildingsInstanced.setMatrixAt(placedBuildings, dummy.matrix);

    if (hasWindows) {
      bColor.set('#e2e8f0').offsetHSL(((i % 5) - 2) * 0.03, 0, ((i % 3) - 1) * 0.06);
    } else {
      bColor.set(trackDef.theme.buildingBase).offsetHSL(0, 0, ((i % 5) - 2) * 0.04);
    }
    buildingsInstanced.setColorAt(placedBuildings, bColor);

    // Upper Stepped Setback Tier
    dummy.position.set(pos.x, pos.y + h + setbackH * 0.5 - 0.6, pos.z);
    dummy.scale.set(w, setbackH, d);
    dummy.updateMatrix();
    setbacksInstanced.setMatrixAt(placedBuildings, dummy.matrix);
    setbacksInstanced.setColorAt(placedBuildings, bColor);

    // Rooftop Neon Trim Crown
    dummy.position.set(pos.x, pos.y + h - 0.5, pos.z);
    dummy.scale.set(w, 1, d);
    dummy.updateMatrix();
    crownsInstanced.setMatrixAt(placedBuildings, dummy.matrix);

    // Rooftop Communication Spire on every second tower
    if (i % 2 === 0) {
      dummy.position.set(pos.x, pos.y + h + setbackH + 3.5, pos.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      spiresInstanced.setMatrixAt(placedBuildings, dummy.matrix);
    } else {
      dummy.position.set(0, -200, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      spiresInstanced.setMatrixAt(placedBuildings, dummy.matrix);
    }

    // Vertical Building-Mounted Neon Sign Fin facing the road
    if (hasWindows && i % 3 === 0) {
      const finPos = pos.clone().addScaledVector(s.right, -side * (w * 0.5 + 0.3));
      dummy.position.set(finPos.x, pos.y + 11 + (i % 3) * 4, finPos.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      neonFinsInstanced.setMatrixAt(placedBuildings, dummy.matrix);
    } else {
      dummy.position.set(0, -200, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      neonFinsInstanced.setMatrixAt(placedBuildings, dummy.matrix);
    }

    placedBuildings++;
  }

  buildingsInstanced.count = placedBuildings;
  buildingsInstanced.instanceMatrix.needsUpdate = true;
  if (buildingsInstanced.instanceColor) buildingsInstanced.instanceColor.needsUpdate = true;
  buildingsInstanced.computeBoundingSphere();
  root.add(buildingsInstanced);

  setbacksInstanced.count = placedBuildings;
  setbacksInstanced.instanceMatrix.needsUpdate = true;
  if (setbacksInstanced.instanceColor) setbacksInstanced.instanceColor.needsUpdate = true;
  setbacksInstanced.computeBoundingSphere();
  root.add(setbacksInstanced);

  if (trackDef.theme.isNight || hasWindows) {
    crownsInstanced.count = placedBuildings;
    crownsInstanced.instanceMatrix.needsUpdate = true;
    crownsInstanced.computeBoundingSphere();

    spiresInstanced.count = placedBuildings;
    spiresInstanced.instanceMatrix.needsUpdate = true;
    spiresInstanced.computeBoundingSphere();

    neonFinsInstanced.count = placedBuildings;
    neonFinsInstanced.instanceMatrix.needsUpdate = true;
    neonFinsInstanced.computeBoundingSphere();

    root.add(crownsInstanced, spiresInstanced, neonFinsInstanced);
  }

  // 6. InstancedMesh Streetlights & Traffic Signals
  const lampCount = quality === 'low' ? 38 : 60;
  const lampPoleGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.16, 7.4, 6));
  const lampPoleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.32,
      metalness: 0.82,
    })
  );
  const lampHeadGeo = trackGeo(new THREE.BoxGeometry(1.9, 0.18, 0.38));
  const lampHeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: new THREE.Color(trackDef.theme.neonPrimary),
      emissiveIntensity: 2.2,
    })
  );
  const signalLightGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.95, 0.35));
  const signalLightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
    })
  );

  const poolGeo = trackGeo(new THREE.PlaneGeometry(10.0, 10.0));
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: trackTex(createLampPoolTexture()),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const lampsInstanced = new THREE.InstancedMesh(lampPoleGeo, lampPoleMat, lampCount);
  const headsInstanced = new THREE.InstancedMesh(lampHeadGeo, lampHeadMat, lampCount);
  const signalsInstanced = new THREE.InstancedMesh(signalLightGeo, signalLightMat, lampCount);
  const poolsInstanced = new THREE.InstancedMesh(poolGeo, poolMat, lampCount);

  for (let i = 0; i < lampCount; i++) {
    const sIdx = Math.floor((i / lampCount) * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = samples[sIdx];
    const side = i % 2 === 0 ? 1 : -1;
    const polePos = s.point.clone().addScaledVector(s.right, side * (halfWidth + 1.5));
    const roadYaw = Math.atan2(s.tangent.x, s.tangent.z);

    dummy.position.set(polePos.x, polePos.y + 3.7, polePos.z);
    dummy.rotation.set(0, roadYaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampsInstanced.setMatrixAt(i, dummy.matrix);

    const headPos = s.point.clone().addScaledVector(s.right, side * (halfWidth + 0.55));
    dummy.position.set(headPos.x, polePos.y + 7.3, headPos.z);
    dummy.rotation.set(0, roadYaw + Math.PI / 2, 0);
    dummy.updateMatrix();
    headsInstanced.setMatrixAt(i, dummy.matrix);

    // Every 4th lamppost also mounts a glowing street traffic signal box
    if (i % 4 === 0) {
      const sigPos = s.point.clone().addScaledVector(s.right, side * (halfWidth + 1.1));
      dummy.position.set(sigPos.x, polePos.y + 4.8, sigPos.z);
      dummy.rotation.set(0, roadYaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      signalsInstanced.setMatrixAt(i, dummy.matrix);
      signalsInstanced.setColorAt(
        i,
        new THREE.Color(i % 8 === 0 ? '#10b981' : i % 12 === 0 ? '#f59e0b' : '#38bdf8')
      );
    } else {
      dummy.position.set(0, -200, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      signalsInstanced.setMatrixAt(i, dummy.matrix);
    }

    const poolPos = s.point.clone().addScaledVector(s.right, side * (halfWidth * 0.45));
    dummy.position.set(poolPos.x, s.point.y + 0.04, poolPos.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poolsInstanced.setMatrixAt(i, dummy.matrix);
  }
  lampsInstanced.instanceMatrix.needsUpdate = true;
  lampsInstanced.computeBoundingSphere();
  headsInstanced.instanceMatrix.needsUpdate = true;
  headsInstanced.computeBoundingSphere();
  signalsInstanced.instanceMatrix.needsUpdate = true;
  if (signalsInstanced.instanceColor) signalsInstanced.instanceColor.needsUpdate = true;
  signalsInstanced.computeBoundingSphere();
  root.add(lampsInstanced, headsInstanced, signalsInstanced);

  if (trackDef.theme.isNight && quality !== 'low') {
    poolsInstanced.instanceMatrix.needsUpdate = true;
    poolsInstanced.computeBoundingSphere();
    root.add(poolsInstanced);
  }

  // 7. Roadside Boulevard Trees & Illuminated Planters (InstancedMesh)
  const treeCount = quality === 'low' ? 40 : 72;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6));
  const trunkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.75,
    })
  );
  const canopyGeo = trackGeo(new THREE.IcosahedronGeometry(1.85, 1));
  const canopyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: trackDef.id === 'desert_canyon' ? 0x3f6212 : 0x0d9488,
      emissive: new THREE.Color(trackDef.theme.isNight ? '#0f766e' : '#000000'),
      emissiveIntensity: trackDef.theme.isNight ? 0.35 : 0,
      roughness: 0.65,
    })
  );

  const trunksInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopiesInstanced = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);

  for (let i = 0; i < treeCount; i++) {
    const sIdx = Math.floor(((i + 0.5) / treeCount) * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = samples[sIdx];
    const side = i % 2 === 0 ? -1 : 1;
    const treePos = s.point.clone().addScaledVector(s.right, side * (halfWidth + 3.8));
    const scaleVar = 0.85 + (i % 4) * 0.14;

    dummy.position.set(treePos.x, treePos.y + 1.3 * scaleVar, treePos.z);
    dummy.rotation.set(0, i * 1.1, 0);
    dummy.scale.setScalar(scaleVar);
    dummy.updateMatrix();
    trunksInstanced.setMatrixAt(i, dummy.matrix);

    dummy.position.set(treePos.x, treePos.y + 3.4 * scaleVar, treePos.z);
    dummy.scale.set(scaleVar, scaleVar * 1.25, scaleVar);
    dummy.updateMatrix();
    canopiesInstanced.setMatrixAt(i, dummy.matrix);
  }
  trunksInstanced.instanceMatrix.needsUpdate = true;
  trunksInstanced.computeBoundingSphere();
  canopiesInstanced.instanceMatrix.needsUpdate = true;
  canopiesInstanced.computeBoundingSphere();
  root.add(trunksInstanced, canopiesInstanced);

  // 8. Fictional Trackside Neon Billboards (Elevated & Angled Outside Sidewalks)
  const sponsors = [
    ['APEX MOTORSPORT', 'PRECISION TRACK DYNAMICS', trackDef.theme.neonPrimary],
    ['VOLT NITRO SYSTEMS', 'CRYO-INJECTION BOOST', trackDef.theme.neonSecondary],
    ['KUROSHI TIRES', 'ULTRA-GRIP SEMI-SLICK', trackDef.theme.neonPrimary],
    ['HYPERION LABS', 'HYBRID POWERTRAIN ZERO', trackDef.theme.neonSecondary],
    ['VORTEX TUNING', 'TWIN-SCROLL TURBO SYSTEMS', trackDef.theme.neonPrimary],
    ['PULSE SYNTH AUDIO', 'MIDNIGHT STREET SESSIONS', trackDef.theme.neonSecondary],
  ];

  const boardGeo = trackGeo(new THREE.BoxGeometry(10.5, 3.6, 0.4));
  sponsors.forEach(([title, sub, color], idx) => {
    const sIdx = Math.floor(((idx + 0.45) / sponsors.length) * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = samples[sIdx];
    const side = idx % 2 === 0 ? 1 : -1;
    const tex = trackTex(createSponsorBillboardTexture(title, sub, color));
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.28,
        roughness: 0.22,
      })
    );
    const mesh = new THREE.Mesh(boardGeo, mat);
    mesh.position.copy(s.point).addScaledVector(s.right, side * (halfWidth + 8.6));
    mesh.position.y += 5.4;
    mesh.rotation.y = Math.atan2(s.tangent.x, s.tangent.z) + (side > 0 ? -0.38 : 0.38);
    root.add(mesh);
  });

  // Fast closest sample finder with optional local hint window
  const getClosestSample = (pos: THREE.Vector3, hintIndex?: number) => {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < SAMPLE_COUNT) {
      const windowRadius = 28;
      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const idx = (hintIndex + offset + SAMPLE_COUNT) % SAMPLE_COUNT;
        const p = samples[idx].point;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    if (bestDistSq > 900) {
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const p = samples[i].point;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const sample = samples[bestIdx];
    _tempDiff.subVectors(pos, sample.point);
    const lateralOffset = _tempDiff.dot(sample.right);

    return {
      index: bestIdx,
      sample,
      lateralOffset,
      distanceSq: bestDistSq,
    };
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    root,
    curve,
    samples,
    totalLength,
    roadWidth,
    checkpoints,
    minimapNormalized,
    getClosestSample,
    dispose,
  };
}
