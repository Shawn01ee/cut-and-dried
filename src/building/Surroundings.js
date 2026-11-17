import { FURNITURE, CATEGORIES } from './FurnitureCatalog.js';

/**
 * Where a piece stands matters. A tool (a piece that speeds up a service or pleases clients) helps only the chairs and
 * booths within its reach, and decoration makes the chairs within its reach nicer to sit in. Distances are in metres,
 * between piece centres.
 */
export const REACH = { tool: 3, decor: 2.5 };
/** Decoration points one chair can use, and the satisfaction each point gives its clients. */
export const DECOR_CAP = 6, DECOR_SAT = .008;
const DECOR = new Set(CATEGORIES.deco);

/** 'tool', 'decor' or null: how a piece reaches the chairs around it. */
export function reachKind(id) {
  const f = FURNITURE[id];
  if (!f) return null;
  if (f.speedFor || f.satisfaction) return 'tool';
  return DECOR.has(id) && f.comfort ? 'decor' : null;
}
const within = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) <= r;

/**
 * What a spot (a chair or a booth, {x, z}) has within reach among `items`: decoration points (capped), speed bonuses by
 * service, extra satisfaction for its clients, and the pieces that count.
 */
export function surroundingsOf(items, at) {
  const speed = {}, pieces = [];
  let points = 0, tools = 0;
  for (const it of items) {
    const kind = reachKind(it.id);
    if (!kind || !within(it, at, REACH[kind])) continue;
    const f = FURNITURE[it.id]; pieces.push(it);
    if (kind === 'decor') points += f.comfort;
    else { if (f.speedFor) speed[f.speedFor] = (speed[f.speedFor] || 0) + f.speedBonus; tools += f.satisfaction || 0; }
  }
  const decor = Math.min(DECOR_CAP, points);
  return { decor, speed, satisfaction: tools + decor * DECOR_SAT, pieces };
}

/** Of `spots` ({x, z}), the ones a piece `id` standing at `at` would reach. */
export function reachedBy(id, at, spots) { const kind = reachKind(id); return kind ? spots.filter(s => within(s, at, REACH[kind])) : []; }
