/** Observes visits without changing them. A client has only one recorded departure or service. */
export class DailyMetrics {
  constructor() { this.startDay(); }
  startDay() { this.arrivals = 0; this.served = 0; this.happy = 0; this.satisfaction = 0; this.lost = { seats: 0, patience: 0, closing: 0 }; this.seen = new WeakSet(); this.finished = new WeakSet(); }
  arrive(customer) { if (this.seen.has(customer)) return; this.seen.add(customer); this.arrivals++; }
  service(customer, result) {
    if (this.finished.has(customer)) return;
    this.finished.add(customer); this.served++; this.satisfaction += result.satisfaction;
    if (result.satisfaction >= .85) this.happy++;
  }
  leave(customer, reason) {
    if (!(reason in this.lost) || this.finished.has(customer)) return;
    this.finished.add(customer); this.lost[reason]++;
  }
  snapshot() { return { arrivals: this.arrivals, served: this.served, happy: this.happy, satisfaction: this.served ? this.satisfaction / this.served : null, lost: { ...this.lost } }; }
}
