import * as THREE from 'three';
import { FURNITURE, seatApproach } from '../building/FurnitureCatalog.js';
import { FURNITURE_MODELS } from './furnitureModels.js';
import { V } from '../core/math.js';

const box = new THREE.BoxGeometry(1, 1, 1), noRay = () => {};

/** Draws furniture. The layout stores plain data; meshes and seats live here. */
export class FurnitureView {
  #entries = new Map(); #ghost = null; #grid = null;
  #ghostOk = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .6, depthWrite: false });
  #ghostBad = new THREE.MeshLambertMaterial({ color: 0xd8314a, transparent: true, opacity: .6, depthWrite: false });

  /** `seats` collects waiting seats; `procSeats` the styling-island seats used while colour and perm process. */
  constructor(world, Builder, seats, layout, glow, procSeats = []) {
    Object.assign(this, { world, Builder, seats, layout, glow, procSeats });
    this.#grid = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0x8fc25a, transparent: true, opacity: .45, depthWrite: false }), layout.cells.length);
    this.#grid.frustumCulled = false; this.#grid.raycast = noRay; this.#grid.visible = false; world.add(this.#grid);
  }
  #build(id, pickable) {
    const group = new THREE.Group(), builder = new this.Builder();
    const fx = { glow: (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(box, this.glow); m.scale.set(sx, sy, sz); m.position.set(x, y, z); group.add(m); } };
    FURNITURE_MODELS[id](builder, fx); builder.build(group);
    if (!pickable) group.traverse(o => { o.raycast = noRay; });
    return group;
  }
  #place(group, x, z, rotation) { group.position.set(x, 0, z); group.rotation.y = rotation * Math.PI / 2; }
  /** A fixed copy for a branch salon. */
  buildStatic(id, x, z, rotation, parent) { const g = this.#build(id, false); this.#place(g, x, z, rotation); parent.add(g); return g; }
  spawn(item) {
    const group = this.#build(item.id, true), f = FURNITURE[item.id];
    this.#place(group, item.x, item.z, item.rotation); group.userData.item = item; this.world.add(group);
    const seats = (f.seats || []).map(seat => {
      const [lx, lz, t = 0] = seat, [ax, az] = seatApproach(seat), p = this.layout.toWorld(item, lx, lz), a = this.layout.toWorld(item, ax, az);
      return { pos: V(p.x, 0, p.z), yaw: (item.rotation + t) * Math.PI / 2, h: f.seatH || .46, app: [V(a.x, 0, a.z)], occ: null, processing: !!f.processing };
    });
    (f.processing ? this.procSeats : this.seats).push(...seats);
    this.#entries.set(item, { group, seats });
  }
  despawn(item) {
    const entry = this.#entries.get(item); if (!entry) return;
    this.world.remove(entry.group); entry.seats.forEach(s => { const list = s.processing ? this.procSeats : this.seats; list.splice(list.indexOf(s), 1); }); this.#entries.delete(item);
  }
  has(item) { return this.#entries.has(item); }
  /** Removes drawings of pieces no longer in the layout. */
  prune(items) { [...this.#entries.keys()].filter(it => !items.includes(it)).forEach(it => this.despawn(it)); }
  clear() { this.prune([]); }
  setVisible(item, visible) { const e = this.#entries.get(item); if (e) e.group.visible = visible; }
  isOccupied(item) { const e = this.#entries.get(item); return !!e && e.seats.some(s => s.occ); }
  /** The piece of furniture under a pointer ray, if any. */
  pick(raycaster) {
    const groups = [...this.#entries.values()].filter(e => e.group.visible).map(e => e.group);
    const hit = raycaster.intersectObjects(groups, true)[0];
    let o = hit && hit.object; while (o && !o.userData.item) o = o.parent;
    return o ? o.userData.item : null;
  }
  showGhost(id) {
    this.clearGhost(); this.#ghost = this.#build(id, false); this.#ghost.visible = false; this.world.add(this.#ghost);
    // An arrow on the floor shows which way the piece faces.
    const d = (FURNITURE[id].d || 1) * .25, arrow = new THREE.Mesh(new THREE.ConeGeometry(.16, .34, 3).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    arrow.position.set(0, .06, d + .28); arrow.raycast = noRay; arrow.userData.keep = true; this.#ghost.add(arrow);
  }
  poseGhost(x, z, rotation, ok) {
    this.#ghost.visible = true; this.#place(this.#ghost, x, z, rotation);
    this.#ghost.traverse(o => { if (o.isMesh && !o.userData.keep) { o.material = ok ? this.#ghostOk : this.#ghostBad; o.castShadow = false; } });
  }
  hideGhost() { if (this.#ghost) this.#ghost.visible = false; }
  clearGhost() { if (this.#ghost) { this.world.remove(this.#ghost); this.#ghost = null; } }
  showGrid(cells) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(.42, .02, .42);
    cells.forEach((c, i) => { m.compose(V(c.x, .05, c.z), q, s); this.#grid.setMatrixAt(i, m); });
    this.#grid.count = cells.length; this.#grid.instanceMatrix.needsUpdate = true; this.#grid.visible = true;
  }
  hideGrid() { this.#grid.visible = false; }
}
