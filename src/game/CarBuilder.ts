import * as THREE from 'three';
import { CAR_CATALOG } from '../data/cars';
import { CarCustomization, CarId } from '../types/game';
import { assetManager, DEFAULT_VEHICLE_MANIFEST } from './AssetManager';

export interface BuiltCarRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  wheelSteerPivots: [THREE.Group, THREE.Group]; // Front Left, Front Right
  wheelSpinGroups: [THREE.Group, THREE.Group, THREE.Group, THREE.Group]; // FL, FR, RL, RR
  nitroFlames: [THREE.Mesh, THREE.Mesh];
  taillightMat: THREE.MeshStandardMaterial;
  bodyPaintMat: THREE.MeshPhysicalMaterial;
  accentMat: THREE.MeshStandardMaterial;
  wheelRimMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

let cachedShadowTexture: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTexture) return cachedShadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 128, 12, 64, 128, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
  grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.52)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedShadowTexture = tex;
  return tex;
}

let cachedHeadlightBeamTexture: THREE.CanvasTexture | null = null;
function getHeadlightBeamTexture(): THREE.CanvasTexture {
  if (cachedHeadlightBeamTexture) return cachedHeadlightBeamTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(64, 256, 64, 0);
  grad.addColorStop(0, 'rgba(125, 211, 252, 0.42)');
  grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.16)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(40, 256);
  ctx.lineTo(88, 256);
  ctx.lineTo(126, 0);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedHeadlightBeamTexture = tex;
  return tex;
}

let cachedCarbonTexture: THREE.CanvasTexture | null = null;
function getCarbonTexture(): THREE.CanvasTexture {
  if (cachedCarbonTexture) return cachedCarbonTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14161d';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#252936';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if (((x + y) / 8) % 2 === 0) {
        ctx.fillRect(x, y, 6, 4);
      } else {
        ctx.fillRect(x + 2, y + 4, 6, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedCarbonTexture = tex;
  return tex;
}

/**
 * Creates a curved wheel-arch fender flare using an extruded arch profile
 * so wheel wells have smooth rounded contours instead of boxy blocks.
 */
function createCurvedFenderArchGeometry(
  archRadiusOuter: number,
  archRadiusInner: number,
  flareDepth: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const segments = 18;
  // Outer arch curve from -0.15 rad to PI + 0.15 rad
  for (let i = 0; i <= segments; i++) {
    const theta = -0.12 + (i / segments) * (Math.PI + 0.24);
    const x = Math.cos(theta) * archRadiusOuter;
    const y = Math.sin(theta) * archRadiusOuter;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // Inner wheel-well cutout curve back
  for (let i = segments; i >= 0; i--) {
    const theta = -0.12 + (i / segments) * (Math.PI + 0.24);
    const x = Math.cos(theta) * archRadiusInner;
    const y = Math.sin(theta) * archRadiusInner;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: flareDepth,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    curveSegments: 18,
  });
  geo.center();
  geo.rotateY(Math.PI / 2);
  return geo;
}

/**
 * Creates a rounded-shoulder racing tire using LatheGeometry so the tire
 * has realistic curved sidewalls and wide contact tread.
 */
function createLatheTireGeometry(radius: number, width: number): THREE.LatheGeometry {
  const halfW = width * 0.5;
  const innerR = radius * 0.66;
  const shoulderR = radius * 0.95;
  const pts = [
    new THREE.Vector2(innerR, -halfW * 0.88),
    new THREE.Vector2(shoulderR, -halfW),
    new THREE.Vector2(radius, -halfW * 0.78),
    new THREE.Vector2(radius, halfW * 0.78),
    new THREE.Vector2(shoulderR, halfW),
    new THREE.Vector2(innerR, halfW * 0.88),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

export function buildProceduralCar(
  carId: CarId,
  customization: CarCustomization,
  isSoftwareGl: boolean
): BuiltCarRig {
  const carDef = CAR_CATALOG[carId] || CAR_CATALOG.vortex_gtr;
  const style = carDef.bodyStyle;

  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };

  const isPrism = customization.skinId === 'cyber_prism';
  const isCarbon = customization.skinId === 'carbon_stealth';

  // High-gloss metallic automotive clearcoat paint
  const bodyPaintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isCarbon ? '#1e293b' : customization.bodyColor),
      map: isCarbon ? getCarbonTexture() : null,
      metalness: isCarbon ? 0.55 : 0.86,
      roughness: isCarbon ? 0.28 : 0.12,
      clearcoat: isSoftwareGl ? 0 : 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.45,
      iridescence: !isSoftwareGl && isPrism ? 0.95 : 0,
      iridescenceIOR: 1.45,
    })
  );

  const carbonTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x141821,
      map: getCarbonTexture(),
      roughness: 0.38,
      metalness: 0.48,
    })
  );

  const grilleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x06080d,
      roughness: 0.72,
      metalness: 0.3,
    })
  );

  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(customization.accentColor || carDef.defaultAccentColor),
      emissive: new THREE.Color(customization.accentColor || carDef.defaultAccentColor),
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.72,
    })
  );

  // Dark tinted reflective automotive glass canopy
  const canopyGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x050811,
      metalness: 0.28,
      roughness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.93 : 1.0,
      ior: 1.54,
      clearcoat: isSoftwareGl ? 0 : 1.0,
      envMapIntensity: 1.65,
    })
  );

  const headlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.8,
      roughness: 0.06,
    })
  );

  const taillightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff1a2b,
      emissive: 0xef4444,
      emissiveIntensity: 1.6,
      roughness: 0.12,
    })
  );

  const tireRubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x10131a,
      roughness: 0.78,
      metalness: 0.12,
    })
  );

  const wheelRimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(customization.wheelColor || carDef.defaultWheelColor),
      roughness: 0.15,
      metalness: 0.92,
      envMapIntensity: 1.4,
    })
  );

  const brakeDiscMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.88,
    })
  );

  // 1. Soft Vehicle Contact Shadow Plane + Headlight Ground Beam Projection
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.75, 5.35)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: getContactShadowTexture(),
        transparent: true,
        opacity: 0.84,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    )
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  root.add(shadowPlane);

  const beamPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(3.4, 7.2)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: getHeadlightBeamTexture(),
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    )
  );
  beamPlane.rotation.x = -Math.PI / 2;
  beamPlane.position.set(0, 0.035, -5.5);
  root.add(beamPlane);

  const bodyWidth = style === 'hypercar' ? 2.12 : style === 'supercar' ? 2.04 : 1.96;

  // 2. Sculpted Multi-Curve Aerodynamic Center Fuselage (Smooth Spline Profile)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.32, 0.19);
  hullShape.quadraticCurveTo(-2.38, 0.34, -2.12, 0.44);
  hullShape.quadraticCurveTo(-1.65, 0.58, -1.05, 0.64);
  hullShape.lineTo(1.25, 0.68);
  hullShape.quadraticCurveTo(1.95, 0.72, 2.24, 0.58);
  hullShape.quadraticCurveTo(2.32, 0.42, 2.26, 0.24);
  hullShape.lineTo(-2.32, 0.19);
  hullShape.closePath();

  const hullGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: bodyWidth * 0.72,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 2,
      bevelSize: 0.14,
      bevelThickness: 0.14,
      curveSegments: 24,
    })
  );
  hullGeo.center();
  hullGeo.rotateY(Math.PI / 2);

  const mainHull = new THREE.Mesh(hullGeo, bodyPaintMat);
  mainHull.position.set(0, 0.47, 0);
  mainHull.castShadow = !isSoftwareGl;
  mainHull.receiveShadow = !isSoftwareGl;
  chassisGroup.add(mainHull);

  // 3. Sculpted Side Pontoon Flanks & Curved Door Air Channels
  const flankShape = new THREE.Shape();
  flankShape.moveTo(-1.85, 0.18);
  flankShape.quadraticCurveTo(-1.6, 0.52, -0.85, 0.56);
  flankShape.lineTo(1.05, 0.6);
  flankShape.quadraticCurveTo(1.75, 0.62, 1.95, 0.32);
  flankShape.lineTo(1.85, 0.18);
  flankShape.closePath();

  const flankGeo = trackGeo(
    new THREE.ExtrudeGeometry(flankShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      curveSegments: 18,
    })
  );
  flankGeo.center();
  flankGeo.rotateY(Math.PI / 2);

  const leftFlank = new THREE.Mesh(flankGeo, bodyPaintMat);
  leftFlank.position.set(-bodyWidth * 0.38, 0.42, 0.04);
  leftFlank.castShadow = !isSoftwareGl;
  const rightFlank = new THREE.Mesh(flankGeo, bodyPaintMat);
  rightFlank.position.set(bodyWidth * 0.38, 0.42, 0.04);
  rightFlank.castShadow = !isSoftwareGl;
  chassisGroup.add(leftFlank, rightFlank);

  // Side intake scoop blades behind doors
  const intakeBladeGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.28, 0.68));
  const intakeL = new THREE.Mesh(intakeBladeGeo, carbonTrimMat);
  intakeL.position.set(-bodyWidth * 0.47, 0.48, 0.45);
  intakeL.rotation.z = -0.18;
  const intakeR = new THREE.Mesh(intakeBladeGeo, carbonTrimMat);
  intakeR.position.set(bodyWidth * 0.47, 0.48, 0.45);
  intakeR.rotation.z = 0.18;
  chassisGroup.add(intakeL, intakeR);

  // 4. Curved Widebody Wheel-Arch Fenders (Front & Rear Left/Right)
  const frontArchGeo = trackGeo(createCurvedFenderArchGeometry(0.51, 0.38, 0.24));
  const rearArchGeo = trackGeo(createCurvedFenderArchGeometry(0.54, 0.39, 0.26));

  const archFL = new THREE.Mesh(frontArchGeo, bodyPaintMat);
  archFL.position.set(-bodyWidth * 0.43, 0.4, -1.36);
  archFL.castShadow = !isSoftwareGl;
  const archFR = new THREE.Mesh(frontArchGeo, bodyPaintMat);
  archFR.position.set(bodyWidth * 0.43, 0.4, -1.36);
  archFR.castShadow = !isSoftwareGl;

  const archRL = new THREE.Mesh(rearArchGeo, bodyPaintMat);
  archRL.position.set(-bodyWidth * 0.44, 0.42, 1.34);
  archRL.castShadow = !isSoftwareGl;
  const archRR = new THREE.Mesh(rearArchGeo, bodyPaintMat);
  archRR.position.set(bodyWidth * 0.44, 0.42, 1.34);
  archRR.castShadow = !isSoftwareGl;
  chassisGroup.add(archFL, archFR, archRL, archRR);

  // 5. Teardrop Aerodynamic Glass Canopy / Greenhouse & Painted Roof Spine
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.18, -0.02);
  cabinShape.quadraticCurveTo(-0.58, 0.44, -0.08, 0.46);
  cabinShape.quadraticCurveTo(0.45, 0.46, 0.82, 0.36);
  cabinShape.quadraticCurveTo(1.32, 0.2, 1.62, 0.02);
  cabinShape.closePath();

  const cabinGeo = trackGeo(
    new THREE.ExtrudeGeometry(cabinShape, {
      depth: bodyWidth * 0.6,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.09,
      bevelThickness: 0.09,
      curveSegments: 22,
    })
  );
  cabinGeo.center();
  cabinGeo.rotateY(Math.PI / 2);

  const cabinMesh = new THREE.Mesh(cabinGeo, canopyGlassMat);
  cabinMesh.position.set(0, 0.89, 0.14);
  chassisGroup.add(cabinMesh);

  // Sculpted Roof Panel & Rear Engine Louver Spine
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.35, 0);
  roofShape.quadraticCurveTo(0.1, 0.07, 0.55, 0.04);
  roofShape.lineTo(0.55, -0.02);
  roofShape.lineTo(-0.35, -0.02);
  roofShape.closePath();

  const roofGeo = trackGeo(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: bodyWidth * 0.48,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      curveSegments: 12,
    })
  );
  roofGeo.center();
  roofGeo.rotateY(Math.PI / 2);
  const roofCap = new THREE.Mesh(roofGeo, bodyPaintMat);
  roofCap.position.set(0, 1.13, 0.05);
  chassisGroup.add(roofCap);

  // Rear deck engine louvers (3 carbon slats over rear fastback)
  const louverGeo = trackGeo(new THREE.BoxGeometry(bodyWidth * 0.44, 0.025, 0.12));
  for (let l = 0; l < 3; l++) {
    const louver = new THREE.Mesh(louverGeo, carbonTrimMat);
    louver.position.set(0, 0.96 - l * 0.055, 0.92 + l * 0.22);
    louver.rotation.x = 0.22;
    chassisGroup.add(louver);
  }

  // Aerodynamic Wing Mirrors on Stalks
  const mirrorCapGeo = trackGeo(new THREE.CapsuleGeometry(0.045, 0.12, 6, 10));
  mirrorCapGeo.rotateZ(Math.PI / 2);
  const mirrorL = new THREE.Mesh(mirrorCapGeo, bodyPaintMat);
  mirrorL.position.set(-bodyWidth * 0.47, 0.84, -0.56);
  const mirrorR = new THREE.Mesh(mirrorCapGeo, bodyPaintMat);
  mirrorR.position.set(bodyWidth * 0.47, 0.84, -0.56);
  chassisGroup.add(mirrorL, mirrorR);

  // 6. Front Aero Splitter, Canards, Intake Grille & Hood Vent
  const frontGrille = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth * 0.72, 0.16, 0.12)),
    grilleMat
  );
  frontGrille.position.set(0, 0.31, -2.28);
  chassisGroup.add(frontGrille);

  const frontSplitter = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth + 0.06, 0.045, 0.56)),
    carbonTrimMat
  );
  frontSplitter.position.set(0, 0.19, -2.14);
  chassisGroup.add(frontSplitter);

  const splitterAccent = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth + 0.08, 0.02, 0.58)),
    accentMat
  );
  splitterAccent.position.set(0, 0.175, -2.15);
  chassisGroup.add(splitterAccent);

  // Recessed Hood Aero Scoop & Accent Trim
  const hoodVent = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.58, 0.03, 0.75)),
    carbonTrimMat
  );
  hoodVent.position.set(0, 0.68, -1.48);
  hoodVent.rotation.x = 0.15;
  chassisGroup.add(hoodVent);

  const hoodAccent = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.032, 1.15)),
    accentMat
  );
  hoodAccent.position.set(0, 0.71, -1.42);
  hoodAccent.rotation.x = 0.14;
  chassisGroup.add(hoodAccent);

  // 7. Carbon Side Skirts & Illuminated Rocker Accent Strip
  const sideSkirts = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth + 0.06, 0.065, 2.35)),
    carbonTrimMat
  );
  sideSkirts.position.set(0, 0.21, 0);
  chassisGroup.add(sideSkirts);

  const sideAccentBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth + 0.08, 0.022, 2.2)),
    accentMat
  );
  sideAccentBar.position.set(0, 0.185, 0);
  chassisGroup.add(sideAccentBar);

  // 8. Rear Multi-Vane Carbon Diffuser & Dual Titanium Exhaust Nozzles
  const rearDiffuser = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth * 0.9, 0.18, 0.36)),
    carbonTrimMat
  );
  rearDiffuser.position.set(0, 0.25, 2.18);
  chassisGroup.add(rearDiffuser);

  const strakeGeo = trackGeo(new THREE.BoxGeometry(0.025, 0.18, 0.38));
  for (let s = -2; s <= 2; s++) {
    const strake = new THREE.Mesh(strakeGeo, carbonTrimMat);
    strake.position.set(s * 0.28, 0.24, 2.2);
    chassisGroup.add(strake);
  }

  const exhaustGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.078, 0.26, 16));
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustLeft = new THREE.Mesh(exhaustGeo, wheelRimMat);
  exhaustLeft.position.set(-0.46, 0.3, 2.32);
  const exhaustRight = new THREE.Mesh(exhaustGeo, wheelRimMat);
  exhaustRight.position.set(0.46, 0.3, 2.32);
  chassisGroup.add(exhaustLeft, exhaustRight);

  // 9. Dual-Layer Nitro Exhaust Flame Cones (Cyan Plasma Outer + Orange Core)
  const flameGeo = trackGeo(new THREE.ConeGeometry(0.11, 1.05, 14));
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const coreGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.62, 10));
  coreGeo.rotateX(Math.PI / 2);
  const coreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const flameLeft = new THREE.Mesh(flameGeo, flameMat);
  flameLeft.position.set(-0.46, 0.3, 2.82);
  flameLeft.add(new THREE.Mesh(coreGeo, coreMat));
  flameLeft.visible = false;

  const flameRight = new THREE.Mesh(flameGeo, flameMat);
  flameRight.position.set(0.46, 0.3, 2.82);
  flameRight.add(new THREE.Mesh(coreGeo, coreMat));
  flameRight.visible = false;
  chassisGroup.add(flameLeft, flameRight);

  // 10. Contoured Swan-Neck Rear Spoiler / GT Wing
  const wingGroup = new THREE.Group();
  const pylonGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.36, 0.28));
  const pylonL = new THREE.Mesh(pylonGeo, carbonTrimMat);
  const pylonR = new THREE.Mesh(pylonGeo, carbonTrimMat);
  const pylonSpan = style === 'drift' ? 0.64 : 0.48;
  pylonL.position.set(-pylonSpan, 0.9, 1.96);
  pylonL.rotation.x = -0.18;
  pylonR.position.set(pylonSpan, 0.9, 1.96);
  pylonR.rotation.x = -0.18;
  wingGroup.add(pylonL, pylonR);

  const wingWidth = style === 'drift' ? bodyWidth + 0.14 : bodyWidth * 0.95;
  const wingBlade = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(wingWidth, 0.042, 0.34)),
    style === 'hypercar' ? accentMat : bodyPaintMat
  );
  wingBlade.position.set(0, style === 'drift' ? 1.1 : 1.04, 2.04);
  wingBlade.rotation.x = 0.15;
  wingGroup.add(wingBlade);

  const wingLip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(wingWidth * 0.98, 0.02, 0.08)),
    carbonTrimMat
  );
  wingLip.position.set(0, style === 'drift' ? 1.13 : 1.07, 2.18);
  wingLip.rotation.x = 0.32;
  wingGroup.add(wingLip);

  const endplateGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.22, 0.44));
  const endL = new THREE.Mesh(endplateGeo, carbonTrimMat);
  endL.position.set(-wingWidth / 2, style === 'drift' ? 1.08 : 1.02, 2.04);
  endL.rotation.z = 0.08;
  const endR = new THREE.Mesh(endplateGeo, carbonTrimMat);
  endR.position.set(wingWidth / 2, style === 'drift' ? 1.08 : 1.02, 2.04);
  endR.rotation.z = -0.08;
  wingGroup.add(endL, endR);

  if (style === 'hypercar') {
    const sharkFin = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.035, 0.28, 1.05)),
      carbonTrimMat
    );
    sharkFin.position.set(0, 1.02, 1.38);
    wingGroup.add(sharkFin);
  }
  chassisGroup.add(wingGroup);

  // 11. Swept-Back LED Projector Headlights & Full-Width Rear Brake Lightbar
  const hlGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.065, 0.18));
  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-bodyWidth * 0.33, 0.49, -2.22);
  hlLeft.rotation.set(0.12, 0.24, -0.08);
  const hlRight = new THREE.Mesh(hlGeo, headlightMat);
  hlRight.position.set(bodyWidth * 0.33, 0.49, -2.22);
  hlRight.rotation.set(0.12, -0.24, 0.08);
  chassisGroup.add(hlLeft, hlRight);

  // Rear full-width LED lightbar + twin outer brake light blades
  const tlBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(bodyWidth * 0.86, 0.06, 0.08)),
    taillightMat
  );
  tlBar.position.set(0, 0.62, 2.26);
  const tlPodGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.1, 0.09));
  const tlPodL = new THREE.Mesh(tlPodGeo, taillightMat);
  tlPodL.position.set(-bodyWidth * 0.32, 0.59, 2.25);
  const tlPodR = new THREE.Mesh(tlPodGeo, taillightMat);
  tlPodR.position.set(bodyWidth * 0.32, 0.59, 2.25);
  chassisGroup.add(tlBar, tlPodL, tlPodR);

  // 12. Four Detailed Lathe Tire & Multi-Spoke Alloy Rim Assemblies
  const wheelRadius = 0.38;
  const wheelWidth = 0.31;
  const tireGeo = trackGeo(createLatheTireGeometry(wheelRadius, wheelWidth));

  const rimOuterGeo = trackGeo(
    new THREE.CylinderGeometry(wheelRadius * 0.68, wheelRadius * 0.68, wheelWidth * 0.92, 24, 1, true)
  );
  rimOuterGeo.rotateZ(Math.PI / 2);

  const discGeo = trackGeo(
    new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 0.35, 16)
  );
  discGeo.rotateZ(Math.PI / 2);

  const caliperGeo = trackGeo(new THREE.BoxGeometry(wheelWidth * 0.45, 0.16, 0.1));
  const spokeGeo = trackGeo(new THREE.BoxGeometry(wheelWidth * 0.94, wheelRadius * 1.26, 0.038));
  const hubCapGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.075, wheelWidth * 0.98, 12));
  hubCapGeo.rotateZ(Math.PI / 2);

  const wheelPositions: [number, number, number][] = [
    [-bodyWidth * 0.45, wheelRadius, -1.36],
    [bodyWidth * 0.45, wheelRadius, -1.36],
    [-bodyWidth * 0.46, wheelRadius, 1.34],
    [bodyWidth * 0.46, wheelRadius, 1.34],
  ];

  const wheelSteerPivots: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const wheelSpinGroups: [THREE.Group, THREE.Group, THREE.Group, THREE.Group] = [
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
    new THREE.Group(),
  ];

  wheelPositions.forEach(([wx, wy, wz], idx) => {
    const steerGroup = idx < 2 ? wheelSteerPivots[idx] : new THREE.Group();
    steerGroup.position.set(wx, wy, wz);

    // Non-spinning brake caliper attached to steering knuckle
    const caliper = new THREE.Mesh(caliperGeo, accentMat);
    caliper.position.set(wx < 0 ? -0.02 : 0.02, 0.05, idx < 2 ? 0.12 : -0.12);
    steerGroup.add(caliper);

    const spinGroup = wheelSpinGroups[idx];
    const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
    tireMesh.castShadow = !isSoftwareGl;
    spinGroup.add(tireMesh);

    const rimMesh = new THREE.Mesh(rimOuterGeo, wheelRimMat);
    spinGroup.add(rimMesh);

    const discMesh = new THREE.Mesh(discGeo, brakeDiscMat);
    spinGroup.add(discMesh);

    const hubMesh = new THREE.Mesh(hubCapGeo, accentMat);
    spinGroup.add(hubMesh);

    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(spokeGeo, wheelRimMat);
      spoke.rotation.x = (s * Math.PI) / 5;
      spinGroup.add(spoke);
    }

    steerGroup.add(spinGroup);
    root.add(steerGroup);
  });

  const glbUrl = (typeof window !== 'undefined' && (window as any).__customGlbUrl) || DEFAULT_VEHICLE_MANIFEST.playerSupercar;
  assetManager.loadVehicleGlb(glbUrl).then((glbModel) => {
    if (!glbModel) return;
    
    glbModel.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const name = mesh.name.toLowerCase();
      if (name === 'fabric' || name.includes('backdrop') || name.includes('cloth')) mesh.visible = false;
      if (name.includes('wheel') || name.includes('tire') || name.includes('rim')) mesh.visible = false;
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
    });

    // Remove any background artifact mesh if present
    const fabric = glbModel.getObjectByName('Fabric') || glbModel.getObjectByName('cloth');
    if (fabric?.parent) fabric.parent.remove(fabric);

    // Correct front/back facing direction (180 degree Y rotation if car is reversed)
    glbModel.rotation.y = Math.PI;

    // Normalize using world bounding box
    glbModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(glbModel);
    const size = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.z) || size.z < 0.001 || size.x < 0.001) {
      console.warn('[CarBuilder] Invalid GLB dimensions; procedural vehicle retained.');
      return;
    }
    const maxDim = Math.max(size.x, size.y, size.z);
    const factor = 4.4 / (size.z > 0.5 ? size.z : maxDim);
    glbModel.scale.multiplyScalar(factor);
    glbModel.updateMatrixWorld(true);
    box.setFromObject(glbModel);
    const center = box.getCenter(new THREE.Vector3());
    const dimensions = box.getSize(new THREE.Vector3());

    glbModel.position.x -= center.x;
    glbModel.position.z -= center.z;
    glbModel.position.y += 0.34 - box.min.y;
    glbModel.updateMatrixWorld(true);

    const originalParts = [...chassisGroup.children];
    originalParts.forEach((part) => { part.visible = false; });
    chassisGroup.add(glbModel);
    console.log('[CarBuilder] GLB car model activated successfully. Size:', dimensions.toArray());
  }).catch((err) => {
    console.warn('[CarBuilder] GLB load failed; procedural car retained:', err);
  });

  const dispose = () => {
    geometriesToDispose.forEach((g) => g.dispose());
    materialsToDispose.forEach((m) => m.dispose());
  };

  return {
    root,
    chassisGroup,
    wheelSteerPivots,
    wheelSpinGroups,
    nitroFlames: [flameLeft, flameRight],
    taillightMat,
    bodyPaintMat,
    accentMat,
    wheelRimMat,
    dispose,
  };
}
