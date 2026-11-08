import * as THREE from 'three';
import { FURNITURE } from '../building/FurnitureCatalog.js';
import { FURNITURE_MODELS } from './furnitureModels.js';
import { V, fwd, rgt } from '../core/math.js';

const box = new THREE.BoxGeometry(1, 1, 1), noRay = () => {};

/** Draws furniture. The layout stores plain data; meshes and seats live here. */
export class FurnitureView {
  #entries = new Map(); #ghost = null; #grid = null;
  #ghostOk = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .6, depthWrite: false });
  #ghostBad = new THREE.MeshLambertMaterial({ color: 0xd8314a, transparent: true, opacity: .6, depthWrite: false });

  constructor(world, Builder, seats, cellCount) {
    Object.assign(this, { world, Builder, seats });
    this.#grid = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0x8fc25a, transparent: true, opacity: .32, depthWrite: false }), cellCount);
    this.#grid.frustumCulled = false; this.#grid.raycast = noRay; this.#grid.visible = false; world.add(this.#grid);
  }
  #build(id) {
    const group = new THREE.Group(), builder = new this.Builder();
    FURNITURE_MODELS[id](builder); builder.build(group);
    group.traverse(o => { o.raycast = noRay; }); this.world.add(group); return group;
  }
  #pose(group, cells, rotation) {
    const x = cells.reduce((a, c) => a + c.x, 0) / cells.length, z = cells.reduce((a, c) => a + c.z, 0) / cells.length;
    group.position.set(x, 0, z); group.rotation.y = rotation * Math.PI / 2; return V(x, 0, z);
  }
  spawn(item) {
    const group = this.#build(item.id), center = this.#pose(group, item.cells, item.rotation), seats = [];
    if (FURNITURE[item.id].seats) {
      const yaw = item.rotation * Math.PI / 2;
      [-.24, .24].forEach(offset => { const pos = center.clone().addScaledVector(rgt(yaw), offset); seats.push({ pos, yaw, h: .46, app: [pos.clone().addScaledVector(fwd(yaw), .7)], occ: null }); });
      this.seats.push(...seats);
    }
    this.#entries.set(item, { group, seats });
  }
  despawn(item) {
    const entry = this.#entries.get(item); this.world.remove(entry.group);
    entry.seats.forEach(s => this.seats.splice(this.seats.indexOf(s), 1)); this.#entries.delete(item);
  }
  setVisible(item, visible) { this.#entries.get(item).group.visible = visible; }
  isOccupied(item) { return this.#entries.get(item).seats.some(s => s.occ); }
  showGhost(id) { this.clearGhost(); this.#ghost = this.#build(id); this.#ghost.visible = false; }
  poseGhost(cells, rotation, ok) { this.#ghost.visible = true; this.#pose(this.#ghost, cells, rotation); this.#ghost.traverse(o => { if (o.isMesh) { o.material = ok ? this.#ghostOk : this.#ghostBad; o.castShadow = false; } }); }
  hideGhost() { if (this.#ghost) this.#ghost.visible = false; }
  clearGhost() { if (this.#ghost) { this.world.remove(this.#ghost); this.#ghost = null; } }
  showGrid(cells) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(.42, .02, .42);
    cells.forEach((c, i) => { m.compose(V(c.x, .05, c.z), q, s); this.#grid.setMatrixAt(i, m); });
    this.#grid.count = cells.length; this.#grid.instanceMatrix.needsUpdate = true; this.#grid.visible = true;
  }
  hideGrid() { this.#grid.visible = false; }
}
