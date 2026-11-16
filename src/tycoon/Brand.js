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
/** Lines: what they cost to make and sell for (×), the quality buyers expect, how broadly they appeal, and what research costs (×) and takes (± days). */
export const LINES = {
  value: { price: .75, cost: .8, expect: 45, appeal: 1.2, research: .7, days: -1 },
  signature: { price: 1, cost: 1, expect: 60, appeal: 1, research: 1, days: 0 },
  luxury: { price: 1.6, cost: 1.5, expect: 75, appeal: .8, research: 1.8, days: 2 },
};
/** Quality from research: a base, the team's best at the product's skill, a matching certificate, Lia's management, luck. */
export const QUALITY = { base: 30, skill: .45, cert: 8, mgmt: .1, luck: 8 };
/** In-salon sales: the chance a paying client buys, with satisfaction and the displays the salon has. */
export const DESK = { base: .1, satisfaction: .2, display: .03, displayMax: .15 };
/** Online: orders a day per product for every this-many followers, before rating and appeal; shipping per order; a viral day. */
export const ONLINE = { per: 1500, shipping: 3, viralRating: 4.5, viralChance: .05, viral: 3 };
export const BATCHES = [20, 100];
/**
 * Business offers once there are products, now and then: a wholesale supply contract (units a week at a share of the
 * shelf price, for some weeks), a listing in a shop (a fee up front, then daily sales less the shop's cut), a creator
 * who posts about free products, and a placement in a web drama. Sponsorships and placements lift online orders.
 */
export const DEALS = {
  salon: { kind: 'supply', units: [15, 30], share: .6, weeks: 4 },
  hotel: { kind: 'supply', units: [20, 40], share: .65, weeks: 6, types: ['shampoo', 'treatment', 'oil'] },
  gym: { kind: 'supply', units: [25, 45], share: .55, weeks: 4, types: ['shampoo', 'scalpTonic', 'wax'] },
  boutique: { kind: 'listing', fee: 1200, cut: .3, daily: [1, 4] },
  mall: { kind: 'listing', fee: 800, cut: .25, daily: [2, 5] },
  dept: { kind: 'listing', fee: 4000, cut: .35, daily: [4, 9], rating: 4.2 },
  creator: { kind: 'sponsor', units: [10, 25], followers: [250, 900], boost: 2, days: 3 },
  drama: { kind: 'ppl', cost: [2500, 4500], followers: [300, 800], boost: 2.5, days: 7 },
};
/** The chance of an offer on a working day, the rating a product needs for one, and what a short delivery costs (× its value). */
export const DEAL_CHANCE = .12, DEAL_RATING = 3.5, SUPPLY_PENALTY = .5;
const between = ([a, b]) => Math.round(rand(a, b));

const ratingOf = (quality, line) => clamp(3 + (quality - LINES[line].expect) / 12, 1, 5);

export class Brand {
  constructor() { this.products = []; this.research = null; this.version = 0; this.sold = { desk: 0, online: 0 }; this.viral = null; this.offer = null; this.contracts = []; this.listings = []; this.boost = null; }
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
  /** What researching a product in a line costs, and how many days it takes. */
  researchCost(type, line) { return Math.round(PRODUCT_TYPES[type].research * LINES[line].research / 100) * 100; }
  researchDays(type, line) { return Math.max(2, PRODUCT_TYPES[type].days + LINES[line].days); }
  /** Starts researching a product in a line, paying for it now; it is ready after the line's days for that type. */
  startResearch(type, line, economy, quality, day) {
    if (this.research || this.get(type) || !PRODUCT_TYPES[type] || !LINES[line] || !economy.spend('research', this.researchCost(type, line))) return false;
    this.research = { type, line, ready: day + this.researchDays(type, line), quality: Math.round(clamp(quality + rand(-QUALITY.luck, QUALITY.luck), 20, 100)) };
    this.version++; return true;
  }
  /** The morning: research done? A viral moment? Returns news keys. */
  startDay(day) {
    const news = []; this.viral = null; this.day = day;
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
      const want = Math.floor(followers / ONLINE.per * this.appeal(p) * rand(.7, 1.3) * (this.viral === p.type ? ONLINE.viral : 1) * this.boostNow), n = Math.min(p.stock, want);
      p.stock -= n; p.sold += n; this.sold.online += n; return { type: p.type, units: n, revenue: n * this.unitPrice(p) };
    }).filter(o => o.units > 0);
  }
  /** Online orders ×, while a sponsorship or placement runs. */
  get boostNow() { return this.boost && this.day <= this.boost.until ? this.boost.mult : 1; }
  /** Maybe an offer this morning, if none is waiting; returns it (or null). */
  rollOffer(day) {
    this.day = day;
    const rated = this.products.filter(p => this.rating(p) >= DEAL_RATING); if (this.offer || !rated.length || Math.random() >= DEAL_CHANCE) return null;
    const best = Math.max(...rated.map(p => this.rating(p))), stocked = rated.filter(p => p.stock > 0).sort((a, b) => b.stock - a.stock);
    const open = Object.keys(DEALS).filter(id => { const D = DEALS[id];
      if (D.kind === 'supply') return !this.contracts.some(c => c.deal === id) && rated.some(p => !D.types || D.types.includes(p.type));
      if (D.kind === 'listing') return !this.listings.some(l => l.deal === id) && best >= (D.rating || DEAL_RATING);
      if (D.kind === 'sponsor') return stocked.length && stocked[0].stock >= D.units[0];
      return true; });
    if (!open.length) return null;
    const id = open[Math.floor(Math.random() * open.length)], D = DEALS[id], o = { deal: id, kind: D.kind };
    if (D.kind === 'supply') { const pool = rated.filter(p => !D.types || D.types.includes(p.type)), p = pool[Math.floor(Math.random() * pool.length)]; Object.assign(o, { type: p.type, units: between(D.units), price: Math.round(this.unitPrice(p) * D.share * 10) / 10, weeks: D.weeks }); }
    else if (D.kind === 'listing') Object.assign(o, { fee: D.fee, cut: D.cut, daily: D.daily });
    else if (D.kind === 'sponsor') Object.assign(o, { type: stocked[0].type, units: Math.min(stocked[0].stock, between(D.units)), followers: between(D.followers), boost: D.boost, days: D.days });
    else Object.assign(o, { cost: Math.round(between(D.cost) / 100) * 100, followers: between(D.followers), boost: D.boost, days: D.days });
    this.offer = o; this.version++; return o;
  }
  /** Takes the waiting offer; false if it cannot be paid for or supplied. */
  accept(economy, marketing, day) {
    const o = this.offer; if (!o) return false;
    if (o.kind === 'supply') this.contracts.push({ deal: o.deal, type: o.type, units: o.units, price: o.price, weeksLeft: o.weeks, next: day + 7 });
    else if (o.kind === 'listing') { if (!economy.spend('listing', o.fee)) return false; this.listings.push({ deal: o.deal, cut: o.cut, daily: o.daily }); }
    else if (o.kind === 'sponsor') { const p = this.get(o.type); if (!p || p.stock < o.units) return false; p.stock -= o.units; marketing.addFollowers(o.followers); this.boost = { mult: o.boost, until: day + o.days - 1 }; }
    else { if (!economy.spend('ppl', o.cost)) return false; marketing.addFollowers(o.followers); this.boost = { mult: o.boost, until: day + o.days - 1 }; }
    this.offer = null; this.version++; return true;
  }
  decline() { this.offer = null; this.version++; }
  /** The evening: deliveries that fall due and the shops' sales. Returns news keys. */
  closeDay(day, economy) {
    const news = [];
    for (const c of this.contracts.slice()) {
      if (day < c.next) continue;
      const p = this.get(c.type), n = Math.min(p ? p.stock : 0, c.units);
      if (p) { p.stock -= n; p.sold += n; } if (n) economy.earn('wholesale', Math.round(n * c.price));
      if (n < c.units) { economy.charge('penalty', Math.round((c.units - n) * c.price * SUPPLY_PENALTY)); this.contracts.splice(this.contracts.indexOf(c), 1); news.push('broken:' + c.deal); continue; }
      c.next += 7; if (--c.weeksLeft <= 0) { this.contracts.splice(this.contracts.indexOf(c), 1); news.push('finished:' + c.deal); }
    }
    for (const l of this.listings) {
      let left = between(l.daily);
      while (left-- > 0) { const stocked = this.products.filter(p => p.stock > 0); if (!stocked.length) break;
        let r = Math.random() * stocked.reduce((n, p) => n + this.appeal(p), 0); const p = stocked.find(x => (r -= this.appeal(x)) < 0) || stocked[0];
        if (Math.random() > this.appeal(p) / LINES[p.line].appeal) continue; p.stock--; p.sold++; economy.earn('retail', Math.round(this.unitPrice(p) * (1 - l.cut) * 10) / 10); }
    }
    this.version++; return news;
  }
  /** Units a week the supply contracts take, by product. */
  weeklyNeed(type) { return this.contracts.filter(c => c.type === type).reduce((n, c) => n + c.units, 0); }
  toJSON() { return { products: this.products, research: this.research, sold: this.sold, offer: this.offer, contracts: this.contracts, listings: this.listings, boost: this.boost }; }
  restore(d) { if (!d) return; this.products = (d.products || []).filter(p => PRODUCT_TYPES[p.type] && LINES[p.line]); this.research = d.research || null; this.sold = d.sold || { desk: 0, online: 0 }; this.offer = d.offer || null; this.contracts = d.contracts || []; this.listings = d.listings || []; this.boost = d.boost || null; this.version++; }
}
