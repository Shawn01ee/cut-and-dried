import { rand, clamp } from '../core/math.js';

/**
 * The salon's own brand: products researched in-house, made in batches and sold two ways, at the desk after a
 * visit and online to followers. Quality comes from the team's skill when it is researched; the line sets the price
 * and what buyers expect, and the gap between the two is the rating, which drives sales.
 */
export const PRODUCT_TYPES = {
  shampoo: { price: 28, cost: 8, research: 2000, days: 3, skill: 'customerService' },
  wax: { price: 26, cost: 7, research: 2500, days: 3, skill: 'cutting' },
  treatment: { price: 42, cost: 12, research: 3000, days: 4, skill: 'colouring' },
  oil: { price: 48, cost: 14, research: 3500, days: 4, skill: 'perming' },
  colourCare: { price: 44, cost: 13, research: 4000, days: 5, skill: 'colouring', cert: 'colour' },
  scalpTonic: { price: 56, cost: 17, research: 5000, days: 5, skill: 'customerService', cert: 'scalp' },
};
/** Lines: what they cost to make and sell for (×), the quality buyers expect, and how broadly they appeal. */
export const LINES = {
  value: { price: .75, cost: .8, expect: 45, appeal: 1.2 },
  signature: { price: 1, cost: 1, expect: 60, appeal: 1 },
  luxury: { price: 1.6, cost: 1.5, expect: 75, appeal: .8 },
};
/** Quality from research: a base, the team's best at the product's skill, a matching certificate, Lia's management, luck. */
export const QUALITY = { base: 30, skill: .45, cert: 8, mgmt: .1, luck: 8 };
/** In-salon sales: the chance a paying client buys, with satisfaction and the displays the salon has. */
export const DESK = { base: .1, satisfaction: .2, display: .03, displayMax: .15 };
/** Online: orders a day per product for every this-many followers, before rating and appeal; shipping per order; a viral day. */
export const ONLINE = { per: 1500, shipping: 3, viralRating: 4.5, viralChance: .05, viral: 3 };
export const BATCHES = [20, 100];

const ratingOf = (quality, line) => clamp(3 + (quality - LINES[line].expect) / 12, 1, 5);

export class Brand {
  constructor() { this.products = []; this.research = null; this.version = 0; this.sold = { desk: 0, online: 0 }; this.viral = null; }
  get(type) { return this.products.find(p => p.type === type) || null; }
  unitPrice(p) { return Math.round(PRODUCT_TYPES[p.type].price * LINES[p.line].price); }
  unitCost(p) { return Math.round(PRODUCT_TYPES[p.type].cost * LINES[p.line].cost * 10) / 10; }
  rating(p) { return Math.round(ratingOf(p.quality, p.line) * 10) / 10; }
  /** How strongly a product draws buyers: its rating and its line. */
  appeal(p) { return (this.rating(p) / 5) ** 2 * LINES[p.line].appeal; }
  /** The quality research would reach now, from the team and Lia. */
  expectedQuality(type, team, mgmt) {
    const T = PRODUCT_TYPES[type], best = team.reduce((m, e) => Math.max(m, (e.skills[T.skill] || 0) + (T.cert && (e.certs || []).includes(T.cert) ? QUALITY.cert : 0)), 0);
    return Math.round(QUALITY.base + best * QUALITY.skill + mgmt * QUALITY.mgmt);
  }
  /** Starts researching a product in a line, paying for it now; it is ready after the type's days. */
  startResearch(type, line, economy, quality, day) {
    if (this.research || this.get(type) || !PRODUCT_TYPES[type] || !LINES[line] || !economy.spend('research', PRODUCT_TYPES[type].research)) return false;
    this.research = { type, line, ready: day + PRODUCT_TYPES[type].days, quality: Math.round(clamp(quality + rand(-QUALITY.luck, QUALITY.luck), 20, 100)) };
    this.version++; return true;
  }
  /** The morning: research done? A viral moment? Returns news keys. */
  startDay(day) {
    const news = []; this.viral = null;
    if (this.research && day >= this.research.ready) { const r = this.research; this.products.push({ type: r.type, line: r.line, quality: r.quality, stock: 0, sold: 0, since: day }); this.research = null; news.push('done:' + r.type); }
    const hit = this.products.filter(p => p.stock > 0 && this.rating(p) >= ONLINE.viralRating);
    if (hit.length && Math.random() < ONLINE.viralChance) { this.viral = hit[Math.floor(Math.random() * hit.length)].type; news.push('viral:' + this.viral); }
    this.version++; return news;
  }
  /** Makes a batch: paid now, on the shelf at once. */
  restock(type, units, economy) { const p = this.get(type); if (!p || !economy.spend('production', Math.round(this.unitCost(p) * units))) return false; p.stock += units; this.version++; return true; }
  /** A client at the desk may buy something: the chance grows with satisfaction and displays; they pick by appeal. */
  deskSale(satisfaction, displays) {
    const stocked = this.products.filter(p => p.stock > 0); if (!stocked.length) return null;
    if (Math.random() >= DESK.base + satisfaction * DESK.satisfaction + Math.min(DESK.displayMax, displays * DESK.display)) return null;
    let r = Math.random() * stocked.reduce((n, p) => n + this.appeal(p), 0); const p = stocked.find(x => (r -= this.appeal(x)) < 0) || stocked[0];
    p.stock--; p.sold++; this.sold.desk++; this.version++; return { type: p.type, price: this.unitPrice(p) };
  }
  /** The day's online orders, product by product: followers, appeal and a viral day; limited by stock. */
  onlineOrders(followers) {
    return this.products.filter(p => p.stock > 0).map(p => {
      const want = Math.floor(followers / ONLINE.per * this.appeal(p) * rand(.7, 1.3) * (this.viral === p.type ? ONLINE.viral : 1)), n = Math.min(p.stock, want);
      p.stock -= n; p.sold += n; this.sold.online += n; return { type: p.type, units: n, revenue: n * this.unitPrice(p) };
    }).filter(o => o.units > 0);
  }
  toJSON() { return { products: this.products, research: this.research, sold: this.sold }; }
  restore(d) { if (!d) return; this.products = (d.products || []).filter(p => PRODUCT_TYPES[p.type] && LINES[p.line]); this.research = d.research || null; this.sold = d.sold || { desk: 0, online: 0 }; this.version++; }
}
