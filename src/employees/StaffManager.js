import { Employee } from './Employee.js';

/**
 * The stylists who can be hired. Skills run 0 to 100; the specialty adds +10 on top.
 * Senior designers are the strongest and the most expensive, and only join an established salon.
 */
const DEFINITIONS = [
  // Senior designers
  { id: 'somi', name: 'Somi', role: 'Senior Designer', rank: 'senior', unlock: 'seniors', style: 'ColourSpecialist', specialty: 'colour', skills: { cutting: 84, colouring: 92, perming: 78, speed: 68, customerService: 90 }, salary: 430, hireCost: 3500, fine: true, apron: 0x1d1a26, hair: 0x2e1d14, long: true },
  { id: 'kai', name: 'Kai', role: 'Senior Designer', rank: 'senior', unlock: 'seniors', style: 'CutSpecialist', specialty: 'cut', skills: { cutting: 92, colouring: 76, perming: 74, speed: 80, customerService: 82 }, salary: 420, hireCost: 3300, fine: true, apron: 0x45404f, hair: 0x16110f },
  { id: 'soo', name: 'Soo', role: 'Senior Designer', rank: 'senior', unlock: 'seniors', style: 'PermSpecialist', specialty: 'perm', skills: { cutting: 85, colouring: 80, perming: 92, speed: 66, customerService: 88 }, salary: 420, hireCost: 3300, fine: true, apron: 0x7a5d6e, hair: 0x5e3d24, long: true },
  // Designers
  { id: 'mia', name: 'Mia', role: 'Designer', style: 'CutSpecialist', specialty: 'cut', skills: { cutting: 76, colouring: 58, perming: 54, speed: 62, customerService: 78 }, salary: 290, hireCost: 1200, apron: 0x2f6fd6, hair: 0xf1dfae },
  { id: 'rosa', name: 'Rosa', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', skills: { cutting: 56, colouring: 80, perming: 48, speed: 58, customerService: 72 }, salary: 290, hireCost: 1200, bias: .6, fine: true, apron: 0xe25c8f, hair: 0xc8642a, long: true },
  { id: 'yuri', name: 'Yuri', role: 'Designer', style: 'AllRounder', skills: { cutting: 66, colouring: 66, perming: 66, speed: 62, customerService: 74 }, salary: 300, hireCost: 1300, apron: 0xffb15a, hair: 0x16110f, long: true },
  { id: 'ethan', name: 'Ethan', role: 'Barber', style: 'CutSpecialist', specialty: 'cut', skills: { cutting: 72, colouring: 40, perming: 36, speed: 84, customerService: 64 }, salary: 270, hireCost: 1000, apron: 0x2a4478, hair: 0x6e4428 },
  // Junior designer
  { id: 'shawn', name: 'Shawn', role: 'Junior Designer', rank: 'junior', style: 'PermSpecialist', specialty: 'perm', skills: { cutting: 48, colouring: 42, perming: 70, speed: 86, customerService: 60 }, salary: 240, hireCost: 600, bias: -1.2, single: true, apron: 0x1fa39a, hair: 0x16110f },
];

const SUPPORT = [
  { id: 'ruby', name: 'Ruby', role: 'Receptionist', style: 'Reception', effect: 'reception', skills: { cutting: 0, colouring: 0, perming: 0, speed: 50, customerService: 85, marketing: 35 }, salary: 220, hireCost: 300, apron: 0x8a4fc2, startsHired: true },
  { id: 'hugo', name: 'Hugo', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 60, customerService: 60 }, salary: 140, hireCost: 250, apron: 0x5f9e45 },
  { id: 'jin', name: 'Jin', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 66, customerService: 58 }, salary: 140, hireCost: 250, apron: 0xffb15a },
  { id: 'tess', name: 'Tess', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 58, customerService: 70 }, salary: 150, hireCost: 300, apron: 0x7fb6f0 },
];

/** Performance pay as a share of each stylist's takings: steadier staff and a small skill lift, at a cost. */
export const COMMISSION = [0, .05, .1, .15];
const COMMISSION_BOOST = [0, 2, 4, 6], COMMISSION_CALM = [1, .85, .7, .55];
export const BONUS = 200, LEAVE_DAYS = 2, DINNER_PER_HEAD = 45, MARKETING_COURSE = 400;
export const RESIGN_STRESS = 85;

/** Owns the roster: who can be hired, who works here, what they cost and how they are holding up. */
export class StaffManager {
  constructor(economy) {
    this.economy = economy;
    // Lia owns the salon and can do everything well; she draws no wage.
    this.owner = new Employee({ id: 'owner', name: 'Lia', role: 'Director', style: 'Owner', skills: { cutting: 78, colouring: 76, perming: 74, speed: 62, customerService: 84 }, salary: 0, single: true, apron: 0xffd98a, hair: 0x2e1d14 });
    this.owner.hired = true; this.owner.daysEmployed = Infinity;
    this.candidates = DEFINITIONS.map(d => new Employee(d));
    // Front desk and floor help, never at a styling chair. Only the receptionist is there on day one.
    this.support = SUPPORT.map(d => Object.assign(new Employee(d), { effect: d.effect, hired: !!d.startsHired }));
    this.commission = 0; this.dinnerDay = 0; this.version = 0;
  }
  get all() { return [this.owner, ...this.candidates]; }
  get hired() { return this.candidates.filter(e => e.hired); }
  get receptionist() { return this.support.find(e => e.effect === 'reception'); }
  /** Hired stylists who are in today rather than on leave. */
  working(day) { return this.hired.filter(e => !e.onLeave(day)); }
  get payroll() { return [...this.hired, ...this.support.filter(e => e.hired)].reduce((sum, e) => sum + e.salary, 0); }
  hasSupport(effect) { return this.support.some(e => e.hired && e.effect === effect); }
  find(id) { return [...this.all, ...this.support].find(e => e.id === id); }
  hire(employee) { if (employee.hired || !this.economy.spend('recruiting', employee.hireCost)) return false; Object.assign(employee, { hired: true, daysEmployed: 0, stress: 0, leaveFrom: 0, leaveTo: 0 }); this.version++; return true; }
  fire(employee) { if (!employee.hired || employee === this.owner) return false; employee.hired = false; employee.status = 'idle'; this.version++; return true; }
  /** Paid training: a block of experience that may lift the stylist a level. Returns levels gained. */
  train(employee) { if (!employee.hired || !employee.canTrain || !this.economy.spend('training', employee.trainingCost)) return 0; employee.addStress(-5); this.version++; return employee.gainExperience(60); }
  marketingCourseCost(e) { return MARKETING_COURSE + Math.max(0, (e.skills.marketing || 0) - 35) * 10; }
  /** Sends the receptionist on a marketing course. */
  trainMarketing(e) { if (!e.hired || (e.skills.marketing || 0) >= 100 || !this.economy.spend('training', this.marketingCourseCost(e))) return false; e.skills.marketing = Math.min(100, (e.skills.marketing || 0) + 10); this.version++; return true; }
  giveBonus(e) { if (!e.hired || !this.economy.spend('bonus', BONUS)) return false; e.addStress(-25); this.version++; return true; }
  /** Two days of paid leave from tomorrow. Someone else has to cover the chair. */
  sendOnLeave(e, day) { if (!e.hired || e.leaveBooked(day)) return false; e.leaveFrom = day + 1; e.leaveTo = day + LEAVE_DAYS; this.version++; return true; }
  dinnerCost() { return DINNER_PER_HEAD * (1 + this.hired.length + this.support.filter(e => e.hired).length); }
  /** A team dinner once a day: everyone unwinds a little. */
  teamDinner(day) { if (this.dinnerDay === day || !this.hired.length || !this.economy.spend('bonus', this.dinnerCost())) return false; this.dinnerDay = day; this.hired.forEach(e => e.addStress(-12)); this.version++; return true; }
  setCommission(i) { if (COMMISSION[i] != null) { this.commission = i; this.version++; } }

  startDay(day) {
    this.all.forEach(e => { e.stamina = 100; e.restUntil = 0; e.today = { served: 0, earn: 0 }; });
    this.hired.forEach(e => { e.boost = COMMISSION_BOOST[this.commission]; if (e.onLeave(day)) e.addStress(-35); });
    this.version++;
  }
  /**
   * End-of-day staff upkeep: performance pay, then stress from the day's load.
   * Returns the stylists so stressed they want to quit.
   */
  closeDay(day, restRate) {
    const rate = COMMISSION[this.commission], calm = COMMISSION_CALM[this.commission];
    const pay = Math.round(this.hired.reduce((sum, e) => sum + e.today.earn, 0) * rate);
    if (pay) this.economy.charge('commission', pay);
    const quitting = [];
    for (const e of this.working(day)) {
      const load = e.fatigue * .2 + Math.max(0, e.today.served - 4) * 3 + 2;
      e.addStress(load * calm / restRate - (restRate > 1 ? 4 : 0));
      e.daysEmployed++;
      if (e.stress >= RESIGN_STRESS) quitting.push(e);
    }
    this.version++;
    return quitting;
  }
  toJSON() { return { commission: this.commission }; }
  restore(d) { this.commission = d?.commission || 0; this.version++; }
}
