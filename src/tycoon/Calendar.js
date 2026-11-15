import { pick } from '../core/math.js';

/**
 * The salon's calendar and the things that happen on it. A month is thirty game days (the same as the monthly
 * settlement) and the first month is March, early autumn in Melbourne.
 *
 * Every effect is a multiplier on: `demand` (clients), `colour` and `perm` (how many clients want them), `pay` (what they
 * pay), `budget` (what they can spend), `patience`, `speed` (every service), `wash`, `dry` and `materials`.
 * `cut` and `cutPay` apply to clients who only want a cut.
 */
export const MONTH_DAYS = 30;
const FIRST_MONTH = 3;

/** The calendar date of a game day: month 1-12, date 1-30 and the salon's year. */
export function dateOf(day) {
  const m = Math.floor((day - 1) / MONTH_DAYS) + FIRST_MONTH - 1;
  return { month: (m % 12) + 1, date: ((day - 1) % MONTH_DAYS) + 1, year: Math.floor(m / 12) + 1 };
}
const SEASON_OF = { 12: 'summer', 1: 'summer', 2: 'summer', 3: 'autumn', 4: 'autumn', 5: 'autumn', 6: 'winter', 7: 'winter', 8: 'winter', 9: 'spring', 10: 'spring', 11: 'spring' };
export const seasonOf = day => SEASON_OF[dateOf(day).month];

/** Southern-hemisphere seasons: bright colours and short cuts in summer, perms in autumn, quieter winters. */
export const SEASONS = {
  summer: { demand: 1.05, colour: 1.15, perm: .85 },
  autumn: { perm: 1.25 },
  winter: { demand: .9, colour: 1.1 },
  spring: { demand: 1.05, perm: 1.05 },
};

/** Events fixed to the calendar: [month, first date, last date]. */
export const EVENTS = [
  { id: 'semester', month: 3, from: 1, to: 7, demand: 1.1, budget: .9 },
  { id: 'mothers', month: 5, from: 8, to: 14, colour: 1.3, pay: 1.1 },
  { id: 'footy', month: 9, from: 24, to: 30, demand: .85 },
  { id: 'cup', month: 11, from: 1, to: 7, demand: 1.25, pay: 1.15 },
  { id: 'formal', month: 12, from: 1, to: 9, demand: 1.15, pay: 1.05 },
  { id: 'xmas', month: 12, from: 10, to: 24, demand: 1.3, colour: 1.2 },
  { id: 'newyear', month: 1, from: 1, to: 7, demand: 1.1, colour: 1.25 },
  { id: 'valentine', month: 2, from: 8, to: 14, demand: 1.15, pay: 1.05 },
];
export const eventsOn = day => { const d = dateOf(day); return EVENTS.filter(e => e.month === d.month && d.date >= e.from && d.date <= e.to); };
/** The next calendar event after `day`, and how many days away it starts. */
export function nextEvent(day) {
  for (let ahead = 1; ahead <= 365; ahead++) { const e = eventsOn(day + ahead).find(x => !eventsOn(day).includes(x)); if (e) return { event: e, in: ahead }; }
  return null;
}

/**
 * Things that can happen on an ordinary day. Some can be fixed by paying `fix` (otherwise `effect` applies today),
 * some are opportunities (`offer`: pay `cost` for `gain`), some just happen, and the inspection is judged on the spot.
 */
export const HAPPENINGS = [
  { id: 'outage', weight: 1, fix: 300, effect: { speed: .8 } },
  { id: 'leak', weight: 1, fix: 250, effect: { wash: .7 } },
  { id: 'shortage', weight: 1, fix: 400, effect: { materials: 2 } },
  { id: 'dryer', weight: .8, fix: 150, effect: { dry: .7 } },
  { id: 'trend', weight: 1.2, effect: { cut: 1.3, cutPay: 1.15 }, days: 3 },
  { id: 'rain', weight: 1.2, effect: { demand: .8, patience: 1.1 } },
  { id: 'festival', weight: 1, effect: { demand: 1.2 }, offer: { cost: 200, followers: 500 } },
  { id: 'inspection', weight: .8, inspection: true },
];
/** The chance an ordinary open day has something happen. */
export const HAPPENING_CHANCE = .33;
export function rollHappening() {
  if (Math.random() >= HAPPENING_CHANCE) return null;
  const total = HAPPENINGS.reduce((n, h) => n + h.weight, 0);
  let r = Math.random() * total;
  return HAPPENINGS.find(h => (r -= h.weight) < 0) || pick(HAPPENINGS);
}

/** Multiplies effect sets together, key by key. */
export function combine(...sets) {
  const out = {};
  for (const s of sets) if (s) for (const [k, v] of Object.entries(s)) if (typeof v === 'number' && !['month', 'from', 'to', 'weight', 'days', 'fix'].includes(k)) out[k] = (out[k] ?? 1) * v;
  return out;
}
