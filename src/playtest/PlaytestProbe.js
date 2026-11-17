import { FURNITURE, categoryOf } from '../building/FurnitureCatalog.js';
import { STEPS } from '../tycoon/Onboarding.js';

const waitingSeats = layout => layout.items.filter(it => categoryOf(it.id) === 'waiting' && FURNITURE[it.id]?.seats).length;

/**
 * Looks at the game about once a second and marks the playtest milestones the first time each is met: the first client
 * in the door, the first finished service, the first happy client, an extra waiting seat, level 2, the first hire and
 * the first day's report. It also notes each opening-checklist step as it completes, and each day's report with a
 * snapshot of what the player can change (seats, furniture, staff, hours, prices), so the next report shows what they
 * did about it. It only reads the game.
 */
export class PlaytestProbe {
  constructor(game, log) { Object.assign(this, { game, log }); this.seats = null; this.step = null; this.reported = new Set((log.data.events || []).filter(e => e.kind === 'report').map(e => e.day)); }
  /** A day's report on screen: noted once, with what the player can change as it stands. */
  report(day) { if (this.reported.has(day)) return; this.reported.add(day); this.log.event('report', { day, snap: this.snapshot() }); }
  /** What the player can change, as it stands. */
  snapshot() { const g = this.game; return { seats: waitingSeats(g.layout), items: g.layout.items.length, hired: g.staff.hired.length, hours: g.plannedHours.join('-'), price: g.priceLevel }; }
  where() { const c = this.game.clock, h = Math.floor(c.hour), m = Math.floor((c.hour - h) * 60); return { day: c.day, clock: `${h}:${String(m).padStart(2, '0')}` }; }
  check({ reportOpen }) {
    const g = this.game, L = this.log, at = this.where();
    if (this.seats == null) this.seats = waitingSeats(g.layout);
    if (g.metrics.arrivals > 0) L.mark('firstArrival', at);
    if (g.served >= 1) L.mark('firstService', at);
    if (g.onboarding.happy) L.mark('firstHappy', at);
    if (waitingSeats(g.layout) > this.seats) L.mark('firstSeat', at);
    if (g.progression.level >= 2) L.mark('level2', at);
    if (g.staff.hired.length >= 1) L.mark('firstHire', at);
    if (reportOpen) L.mark('firstReport', at);
    if (reportOpen && g.report) this.report(g.report.day);
    if (this.step == null) this.step = g.onboarding.step;
    while (this.step < g.onboarding.step) L.step(STEPS[this.step++].id, at);
  }
}
