// Running costs. Everything else spent (furniture, hiring, loan repayments, the investor's share) sits below operating profit.
const OPERATING = new Set(['rent', 'wages', 'commission', 'bonus', 'utilities', 'maintenance', 'materials', 'hospitality', 'marketing', 'fees']);
const blankDay = () => ({ revenue: {}, expenses: {}, funding: {} });
const pickCosts = (expenses, wanted) => Object.fromEntries(Object.entries(expenses).filter(([k]) => OPERATING.has(k) === wanted));

/** The salon's money: current cash, lifetime earnings and a categorised ledger for the day. */
export class Economy {
  constructor(startingCash) { this.cash = startingCash; this.totalEarned = 0; this.today = blankDay(); }
  canAfford(amount) { return this.cash >= amount; }
  earn(category, amount) { this.cash += amount; this.totalEarned += amount; this.today.revenue[category] = (this.today.revenue[category] || 0) + amount; }
  /** Money that is not income, such as a loan or an investment. It never counts towards goals. */
  fund(category, amount) { this.cash += amount; this.today.funding[category] = (this.today.funding[category] || 0) + amount; }
  /** Optional purchase: refused when the salon cannot afford it. */
  spend(category, amount) { if (!this.canAfford(amount)) return false; this.charge(category, amount); return true; }
  /** Unavoidable cost such as wages, which may push cash below zero. */
  charge(category, amount) { this.cash -= amount; this.today.expenses[category] = (this.today.expenses[category] || 0) + amount; }
  #sum(group) { return Object.values(group).reduce((a, b) => a + b, 0); }
  get dailyRevenue() { return this.#sum(this.today.revenue); }
  get dailyOperatingCost() { return this.#sum(pickCosts(this.today.expenses, true)); }
  get dailyInvestment() { return this.#sum(pickCosts(this.today.expenses, false)); }
  /** Operating profit: purchases such as furniture or a new branch are investments, not running costs. */
  get dailyProfit() { return this.dailyRevenue - this.dailyOperatingCost; }
  closeDay() {
    return { revenue: { ...this.today.revenue }, operating: pickCosts(this.today.expenses, true), investment: pickCosts(this.today.expenses, false), funding: { ...this.today.funding },
      totalRevenue: this.dailyRevenue, totalOperating: this.dailyOperatingCost, totalInvestment: this.dailyInvestment, profit: this.dailyProfit };
  }
  startDay() { this.today = blankDay(); }
  toJSON() { return { cash: this.cash, totalEarned: this.totalEarned }; }
  restore(data) { this.cash = data.cash; this.totalEarned = data.totalEarned; }
}
