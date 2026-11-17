import { clamp } from '../core/math.js';

/** Reputation cannot outgrow the reviews: once there are `reviews` of them, it rises no higher than `base + perStar × rating`. */
export const REP_CEILING = { reviews: 5, base: 40, perStar: 12, drift: .2 };
/**
 * Word of mouth (happy clients, good reviews) builds reputation slowly, and more slowly the higher it already stands:
 * each gain counts `scale` × (1 − reputation / `span`). Rewards with a stated number (a contest, a rival beaten) count in full.
 */
export const REP_GAIN = { scale: .2, span: 110 };
export const repCeiling = (rating, count) => count >= REP_CEILING.reviews ? Math.min(100, REP_CEILING.base + REP_CEILING.perStar * rating) : 100;

/** Brand reputation from 0 to 100, shown as one to five stars. `ceilingOf()` gives today's ceiling (see REP_CEILING). */
export class Reputation {
  constructor(ceilingOf = () => 100) { this.value = 0; this.ceilingOf = ceilingOf; }
  get ceiling() { return this.ceilingOf(); }
  /** Losses always count; gains stop at the ceiling (and do nothing while reputation is above it). */
  add(amount) { this.value = clamp(this.value + amount, 0, amount > 0 ? Math.max(this.value, Math.min(100, this.ceiling)) : 100); }
  /** How much of a word-of-mouth gain counts at today's reputation (see REP_GAIN). */
  get gainShare() { return REP_GAIN.scale * Math.max(0, 1 - this.value / REP_GAIN.span); }
  /** Word of mouth: a happy client or a review. Gains are scaled by `gainShare`; losses count in full. */
  earn(amount) { this.add(amount > 0 ? amount * this.gainShare : amount); }
  /** Each morning, reputation above the ceiling slips part of the way down to it. */
  settle() { const top = this.ceiling; if (this.value > top) this.value = Math.max(top, this.value - Math.max(.5, (this.value - top) * REP_CEILING.drift)); }
  get stars() { return Math.min(5, Math.floor(this.value / 20) + 1); }
  get starText() { return '★'.repeat(this.stars) + '☆'.repeat(5 - this.stars); }
}
