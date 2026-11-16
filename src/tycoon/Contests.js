import { rand } from '../core/math.js';
import { MONTH_DAYS } from './Calendar.js';
import { hasCert } from '../employees/Career.js';

/**
 * Hair contests: one each month on the first Sunday from the 20th (when the salon is closed anyway), a national
 * championship every third month once the salon is big enough. One stylist (or Lia) enters with a concept;
 * the score comes from their skill, level, certificates and personality, less stress, plus the concept's roll.
 */
export const CATEGORIES = {
  cut: { skills: ['cutting'], cert: 'cut' },
  colour: { skills: ['colouring'], cert: 'colour' },
  perm: { skills: ['perming'], cert: 'perm' },
  bridal: { skills: ['cutting', 'customerService'], cert: 'bridal' },
  trend: { skills: ['cutting', 'colouring', 'perming'], perk: 'trend' },
};
const ORDER = ['cut', 'colour', 'perm', 'trend', 'bridal'];
export const CONTESTS = {
  local: { level: 3, fee: 200, field: 84, spread: 7, prizes: [1000, 500, 250], followers: [500, 250, 100], rep: [4, 2, 1], boost: [1.12, 1.08, 1.04] },
  national: { level: 6, fee: 500, field: 96, spread: 6, prizes: [4000, 2000, 1000], followers: [2000, 1000, 400], rep: [8, 4, 2], boost: [1.2, 1.12, 1.06] },
};
/** Concepts: [lowest, highest] added to the score; bolder ones swing more. */
export const CONCEPTS = { classic: [-3, 3], trendy: [-5, 9], avant: [-14, 22] };
/** What else counts: a matching certificate, the trendsetter talent, personality, stress over 60, the level. */
export const CERT_BONUS = 8, PERK_BONUS = 5, TRAIT_BONUS = { perfectionist: 4, ambitious: 2 }, LEVEL_BONUS = 1.5;
/** A podium lifts demand for this many days; each award also raises the winner's quitting limit (up to three awards). */
export const BOOST_DAYS = 7, AWARD_LOYALTY = 2, AWARD_MAX = 3;
/** Other entrants' first names; the rival's stylists enter too. */
const FIELD = ['Mia', 'Josh', 'Hannah', 'Ravi', 'Lucia', 'Tom', 'Grace', 'Ken', 'Ella', 'Sam'];

/** The month's contest: which kind, which category, the day it is held and the day entries open. */
export function contestFor(month, level) {
  const kind = level >= CONTESTS.national.level && month % 3 === 2 ? 'national' : 'local';
  let day = month * MONTH_DAYS + 20; while (day % 7 !== 0) day++;
  return { month, kind, category: ORDER[month % ORDER.length], day, opens: month * MONTH_DAYS + 10, entrant: null, concept: null, result: null };
}
/** An entrant's score before the concept's roll, and its parts. */
export function baseScore(e, category, isOwner = false) {
  const C = CATEGORIES[category], S = e.effectiveSkills, skill = C.skills.reduce((n, k) => n + S[k], 0) / C.skills.length;
  const parts = { skill: Math.round(skill), level: Math.round(e.level * LEVEL_BONUS), cert: C.cert && hasCert(e, C.cert) ? CERT_BONUS : 0, perk: C.perk && e.hasPerk(C.perk) ? PERK_BONUS : 0, trait: isOwner ? 0 : TRAIT_BONUS[e.trait] || 0, stress: -Math.round(Math.max(0, e.stress - 60) / 4) };
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}
/** Runs the contest: our entrant against five others (one from the rival). Returns the ranking and our place (0-based). */
export function runContest(c, entrant, isOwner, rival, rivalName = id => id, edge = 0) {
  const def = CONTESTS[c.kind], [lo, hi] = CONCEPTS[c.concept] || CONCEPTS.classic;
  const ours = { name: entrant.name, salon: 'Ciel Ground', score: Math.round(baseScore(entrant, c.category, isOwner).total + rand(lo, hi) + edge), ours: true };
  const others = [...FIELD].sort(() => Math.random() - .5).slice(0, 4).map(name => ({ name, score: Math.round(def.field + (Math.random() + Math.random() + Math.random() - 1.5) * def.spread * 1.4) }));
  if (rival && rival.open && rival.stylists.length) others.push({ name: rivalName(rival.stylists[0]), salon: rival.name, rival: true, score: Math.round(def.field + 3 + rival.tier * 3 + (Math.random() - .5) * def.spread * 2) });
  else others.push({ name: FIELD[9], score: Math.round(def.field + (Math.random() - .5) * def.spread * 2) });
  const ranking = [ours, ...others].sort((a, b) => b.score - a.score);
  return { ranking, place: ranking.indexOf(ours) };
}
