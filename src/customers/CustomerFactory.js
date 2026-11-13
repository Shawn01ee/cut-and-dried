import { Customer } from './Customer.js';
import { NAMES, NATURAL, WANT } from './catalog.js';
import { STR } from '../hair/strands.js';
import { profile } from '../hair/rules.js';
import { hexLab, labDist } from '../rendering/color.js';
import { rand, pick, clamp } from '../core/math.js';

const index = list => Math.floor(Math.random() * list.length);

/** Rolls new clients. What they can ask for depends on what the salon has unlocked. */
export class CustomerFactory {
  #nextId = 0;

  create(usedNames, { colour, perm, advancedCuts, vipChance, priceMultiplier, patienceMultiplier, villain = null, influencer = null }) {
    const natI = index(NATURAL), nat = NATURAL[natI], L0 = rand(14, 58), w0 = Math.random() < .6 ? rand(0, .4) : rand(.8, 2.4);
    const lab = hexLab(nat[1]); lab.L += rand(-.02, .02);
    const hair = { len: STR.map(s => Math.max(3, L0 * (s.z === 3 ? rand(.8, 1) : 1) + rand(-2.5, 2.5))), lab, wave: w0, damage: rand(0, .5) };
    let wave = Math.random() < .45 ? Math.round(clamp(w0, 0, 3)) : pick([0, 1, 1, 2, 2, 3]);
    if (!perm) { wave = Math.round(clamp(w0, 0, 3)); hair.wave = wave; }
    const shape = pick(advancedCuts ? ['Blunt', 'Blunt', 'Layered', 'Layered', 'A-line', 'Undercut'] : ['Blunt', 'Blunt', 'Layered']);
    const L = this.#targetLength(hair, shape, wave);
    let col = { t: 'nat', i: natI }, targetLab = { ...lab }, recolour = false;
    if (colour && Math.random() >= .33) {
      let wi; do { wi = index(WANT); } while (labDist(hexLab(WANT[wi][1]), lab) < .05);
      col = { t: 'want', i: wi }; targetLab = hexLab(WANT[wi][1]); recolour = true;
    }
    const rewave = Math.abs(wave - hair.wave) > .4, vip = !influencer && Math.random() < vipChance;
    // Melbourne salon prices in AUD: a cut, plus colour and perm when the order needs them.
    const list = 85 + (recolour ? 120 : 0) + (rewave ? 110 : 0);
    const free = NAMES.filter(n => !usedNames.has(n)), name = pick(free.length ? free : NAMES);
    // An influencer is sponsored: the service is free in exchange for a post.
    if (influencer) influencer.handle = `@${name.toLowerCase()}.${pick(['hair', 'style', 'daily', 'melb'])}`;
    return new Customer({
      id: ++this.#nextId, name, hair,
      order: { shape, L, col, lab: targetLab, wave },
      price: influencer ? 0 : Math.round(list * priceMultiplier * (vip ? 3 : 1)),
      budget: Math.round(list * rand(.95, 1.6) * (vip ? 3.5 : 1)),
      patience: rand(80, 130) * (vip || influencer ? .8 : 1) * patienceMultiplier,
      loyalty: rand(0, 40), vip, villain, influencer,
      requestedService: recolour ? 'colour' : rewave ? 'perm' : 'haircut',
    });
  }

  #targetLength(hair, shape, wave) {
    const unit = profile(shape, 1); let max = 1e9;
    STR.forEach((s, j) => { if (unit[j] > .05 && !(shape === 'Undercut' && (s.z === 1 || s.z === 2))) max = Math.min(max, hair.len[j] * (1 - .12 * wave) / unit[j]); });
    max = Math.max(4, max * .95);
    return Math.round(rand(Math.min(6, max), max));
  }
}
