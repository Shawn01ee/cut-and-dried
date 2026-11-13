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
 * The salon next door. It opens a few days in, then reacts to how well Ciel Ground is doing:
 * the better Lia's salon looks, the harder the rival pushes with discounts and promotions.
 */
export class Rival {
  constructor() {
    this.name = 'BLADE & CO'; this.open = false; this.price = 1; this.baseRating = 3.9;
    this.move = null; this.daysLeft = 0; this.version = 0;
  }
  get effect() { return this.move ? MOVES[this.move] : {}; }
  get discount() { return this.effect.discount || 0; }
  get priceLevel() { return this.effect.price ?? this.price; }
  get rating() { return clamp(this.baseRating + (this.effect.rating || 0), 1, 5); }
  /**
   * Starts a new day. `you` is { rating, followers, priceLevel } for Ciel Ground.
   * Returns a news key when the rival does something new, else null.
   */
  startDay(day, you) {
    if (!this.open) { if (day < OPENS_ON_DAY) return null; this.open = true; this.version++; return 'open'; }
    this.baseRating = clamp(this.baseRating + rand(-.05, .06), 3.2, 4.7);
    if (this.move && --this.daysLeft > 0) return null;
    this.move = null;
    const threat = clamp((you.rating ? you.rating - this.rating : 0) * .5 + you.followers / 3000, 0, 1);
    if (Math.random() > .3 + threat * .4) { this.version++; return null; }
    const options = ['priceCut', 'promo', 'newDesigner', 'influencer', 'premium'];
    // An underpriced rival undercuts harder; one losing on quality hires talent or courts influencers.
    if (you.priceLevel === 0) options.push('newDesigner', 'premium'); else options.push('priceCut', 'promo');
    this.move = pick(options); this.daysLeft = Math.round(rand(...MOVES[this.move].days));
    if (this.move === 'premium') this.price = 2; else if (this.move === 'priceCut' || this.move === 'promo') this.price = Math.min(this.price, 1);
    this.version++;
    return this.move;
  }
  /** Share of would-be clients who go next door instead today. */
  pull(you) {
    if (!this.open) return 0;
    const price = (you.priceLevel - this.priceLevel) * .07 + this.discount * .5;
    const rating = (this.rating - (you.rating || 4)) * .08;
    return clamp(.06 + price + rating + (this.effect.buzz || 0), 0, .45);
  }
  /** Clients compare prices with next door, so a cheap rival shrinks what they are willing to pay. */
  get budgetFactor() { return this.open ? 1 - this.discount * .5 - (this.priceLevel === 0 ? .05 : 0) : 1; }
  toJSON() { return { open: this.open, price: this.price, baseRating: this.baseRating, move: this.move, daysLeft: this.daysLeft }; }
  restore(d) { if (!d) return; Object.assign(this, { open: !!d.open, price: d.price ?? 1, baseRating: d.baseRating ?? 3.9, move: d.move || null, daysLeft: d.daysLeft || 0 }); this.version++; }
}
