import { clamp } from '../core/math.js';
import { TRAITS, traitOf } from './Traits.js';
import { PROMO_PAY } from './Career.js';

const SPECIALTY_SKILL = { cut: 'cutting', colour: 'colouring', perm: 'perming' };
const REQUEST_SPECIALTY = { haircut: 'cut', colour: 'colour', perm: 'perm' };
export const SPECIALTY_BONUS = 10, SPECIALTY_SATISFACTION = .05, MAX_LEVEL = 10;
/** Standard service times in minutes, for an average stylist. */
export const BASE_MINUTES = { shampoo: 10, cut: 30, colour: 60, wave: 55, dry: 12 };
/** Of those, the minutes colour and perm are left to process: the same for everyone, and no stylist is needed. */
export const PROCESS_MINUTES = { colour: 40, wave: 35 };
// Assistants wash by their shampoo skill; stylists, who have none, by their speed.
const SERVICE_SKILL = { cut: 'cutting', colour: 'colouring', wave: 'perming', dry: 'speed', shampoo: 'shampoo' };
// New starters take a few days to settle into the team.
const SETTLING_DAYS = 3, SETTLING_PENALTY = 6;

/**
 * A stylist's data: skills, level, tiredness within the day and stress that builds up across days.
 * `fig` is a rendering handle attached by the scene and never saved.
 */
/** Skills lost while sulking after being talked out of quitting, and how much each pay rise adds. */
export const GRUDGE_PENALTY = 12, GRUDGE_DAYS = 5, RAISE = 1.15;

export class Employee {
  constructor({ id, name, gender = null, hairdo = null, shades = false, beard = false, skin = null, role, style, rank = 'designer', rival = null, unlock = null, specialty = null, perk = null, skills, salary, hireCost = 0, bias = 0, fine = false, single = false, apron, hair, long = false }) {
    Object.assign(this, { id, name, role, style, rank, rival, unlock, specialty, perk, skills: { ...skills }, salary, hireCost, bias, fine, single, apron, hair, long });
    // How they look: `hairdo` is short, long, bob, bun, curly or buzz.
    Object.assign(this, { gender, hairdo: hairdo || (long ? 'long' : 'short'), shades, beard, skin });
    this.stamina = 100; this.experience = 0; this.level = 1; this.status = 'idle'; this.assignedCustomer = null;
    this.hired = false; this.restUntil = 0; this.stats = { served: 0, sum: 0, earn: 0 }; this.today = { served: 0, earn: 0 }; this.fig = null;
    this.stress = 0; this.leaveFrom = 0; this.leaveTo = 0; this.daysEmployed = 0; this.boost = 0;
    // `grudge`: days left of sulking after being talked out of quitting; `persuaded`: how often that has happened; `raises`: pay rises given.
    this.grudge = 0; this.persuaded = 0; this.raises = 0; this.baseSalary = salary;
    // `loyalty` raises the stress they put up with before quitting; `talkDay` is the last one-to-one with Lia; `lastStress` is yesterday's stress, by cause.
    this.loyalty = 0; this.talkDay = -99; this.lastStress = null;
    // Personality, certificates earned, and promotions given (each raises base pay; `defSalary` is the starting pay).
    this.trait = traitOf(id); this.certs = []; this.promotions = 0; this.defSalary = salary;
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
    const s = { ...this.skills }, key = SPECIALTY_SKILL[this.specialty], shift = this.boost - (this.settling ? SETTLING_PENALTY : 0) - (this.grudge > 0 ? GRUDGE_PENALTY : 0);
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
  /**
   * How long a service takes this stylist, in minutes: the standard time, quicker with speed and with skill
   * in that service, slower when tired, quicker with good equipment or a talent for speed.
   */
  serviceMinutes(type, speedBonus = 1) {
    const s = this.effectiveSkills, skill = s[SERVICE_SKILL[type]] ?? s.speed;
    const minutes = (BASE_MINUTES[type] - (PROCESS_MINUTES[type] || 0)) * (1.6 - s.speed / 100) * (1.2 - skill / 250) * (1 + this.fatigue / 250) / speedBonus / (this.perk === 'speed' ? 1.2 : 1);
    return Math.max(3, Math.round(minutes / (TRAITS[this.trait]?.speed || 1)));
  }
  /** How good a wash this person gives, 0 to 1: assistants by their shampoo skill, stylists an ordinary .6. */
  get washQuality() { return this.skills.shampoo != null ? this.skills.shampoo / 100 : .6; }
  /** How well this person sweeps, 0 to 100. */
  get cleaning() { return this.skills.cleaning ?? 50; }
  /** The whole service from start to finish, including any processing time. */
  totalMinutes(type, speedBonus = 1, processSpeed = 1) { return this.serviceMinutes(type, speedBonus) + Math.round((PROCESS_MINUTES[type] || 0) / processSpeed); }
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
  toJSON() { return { id: this.id, site: this.site, wishes: this.wishes || 0, easyUntil: this.easyUntil || 0, rank: this.rank, role: this.role, promotions: this.promotions, certs: this.certs, bonusDays: this.bonusDays || [], loyalty: this.loyalty, talkDay: this.talkDay, lastStress: this.lastStress, grudge: this.grudge, persuaded: this.persuaded, raises: this.raises, skills: this.skills, experience: this.experience, level: this.level, hired: this.hired, stats: this.stats, stress: this.stress, leaveFrom: this.leaveFrom, leaveTo: this.leaveTo, daysEmployed: this.daysEmployed }; }
  restore(data) {
    // Someone who has never worked here keeps today's skills, so balance changes reach older saves too.
    const worked = data.hired || data.level > 1 || data.experience > 0 || (data.stats && data.stats.served > 0);
    Object.assign(this, { skills: worked ? { ...this.skills, ...data.skills } : this.skills, experience: data.experience, level: data.level, hired: data.hired, stats: data.stats });
    // Fields added later default to a settled, rested stylist.
    if (data.site !== undefined) this.site = data.site;
    if (data.rank) Object.assign(this, { rank: data.rank, role: data.role || this.role }); this.promotions = data.promotions || 0; this.certs = data.certs || []; this.baseSalary = Math.round(this.defSalary * PROMO_PAY ** this.promotions);
    this.wishes = data.wishes || 0; this.easyUntil = data.easyUntil || 0;
    this.bonusDays = data.bonusDays || []; this.loyalty = data.loyalty || 0; this.talkDay = data.talkDay ?? -99; this.lastStress = data.lastStress || null;
    this.grudge = data.grudge || 0; this.persuaded = data.persuaded || 0; this.raises = data.raises || 0; this.salary = Math.round(this.baseSalary * RAISE ** this.raises);
    Object.assign(this, { stress: data.stress || 0, leaveFrom: data.leaveFrom || 0, leaveTo: data.leaveTo || 0, daysEmployed: data.daysEmployed ?? 99 });
  }
}
