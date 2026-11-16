import { rand, clamp } from '../core/math.js';

/**
 * Shawn, the company's CEO, keeps a hand in how the salon is run. Every week or two he sends an order, more often once
 * he has money in the salon. Lia can go along with it, try to talk him round in a one-to-one (the odds come from her
 * management, how the salon is doing and how far he trusts her), or refuse outright, which only works when his trust
 * is high and costs a good deal of it. When trust runs low he stops asking and simply orders.
 */
export const ORDERS = {
  // prices up a step, and they stay there for a while
  priceUp: { days: 7 },
  // the company's promotion: a discount on every service, and more clients for it
  promo: { days: 3, price: .8, demand: 1.15 },
  // an hour longer open
  longHours: { days: 5, maxClose: 22 },
  // the company's ad agency, paid by the salon
  agency: { cost: [600, 1500], followers: [40, 120] },
  // commission down to nothing for a week
  noCommission: { days: 7 },
  // a new product in research within a week (once there is a brand)
  newProduct: { days: 7, level: 4 },
};
/** How each answer moves Shawn's trust (0-100), and the trust a flat refusal needs. */
export const TRUST = { start: 50, accept: 4, talkWin: -2, talkLose: -6, refuse: -25, refuseMin: 60, low: 20, ignored: -10, done: 4, weekProfit: 3, weekLoss: -3 };
/** Days between orders: from day 8, from level 4; sooner with an investor stake. */
export const HQ_GAP = [8, 14], HQ_GAP_INVESTED = [6, 10], HQ_FROM_DAY = 8, HQ_LEVEL = 4;
/** The chance a one-to-one talks him round: Lia's management, his trust, the rating and last week's profit. */
export const talkOdds = ({ mgmt, trust, rating, weekProfit }) => clamp(.35 + mgmt * .003 + (trust - 50) * .005 + (rating ? (rating - 4) * .2 : 0) + (weekProfit > 0 ? .1 : weekProfit < 0 ? -.1 : 0), .15, .85);

export class Headquarters {
  constructor() { this.trust = TRUST.start; this.next = HQ_FROM_DAY + Math.round(rand(0, 4)); this.order = null; this.log = []; this.version = 0; }
  get canRefuse() { return this.trust >= TRUST.refuseMin; }
  /** True when his trust is so low that he no longer asks. */
  get bossy() { return this.trust < TRUST.low; }
  shift(n) { this.trust = clamp(Math.round(this.trust + n), 0, 100); this.version++; }
  /** The morning: maybe a new order, from whatever can be ordered now (`can` says which). Returns it or null. */
  startDay(day, level, invested, can) {
    if (level < HQ_LEVEL || day < this.next || this.order) return null;
    const ids = Object.keys(ORDERS).filter(id => can(id)); if (!ids.length) return null;
    const id = ids[Math.floor(Math.random() * ids.length)], O = ORDERS[id], o = { id, day };
    if (O.cost) { o.cost = Math.round(rand(...O.cost) / 50) * 50; o.followers = Math.round(rand(...O.followers)); }
    const gap = invested ? HQ_GAP_INVESTED : HQ_GAP; this.next = day + Math.round(rand(...gap));
    this.order = o; this.version++; return o;
  }
  /** Records how an order ended: accepted, talked out of, talked into, refused, or simply given. */
  close(how) { const o = this.order; if (!o) return; this.log.unshift({ id: o.id, day: o.day, how }); this.log.length = Math.min(this.log.length, 8); this.order = null; this.version++; }
  toJSON() { return { trust: this.trust, next: this.next, order: this.order, log: this.log }; }
  restore(d) { if (!d) return; Object.assign(this, { trust: d.trust ?? TRUST.start, next: d.next ?? HQ_FROM_DAY, order: d.order && ORDERS[d.order.id] ? d.order : null, log: d.log || [] }); this.version++; }
}
