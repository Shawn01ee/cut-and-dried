import { clamp } from '../core/math.js';

/** Brand reputation from 0 to 100, shown as one to five stars. */
export class Reputation {
  constructor() { this.value = 0; }
  add(amount) { this.value = clamp(this.value + amount, 0, 100); }
  get stars() { return Math.min(5, Math.floor(this.value / 20) + 1); }
  get starText() { return '★'.repeat(this.stars) + '☆'.repeat(5 - this.stars); }
}
