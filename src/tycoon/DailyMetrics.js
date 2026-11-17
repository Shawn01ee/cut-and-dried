/** Observes visits without changing them. A client has only one recorded departure or service. */
export class DailyMetrics {
  constructor() { this.startDay(); }
  startDay() { this.arrivals = 0; this.served = 0; this.happy = 0; this.satisfaction = 0; this.lost = { seats: 0, patience: 0, closing: 0 }; this.waits = { booth: 0 }; this.referred = { branch: 0, outlet: 0 }; this.seen = new WeakSet(); this.finished = new WeakSet(); }
  arrive(customer) { if (this.seen.has(customer)) return; this.seen.add(customer); this.arrivals++; }
  service(customer, result) {
    if (this.finished.has(customer)) return;
    this.finished.add(customer); this.served++; this.satisfaction += result.satisfaction;
    if (result.satisfaction >= .85) this.happy++;
  }
  /** A free chair sat idle `hours` (game hours) for `kind`: 'booth' while every shampoo booth was taken and clients waited. */
  wait(kind, hours) { this.waits[kind] = (this.waits[kind] || 0) + hours; }
  /** A walk-in our desk could not fit sent to the other salon ('branch') or a franchise ('outlet'). */
  refer(kind) { this.referred[kind]++; }
  leave(customer, reason) {
    if (!(reason in this.lost) || this.finished.has(customer)) return;
    this.finished.add(customer); this.lost[reason]++;
  }
  snapshot() { return { arrivals: this.arrivals, served: this.served, happy: this.happy, satisfaction: this.served ? this.satisfaction / this.served : null, lost: { ...this.lost }, waits: { ...this.waits }, referred: { ...this.referred } }; }
}
