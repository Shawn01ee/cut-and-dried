/** Overtime pays time and a half. */
export const OVERTIME_RATE = 1.5;

/**
 * Who stayed after closing, and for how long. A stylist stays until their last client is finished; the support staff
 * (desk, assistants, cleaners) stay until the last client leaves. Only those hours are paid at time and a half.
 */
export class OvertimeLog {
  constructor() { this.startDay(); }
  startDay() { this.until = new Map(); }
  /** `id` is still working `after` seconds past closing. */
  busy(id, after) { if (after > (this.until.get(id) || 0)) this.until.set(id, after); }
  /** Hours past closing for one person, given the clock's hour length in seconds. */
  hoursOf(id, hourLength) { return (this.until.get(id) || 0) / hourLength; }
  /** The day's overtime for `people`, each by their own hours: total pay, and who stayed, longest first (hours to 0.1). */
  settle(people, hourLength) {
    const by = people.map(e => ({ e, hours: Math.round(this.hoursOf(e.id, hourLength) * 10) / 10 })).filter(x => x.hours > 0)
      .map(({ e, hours }) => ({ id: e.id, name: e.name, hours, pay: Math.round(e.salary * OVERTIME_RATE * hours / 8) })).sort((a, b) => b.hours - a.hours);
    return { total: by.reduce((n, x) => n + x.pay, 0), by };
  }
}
