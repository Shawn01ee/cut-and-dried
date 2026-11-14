// A 5×7 block font for the shop signs, so the letters stay crisp after the pixel-art filter.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
};

/** Draws text centred at (cx, cy) with each font pixel `scale` canvas pixels wide. */
export function drawPixelText(g, text, cx, cy, scale, color) {
  const advance = 6 * scale, width = text.length * advance - scale;
  let x = Math.round(cx - width / 2); const y = Math.round(cy - 3.5 * scale);
  g.fillStyle = color;
  for (const ch of text.toUpperCase()) {
    (GLYPHS[ch] || []).forEach((row, r) => [...row].forEach((p, c) => { if (p === '#') g.fillRect(x + c * scale, y + r * scale, scale, scale); }));
    x += advance;
  }
}

/** A dark shop sign with a neon trim and the name in block letters. */
export function paintSign(g, w, h, text) {
  // White sign with black lettering, like the shop front.
  g.fillStyle = '#f6f3ee'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#9c98a2'; g.fillRect(0, h - 1, w, 1);
  drawPixelText(g, text, w / 2, h / 2, 2, '#1d1a26');
}
