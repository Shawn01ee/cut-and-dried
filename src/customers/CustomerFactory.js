import { Customer } from './Customer.js';
import { FEMALE_NAMES, MALE_NAMES, NATURAL, WANT } from './catalog.js';
import { STR } from '../hair/strands.js';
import { profile } from '../hair/rules.js';
import { hexLab, labDist } from '../rendering/color.js';
import { rand, pick, clamp } from '../core/math.js';
import { CUTS, PERMS, TREND_COLOURS, TREND_WEIGHT, colourPriceFor, isHot } from '../hair/StyleMenu.js';

const index = list => Math.floor(Math.random() * list.length);
/** Picks from `list` in proportion to `w(item)`. */
const weighted = (list, w) => { const ws = list.map(w); let r = Math.random() * ws.reduce((a, b) => a + b, 0); return list.find((x, k) => (r -= ws[k]) < 0) || list[list.length - 1]; };

/** Rolls new clients. What they can ask for depends on what the salon has unlocked. */
export class CustomerFactory {
  #nextId = 0;

  create(usedNames, { colour, perm, advancedCuts, vipChance, priceMultiplier, patienceMultiplier, budgetFactor = 1, villain = null, influencer = null, colourBias = 1, permBias = 1, as = null, trends = null }) {
    // About four in ten clients are men: mostly short hair, fewer colours and perms. `as` brings back a known client.
    const male = as && as.gender ? as.gender === 'm' : Math.random() < .42, natI = index(NATURAL), nat = NATURAL[natI], g = male ? 'm' : 'f';
    const L0 = male ? (Math.random() < .12 ? rand(14, 30) : rand(5, 14)) : rand(14, 58), w0 = Math.random() < (male ? .75 : .6) ? rand(0, .4) : rand(.8, 2.4);
    const lab = hexLab(nat[1]); lab.L += rand(-.02, .02);
    const hair = { len: STR.map(s => Math.max(3, L0 * (s.z === 3 ? rand(.8, 1) : 1) + rand(-2.5, 2.5))), lab, wave: w0, damage: rand(0, .5) };
    if (!perm) hair.wave = Math.round(clamp(w0, 0, 3));
    // This year's styles come up a little more often, this month's trends nearly twice as often.
    const weight = (id, item) => (item.w ?? 1) * (item.trend ? 1.2 : 1) * (isHot(trends, id) ? TREND_WEIGHT : 1);
    const forMe = item => item.g === g || item.g === 'any';
    // The cut: one on the menu this hair is long enough for.
    const cuts = Object.entries(CUTS).filter(([, c]) => forMe(c) && (advancedCuts || !c.advanced));
    const fit = cuts.filter(([, c]) => this.#maxLength(hair, c.shape, hair.wave) >= c.L[0]);
    // Most people keep roughly their length: a cut far shorter than their hair is a bigger decision, so rarer.
    const keep = c => Math.max(.15, Math.min(1, ((c.L[1] + 5) / this.#maxLength(hair, c.shape, hair.wave)) ** 2));
    const [cutId, cut] = weighted(fit.length ? fit : [cuts.slice().sort((a, b) => a[1].L[0] - b[1].L[0])[0]], ([id, c]) => weight(id, c) * keep(c));
    // A perm or a straightening from the menu, for those who want one and whose hair suits it.
    let wave = Math.round(clamp(hair.wave, 0, 3)), permId = null;
    if (perm && Math.random() < clamp((male ? .2 : .55) * permBias, 0, .95)) {
      const mid = (cut.L[0] + cut.L[1]) / 2;
      const perms = Object.entries(PERMS).filter(([, p]) => forMe(p) && (p.straighten ? hair.wave >= .8 : Math.abs(p.wave - hair.wave) > .5) && (!p.L || (mid >= p.L[0] && mid <= p.L[1])));
      if (perms.length) { const [id, p] = weighted(perms, ([i, x]) => weight(i, x)); permId = id; wave = p.wave; }
    }
    // Hair a little off its natural wave asks for the perm that sets it.
    if (!permId && Math.abs(wave - hair.wave) > .4) { const same = Object.keys(PERMS).filter(k => forMe(PERMS[k]) && PERMS[k].wave === wave); permId = same.find(k => !!PERMS[k].straighten === wave < hair.wave) || same[0] || null; }
    const shape = cut.shape, L = Math.max(2, Math.round(Math.min(rand(cut.L[0], cut.L[1]), this.#maxLength(hair, shape, wave))));
    // The colour: anything on the list that is a real change, 2026's colours a little more often.
    let col = { t: 'nat', i: natI }, targetLab = { ...lab }, recolour = false;
    if (colour && Math.random() < clamp((male ? .3 : .67) * colourBias, 0, .95)) {
      const options = WANT.map((w, i) => i).filter(i => labDist(hexLab(WANT[i][1]), lab) >= .05);
      const wi = weighted(options, i => (TREND_COLOURS.includes(i) ? 1.2 : 1) * (isHot(trends, i) ? TREND_WEIGHT : 1));
      col = { t: 'want', i: wi }; targetLab = hexLab(WANT[wi][1]); recolour = true;
    }
    const rewave = Math.abs(wave - hair.wave) > .4, vip = !influencer && Math.random() < vipChance;
    // Melbourne prices from the menu: the cut, plus the colour and perm when the order needs them.
    const list = cut.price + (recolour ? colourPriceFor(col.i, targetLab, lab) : 0) + (rewave ? (permId ? PERMS[permId].price : 140) : 0);
    const trending = isHot(trends, cutId) || (rewave && isHot(trends, permId)) || (recolour && isHot(trends, col.i));
    const pool = male ? MALE_NAMES : FEMALE_NAMES, free = pool.filter(n => !usedNames.has(n)), name = as && as.name ? as.name : pick(free.length ? free : pool);
    // An influencer is sponsored: the service is free in exchange for a post.
    if (influencer) influencer.handle = `@${name.toLowerCase()}.${pick(['hair', 'style', 'daily', 'melb'])}`;
    return Object.assign(new Customer({
      id: ++this.#nextId, name, hair, gender: male ? 'm' : 'f', look: { beard: male && Math.random() < .3 ? nat[1] : null },
      order: { shape, L, col, lab: targetLab, wave, cut: cutId, perm: rewave ? permId : null },
      price: influencer ? 0 : Math.round(list * priceMultiplier * (vip ? 3 : 1)),
      budget: Math.round(list * rand(.95, 1.6) * (vip ? 3.5 : 1) * budgetFactor),
      patience: rand(80, 130) * (vip || influencer ? .8 : 1) * patienceMultiplier,
      loyalty: rand(0, 40), vip, villain, influencer,
      requestedService: recolour ? 'colour' : rewave ? 'perm' : 'haircut',
    }), { trending });
  }

  /** The longest a cut of this shape can be on this hair; zones a shape keeps at a fixed length do not limit it. */
  #maxLength(hair, shape, wave) {
    const unit = profile(shape, 1), two = profile(shape, 2); let max = 1e9;
    STR.forEach((s, j) => { if (unit[j] > .05 && unit[j] !== two[j]) max = Math.min(max, hair.len[j] * (1 - .12 * wave) / unit[j]); });
    return Math.max(2, max * .95);
  }
}
