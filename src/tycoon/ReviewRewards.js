/**
 * Money for reviews. Every review milestone pays a bonus scaled by the rating at that moment,
 * and every five genuine 5-star reviews in a row pay a streak bonus.
 * Fake reviews from trolls neither count nor break a streak.
 */
const FIRST_MILESTONES = [10, 25, 50, 75, 100, 150, 200];
/** After the listed ones, a milestone every 100 reviews, for as long as the salon runs. */
const STEP_AFTER = 100;
const PAY_PER_REVIEW = 20, MAX_BASE = 4000;
const STREAK_EVERY = 5, STREAK_PAY = 100, MAX_STREAK_PAY = 1000;

/** The milestone that comes after `n` reviews. */
export function milestoneAfter(n) {
  const listed = FIRST_MILESTONES.find(m => m > n);
  if (listed) return listed;
  const last = FIRST_MILESTONES[FIRST_MILESTONES.length - 1];
  return last + (Math.floor((n - last) / STEP_AFTER) + 1) * STEP_AFTER;
}
/** What a milestone pays before the rating is applied. */
export const milestoneBase = m => Math.min(MAX_BASE, m * PAY_PER_REVIEW);
/** The rating multiplier: ★4.0 pays in full, ★5.0 twice over, and a poor rating a quarter. */
export const ratingMultiplier = rating => Math.round(Math.min(2, Math.max(.25, rating - 3)) * 100) / 100;
/** What the streak bonus pays when a streak reaches `streak`. */
export const streakPay = streak => Math.min(MAX_STREAK_PAY, (streak / STREAK_EVERY) * STREAK_PAY);

export class ReviewRewards {
  constructor() { this.next = FIRST_MILESTONES[0]; this.streak = 0; this.best = 0; }
  static get streakEvery() { return STREAK_EVERY; }
  /** Genuine reviews still on the board. */
  static countOf(board) { return board.visible.filter(r => !r.fake).length; }

  /**
   * A review was just posted. Returns the bonuses it earned, as
   * [{ kind: 'milestone', at, base, mult, amount } | { kind: 'streak', streak, amount }].
   */
  onReview(review, board) {
    if (!review || review.fake) return [];
    const paid = [];
    this.streak = review.stars === 5 ? this.streak + 1 : 0;
    this.best = Math.max(this.best, this.streak);
    if (this.streak && this.streak % STREAK_EVERY === 0) paid.push({ kind: 'streak', streak: this.streak, amount: streakPay(this.streak) });
    const count = ReviewRewards.countOf(board);
    while (count >= this.next) {
      const base = milestoneBase(this.next), mult = ratingMultiplier(board.rating);
      paid.push({ kind: 'milestone', at: this.next, base, mult, rating: board.rating, amount: Math.round(base * mult) });
      this.next = milestoneAfter(this.next);
    }
    return paid;
  }

  toJSON() { return { next: this.next, streak: this.streak, best: this.best }; }
  /** An older save has no record: start from the milestone after the reviews it already has. */
  restore(d, board) {
    if (d) { this.next = d.next || FIRST_MILESTONES[0]; this.streak = d.streak || 0; this.best = d.best || 0; }
    else { this.next = milestoneAfter(ReviewRewards.countOf(board)); this.streak = 0; this.best = 0; }
  }
}
