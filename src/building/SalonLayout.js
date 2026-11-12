import { FURNITURE, EXPANSIONS } from './FurnitureCatalog.js';

// Fixed fixtures and walking routes [minX, maxX, minZ, maxZ]. Nothing can be placed on these.
const BLOCKED = [
  [-3.2, 3.3, -3.1, .45], [2.8, 4.1, -3.1, .45], [-4.1, -3.2, -3.1, -1.9],
  [-4.1, 3.4, 1.3, 2.15], [-2.7, -1.3, .4, 5.1], [-3.95, -2.3, .2, 1.85],
  [1.5, 3.7, 2.2, 3.1], [3.0, 3.95, .9, 2.3], [-4.1, -3.4, 1.9, 3.1], [.2, 1, 2.3, 3.1],
  [-4.6, 8.7, 4, 5.1], [4.1, 8.3, -3.1, .45], [2.5, 8.3, .3, .9], [3.4, 8.3, 1.3, 2.15], [5.9, 6.5, -3.1, -2.4], [7.4, 8, 2.4, 3.1], [-1.5, -.9, 3.2, 3.7], [-4.1, -3.3, 4.1, 4.9], [4, 4.6, 3.3, 4], [2.3, 3.1, 5.3, 6.2],
];
const isBlocked = (x, z) => BLOCKED.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d);

/** What is on the salon floor: the tile grid, placed furniture, chairs and expansions. Pure data. */
export class SalonLayout {
  constructor() {
    this.cells = []; this.items = []; this.chairs = 1; this.tier = 0;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) this.cells.push({ x: -3.75 + i * .5, z: -2.75 + j * .5, outdoor: false });
    for (let i = 0; i < 18; i++) for (let j = 0; j < 6; j++) this.cells.push({ x: -4.25 + i * .5, z: 3.45 + j * .5, outdoor: true });
    // The annex to the right opens with the last expansion.
    for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) this.cells.push({ x: 4.25 + i * .5, z: -2.75 + j * .5, outdoor: false, annex: true });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) this.cells.push({ x: 4.75 + i * .5, z: 3.45 + j * .5, outdoor: true, annex: true });
  }
  get maxChairs() { return [1, 2, 3, 5][this.tier]; }
  get nextExpansion() { return EXPANSIONS[this.tier] || null; }
  #inTier(c) { if (c.annex) return this.tier >= 3; return this.tier === 0 ? !c.outdoor && c.x <= 1.6 : this.tier === 1 ? !c.outdoor : true; }
  isOpen(cell, ignore) { return !isBlocked(cell.x, cell.z) && this.#inTier(cell) && !this.items.some(it => it !== ignore && it.cells.includes(cell)); }
  openCells(ignore) { return this.cells.filter(c => this.isOpen(c, ignore)); }
  nearestCell(x, z) { let best = null, bestDist = .45; for (const c of this.cells) { const d = Math.hypot(c.x - x, c.z - z); if (d < bestDist) { bestDist = d; best = c; } } return best; }
  footprint(id, cell, rotation) {
    const width = FURNITURE[id].width || 1, out = [cell];
    for (let k = 1; k < width; k++) {
      const x = rotation % 2 ? cell.x : cell.x + k * .5, z = rotation % 2 ? cell.z + k * .5 : cell.z;
      const next = this.cells.find(c => Math.abs(c.x - x) < .01 && Math.abs(c.z - z) < .01);
      if (!next) return null;
      out.push(next);
    }
    return out;
  }
  canPlace(cells, ignore) { return !!cells && cells.every(c => this.isOpen(c, ignore)); }
  add(id, cells, rotation) { const item = { id, cells, rotation }; this.items.push(item); return item; }
  remove(item) { this.items.splice(this.items.indexOf(item), 1); }
  #sum(fn) { return this.items.reduce((a, it) => a + (fn(FURNITURE[it.id]) || 0), 0); }
  get comfort() { return Math.min(25, this.#sum(f => f.comfort)); }
  get dailySales() { return this.#sum(f => f.dailySales); }
  get speedBonus() { return 1 + this.#sum(f => f.speedBonus); }
  get staffRestRate() { return this.items.some(it => FURNITURE[it.id].staffRest) ? 2 : 1; }
  toJSON() { return { chairs: this.chairs, tier: this.tier, items: this.items.map(it => ({ id: it.id, x: it.cells[0].x, z: it.cells[0].z, rotation: it.rotation })) }; }
}
