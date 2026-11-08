/** The player designing one client's look: tracks the turn angle and the before/after toggle. */
export class StylingSession {
  constructor(station, customer) { this.station = station; this.customer = customer; this.view = 0; this.showCurrent = false; }
  turn(direction) { this.view += direction; }
  targetYaw(baseYaw) { return baseYaw + this.view * Math.PI / 2; }
  toggleCompare() { this.showCurrent = !this.showCurrent; }
}
