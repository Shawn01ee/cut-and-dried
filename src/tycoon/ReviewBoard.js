import { pick } from '../core/math.js';
import { NAMES } from '../customers/catalog.js';

const MAX_KEPT = 80, RATING_WINDOW = 40, MIN_FOR_DEMAND = 5;
export const starsFor = s => s >= .86 ? 5 : s >= .72 ? 4 : s >= .58 ? 3 : s >= .42 ? 2 : 1;

/**
 * Online reviews: what clients write, the owner's replies and the average rating.
 * A review stores a text key and arguments, so it shows in whichever language is selected.
 */
export class ReviewBoard {
  #nextId = 0;
  constructor() { this.list = []; this.unread = 0; this.version = 0; this.autoReply = false; }
  get visible() { return this.list.filter(r => !r.removed); }
  get count() { return this.visible.length; }
  /** How much a review counts towards the rating: a thank-you makes praise count in full, an apology takes the sting out of a complaint. */
  static weight(r) { return r.replied ? 1 : r.stars >= 4 ? .5 : 1.5; }
  /** Average stars of recent reviews, weighted by whether they have been answered. */
  get rating() {
    const recent = this.visible.slice(0, RATING_WINDOW); if (!recent.length) return 0;
    const w = recent.reduce((sum, r) => sum + ReviewBoard.weight(r), 0);
    return recent.reduce((sum, r) => sum + r.stars * ReviewBoard.weight(r), 0) / w;
  }
  /** Once there are a few reviews, the rating pulls demand up or down. */
  get demandMultiplier() { return this.count >= MIN_FOR_DEMAND ? 1 + (this.rating - 4) * .15 : 1; }
  find(id) { return this.list.find(r => r.id === id) || null; }
  /** Average stars of the reviews that name a stylist. */
  ratingFor(stylist) { const mine = this.visible.filter(r => r.visit && r.visit.stylist === stylist); return { count: mine.length, average: mine.length ? mine.reduce((sum, r) => sum + r.stars, 0) / mine.length : 0 }; }
  markRead() { if (this.unread) { this.unread = 0; this.version++; } }
  today(day) { return this.visible.filter(r => r.day === day); }

  #add(review) {
    const r = { id: ++this.#nextId, args: [], visit: null, replied: null, removed: false, edited: false, fake: false, villain: false, ...review };
    this.list.unshift(r);
    if (this.list.length > MAX_KEPT) this.list.length = MAX_KEPT;
    this.unread++; this.version++;
    return r;
  }

  /** A served client may write a review. Difficult clients and influencers always do. */
  fromService(customer, result, day, outcome = {}) {
    if (outcome.dashed) return null;
    const visit = { stylist: result.stylist, service: customer.requestedService }, author = customer.name, s = result.satisfaction;
    if (customer.influencer) {
      const stars = s >= .75 ? 5 : s >= .55 ? 4 : 2;
      return this.#add({ author, day, stars, key: { 5: 'i.good', 4: 'i.ok', 2: 'i.bad' }[stars], args: [customer.influencer.handle], visit });
    }
    if (customer.villain) {
      if (outcome.refunded) return this.#add({ author, day, stars: 2, key: 'v.refunded', visit, villain: true });
      if (outcome.refusedRefund) return this.#add({ author, day, stars: 1, key: 'v.refused', visit, villain: true });
      const stars = Math.max(1, Math.min(3, result.reviewStars ?? starsFor(s)) - (outcome.haggleRefused ? 1 : 0));
      return this.#add({ author, day, stars, key: outcome.haggleRefused ? 'v.haggle' : 'v.' + result.nitpick, visit, villain: true });
    }
    if (Math.random() > .3 + Math.abs(s - .65) * .8) return null;
    const stars = result.reviewStars ?? starsFor(s);
    return this.#add({ author, day, stars, key: ReviewBoard.#textFor(stars, customer, result), args: [result.stylist], visit });
  }
  static #textFor(stars, customer, r) {
    const service = customer.requestedService;
    if (stars >= 4) {
      if (r.hairScore < .72 && r.service >= .65) return 'p.service';
      if (r.specialist) return 'p.special';
      const options = ['p.general'];
      if (r.length > .9) options.push('p.cut');
      if (service === 'colour' && r.colour > .85) options.push('p.colour');
      if (service === 'perm' && r.wav > .85) options.push('p.wave');
      if (r.treated >= 3) options.push('p.drinks');
      if (r.environment >= 1) options.push('p.vibe');
      return pick(options);
    }
    if (stars === 3) return pick(['m.0', 'm.1', 'm.2']);
    if (r.hairScore >= .72 && r.service < .4) return 'n.service';
    if (r.dmg > .3) return 'n.damage';
    const faults = [['n.length', r.length], ['n.style', r.style], ['n.wait', r.wait], ['n.price', r.priceFit + .3]];
    if (service === 'colour') faults.push(['n.colour', r.colour]);
    if (service === 'perm') faults.push(['n.wave', r.wav]);
    return faults.sort((a, b) => a[1] - b[1])[0][0];
  }
  /** Someone who gave up waiting. Being looked after while they waited makes a bad review less likely and less harsh. */
  walkedOut(customer, day) {
    const treated = customer.treated || 0;
    return Math.random() < .45 * (1 - treated * .1) ? this.#add({ author: customer.name, day, stars: treated >= 2 ? 2 : pick([1, 1, 2]), key: 'n.walkout', visit: { service: customer.requestedService } }) : null;
  }
  turnedAway(customer, day) {
    return Math.random() < .2 ? this.#add({ author: customer.name, day, stars: 2, key: 'n.full', visit: { service: customer.requestedService } }) : null;
  }
  /** A one-star review from someone who never came in. */
  troll(day) { return this.#add({ author: pick(NAMES), day, stars: 1, key: pick(['t.0', 't.1', 't.2', 't.3']), fake: true }); }

  /**
   * Someone answers a review: the marketing lead if there is one, otherwise Lia.
   * `by` is { name, role, skill }; a skilled marketer's replies win back more goodwill.
   * Returns the reputation change, or null if that answer is not possible.
   */
  reply(id, kind, by = { name: 'Lia', role: 'owner', skill: 0 }) {
    const r = this.find(id);
    if (!r || r.replied || r.removed) return null;
    let rep = 0, edited = false;
    const knack = 1 + by.skill / 100;
    r.by = by.name; r.byRole = by.role;
    if (kind === 'thanks' && r.stars >= 4) { r.replied = 'thanks'; rep = .3 * knack; }
    else if (kind === 'apology' && r.stars <= 3) {
      r.replied = 'apology'; rep = .8 * knack;
      if (!r.fake && r.stars < 5 && Math.random() < (r.villain ? .15 : .4) * knack) { r.stars++; r.edited = edited = true; }
    } else if (kind === 'report' && r.stars <= 3) {
      if (r.fake) { r.removed = true; r.replied = 'removed'; } else { r.replied = 'rejected'; rep = -2; }
    } else return null;
    this.version++;
    return { review: r, rep, edited };
  }

  toJSON() { return { nextId: this.#nextId, list: this.list.slice(0, 60), autoReply: this.autoReply }; }
  restore(d) {
    if (!d) return;
    this.list = d.list || []; this.#nextId = d.nextId || this.list.reduce((m, r) => Math.max(m, r.id), 0);
    this.unread = 0; this.autoReply = !!d.autoReply; this.version++;
  }
}
