const blankDay = () => ({ revenue: {}, expenses: {} });

/** The salon's money: current cash, lifetime earnings and a categorised ledger for the day. */
export class Economy {
  constructor(startingCash) { this.cash = startingCash; this.totalEarned = 0; this.today = blankDay(); }
  canAfford(amount) { return this.cash >= amount; }
  earn(category, amount) { this.cash += amount; this.totalEarned += amount; this.today.revenue[category] = (this.today.revenue[category] || 0) + amount; }
  /** Optional purchase: refused when the salon cannot afford it. */
  spend(category, amount) { if (!this.canAfford(amount)) return false; this.charge(category, amount); return true; }
  /** Unavoidable cost such as wages, which may push cash below zero. */
  charge(category, amount) { this.cash -= amount; this.today.expenses[category] = (this.today.expenses[category] || 0) + amount; }
  #sum(group) { return Object.values(group).reduce((a, b) => a + b, 0); }
  get dailyRevenue() { return this.#sum(this.today.revenue); }
  get dailyExpenses() { return this.#sum(this.today.expenses); }
  get dailyProfit() { return this.dailyRevenue - this.dailyExpenses; }
  closeDay() { const report = { revenue: { ...this.today.revenue }, expenses: { ...this.today.expenses }, totalRevenue: this.dailyRevenue, totalExpenses: this.dailyExpenses, profit: this.dailyProfit }; return report; }
  startDay() { this.today = blankDay(); }
  toJSON() { return { cash: this.cash, totalEarned: this.totalEarned }; }
  restore(data) { this.cash = data.cash; this.totalEarned = data.totalEarned; }
}
