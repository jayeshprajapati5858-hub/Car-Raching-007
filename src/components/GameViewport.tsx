import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { computeEffectiveCarStats } from '../data/cars';
import { TRACK_CATALOG } from '../data/tracks';
import { BuiltCarRig, buildProceduralCar } from '../game/CarBuilder';
import { RaceSimulation } from '../game/RaceSimulation';
import { HighwaySimulation } from '../game/HighwaySimulation';
import { BuiltTrackWorld, buildTrackWorld } from '../game/TrackBuilder';
import { useGameStore } from '../store/useGameStore';

const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

export const GameViewport: React.FC = () => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const screen = useGameStore((s) => s.screen);
  const previewCarId = useGameStore((s) => s.previewCarId);
  const saveData = useGameStore((s) => s.saveData);
  const activeRace = useGameStore((s) => s.activeRace);
  const isPaused = useGameStore((s) => s.isPaused);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const raceRestartCounter = useGameStore((s) => s.raceRestartCounter);
  const completeRace = useGameStore((s) => s.completeRace);

  // Store latest mutable references for the render loop
  const stateRef = useRef({
    screen,
    previewCarId,
    saveData,
    activeRace,
    isPaused,
    cameraMode,
    completeRace,
  });
  stateRef.current = {
    screen,
    previewCarId,
    saveData,
    activeRace,
    isPaused,
    cameraMode,
    completeRace,
  };

  const sceneObjectsRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    keyLight: THREE.DirectionalLight | null;
    hemiLight: THREE.HemisphereLight | null;
    rimLight: THREE.DirectionalLight | null;
    garageGroup: THREE.Group | null;
    turntableRingMat: THREE.MeshStandardMaterial | null;
    showcaseCar: BuiltCarRig | null;
    showcaseCarKey: string;
    trackWorld: BuiltTrackWorld | null;
    raceSim: RaceSimulation | null;
    highwaySim: HighwaySimulation | null;
    activeSessionKey: string;
    turntableAngle: number;
    userDragOffsetAngle: number;
    isDraggingTurntable: boolean;
    lastPointerX: number;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    keyLight: null,
    hemiLight: null,
    rimLight: null,
    garageGroup: null,
    turntableRingMat: null,
    showcaseCar: null,
    showcaseCarKey: '',
    trackWorld: null,
    raceSim: null,
    highwaySim: null,
    activeSessionKey: '',
    turntableAngle: 0.55,
    userDragOffsetAngle: 0,
    isDraggingTurntable: false,
    lastPointerX: 0,
  });

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const quality = stateRef.current.saveData.settings.graphicsQuality;
    const targetDpr = isSoftwareGl
      ? 1
      : quality === 'low'
      ? 1
      : quality === 'medium'
      ? Math.min(window.devicePixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 2);

    renderer.setPixelRatio(targetDpr);
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl && quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080c14');
    scene.fog = new THREE.FogExp2('#080c14', 0.012);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.15,
      900
    );
    camera.position.set(4.5, 2.2, 5.8);
    camera.lookAt(0, 0.65, 0);

    // 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(14, 24, 16);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 90;
    const d = 24;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-15, 10, -14);
    scene.add(rimLight);

    // Build Futuristic Garage Pavilion Group
    const garageGroup = new THREE.Group();
    const floorGeo = new THREE.PlaneGeometry(90, 90);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f19,
      roughness: 0.25,
      metalness: 0.45,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    garageGroup.add(floorMesh);

    // Turntable Plinth (offset on Y to prevent coplanar Z-fighting)
    const plinthGeo = new THREE.CylinderGeometry(3.5, 3.7, 0.14, 48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x161f30,
      roughness: 0.22,
      metalness: 0.75,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.07;
    plinthMesh.receiveShadow = !isSoftwareGl;
    garageGroup.add(plinthMesh);

    const ringGeo = new THREE.RingGeometry(3.32, 3.48, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const turntableRingMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, turntableRingMat);
    ringMesh.position.y = 0.145;
    garageGroup.add(ringMesh);

    // Overhead Studio Light Archways
    const archGeo = new THREE.BoxGeometry(8.5, 0.14, 0.35);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
    });
    for (let z = -6; z <= 6; z += 4) {
      const beam = new THREE.Mesh(archGeo, archMat);
      beam.position.set(0, 4.8, z);
      garageGroup.add(beam);
    }

    // Garage Background Pillars
    const colGeo = new THREE.BoxGeometry(0.8, 9, 0.8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(Math.cos(angle) * 12, 4.5, Math.sin(angle) * 12);
      garageGroup.add(col);
    }

    scene.add(garageGroup);

    const refs = sceneObjectsRef.current;
    refs.renderer = renderer;
    refs.scene = scene;
    refs.camera = camera;
    refs.keyLight = keyLight;
    refs.hemiLight = hemiLight;
    refs.rimLight = rimLight;
    refs.garageGroup = garageGroup;
    refs.turntableRingMat = turntableRingMat;

    // Pointer listeners for interactive turntable rotation in Garage/Menus
    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.screen === 'racing') return;
      refs.isDraggingTurntable = true;
      refs.lastPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!refs.isDraggingTurntable) return;
      const dx = e.clientX - refs.lastPointerX;
      refs.lastPointerX = e.clientX;
      refs.userDragOffsetAngle += dx * 0.008;
    };
    const onPointerUp = () => {
      refs.isDraggingTurntable = false;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container || !refs.renderer || !refs.camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      refs.camera.aspect = w / h;
      refs.camera.updateProjectionMatrix();
      refs.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const st = stateRef.current;

      if (st.screen === 'racing' && st.activeRace) {
        if (refs.garageGroup) refs.garageGroup.visible = false;
        if (refs.showcaseCar) refs.showcaseCar.root.visible = false;

        if (refs.highwaySim) {
          refs.highwaySim.update(dt, st.cameraMode);
          refs.highwaySim.updateCamera(camera, st.cameraMode);
          if (refs.highwaySim.isFinished()) {
            const res = refs.highwaySim.getResults();
            st.completeRace({
              finished: true,
              position: 1,
              totalRacers: 1,
              elapsedMs: res.elapsedSec * 1000,
              bestLapMs: null,
              driftScore: res.score,
              nearMisses: res.nearMisses,
            });
          }
        } else if (refs.raceSim) {
          refs.raceSim.update(
            dt,
            camera,
            st.cameraMode,
            st.saveData.settings,
            st.isPaused,
            st.completeRace
          );
        }
      } else {
        // Showcase / Menu / Garage Turntable Mode
        if (refs.garageGroup) refs.garageGroup.visible = true;
        if (refs.showcaseCar) {
          refs.showcaseCar.root.visible = true;
          if (!refs.isDraggingTurntable && !st.saveData.settings.reducedMotion) {
            refs.turntableAngle += dt * 0.38;
          }
          const totalAngle = refs.turntableAngle + refs.userDragOffsetAngle;
          refs.showcaseCar.root.position.set(0, 0.14, 0);
          refs.showcaseCar.root.rotation.y = totalAngle;
        }

        // Smooth camera positioning for Garage vs Main Menu
        const isCloseView = st.screen === 'garage' || st.screen === 'car_shop';
        const targetCamX = isCloseView ? 3.55 : 4.25;
        const targetCamY = isCloseView ? 1.65 : 1.95;
        const targetCamZ = isCloseView ? 4.45 : 5.25;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 6, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 6, dt);
        camera.lookAt(0, 0.68, 0);
        if (Math.abs(camera.fov - 50) > 0.2) {
          camera.fov = THREE.MathUtils.damp(camera.fov, 50, 6, dt);
          camera.updateProjectionMatrix();
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      if (refs.showcaseCar) refs.showcaseCar.dispose();
      if (refs.raceSim) refs.raceSim.dispose();
      if (refs.highwaySim) {
        refs.highwaySim.dispose();
        refs.highwaySim = null;
      }
      if (refs.trackWorld) refs.trackWorld.dispose();
      renderer.dispose();
    };
  }, []);

  // Synchronize Showcase Car & Garage Theme when previewCarId or customization changes
  const activeCarId = screen === 'garage' || screen === 'car_shop' ? previewCarId : saveData.selectedCarId;
  const activeCustom = saveData.customizations[activeCarId];
  const garageTheme = saveData.garageTheme;

  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs.scene) return;

    // Update garage lighting theme
    if (refs.turntableRingMat && refs.rimLight && screen !== 'racing') {
      const accentHex =
        garageTheme === 'solar_hangar'
          ? '#f59e0b'
          : garageTheme === 'obsidian_vault'
          ? '#e2e8f0'
          : '#0ea5e9';
      refs.turntableRingMat.color.set(accentHex);
      refs.turntableRingMat.emissive.set(accentHex);
      refs.rimLight.color.set(accentHex);
      refs.scene.background = new THREE.Color(
        garageTheme === 'solar_hangar' ? '#140c08' : garageTheme === 'obsidian_vault' ? '#09090b' : '#080c14'
      );
      refs.scene.fog = new THREE.FogExp2(
        garageTheme === 'solar_hangar' ? '#140c08' : garageTheme === 'obsidian_vault' ? '#09090b' : '#080c14',
        0.025
      );
    }

    const carKey = `${activeCarId}_${activeCustom?.bodyColor}_${activeCustom?.wheelColor}_${activeCustom?.accentColor}_${activeCustom?.skinId}`;
    if (refs.showcaseCarKey !== carKey) {
      if (refs.showcaseCar) {
        refs.scene.remove(refs.showcaseCar.root);
        refs.showcaseCar.dispose();
      }
      const built = buildProceduralCar(activeCarId, activeCustom, isSoftwareGl);
      built.root.position.set(0, 0.14, 0);
      built.root.visible = screen !== 'racing';
      refs.scene.add(built.root);
      refs.showcaseCar = built;
      refs.showcaseCarKey = carKey;
    }
  }, [activeCarId, activeCustom, garageTheme, screen]);

  // Synchronize Active Race World & Simulation
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs.scene || !refs.renderer) return;

    if (screen !== 'racing' || !activeRace) {
      if (refs.raceSim) {
        refs.raceSim.dispose();
        refs.raceSim = null;
      }
      if (refs.highwaySim) {
        refs.highwaySim.dispose();
        refs.highwaySim = null;
      }
      if (refs.trackWorld) {
        refs.scene.remove(refs.trackWorld.root);
        refs.trackWorld.dispose();
        refs.trackWorld = null;
      }
      refs.activeSessionKey = '';
      return;
    }

    const sessionKey = `${activeRace.sessionId}_${raceRestartCounter}`;
    if (refs.activeSessionKey === sessionKey) return;

    if (refs.raceSim) {
      refs.raceSim.dispose();
      refs.raceSim = null;
    }
    if (refs.highwaySim) {
      refs.highwaySim.dispose();
      refs.highwaySim = null;
    }
    if (refs.trackWorld) {
      refs.scene.remove(refs.trackWorld.root);
      refs.trackWorld.dispose();
      refs.trackWorld = null;
    }

    const isHighway = activeRace.mode.startsWith('highway_');
    const selectedCar = saveData.selectedCarId;
    const effectiveStats = computeEffectiveCarStats(selectedCar, saveData.upgrades[selectedCar]);
    const custom = saveData.customizations[selectedCar];

    if (isHighway) {
      refs.scene.background = new THREE.Color('#04060a');
      refs.scene.fog = new THREE.FogExp2('#04060a', 0.012);

      if (refs.keyLight && refs.hemiLight) {
        refs.keyLight.color.set(0x38bdf8);
        refs.keyLight.intensity = 1.2;
        refs.hemiLight.color.set(0x0b1329);
        refs.hemiLight.groundColor.set(0x04060a);
      }

      refs.highwaySim = new HighwaySimulation(
        refs.scene,
        {
          mode: activeRace.mode as any,
          themeId: 'midnight_express',
          difficulty: activeRace.aiDifficulty === 'hard' ? 'hard' : activeRace.aiDifficulty === 'beginner' ? 'easy' : 'normal',
          trafficDensity: 1.0,
        },
        selectedCar,
        effectiveStats,
        custom,
        isSoftwareGl
      );
    } else {
      const trackDef = TRACK_CATALOG[activeRace.trackId] || TRACK_CATALOG.neon_city;
      refs.scene.background = new THREE.Color(trackDef.theme.skyHorizon);
      refs.scene.fog = new THREE.FogExp2(trackDef.theme.fogColor, trackDef.theme.fogDensity);

      if (refs.keyLight && refs.hemiLight) {
        refs.keyLight.color.set(trackDef.theme.sunColor);
        refs.keyLight.intensity = trackDef.theme.sunIntensity;
        refs.hemiLight.color.set(trackDef.theme.ambientColor);
        refs.hemiLight.groundColor.set(trackDef.theme.hemisphereGround);
      }

      const maxAniso = refs.renderer.capabilities.getMaxAnisotropy();
      const quality = saveData.settings.graphicsQuality;
      const builtTrack = buildTrackWorld(trackDef, maxAniso, quality);
      refs.scene.add(builtTrack.root);
      refs.trackWorld = builtTrack;

      refs.raceSim = new RaceSimulation(
        refs.scene,
        builtTrack,
        activeRace,
        selectedCar,
        effectiveStats,
        custom,
        isSoftwareGl
      );
    }
    refs.activeSessionKey = sessionKey;
  }, [screen, activeRace, raceRestartCounter, saveData]);

  // Update renderer quality dynamically when settings change
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs.renderer) return;
    const q = saveData.settings.graphicsQuality;
    const dpr = isSoftwareGl
      ? 1
      : q === 'low'
      ? 1
      : q === 'medium'
      ? Math.min(window.devicePixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 2);
    refs.renderer.setPixelRatio(dpr);
    refs.renderer.shadowMap.enabled = !isSoftwareGl && q !== 'low';
  }, [saveData.settings.graphicsQuality]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080c14]">
      <div ref={canvasMountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#090b10] p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-sky-400">WebGL Display Context Suspended</h2>
          <p className="mt-2 max-w-md text-sm text-slate-300">
            The graphics context was temporarily interrupted by the browser. Restoring 3D rendering...
          </p>
        </div>
      )}
    </div>
  );
};
