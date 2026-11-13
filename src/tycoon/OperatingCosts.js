import { FURNITURE } from '../building/FurnitureCatalog.js';

// Daily figures in AUD, roughly in line with a Melbourne shopfront.
const RENT_BY_LEVEL = [0, 160, 190, 240, 310, 390], RENT_PER_EXPANSION = 60;
const UTILITIES_BASE = 25, UTILITIES_PER_CHAIR = 12, MAINTENANCE_RATE = .01;

/** Works out what it costs to keep the salon open and charges it as the day goes by. */
export class OperatingCosts {
  #charged = {}; #rent = 0;
  constructor(economy, staff, layout, progression) { Object.assign(this, { economy, staff, layout, progression }); }

  /** Full-day cost of each category at the salon's current size. */
  get breakdown() {
    const furnitureValue = this.layout.items.reduce((sum, it) => sum + FURNITURE[it.id].price, 0);
    return {
      rent: this.#rent,
      wages: this.staff.payroll,
      utilities: UTILITIES_BASE + UTILITIES_PER_CHAIR * this.layout.chairs,
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
