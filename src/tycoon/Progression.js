const LEVELS = [
  { level: 1, unlocks: ['furniture'] },
  { level: 2, unlocks: ['staff', 'training', 'auto', 'chairs', 'pricing'], met: c => c.served >= 5, goal: c => [Math.min(c.served, 5)] },
  { level: 3, unlocks: ['colour', 'perm', 'expansion'], met: c => c.staff >= 1 && c.rep >= 20 && c.earned >= 1500, goal: c => [c.staff, Math.floor(c.rep), c.earned] },
  { level: 4, unlocks: ['vip'], met: c => c.staff >= 2 && c.rep >= 45 && c.earned >= 6000, goal: c => [c.staff, Math.floor(c.rep), c.earned] },
  { level: 5, unlocks: ['branches'], met: c => c.rep >= 70 && c.earned >= 18000, goal: c => [Math.floor(c.rep), c.earned] },
];

/** The five salon levels and what each one unlocks. */
export class Progression {
  constructor(bus) { this.bus = bus; this.level = 1; }
  get all() { return LEVELS; }
  get next() { return LEVELS[this.level] || null; }
  isUnlocked(feature) { return LEVELS.slice(0, this.level).some(l => l.unlocks.includes(feature)); }
  update(context) { while (this.next && this.next.met(context)) { this.level++; this.bus.emit('level:up', this.level); } }
}
