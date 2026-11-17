/**
 * Interior sets: a few pieces standing close together make a corner with a character of its own and a small bonus for
 * that salon. A set is complete when every piece it needs stands within `SET_SPAN` metres of one of them. Sets stay
 * hidden ("???") until the first time they are completed.
 *
 * Bonuses (`fx`): comfort points, waiting `patience` and product `sales` as fractions, `followers` a day, and `vipPay`
 * as a fraction of what VIPs pay.
 */
export const SET_SPAN = 2.5;
export const INTERIOR_SETS = [
  { id: 'greenLounge', needs: { sofa: 1, loungeRug: 1, plant: 2 }, fx: { patience: .1 } },
  { id: 'retail', needs: { displayTable: 1, shelf: 1, lamp: 1 }, fx: { sales: .25 } },
  { id: 'coffee', needs: { coffeeBar: 1, bench2: 1, plant: 1 }, fx: { patience: .05, sales: .1 } },
  { id: 'garden', needs: { partition: 2, plant: 2 }, fx: { comfort: 3 } },
  { id: 'photo', needs: { photoZone: 1, neonSign: 1, lamp: 1 }, fx: { followers: 15 } },
  { id: 'vipLounge', needs: { champagneFridge: 1, sofa: 1, lamp: 1 }, fx: { vipPay: .08 } },
];
const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) <= SET_SPAN;

/** Whether `set` stands complete around `anchor` among `items`: enough of every piece within reach of it. */
function completeAround(set, anchor, items) {
  return Object.entries(set.needs).every(([id, n]) => items.filter(it => it.id === id && near(it, anchor)).length >= n);
}

/** The sets complete in `items`: each set at most once per salon (`siteOf(x)` tells which), with where it stands. */
export function completeSets(items, siteOf) {
  const out = [];
  for (const set of INTERIOR_SETS) {
    const first = Object.keys(set.needs)[0];
    for (const site of [0, 1]) {
      const here = items.filter(it => siteOf(it.x) === site), anchor = here.find(it => it.id === first && completeAround(set, it, here));
      if (anchor) out.push({ id: set.id, site, at: { x: anchor.x, z: anchor.z } });
    }
  }
  return out;
}

/** The sum of one bonus over the sets complete at a salon. */
export function setBonus(complete, site, key) {
  return complete.filter(c => c.site === site).reduce((n, c) => n + (INTERIOR_SETS.find(s => s.id === c.id).fx[key] || 0), 0);
}

/** Which sets have ever been completed (they stay known after the pieces are moved). */
export class SetBook {
  constructor() { this.found = []; }
  /** Notes today's complete sets and returns the ids completed for the first time. */
  note(complete) { const fresh = [...new Set(complete.map(c => c.id))].filter(id => !this.found.includes(id)); this.found.push(...fresh); return fresh; }
  toJSON() { return { found: this.found }; }
  restore(d) { this.found = (d && d.found || []).filter(id => INTERIOR_SETS.some(s => s.id === id)); }
}
