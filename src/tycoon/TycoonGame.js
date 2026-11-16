import { EventBus } from '../core/EventBus.js';
import { GameClock } from '../core/GameClock.js';
import { SaveManager } from '../core/SaveManager.js';
import { Economy } from './Economy.js';
import { DailyMetrics } from './DailyMetrics.js';
import { PerformanceExplainer } from './PerformanceExplainer.js';
import { DecisionAdvisor } from './DecisionAdvisor.js';
import { Reputation } from './Reputation.js';
import { Progression } from './Progression.js';
import { OperatingCosts } from './OperatingCosts.js';
import { Marketing, HAIR_SHOW, AGENCY, CAMPAIGNS, CHANNELS } from './Marketing.js';
import { ReviewBoard } from './ReviewBoard.js';
import { ReviewRewards } from './ReviewRewards.js';
import { Hospitality } from './Hospitality.js';
import { Finance } from './Finance.js';
import { Rival, MATCH_PRICE, POACH_CHANCE, POACH_STRESS, SCOUT_COST, SCOUT_LEVEL } from './Rival.js';
import { contestFor, runContest, CONTESTS, BOOST_DAYS } from './Contests.js';
import { Brand, ONLINE } from './Brand.js';
import { Headquarters, ORDERS, TRUST, HQ_LEVEL, talkOdds } from './Headquarters.js';
/** Minutes before closing that new clients stop being taken; overtime pays time and a half. */
export const LAST_CALLS = [0, 30, 60];
const OVERTIME_RATE = 1.5;
import { Missions } from './Missions.js';
import { MonthlyLedger, MONTH_DAYS, summariseDays } from './MonthlyLedger.js';
import { seasonOf, SEASONS, eventsOn, rollHappening, combine, HAPPENINGS, dateOf, setCalendarOrigin, originFor } from './Calendar.js';
import { SYNERGIES, teamOf } from './Synergies.js';
import { trendsFor, GRADE_PAY, TREND_PAY, TREND_PERK_SATISFACTION } from '../hair/StyleMenu.js';
import { WEATHER, SURPRISES, rollWeather, rollSurprise, SNOW_RATE, SNOW_MELT } from './Weather.js';
import { RegularBook, FAVOURITE_SATISFACTION, HEART_LOYAL, LOYAL_PAY, OCCASION_PAY, STORY_REWARDS } from './Regulars.js';
import { rollSpecial, SPECIAL_FAIL_REP, SPECIAL_PRICE, SPECIAL_PATIENCE } from './SpecialClients.js';
import { StaffManager } from '../employees/StaffManager.js';
import { TRAITS } from '../employees/Traits.js';
import { MGMT } from '../employees/Management.js';
import { CERTS, hasCert, certSatisfaction } from '../employees/Career.js';
import { CustomerFactory } from '../customers/CustomerFactory.js';
import { ServiceEvaluator } from '../customers/ServiceEvaluator.js';
import { rollVillain } from '../customers/Villains.js';
import { SalonLayout } from '../building/SalonLayout.js';
import { FURNITURE } from '../building/FurnitureCatalog.js';
import { shows } from './Features.js';
import { Onboarding } from './Onboarding.js';
import { rand, clamp } from '../core/math.js';

export const PRICE_MULTIPLIER = [.8, 1, 1.5, 2.2], PRICE_DEMAND = [1.3, 1, .7, .45];
/** Opening the second salon: needs level 5, the first salon two expansions big and a good week's takings, then the money. */
export const BRANCH = { cost: 30000, weekRevenue: 9000, tier: 2 };
// What the old franchise branches cost, to pay them back to saves from before the second salon.
const OLD_BRANCH_COST = { downtown: 10000, premium: 18000, barber: 24000, colour: 32000 };
// People who walk past a salon nobody has heard of yet and come in, per eight hours.
const WALK_INS = 2.5;
const MATERIALS = { colour: 18, wave: 14 }, CARD_FEE = .016, SPA_FEE = 45;
/** Unlocks from level 8: booked clients, clinic treatments, membership, sponsorship and Sunday seminars. */
export const BOOKED_SHARE = .3, BOOKED_PATIENCE = 1.5, TREATMENT_FEE = 45, TREATMENT_SHARE = .4, MEMBERSHIP_FEE = 3, SPONSOR_MAX = 1500, SEMINAR_BASE = 1000, SEMINAR_PER_LEVEL = 300;
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
    this.metrics = new DailyMetrics(); this.explainer = new PerformanceExplainer(); this.advisor = new DecisionAdvisor();
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
    // Today's happening (an outage, a festival, an inspection...), what it does today, and a cut trend that lasts a few days.
    this.happening = null; this.happeningFx = {}; this.trendUntil = 0;
    // Today's weather and tomorrow's forecast; a surprise in the middle of the day, and what it does until closing.
    this.weather = 'sunny'; this.forecast = null; this.surprise = null; this.surpriseFx = {};
    // Snow lying on each salon's pavement, 0 to 1; and where the calendar starts (see Calendar.js).
    this.snow = [0, 0]; this.calendarOrigin = 0;
    this.rival = new Rival();
    // Matching a price war until this day, a poaching attempt waiting for the morning, this month's contest, past results and a podium's lift in demand.
    this.brand = new Brand();
    this.onboarding = new Onboarding();
    // Shawn's orders and what they have set going: price lock, promotion, longer hours, commission, a product due.
    this.hq = new Headquarters(); this.hqFx = {};
    this.matchUntil = 0; this.poach = null; this.contest = null; this.contestLog = []; this.contestBoost = null; this.contestResult = null; this.storyBoost = null; this.storyPerks = { hospitality: 0, contest: 0 };
    this.customers = new CustomerFactory();
    this.evaluator = new ServiceEvaluator();
    this.saves = new SaveManager('cut-and-dried-career-v2');
    this.priceLevel = 1; this.served = 0; this.servedToday = 0; this.satisfactionSum = 0; this.lastSatisfaction = 0;
    this.repAtDayStart = 0; this.followersAtDayStart = 0; this.incidents = blankIncidents(); this.trollAt = null; this.report = null;
    // Regular clients come back on their own; stylists who want to quit and rival news wait for the morning.
    this.regulars = 0; this.resignations = []; this.news = []; this.dirt = 0; this.nextHours = null; this.lastCall = 30;
    // The regulars with names and stories, and today's special booking with a log of past ones.
    this.regularBook = new RegularBook(); this.special = null; this.specialLog = [];
  }
  /** 0 for Monday up to 6 for Sunday; day 1 is a Monday. */
  get weekday() { return (this.clock.day - 1) % 7; }
  get isSunday() { return this.weekday === 6; }
  get context() { return { served: this.served, staff: this.staff.hired.length, rep: this.reputation.value, earned: this.economy.totalEarned, branch: this.layout.branchOpen, branchTier: this.layout.branchTier, reviews: this.reviews.count, rating: this.reviews.count ? this.reviews.rating : 0, regulars: this.regulars, followers: this.marketing.followers }; }
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
  /** Today's season, calendar events, happening and trend, as one set of multipliers (see Calendar.js). */
  get dayFx() {
    const day = this.clock.day, trend = day <= this.trendUntil ? HAPPENINGS.find(h => h.id === 'trend').effect : null;
    return combine(SEASONS[seasonOf(day)], ...eventsOn(day), this.happeningFx, trend, WEATHER[this.weather], this.surpriseFx);
  }
  /** Starts the day's happening: judged on the spot (inspection), news (a trend, rain), or a choice for the player. */
  #startHappening(h) {
    const day = this.clock.day;
    if (h.inspection) {
      const pass = Math.random() < (this.dirt < 300 ? .7 : .3) + (this.layout.items.some(it => it.id === 'sterilizer') ? .25 : 0);
      if (pass) this.reputation.add(3); else { this.economy.charge('fine', 500); this.reputation.add(-4); }
      this.happening = { id: h.id, kind: 'inspection', pass }; return;
    }
    if (h.days) { this.trendUntil = day + h.days - 1; this.happening = { id: h.id, kind: 'news' }; return; }
    this.happeningFx = { ...h.effect };
    this.happening = h.fix ? { id: h.id, kind: 'fix', cost: h.fix } : h.offer ? { id: h.id, kind: 'offer', ...h.offer } : { id: h.id, kind: 'news' };
  }
  /** The surprise arrives: its effect starts now. Returns what the scene shows. */
  triggerSurprise() {
    const s = this.surprise; if (!s || s.state !== 'due') return null;
    const def = SURPRISES.find(x => x.id === s.id); s.state = 'on';
    if (def.effect) this.surpriseFx = { ...def.effect };
    if (def.followers) this.marketing.addFollowers(def.followers);
    return { ...def, ...s };
  }
  /** Pays for the quick repair: the surprise's effect ends. */
  fixSurprise() { const s = this.surprise, def = s && SURPRISES.find(x => x.id === s.id); if (!def || !def.fix || s.state !== 'on' || !this.economy.spend('repairs', def.fix)) return false; this.surpriseFx = {}; s.state = 'fixed'; return true; }
  /** Starts a given surprise now (for tests). */
  beginSurprise(id) { this.surprise = { id, hour: 0, state: 'due' }; this.surpriseFx = {}; return this.triggerSurprise(); }
  /** Starts a given happening today (for tests and scripted moments). */
  beginHappening(id) { const h = HAPPENINGS.find(x => x.id === id); if (h) { this.happening = null; this.happeningFx = {}; this.#startHappening(h); } }
  /** The player's answer to today's happening: pay to fix it (the penalty is lifted) or take up the offer. */
  resolveHappening(accept) {
    const h = this.happening; if (!h || !accept) return false;
    if (h.kind === 'fix' && this.economy.spend('repairs', h.cost)) { this.happeningFx = {}; return true; }
    if (h.kind === 'offer' && this.economy.spend('marketing', h.cost)) { this.marketing.addFollowers(h.followers); return true; }
    return false;
  }
  get demandParts() {
    return {
      add: { walk: WALK_INS, branch: this.layout.branchOpen ? (WALK_INS + this.comfortAt(1) * .15) * this.branchDeskReach : 0, rep: this.reputation.value * .25, comfort: this.comfort * .15, followers: this.marketing.followerClients, regulars: this.isUnlocked('stamp') ? Math.min(20, this.regulars * .16) : Math.min(15, this.regulars * .12) },
      mult: { price: PRICE_DEMAND[this.priceLevel], marketing: this.marketing.demandMultiplier, reviews: this.reviews.demandMultiplier, rival: 1 - this.rival.pull(this.standing) + (this.rival.open ? this.rival.effect.spill || 0 : 0), award: this.isUnlocked('award') ? 1.1 : 1, calendar: this.dayFx.demand ?? 1, booking: this.isUnlocked('booking') ? 1.08 : 1, fame: this.isUnlocked('hallOfFame') ? 1.05 : 1, contest: this.contestBoost && this.clock.day <= this.contestBoost.until ? this.contestBoost.mult : 1, story: this.storyBoost && this.clock.day <= this.storyBoost.until ? this.storyBoost.mult : 1, hq: this.promoOn ? ORDERS.promo.demand : 1, signs: [0, 1].reduce((k, s) => k * (this.layout.countAt('signboard', s) ? FURNITURE.signboard.demand : 1), 1) },
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
  /** How fast a kind of service goes at a salon: its furniture and today's team synergies. */
  speedFor(type, site = 0) { const fx = this.dayFx; return this.layout.speedBonusAt(site, type) * this.processSpeedFor(type) * (fx.speed ?? 1) * this.staff.pace * (type === 'shampoo' ? fx.wash ?? 1 : type === 'dry' ? fx.dry ?? 1 : 1); }
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
  get standing() { return { rating: this.reviews.count ? this.reviews.rating : 0, followers: this.marketing.followers, priceLevel: this.priceLevel, matching: this.matching }; }
  /** True while we are matching the rival's price war. */
  get matching() { return this.clock.day <= this.matchUntil; }
  /** Our share of the street's would-be clients today. */
  get marketShare() { return 1 - this.rival.pull(this.standing); }
  /** Researches a product for the brand: the quality is set by today's team and Lia. */
  startResearch(type, line) { return this.brand.startResearch(type, line, this.economy, this.brand.expectedQuality(type, [this.staff.owner, ...this.staff.hired], this.staff.management), this.clock.day); }
  /** Displays at both salons, which make clients likelier to buy at the desk. */
  get displays() { return this.layout.items.filter(it => it.id === 'displayTable' || it.id === 'shelf').length; }
  /** A paying client may buy one of the brand's products at the desk. */
  brandSale(satisfaction) { const s = this.brand.deskSale(satisfaction, this.displays); if (s) this.economy.earn('brand', s.price); return s; }
  /** The marketing agency, when it is on: its fee, a post on every ready channel and a campaign kept running, each at a markup. */
  #agencyMorning() {
    const m = this.marketing, A = m.auto, day = this.clock.day, e = this.economy; m.autoLog = [];
    if (!A.posts && !A.ads) return;
    e.charge('agency', AGENCY.fee);
    if (A.posts) for (const id of Object.keys(CHANNELS)) { const def = CHANNELS[id]; if ((def.unlock && !this.isUnlocked(def.unlock)) || !m.canPost(id, day) || !e.canAfford(def.cost * (1 + AGENCY.postMarkup))) continue;
      const f = m.followers, r = m.post(id, day, this.reelQuality * AGENCY.quality, this.marketingPower); if (!r) continue; e.charge('agency', Math.round(def.cost * AGENCY.postMarkup)); this.missions.record('post'); this.missions.record('followers', m.followers - f); m.autoLog.push({ id, gained: r.gained, viral: r.viral }); }
    if (A.ads && !Object.keys(CAMPAIGNS).some(id => m.isRunning(id))) { const id = e.cash >= AGENCY.adCash ? 'instaAd' : 'flyers', c = CAMPAIGNS[id];
      if (e.canAfford(c.cost * (1 + AGENCY.adMarkup)) && this.runCampaign(id)) { e.charge('agency', Math.round(c.cost * AGENCY.adMarkup)); m.autoLog.push({ id }); } }
  }
  /** Shawn's side of the morning: orders that run out or fall due, and maybe a new one (given straight away when his trust is low). */
  #hqMorning() {
    const day = this.clock.day, F = this.hqFx;
    if (F.commission && day > F.commission.until) { this.staff.setCommission(F.commission.base); delete F.commission; }
    if (F.price && day > F.price) delete F.price;
    if (F.promo && day > F.promo) delete F.promo;
    if (F.product) { if (this.brand.research || this.brand.products.length > F.product.had) { this.hq.shift(TRUST.done); this.news.push('hq:done'); delete F.product; } else if (day > F.product.due) { this.hq.shift(TRUST.ignored); this.news.push('hq:ignored'); delete F.product; } }
    const o = this.hq.startDay(day, this.progression.level, this.finance.investorShare > 0, id => this.#canOrder(id));
    if (o && this.hq.bossy) { this.#applyOrder(o); this.hq.close('given'); this.news.push('hq:given:' + o.id); }
  }
  #canOrder(id) {
    const F = this.hqFx, top = this.isUnlocked('luxury') ? 3 : 2;
    return { priceUp: () => this.priceLevel < top && !F.price, promo: () => !F.promo, longHours: () => !F.hours && this.plannedHours[1] < ORDERS.longHours.maxClose, agency: () => true,
      noCommission: () => !F.commission && this.staff.commission > 0, newProduct: () => !F.product && this.progression.level >= ORDERS.newProduct.level && !this.brand.research && this.brand.products.length < 6 }[id]();
  }
  /** Carries out an order. */
  #applyOrder(o) {
    const day = this.clock.day, O = ORDERS[o.id], F = this.hqFx;
    if (o.id === 'priceUp') { this.priceLevel = Math.min(this.isUnlocked('luxury') ? 3 : 2, this.priceLevel + 1); F.price = day + O.days - 1; }
    else if (o.id === 'promo') F.promo = day + O.days - 1;
    else if (o.id === 'longHours') { const base = this.plannedHours; this.nextHours = [base[0], Math.min(O.maxClose, base[1] + 1)]; F.hours = { until: day + O.days, base }; }
    else if (o.id === 'agency') { this.economy.charge('marketing', o.cost); this.marketing.addFollowers(o.followers); }
    else if (o.id === 'noCommission') { F.commission = { until: day + O.days - 1, base: this.staff.commission }; this.staff.setCommission(0); }
    else if (o.id === 'newProduct') F.product = { due: day + O.days, had: this.brand.products.length };
    this.hq.version++;
  }
  /** The odds a one-to-one talks Shawn out of an order right now. */
  get hqTalkOdds() { return talkOdds({ mgmt: this.staff.management, trust: this.hq.trust, rating: this.reviews.count ? this.reviews.rating : 0, weekProfit: this.weekReport ? this.weekReport.profit : 0 }); }
  /** Answers Shawn's order: 'accept', 'talk' (a one-to-one: talked out of it, or overruled) or 'refuse' (only with enough trust). */
  answerOrder(how) {
    const o = this.hq.order; if (!o) return null;
    if (how === 'refuse') { if (!this.hq.canRefuse) return null; this.hq.shift(TRUST.refuse); this.hq.close('refused'); return 'refused'; }
    if (how === 'talk') { if (Math.random() < this.hqTalkOdds) { this.hq.shift(TRUST.talkWin); this.hq.close('talked'); return 'talked'; } this.hq.shift(TRUST.talkLose); this.#applyOrder(o); this.hq.close('overruled'); return 'overruled'; }
    this.hq.shift(TRUST.accept); this.#applyOrder(o); this.hq.close('accepted'); return 'accepted';
  }
  /** Days left on a price fixed by Shawn, or 0. */
  get priceLocked() { return this.hqFx.price >= this.clock.day ? this.hqFx.price - this.clock.day + 1 : 0; }
  get promoOn() { return this.hqFx.promo >= this.clock.day; }
  /** Matches the rival's discount for as long as it runs. */
  matchPriceWar() { if (!this.rival.open || !this.rival.discount) return false; this.matchUntil = this.clock.day + Math.max(0, this.rival.daysLeft - 1); this.rival.version++; return true; }
  /** The cost of scouting one of the rival's stylists, or null when it cannot be done. */
  scoutCost(id) { const r = this.rival; return r.open && this.progression.level >= SCOUT_LEVEL && r.stylists.includes(id) ? SCOUT_COST[r.tier] : null; }
  /** The player's answer to the rival trying to poach a stylist: match the offer, talk them round, or let them go. */
  resolvePoach(how) {
    const p = this.poach, e = p && this.staff.find(p.id); this.poach = null; if (!e || !e.hired) return null;
    if (how === 'match') { e.raises++; e.salary = Math.round(e.baseSalary * 1.15 ** e.raises); e.addStress(-10); return 'stayed'; }
    if (how === 'talk' && Math.random() < this.staff.persuadeChance(e)) { e.persuaded++; return 'stayed'; }
    e.quits = true; this.rival.gain(); return 'left';
  }
  /** Enters a stylist (or Lia) in this month's contest with a concept, paying the fee. */
  enterContest(id, concept) {
    const c = this.contest; if (!c || c.entrant || this.clock.day >= c.day) return false;
    const e = id === 'owner' ? this.staff.owner : this.staff.find(id); if (!e || !e.hired || !this.economy.spend('contest', CONTESTS[c.kind].fee)) return false;
    Object.assign(c, { entrant: e.id, concept }); return true;
  }
  /** Contest day (a Sunday): the result, prizes and the lift in demand. */
  #holdContest() {
    const c = this.contest; if (!c || c.result || !c.entrant) return;
    const e = c.entrant === 'owner' ? this.staff.owner : this.staff.find(c.entrant); if (!e || !e.hired) { c.result = { withdrew: true }; return; }
    const def = CONTESTS[c.kind], run = runContest(c, e, e === this.staff.owner, this.rival, id => this.staff.find(id)?.name || id, this.storyPerks.contest), place = run.place; this.storyPerks.contest = 0;
    if (place < 3) { this.economy.earn('contest', def.prizes[place]); this.marketing.addFollowers(def.followers[place]); this.reputation.add(def.rep[place]); this.contestBoost = { mult: def.boost[place], until: this.clock.day + BOOST_DAYS }; e.awards = [...(e.awards || []), { kind: c.kind, category: c.category, place, month: c.month }]; e.addStress(-10); }
    else e.addStress(5);
    e.gainExperience(80);
    c.result = { place, ranking: run.ranking, name: e.name };
    this.contestLog.unshift({ month: c.month, kind: c.kind, category: c.category, name: e.name, place, score: run.ranking[place].score }); this.contestLog.length = Math.min(this.contestLog.length, 8);
    this.contestResult = { ...c.result, kind: c.kind, category: c.category, prize: place < 3 ? def.prizes[place] : 0, followers: place < 3 ? def.followers[place] : 0, rep: place < 3 ? def.rep[place] : 0 };
  }
  /** How well the front desk runs marketing: Ruby's marketing skill, or Lia doing it herself without her. */
  get marketingPower() { const r = this.staff.receptionist; return r.hired ? .75 + (r.skills.marketing || 0) / 200 : .5; }
  /** Furniture comfort plus a tidy floor while the assistant is employed. */
  /** Furniture comfort, plus a tidy floor while an assistant is employed, minus hair left lying on the floor. */
  get comfort() { return this.comfortAt(0); }
  /** Comfort at one salon: its furniture, a tidy floor while an assistant is employed, minus hair left lying around. */
  comfortAt(site) { const dirt = Math.min(4, Math.floor(this.dirt / 150)) * (this.layout.countAt('airPurifier', site) ? FURNITURE.airPurifier.cleanAir : 1); return this.layout.comfortAt(site) + (this.staff.hasSupport('tidy') ? 2 : 0) - Math.floor(dirt); }
  get averageSatisfaction() { return this.served ? this.satisfactionSum / this.served : 0; }
  /** How good a reel filmed right now looks: the latest finished style, the salon and its rating. */
  has(id) { return this.layout.items.some(it => it.id === id); }
  get reelQuality() { return clamp(.1 + this.synergies.reduce((n, x) => n + (x.reel || 0), 0) + (this.has('photoZone') ? .12 : 0) + Math.min(.2, this.staff.hired.filter(e => e.hasPerk('trend')).length * .1) + .55 * this.lastSatisfaction + this.comfort * .012 + (this.reviews.count ? (this.reviews.rating - 3) * .05 : 0)); }
  /** Chance that someone posts a fake one-star review today; a bigger audience attracts more of them. */
  get trollChance() { return this.progression.level < 2 ? 0 : Math.min(.45, .12 + this.marketing.followers / 4000); }
  updateProgress() { this.progression.update(this.context); this.syncMissions(); this.#applySynergyBoosts(); }
  isUnlocked(feature) { return this.progression.isUnlocked(feature); }
  /** Clients arrive at the same rate whatever the hours, so a longer day brings more of them. `dailyDemand` is per eight hours. */
  nextArrival() { return rand(.8, 1.2) * this.clock.hourLength * 8 / this.dailyDemand; }
  setHours(open, close) { this.nextHours = open === this.clock.openHour && close === this.clock.closeHour ? null : [open, close]; }
  /** Tomorrow's hours as [open, close]. */
  /** New clients are taken until `lastCall` minutes before closing. */
  get accepting() { return this.clock.isOpen && this.clock.hour < this.clock.closeHour - this.lastCall / 60; }
  setLastCall(min) { if (LAST_CALLS.includes(min)) this.lastCall = min; }
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
    const booked = walkIn && this.isUnlocked('booking') && Math.random() < BOOKED_SHARE, fx = this.dayFx;
    // Sometimes the walk-in is a regular from the book, coming back.
    const visit = walkIn ? this.regularBook.visitor(site, this.clock.day, usedNames) : null, reg = visit && visit.entry;
    const influencer = walkIn && !reg ? this.marketing.takeInfluencer() : null;
    const c = this.customers.create(usedNames, {
      colour: this.isUnlocked('colour'), perm: this.isUnlocked('perm'), advancedCuts: this.isUnlocked('chairs'),
      vipChance: this.isUnlocked('vip') ? .18 : 0, priceMultiplier: PRICE_MULTIPLIER[this.priceLevel] * (this.matching ? MATCH_PRICE : 1) * (this.promoOn ? ORDERS.promo.price : 1), patienceMultiplier: (1 + this.comfortAt(site) * .03) * (this.staff.hasSupport('reception', site) ? 1.15 : 1) * (booked ? BOOKED_PATIENCE : 1) * (this.layout.countAt('kiosk', site) ? FURNITURE.kiosk.patience : 1) * (this.layout.countAt('chargingStation', site) ? FURNITURE.chargingStation.patience : 1) * (fx.patience ?? 1),
      villain: walkIn && !influencer && !reg ? rollVillain(this.progression.level) : null, influencer, budgetFactor: this.rival.budgetFactor(this.matching) * (fx.budget ?? 1),
      colourBias: (fx.colour ?? 1) / (fx.cut ?? 1), permBias: (fx.perm ?? 1) / (fx.cut ?? 1), as: reg, trends: this.trends,
    });
    c.site = site; c.booked = booked;
    if (reg) {
      Object.assign(c, { regular: reg, preferredStylist: reg.stylist, chapter: visit.chapter, occasion: visit.occasion, sendsFriend: visit.friend });
      if (c.occasion) { c.price = Math.round(c.price * OCCASION_PAY); c.budget = Math.round(c.budget * OCCASION_PAY); }
    }
    if (c.vip) { const k = this.synergies.reduce((m, x) => m * (x.vipPatience || 1), 1); c.pat *= k; c.maxPat *= k; }
    return c;
  }
  /** Today's special client, at the main salon at the hour they booked. */
  newSpecial(usedNames) {
    const s = this.special; if (!s || s.state !== 'due') return null;
    const c = this.customers.create(usedNames, {
      colour: this.isUnlocked('colour'), perm: this.isUnlocked('perm'), advancedCuts: this.isUnlocked('chairs'), vipChance: 0,
      priceMultiplier: PRICE_MULTIPLIER[this.priceLevel] * SPECIAL_PRICE, patienceMultiplier: SPECIAL_PATIENCE * (1 + this.comfortAt(0) * .03), budgetFactor: SPECIAL_PRICE,
      as: s.kind === 'bride' ? { gender: 'f' } : null, trends: this.trends,
    });
    Object.assign(c, { site: 0, booked: true, special: s.kind, specialNeed: s.need }); s.state = 'arrived'; s.name = c.name;
    return c;
  }
  /** Grants a stylist's wish from their last one-to-one. */
  grantWish(e) { const ok = this.staff.grantWish(e, this.clock.day, () => this.canShiftHours(1, -1) && this.shiftHours(1, -1)); if (ok) this.save(); return ok; }
  /** The grade a stylist's services are priced at. */
  gradeOf(worker) { return worker === this.staff.owner ? 'owner' : GRADE_PAY[worker.rank] ? worker.rank : 'designer'; }
  /** This month's trending styles. */
  get trends() { return trendsFor(Math.floor((this.clock.day - 1) / MONTH_DAYS)); }
  serviceProfileOf(worker, site = 0) { return worker.serviceProfile(this.layout.speedBonusAt(site, 'cut')); }
  /** Colour and perm products for a service; a stockroom at that salon buys them for less. */
  chargeMaterials(ops, site = 0) { const k = (this.layout.countAt('stockroom', site) ? FURNITURE.stockroom.materials : 1) * (this.dayFx.materials ?? 1); ops.forEach(op => { if (MATERIALS[op.type]) this.economy.charge('materials', Math.round(MATERIALS[op.type] * k)); }); }
  completeService(customer, worker, byOwner) {
    const comfort = this.comfortAt(customer.site || 0), syn = this.synergies, result = this.evaluator.evaluate(customer, worker, comfort, {
      satisfaction: syn.reduce((n, s) => n + (s.satisfaction || 0) + (customer.requestedService === 'colour' ? s.colourSatisfaction || 0 : 0), 0) + (this.isUnlocked('hallOfFame') ? .02 : 0) + (this.layout.countAt('sterilizer', customer.site || 0) ? FURNITURE.sterilizer.satisfaction : 0)
        + (customer.regular && customer.regular.stylist === worker.name ? FAVOURITE_SATISFACTION : 0) + (customer.trending && worker.hasPerk('trend') ? TREND_PERK_SATISFACTION : 0)
        + (TRAITS[worker.trait]?.satisfaction || 0) + (customer.requestedService === 'colour' ? TRAITS[worker.trait]?.colourSatisfaction || 0 : 0) + certSatisfaction(worker, customer), calm: syn.some(s => s.calm),
    });
    // Priced by the grade of whoever did it, and a month's trend pays more.
    result.payment = Math.round(result.payment * GRADE_PAY[this.gradeOf(worker)] * (customer.trending ? TREND_PAY : 1));
    if (customer.regular && customer.regular.hearts >= HEART_LOYAL) result.payment = Math.round(result.payment * LOYAL_PAY);
    if (customer.vip) result.payment = Math.round(result.payment * syn.reduce((k, s) => k * (s.vipPay || 1), 1));
    if (customer.vip && byOwner) result.payment = Math.round(result.payment * 1.2);
    if (customer.vip && worker.hasPerk('vip')) result.payment = Math.round(result.payment * 1.2);
    if (customer.vip && customer.vipRoom) result.payment = Math.round(result.payment * 1.25);
    if (customer.vip && this.layout.countAt('champagneFridge', customer.site || 0)) result.payment = Math.round(result.payment * FURNITURE.champagneFridge.vipPay);
    // A head spa is an add-on the client pays for.
    { const fx = this.dayFx, k = (fx.pay ?? 1) * (customer.requestedService === 'haircut' ? fx.cutPay ?? 1 : 1); if (k !== 1 && !customer.influencer) result.payment = Math.round(result.payment * k); }
    if (customer.spa && !customer.influencer) result.payment += SPA_FEE;
    // A clinic treatment after colour or perm: paid on top, and the hair feels better for it.
    if (this.isUnlocked('treatment') && !customer.influencer && ['colour', 'perm'].includes(customer.requestedService) && Math.random() < TREATMENT_SHARE + (this.layout.countAt('scalpScanner', customer.site || 0) ? FURNITURE.scalpScanner.treatment : 0) + (hasCert(worker, 'scalp') ? CERTS.scalp.treatment : 0)) {
      customer.treatment = true; this.economy.earn('treatment', TREATMENT_FEE); result.satisfaction = Math.min(1, result.satisfaction + .04);
    }
    const gain = (result.satisfaction - .55) * 3 * (customer.vip ? 2 : 1) * (result.satisfaction > .55 ? 1 + comfort * .03 : 1);
    this.reputation.add(gain); worker.recordService(result.satisfaction, result.payment);
    if (worker !== this.staff.owner) worker.tire(14 / this.layout.staffRestRate * (this.layout.countAt('massageChair', customer.site || 0) ? FURNITURE.massageChair.staffTire : 1) * (TRAITS[worker.trait]?.tire || 1));
    // A mentor on the team helps everyone else learn faster.
    const learning = this.staff.hasPerk('mentor') && !worker.hasPerk('mentor') ? 1.5 : 1;
    if (worker.gainExperience(Math.round((result.specialist ? 15 : 10) * learning * this.staff.learning * (TRAITS[worker.trait]?.learning || 1)))) this.bus.emit('staff:levelup', worker);
    this.onboarding.served(result.satisfaction); this.served++; this.servedToday++; this.satisfactionSum += result.satisfaction; this.lastSatisfaction = result.satisfaction;
    this.metrics.service(customer, result);
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
    if (customer.villain && worker && worker !== this.staff.owner) worker.addStress((outcome.refusedRefund || outcome.refunded || outcome.haggleRefused || outcome.discount ? 7 : 4) * (this.layout.countAt('aromaDiffuser', customer.site || 0) ? FURNITURE.aromaDiffuser.calmStress : 1) * (TRAITS[worker.trait]?.villainStress || 1));
    // A regular's hearts move with the visit; other happy clients may become regulars, and a bad visit can lose one.
    let regular = null, newRegular = false;
    if (customer.regular) regular = this.#regularVisited(customer, outcome.refunded ? 0 : result.satisfaction, result.stylist);
    else if (!customer.villain && !customer.influencer && !customer.special) {
      if (result.satisfaction >= .8 && Math.random() < (this.isUnlocked('stamp') ? .5 : .35) + (worker && TRAITS[worker.trait]?.regular || 0)) { this.regulars++; newRegular = !!this.regularBook.add(customer, result.stylist, customer.site || 0, this.clock.day); }
      else if (result.satisfaction < .5 && this.regulars && Math.random() < .5) { this.regulars--; this.regularBook.trim(this.regulars); }
    }
    const special = customer.special ? this.#settleSpecial(outcome.refunded ? 0 : result.satisfaction) : null;
    let followers = 0, influencerPost = null;
    if (customer.influencer) {
      influencerPost = this.marketing.influencerPosted(customer.influencer, result.satisfaction);
      followers = influencerPost.followers; this.reputation.add(influencerPost.rep); this.missions.record('followers', followers);
    }
    return { review: this.#post(this.reviews.fromService(customer, result, this.clock.day, outcome)), followers, influencerPost, regular, newRegular, special };
  }
  /** A client who gave up waiting: a regular loses heart, a special booking is missed. */
  customerGaveUp(customer) {
    this.metrics.leave(customer, this.clock.isOpen ? 'patience' : 'closing');
    this.reputation.add(-.6); this.#post(this.reviews.walkedOut(customer, this.clock.day));
    return { regular: customer.regular ? this.#regularVisited(customer, 0, null) : null, special: customer.special ? this.#settleSpecial(0) : null };
  }
  #regularVisited(customer, satisfaction, stylist) {
    const r = this.regularBook.visited(customer.regular, { satisfaction, stylist, occasion: customer.occasion });
    if (r.lost) this.regulars = Math.max(0, this.regulars - 1);
    if (r.gift) this.economy.earn('regularGift', r.gift);
    if (r.occasionMet) this.reputation.add(1);
    if (customer.sendsFriend && satisfaction >= .6) r.friend = true;
    if (r.finished) r.reward = this.#storyReward(customer.regular);
    return r;
  }
  /** A story's ending: what that regular leaves behind (see STORY_REWARDS). Returns it, with who got a skill. */
  #storyReward(entry) {
    const R = STORY_REWARDS[entry.story] || {}, out = { ...R, story: entry.story };
    if (R.followers) this.marketing.addFollowers(R.followers);
    if (R.rep) this.reputation.add(R.rep);
    if (R.boost) this.storyBoost = { mult: R.boost[0], until: this.clock.day + R.boost[1] };
    if (R.hospitality) { this.storyPerks.hospitality += R.hospitality; this.hospitality.extra = this.storyPerks.hospitality; this.hospitality.version++; }
    if (R.contest) this.storyPerks.contest += R.contest;
    if (R.calm) [...this.staff.hired, ...this.staff.support.filter(e => e.hired)].forEach(e => { e.stress = Math.max(0, e.stress - R.calm); });
    if (R.skill) { const [k, n] = R.skill, e = [this.staff.owner, ...this.staff.hired].find(x => x.name === entry.stylist) || this.staff.owner; e.skills[k] = Math.min(100, e.skills[k] + n); out.who = e.name; }
    this.staff.version++; return out;
  }
  /** The special client's verdict: the fee, followers and reputation if they were pleased enough, a dent in reputation if not. */
  #settleSpecial(satisfaction) {
    const s = this.special; if (!s || s.state !== 'arrived') return null;
    const ok = satisfaction >= s.need; s.state = ok ? 'done' : 'failed'; s.satisfaction = satisfaction;
    if (ok) { this.economy.earn('special', s.reward); this.marketing.addFollowers(s.followers); this.reputation.add(s.rep); }
    else this.reputation.add(SPECIAL_FAIL_REP);
    this.specialLog.unshift({ day: this.clock.day, kind: s.kind, ok, sat: Math.floor(satisfaction * 100) }); this.specialLog.length = Math.min(this.specialLog.length, 12);
    return { ok, ...s };
  }
  customerTurnedAway(customer) { this.metrics.leave(customer, 'seats'); this.#post(this.reviews.turnedAway(customer, this.clock.day)); }
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
  /** Hosts a hair show: costs money, brings followers, reputation and a week of extra clients. Once a week. */
  hostHairShow() {
    if (!this.isUnlocked('hairShow')) return null;
    const gained = this.marketing.hairShow(this.clock.day);
    if (gained == null) return null;
    this.reputation.add(HAIR_SHOW.rep); this.updateProgress(); return gained;
  }
  /** Buys the second salon's next expansion. */
  expandBranch() { const next = this.layout.nextBranchExpansion; if (!next || !this.isUnlocked(next.requires) || !this.economy.spend('expansion', next.cost)) return false; this.layout.branchTier++; this.updateProgress(); this.save(); return true; }
  expand() { const next = this.layout.nextExpansion; if (!next || !this.isUnlocked(next.requires) || !this.economy.spend('expansion', next.cost)) return false; this.layout.tier++; if (this.layout.tier === 2) this.layout.addAnnexPlants(); return true; }
  /** A new game starts on today's real date. */
  startCalendarToday(now = new Date()) { this.calendarOrigin = originFor(now.getMonth() + 1, now.getDate()); setCalendarOrigin(this.calendarOrigin); }
  /** Assistants clear some of the snow in front of a salon. */
  clearSnow(site, amount) { this.snow[site] = Math.max(0, this.snow[site] - amount); }
  tick(dt) {
    this.clock.tick(dt);
    // Snow settles while it falls and melts slowly once it stops (hardly at all in a cold snap).
    { const h = dt / this.clock.hourLength; this.snow = this.snow.map(v => this.weather === 'snow' ? Math.min(1, v + h * SNOW_RATE) : Math.max(0, v - h * SNOW_MELT * (this.weather === 'cold' ? .3 : 1))); } this.operatingCosts.accrue(this.clock.workedFraction);
    if (this.trollAt != null && this.clock.elapsed >= this.trollAt) { this.trollAt = null; this.#post(this.reviews.troll(this.clock.day)); }
  }
  startDay() {
    this.metrics.startDay();
    if (this.hqFx.hours && this.clock.day > this.hqFx.hours.until) { this.nextHours = this.nextHours || this.hqFx.hours.base; delete this.hqFx.hours; }
    if (this.nextHours) { this.clock.setHours(...this.nextHours); this.nextHours = null; }
    this.economy.startDay(); this.operatingCosts.startDay(); this.staff.startDay(this.clock.day); this.staff.welfareMorning(dateOf(this.clock.day));
    { const lv = this.progression.level, tab = { marketing: 'tab.mkt', staff: 'tab.staff', training: 'tab.staff' }; this.missions.fill(lv, f => this.isUnlocked(f) && (!tab[f] || shows(tab[f], lv)), k => this.#missionState(k)); }
    this.servedToday = 0; this.repAtDayStart = this.reputation.value; this.followersAtDayStart = this.marketing.followers; this.incidents = blankIncidents(); this.report = null; this.special = null;
    if (!this.month.start) this.month.begin(this.#monthSnapshot());
    { const day = this.clock.day, month = Math.floor((day - 1) / MONTH_DAYS), c = contestFor(month, this.progression.level);
      if (this.progression.level >= CONTESTS.local.level && (!this.contest || this.contest.month !== month) && day >= c.opens && day < c.day) { this.contest = c; this.news.push('contest:open'); } }
    this.weather = this.forecast || rollWeather(seasonOf(this.clock.day)); this.forecast = null;
    if (this.progression.level < 2) this.weather = { storm: 'rain', snow: 'cold' }[this.weather] || this.weather; this.surprise = null; this.surpriseFx = {};
    this.snow = this.snow.map(v => ['snow', 'cold'].includes(this.weather) ? v * .7 : 0);
    if (this.isSunday) { this.#dayOff(); return; }
    this.dayOff = false; this.marketing.startDay();
    // A neon sign in the window brings in followers every open day.
    { const neon = [0, 1].filter(s => this.layout.countAt('neonSign', s)).length; if (neon) this.marketing.addFollowers(neon * FURNITURE.neonSign.dailyFollowers); }
    this.happening = null; this.happeningFx = {};
    if (this.progression.level >= 2) { const h = rollHappening(); if (h) this.#startHappening(h); }
    this.special = rollSpecial(this.progression.level, this.clock.openHour, this.clock.closeHour);
    // A surprise later in the day, but never on top of a morning happening.
    if (!this.happening && this.progression.level >= 2) this.surprise = rollSurprise(this.weather, this.clock.openHour, this.clock.closeHour);
    this.brand.startDay(this.clock.day).forEach(k => this.news.push('brand:' + k)); this.brand.rollOffer(this.clock.day);
    this.#hqMorning(); this.#agencyMorning();
    const move = shows('mkt.rival', this.progression.level) ? this.rival.startDay(this.clock.day, this.standing) : null;
    if (move) this.news.push(move);
    if (move === 'closed' && this.rival.freed?.ids.length) this.news.push('freed:' + this.rival.freed.ids.join(','));
    if (this.rival.open && !this.poach && this.staff.hired.length >= 2 && Math.random() < POACH_CHANCE) { const t = this.staff.hired.filter(e => e.level >= 3 && e.stress >= POACH_STRESS).sort((a, b) => b.stress - a.stress)[0]; if (t) this.poach = { id: t.id }; }
    // A discounting rival tempts a few regulars away.
    this.regulars = Math.max(this.regularBook.lifelong, this.regulars - Math.round(this.regulars * this.rival.discount * .2 * (this.isUnlocked('membership') ? .5 : 1))); this.regularBook.trim(this.regulars);
    this.trollAt = Math.random() < this.trollChance ? rand(.1, .9) * this.clock.dayLength : null;
    this.clock.startDay();
  }
  nextDay() { this.clock.day++; this.startDay(); }
  /**
   * Sunday: the salon stays closed. Rent and upkeep still fall due, nobody is paid wages and the team rests.
   * The week is settled; the player can rearrange the salon and see to the money before Monday.
   */
  #dayOff() {
    this.dayOff = true; this.trollAt = null; this.contestResult = null; if (this.contest && this.contest.day === this.clock.day) this.#holdContest(); this.clock.isOpen = false; this.clock.elapsed = 0;
    this.operatingCosts.chargeDayOff(); this.staff.restDay();
    if (this.isUnlocked('seminar')) this.economy.earn('seminar', SEMINAR_BASE + this.staff.owner.level * SEMINAR_PER_LEVEL);
    const sunday = { day: this.clock.day, ...this.economy.closeDay(), served: 0, reputation: 0, reviews: { count: 0, average: 0 }, followers: { change: 0 } };
    this.month.log(sunday); if (MonthlyLedger.isMonthEnd(this.clock.day)) this.#settleMonth(sunday);
    this.weekReport = this.#weekSummary([...this.weekLog, sunday]); this.weekLog = [];
    if (this.progression.level >= HQ_LEVEL) this.hq.shift(this.weekReport.profit > 0 ? TRUST.weekProfit : TRUST.weekLoss);
    this.save();
  }
  /** Adds up a week of daily reports. */
  #weekSummary(days) { return { week: Math.ceil(this.clock.day / 7), from: days[0].day, to: this.clock.day, ...summariseDays(days) }; }
  /** What the month is measured against: cash, reviews and what each stylist has made so far. */
  #monthSnapshot() { return { cash: this.economy.cash, reviews: this.reviews.count, staff: Object.fromEntries(this.staff.all.map(e => [e.name, { earn: e.stats.earn, served: e.stats.served }])) }; }
  /** The last day of a month: pays the goal if it was met, then settles the month and sets the next goal. */
  #settleMonth(last) {
    const goal = this.month.goal, hit = !!goal && this.month.revenueSoFar >= goal.revenue;
    if (hit) this.staff.grow(MGMT.goal);
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
    // The brand: deliveries and shop sales, online orders and the shipping they cost.
    this.brand.closeDay(this.clock.day, this.economy).forEach(k => this.news.push('brand:' + k));
    { const orders = this.brand.onlineOrders(this.marketing.followers), units = orders.reduce((n, o) => n + o.units, 0); if (units) { this.economy.earn('online', orders.reduce((n, o) => n + o.revenue, 0)); this.economy.charge('shipping', units * ONLINE.shipping); } this.brandOrders = orders; }
    const e = this.economy, sales = this.layout.dailySales * (this.isUnlocked('brandLine') ? 2 : 1);
    if (sales) e.earn('products', sales);
    if (this.isUnlocked('membership') && this.regulars) e.earn('membership', this.regulars * MEMBERSHIP_FEE);
    if (this.isUnlocked('sponsor')) e.earn('sponsor', Math.min(SPONSOR_MAX, Math.round(this.marketing.followers / 200)));
    this.operatingCosts.accrue(1); this.#autoReply();
    // Overtime: everyone on the payroll stays until the last client leaves, at time and a half, and it wears on the team.
    const ot = Math.round(this.clock.overtimeHours * 10) / 10, otPay = Math.round(this.staff.payroll * OVERTIME_RATE * ot / 8); if (otPay) e.charge('overtime', otPay);
    this.resignations = this.staff.closeDay(this.clock.day, this.layout.staffRestRate, this.clock.hours + ot);
    const money = this.finance.closeDay(e.dailyProfit, e.dailyRevenue, this.clock.day);
    if (money.news) this.news.push('fin:' + money.news);
    // An academy gives everyone a daily lesson.
    const lesson = this.has('academy') ? 15 : 5;
    [this.staff.owner, ...this.staff.working(this.clock.day)].forEach(e => { if (e.gainExperience(lesson)) this.bus.emit('staff:levelup', e); });
    const reviews = this.reviews.today(this.clock.day);
    this.report = {
      day: this.clock.day, ...e.closeDay(), reputation: this.reputation.value - this.repAtDayStart,
      reviews: { count: reviews.length, average: reviews.length ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0 },
      followers: { now: this.marketing.followers, change: this.marketing.followers - this.followersAtDayStart }, incidents: { ...this.incidents }, served: this.servedToday, overtime: ot, overtimePay: otPay,
    };
    this.report.hours = this.clock.hours; this.report.metrics = this.metrics.snapshot();
    this.report.comparison = this.explainer.explain(this.report); this.report.advice = this.advisor.suggest(this.report); this.explainer.remember(this.report);
    this.weekLog.push(this.report);
    this.month.log(this.report); if (MonthlyLedger.isMonthEnd(this.clock.day)) this.#settleMonth(this.report);
    this.recentRevenue.push(this.report.totalRevenue); if (this.recentRevenue.length > 6) this.recentRevenue.shift();
    this.forecast = rollWeather(seasonOf(this.clock.day + 1)); this.surpriseFx = {};
    this.updateProgress(); this.save(); return this.report;
  }
  save() { this.saves.save(this.serialize()); }
  serialize() {
    return { day: this.clock.day + 1, performance: this.explainer, lastCall: this.lastCall, economy: this.economy, reputation: this.reputation.value, level: this.progression.level, served: this.served, satisfactionSum: this.satisfactionSum, priceLevel: this.priceLevel, staff: this.staff.all, support: this.staff.support, layout: this.layout, marketing: this.marketing, reviews: this.reviews, reviewRewards: this.reviewRewards, hospitality: this.hospitality, finance: this.finance, rival: this.rival, regulars: this.regulars, regularBook: this.regularBook, specialLog: this.specialLog, staffPolicy: this.staff, hours: this.nextHours || [this.clock.openHour, this.clock.closeHour] , missions: this.missions, weekLog: this.weekLog, month: this.month, trendUntil: this.trendUntil, matchUntil: this.matchUntil, contest: this.contest, contestLog: this.contestLog, contestBoost: this.contestBoost, brand: this.brand, onboarding: this.onboarding, hq: this.hq, hqFx: this.hqFx, storyBoost: this.storyBoost, storyPerks: this.storyPerks, forecast: this.forecast, calendarOrigin: this.calendarOrigin, recentRevenue: this.recentRevenue };
  }
  restore(d) {
    this.explainer.restore(d.performance || (d.weekLog || []).slice(-1)[0]);
    this.calendarOrigin = d.calendarOrigin || 0; setCalendarOrigin(this.calendarOrigin);
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
    this.regularBook.restore(d.regularBook); this.regularBook.trim(this.regulars); this.specialLog = d.specialLog || [];
    if (d.hours) this.clock.setHours(...d.hours);
    this.missions.restore(d.missions); this.weekLog = d.weekLog || [];
    this.month.restore(d.month, this.#monthSnapshot()); this.trendUntil = d.trendUntil || 0; this.matchUntil = d.matchUntil || 0; this.contest = d.contest || null; this.contestLog = d.contestLog || []; this.contestBoost = d.contestBoost || null; this.brand.restore(d.brand); this.onboarding.restore(d.onboarding, this); this.hq.restore(d.hq); this.hqFx = d.hqFx || {}; this.storyBoost = d.storyBoost || null; this.storyPerks = { hospitality: 0, contest: 0, ...d.storyPerks }; this.hospitality.extra = this.storyPerks.hospitality; this.lastCall = d.lastCall || 0; this.forecast = WEATHER[d.forecast] ? d.forecast : null;
  }
}
