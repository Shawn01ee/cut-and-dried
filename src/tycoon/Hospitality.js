import { pick } from '../core/math.js';

/** Treats for waiting clients: cost per client, hospitality points and the furniture they need. */
export const AMENITIES = {
  tea: { cost: 1, points: 1 },
  snacks: { cost: 2, points: 1 },
  coffee: { cost: 3, points: 2, needs: 'coffeeBar' },
  juice: { cost: 4, points: 2, needs: 'coffeeBar' },
};
const DRINKS = ['tea', 'coffee', 'juice'];
/**
 * The guaranteed minimum satisfaction for a treated client: 35% with one point of treats, rising to 60% with everything.
 * Difficult clients honour three quarters of it.
 */
export const satisfactionFloor = points => points > 0 ? Math.min(.6, .3 + points * .05) : 0;

/** What the salon offers clients while they wait, and what it costs. */
export class Hospitality {
  constructor(economy, layout) { this.economy = economy; this.layout = layout; this.offered = new Set(); this.version = 0; }
  available(id) { const needs = AMENITIES[id].needs; return !needs || this.layout.items.some(it => it.id === needs); }
  isOffered(id) { return this.offered.has(id); }
  toggle(id) { if (!AMENITIES[id]) return; if (this.offered.has(id)) this.offered.delete(id); else this.offered.add(id); this.version++; }
  get serving() { return [...this.offered].filter(id => this.available(id)); }
  get costPerClient() { return this.serving.reduce((sum, id) => sum + AMENITIES[id].cost, 0); }
  get points() { return this.serving.reduce((sum, id) => sum + AMENITIES[id].points, 0); }
  /** The minimum satisfaction a client treated right now is guaranteed. */
  get floor() { return satisfactionFloor(this.points); }
  /**
   * Treats a client who just sat down: they wait longer and enjoy the visit more.
   * Charges the cost and returns the drink they are holding, if any.
   */
  serve(customer) {
    const items = this.serving;
    customer.treated = items.reduce((sum, id) => sum + AMENITIES[id].points, 0);
    const patience = 1 + customer.treated * .05; customer.pat *= patience; customer.maxPat *= patience;
    if (this.costPerClient) this.economy.charge('hospitality', this.costPerClient);
    const drinks = items.filter(id => DRINKS.includes(id));
    return drinks.length ? pick(drinks) : null;
  }
  toJSON() { return [...this.offered]; }
  restore(ids) { this.offered = new Set((ids || []).filter(id => AMENITIES[id])); this.version++; }
}
