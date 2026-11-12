import { FURNITURE, EXPANSIONS } from './FurnitureCatalog.js';

// The doorway and the pavement walkway: only walkable pieces such as mats may cover them.
const LANES = [[-2.7, -1.3, 2.4, 5.1], [-4.6, 8.7, 4, 5.1]];
// Lamp posts, the clock and the barber pole outside. Nothing goes here and people walk around them.
export const POSTS = [[-4.1, -3.3, 4.1, 4.9], [4, 4.6, 3.3, 4], [2.3, 3.1, 5.3, 6.2], [-1.5, -.9, 3.2, 3.7]];
export const inRect = (c, [a, b, d, e]) => c.x >= a && c.x <= b && c.z >= d && c.z <= e;

/** The salon as it opens on day one: [id, centre x, centre z, quarter turns]. */
export const DEFAULT_LAYOUT = [
  ['station', -2.25, -2.25, 0], ['desk', -3.5, 1.25, 1], ['bench', 2.5, 2.75, 2], ['bench2', 3.75, 1.75, 3], ['loungeRug', 2.5, 1.5, 0],
  ['mat', -2, 2.75, 0], ['bookcase', -3.75, 2.5, 1], ['dryer', -3.5, -2.5, 0], ['basin', 3.5, -1.5, 0],
  ['plant', 3.75, 2.75, 0], ['plant', -1.25, -2.75, 0], ['plant', .75, -2.75, 0], ['plant', .75, 2.75, 0],
];
/** Where extra styling chairs went before furniture could be moved; used to load older saves. */
export const EXTRA_STATIONS = [[-.25, -2.25], [1.75, -2.25], [5.25, -2.25], [7.25, -2.25]];
const ANNEX_PLANTS = [[6.25, -2.75], [7.75, 2.75]];
const turn = (x, z, r) => [[x, z], [z, -x], [-x, -z], [-z, x]][r];

/** What is on the salon floor: the 0.5 m cell grid, every piece of furniture and the salon's size. Pure data. */
export class SalonLayout {
  #index = new Map();
  constructor() {
    this.cells = []; this.items = []; this.tier = 0;
    const add = (x, z, outdoor, annex = false) => { const c = { x, z, outdoor, annex }; this.cells.push(c); this.#index.set(this.#key(x, z), c); };
    for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) add(-3.75 + i * .5, -2.75 + j * .5, false);
    for (let i = 0; i < 18; i++) for (let j = 0; j < 6; j++) add(-4.25 + i * .5, 3.45 + j * .5, true);
    // The annex to the right opens with the last expansion.
    for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) add(4.25 + i * .5, -2.75 + j * .5, false, true);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) add(4.75 + i * .5, 3.45 + j * .5, true, true);
  }
  #key(x, z) { return `${Math.round(x * 4)},${Math.round(z * 4)}`; }
  cellAt(x, z) { return this.#index.get(this.#key(x, z)) || null; }
  get chairs() { return this.items.filter(it => it.id === 'station').length; }
  get maxChairs() { return [1, 2, 3, 5][this.tier]; }
  get nextExpansion() { return EXPANSIONS[this.tier] || null; }
  /** Furniture may go here at the salon's current size: the pavement opens at size 2 and the annex at size 4. */
  placeable(c) { return (c.annex ? this.tier >= 3 : !c.outdoor || this.tier >= 1) && !POSTS.some(r => inRect(c, r)); }
  /** World point of a position given in an item's own frame, where +z is its front. */
  toWorld(item, lx, lz) { const [x, z] = turn(lx, lz, item.rotation); return { x: item.x + x, z: item.z + z }; }
  dims(id, rotation) { const f = FURNITURE[id], w = f.w || 1, d = f.d || 1; return rotation % 2 ? [d, w] : [w, d]; }
  /** Centre for a piece hovered over a cell; even sizes straddle the grid lines. */
  centreAt(id, cell, rotation) { const [W, D] = this.dims(id, rotation); return { x: cell.x + (W % 2 ? 0 : .25), z: cell.z + (D % 2 ? 0 : .25) }; }
  footprint(id, x, z, rotation) {
    const [W, D] = this.dims(id, rotation), out = [];
    for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
      const c = this.cellAt(x - (W - 1) * .25 + i * .5, z - (D - 1) * .25 + j * .5);
      if (!c) return null;
      out.push(c);
    }
    return out;
  }
  occupant(cell, ignore) { return this.items.find(it => it !== ignore && it.cells.includes(cell)) || null; }
  canOccupy(id, cells, ignore) {
    const walkable = FURNITURE[id].walkable;
    return cells.every(c => this.placeable(c) && (walkable || !LANES.some(r => inRect(c, r))) && !this.occupant(c, ignore));
  }
  openCells(ignore) { return this.cells.filter(c => this.placeable(c) && !LANES.some(r => inRect(c, r)) && !this.occupant(c, ignore)); }
  nearestCell(x, z) { let best = null, bestDist = .45; for (const c of this.cells) { const d = Math.hypot(c.x - x, c.z - z); if (d < bestDist) { bestDist = d; best = c; } } return best; }
  add(id, x, z, rotation) { const item = { id, x, z, rotation, cells: this.footprint(id, x, z, rotation) }; this.items.push(item); return item; }
  move(item, x, z, rotation) { Object.assign(item, { x, z, rotation, cells: this.footprint(item.id, x, z, rotation) }); }
  remove(item) { this.items.splice(this.items.indexOf(item), 1); }
  resetToDefault() { this.items = []; DEFAULT_LAYOUT.forEach(([id, x, z, r]) => this.add(id, x, z, r)); }
  addAnnexPlants() { ANNEX_PLANTS.forEach(([x, z]) => { const cells = this.footprint('plant', x, z, 0); if (cells && this.canOccupy('plant', cells)) this.add('plant', x, z, 0); }); }
  #sum(fn) { return this.items.reduce((a, it) => a + (fn(FURNITURE[it.id]) || 0), 0); }
  get comfort() { return Math.min(25, this.#sum(f => f.comfort)); }
  get dailySales() { return this.#sum(f => f.dailySales); }
  get speedBonus() { return 1 + this.#sum(f => f.speedBonus); }
  get staffRestRate() { return this.items.some(it => FURNITURE[it.id].staffRest) ? 2 : 1; }
  /** A salon always needs a reception desk and at least one styling chair; put back missing ones at their default spots. */
  #ensureEssentials() {
    for (const id of ['desk', 'station']) {
      if (this.items.some(it => it.id === id)) continue;
      const [, x, z, r] = DEFAULT_LAYOUT.find(d => d[0] === id), cells = this.footprint(id, x, z, r);
      if (cells && this.canOccupy(id, cells)) this.add(id, x, z, r);
    }
  }
  toJSON() { return { version: 2, tier: this.tier, items: this.items.map(({ id, x, z, rotation }) => ({ id, x, z, rotation })) }; }
  restore(data) {
    this.tier = data.tier;
    if (data.version === 2) { this.items = []; data.items.forEach(it => { if (FURNITURE[it.id] && this.footprint(it.id, it.x, it.z, it.rotation)) this.add(it.id, it.x, it.z, it.rotation); }); this.#ensureEssentials(); return; }
    // Saves from before furniture could move: start from the default salon and add what was bought.
    this.resetToDefault();
    for (let k = 1; k < (data.chairs || 1); k++) this.add('station', ...EXTRA_STATIONS[k - 1], 0);
    if (this.tier >= 3) this.addAnnexPlants();
    (data.items || []).forEach(it => {
      if (!FURNITURE[it.id]) return;
      const wide = (FURNITURE[it.id].w || 1) > 1, x = it.x + (wide && !(it.rotation % 2) ? .25 : 0), z = it.z + (wide && it.rotation % 2 ? .25 : 0);
      const cells = this.footprint(it.id, x, z, it.rotation);
      if (cells && this.canOccupy(it.id, cells)) this.add(it.id, x, z, it.rotation);
    });
  }
}
