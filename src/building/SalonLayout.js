import { FURNITURE, EXPANSIONS, chairsOn } from './FurnitureCatalog.js';

// The doorway and the pavement walkway: only walkable pieces such as mats may cover them.
const LANES = [[-2.7, -1.3, 2.4, 5.1], [-4.6, 8.7, 4, 5.1]];
// Lamp posts, the clock and the barber pole outside. Nothing goes here and people walk around them.
export const POSTS = [[-4.1, -3.3, 4.1, 4.9], [4, 4.6, 3.3, 4], [2.3, 3.1, 5.3, 6.2], [-1.5, -.9, 3.2, 3.7]];
export const inRect = (c, [a, b, d, e]) => c.x >= a && c.x <= b && c.z >= d && c.z <= e;
/**
 * Floor areas and the salon size at which each opens. The salon grows backwards first,
 * then into the shop next door, then behind that, so it widens in both directions.
 */
export const ZONE_TIER = { main: 0, back: 1, annex: 2, annexBack: 3 };
/**
 * Where an outer wall stood before an expansion, a waist-high oak wall stays with an opening in it,
 * so furniture that stood against the wall still has something behind it.
 * `seg` is [x1, z1, x2, z2] on cell boundaries, `gaps` are the openings along it, `tier` the size it appears at.
 */
export const INNER_WALLS = [
  { seg: [-4, -3, 4, -3], gaps: [[1.5, 2.5]], tier: 1 },
  { seg: [4, -3, 4, 3], gaps: [[1.5, 2.5]], tier: 2 },
  { seg: [4, -5, 4, -3], gaps: [[-4.5, -3.5]], tier: 3 },
  { seg: [4, -3, 8, -3], gaps: [[5.5, 6.5]], tier: 3 },
];

/** The salon as it opens on day one: [id, centre x, centre z, quarter turns]. */
// Chairs line the back wall, shampoo booths line the right wall (room for three), and clients wait by the front window.
export const DEFAULT_LAYOUT = [
  ['station', -2.25, -2.25, 0], ['desk', -3.5, 1.25, 1], ['wardrobe', -3.75, 0, 1], ['dryer', -3.5, -2.5, 0], ['shampooBooth', 3.25, -2.25, 3],
  ['bench', .5, 2.75, 2], ['bench2', 2.75, 2.75, 2], ['loungeRug', 1.5, 2, 0], ['mat', -2, 2.75, 0],
  ['plant', 3.75, 2.75, 0], ['plant', -3.75, 2.75, 0], ['plant', -.75, 2.75, 0],
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
    const add = (x, z, outdoor, zone) => { const c = { x, z, outdoor, zone }; this.cells.push(c); this.#index.set(this.#key(x, z), c); };
    const area = (x0, z0, nx, nz, outdoor, zone) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) add(x0 + i * .5, z0 + j * .5, outdoor, zone); };
    area(-3.75, -2.75, 16, 12, false, 'main'); area(-4.25, 3.45, 18, 6, true, 'main');
    area(-3.75, -4.75, 16, 4, false, 'back');
    area(4.25, -2.75, 8, 12, false, 'annex'); area(4.75, 3.45, 8, 6, true, 'annex');
    area(4.25, -4.75, 8, 4, false, 'annexBack');
  }
  #key(x, z) { return `${Math.round(x * 4)},${Math.round(z * 4)}`; }
  cellAt(x, z) { return this.#index.get(this.#key(x, z)) || null; }
  get chairs() { return this.items.reduce((n, it) => n + chairsOn(it.id), 0); }
  get maxChairs() { return [1, 3, 6, 9][this.tier]; }
  get nextExpansion() { return EXPANSIONS[this.tier] || null; }
  /** The cell is part of the salon at its current size. */
  isOpen(c) { return ZONE_TIER[c.zone] <= this.tier; }
  /** Furniture may go here: open floor, plus the pavement from the first expansion. */
  placeable(c) { return this.isOpen(c) && (!c.outdoor || this.tier >= 1) && !POSTS.some(r => inRect(c, r)); }
  /** True when a step between two neighbouring cells would pass through an inner wall rather than its opening. */
  stepBlocked(a, b) {
    return INNER_WALLS.some(({ seg: [x1, z1, x2, z2], gaps, tier }) => {
      if (this.tier < tier) return false;
      const alongZ = x1 === x2, line = alongZ ? x1 : z1, crosses = alongZ ? (a.x - line) * (b.x - line) < 0 : (a.z - line) * (b.z - line) < 0;
      if (!crosses) return false;
      const m = alongZ ? (a.z + b.z) / 2 : (a.x + b.x) / 2, lo = alongZ ? Math.min(z1, z2) : Math.min(x1, x2), hi = alongZ ? Math.max(z1, z2) : Math.max(x1, x2);
      return m > lo && m < hi && !gaps.some(([g0, g1]) => m > g0 && m < g1);
    });
  }
  #crossesWall(cells) { return cells.some(a => cells.some(b => a !== b && Math.abs(a.x - b.x) + Math.abs(a.z - b.z) <= .5 && this.stepBlocked(a, b))); }
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
    return !this.#crossesWall(cells) && cells.every(c => this.placeable(c) && (walkable || !LANES.some(r => inRect(c, r))) && !this.occupant(c, ignore));
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
    if (this.tier >= 2) this.addAnnexPlants();
    (data.items || []).forEach(it => {
      if (!FURNITURE[it.id]) return;
      const wide = (FURNITURE[it.id].w || 1) > 1, x = it.x + (wide && !(it.rotation % 2) ? .25 : 0), z = it.z + (wide && it.rotation % 2 ? .25 : 0);
      const cells = this.footprint(it.id, x, z, it.rotation);
      if (cells && this.canOccupy(it.id, cells)) this.add(it.id, x, z, it.rotation);
    });
  }
}
