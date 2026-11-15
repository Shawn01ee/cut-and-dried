import { pick, rand } from '../core/math.js';

/**
 * Special clients book ahead for an hour of the day at the main salon. Each has a satisfaction they must reach;
 * meeting it pays a fee on top of the service and brings followers and reputation, missing it costs reputation.
 */
export const SPECIALS = {
  anchor: { level: 3, need: .85, reward: 600, followers: 200, rep: 4 },
  bride: { level: 3, need: .9, reward: 1500, followers: 400, rep: 6 },
  shoot: { level: 4, need: .85, reward: 900, followers: 1200, rep: 3 },
  celebrity: { level: 6, need: .88, reward: 1200, followers: 3000, rep: 5 },
};
/** The chance an open day has a booking, from level 3. */
export const SPECIAL_CHANCE = .22;
export const SPECIAL_LEVEL = 3;
export const SPECIAL_FAIL_REP = -4;
/** They pay a premium for the booking and wait longer than a walk-in. */
export const SPECIAL_PRICE = 2, SPECIAL_PATIENCE = 1.6;

/** Today's booking, if any: who, at what hour and what is at stake. */
export function rollSpecial(level, openHour, closeHour) {
  if (level < SPECIAL_LEVEL || Math.random() >= SPECIAL_CHANCE) return null;
  const kind = pick(Object.keys(SPECIALS).filter(k => SPECIALS[k].level <= level));
  const last = Math.max(openHour + 1, closeHour - 3), hour = Math.round(rand(openHour + 1, last));
  return { kind, hour, state: 'due', ...SPECIALS[kind] };
}
