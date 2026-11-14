import { EventBus } from '../core/EventBus.js';
import { GameClock } from '../core/GameClock.js';
import { SaveManager } from '../core/SaveManager.js';
import { Economy } from './Economy.js';
import { Reputation } from './Reputation.js';
import { Progression } from './Progression.js';
import { OperatingCosts } from './OperatingCosts.js';
import { Marketing } from './Marketing.js';
import { ReviewBoard } from './ReviewBoard.js';
import { ReviewRewards } from './ReviewRewards.js';
import { Hospitality } from './Hospitality.js';
import { Finance } from './Finance.js';
import { Rival } from './Rival.js';
import { Missions } from './Missions.js';
import { MonthlyLedger, MONTH_DAYS, summariseDays } from './MonthlyLedger.js';
import { SYNERGIES, teamOf } from './Synergies.js';
import { StaffManager } from '../employees/StaffManager.js';
import { CustomerFactory } from '../customers/CustomerFactory.js';
import { ServiceEvaluator } from '../customers/ServiceEvaluator.js';
import { rollVillain } from '../customers/Villains.js';
import { SalonLayout } from '../building/SalonLayout.js';
import { rand, clamp } from '../core/math.js';

const PRICE_MULTIPLIER = [.8, 1, 1.5, 2.2], PRICE_DEMAND = [1.3, 1, .7, .45];
/** Opening the second salon: needs level 5, the first salon two expansions big and a good week's takings, then the money. */
export const BRANCH = { cost: 30000, weekRevenue: 9000, tier: 2 };
// What the old franchise branches cost, to pay them back to saves from before the second salon.
const OLD_BRANCH_COST = { downtown: 10000, premium: 18000, barber: 24000, colour: 32000 };
// People who walk past a salon nobody has heard of yet and come in, per eight hours.
const WALK_INS = 2.5;
const MATERIALS = { colour: 18, wave: 14 }, CARD_FEE = .016, SPA_FEE = 45;
export const STARTING_CASH = 2000;
// Earlier saves used these ids for the stylist now called Shawn.
const LEGACY_IDS = { jun: 'owen', sean: 'owen', shawn: 'owen', jules: 'daniel', mia: 'sophia', sophie: 'ruby', max: 'hugo' };
// Stylists who were renamed, so their old reviews still count for them.
const RENAMED = { Jules: 'Daniel', Shawn: 'Owen', Mia: 'Sophia' };
/** How much each new review moves the salon's reputation, by its stars. */
export const REVIEW_REP = { 5: .6, 4: .25, 3: 0, 2: -.6, 1: -1.2 };
/** Opening hours the owner can set: open from 7 to 12, close from 15 to 23, 6 to 12 hours a day. Changes apply from the next morning. */
export const HOURS_RANGE = { open: [7, 12], close: [15, 23], length: [6, 12] };
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
    this.recentRevenue = [];
    this.operatingCosts = new OperatingCosts(this.economy, this.staff, this.layout, this.progression, this.clock);
    this.marketing = new Marketing(this.economy);
    this.staff.extraTrainingDiscount = () => this.has('academy') ? .3 : 0;
    this.reviews = new ReviewBoard();
    this.reviewRewards = new ReviewRewards();
    this.hospitality = new Hospitality(this.economy, this.layout);
    this.finance = new Finance(this.economy);
    this.missions = new Missions(this.economy); this.missions.onDone = m => this.bus.emit('mission:done', m);
    // The week so far (one report a working day), the last weekly settlement, and whether today is the day off.
    this.weekLog = []; this.weekReport = null; this.dayOff = false; this.month = new MonthlyLedger();
    this.rival = new Rival();
    this.customers = new CustomerFactory();
    this.evaluator = new ServiceEvaluator();
    this.saves = new SaveManager('cut-and-dried-career-v2');
    this.priceLevel = 1; this.served = 0; this.servedToday = 0; this.satisfactionSum = 0; this.lastSatisfaction = 0;
    this.repAtDayStart = 0; this.followersAtDayStart = 0; this.incidents = blankIncidents(); this.trollAt = null; this.report = null;
    // Regular clients come back on their own; stylists who want to quit and rival news wait for the morning.
    this.regulars = 0; this.resignations = []; this.news = []; this.dirt = 0; this.nextHours = null;
  }
  /** 0 for Monday up to 6 for Sunday; day 1 is a Monday. */
  get weekday() { return (this.clock.day - 1) % 7; }
  get isSunday() { return this.weekday === 6; }
  get context() { return { served: this.served, staff: this.staff.hired.length, rep: this.reputation.value, earned: this.economy.totalEarned, branch: this.layout.branchOpen }; }
  /** Revenue over the last week of opening days. */
  get weekRevenue() { return this.recentRevenue.reduce((a, b) => a + b, 0); }
  /** Where the salon stands on opening the second one. */
  get branchStatus() {
    const checks = [
      { k: 'level', ok: this.isUnlocked('branches'), args: [5] },
      { k: 'size', ok: this.layout.tier >= BRANCH.tier, args: [BRANCH.tier + 1, this.layout.tier + 1] },
      { k: 'revenue', ok: this.weekRevenue >= BRANCH.weekRevenue, args: [BRANCH.weekRevenue.toLocaleString(), Math.round(this.weekRevenue).toLocaleString()] },
    ];
    return { checks, cost: BRANCH.cost, ready: checks.every(c => c.ok) && this.economy.canAfford(BRANCH.cost) };
  }
  openBranch() {
    if (this.layout.branchOpen || !this.branchStatus.ready || !this.economy.spend('branch', BRANCH.cost)) return false;
    this.layout.openBranch(); this.updateProgress(); return true;
  }
  /**
   * Where clients come from, per eight hours: a few passers-by, then more as reputation, comfort, followers and
   * regulars grow (`add`), scaled by prices, marketing, reviews and the rival (`mult`).
   */
  /** How many of the second salon's passers-by come in: half without a receptionist there, more the better she is at marketing. */
  get branchDeskReach() { const d = this.staff.receptionistAt(1); return d && d.hired ? .8 + (d.skills.marketing || 0) / 250 : .5; }
  get demandParts() {
    return {
      add: { walk: WALK_INS, branch: this.layout.branchOpen ? (WALK_INS + this.comfortAt(1) * .15) * this.branchDeskReach : 0, rep: this.reputation.value * .25, comfort: this.comfort * .15, followers: this.marketing.followerClients, regulars: Math.min(15, this.regulars * .12) },
      mult: { price: PRICE_DEMAND[this.priceLevel], marketing: this.marketing.demandMultiplier, reviews: this.reviews.demandMultiplier, rival: 1 - this.rival.pull(this.standing), award: this.isUnlocked('award') ? 1.1 : 1 },
    };
  }
  /** Roughly how many clients want to come per eight hours. There is no cap: seats and chairs decide how many can be served. */
  get dailyDemand() {
    const { add, mult } = this.demandParts, sum = Object.values(add).reduce((a, b) => a + b, 0), k = Object.values(mult).reduce((a, b) => a * b, 1);
    return Math.max(1, Math.round(sum * k));
  }
  /** How Ciel Ground looks from outside, for the rival to react to. */
  /** What Shawn, the CEO, thinks the salon is worth. */
  /** The synergies today's team has. */
  get synergies() { const T = teamOf([this.staff.owner, ...this.staff.working(this.clock.day)], this.staff.support); return SYNERGIES.filter(s => s.has(T)); }
  /** How much quicker a service of `type` goes: equipment, then the team's synergies. */
  speedFor(type) { return this.layout.speedBonus * this.processSpeedFor(type); }
  /** How much quicker colour or perm processes: only the team's synergies change that. */
  processSpeedFor(type) { return this.synergies.reduce((k, s) => k * ((s.speed && s.speed[type]) || 1), 1); }
  /** Synergy boosts to skills: the base boost from performance pay, plus mentoring for juniors. */
  #applySynergyBoosts() {
    const junior = this.synergies.reduce((n, s) => n + (s.juniorBoost || 0), 0);
    this.staff.candidates.forEach(e => { e.boost = e.hired ? this.staff.baseBoost + (e.rank === 'junior' ? junior : 0) : 0; });
  }
  get #valueContext() { return { reputation: this.reputation.value, followers: this.marketing.followers, chairs: this.layout.chairs, branches: this.layout.branchOpen ? 1 : 0 }; }
  get valuation() { return this.finance.valuation(this.#valueContext); }
  /** The parts of the salon's value: [part, counted from, dollars]. */
  get valuationParts() { return this.finance.valuationParts(this.#valueContext); }
  investIn(i) { return this.finance.takeInvestment(i, this.progression.level, this.valuation, this.clock.day); }
  buyBackStake() { return this.finance.buyBack(this.valuation); }
  get standing() { return { rating: this.reviews.count ? this.reviews.rating : 0, followers: this.marketing.followers, priceLevel: this.priceLevel }; }
  /** How well the front desk runs marketing: Ruby's marketing skill, or Lia doing it herself without her. */
  get marketingPower() { const r = this.staff.receptionist; return r.hired ? .75 + (r.skills.marketing || 0) / 200 : .5; }
  /** Furniture comfort plus a tidy floor while the assistant is employed. */
  /** Furniture comfort, plus a tidy floor while an assistant is employed, minus hair left lying on the floor. */
  get comfort() { return this.comfortAt(0); }
  /** Comfort at one salon: its furniture, a tidy floor while an assistant is employed, minus hair left lying around. */
  comfortAt(site) { return this.layout.comfortAt(site) + (this.staff.hasSupport('tidy') ? 2 : 0) - Math.min(4, Math.floor(this.dirt / 150)); }
  get averageSatisfaction() { return this.served ? this.satisfactionSum / this.served : 0; }
  /** How good a reel filmed right now looks: the latest finished style, the salon and its rating. */
  has(id) { return this.layout.items.some(it => it.id === id); }
  get reelQuality() { return clamp(.1 + this.synergies.reduce((n, x) => n + (x.reel || 0), 0) + (this.has('photoZone') ? .12 : 0) + Math.min(.2, this.staff.hired.filter(e => e.perk === 'trend').length * .1) + .55 * this.lastSatisfaction + this.comfort * .012 + (this.reviews.count ? (this.reviews.rating - 3) * .05 : 0)); }
  /** Chance that someone posts a fake one-star review today; a bigger audience attracts more of them. */
  get trollChance() { return this.progression.level < 2 ? 0 : Math.min(.45, .12 + this.marketing.followers / 4000); }
  updateProgress() { this.progression.update(this.context); this.layout.branchChairs = this.isUnlocked('branchGrow') ? 9 : 6; this.syncMissions(); this.#applySynergyBoosts(); }
  isUnlocked(feature) { return this.progression.isUnlocked(feature); }
  /** Clients arrive at the same rate whatever the hours, so a longer day brings more of them. `dailyDemand` is per eight hours. */
  nextArrival() { return rand(.8, 1.2) * this.clock.hourLength * 8 / this.dailyDemand; }
  setHours(open, close) { this.nextHours = open === this.clock.openHour && close === this.clock.closeHour ? null : [open, close]; }
  /** Tomorrow's hours as [open, close]. */
  get plannedHours() { return this.nextHours || [this.clock.openHour, this.clock.closeHour]; }
  /** Whether the opening (`which` 0) or closing (1) hour can move by `step`. */
  canShiftHours(which, step) {
    const h = [...this.plannedHours]; h[which] += step;
    const [o, c] = h, R = HOURS_RANGE;
    return o >= R.open[0] && o <= R.open[1] && c >= R.close[0] && c <= R.close[1] && c - o >= R.length[0] && c - o <= R.length[1];
  }
  shiftHours(which, step) { if (!this.canShiftHours(which, step)) return false; const h = [...this.plannedHours]; h[which] += step; this.setHours(...h); return true; }
  /** A client for the main salon. Branch clients (`walkIn` false) are never influencers or difficult clients. */
  /** A client for salon `site`. Branch clients (`walkIn` false) are never influencers or difficult clients. */
  newCustomer(usedNames, walkIn = true, site = 0) {
    const influencer = walkIn ? this.marketing.takeInfluencer() : null;
    const c = this.customers.create(usedNames, {
      colour: this.isUnlocked('colour'), perm: this.isUnlocked('perm'), advancedCuts: this.isUnlocked('chairs'),
      vipChance: this.isUnlocked('vip') ? .18 : 0, priceMultiplier: PRICE_MULTIPLIER[this.priceLevel], patienceMultiplier: (1 + this.comfortAt(site) * .03) * (this.staff.hasSupport('reception', site) ? 1.15 : 1),
      villain: walkIn && !influencer ? rollVillain(this.progression.level) : null, influencer, budgetFactor: this.rival.budgetFactor,
    });
    c.site = site;
    if (c.vip) { const k = this.synergies.reduce((m, x) => m * (x.vipPatience || 1), 1); c.pat *= k; c.maxPat *= k; }
    return c;
  }
  serviceProfileOf(worker) { return worker.serviceProfile(this.layout.speedBonus); }
  chargeMaterials(ops) { ops.forEach(op => { if (MATERIALS[op.type]) this.economy.charge('materials', MATERIALS[op.type]); }); }
  completeService(customer, worker, byOwner) {
    const comfort = this.comfortAt(customer.site || 0), syn = this.synergies, result = this.evaluator.evaluate(customer, worker, comfort, {
      satisfaction: syn.reduce((n, s) => n + (s.satisfaction || 0) + (customer.requestedService === 'colour' ? s.colourSatisfaction || 0 : 0), 0), calm: syn.some(s => s.calm),
    });
    if (customer.vip) result.payment = Math.round(result.payment * syn.reduce((k, s) => k * (s.vipPay || 1), 1));
    if (customer.vip && byOwner) result.payment = Math.round(result.payment * 1.2);
    if (customer.vip && worker.perk === 'vip') result.payment = Math.round(result.payment * 1.2);
    if (customer.vip && customer.vipRoom) result.payment = Math.round(result.payment * 1.25);
    // A head spa is an add-on the client pays for.
    if (customer.spa && !customer.influencer) result.payment += SPA_FEE;
    const gain = (result.satisfaction - .55) * 3 * (customer.vip ? 2 : 1) * (result.satisfaction > .55 ? 1 + comfort * .03 : 1);
    this.reputation.add(gain); worker.recordService(result.satisfaction, result.payment);
    if (worker !== this.staff.owner) worker.tire(14 / this.layout.staffRestRate);
    // A mentor on the team helps everyone else learn faster.
    const learning = this.staff.hasPerk('mentor') && worker.perk !== 'mentor' ? 1.5 : 1;
    if (worker.gainExperience(Math.round((result.specialist ? 15 : 10) * learning))) this.bus.emit('staff:levelup', worker);
    this.served++; this.servedToday++; this.satisfactionSum += result.satisfaction; this.lastSatisfaction = result.satisfaction;
    const M = this.missions; M.record('serve'); if (result.satisfaction >= .85) M.record('happy'); if (customer.vip) M.record('vip');
    if (customer.requestedService === 'colour') M.record('colour'); else if (customer.requestedService === 'perm') M.record('perm');
    return result;
  }
  /** Takes a payment; card payments carry a small processing fee. */
  receivePayment(amount) { this.missions.record('revenue', amount); this.economy.earn('services', amount); this.economy.charge('fees', Math.round(amount * CARD_FEE)); this.updateProgress(); }
  /**
   * The visit is over once the client has paid, haggled, demanded a refund or run off.
   * `outcome` says which; returns the review they wrote and any change in followers.
   */
  finishVisit(customer, result, outcome = {}) {
    if (outcome.refusedRefund) this.reputation.add(-1.5);
    if (customer.villain && !outcome.refunded && !outcome.dashed) this.missions.record('villain');
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
    let followers = 0, influencerPost = null;
    if (customer.influencer) {
      influencerPost = this.marketing.influencerPosted(customer.influencer, result.satisfaction);
      followers = influencerPost.followers; this.reputation.add(influencerPost.rep); this.missions.record('followers', followers);
    }
    return { review: this.#post(this.reviews.fromService(customer, result, this.clock.day, outcome)), followers, influencerPost };
  }
  customerGaveUp(customer) { this.reputation.add(-.6); this.#post(this.reviews.walkedOut(customer, this.clock.day)); }
  customerTurnedAway(customer) { this.#post(this.reviews.turnedAway(customer, this.clock.day)); }
  /** A new review: it moves the reputation by its stars and goes on the board. */
  #post(review) {
    if (review) {
      if (review.stars === 5 && !review.fake) this.missions.record('five');
      review.rep = REVIEW_REP[review.stars] ?? 0; this.reputation.add(review.rep); this.bus.emit('review:new', review);
      for (const bonus of this.reviewRewards.onReview(review, this.reviews)) { this.economy.fund('reviewBonus', bonus.amount); this.bus.emit('review:bonus', bonus); }
    }
    return review;
  }
  /** Who handles reviews: the receptionist, who runs marketing, or Lia herself without one. */
  get reviewManager() { const r = this.staff.receptionist; return r.hired ? { name: r.name, role: 'desk', skill: r.skills.marketing || 0 } : { name: this.staff.owner.name, role: 'owner', skill: 0 }; }
  /** Answers a review. A review taken down no longer counts against the reputation; one the client improved counts at its new stars. */
  replyToReview(id, kind) {
    const r = this.reviews.reply(id, kind, this.reviewManager); if (!r) return r;
    this.missions.record('reply');
    let rep = r.rep || 0;
    if (r.review.removed) rep -= r.review.rep || 0;
    else if (r.edited) { const now = REVIEW_REP[r.review.stars] ?? 0; rep += now - (r.review.rep || 0); r.review.rep = now; }
    if (rep) this.reputation.add(rep);
    return r;
  }
  /** With auto-replies on, the receptionist answers the day's unanswered reviews at closing. */
  #autoReply() { if (!this.reviews.autoReply || !this.staff.receptionist.hired) return; this.reviews.list.filter(r => !r.replied && !r.removed).forEach(r => this.replyToReview(r.id, r.stars >= 4 ? 'thanks' : r.villain || r.fake ? 'report' : 'apology')); }
  post(channel) { const f = this.marketing.followers, r = this.marketing.post(channel, this.clock.day, this.reelQuality, this.marketingPower); if (r) { this.missions.record('post'); this.missions.record('followers', this.marketing.followers - f); } return r; }
  runCampaign(id) { const f = this.marketing.followers, ok = this.marketing.run(id, this.marketingPower); if (ok) this.missions.record('followers', this.marketing.followers - f); return ok; }
  trainStaff(e) { const ok = this.staff.train(e); if (ok) this.missions.record('train'); return ok; }
  /** Where the salon stands, for missions that track it. */
  #missionState(kind) {
    return { comfort: Math.round(this.comfort), hire: this.staff.hired.length, assistant: this.staff.support.filter(e => e.effect === 'tidy' && e.hired).length, regulars: this.regulars }[kind] ?? 0;
  }
  syncMissions() { this.missions.sync(k => this.#missionState(k)); }
  claimMission(i) { return this.missions.claim(i, this.progression.level, f => this.isUnlocked(f), k => this.#missionState(k)); }
  expand() { const next = this.layout.nextExpansion; if (!next || !this.isUnlocked(next.requires) || !this.economy.spend('expansion', next.cost)) return false; this.layout.tier++; if (this.layout.tier === 2) this.layout.addAnnexPlants(); return true; }
  tick(dt) {
    this.clock.tick(dt); this.operatingCosts.accrue(this.clock.workedFraction);
    if (this.trollAt != null && this.clock.elapsed >= this.trollAt) { this.trollAt = null; this.#post(this.reviews.troll(this.clock.day)); }
  }
  startDay() {
    if (this.nextHours) { this.clock.setHours(...this.nextHours); this.nextHours = null; }
    this.economy.startDay(); this.operatingCosts.startDay(); this.staff.startDay(this.clock.day);
    this.missions.fill(this.progression.level, f => this.isUnlocked(f), k => this.#missionState(k));
    this.servedToday = 0; this.repAtDayStart = this.reputation.value; this.followersAtDayStart = this.marketing.followers; this.incidents = blankIncidents(); this.report = null;
    if (!this.month.start) this.month.begin(this.#monthSnapshot());
    if (this.isSunday) { this.#dayOff(); return; }
    this.dayOff = false; this.marketing.startDay();
    const move = this.rival.startDay(this.clock.day, this.standing);
    if (move) this.news.push(move);
    // A discounting rival tempts a few regulars away.
    this.regulars = Math.max(0, this.regulars - Math.round(this.regulars * this.rival.discount * .2));
    this.trollAt = Math.random() < this.trollChance ? rand(.1, .9) * this.clock.dayLength : null;
    this.clock.startDay();
  }
  nextDay() { this.clock.day++; this.startDay(); }
  /**
   * Sunday: the salon stays closed. Rent and upkeep still fall due, nobody is paid wages and the team rests.
   * The week is settled; the player can rearrange the salon and see to the money before Monday.
   */
  #dayOff() {
    this.dayOff = true; this.trollAt = null; this.clock.isOpen = false; this.clock.elapsed = 0;
    this.operatingCosts.chargeDayOff(); this.staff.restDay();
    const sunday = { day: this.clock.day, ...this.economy.closeDay(), served: 0, reputation: 0, reviews: { count: 0, average: 0 }, followers: { change: 0 } };
    this.month.log(sunday); if (MonthlyLedger.isMonthEnd(this.clock.day)) this.#settleMonth(sunday);
    this.weekReport = this.#weekSummary([...this.weekLog, sunday]); this.weekLog = [];
    this.save();
  }
  /** Adds up a week of daily reports. */
  #weekSummary(days) { return { week: Math.ceil(this.clock.day / 7), from: days[0].day, to: this.clock.day, ...summariseDays(days) }; }
  /** What the month is measured against: cash, reviews and what each stylist has made so far. */
  #monthSnapshot() { return { cash: this.economy.cash, reviews: this.reviews.count, staff: Object.fromEntries(this.staff.all.map(e => [e.name, { earn: e.stats.earn, served: e.stats.served }])) }; }
  /** The last day of a month: pays the goal if it was met, then settles the month and sets the next goal. */
  #settleMonth(last) {
    const goal = this.month.goal, hit = !!goal && this.month.revenueSoFar >= goal.revenue;
    if (hit) { this.economy.fund('monthGoal', goal.reward); last.funding = { ...last.funding, monthGoal: goal.reward }; }
    this.month.settle(this.clock.day, this.#monthSnapshot(), hit);
  }
  get monthReport() { return this.month.report; }
  /** Whether a month was settled at the end of today. */
  get monthClosedToday() { return !!this.month.report && this.month.report.to === this.clock.day; }
  /** This month's goal and how far along it is. */
  get monthProgress() {
    const today = this.report || this.dayOff ? 0 : this.economy.dailyRevenue;
    return { goal: this.month.goal, revenue: this.month.revenueSoFar + today, day: (this.clock.day - 1) % MONTH_DAYS + 1, month: MonthlyLedger.monthOf(this.clock.day) };
  }
  closeDay() {
    const e = this.economy, sales = this.layout.dailySales * (this.isUnlocked('brandLine') ? 2 : 1);
    if (sales) e.earn('products', sales);
    this.operatingCosts.accrue(1); this.#autoReply();
    this.resignations = this.staff.closeDay(this.clock.day, this.layout.staffRestRate, this.clock.hours);
    const money = this.finance.closeDay(e.dailyProfit, e.dailyRevenue, this.clock.day);
    if (money.news) this.news.push('fin:' + money.news);
    // An academy gives everyone a daily lesson.
    const lesson = this.has('academy') ? 15 : 5;
    [this.staff.owner, ...this.staff.working(this.clock.day)].forEach(e => { if (e.gainExperience(lesson)) this.bus.emit('staff:levelup', e); });
    const reviews = this.reviews.today(this.clock.day);
    this.report = {
      day: this.clock.day, ...e.closeDay(), reputation: this.reputation.value - this.repAtDayStart,
      reviews: { count: reviews.length, average: reviews.length ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0 },
      followers: { now: this.marketing.followers, change: this.marketing.followers - this.followersAtDayStart }, incidents: { ...this.incidents }, served: this.servedToday,
    };
    this.weekLog.push(this.report);
    this.month.log(this.report); if (MonthlyLedger.isMonthEnd(this.clock.day)) this.#settleMonth(this.report);
    this.recentRevenue.push(this.report.totalRevenue); if (this.recentRevenue.length > 6) this.recentRevenue.shift();
    this.updateProgress(); this.save(); return this.report;
  }
  save() { this.saves.save(this.serialize()); }
  serialize() {
    return { day: this.clock.day + 1, economy: this.economy, reputation: this.reputation.value, level: this.progression.level, served: this.served, satisfactionSum: this.satisfactionSum, priceLevel: this.priceLevel, staff: this.staff.all, support: this.staff.support, layout: this.layout, marketing: this.marketing, reviews: this.reviews, reviewRewards: this.reviewRewards, hospitality: this.hospitality, finance: this.finance, rival: this.rival, regulars: this.regulars, staffPolicy: this.staff, hours: this.nextHours || [this.clock.openHour, this.clock.closeHour] , missions: this.missions, weekLog: this.weekLog, month: this.month, recentRevenue: this.recentRevenue };
  }
  restore(d) {
    this.clock.day = d.day; this.economy.restore(d.economy); this.reputation.value = d.reputation; this.progression.level = d.level;
    this.served = d.served; this.satisfactionSum = d.satisfactionSum; this.priceLevel = d.priceLevel; this.recentRevenue = d.recentRevenue || [];
    // The old self-running branches are gone: pay back what they cost.
    const refund = (d.franchise || []).reduce((sum, id) => sum + (OLD_BRANCH_COST[id] || 0), 0);
    if (refund) { this.economy.cash += refund; this.news.push('fin:branchRefund'); }
    d.staff.forEach(s => this.staff.find(LEGACY_IDS[s.id] || s.id)?.restore(s));
    (d.support || []).forEach(s => this.staff.find(LEGACY_IDS[s.id] || s.id)?.restore(s));
    this.layout.restore(d.layout);
    (d.reviews?.list || []).forEach(r => { if (r.visit && RENAMED[r.visit.stylist]) r.visit.stylist = RENAMED[r.visit.stylist]; });
    this.marketing.restore(d.marketing); this.reviews.restore(d.reviews); this.reviewRewards.restore(d.reviewRewards, this.reviews); this.hospitality.restore(d.hospitality);
    this.finance.restore(d.finance); this.rival.restore(d.rival); this.regulars = d.regulars || 0; this.staff.restore(d.staffPolicy);
    if (d.hours) this.clock.setHours(...d.hours);
    this.missions.restore(d.missions); this.weekLog = d.weekLog || [];
    this.month.restore(d.month, this.#monthSnapshot());
  }
}
