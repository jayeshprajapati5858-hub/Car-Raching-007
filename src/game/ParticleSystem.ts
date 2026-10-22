import * as THREE from 'three';

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  startScale: number;
  endScale: number;
  r: number;
  g: number;
  b: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class ParticlePool {
  public readonly mesh: THREE.InstancedMesh;
  private readonly particles: PooledParticle[] = [];
  private readonly capacity: number;
  private cursor = 0;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(capacity = 140) {
    this.capacity = capacity;
    this.geo = new THREE.DodecahedronGeometry(0.18, 0);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, capacity);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.5,
        startScale: 0.5,
        endScale: 1.5,
        r: 1,
        g: 1,
        b: 1,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
      this.mesh.setColorAt(i, _color.setRGB(1, 1, 1));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    maxAge: number,
    startScale: number,
    endScale: number,
    r: number,
    g: number,
    b: number
  ) {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.capacity;

    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.age = 0;
    p.maxAge = maxAge;
    p.startScale = startScale;
    p.endScale = endScale;
    p.r = r;
    p.g = g;
    p.b = b;
  }

  public update(dt: number) {
    let anyUpdated = false;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      anyUpdated = true;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const t = p.age / p.maxAge;
      const scale = THREE.MathUtils.lerp(p.startScale, p.endScale, t) * (1 - t * 0.4);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.age * 3, p.age * 2, 0);
      _dummy.scale.setScalar(Math.max(0.01, scale));
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);

      _color.setRGB(p.r * (1 - t * 0.4), p.g * (1 - t * 0.4), p.b * (1 - t * 0.4));
      this.mesh.setColorAt(i, _color);
    }

    if (anyUpdated) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
