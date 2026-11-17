import { CUTS, PERMS } from '../hair/StyleMenu.js';
import { WANT } from '../customers/catalog.js';

/**
 * The style book: every cut, perm and colour the salon has done, how often, and the best result. The first time a style
 * is done it goes into the book; a result scoring `PERFECT` or better earns it a star; a starred style done
 * `SIGNATURE` times becomes one of the salon's signatures, and clients pay `SIGNATURE_PAY` more for it. Filling the book
 * to each of `MILESTONES` pays its reward once.
 */
export const PERFECT = .97, SIGNATURE = 8, SIGNATURE_PAY = 1.05;
export const MILESTONES = [
  { at: 10, cash: 500, followers: 50 }, { at: 20, cash: 1000, followers: 100 }, { at: 35, cash: 2000, followers: 200 },
  { at: 50, cash: 4000, followers: 400 }, { at: 65, cash: 7000, followers: 700 }, { at: 83, cash: 15000, followers: 1500 },
];
/** The book's sections and their entries, as 'cut:id', 'perm:id' and 'col:index'. */
export const BOOK_GROUPS = {
  cutF: Object.keys(CUTS).filter(id => CUTS[id].g === 'f' && !CUTS[id].reference).map(id => 'cut:' + id),
  cutM: Object.keys(CUTS).filter(id => CUTS[id].g !== 'f' && !CUTS[id].reference).map(id => 'cut:' + id),
  cutRef: Object.keys(CUTS).filter(id => CUTS[id].reference).map(id => 'cut:' + id),
  perm: Object.keys(PERMS).map(id => 'perm:' + id),
  colour: WANT.map((_, i) => 'col:' + i),
};
export const STYLE_BOOK_SIZE = Object.values(BOOK_GROUPS).reduce((n, g) => n + g.length, 0);

/** The book entries a finished order covers: its cut, its perm when one was done, its colour when one was asked for. */
export const entriesOf = order => [order.cut && 'cut:' + order.cut, order.perm && 'perm:' + order.perm, order.col && order.col.t === 'want' && 'col:' + order.col.i].filter(Boolean);

export class StyleBook {
  constructor() { this.entries = {}; this.paid = 0; this.version = 0; }
  get size() { return Object.keys(this.entries).length; }
  get stars() { return Object.values(this.entries).filter(e => e.star).length; }
  get signatures() { return Object.keys(this.entries).filter(k => this.isSignature(k)); }
  isSignature(key) { const e = this.entries[key]; return !!e && e.star && e.n >= SIGNATURE; }
  /** True when any of the order's styles is a signature (it pays more). */
  signatureIn(order) { return entriesOf(order).some(k => this.isSignature(k)); }
  /**
   * Records a finished service: `score` is how well the hair came out (0 to 1), `by` who did it.
   * Returns what changed: new entries, first stars, new signatures, and milestones reached (each paid once).
   */
  record(order, score, by, day) {
    const out = { fresh: [], stars: [], signatures: [], milestones: [] };
    for (const key of entriesOf(order)) {
      const e = this.entries[key] || (this.entries[key] = { n: 0, best: 0, star: false, day, by }), wasSig = this.isSignature(key);
      if (!e.n) out.fresh.push(key);
      e.n++; e.best = Math.max(e.best, score);
      if (!e.star && score >= PERFECT) { e.star = true; e.starBy = by; out.stars.push(key); }
      if (!wasSig && this.isSignature(key)) out.signatures.push(key);
    }
    while (this.paid < MILESTONES.length && this.size >= MILESTONES[this.paid].at) out.milestones.push(MILESTONES[this.paid++]);
    if (out.fresh.length || out.stars.length || out.signatures.length) this.version++;
    return out;
  }
  toJSON() { return { entries: this.entries, paid: this.paid }; }
  restore(d) { this.entries = d && d.entries || {}; this.paid = d && d.paid || 0; this.version++; }
}
