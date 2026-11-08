/** A stylist's data and skills. `fig` is a rendering handle attached by the scene and never saved. */
export class Employee {
  constructor({ id, name, role, style, skills, salary, hireCost = 0, bias = 0, fine = false, single = false, apron, hair, long = false }) {
    Object.assign(this, { id, name, role, style, skills: { ...skills }, salary, hireCost, bias, fine, single, apron, hair, long });
    this.stamina = 100; this.experience = 0; this.level = 1; this.status = 'idle'; this.assignedCustomer = null;
    this.hired = false; this.restUntil = 0; this.stats = { served: 0, sum: 0, earn: 0 }; this.fig = null;
  }
  get fatigue() { return 100 - this.stamina; }
  get trainingCost() { return 300 * this.level; }
  get canTrain() { return this.level < 6; }
  /** Translates skills, tiredness and equipment into the error and speed the hair rules use. */
  serviceProfile(speedBonus = 1) {
    const tired = 1 + this.fatigue / 100, s = this.skills;
    return { cut: (100 - s.cutting) / 25 * tired, bias: this.bias, col: (100 - s.colouring) / 2000 * tired, wave: (100 - s.perming) / 400 * tired, spd: s.speed / 60 * (1 - this.fatigue / 250) * speedBonus, fine: this.fine, single: this.single };
  }
  serviceQuality() { const s = this.skills; return Math.max(0, ((s.cutting + s.customerService) / 200) * (1 - this.fatigue / 200)); }
  tire(amount) { this.stamina = Math.max(0, this.stamina - amount); }
  rest(amount) { this.stamina = Math.min(100, this.stamina + amount); }
  improve() { this.level++; for (const k of Object.keys(this.skills)) this.skills[k] = Math.min(100, this.skills[k] + 4); }
  gainExperience(points) { this.experience += points; const needed = this.level * 40; if (this.experience >= needed && this.canTrain) { this.experience -= needed; this.improve(); return true; } return false; }
  recordService(satisfaction, payment) { this.stats.served++; this.stats.sum += satisfaction; this.stats.earn += payment; }
  toJSON() { return { id: this.id, skills: this.skills, experience: this.experience, level: this.level, hired: this.hired, stats: this.stats }; }
  restore(data) { Object.assign(this, { skills: data.skills, experience: data.experience, level: data.level, hired: data.hired, stats: data.stats }); }
}
