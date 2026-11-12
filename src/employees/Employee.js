const SPECIALTY_SKILL = { cut: 'cutting', colour: 'colouring', perm: 'perming' };
const REQUEST_SPECIALTY = { haircut: 'cut', colour: 'colour', perm: 'perm' };
export const SPECIALTY_BONUS = 10, SPECIALTY_SATISFACTION = .05, MAX_LEVEL = 10;

/** A stylist's data and skills. `fig` is a rendering handle attached by the scene and never saved. */
export class Employee {
  constructor({ id, name, role, style, specialty = null, skills, salary, hireCost = 0, bias = 0, fine = false, single = false, apron, hair, long = false }) {
    Object.assign(this, { id, name, role, style, specialty, skills: { ...skills }, salary, hireCost, bias, fine, single, apron, hair, long });
    this.stamina = 100; this.experience = 0; this.level = 1; this.status = 'idle'; this.assignedCustomer = null;
    this.hired = false; this.restUntil = 0; this.stats = { served: 0, sum: 0, earn: 0 }; this.fig = null;
  }
  get fatigue() { return 100 - this.stamina; }
  get trainingCost() { return 250 * this.level; }
  get canTrain() { return this.level < MAX_LEVEL; }
  get experienceToNext() { return this.level * 50; }
  /** Skills with the specialist bonus applied. */
  get effectiveSkills() {
    const s = { ...this.skills }, key = SPECIALTY_SKILL[this.specialty];
    if (key) s[key] = Math.min(100, s[key] + SPECIALTY_BONUS);
    return s;
  }
  /** True when the client's main request is this stylist's specialty. */
  handles(customer) { return !!this.specialty && REQUEST_SPECIALTY[customer.requestedService] === this.specialty; }
  /** Translates skills, tiredness and equipment into the error and speed the hair rules use. */
  serviceProfile(speedBonus = 1) {
    const tired = 1 + this.fatigue / 100, s = this.effectiveSkills;
    return { cut: (100 - s.cutting) / 25 * tired, bias: this.bias, col: (100 - s.colouring) / 2000 * tired, wave: (100 - s.perming) / 400 * tired, spd: s.speed / 60 * (1 - this.fatigue / 250) * speedBonus, fine: this.fine, single: this.single };
  }
  serviceQuality() { const s = this.effectiveSkills; return Math.max(0, ((s.cutting + s.customerService) / 200) * (1 - this.fatigue / 200)); }
  tire(amount) { this.stamina = Math.max(0, this.stamina - amount); }
  rest(amount) { this.stamina = Math.min(100, this.stamina + amount); }
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
    for (const k of Object.keys(this.skills)) this.skills[k] = Math.min(100, this.skills[k] + 3);
    const key = SPECIALTY_SKILL[this.specialty];
    if (key) this.skills[key] = Math.min(100, this.skills[key] + 2);
  }
  recordService(satisfaction, payment) { this.stats.served++; this.stats.sum += satisfaction; this.stats.earn += payment; }
  toJSON() { return { id: this.id, skills: this.skills, experience: this.experience, level: this.level, hired: this.hired, stats: this.stats }; }
  restore(data) { Object.assign(this, { skills: data.skills, experience: data.experience, level: data.level, hired: data.hired, stats: data.stats }); }
}
