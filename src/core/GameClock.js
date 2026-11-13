/** Salon opening hours. One working day lasts `dayLength` simulated seconds. */
export class GameClock {
  constructor(bus, { hourLength = 150 / 8, openHour = 10, closeHour = 18 } = {}) {
    Object.assign(this, { bus, hourLength });
    this.day = 1; this.elapsed = 0; this.isOpen = false;
    this.setHours(openHour, closeHour);
  }
  /** Opening hours; every hour lasts the same simulated time, so a longer day takes longer to play. */
  setHours(openHour, closeHour) { Object.assign(this, { openHour, closeHour, dayLength: this.hourLength * (closeHour - openHour) }); }
  get hours() { return this.closeHour - this.openHour; }
  startDay() { this.elapsed = 0; this.isOpen = true; }
  nextDay() { this.day++; this.startDay(); }
  tick(dt) {
    if (!this.isOpen) return;
    this.elapsed += dt;
    if (this.elapsed >= this.dayLength) { this.elapsed = this.dayLength; this.isOpen = false; this.bus.emit('day:closed'); }
  }
  get hour() { return this.openHour + (this.elapsed / this.dayLength) * (this.closeHour - this.openHour); }
  /** Share of the working day completed, counted in whole hours. */
  get workedFraction() { const hours = this.closeHour - this.openHour; return Math.floor(this.elapsed / this.dayLength * hours) / hours; }
  get timeText() { const h = this.hour; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 6) * 10).padStart(2, '0')}`; }
}
