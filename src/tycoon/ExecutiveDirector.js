/**
 * The executive director's standing rules, once Lia is CEO: `pay` each open day; outlets below `coachBelow` quality
 * are trained; an outlet that lost money `lossDays` days running is closed to recover and reopened at `reopenAt`;
 * while no outlet lost money, one outlet is opened every `pace` days up to the target (at most `most`); and after any
 * training or opening at least `reserve` stays in cash.
 */
export const DIRECTOR = { pay: 150, reserve: 20000, pace: 7, coachBelow: 90, lossDays: 3, reopenAt: 90, most: 12 };

/**
 * Runs the franchise network's routine for the CEO each morning, by the rules above, using the network's own actions
 * (the same buttons the player has). `terms` gives the formats and the training cost, so this module needs no import
 * from the network. What it did is kept for the day as `kind:label` keys ('opened', 'coached', 'rested', 'reopened').
 */
export class ExecutiveDirector {
  constructor(network, terms) { Object.assign(this, { network, terms }); this.on = false; this.target = 0; this.format = 'room'; this.lastOpen = 0; this.today = []; }
  /** Only a CEO has an executive director. */
  get available() { return this.network.executive; }
  appoint(on) {
    if (on && !this.available) return false;
    this.on = !!on; if (this.on && this.target <= this.network.outlets.length) this.target = Math.min(DIRECTOR.most, this.network.outlets.length + 2);
    this.network.version++; return true;
  }
  /** The number of outlets to grow to: never below those already open. */
  setTarget(n) { this.target = Math.max(this.network.outlets.length, Math.min(DIRECTOR.most, n)); this.network.version++; }
  setFormat(format) { if (this.terms.formats[format]) { this.format = format; this.network.version++; } }
  static label(o) { return `CIEL ${o.format.toUpperCase()} #${o.id}`; }
  /** What was done, in words (`t` translates): each kind once, with its outlets (`#n`, or the full name of a new one). */
  static describe(keys, t) {
    const by = new Map();
    for (const k of keys) { const [kind, label] = k.split(':'); if (!by.has(kind)) by.set(kind, []); by.get(kind).push(kind === 'opened' ? label : label.slice(label.indexOf('#'))); }
    return [...by].map(([kind, labels]) => t('net.dir.' + kind, labels.join(', '))).join(' · ');
  }
  /** The morning round on an open day: pay, then each outlet, then perhaps a new one. Returns what was done. */
  morning(day) {
    this.today = []; this.day = day; if (!this.on || !this.available) return [];
    const N = this.network, E = N.game.economy, spare = cost => E.cash - cost >= DIRECTOR.reserve, did = [], L = ExecutiveDirector.label;
    E.charge('director', DIRECTOR.pay);
    for (const o of N.outlets) {
      if (o.rested && o.paused) { if (o.quality >= DIRECTOR.reopenAt && N.toggle(o.id)) { o.rested = false; did.push('reopened:' + L(o)); } continue; }
      if (o.paused) continue; // closed by the player: theirs to reopen
      if ((o.lossDays || 0) >= DIRECTOR.lossDays && N.toggle(o.id)) { o.rested = true; did.push('rested:' + L(o)); continue; }
      if (o.quality < DIRECTOR.coachBelow && spare(this.terms.coachCost) && N.coach(o.id)) did.push('coached:' + L(o));
    }
    const f = this.format, losing = N.outlets.some(o => !o.paused && (o.lossDays || 0) > 0);
    if (N.outlets.length < this.target && day - this.lastOpen >= DIRECTOR.pace && !losing && spare(this.terms.formats[f].cost) && N.open(f)) { this.lastOpen = day; did.push('opened:' + L(N.outlets.at(-1))); }
    this.today = did; N.version++; return did;
  }
  toJSON() { return { on: this.on, target: this.target, format: this.format, lastOpen: this.lastOpen }; }
  restore(d) { this.on = !!d?.on; this.target = d?.target ?? 0; this.format = this.terms.formats[d?.format] ? d.format : 'room'; this.lastOpen = d?.lastOpen ?? 0; this.today = []; }
}
