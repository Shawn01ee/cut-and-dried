/**
 * Pixel-art head-and-shoulders portraits for the staff cards, drawn on a 16×16 grid from how each person
 * looks in the salon: hairdo, hair and skin colour, beard, sunglasses and apron. Cached as data URLs.
 */
const SIZE = 16, cache = new Map();
const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
/** Scales a colour's brightness, for shading. */
function shade(n, k) {
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
const INK = '#1d1a26', BLUSH = '#e88a8a', GLINT = '#8a8494';

/** Hair pixels for each hairdo, as [y, x0, x1] runs drawn in the hair colour. */
const HAIR = {
  short: [[2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 3, 4], [5, 11, 12], [6, 3, 3], [6, 12, 12]],
  buzz: [[3, 5, 10], [4, 4, 11], [5, 4, 4], [5, 11, 11]],
  bob: [[2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 3, 12], [6, 3, 4], [6, 11, 12], [7, 3, 4], [7, 11, 12], [8, 3, 3], [8, 12, 12], [9, 3, 3], [9, 12, 12], [10, 3, 4], [10, 11, 12]],
  long: [[2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 3, 5], [5, 10, 12], [6, 2, 4], [6, 11, 13], [7, 2, 3], [7, 12, 13], [8, 2, 3], [8, 12, 13], [9, 2, 3], [9, 12, 13], [10, 2, 3], [10, 12, 13], [11, 2, 3], [11, 12, 13], [12, 2, 4], [12, 11, 13], [13, 2, 3], [13, 12, 13]],
  bun: [[0, 6, 9], [1, 6, 9], [2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 3, 4], [5, 11, 12], [6, 3, 3], [6, 12, 12]],
  curly: [[1, 5, 10], [2, 3, 12], [3, 2, 13], [4, 2, 13], [5, 2, 4], [5, 11, 13], [6, 2, 3], [6, 12, 13], [7, 2, 3], [7, 12, 13], [8, 2, 2], [8, 13, 13]],
};

function draw(e) {
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
  const g = cv.getContext('2d'), px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); }, run = (y, a, b, c) => { g.fillStyle = c; g.fillRect(a, y, b - a + 1, 1); };
  const skinN = e.skin ?? 0xf6d6bd, skin = hex(skinN), skinDk = shade(skinN, .8), hairN = e.hair ?? 0x2e1d14, hair = hex(hairN), hairDk = shade(hairN, .7), hairLt = shade(hairN, 1.35);
  const apronN = e.apron ?? 0x45404f, apron = hex(apronN), apronDk = shade(apronN, .72), hairdo = HAIR[e.hairdo] ? e.hairdo : 'short';
  // shoulders and apron, neck, ears, face
  run(15, 1, 14, apron); run(14, 2, 13, apron); run(13, 3, 5, apron); run(13, 10, 12, apron); run(14, 6, 9, apronDk);
  run(13, 6, 9, skinDk); run(12, 6, 9, skin);
  px(3, 8, skinDk); px(3, 9, skinDk); px(12, 8, skinDk); px(12, 9, skinDk);
  for (let y = 5; y <= 11; y++) run(y, y === 11 ? 5 : 4, y === 11 ? 10 : 11, skin);
  // face: brows, eyes, blush, mouth
  if (e.shades) { run(8, 5, 10, INK); px(6, 8, GLINT); px(9, 8, GLINT); }
  else { px(5, 7, hairDk); px(6, 7, hairDk); px(9, 7, hairDk); px(10, 7, hairDk); px(6, 8, INK); px(9, 8, INK); }
  if (e.gender === 'f' && !e.shades) { px(5, 9, BLUSH); px(10, 9, BLUSH); }
  run(10, 7, 8, shade(skinN, .62));
  if (e.beard) { px(4, 9, hair); px(11, 9, hair); run(10, 4, 6, hair); run(10, 9, 11, hair); run(11, 5, 10, hair); run(12, 6, 9, hair); run(10, 7, 8, shade(skinN, .62)); }
  // hair, with a darker underside and a highlight so it reads as volume
  for (const [y, a, b] of HAIR[hairdo]) run(y, a, b, hair);
  for (const [y, a, b] of HAIR[hairdo]) if (y >= 5) { px(a, y, hairDk); px(b, y, hairDk); }
  if (hairdo === 'curly') for (const [y, a, b] of HAIR.curly) for (let x = a; x <= b; x++) if ((x + y) % 3 === 0) px(x, y, hairDk);
  if (hairdo !== 'buzz') { px(6, hairdo === 'bun' ? 0 : hairdo === 'curly' ? 1 : 2, hairLt); px(7, hairdo === 'curly' ? 2 : 3, hairLt); }
  else run(3, 6, 8, hairLt);
  if (hairdo === 'bob' || hairdo === 'long') run(5, 5, 10, hair);
  return cv.toDataURL();
}

/** The portrait's image URL for anyone with a look; redrawn only when that look changes. */
export function portraitURL(e) {
  const key = [e.id, e.hairdo, e.hair, e.skin, e.apron, e.beard, e.shades, e.gender].join('|');
  if (!cache.has(key)) cache.set(key, draw(e));
  return cache.get(key);
}
