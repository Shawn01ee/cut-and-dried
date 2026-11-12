import { EventBus } from '../core/EventBus.js';
import { GameClock } from '../core/GameClock.js';
import { SaveManager } from '../core/SaveManager.js';
import { Economy } from './Economy.js';
import { Reputation } from './Reputation.js';
import { Progression } from './Progression.js';
import { Franchise } from './Franchise.js';
import { OperatingCosts } from './OperatingCosts.js';
import { StaffManager } from '../employees/StaffManager.js';
import { CustomerFactory } from '../customers/CustomerFactory.js';
import { ServiceEvaluator } from '../customers/ServiceEvaluator.js';
import { SalonLayout } from '../building/SalonLayout.js';
import { CHAIR_PRICE } from '../building/FurnitureCatalog.js';
import { rand } from '../core/math.js';

const PRICE_MULTIPLIER = [.8, 1, 1.5], PRICE_DEMAND = [1.3, 1, .7];
export const STARTING_CASH = 2000;

/** Composition root of the business simulation. Knows nothing about Three.js. */
export class TycoonGame {
  constructor() {
    this.bus = new EventBus();
    this.clock = new GameClock(this.bus);
    this.economy = new Economy(STARTING_CASH);
    this.reputation = new Reputation();
    this.progression = new Progression(this.bus);
    this.staff = new StaffManager(this.economy);
    this.layout = new SalonLayout();
    this.franchise = new Franchise(this.economy);
    this.operatingCosts = new OperatingCosts(this.economy, this.staff, this.layout, this.progression);
    this.customers = new CustomerFactory();
    this.evaluator = new ServiceEvaluator();
    this.saves = new SaveManager('cut-and-dried-career-v2');
    this.priceLevel = 1; this.served = 0; this.servedToday = 0; this.satisfactionSum = 0;
    this.repAtDayStart = 0; this.report = null;
  }
  get context() { return { served: this.served, staff: this.staff.hired.length, rep: this.reputation.value, earned: this.economy.totalEarned }; }
  get expectedClients() { return Math.round((4 + this.staff.hired.length * 3 + this.reputation.value / 20) * PRICE_DEMAND[this.priceLevel]); }
  get averageSatisfaction() { return this.served ? this.satisfactionSum / this.served : 0; }
  updateProgress() { this.progression.update(this.context); }
  isUnlocked(feature) { return this.progression.isUnlocked(feature); }
  nextArrival() { return rand(.8, 1.2) * this.clock.dayLength / this.expectedClients; }
  newCustomer(usedNames) {
    return this.customers.create(usedNames, {
      colour: this.isUnlocked('colour'), perm: this.isUnlocked('perm'), advancedCuts: this.isUnlocked('chairs'),
      vipChance: this.isUnlocked('vip') ? .18 : 0, priceMultiplier: PRICE_MULTIPLIER[this.priceLevel], patienceMultiplier: 1 + this.layout.comfort * .03,
    });
  }
  serviceProfileOf(worker) { return worker.serviceProfile(this.layout.speedBonus); }
  chargeMaterials(ops) { ops.forEach(op => { if (op.type === 'colour') this.economy.charge('materials', 15); if (op.type === 'wave') this.economy.charge('materials', 10); }); }
  completeService(customer, worker, byOwner) {
    const result = this.evaluator.evaluate(customer, worker, this.layout.comfort);
    if (customer.vip && byOwner) result.payment = Math.round(result.payment * 1.2);
    const gain = (result.satisfaction - .55) * 3 * (customer.vip ? 2 : 1) * (result.satisfaction > .55 ? 1 + this.layout.comfort * .03 : 1);
    this.reputation.add(gain); worker.recordService(result.satisfaction, result.payment);
    if (worker !== this.staff.owner) worker.tire(14 / this.layout.staffRestRate);
    worker.gainExperience(10);
    this.served++; this.servedToday++; this.satisfactionSum += result.satisfaction;
    return result;
  }
  receivePayment(amount) { this.economy.earn('services', amount); this.updateProgress(); }
  customerGaveUp() { this.reputation.add(-.6); }
  buyChair() { const l = this.layout; if (!this.isUnlocked('chairs') || l.chairs >= l.maxChairs || !this.economy.spend('equipment', CHAIR_PRICE)) return false; l.chairs++; return true; }
  expand() { const next = this.layout.nextExpansion; if (!next || !this.isUnlocked(next.requires) || !this.economy.spend('expansion', next.cost)) return false; this.layout.tier++; return true; }
  tick(dt) { this.clock.tick(dt); this.operatingCosts.accrue(this.clock.workedFraction); }
  startDay() { this.economy.startDay(); this.operatingCosts.startDay(); this.staff.startDay(); this.servedToday = 0; this.repAtDayStart = this.reputation.value; this.report = null; this.clock.startDay(); }
  nextDay() { this.clock.day++; this.startDay(); }
  closeDay() {
    const e = this.economy, sales = this.layout.dailySales, branches = this.franchise.dailyIncome(this.reputation.value);
    if (sales) e.earn('products', sales); if (branches) e.earn('branches', branches);
    this.operatingCosts.accrue(1);
    this.report = { day: this.clock.day, ...e.closeDay(), reputation: this.reputation.value - this.repAtDayStart };
    this.updateProgress(); this.save(); return this.report;
  }
  save() { this.saves.save(this.serialize()); }
  serialize() { return { day: this.clock.day + 1, economy: this.economy, reputation: this.reputation.value, level: this.progression.level, served: this.served, satisfactionSum: this.satisfactionSum, priceLevel: this.priceLevel, staff: this.staff.all, layout: this.layout, franchise: this.franchise }; }
  restore(d) {
    this.clock.day = d.day; this.economy.restore(d.economy); this.reputation.value = d.reputation; this.progression.level = d.level;
    this.served = d.served; this.satisfactionSum = d.satisfactionSum; this.priceLevel = d.priceLevel; this.franchise.restore(d.franchise);
    d.staff.forEach(s => this.staff.find(s.id).restore(s));
    this.layout.chairs = d.layout.chairs; this.layout.tier = d.layout.tier;
  }
}
