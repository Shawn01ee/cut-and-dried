import { FURNITURE, categoryOf } from '../building/FurnitureCatalog.js';

/**
 * Ruby's opening checklist for a new salon: the first few things worth doing, one at a time, each with a small bonus.
 * `tab` is where the step is done, so the HUD can take the player there.
 */
export const STEPS = [
  { id: 'serve', reward: 50 },
  { id: 'happy', reward: 50, need: .8 },
  { id: 'seat', reward: 80, tab: 'build' },
  { id: 'level2', reward: 100, tab: 'prog' },
  { id: 'hire', reward: 150, tab: 'staff' },
];
/** Waiting seats in the salon: benches and sofas. */
const waitingSeats = layout => layout.items.filter(it => categoryOf(it.id) === 'waiting' && FURNITURE[it.id]?.seats).length;

export class Onboarding {
  constructor() { this.step = 0; this.happy = false; this.seats = null; this.version = 0; }
  get done() { return this.step >= STEPS.length; }
  get current() { return STEPS[this.step] || null; }
  /** A finished service: the first really happy client counts. */
  served(satisfaction) { if (satisfaction >= STEPS[1].need) this.happy = true; }
  /** Moves on when the current step is met; pays its bonus and returns it, or null. */
  check(game) {
    if (this.done) return null;
    if (this.seats == null) this.seats = waitingSeats(game.layout);
    const met = { serve: () => game.served >= 1, happy: () => this.happy, seat: () => waitingSeats(game.layout) > this.seats, level2: () => game.progression.level >= 2, hire: () => game.staff.hired.length >= 1 }[this.current.id]();
    if (!met) return null;
    const s = this.current; this.step++; game.economy.earn('onboarding', s.reward); this.version++; return s;
  }
  toJSON() { return { step: this.step, happy: this.happy, seats: this.seats }; }
  /** Older saves past the opening (a stylist hired) start with the checklist done. */
  restore(d, game) { if (d) Object.assign(this, { step: d.step || 0, happy: !!d.happy, seats: d.seats ?? null }); else if (game.staff.hired.length || game.progression.level >= 3) this.step = STEPS.length; this.version++; }
}
