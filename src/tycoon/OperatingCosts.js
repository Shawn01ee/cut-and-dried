import { FURNITURE } from '../building/FurnitureCatalog.js';

// Daily figures in AUD, roughly in line with a Melbourne shopfront.
const RENT_BY_LEVEL = [0, 160, 190, 240, 310, 390], RENT_PER_EXPANSION = 60;
const UTILITIES_BASE = 25, UTILITIES_PER_CHAIR = 12, MAINTENANCE_RATE = .01;

/** Works out what it costs to keep the salon open and charges it as the day goes by. */
export class OperatingCosts {
  #charged = {}; #rent = 0;
  constructor(economy, staff, layout, progression, clock) { Object.assign(this, { economy, staff, layout, progression, clock }); }

  /** Full-day cost of each category at the salon's current size. */
  get breakdown() {
    const h = this.clock.hours, furnitureValue = this.layout.items.reduce((sum, it) => sum + FURNITURE[it.id].price, 0);
    return {
      rent: this.#rent,
      // Wages are paid by the hour, with time and a half past eight hours.
      wages: Math.round(this.staff.payroll * (Math.min(8, h) + Math.max(0, h - 8) * 1.5) / 8),
      utilities: Math.round((UTILITIES_BASE + UTILITIES_PER_CHAIR * this.layout.chairs) * h / 8),
      maintenance: Math.round(furnitureValue * MAINTENANCE_RATE),
    };
  }
  /** Rent is set each morning, so a level-up or expansion only raises it from the next day. */
  startDay() { this.#charged = {}; this.#rent = RENT_BY_LEVEL[this.progression.level] + RENT_PER_EXPANSION * this.layout.tier; }
  /** Charges whatever is due for the share of the day worked. Safe to call repeatedly. */
  accrue(fraction) {
    for (const [category, daily] of Object.entries(this.breakdown)) {
      const due = Math.round(daily * fraction) - (this.#charged[category] || 0);
      if (due > 0) { this.economy.charge(category, due); this.#charged[category] = (this.#charged[category] || 0) + due; }
    }
  }
}
