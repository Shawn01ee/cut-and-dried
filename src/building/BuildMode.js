import { FURNITURE } from './FurnitureCatalog.js';

/** Buying, moving, rotating and selling one piece of furniture at a time. */
export class BuildMode {
  constructor(layout, economy, view, hooks) { Object.assign(this, { layout, economy, view, hooks }); this.active = null; }
  get isActive() { return !!this.active; }
  /** Starts placing a new piece, or picks up `existing` to move it. Returns false if it cannot be moved right now. */
  start(id, existing = null) {
    this.cancel();
    if (existing && !this.hooks.canMove(existing)) return false;
    this.active = { id, existing, rotation: existing ? existing.rotation : 0, point: null };
    if (existing) this.view.setVisible(existing, false);
    this.view.showGhost(id); this.view.showGrid(this.layout.openCells(existing));
    return true;
  }
  /** Turns the piece from the way it is shown; from then on it keeps the player's way round instead of turning by itself. */
  rotate() { if (!this.active) return; this.active.rotation = ((this.active.shown ?? this.active.rotation) + 1) % 4; this.active.manual = true; if (this.active.point) this.hover(this.active.point); }
  /**
   * Where the piece would go under `point`. Benches, sofas and other seats turn to the first way round that keeps
   * their seats reachable, so they can be set against a wall without turning them by hand.
   */
  /** Whether `id` can go at x, z turned `rotation`; `reason` says why not ('outside', 'lane', 'overlap', 'self' or 'path:<id>'). */
  #check(id, x, z, rotation, existing) {
    const cells = this.layout.footprint(id, x, z, rotation), why = this.layout.whyNot(id, cells, existing);
    if (why) return { ok: false, reason: why };
    const cand = { id, x, z, rotation, cells }, blocker = this.hooks.blockedBy(cand, existing);
    return blocker ? { ok: false, reason: blocker === cand ? 'self' : 'path:' + blocker.id } : { ok: true, reason: null };
  }
  #target(point) {
    const cell = this.layout.nearestCell(point.x, point.z); if (!cell) return null;
    const snapped = this.active.id === 'station' && this.#chairSlot(point); if (snapped) return snapped;
    const { id, existing } = this.active, turns = FURNITURE[id].seats && !this.active.manual ? [0, 1, 2, 3].map(k => (this.active.rotation + k) % 4) : [this.active.rotation];
    let first = null;
    for (const rotation of turns) {
      const c = this.layout.centreAt(id, cell, rotation), r = this.#check(id, c.x, c.z, rotation, existing);
      if (r.ok) return { ...c, rotation, ...r };
      first ||= { ...c, rotation, ...r };
    }
    return first;
  }
  /**
   * Keeps styling chairs evenly spaced: near another chair, a new one lines up beside it (same facing, one chair
   * width apart) or back to back with it, making a double-sided island. Returns the closest free slot within reach.
   */
  #chairSlot(point) {
    const { existing } = this.active; let best = null, bestDist = 1;
    for (const it of this.layout.items) {
      if (it === existing || it.id !== 'station') continue;
      for (const [lx, lz, turn] of [[-1.5, 0, 0], [1.5, 0, 0], [0, -1.5, 2]]) {
        const p = this.layout.toWorld(it, lx, lz), rotation = (it.rotation + turn) % 4, d = Math.hypot(p.x - point.x, p.z - point.z);
        if (d >= bestDist || (this.active.manual && rotation !== this.active.rotation)) continue;
        if (!this.#check('station', p.x, p.z, rotation, existing).ok) continue;
        best = { x: p.x, z: p.z, rotation, ok: true, reason: null }; bestDist = d;
      }
    }
    return best;
  }
  hover(point) { this.active.point = point; const t = this.#target(point); this.active.reason = t ? t.reason : 'outside'; if (t) this.active.shown = t.rotation; if (!t) this.view.hideGhost(); else this.view.poseGhost(t.x, t.z, t.rotation, t.ok); }
  /** Places the piece at `point`. Returns true when placed. */
  commit(point) {
    const t = this.#target(point); if (!t || !t.ok) return false;
    const { id, existing } = this.active, rotation = t.rotation;
    if (existing && !this.hooks.canModify(existing)) { this.view.setVisible(existing, true); this.hooks.queueMove(existing, t.x, t.z, rotation); }
    else if (existing) { this.view.despawn(existing); this.layout.move(existing, t.x, t.z, rotation); this.view.spawn(existing); }
    else if (!this.economy.spend(id === 'station' ? 'equipment' : 'interior', FURNITURE[id].price)) return false;
    else this.view.spawn(this.layout.add(id, t.x, t.z, rotation));
    this.#finish(); this.hooks.onChange(); return true;
  }
  sell(item) {
    if (FURNITURE[item.id].essential || !this.hooks.canSell(item)) return false;
    this.economy.cash += Math.floor(FURNITURE[item.id].price / 2);
    this.view.despawn(item); this.layout.remove(item); this.hooks.onChange(); return true;
  }
  cancel() { if (!this.active) return; if (this.active.existing) this.view.setVisible(this.active.existing, true); this.#finish(); }
  #finish() { this.active = null; this.view.clearGhost(); this.view.hideGrid(); }
}
