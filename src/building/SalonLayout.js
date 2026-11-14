import { FURNITURE, EXPANSIONS, chairsOn } from './FurnitureCatalog.js';

/** The second salon (2호점) stands further down the street; this is its centre. */
export const BRANCH_X = 20;
/** Which salon a point belongs to: 0 the first, 1 the second. */
export const siteOf = x => x > BRANCH_X - 6 ? 1 : 0;
const shift = rects => rects.map(([a, b, c, d]) => [a + BRANCH_X, b + BRANCH_X, c, d]);

// The doorway and the pavement walkway: only walkable pieces such as mats may cover them.
const MAIN_LANES = [[-2.7, -1.3, 2.4, 5.1], [-4.6, 12.7, 4, 5.1]];
const LANES = [...MAIN_LANES, ...shift([[-2.7, -1.3, 2.4, 5.1], [-4.6, 4.7, 4, 5.1]])];
// Lamp posts, the clock and the barber pole outside. Nothing goes here and people walk around them.
const MAIN_POSTS = [[-4.1, -3.3, 4.1, 4.9], [4, 4.6, 3.3, 4], [2.3, 3.1, 5.3, 6.2], [-1.5, -.9, 3.2, 3.7]];
export const POSTS = [...MAIN_POSTS, ...shift(MAIN_POSTS)];
export const inRect = (c, [a, b, d, e]) => c.x >= a && c.x <= b && c.z >= d && c.z <= e;
/**
 * Floor areas and the salon size at which each opens. The salon stays a rectangle and grows
 * deeper, then wider (the whole shop next door), then deeper again.
 */
export const ZONE_TIER = { main: 0, back: 1, annex: 2, rear: 3, annex2: 4, rear2: 5 };
/**
 * When an expansion takes a wall away, furniture that stood against it moves to the new wall:
 * `side` is which wall, `at` where it stood, and dx/dz how far the new one is.
 */
// `span` is the stretch of wall along its length.
const WALL_SHIFTS = [
  { tier: 1, side: 'back', at: -3, dx: 0, dz: -2, span: [-4, 4] },
  { tier: 2, side: 'right', at: 4, dx: 4, dz: 0, span: [-5, 3] },
  { tier: 3, side: 'back', at: -5, dx: 0, dz: -2, span: [-4, 8] },
  { tier: 4, side: 'right', at: 8, dx: 4, dz: 0, span: [-7, 3] },
  { tier: 5, side: 'back', at: -7, dx: 0, dz: -2, span: [-4, 12] },
];

/**
 * The salon as it opens on day one: [id, centre x, centre z, quarter turns].
 * Kept simple: Lia's chair in the middle of the floor, a shampoo booth in the back corner, the reception desk,
 * and a bench by the front window. Everything else is bought as the salon grows.
 */
export const DEFAULT_LAYOUT = [
  ['station', -.25, -.75, 0], ['shampooBooth', 3.25, -2.25, 3], ['desk', -3.5, 1.25, 1], ['mat', -2, 2.75, 0],
  ['bench', .5, 2.75, 2], ['loungeRug', .5, 2, 0], ['plant', -.75, 2.75, 0], ['plant', 3.75, 2.75, 0],
];
/** Where extra styling chairs went before furniture could be moved; used to load older saves. */
/** What the second salon opens with, in its own frame: [id, x, z, quarter turns]. */
const BRANCH_START = [['desk', -3.5, 1.25, 1], ['station', -.25, -.75, 0], ['shampooBooth', 3.25, -2.25, 3], ['bench', .5, 2.75, 2], ['mat', -2, 2.75, 0], ['plant', 3.75, 2.75, 0]];
export const EXTRA_STATIONS = [[-.25, -2.25], [1.75, -2.25], [5.25, -2.25], [7.25, -2.25]];
const ANNEX_PLANTS = [[7.75, -4.75], [7.75, 2.75]];
const turn = (x, z, r) => [[x, z], [z, -x], [-x, -z], [-z, x]][r];

/** What is on the salon floor: the 0.5 m cell grid, every piece of furniture and the salon's size. Pure data. */
export class SalonLayout {
  #index = new Map();
  constructor() {
    this.cells = []; this.items = []; this.tier = 0; this.branchOpen = false; this.branchChairs = 6;
    const add = (x, z, outdoor, zone) => { const c = { x, z, outdoor, zone }; this.cells.push(c); this.#index.set(this.#key(x, z), c); };
    const area = (x0, z0, nx, nz, outdoor, zone) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) add(x0 + i * .5, z0 + j * .5, outdoor, zone); };
    area(-3.75, -2.75, 16, 12, false, 'main'); area(-4.25, 3.45, 18, 6, true, 'main');
    area(-3.75, -4.75, 16, 4, false, 'back');
    area(4.25, -4.75, 8, 16, false, 'annex'); area(4.75, 3.45, 8, 6, true, 'annex');
    area(-3.75, -6.75, 24, 4, false, 'rear');
    area(8.25, -6.75, 8, 20, false, 'annex2'); area(8.75, 3.45, 8, 6, true, 'annex2');
    area(-3.75, -8.75, 32, 4, false, 'rear2');
    area(BRANCH_X - 3.75, -2.75, 16, 12, false, 'branch'); area(BRANCH_X - 4.25, 3.45, 18, 6, true, 'branch');
  }
  #key(x, z) { return `${Math.round(x * 4)},${Math.round(z * 4)}`; }
  cellAt(x, z) { return this.#index.get(this.#key(x, z)) || null; }
  get chairs() { return this.items.reduce((n, it) => n + chairsOn(it.id), 0); }
  get maxChairs() { return [3, 6, 9, 12, 15, 18][this.tier]; }
  #inSite(site) { return this.items.filter(it => siteOf(it.x) === site); }
  /** Styling chairs at one salon, and how many it has room for. */
  chairsAt(site) { return this.#inSite(site).reduce((n, it) => n + chairsOn(it.id), 0); }
  maxChairsAt(site) { return site ? (this.branchOpen ? this.branchChairs : 0) : this.maxChairs; }
  /** Whether either salon has room for another chair. */
  get chairRoom() { return [0, 1].some(s => this.chairsAt(s) < this.maxChairsAt(s)); }
  countAt(id, site) { return this.#inSite(site).filter(it => it.id === id).length; }
  /** Comfort of one salon's furniture. */
  comfortAt(site) { return Math.min(25, this.#inSite(site).reduce((a, it) => a + (FURNITURE[it.id].comfort || 0), 0)); }
  /** How many of a piece the salon has room for at its current size. */
  maxOf(id, site = 0) { const m = FURNITURE[id].max; return m == null ? Infinity : Array.isArray(m) ? m[site ? 1 : this.tier] : m; }
  get nextExpansion() { return EXPANSIONS[this.tier] || null; }
  /** The cell is part of the salon at its current size. */
  isOpen(c) { return c.zone === 'branch' ? this.branchOpen : ZONE_TIER[c.zone] <= this.tier; }
  /** Furniture may go here: open floor, plus the pavement from the first expansion. */
  placeable(c) { return this.isOpen(c) && (!c.outdoor || this.tier >= 1) && !POSTS.some(r => inRect(c, r)); }
  /** Edges of an item's footprint. */
  bounds(item) { const xs = item.cells.map(c => c.x), zs = item.cells.map(c => c.z); return { minX: Math.min(...xs) - .25, maxX: Math.max(...xs) + .25, minZ: Math.min(...zs) - .25, maxZ: Math.max(...zs) + .25 }; }
  /** Where an item standing against a wall that an expansion removed should go now, or null. */
  wallShift(item) {
    if (!item.cells || !item.cells.length) return null;
    const b = this.bounds(item), near = (a, v) => Math.abs(a - v) < .01;
    const rule = WALL_SHIFTS.find(r => r.tier <= this.tier && (r.side === 'back' ? near(b.minZ, r.at) && b.minX >= r.span[0] && b.maxX <= r.span[1] : near(b.maxX, r.at) && b.minZ >= r.span[0] && b.maxZ <= r.span[1]));
    return rule ? { x: item.x + rule.dx, z: item.z + rule.dz } : null;
  }
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
  /** What stands on a cell. Rugs and mats lie under furniture, so with `floor` given only that layer counts. */
  occupant(cell, ignore, floor = null) { return this.items.find(it => it !== ignore && it.cells.includes(cell) && (floor == null || !!FURNITURE[it.id].walkable === floor)) || null; }
  canOccupy(id, cells, ignore) {
    const walkable = !!FURNITURE[id].walkable;
    return cells.every(c => this.placeable(c) && (walkable || !LANES.some(r => inRect(c, r))) && !this.occupant(c, ignore, walkable));
  }
  /** Why `id` cannot stand on `cells`: 'outside' the salon, on the doorway 'lane', or an 'overlap'; null when it can. */
  whyNot(id, cells, ignore) {
    if (!cells || !cells.every(c => this.placeable(c))) return 'outside';
    const walkable = !!FURNITURE[id].walkable;
    if (!walkable && cells.some(c => LANES.some(r => inRect(c, r)))) return 'lane';
    if (cells.some(c => this.occupant(c, ignore, walkable))) return 'overlap';
    // Each salon has its own limits on chairs and on pieces such as shampoo booths.
    const site = siteOf(cells[0].x), same = ignore && siteOf(ignore.x) === site;
    if (FURNITURE[id].chairs && this.chairsAt(site) - (same ? chairsOn(ignore.id) : 0) + chairsOn(id) > this.maxChairsAt(site)) return 'chairs';
    if (this.countAt(id, site) - (same && ignore.id === id ? 1 : 0) >= this.maxOf(id, site)) return 'max';
    return null;
  }
  openCells(ignore) { return this.cells.filter(c => this.placeable(c) && !LANES.some(r => inRect(c, r)) && !this.occupant(c, ignore, false)); }
  nearestCell(x, z) { let best = null, bestDist = .45; for (const c of this.cells) { const d = Math.hypot(c.x - x, c.z - z); if (d < bestDist) { bestDist = d; best = c; } } return best; }
  add(id, x, z, rotation) { const item = { id, x, z, rotation, cells: this.footprint(id, x, z, rotation) }; this.items.push(item); return item; }
  move(item, x, z, rotation) { Object.assign(item, { x, z, rotation, cells: this.footprint(item.id, x, z, rotation) }); }
  remove(item) { this.items.splice(this.items.indexOf(item), 1); }
  resetToDefault() { this.items = []; DEFAULT_LAYOUT.forEach(([id, x, z, r]) => this.add(id, x, z, r)); }
  addAnnexPlants() { ANNEX_PLANTS.forEach(([x, z]) => { const cells = this.footprint('plant', x, z, 0); if (cells && this.canOccupy('plant', cells)) this.add('plant', x, z, 0); }); }
  #sum(fn) { return this.items.reduce((a, it) => a + (fn(FURNITURE[it.id]) || 0), 0); }
  get comfort() { return this.comfortAt(0); }
  get dailySales() { return this.#sum(f => f.dailySales); }
  get speedBonus() { return 1 + this.#sum(f => f.speedBonus); }
  get staffRestRate() { return this.items.some(it => FURNITURE[it.id].staffRest) ? 2 : 1; }
  /** A salon always needs a reception desk and somewhere to cut hair; put back missing ones at their default spots. */
  #ensureEssentials() {
    const desk = DEFAULT_LAYOUT.find(d => d[0] === 'desk'), chairs = DEFAULT_LAYOUT.find(d => FURNITURE[d[0]].chairs);
    for (const [id, x, z, r] of [desk, chairs]) {
      if (id === 'desk' ? this.items.some(it => it.id === 'desk') : this.chairs) continue;
      const cells = this.footprint(id, x, z, r);
      if (cells && this.canOccupy(id, cells)) this.add(id, x, z, r);
    }
  }
  /** Opens the second salon with the basics: a desk, one chair, a shampoo booth and a bench. */
  openBranch() { this.branchOpen = true; BRANCH_START.forEach(([id, x, z, r]) => this.add(id, x + BRANCH_X, z, r)); }
  toJSON() { return { version: 2, tier: this.tier, branchOpen: this.branchOpen, items: this.items.map(({ id, x, z, rotation }) => ({ id, x, z, rotation })) }; }
  restore(data) {
    this.tier = data.tier; this.branchOpen = !!data.branchOpen;
    if (data.version === 2) { this.items = []; data.items.forEach(it => { if (FURNITURE[it.id] && this.footprint(it.id, it.x, it.z, it.rotation)) this.add(it.id, it.x, it.z, it.rotation); }); this.#ensureEssentials(); return; }
    // Saves from before furniture could move: start from the default salon and add what was bought.
    this.resetToDefault();
    for (let k = 1; k < (data.chairs || 1); k++) { const [x, z] = EXTRA_STATIONS[k - 1], cells = this.footprint('station', x, z, 0); if (cells && this.canOccupy('station', cells)) this.add('station', x, z, 0); }
    if (this.tier >= 2) this.addAnnexPlants();
    (data.items || []).forEach(it => {
      if (!FURNITURE[it.id]) return;
      const wide = (FURNITURE[it.id].w || 1) > 1, x = it.x + (wide && !(it.rotation % 2) ? .25 : 0), z = it.z + (wide && it.rotation % 2 ? .25 : 0);
      const cells = this.footprint(it.id, x, z, it.rotation);
      if (cells && this.canOccupy(it.id, cells)) this.add(it.id, x, z, it.rotation);
    });
  }
}
