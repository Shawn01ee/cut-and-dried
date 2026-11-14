const LEVELS = [
  { level: 1, unlocks: ['furniture', 'colour', 'perm', 'marketing'] },
  { level: 2, unlocks: ['staff', 'training', 'auto', 'chairs', 'pricing', 'youtube'], met: c => c.served >= 12 && c.earned >= 1500, goal: c => [Math.min(c.served, 12), c.earned] },
  { level: 3, unlocks: ['expansion', 'influencer', 'seniors'], met: c => c.staff >= 1 && c.rep >= 25 && c.earned >= 5000, goal: c => [c.staff, Math.floor(c.rep), c.earned] },
  { level: 4, unlocks: ['vip', 'annex', 'masters'], met: c => c.staff >= 2 && c.rep >= 50 && c.earned >= 15000, goal: c => [c.staff, Math.floor(c.rep), c.earned] },
  { level: 5, unlocks: ['branches'], met: c => c.rep >= 75 && c.earned >= 36000, goal: c => [Math.floor(c.rep), c.earned] },
  { level: 6, unlocks: ['branchGrow', 'luxury', 'brandLine'], met: c => c.branch && c.rep >= 85 && c.earned >= 70000, goal: c => [c.branch ? 1 : 0, Math.floor(c.rep), c.earned] },
  { level: 7, unlocks: ['award'], met: c => c.branch && c.staff >= 6 && c.rep >= 95 && c.earned >= 120000, goal: c => [c.staff, Math.floor(c.rep), c.earned] },
];

/** The salon levels and what each one unlocks. */
export class Progression {
  constructor(bus) { this.bus = bus; this.level = 1; }
  get all() { return LEVELS; }
  get next() { return LEVELS[this.level] || null; }
  isUnlocked(feature) { return LEVELS.slice(0, this.level).some(l => l.unlocks.includes(feature)); }
  update(context) { while (this.next && this.next.met(context)) { this.level++; this.bus.emit('level:up', this.level); } }
}
