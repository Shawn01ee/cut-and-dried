const BRANCHES = [{ id: 'downtown', cost: 10000, income: 420 }, { id: 'premium', cost: 18000, income: 720 }, { id: 'barber', cost: 24000, income: 880 }, { id: 'colour', cost: 32000, income: 1250 }];

/** Branches run by themselves and pay out daily according to the brand's reputation. */
export class Franchise {
  constructor(economy) { this.economy = economy; this.branches = BRANCHES.map(b => ({ ...b, open: false, clientsToday: 0, revenueToday: 0, satisfactionSum: 0 })); }
  incomeOf(branch, reputation) { return Math.round(branch.income * (.5 + reputation / 200)); }
  open(branch) { if (branch.open || !this.economy.spend('franchise', branch.cost)) return false; branch.open = true; return true; }
  /** A branch client finished; nine clients a day at full satisfaction earn roughly the branch's daily income. */
  recordClient(branch, satisfaction, reputation) {
    const pay = Math.round(this.incomeOf(branch, reputation) / 9 * (.4 + .75 * satisfaction));
    branch.clientsToday++; branch.satisfactionSum += satisfaction; branch.revenueToday += pay; return pay;
  }
  /** Hands over today's branch takings and resets the counters. */
  collectDay() { let sum = 0; this.branches.forEach(b => { sum += b.revenueToday; b.clientsToday = 0; b.revenueToday = 0; b.satisfactionSum = 0; }); return sum; }
  dailyIncome(reputation) { return this.branches.reduce((sum, b) => sum + (b.open ? this.incomeOf(b, reputation) : 0), 0); }
  toJSON() { return this.branches.filter(b => b.open).map(b => b.id); }
  restore(ids) { this.branches.forEach(b => { b.open = ids.includes(b.id); }); }
}
