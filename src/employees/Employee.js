import { clamp } from '../core/math.js';

const SPECIALTY_SKILL = { cut: 'cutting', colour: 'colouring', perm: 'perming' };
const REQUEST_SPECIALTY = { haircut: 'cut', colour: 'colour', perm: 'perm' };
export const SPECIALTY_BONUS = 10, SPECIALTY_SATISFACTION = .05, MAX_LEVEL = 10;
// New starters take a few days to settle into the team.
const SETTLING_DAYS = 3, SETTLING_PENALTY = 6;

/**
 * A stylist's data: skills, level, tiredness within the day and stress that builds up across days.
 * `fig` is a rendering handle attached by the scene and never saved.
 */
export class Employee {
  constructor({ id, name, role, style, rank = 'designer', unlock = null, specialty = null, perk = null, skills, salary, hireCost = 0, bias = 0, fine = false, single = false, apron, hair, long = false }) {
    Object.assign(this, { id, name, role, style, rank, unlock, specialty, perk, skills: { ...skills }, salary, hireCost, bias, fine, single, apron, hair, long });
    this.stamina = 100; this.experience = 0; this.level = 1; this.status = 'idle'; this.assignedCustomer = null;
    this.hired = false; this.restUntil = 0; this.stats = { served: 0, sum: 0, earn: 0 }; this.today = { served: 0, earn: 0 }; this.fig = null;
    this.stress = 0; this.leaveFrom = 0; this.leaveTo = 0; this.daysEmployed = 0; this.boost = 0;
  }
  get fatigue() { return 100 - this.stamina; }
  get trainingCost() { return 250 * this.level; }
  get canTrain() { return this.level < MAX_LEVEL; }
  get experienceToNext() { return this.level * 50; }
  get settling() { return this.hired && this.daysEmployed < SETTLING_DAYS; }
  onLeave(day) { return day >= this.leaveFrom && day <= this.leaveTo; }
  leaveBooked(day) { return this.leaveTo >= day; }
  /** Skills with the specialty bonus, incentives and the settling-in dip applied. */
  get effectiveSkills() {
    const s = { ...this.skills }, key = SPECIALTY_SKILL[this.specialty], shift = this.boost - (this.settling ? SETTLING_PENALTY : 0);
    if (key) s[key] += SPECIALTY_BONUS;
    for (const k of ['cutting', 'colouring', 'perming', 'speed', 'customerService']) s[k] = clamp(s[k] + shift, 0, 100);
    return s;
  }
  /** Stress above 60 makes hands less steady, like tiredness does. */
  get strain() { return 1 + this.fatigue / 100 + Math.max(0, this.stress - 60) / 80; }
  /** True when the client's main request is this stylist's specialty. */
  handles(customer) { return !!this.specialty && REQUEST_SPECIALTY[customer.requestedService] === this.specialty; }
  /** Translates skills, tiredness and stress into the error and speed the hair rules use. */
  serviceProfile(speedBonus = 1) {
    const strain = this.strain, s = this.effectiveSkills;
    return { cut: (100 - s.cutting) / 25 * strain, bias: this.bias, col: (100 - s.colouring) / 2000 * strain, wave: (100 - s.perming) / 400 * strain, spd: s.speed / 60 * (1 - this.fatigue / 250) * speedBonus * (this.perk === 'speed' ? 1.2 : 1), fine: this.fine, single: this.single };
  }
  serviceQuality() { const s = this.effectiveSkills; return Math.max(0, ((s.cutting + s.customerService) / 200) * (1 - this.fatigue / 200) * (1 - Math.max(0, this.stress - 60) / 200)); }
  tire(amount) { this.stamina = Math.max(0, this.stamina - amount); }
  rest(amount) { this.stamina = Math.min(100, this.stamina + amount); }
  addStress(amount) { this.stress = clamp(this.stress + amount, 0, 100); }
  /** Adds experience and returns how many levels were gained. */
  gainExperience(points) {
    let gained = 0;
    this.experience += points;
    while (this.level < MAX_LEVEL && this.experience >= this.experienceToNext) { this.experience -= this.experienceToNext; this.#levelUp(); gained++; }
    if (this.level >= MAX_LEVEL) this.experience = 0;
    return gained;
  }
  #levelUp() {
    this.level++;
    for (const k of ['cutting', 'colouring', 'perming', 'speed', 'customerService']) this.skills[k] = Math.min(100, this.skills[k] + 3);
    const key = SPECIALTY_SKILL[this.specialty];
    if (key) this.skills[key] = Math.min(100, this.skills[key] + 2);
  }
  recordService(satisfaction, payment) { this.stats.served++; this.stats.sum += satisfaction; this.stats.earn += payment; this.today.served++; this.today.earn += payment; }
  toJSON() { return { id: this.id, skills: this.skills, experience: this.experience, level: this.level, hired: this.hired, stats: this.stats, stress: this.stress, leaveFrom: this.leaveFrom, leaveTo: this.leaveTo, daysEmployed: this.daysEmployed }; }
  restore(data) {
    Object.assign(this, { skills: { ...this.skills, ...data.skills }, experience: data.experience, level: data.level, hired: data.hired, stats: data.stats });
    // Fields added later default to a settled, rested stylist.
    Object.assign(this, { stress: data.stress || 0, leaveFrom: data.leaveFrom || 0, leaveTo: data.leaveTo || 0, daysEmployed: data.daysEmployed ?? 99 });
  }
}
