/** Salon opening hours. One working day lasts `dayLength` simulated seconds. */
export class GameClock {
  constructor(bus, { dayLength = 150, openHour = 10, closeHour = 18 } = {}) {
    Object.assign(this, { bus, dayLength, openHour, closeHour });
    this.day = 1; this.elapsed = 0; this.isOpen = false;
  }
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
