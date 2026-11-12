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
  g.fillStyle = '#1d1a26'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e25c8f'; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, h - 3, w - 4, 1);
  drawPixelText(g, text, w / 2, h / 2, 2, '#ffd98a');
}
