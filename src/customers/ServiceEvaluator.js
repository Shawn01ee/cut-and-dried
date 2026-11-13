import { score, profile } from '../hair/rules.js';
import { clamp, rand } from '../core/math.js';
import { SPECIALTY_SATISFACTION } from '../employees/Employee.js';
import { villainPenalty, findNitpick } from './Villains.js';
import { satisfactionFloor } from '../tycoon/Hospitality.js';
import { starsFor } from '../tycoon/ReviewBoard.js';

/** Turns a finished service into the result metrics, the client's satisfaction and a payment. */
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
    const environment = clamp(.4 + comfort * .06), treated = customer.treated || 0;
    const specialist = worker.handles(customer);
    // Difficult clients start harder to please and always find something to pick on.
    const nitpick = customer.villain ? findNitpick({ treated, comfort, wait, priceFit, quality }) : null;
    // A VIP specialist puts VIPs at ease; a calm stylist is not thrown by a difficult client.
    const expectation = (customer.vip && worker.perk !== 'vip' ? .05 : 0) + (customer.influencer ? .05 : 0) + (villainPenalty(customer.villain) + (nitpick ? nitpick.penalty : 0)) * (worker.perk === 'calm' ? .5 : 1);
    // Treats guarantee a minimum, however the hair turns out; difficult clients honour three quarters of it.
    const floor = satisfactionFloor(treated) * (customer.villain ? .75 : 1);
    const satisfaction = Math.max(floor, clamp(.62 * match.all + .12 * quality + .1 * wait + .08 * priceFit + .08 * environment + treated * .012 - (customer.washed ? 0 : .05) - expectation + (specialist ? SPECIALTY_SATISFACTION : 0)));
    // Review stars: the hair sets the base, then everything around it (service) adds or takes away.
    const hairScore = clamp(match.all + (specialist ? .05 : 0));
    const service = clamp(.3 * Math.min(1, treated / 6) + .25 * wait + .2 * clamp((comfort - 4) / 16) + .1 * (customer.washed ? 1 : 0) + .15 * clamp((worker.effectiveSkills.customerService - 40) / 60) + (worker.perk === 'consult' ? .15 : 0));
    const lift = service >= .8 ? 1 : service >= .65 ? (Math.random() < .5 ? 1 : 0) : service < .25 ? -2 : service < .4 ? -1 : 0;
    const reviewStars = Math.max(Math.min(5, Math.max(1, starsFor(hairScore) + lift)), floor ? starsFor(floor) : 1);
    const tip = satisfaction > .85 ? rand(5, 20) * (customer.vip ? 3 : 1) : 0;
    const payment = customer.influencer ? 0 : Math.round(customer.price * (.35 + .65 * satisfaction) + tip);
    return { ...match, specialist, length, style, colour: match.col, quality, wait, priceFit, environment, treated, nitpick: nitpick && nitpick.key, stylist: worker.name, hairScore, service, reviewStars, satisfaction, all: satisfaction, payment };
  }
}
