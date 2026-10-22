import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface VehicleAssetManifest {
  playerSupercar: string;
  trafficSedan: string;
  trafficSUV: string;
  trafficHatchback: string;
  trafficSports: string;
  trafficVan: string;
  trafficTruck: string;
}

export const DEFAULT_VEHICLE_MANIFEST: VehicleAssetManifest = {
  playerSupercar: '/assets/vehicles/player-supercar.glb',
  trafficSedan: '/assets/vehicles/traffic-sedan.glb',
  trafficSUV: '/assets/vehicles/traffic-suv.glb',
  trafficHatchback: '/assets/vehicles/traffic-hatchback.glb',
  trafficSports: '/assets/vehicles/traffic-sports.glb',
  trafficVan: '/assets/vehicles/traffic-van.glb',
  trafficTruck: '/assets/vehicles/traffic-truck.glb',
};

class AssetManager {
  private loader = new GLTFLoader();
  private modelCache = new Map<string, THREE.Group>();
  private failedUrls = new Set<string>();

  public async loadVehicleGlb(url: string): Promise<THREE.Group | null> {
    if (this.failedUrls.has(url)) return null;
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!.clone(true);
    }

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load(
          url,
          (gltf) => resolve(gltf),
          undefined,
          (err) => {
            console.error(`[AssetManager] GLTFLoader error loading "${url}":`, err);
            reject(err);
          }
        );
      });

      if (gltf && gltf.scene) {
        const model = gltf.scene as THREE.Group;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Handle vertex colors if present in the GLB model
            if (mesh.geometry && mesh.geometry.hasAttribute('color')) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => {
                  m.vertexColors = true;
                  m.needsUpdate = true;
                });
              } else if (mesh.material) {
                mesh.material.vertexColors = true;
                mesh.material.needsUpdate = true;
              }
            }

            // Ensure PBR material settings for realistic lighting
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat: any) => {
                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                  mat.roughness = Math.min(Math.max(mat.roughness, 0.2), 0.6);
                  mat.metalness = Math.max(mat.metalness, 0.4);
                  mat.needsUpdate = true;
                }
              });
            }
          }
        });
        this.modelCache.set(url, model);
        return model.clone(true);
      }
    } catch (err) {
      this.failedUrls.add(url);
      console.warn(`[AssetManager] Falling back to procedural model for "${url}" due to load/parse error:`, err);
    }

    return null;
  }
}

export const assetManager = new AssetManager();
