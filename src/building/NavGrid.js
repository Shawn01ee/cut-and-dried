import { FURNITURE, SEAT_APPROACH } from './FurnitureCatalog.js';
import { POSTS, inRect } from './SalonLayout.js';

// The only links through the front wall: the two cells either side of the door.
const DOOR = [[-2.25, 2.75, -2.25, 3.45], [-1.75, 2.75, -1.75, 3.45]];
const ENTRANCE = [-2.25, 2.75];

/** Walking routes over the floor grid that go around furniture, plus checks that a layout keeps everything reachable. */
export class NavGrid {
  constructor(layout) { this.layout = layout; }

  #blocked(items) { const s = new Set(); items.forEach(it => { if (!FURNITURE[it.id].walkable) it.cells.forEach(c => s.add(c)); }); return s; }
  #open(c, blocked) { return this.layout.isOpen(c) && !POSTS.some(r => inRect(c, r)) && !blocked.has(c); }
  #neighbours(c, blocked) {
    const L = this.layout, out = [];
    for (const dx of [-.5, 0, .5]) for (const dz of [-.5, 0, .5]) {
      if (!dx && !dz) continue;
      const n = L.cellAt(c.x + dx, c.z + dz);
      if (!n || n.outdoor !== c.outdoor || !this.#open(n, blocked) || L.stepBlocked(c, n)) continue;
      if (dx && dz) { const a = L.cellAt(c.x + dx, c.z), b = L.cellAt(c.x, c.z + dz); if (!a || !b || !this.#open(a, blocked) || !this.#open(b, blocked) || L.stepBlocked(c, a) || L.stepBlocked(c, b) || L.stepBlocked(a, n) || L.stepBlocked(b, n)) continue; }
      out.push([n, dx && dz ? 1.414 : 1]);
    }
    for (const [ax, az, bx, bz] of DOOR) {
      const a = L.cellAt(ax, az), b = L.cellAt(bx, bz);
      if (c === a && this.#open(b, blocked)) out.push([b, 1.4]);
      if (c === b && this.#open(a, blocked)) out.push([a, 1.4]);
    }
    return out;
  }
  #nearest(x, z, blocked) { let best = null, bd = Infinity; for (const c of this.layout.cells) { if (!this.#open(c, blocked)) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } } return best; }

  /** Waypoints from one point to another around the furniture, not including the end point itself. */
  path(from, to) {
    const blocked = this.#blocked(this.layout.items), start = this.#nearest(from.x, from.z, blocked), goal = this.#nearest(to.x, to.z, blocked);
    if (!start || !goal || start === goal) return [];
    const cost = new Map([[start, 0]]), prev = new Map(), open = [start], h = c => Math.hypot(c.x - goal.x, c.z - goal.z);
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (cost.get(open[i]) + h(open[i]) < cost.get(open[bi]) + h(open[bi])) bi = i;
      const c = open.splice(bi, 1)[0];
      if (c === goal) break;
      for (const [n, step] of this.#neighbours(c, blocked)) {
        const g = cost.get(c) + step;
        if (g < (cost.get(n) ?? Infinity)) { cost.set(n, g); prev.set(n, c); if (!open.includes(n)) open.push(n); }
      }
    }
    if (!prev.has(goal)) return [];
    const cells = []; for (let c = goal; c && c !== start; c = prev.get(c)) cells.unshift(c);
    cells.pop();
    // Keep only the corners so people walk in straight lines between turns.
    return cells.filter((c, i) => { const a = i ? cells[i - 1] : start, b = cells[i + 1] || goal; return Math.abs((c.x - a.x) * (b.z - c.z) - (c.z - a.z) * (b.x - c.x)) > 1e-6; }).map(c => ({ x: c.x, z: c.z }));
  }

  /** Points of an item that people must be able to walk to: seat approaches, the station's stand, the desk counter. */
  needs(item) {
    const f = FURNITURE[item.id];
    return [...(f.needs || []), ...(f.seats || []).map(([x, z]) => [x, z + SEAT_APPROACH])].map(([x, z]) => this.layout.toWorld(item, x, z));
  }

  /** Would the salon still work with `candidate` placed (replacing `ignore` when moving)? */
  wouldConnect(candidate, ignore) {
    const items = this.layout.items.filter(it => it !== ignore).concat([candidate]), blocked = this.#blocked(items);
    const start = this.layout.cellAt(...ENTRANCE);
    if (!start || blocked.has(start)) return false;
    const reached = new Set([start]), queue = [start];
    while (queue.length) for (const [n] of this.#neighbours(queue.shift(), blocked)) if (!reached.has(n)) { reached.add(n); queue.push(n); }
    return items.every(it => this.needs(it).every(p => { const c = this.layout.nearestCell(p.x, p.z); return c && reached.has(c); }));
  }
}
