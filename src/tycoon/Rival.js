import { rand, clamp, pick } from '../core/math.js';

const OPENS_ON_DAY = 4;
/** What the rival can do next. Each move lasts a few days. */
const MOVES = {
  priceCut: { days: [3, 5], discount: .2 },
  promo: { days: [2, 3], discount: .35, buzz: .06 },
  newDesigner: { days: [4, 6], rating: .25 },
  influencer: { days: [2, 4], buzz: .12 },
  premium: { days: [3, 5], price: 2 },
};
/**
 * The rivals, one after another: when one closes, a stronger one opens a while later. Each has a starting rating,
 * a pull on clients that grows with its tier, and its stylists (who enter hair contests and can be scouted).
 */
export const RIVALS = [
  { name: 'BLADE & CO', rating: 3.9, stylists: ['jade', 'marcus'] },
  { name: 'MAISON NOIR', rating: 4.25, stylists: ['celine', 'bastien'] },
  { name: 'ATELIER VERDE', rating: 4.5, stylists: ['aria', 'mateo'] },
];
/** Dominating the street for this many days in a row (our share at or above `DOMINANT`) closes the rival. */
export const DOMINANT = .85, DOMINANT_DAYS = 14, REOPEN_DAYS = 20;
/** Matching a price war: our prices drop for its duration and most of the rival's discount stops working. */
export const MATCH_PRICE = .85, MATCH_BLUNTS = .7;
/** The chance on an ordinary day that the rival tries to poach one of our stylists, and what scouting theirs costs. */
export const POACH_CHANCE = .07, SCOUT_COST = [4000, 6000, 8000], SCOUT_LEVEL = 5;

/**
 * The salon next door. It opens a few days in, then reacts to how well Ciel Ground is doing: the better Lia's salon
 * looks, the harder it pushes. Dominate it long enough and it closes; the next one is stronger.
 */
export class Rival {
  constructor() {
    this.tier = 0; this.name = RIVALS[0].name; this.open = false; this.price = 1; this.baseRating = RIVALS[0].rating;
    this.move = null; this.daysLeft = 0; this.version = 0;
    // Days in a row we have dominated, the day the next rival opens after a closure, closures so far, and stylists we took.
    this.streak = 0; this.reopenDay = 0; this.closed = 0; this.lost = [];
  }
  get def() { return RIVALS[Math.min(this.tier, RIVALS.length - 1)]; }
  get effect() { return this.move ? MOVES[this.move] : {}; }
  get discount() { return this.effect.discount || 0; }
  get priceLevel() { return this.effect.price ?? this.price; }
  get rating() { return clamp(this.baseRating + (this.effect.rating || 0), 1, 5); }
  /** The rival's stylists still working there. */
  get stylists() { return this.def.stylists.filter(id => !this.lost.includes(id)); }
  /**
   * Starts a new day. `you` is { rating, followers, priceLevel, matching } for Ciel Ground.
   * Returns a news key when the rival does something new, else null.
   */
  startDay(day, you) {
    if (!this.open) {
      if (this.reopenDay ? day < this.reopenDay : day < OPENS_ON_DAY) return null;
      this.open = true; this.reopenDay = 0; this.version++; return 'open';
    }
    // Every day we hold most of the street counts; enough in a row and they give up.
    const share = 1 - this.pull(you);
    this.streak = share >= DOMINANT ? this.streak + 1 : 0;
    if (this.streak >= DOMINANT_DAYS) { this.#close(day); return 'closed'; }
    this.baseRating = clamp(this.baseRating + rand(-.05, .06), this.def.rating - .6, this.def.rating + .5);
    if (this.move && --this.daysLeft > 0) return null;
    this.move = null;
    const threat = clamp((you.rating ? you.rating - this.rating : 0) * .5 + you.followers / 3000, 0, 1);
    if (Math.random() > .3 + threat * .4 + this.tier * .08) { this.version++; return null; }
    const options = ['priceCut', 'promo', 'newDesigner', 'influencer', 'premium'];
    // An underpriced rival undercuts harder; one losing on quality hires talent or courts influencers.
    if (you.priceLevel === 0) options.push('newDesigner', 'premium'); else options.push('priceCut', 'promo');
    this.move = pick(options); this.daysLeft = Math.round(rand(...MOVES[this.move].days));
    if (this.move === 'premium') this.price = 2; else if (this.move === 'priceCut' || this.move === 'promo') this.price = Math.min(this.price, 1);
    this.version++;
    return this.move;
  }
  #close(day) {
    this.open = false; this.closed++; this.streak = 0; this.move = null; this.daysLeft = 0; this.price = 1; this.lost = [];
    this.tier = Math.min(RIVALS.length - 1, this.tier + 1); this.name = this.def.name; this.baseRating = this.def.rating; this.reopenDay = day + REOPEN_DAYS; this.version++;
  }
  /** The name of the rival that will open next (while one is closed). */
  get next() { return this.open ? null : this.def.name; }
  /** Share of would-be clients who go next door instead today; a matched price war blunts their discount. */
  pull(you) {
    if (!this.open) return 0;
    const disc = this.discount * (you.matching ? 1 - MATCH_BLUNTS : 1);
    const price = (you.priceLevel - this.priceLevel) * .07 + disc * .5;
    const rating = (this.rating - (you.rating || 4)) * .08;
    return clamp(.06 + this.tier * .03 + price + rating + (this.effect.buzz || 0), 0, .45);
  }
  /** Clients compare prices with next door, so a cheap rival shrinks what they are willing to pay. */
  budgetFactor(matching = false) { return this.open ? 1 - this.discount * (matching ? 1 - MATCH_BLUNTS : 1) * .5 - (this.priceLevel === 0 ? .05 : 0) : 1; }
  /** One of their stylists came over to us: they are weaker for it. */
  lose(id) { if (!this.lost.includes(id)) this.lost.push(id); this.baseRating = Math.max(1, this.baseRating - .2); this.version++; }
  /** One of ours went to them. */
  gain() { this.baseRating = Math.min(5, this.baseRating + .15); this.version++; }
  toJSON() { return { tier: this.tier, open: this.open, price: this.price, baseRating: this.baseRating, move: this.move, daysLeft: this.daysLeft, streak: this.streak, reopenDay: this.reopenDay, closed: this.closed, lost: this.lost }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { tier: d.tier || 0, open: !!d.open, price: d.price ?? 1, baseRating: d.baseRating ?? 3.9, move: d.move || null, daysLeft: d.daysLeft || 0, streak: d.streak || 0, reopenDay: d.reopenDay || 0, closed: d.closed || 0, lost: d.lost || [] });
    this.name = this.def.name; this.version++;
  }
}
