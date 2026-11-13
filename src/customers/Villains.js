import { pick } from '../core/math.js';

/**
 * Difficult clients, rolled per arrival from the salon level they start appearing at.
 * `penalty` is how much harder they are to please, before any nitpicking.
 */
export const VILLAINS = [
  { id: 'complainer', level: 1, chance: .06, penalty: .1 },
  { id: 'haggler', level: 2, chance: .05, penalty: .04 },
  { id: 'dasher', level: 2, chance: .03, penalty: .03 },
];

export const villainPenalty = id => VILLAINS.find(v => v.id === id)?.penalty ?? 0;

export function rollVillain(level) {
  let roll = Math.random();
  for (const v of VILLAINS) {
    if (level < v.level) continue;
    if (roll < v.chance) return v.id;
    roll -= v.chance;
  }
  return null;
}

/**
 * Something about the visit a difficult client will complain about, however good the hair is.
 * A real weakness costs more satisfaction than an invented one.
 */
export function findNitpick({ treated, comfort, wait, priceFit, quality }) {
  const weak = [treated < 3 && 'drinks', comfort < 14 && 'comfort', wait < .6 && 'wait', priceFit < .95 && 'price', quality < .8 && 'attitude'].filter(Boolean);
  if (weak.length) return { key: pick(weak), penalty: .08 };
  return { key: pick(['music', 'smell', 'parking']), penalty: .04 };
}
