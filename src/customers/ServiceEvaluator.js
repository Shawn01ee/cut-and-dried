import { score, profile } from '../hair/rules.js';
import { clamp, rand } from '../core/math.js';

/** Turns a finished service into the five result metrics and a payment. */
export class ServiceEvaluator {
  evaluate(customer, worker, comfort) {
    const { hair, order } = customer, match = score(hair, order);
    const wf = 1 - .12 * hair.wave, target = profile(order.shape, order.L);
    const diff = hair.len.map((l, j) => l * wf - target[j]);
    const bias = diff.reduce((a, b) => a + b, 0) / diff.length;
    const spread = diff.reduce((a, b) => a + Math.abs(b - bias), 0) / diff.length;
    const length = clamp(1 - Math.abs(bias) / 8);
    const style = clamp(.7 * (1 - spread / 6) + .3 * match.wav);
    const quality = worker.serviceQuality();
    const wait = clamp(customer.pat / customer.maxPat);
    const priceFit = clamp(1 - Math.max(0, customer.price - customer.budget) / customer.budget * 2);
    const environment = clamp(.4 + comfort * .06);
    const expectation = customer.vip ? .05 : 0;
    const satisfaction = clamp(.62 * match.all + .12 * quality + .1 * wait + .08 * priceFit + .08 * environment - expectation);
    const tip = satisfaction > .85 ? rand(5, 20) * (customer.vip ? 3 : 1) : 0;
    return { ...match, length, style, colour: match.col, quality, satisfaction, all: satisfaction, payment: Math.round(customer.price * (.35 + .65 * satisfaction) + tip) };
  }
}
