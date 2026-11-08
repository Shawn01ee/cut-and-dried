const BRANCHES = [{ id: 'downtown', cost: 8000, income: 300 }, { id: 'premium', cost: 14000, income: 520 }, { id: 'barber', cost: 18000, income: 640 }, { id: 'colour', cost: 25000, income: 900 }];

/** Branches run by themselves and pay out daily according to the brand's reputation. */
export class Franchise {
  constructor(economy) { this.economy = economy; this.branches = BRANCHES.map(b => ({ ...b, open: false })); }
  incomeOf(branch, reputation) { return Math.round(branch.income * (.5 + reputation / 200)); }
  open(branch) { if (branch.open || !this.economy.spend('franchise', branch.cost)) return false; branch.open = true; return true; }
  dailyIncome(reputation) { return this.branches.reduce((sum, b) => sum + (b.open ? this.incomeOf(b, reputation) : 0), 0); }
  toJSON() { return this.branches.filter(b => b.open).map(b => b.id); }
  restore(ids) { this.branches.forEach(b => { b.open = ids.includes(b.id); }); }
}
