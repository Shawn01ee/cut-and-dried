import { FURNITURE } from './FurnitureCatalog.js';

/** Controls buying, moving and rotating one piece of furniture at a time. */
export class BuildMode {
  constructor(layout, economy, view) { Object.assign(this, { layout, economy, view }); this.active = null; }
  get isActive() { return !!this.active; }
  start(id, existing = null) {
    this.cancel();
    this.active = { id, existing, rotation: existing ? existing.rotation : 0, point: null };
    if (existing) this.view.setVisible(existing, false);
    this.view.showGhost(id); this.view.showGrid(this.layout.openCells(existing));
  }
  rotate() { if (!this.active) return; this.active.rotation = (this.active.rotation + 1) % 4; if (this.active.point) this.hover(this.active.point); }
  #target(point) {
    const cell = this.layout.nearestCell(point.x, point.z); if (!cell) return null;
    const cells = this.layout.footprint(this.active.id, cell, this.active.rotation) || [cell];
    const wanted = (FURNITURE[this.active.id].width || 1), complete = cells.length === wanted;
    return { cells, ok: complete && this.layout.canPlace(cells, this.active.existing) };
  }
  hover(point) { this.active.point = point; const t = this.#target(point); if (!t) this.view.hideGhost(); else this.view.poseGhost(t.cells, this.active.rotation, t.ok); }
  /** Tries to place the piece at `point`. Returns true when placed. */
  commit(point) {
    const t = this.#target(point); if (!t || !t.ok) return false;
    const { id, existing, rotation } = this.active;
    if (existing) { this.view.despawn(existing); this.layout.remove(existing); }
    else if (!this.economy.spend('interior', FURNITURE[id].price)) return false;
    this.view.spawn(this.layout.add(id, t.cells, rotation));
    this.#finish(); return true;
  }
  sell(item) {
    if (this.view.isOccupied(item)) return false;
    this.economy.cash += Math.floor(FURNITURE[item.id].price / 2);
    this.view.despawn(item); this.layout.remove(item); return true;
  }
  cancel() { if (!this.active) return; if (this.active.existing) this.view.setVisible(this.active.existing, true); this.#finish(); }
  #finish() { this.active = null; this.view.clearGhost(); this.view.hideGrid(); }
}
