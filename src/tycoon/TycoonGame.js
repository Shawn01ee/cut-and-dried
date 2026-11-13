import { EventBus } from '../core/EventBus.js';
import { GameClock } from '../core/GameClock.js';
import { SaveManager } from '../core/SaveManager.js';
import { Economy } from './Economy.js';
import { Reputation } from './Reputation.js';
import { Progression } from './Progression.js';
import { Franchise } from './Franchise.js';
import { OperatingCosts } from './OperatingCosts.js';
import { Marketing } from './Marketing.js';
import { ReviewBoard } from './ReviewBoard.js';
import { Hospitality } from './Hospitality.js';
import { Finance } from './Finance.js';
import { Rival } from './Rival.js';
import { StaffManager } from '../employees/StaffManager.js';
import { CustomerFactory } from '../customers/CustomerFactory.js';
import { ServiceEvaluator } from '../customers/ServiceEvaluator.js';
import { rollVillain } from '../customers/Villains.js';
import { SalonLayout } from '../building/SalonLayout.js';
import { rand, clamp } from '../core/math.js';

const PRICE_MULTIPLIER = [.8, 1, 1.5], PRICE_DEMAND = [1.3, 1, .7];
const MATERIALS = { colour: 18, wave: 14 }, CARD_FEE = .016;
export const STARTING_CASH = 2000;
// Earlier saves used these ids for the stylist now called Shawn.
const LEGACY_IDS = { jun: 'shawn', sean: 'shawn', sophie: 'ruby', max: 'hugo' };
const blankIncidents = () => ({ refunds: 0, discounts: 0, dashed: 0 });

/** Composition root of the business simulation. Knows nothing about Three.js. */
export class TycoonGame {
  constructor() {
    this.bus = new EventBus();
    this.clock = new GameClock(this.bus);
    this.economy = new Economy(STARTING_CASH);
    this.reputation = new Reputation();
    this.progression = new Progression(this.bus);
    this.staff = new StaffManager(this.economy);
    this.layout = new SalonLayout(); this.layout.resetToDefault();
    this.franchise = new Franchise(this.economy);
    this.operatingCosts = new OperatingCosts(this.economy, this.staff, this.layout, this.progression);
    this.marketing = new Marketing(this.economy);
    this.reviews = new ReviewBoard();
    this.hospitality = new Hospitality(this.economy, this.layout);
    this.finance = new Finance(this.economy);
    this.rival = new Rival();
    this.customers = new CustomerFactory();
    this.evaluator = new ServiceEvaluator();
    this.saves = new SaveManager('cut-and-dried-career-v2');
    this.priceLevel = 1; this.served = 0; this.servedToday = 0; this.satisfactionSum = 0; this.lastSatisfaction = 0;
    this.repAtDayStart = 0; this.followersAtDayStart = 0; this.incidents = blankIncidents(); this.trollAt = null; this.report = null;
    // Regular clients come back on their own; stylists who want to quit and rival news wait for the morning.
    this.regulars = 0; this.resignations = []; this.news = []; this.dirt = 0;
  }
  get context() { return { served: this.served, staff: this.staff.hired.length, rep: this.reputation.value, earned: this.economy.totalEarned }; }
  /** Roughly how many clients want to come today. There is no cap: seats and chairs decide how many can be served. */
  get dailyDemand() {
    const base = 5 + this.reputation.value * .25 + this.comfort * .2 + this.marketing.followerClients + Math.min(15, this.regulars * .12);
    return Math.max(1, Math.round(base * PRICE_DEMAND[this.priceLevel] * this.marketing.demandMultiplier * this.reviews.demandMultiplier * (1 - this.rival.pull(this.standing))));
  }
  /** How Ciel Ground looks from outside, for the rival to react to. */
  get standing() { return { rating: this.reviews.count ? this.reviews.rating : 0, followers: this.marketing.followers, priceLevel: this.priceLevel }; }
  /** How well the front desk runs marketing: Ruby's marketing skill, or Lia doing it herself without her. */
  get marketingPower() { const r = this.staff.receptionist; return r.hired ? .75 + (r.skills.marketing || 0) / 200 : .5; }
  /** Furniture comfort plus a tidy floor while the assistant is employed. */
  /** Furniture comfort, plus a tidy floor while an assistant is employed, minus hair left lying on the floor. */
  get comfort() { return this.layout.comfort + (this.staff.hasSupport('tidy') ? 2 : 0) - Math.min(4, Math.floor(this.dirt / 150)); }
  get averageSatisfaction() { return this.served ? this.satisfactionSum / this.served : 0; }
  /** How good a reel filmed right now looks: the latest finished style, the salon and its rating. */
  get reelQuality() { return clamp(.1 + .55 * this.lastSatisfaction + this.comfort * .012 + (this.reviews.count ? (this.reviews.rating - 3) * .05 : 0)); }
  /** Chance that someone posts a fake one-star review today; a bigger audience attracts more of them. */
  get trollChance() { return this.progression.level < 2 ? 0 : Math.min(.45, .12 + this.marketing.followers / 4000); }
  updateProgress() { this.progression.update(this.context); }
  isUnlocked(feature) { return this.progression.isUnlocked(feature); }
  nextArrival() { return rand(.8, 1.2) * this.clock.dayLength / this.dailyDemand; }
  /** A client for the main salon. Branch clients (`walkIn` false) are never influencers or difficult clients. */
  newCustomer(usedNames, walkIn = true) {
    const influencer = walkIn ? this.marketing.takeInfluencer() : null;
    return this.customers.create(usedNames, {
      colour: this.isUnlocked('colour'), perm: this.isUnlocked('perm'), advancedCuts: this.isUnlocked('chairs'),
      vipChance: this.isUnlocked('vip') ? .18 : 0, priceMultiplier: PRICE_MULTIPLIER[this.priceLevel], patienceMultiplier: (1 + this.comfort * .03) * (this.staff.hasSupport('reception') ? 1.15 : 1),
      villain: walkIn && !influencer ? rollVillain(this.progression.level) : null, influencer, budgetFactor: this.rival.budgetFactor,
    });
  }
  serviceProfileOf(worker) { return worker.serviceProfile(this.layout.speedBonus); }
  chargeMaterials(ops) { ops.forEach(op => { if (MATERIALS[op.type]) this.economy.charge('materials', MATERIALS[op.type]); }); }
  completeService(customer, worker, byOwner) {
    const result = this.evaluator.evaluate(customer, worker, this.comfort);
    if (customer.vip && byOwner) result.payment = Math.round(result.payment * 1.2);
    const gain = (result.satisfaction - .55) * 3 * (customer.vip ? 2 : 1) * (result.satisfaction > .55 ? 1 + this.comfort * .03 : 1);
    this.reputation.add(gain); worker.recordService(result.satisfaction, result.payment);
    if (worker !== this.staff.owner) worker.tire(14 / this.layout.staffRestRate);
    if (worker.gainExperience(result.specialist ? 15 : 10)) this.bus.emit('staff:levelup', worker);
    this.served++; this.servedToday++; this.satisfactionSum += result.satisfaction; this.lastSatisfaction = result.satisfaction;
    return result;
  }
  /** Takes a payment; card payments carry a small processing fee. */
  receivePayment(amount) { this.economy.earn('services', amount); this.economy.charge('fees', Math.round(amount * CARD_FEE)); this.updateProgress(); }
  /**
   * The visit is over once the client has paid, haggled, demanded a refund or run off.
   * `outcome` says which; returns the review they wrote and any change in followers.
   */
  finishVisit(customer, result, outcome = {}) {
    if (outcome.refusedRefund) this.reputation.add(-1.5);
    if (outcome.refunded) this.incidents.refunds += result.payment;
    if (outcome.discount) this.incidents.discounts += outcome.discount;
    if (outcome.dashed) this.incidents.dashed += result.payment;
    // A difficult visit wears on the stylist who did it.
    const worker = this.staff.all.find(e => e.name === result.stylist);
    if (customer.villain && worker && worker !== this.staff.owner) worker.addStress(outcome.refusedRefund || outcome.refunded || outcome.haggleRefused || outcome.discount ? 7 : 4);
    // Happy clients may become regulars; a bad visit can lose one.
    if (!customer.villain && !customer.influencer) {
      if (result.satisfaction >= .8 && Math.random() < .35) this.regulars++;
      else if (result.satisfaction < .5 && this.regulars && Math.random() < .5) this.regulars--;
    }
    let followers = 0;
    if (customer.influencer) {
      followers = this.marketing.influencerPosted(customer.influencer, result.satisfaction);
      if (result.satisfaction < .55) this.reputation.add(-3);
    }
    return { review: this.#post(this.reviews.fromService(customer, result, this.clock.day, outcome)), followers };
  }
  customerGaveUp(customer) { this.reputation.add(-.6); this.#post(this.reviews.walkedOut(customer, this.clock.day)); }
  customerTurnedAway(customer) { this.#post(this.reviews.turnedAway(customer, this.clock.day)); }
  #post(review) { if (review) this.bus.emit('review:new', review); return review; }
  replyToReview(id, kind) { const r = this.reviews.reply(id, kind); if (r && r.rep) this.reputation.add(r.rep); return r; }
  post(channel) { return this.marketing.post(channel, this.clock.day, this.reelQuality, this.marketingPower); }
  runCampaign(id) { return this.marketing.run(id, this.marketingPower); }
  expand() { const next = this.layout.nextExpansion; if (!next || !this.isUnlocked(next.requires) || !this.economy.spend('expansion', next.cost)) return false; this.layout.tier++; if (this.layout.tier === 2) this.layout.addAnnexPlants(); return true; }
  tick(dt) {
    this.clock.tick(dt); this.operatingCosts.accrue(this.clock.workedFraction);
    if (this.trollAt != null && this.clock.elapsed >= this.trollAt) { this.trollAt = null; this.#post(this.reviews.troll(this.clock.day)); }
  }
  startDay() {
    this.economy.startDay(); this.operatingCosts.startDay(); this.staff.startDay(this.clock.day); this.marketing.startDay();
    const move = this.rival.startDay(this.clock.day, this.standing);
    if (move) this.news.push(move);
    // A discounting rival tempts a few regulars away.
    this.regulars = Math.max(0, this.regulars - Math.round(this.regulars * this.rival.discount * .2));
    this.servedToday = 0; this.repAtDayStart = this.reputation.value; this.followersAtDayStart = this.marketing.followers; this.incidents = blankIncidents(); this.report = null;
    this.trollAt = Math.random() < this.trollChance ? rand(.1, .9) * this.clock.dayLength : null;
    this.clock.startDay();
  }
  nextDay() { this.clock.day++; this.startDay(); }
  closeDay() {
    const e = this.economy, sales = this.layout.dailySales, branches = this.franchise.collectDay();
    if (sales) e.earn('products', sales); if (branches) e.earn('branches', branches);
    this.operatingCosts.accrue(1);
    this.resignations = this.staff.closeDay(this.clock.day, this.layout.staffRestRate);
    this.finance.closeDay(e.dailyProfit);
    [this.staff.owner, ...this.staff.working(this.clock.day)].forEach(e => { if (e.gainExperience(5)) this.bus.emit('staff:levelup', e); });
    const reviews = this.reviews.today(this.clock.day);
    this.report = {
      day: this.clock.day, ...e.closeDay(), reputation: this.reputation.value - this.repAtDayStart,
      reviews: { count: reviews.length, average: reviews.length ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0 },
      followers: { now: this.marketing.followers, change: this.marketing.followers - this.followersAtDayStart }, incidents: { ...this.incidents },
    };
    this.updateProgress(); this.save(); return this.report;
  }
  save() { this.saves.save(this.serialize()); }
  serialize() {
    return { day: this.clock.day + 1, economy: this.economy, reputation: this.reputation.value, level: this.progression.level, served: this.served, satisfactionSum: this.satisfactionSum, priceLevel: this.priceLevel, staff: this.staff.all, support: this.staff.support, layout: this.layout, franchise: this.franchise, marketing: this.marketing, reviews: this.reviews, hospitality: this.hospitality, finance: this.finance, rival: this.rival, regulars: this.regulars, staffPolicy: this.staff };
  }
  restore(d) {
    this.clock.day = d.day; this.economy.restore(d.economy); this.reputation.value = d.reputation; this.progression.level = d.level;
    this.served = d.served; this.satisfactionSum = d.satisfactionSum; this.priceLevel = d.priceLevel; this.franchise.restore(d.franchise);
    d.staff.forEach(s => this.staff.find(LEGACY_IDS[s.id] || s.id)?.restore(s));
    (d.support || []).forEach(s => this.staff.find(LEGACY_IDS[s.id] || s.id)?.restore(s));
    this.layout.restore(d.layout);
    this.marketing.restore(d.marketing); this.reviews.restore(d.reviews); this.hospitality.restore(d.hospitality);
    this.finance.restore(d.finance); this.rival.restore(d.rival); this.regulars = d.regulars || 0; this.staff.restore(d.staffPolicy);
  }
}
