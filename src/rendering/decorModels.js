/**
 * Decorations for each theme, drawn with the same box builder as the furniture.
 * `garland(g, fx, L)` hangs along a wall top, local x from -L/2 to L/2 at y 0; `sticker(g, fx)` sits on a window;
 * `prop(g, fx, side)` stands outside beside the door (side 0 on the left, 1 on the right). `fx.light(c, w, h, d, x, y, z)`
 * is a small lit piece in colour `c`.
 */
const sag = (x, span = 1.2) => -.1 * Math.sin(Math.PI * (((x % span) + span) % span) / span);
/** A sagging string along the wall with `item(x, y, i)` hung every `step`. */
function string(g, L, colour, step, item, thick = .025) {
  let i = 0;
  for (let x = -L / 2 + step / 2; x < L / 2; x += step, i++) { const y = sag(x + L / 2); g.box(step * 1.02, thick, thick, colour, x, y, 0); if (item) item(x, y, i); }
}
const pick = (list, i) => list[i % list.length];

// outdoor props
const pot = (g, c = 0x8a6040) => g.box(.36, .3, .36, c, 0, .15, 0).box(.4, .05, .4, 0x3a2618, 0, .31, 0);
function tree(g, fx) {
  pot(g, 0xd8314a);
  [[.86, .5], [.68, .82], [.5, 1.1], [.3, 1.36]].forEach(([w, y]) => g.box(w, .3, w, 0x2d6a3a, 0, y, 0));
  [[.3, .55, .44, 0xd8314a], [-.32, .62, .4, 0xffd98a], [.22, .9, .35, 0x7fb6f0], [-.2, 1.12, .27, 0xd8314a], [.12, 1.3, .17, 0xffd98a]].forEach(([x, y, z, c]) => fx.light(c, .07, .07, .07, x, y, z));
  fx.light(0xffd98a, .14, .14, .06, 0, 1.6, 0);
}
function gifts(g) {
  [[0, .14, 0, .34, .28, 0xd8314a, 0xffd98a], [.22, .1, .18, .24, .2, 0x2d6a3a, 0xd8314a], [-.18, .09, .2, .2, .18, 0xffd98a, 0x2a4478], [.04, .38, .02, .22, .2, 0x2a4478, 0xffd98a]]
    .forEach(([x, y, z, w, h, c, r]) => g.box(w, h, w, c, x, y, z).box(w + .01, h + .01, .04, r, x, y, z).box(.04, h + .01, w + .01, r, x, y, z));
}
function balloons(g, colours) {
  g.box(.24, .05, .24, 0x45404f, 0, .025, 0);
  [[-.16, 1.25, 0], [.14, 1.35, .05], [0, 1.55, -.08], [.2, 1.6, .1], [-.18, 1.62, .08]].forEach(([x, y, z], i) => g.box(.01, y - .1, .01, 0xdcd9dc, x / 2, (y - .1) / 2, z / 2).box(.22, .26, .22, pick(colours, i), x, y, z));
}
function lanternStand(g, fx, c = 0xd8314a) {
  g.box(.3, .05, .3, 0x3a2618, 0, .025, 0).box(.05, 1.5, .05, 0x3a2618, 0, .76, 0).box(.4, .04, .04, 0x3a2618, .16, 1.5, 0);
  g.box(.02, .14, .02, 0xffd98a, .32, 1.41, 0).box(.26, .32, .26, c, .32, 1.18, 0).box(.28, .04, .28, 0xffd98a, .32, 1.35, 0).box(.28, .04, .28, 0xffd98a, .32, 1.01, 0).box(.03, .14, .03, 0xffd98a, .32, .92, 0);
  fx.light(0xffb15a, .2, .24, .2, .32, 1.18, 0);
}
function planter(g, flowers, stem = 0x3f6a3a) {
  g.box(.6, .34, .32, 0xf6f3ee, 0, .17, 0).box(.64, .04, .36, 0xbdb9c0, 0, .35, 0);
  for (let i = 0; i < 7; i++) { const x = -.24 + i * .08, z = i % 2 ? .06 : -.06, h = .18 + (i % 3) * .05; g.box(.02, h, .02, stem, x, .37 + h / 2, z).box(.08, .08, .08, pick(flowers, i), x, .41 + h, z); }
}
function pumpkins(g, fx) {
  [[0, .16, 0, .38], [.26, .12, .16, .26], [-.22, .11, .18, .22]].forEach(([x, y, z, s]) => {
    g.box(s, s * .82, s, 0xe8742a, x, y, z).box(.04, .08, .04, 0x3f6a3a, x, y + s * .5, z).box(s * .2, s * .14, .02, 0x1d1a26, x - s * .18, y + s * .1, z + s / 2).box(s * .2, s * .14, .02, 0x1d1a26, x + s * .18, y + s * .1, z + s / 2).box(s * .5, s * .1, .02, 0x1d1a26, x, y - s * .15, z + s / 2);
    fx.light(0xffb15a, s * .5, s * .3, .01, x, y, z + s / 2 + .005);
  });
}
function sunflowers(g) {
  pot(g);
  [[-.08, 1.1, 0], [.1, .9, .06], [0, 1.25, -.06]].forEach(([x, h, z]) => g.box(.03, h - .3, .03, 0x3f6a3a, x, .3 + (h - .3) / 2, z).box(.24, .24, .05, 0xffd23a, x, h, z + .03).box(.12, .12, .06, 0x5e3d24, x, h, z + .04).box(.12, .05, .06, 0x5f9e45, x + .08, h * .6, z));
}
function leafBasket(g) {
  g.box(.5, .24, .34, 0x8a6040, 0, .12, 0).box(.54, .04, .38, 0x5e3d24, 0, .24, 0);
  for (let i = 0; i < 9; i++) g.box(.09, .02, .07, pick([0xe8742a, 0xd8314a, 0xffd23a, 0xb55a2a], i), -.2 + (i % 5) * .1, .27 + (i % 2) * .02, -.1 + Math.floor(i / 5) * .14);
  g.box(.2, .17, .2, 0xe8742a, .36, .09, .08).box(.03, .06, .03, 0x3f6a3a, .36, .2, .08);
}
function moon(g, fx) {
  g.box(.3, .05, .3, 0x3a2618, 0, .025, 0).box(.05, 1.1, .05, 0x3a2618, 0, .57, 0);
  g.box(.5, .4, .1, 0xfff1c4, 0, 1.3, 0).box(.4, .5, .1, 0xfff1c4, 0, 1.3, 0); fx.light(0xfff1c4, .36, .36, .02, 0, 1.3, .06);
}
function persimmons(g) { g.box(.5, .16, .36, 0x8a6040, 0, .08, 0); for (let i = 0; i < 6; i++) g.box(.11, .1, .11, 0xe8742a, -.16 + (i % 3) * .16, .2 + Math.floor(i / 3) * .08, -.06 + (i % 2) * .1); }
function flagPole(g, colours) { g.box(.26, .05, .26, 0x45404f, 0, .025, 0).box(.04, 1.7, .04, 0xbdb9c0, 0, .87, 0); colours.forEach((c, i) => g.box(.5, .12, .02, c, .27, 1.6 - i * .12, 0)); }
function footyBall(g) { g.box(.3, .05, .3, 0x45404f, 0, .025, 0).box(.06, .6, .06, 0xbdb9c0, 0, .32, 0).box(.2, .28, .2, 0x8a3a1e, 0, .74, 0).box(.14, .34, .14, 0x8a3a1e, 0, .74, 0).box(.02, .2, .21, 0xf6f3ee, 0, .74, 0); }
function warmLantern(g, fx) { g.box(.3, .05, .3, 0x1d1a26, 0, .025, 0).box(.26, .4, .26, 0x1d1a26, 0, .25, 0).box(.2, .3, .2, 0xfff1c4, 0, .25, 0).box(.3, .04, .3, 0x1d1a26, 0, .47, 0).box(.06, .08, .06, 0x1d1a26, 0, .53, 0); fx.light(0xffb15a, .1, .16, .1, 0, .22, 0); }
function pinePot(g) { pot(g, 0x45404f); [[0, .5, .5], [0, .75, .36], [0, .95, .2]].forEach(([x, y, w]) => g.box(w, .22, w, 0x2d6a3a, x, y, 0)); g.box(.06, .06, .06, 0xf6f3ee, .12, .6, .2).box(.06, .06, .06, 0xf6f3ee, -.1, .82, .14); }
function tulips(g) { planter(g, [0xe25c8f, 0xffd23a, 0xd8314a, 0xf6f3ee]); }
function heartBalloons(g) { balloons(g, [0xd8314a, 0xe25c8f, 0xf6f3ee]); }

/** Garland items. */
const bulb = (fx, colours) => (x, y, i) => fx.light(pick(colours, i), .06, .07, .06, x, y - .06, 0);
function heart(g, x, y, c) { g.box(.06, .06, .03, c, x - .03, y, 0).box(.06, .06, .03, c, x + .03, y, 0).box(.06, .06, .03, c, x, y - .045, 0).box(.03, .03, .03, c, x, y - .08, 0); }
function flag(g, x, y, c) { g.box(.18, .05, .02, c, x, y - .04, 0).box(.12, .05, .02, c, x, y - .09, 0).box(.06, .05, .02, c, x, y - .14, 0); }
function leaf(g, x, y, c) { g.box(.1, .07, .02, c, x, y - .05, 0).box(.04, .04, .02, c, x + .05, y - .09, 0); }
function flower(g, x, y, c) { g.box(.02, .06, .02, 0x3f6a3a, x, y - .04, 0).box(.08, .08, .04, c, x, y - .1, 0).box(.03, .03, .05, 0xffd98a, x, y - .1, 0); }

export const DECOR_MODELS = {
  xmas: {
    garland: (g, fx, L) => { string(g, L, 0x2d6a3a, .2, null, .07); string(g, L, 0x2d6a3a, .3, bulb(fx, [0xd8314a, 0xffd98a, 0xf6f3ee, 0x7fb6f0]), .01); for (let x = -L / 2 + .9; x < L / 2; x += 1.8) g.box(.14, .1, .05, 0xd8314a, x, .04, .03).box(.04, .14, .04, 0xd8314a, x - .04, -.06, .03).box(.04, .14, .04, 0xd8314a, x + .04, -.06, .03); },
    sticker: g => g.box(.24, .03, .01, 0xf6f3ee, 0, 0, 0).box(.03, .24, .01, 0xf6f3ee, 0, 0, 0).box(.16, .03, .01, 0xf6f3ee, 0, 0, 0).box(.06, .06, .01, 0xf6f3ee, 0, 0, 0),
    prop: (g, fx, side) => side ? gifts(g) : tree(g, fx),
  },
  newyear: {
    garland: (g, fx, L) => { string(g, L, 0xffd98a, .25, (x, y, i) => { if (i % 2) g.box(.03, .2, .02, pick([0xffd98a, 0xdcd9dc], i >> 1), x, y - .1, 0); else fx.light(0xfff1c4, .06, .06, .06, x, y - .05, 0); }); },
    prop: g => balloons(g, [0xffd98a, 0xf6f3ee, 0x2a4478, 0xdcd9dc]),
  },
  seollal: {
    garland: (g, fx, L) => { string(g, L, 0xd8314a, .25, (x, y, i) => { if (i % 4 === 0) { g.box(.16, .2, .16, 0xd8314a, x, y - .16, 0).box(.18, .03, .18, 0xffd98a, x, y - .05, 0).box(.18, .03, .18, 0xffd98a, x, y - .27, 0).box(.03, .1, .03, 0xffd98a, x, y - .33, 0); fx.light(0xffb15a, .12, .14, .12, x, y - .16, 0); } }); },
    prop: (g, fx, side) => side ? (g.box(.34, .3, .26, 0xe25c8f, 0, .15, 0).box(.2, .1, .16, 0xe25c8f, 0, .34, 0).box(.24, .04, .2, 0xffd98a, 0, .29, 0).box(.12, .1, .02, 0xffd98a, 0, .15, .14)) : lanternStand(g, fx),
  },
  valentine: {
    garland: (g, fx, L) => string(g, L, 0xe25c8f, .45, (x, y, i) => heart(g, x, y - .06, pick([0xd8314a, 0xe25c8f, 0xf6f3ee], i))),
    sticker: g => heart(g, 0, 0, 0xe25c8f),
    prop: (g, fx, side) => side ? planter(g, [0xd8314a, 0xe25c8f]) : heartBalloons(g),
  },
  mothers: {
    garland: (g, fx, L) => string(g, L, 0x3f6a3a, .35, (x, y, i) => flower(g, x, y, pick([0xd8314a, 0xe25c8f, 0xf6f3ee], i))),
    prop: g => planter(g, [0xd8314a, 0xe25c8f, 0xd8314a, 0xf6f3ee]),
  },
  chuseok: {
    garland: (g, fx, L) => string(g, L, 0x8a6040, .5, (x, y, i) => { g.box(.14, .14, .14, pick([0xffb15a, 0xffd98a], i), x, y - .12, 0); fx.light(0xffb15a, .1, .1, .1, x, y - .12, 0); }),
    prop: (g, fx, side) => side ? persimmons(g) : moon(g, fx),
  },
  footy: {
    garland: (g, fx, L) => string(g, L, 0xf6f3ee, .28, (x, y, i) => flag(g, x, y, pick([0x2a4478, 0xf6f3ee, 0xffd23a, 0xd8314a], i))),
    prop: (g, fx, side) => side ? footyBall(g) : flagPole(g, [0x2a4478, 0xffd23a, 0x2a4478]),
  },
  halloween: {
    garland: (g, fx, L) => string(g, L, 0x1d1a26, .3, (x, y, i) => { if (i % 3 === 2) g.box(.05, .05, .03, 0x1d1a26, x, y - .08, 0).box(.16, .03, .02, 0x1d1a26, x, y - .07, 0); else fx.light(pick([0xe8742a, 0x8a4fc2], i), .06, .07, .06, x, y - .06, 0); }),
    sticker: g => g.box(.08, .06, .01, 0x1d1a26, 0, 0, 0).box(.26, .04, .01, 0x1d1a26, 0, .02, 0).box(.06, .04, .01, 0x1d1a26, -.1, .05, 0).box(.06, .04, .01, 0x1d1a26, .1, .05, 0),
    prop: (g, fx) => pumpkins(g, fx),
  },
  cup: {
    garland: (g, fx, L) => string(g, L, 0xf6f3ee, .3, (x, y, i) => i % 2 ? flower(g, x, y, pick([0xd8314a, 0xffd23a], i >> 1)) : flag(g, x, y, pick([0x2d6a3a, 0xffd98a], i >> 1))),
    prop: g => planter(g, [0xd8314a, 0xffd23a, 0xd8314a, 0xf6f3ee]),
  },
  spring: {
    garland: (g, fx, L) => string(g, L, 0x5f9e45, .22, (x, y, i) => g.box(.07, .07, .04, pick([0xff9fc4, 0xf6f3ee, 0xff9fc4, 0x5f9e45], i), x, y - .04, .02)),
    prop: g => tulips(g),
  },
  summer: {
    garland: (g, fx, L) => string(g, L, 0x1fa39a, .32, bulb(fx, [0xffd23a, 0x1fa39a, 0xe25c8f, 0x7fb6f0])),
    prop: g => sunflowers(g),
  },
  autumn: {
    garland: (g, fx, L) => string(g, L, 0x8a6040, .2, (x, y, i) => leaf(g, x, y, pick([0xe8742a, 0xd8314a, 0xffd23a, 0xb55a2a], i))),
    prop: (g, fx, side) => side ? leafBasket(g) : pumpkins(g, fx),
  },
  winter: {
    garland: (g, fx, L) => { string(g, L, 0x2d6a3a, .2, null, .05); string(g, L, 0xf6f3ee, .18, bulb(fx, [0xfff1c4]), .008); },
    sticker: g => g.box(.2, .025, .01, 0xf6f3ee, 0, 0, 0).box(.025, .2, .01, 0xf6f3ee, 0, 0, 0),
    prop: (g, fx, side) => side ? pinePot(g) : warmLantern(g, fx),
  },
};
