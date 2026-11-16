/**
 * Personalities: each stylist has one, and it does one or two stated things. How two personalities get on decides
 * whether colleagues become friends or rivals (see StaffManager's relationships).
 */
export const TRAITS = {
  // lifts everyone: colleagues at the same salon lose a little stress each day
  cheerful: { teamStress: -1 },
  // takes care: clients a little happier, services a little slower
  perfectionist: { satisfaction: .03, speed: .92 },
  // talks: clients more likely to become regulars, services a touch slower
  chatty: { regular: .1, speed: .96 },
  // wants to rise: learns faster, and frets while a promotion they have earned is held back
  ambitious: { learning: 1.2, waitingStress: 3 },
  // unhurried: less stress from work, a little slower
  easygoing: { stress: .8, speed: .95 },
  // fine eye: better colour, but difficult clients get to them
  sensitive: { colourSatisfaction: .03, villainStress: 1.5 },
  // dependable: tires less with each service
  steady: { tire: .85 },
};
/** Each stylist's personality. */
const TRAIT_OF = {
  daniel: 'perfectionist', somi: 'ambitious', kai: 'steady', soo: 'chatty', sophia: 'easygoing', rosa: 'sensitive', seo: 'perfectionist', ella: 'chatty',
  marco: 'cheerful', yuri: 'steady', ethan: 'ambitious', nina: 'sensitive', leon: 'easygoing', iris: 'ambitious', dylan: 'cheerful', clara: 'chatty',
  ray: 'cheerful', stella: 'steady', ivan: 'easygoing', luna: 'perfectionist', elliot: 'sensitive', owen: 'ambitious', dami: 'cheerful', hyun: 'steady',
  bora: 'chatty', toby: 'ambitious', nari: 'easygoing', joel: 'steady', yeri: 'perfectionist', sena: 'sensitive',
};
const KEYS = Object.keys(TRAITS);
export function traitOf(id) {
  if (TRAIT_OF[id]) return TRAIT_OF[id];
  let h = 3; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return KEYS[h % KEYS.length];
}
/** How well two personalities get on: 1 they click, -1 they grate, 0 neither. */
const LIKES = { 'cheerful|*': 1, 'chatty|chatty': 1, 'easygoing|sensitive': 1, 'ambitious|steady': 1, 'steady|*': .5, 'perfectionist|easygoing': -1, 'chatty|perfectionist': -1, 'ambitious|ambitious': -1, 'chatty|sensitive': -1, 'ambitious|easygoing': -.5 };
export function compatibility(a, b) {
  const [x, y] = [a, b].sort(), pair = LIKES[x + '|' + y];
  if (pair != null) return pair;
  return Math.max(LIKES[x + '|*'] ?? 0, LIKES[y + '|*'] ?? 0);
}
