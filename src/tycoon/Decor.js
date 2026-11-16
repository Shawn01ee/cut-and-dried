import { dateOf, seasonOf } from './Calendar.js';

/**
 * How the salon is dressed for the time of year: a theme for each occasion as it comes round (from a few days
 * before it), and the season's look in between. Dates are [month, date] on the game calendar (30-day months).
 */
export const DECOR_EVENTS = [
  { id: 'xmas', from: [12, 1], to: [12, 26] },
  { id: 'newyear', from: [12, 27], to: [1, 7] },
  { id: 'seollal', from: [1, 20], to: [1, 30] },
  { id: 'valentine', from: [2, 1], to: [2, 14] },
  { id: 'mothers', from: [5, 1], to: [5, 14] },
  { id: 'chuseok', from: [9, 8], to: [9, 18] },
  { id: 'footy', from: [9, 20], to: [9, 30] },
  { id: 'halloween', from: [10, 18], to: [10, 30] },
  { id: 'cup', from: [11, 1], to: [11, 7] },
];
const ord = ([m, d]) => m * 31 + d;
/** The theme for a game day: an occasion when one is near, otherwise the season. */
export function decorThemeOf(day) {
  const d = dateOf(day), o = ord([d.month, d.date]);
  const e = DECOR_EVENTS.find(x => { const a = ord(x.from), b = ord(x.to); return a <= b ? o >= a && o <= b : o >= a || o <= b; });
  return e ? e.id : seasonOf(day);
}
