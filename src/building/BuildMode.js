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
  rotate() { if (!this.active) return; this.active.rotation = (this.active.rotation + 1) % 4; if (this.active.point) this.hover(this.active.point); }
  #target(point) {
    const cell = this.layout.nearestCell(point.x, point.z); if (!cell) return null;
    const { id, rotation, existing } = this.active, c = this.layout.centreAt(id, cell, rotation), cells = this.layout.footprint(id, c.x, c.z, rotation);
    const ok = !!cells && this.layout.canOccupy(id, cells, existing) && this.hooks.validate({ id, x: c.x, z: c.z, rotation, cells }, existing);
    return { ...c, ok };
  }
  hover(point) { this.active.point = point; const t = this.#target(point); if (!t) this.view.hideGhost(); else this.view.poseGhost(t.x, t.z, this.active.rotation, t.ok); }
  /** Places the piece at `point`. Returns true when placed. */
  commit(point) {
    const t = this.#target(point); if (!t || !t.ok) return false;
    const { id, existing, rotation } = this.active;
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
