import { REFERENCE_MENU } from './ReferenceCuts.js';

/**
 * The salon menu, in the manner of a premium Korean salon in 2026: named cuts, perms and colours, each with its
 * price. A named style is a target the hair rules already know: a cut shape and length range, a wave, a colour.
 * `g` is who asks for it (f, m or any); `trend` marks 2026's trending styles; `advanced` cuts need the chairs unlock;
 * `w` is how popular it is (1 when not given).
 */
export const CUTS = {
  // women
  hush: { g: 'f', shape: 'Hush', L: [22, 38], price: 95, trend: true },
  layered: { g: 'f', shape: 'Layered', L: [26, 50], price: 90 },
  tassel: { g: 'f', shape: 'Blunt', L: [18, 26], price: 85, trend: true },
  bob: { g: 'f', shape: 'Blunt', L: [11, 17], price: 85 },
  pixie: { g: 'f', shape: 'Layered', L: [5, 10], price: 80, w: .5 },
  build: { g: 'f', shape: 'Layered', L: [42, 58], price: 95, w: .8 },
  hime: { g: 'f', shape: 'Hime', L: [30, 55], price: 100, advanced: true, w: .6 },
  aline: { g: 'f', shape: 'A-line', L: [14, 24], price: 90, advanced: true },
  wolf: { g: 'any', shape: 'Wolf', L: [14, 30], price: 95, trend: true, advanced: true },
  // men
  dandy: { g: 'm', shape: 'Dandy', L: [7, 12], price: 60 },
  crop: { g: 'm', shape: 'Crop', L: [4, 8], price: 60, trend: true },
  buzz: { g: 'm', shape: 'Blunt', L: [2, 4], price: 45, trend: true, w: .3 },
  menLong: { g: 'm', shape: 'Layered', L: [16, 26], price: 70, w: .7 },
  twoBlock: { g: 'm', shape: 'Undercut', L: [8, 14], price: 65, advanced: true },
  ivy: { g: 'm', shape: 'Ivy', L: [6, 10], price: 65, advanced: true, w: .7 },
  ...REFERENCE_MENU,
};
/** Perms by the wave they leave; `straighten` ones calm wavy hair down, and `L` is the length they suit. */
export const PERMS = {
  cCurl: { g: 'f', wave: 1, price: 150, L: [12, 40] },
  elizabeth: { g: 'f', wave: 1, price: 180, L: [25, 60], trend: true },
  buildPerm: { g: 'f', wave: 2, price: 190, L: [35, 60], trend: true },
  waterWave: { g: 'f', wave: 2, price: 170, L: [18, 45] },
  hippie: { g: 'any', wave: 3, price: 170, L: [8, 60], w: .6 },
  volumeMagic: { g: 'f', wave: 0, price: 160, straighten: true },
  leaf: { g: 'm', wave: 1, price: 110, L: [5, 16], trend: true },
  parting: { g: 'm', wave: 1, price: 110, L: [6, 16] },
  shadow: { g: 'm', wave: 1, price: 110, L: [8, 26] },
  spinSwallow: { g: 'm', wave: 2, price: 130, L: [5, 16], trend: true },
  grain: { g: 'm', wave: 2, price: 130, L: [4, 14], trend: true },
  down: { g: 'm', wave: 0, price: 70, straighten: true, trend: true },
};
/** The 2026 colours on the colour list (indices into WANT): low-saturation browns and beiges, blue black. */
export const TREND_COLOURS = [16, 17, 18, 19, 20, 21, 22, 23, 24];
/** Colour prices: a full colour, a trend colour, and the surcharge when the colour needs a lift (bleach). */
export const COLOUR_PRICE = 130, TREND_COLOUR_PRICE = 150, BLEACH_PRICE = 50, LIFT = .22;
export const colourPriceFor = (i, target, natural) => (TREND_COLOURS.includes(i) ? TREND_COLOUR_PRICE : COLOUR_PRICE) + (target.L - natural.L > LIFT ? BLEACH_PRICE : 0);

/** What a service costs by who does it: Korean salons price by the designer's grade, the director at the top with the masters. */
export const GRADE_PAY = { junior: .9, designer: 1, senior: 1.1, master: 1.2, deputy: 1.2, owner: 1.2 };
/** This month's trends: asked for more often and paid more; a trendsetter makes them look better. */
export const TREND_WEIGHT = 1.8, TREND_PAY = 1.1, TREND_PERK_SATISFACTION = .04;

const trendIds = (menu, g) => Object.keys(menu).filter(k => menu[k].trend && (menu[k].g === g || menu[k].g === 'any'));
/** The month's trends, the same for everyone in a given month: a cut and a perm for women and for men, and a colour. */
export function trendsFor(month) {
  let s = (month * 7919 + 17) >>> 0; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32, pickR = list => list[Math.floor(r() * list.length)];
  return { cutF: pickR(trendIds(CUTS, 'f')), cutM: pickR(trendIds(CUTS, 'm')), permF: pickR(trendIds(PERMS, 'f')), permM: pickR(trendIds(PERMS, 'm')), colour: pickR(TREND_COLOURS) };
}
/** True when a menu item is one of this month's trends; colours are keyed by their index. */
export const isHot = (trends, id) => !!trends && Object.values(trends).includes(id);
