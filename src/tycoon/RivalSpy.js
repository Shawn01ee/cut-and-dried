import { pick } from '../core/math.js';

/**
 * Now and then the rival sends someone in posing as a client, after one of three things: our menu (they copy our
 * signature styles), our people (an offer to one of our stylists follows) or our reviews (a fake one-star review).
 * The desk may see through them; the odds grow with the receptionist's service skill, CCTV and Lia's management.
 *
 * `chance` is per working day by the rival's tier; `spot` makes up the odds of seeing through them; feeding them false
 * information costs the rival `feed` rating for `feedDays` days; a spy shown the door writes a spiteful review `spite`
 * of the time.
 */
export const SPY = {
  chance: [.04, .06, .08], aims: ['menu', 'staff', 'review'],
  spot: { base: .2, desk: .004, cctv: .25, mgmt: .003, max: .85 },
  feed: .25, spite: .3,
};

export class RivalSpy {
  constructor() { this.plan = null; this.log = []; this.version = 0; }
  /** The morning: maybe a spy today, arriving some time after opening. */
  startDay(rival, openHour, closeHour) {
    const open = rival.open && Math.random() < SPY.chance[Math.min(rival.tier, SPY.chance.length - 1)];
    this.plan = open ? { aim: pick(SPY.aims), hour: openHour + Math.random() * Math.max(1, closeHour - openHour - 2), from: rival.name } : null;
    this.version++;
  }
  /** The first walk-in after the planned hour is the spy: their mission, or null. */
  take(hour) { const p = this.plan; if (!p || hour < p.hour) return null; this.plan = null; return { aim: p.aim, from: p.from, resolved: false, spotted: false }; }
  /** The odds the desk sees through a spy: `desk` is the receptionist's service skill (0 without one). */
  spotOdds({ desk, cctv, mgmt }) { const S = SPY.spot; return Math.min(S.max, S.base + desk * S.desk + (cctv ? S.cctv : 0) + mgmt * S.mgmt); }
  /** How a visit ended: 'out' (shown the door), 'fed' (sent off with false information), or the aim they got away with. */
  record(day, aim, how) { this.log.unshift({ day, aim, how }); this.log.length = Math.min(this.log.length, 10); this.version++; }
  get caught() { return this.log.filter(l => l.how === 'out' || l.how === 'fed').length; }
  get missed() { return this.log.length - this.caught; }
  toJSON() { return { log: this.log }; }
  restore(d) { this.log = d?.log || []; this.plan = null; this.version++; }
}
