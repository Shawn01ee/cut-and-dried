import { rand, clamp, pick } from '../core/math.js';

const OPENS_ON_DAY = 4;
/**
 * What the rival can do next. Each move lasts a few days: a discount, buzz, a better rating, dearer prices. Two are
 * their bad luck and our good: a day shut (some of their clients come to us) and a run of bad reviews.
 */
export const MOVES = {
  priceCut: { days: [3, 5], discount: .12 },
  promo: { days: [2, 3], discount: .2, buzz: .04 },
  newDesigner: { days: [4, 6], rating: .15 },
  influencer: { days: [2, 4], buzz: .07 },
  premium: { days: [3, 5], price: 2 },
  flyers: { days: [2, 3], buzz: .03 },
  copycat: { days: [3, 4], buzz: .04, rating: .05 },
  mishap: { days: [1, 1], shut: true, spill: .08 },
  scandal: { days: [3, 5], rating: -.3 },
};
/** Each rival's style: how much it favours each move (budget, premium, trendy). */
export const STYLES = [
  { priceCut: 3, promo: 2, flyers: 3, copycat: 1, influencer: 1, newDesigner: 1 },
  { premium: 3, newDesigner: 2, influencer: 2, copycat: 1, priceCut: 1, flyers: 1 },
  { influencer: 3, copycat: 2, newDesigner: 2, premium: 1, promo: 1, flyers: 1 },
];
/** How often it moves (a base, more when we look threatening, more for a stronger rival), the quiet days after a move, and its bad luck. */
export const MOVE_ODDS = { base: .14, threat: .2, tier: .04 }, REST_DAYS = [2, 4], LUCK_CHANCE = .04, PULL_MAX = .35;
/**
 * The rivals, one after another: when one closes, a stronger one opens a while later. Each has a starting rating,
 * a pull on clients that grows with its tier, and its stylists (who enter hair contests and can be scouted).
 */
export const RIVALS = [
  { name: 'BLADE & CO', rating: 3.9, stylists: ['jade', 'marcus'] },
  { name: 'MAISON NOIR', rating: 4.25, stylists: ['celine', 'bastien'] },
  { name: 'ATELIER VERDE', rating: 4.5, stylists: ['aria', 'mateo'] },
  // after the three, franchise chains keep coming, without stylists of note
  { name: 'GLOSS LAB', rating: 4.55, stylists: [] },
  { name: 'NOVA HAIR', rating: 4.6, stylists: [] },
];
/**
 * How long a rival holds out. Each morning our share of the street above `hold` wears its footing down by `wear` per
 * unit of share (a share of 0.76 against a 0.6 hold: -16); below `hold` it recovers at `mend` per unit. At zero it closes
 * and a stronger salon opens `REOPEN_DAYS` later, with `base` + `perTier` footing for each rival already beaten.
 * Beating one is worth `win` (reputation and followers, more for a stronger one).
 */
export const FOOTING = { base: 100, perTier: 30, hold: .6, wear: 100, mend: 50 }, REOPEN_DAYS = [4, 7];
export const RIVAL_WIN = { rep: 3, followers: 150 };
/** Matching a price war: our prices drop for its duration and most of the rival's discount stops working. */
export const MATCH_PRICE = .85, MATCH_BLUNTS = .7;
/** The chance on an ordinary day that the rival tries to poach one of our stylists, and what scouting theirs costs. */
export const POACH_CHANCE = .03, POACH_STRESS = 40, SCOUT_COST = [4000, 6000, 8000], SCOUT_LEVEL = 5;

/**
 * The salon next door. It opens a few days in, then reacts to how well Ciel Ground is doing: the better Lia's salon
 * looks, the harder it pushes. Dominate it long enough and it closes; the next one is stronger.
 */
export class Rival {
  constructor() {
    this.tier = 0; this.name = RIVALS[0].name; this.open = false; this.price = 1; this.baseRating = RIVALS[0].rating;
    this.move = null; this.daysLeft = 0; this.version = 0;
    // How much fight it has left (and yesterday's change and share), the day the next rival opens after a closure, closures so far, and stylists we took.
    this.footing = this.maxFooting; this.lastChange = 0; this.lastShare = null; this.reopenDay = 0; this.closed = 0; this.lost = []; this.rest = 0; this.history = [];
    // Stylists left without a salon when theirs closed: they can be hired like anyone else. `freed` is the last closure's.
    this.released = []; this.freed = null;
  }
  get def() { return RIVALS[Math.min(this.tier, RIVALS.length - 1)]; }
  /** Full footing for this rival: more for each one already beaten. */
  get maxFooting() { return FOOTING.base + FOOTING.perTier * this.tier; }
  /** Mornings left at yesterday's pace, or null when it is not wearing down. */
  get closesIn() { return this.lastChange < 0 ? Math.ceil(this.footing / -this.lastChange) : null; }
  get effect() { return this.move ? MOVES[this.move] : {}; }
  get discount() { return this.effect.discount || 0; }
  get priceLevel() { return this.effect.price ?? this.price; }
  get rating() { return clamp(this.baseRating + (this.effect.rating || 0), 1, 5); }
  /** The rival's stylists still working there. */
  get stylists() { return this.def.stylists.filter(id => !this.lost.includes(id) && !this.released.includes(id)); }
  /**
   * Starts a new day. `you` is { rating, followers, priceLevel, matching } for Ciel Ground.
   * Returns a news key when the rival does something new, else null.
   */
  startDay(day, you) {
    if (!this.open) {
      if (this.reopenDay ? day < this.reopenDay : day < OPENS_ON_DAY) return null;
      this.open = true; this.reopenDay = 0; this.footing = this.maxFooting; this.lastChange = 0; this.lastShare = null; this.version++; return 'open';
    }
    // Holding more of the street than `hold` wears them down; less lets them recover. At zero they give up.
    const share = 1 - this.pull(you) - (you.lost || 0), F = FOOTING;
    this.lastShare = share; this.lastChange = share > F.hold ? -(share - F.hold) * F.wear : (F.hold - share) * F.mend;
    this.footing = clamp(this.footing + this.lastChange, 0, this.maxFooting);
    if (this.footing <= 0) { this.#close(day); return 'closed'; }
    this.baseRating = clamp(this.baseRating + rand(-.05, .06), this.def.rating - .6, this.def.rating + .5);
    if (this.move && --this.daysLeft > 0) return null;
    // After a move, a few quiet days.
    if (this.move) { this.move = null; this.rest = Math.round(rand(...REST_DAYS)); this.version++; return null; }
    if (this.rest > 0) { this.rest--; this.version++; return null; }
    const start = id => { this.move = id; this.daysLeft = Math.round(rand(...MOVES[id].days)); this.history.unshift({ id, day }); this.history.length = Math.min(this.history.length, 6); this.version++; return id; };
    if (Math.random() < LUCK_CHANCE) return start(pick(['mishap', 'scandal']));
    const threat = clamp((you.rating ? you.rating - this.rating : 0) * .5 + you.followers / 3000, 0, 1);
    if (Math.random() > MOVE_ODDS.base + threat * MOVE_ODDS.threat + this.tier * MOVE_ODDS.tier) { this.version++; return null; }
    // Its own style, nudged by ours: an underpriced Ciel Ground draws a quality answer, a dear one a price answer.
    const w = { ...STYLES[this.tier % STYLES.length] };
    if (you.priceLevel === 0) { w.newDesigner = (w.newDesigner || 0) + 1; w.premium = (w.premium || 0) + 1; } else { w.priceCut = (w.priceCut || 0) + 1; w.promo = (w.promo || 0) + 1; }
    const bag = Object.entries(w).flatMap(([id, n]) => Array(n).fill(id)), id = pick(bag);
    if (id === 'premium') this.price = 2; else if (id === 'priceCut' || id === 'promo') this.price = Math.min(this.price, 1);
    return start(id);
  }
  #close(day) {
    const left = this.stylists; this.released.push(...left.filter(id => !this.released.includes(id))); this.freed = { from: this.name, ids: left };
    this.beaten = this.name; this.open = false; this.closed++; this.move = null; this.daysLeft = 0; this.price = 1; this.lost = [];
    this.tier = Math.min(RIVALS.length - 1, this.tier + 1); this.name = this.def.name; this.baseRating = this.def.rating; this.reopenDay = day + Math.round(rand(...REOPEN_DAYS)); this.version++;
  }
  /** The name of the rival that will open next (while one is closed). */
  get next() { return this.open ? null : this.def.name; }
  /** Share of would-be clients who go next door instead today; a matched price war blunts their discount. */
  pull(you) {
    if (!this.open || this.effect.shut) return 0;
    const disc = this.discount * (you.matching ? 1 - MATCH_BLUNTS : 1);
    const price = (you.priceLevel - this.priceLevel) * .07 + disc * .5;
    const rating = (this.rating - (you.rating || 4)) * .08;
    return clamp(.08 + this.tier * .03 + price + rating + (this.effect.buzz || 0), 0, PULL_MAX);
  }
  /** Clients compare prices with next door, so a cheap rival shrinks what they are willing to pay. */
  budgetFactor(matching = false) { return this.open ? 1 - this.discount * (matching ? 1 - MATCH_BLUNTS : 1) * .5 - (this.priceLevel === 0 ? .05 : 0) : 1; }
  /** Starts a move now (a spy's report, or false information that backfires), unless one is running. */
  startMove(id, day, days = null) { if (!this.open || this.move || !MOVES[id]) return false; this.move = id; this.daysLeft = days ?? Math.round(rand(...MOVES[id].days)); this.history.unshift({ id, day }); this.history.length = Math.min(this.history.length, 6); this.version++; return true; }
  /** One of their stylists came over to us: they are weaker for it. */
  lose(id) { if (!this.lost.includes(id)) this.lost.push(id); this.baseRating = Math.max(1, this.baseRating - .2); this.version++; }
  /** One of ours went to them. */
  gain() { this.baseRating = Math.min(5, this.baseRating + .15); this.version++; }
  toJSON() { return { tier: this.tier, open: this.open, price: this.price, baseRating: this.baseRating, move: this.move, daysLeft: this.daysLeft, footing: this.footing, lastChange: this.lastChange, lastShare: this.lastShare, reopenDay: this.reopenDay, closed: this.closed, lost: this.lost, released: this.released, rest: this.rest, history: this.history }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { tier: d.tier || 0, open: !!d.open, price: d.price ?? 1, baseRating: d.baseRating ?? 3.9, move: d.move || null, daysLeft: d.daysLeft || 0, reopenDay: d.reopenDay || 0, closed: d.closed || 0, lost: d.lost || [], released: d.released || [], rest: d.rest || 0, history: d.history || [] }); if (this.move && !MOVES[this.move]) this.move = null;
    this.name = this.def.name;
    // Older saves kept a run of dominant days instead: that run, out of 21, has worn the same share off.
    this.footing = d.footing ?? Math.round(this.maxFooting * (1 - Math.min(1, (d.streak || 0) / 21)));
    this.lastChange = d.lastChange || 0; this.lastShare = d.lastShare ?? null; this.version++;
  }
}
