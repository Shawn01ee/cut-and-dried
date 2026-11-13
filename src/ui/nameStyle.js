import { hexCss } from '../rendering/color.js';

/** Name colours by grade, so the top stylists stand out: masters in gold, seniors in sky blue. */
export const RANK_COLOURS = { master: '#ffd98a', senior: '#8fd0ff' };
const STYLIST = '#ece8f0', OWNER = '#ff9fc4';

/** A mark written before the name of a master or senior designer. */
export const rankMark = e => e.rank === 'master' ? '★' : e.rank === 'senior' ? '◆' : '';

/**
 * The colour a person's name is written in on the dark panels. Lia is pink and other designers soft white;
 * the support staff keep their apron colour, lightened when it is too dark to read.
 */
export const nameColour = e => {
  if (RANK_COLOURS[e.rank]) return RANK_COLOURS[e.rank];
  if (e.id === 'owner') return OWNER;
  if (/Designer/.test(e.role || '') || e.apron == null) return STYLIST;
  const h = e.apron, r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255;
  if ((.299 * r + .587 * g + .114 * b) / 255 >= .45) return hexCss(h);
  const k = .55, lift = v => Math.round(v + (255 - v) * k);
  return `rgb(${lift(r)},${lift(g)},${lift(b)})`;
};

