/**
 * Months of thirty days. The last day of each month is settled: the days are added up, compared with the
 * month before and checked against the month's revenue goal. Then the next goal is set from what was made.
 */
export const MONTH_DAYS = 30;
const GOAL_GROWTH = 1.1, GOAL_REWARD = .04, MIN_GOAL = 3000;
const roundTo = (v, step) => Math.round(v / step) * step;

/** Adds up daily reports: the ledgers by category, the totals, clients served, reviews, reputation and followers. */
export function summariseDays(days) {
  const add = key => days.reduce((acc, d) => { Object.entries(d[key] || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; }); return acc; }, {});
  const sum = f => days.reduce((s, d) => s + (f(d) || 0), 0), count = sum(d => d.reviews.count);
  return {
    revenue: add('revenue'), operating: add('operating'), investment: add('investment'), funding: add('funding'),
    totalRevenue: sum(d => d.totalRevenue), totalOperating: sum(d => d.totalOperating), totalInvestment: sum(d => d.totalInvestment), profit: sum(d => d.profit),
    served: sum(d => d.served), reviews: { count, average: count ? sum(d => d.reviews.count * d.reviews.average) / count : 0 },
    reputation: sum(d => d.reputation), followers: sum(d => d.followers.change), days: days.map(d => ({ day: d.day, profit: d.profit, revenue: d.totalRevenue })),
  };
}

/** A goal set from a month's revenue: 10% more, paying 4% of the goal. */
export function goalFrom(revenue) {
  const target = Math.max(MIN_GOAL, roundTo(revenue * GOAL_GROWTH, 100));
  return { revenue: target, reward: roundTo(target * GOAL_REWARD, 10) };
}

export class MonthlyLedger {
  constructor() { this.days = []; this.report = null; this.goal = null; this.start = null; }
  static isMonthEnd(day) { return day % MONTH_DAYS === 0; }
  static monthOf(day) { return Math.ceil(day / MONTH_DAYS); }
  /** What the salon looks like as a month begins, to measure the month against. */
  begin(snapshot) { this.start = snapshot; }
  log(report) { this.days.push(report); }
  get revenueSoFar() { return this.days.reduce((s, d) => s + d.totalRevenue, 0); }

  /**
   * Closes the month that ends on `day`. `now` is a snapshot of the salon, `paid` whether the goal was met
   * (the caller pays it). Returns the month's report and sets the next goal.
   */
  settle(day, now, paid) {
    const days = this.days, s = summariseDays(days), start = this.start || now;
    const mine = (name, k) => (start.staff[name] ? start.staff[name][k] : 0);
    const staff = Object.entries(now.staff).map(([name, v]) => ({ name, earn: v.earn - mine(name, 'earn'), served: v.served - mine(name, 'served') }))
      .filter(x => x.served > 0).sort((a, b) => b.earn - a.earn).slice(0, 3);
    const best = days.reduce((b, d) => (!b || d.profit > b.profit ? d : b), null);
    const prev = this.report ? { totalRevenue: this.report.totalRevenue, profit: this.report.profit, served: this.report.served } : null;
    const goal = this.goal ? { ...this.goal, made: s.totalRevenue, hit: paid } : null;
    this.goal = goalFrom(s.totalRevenue);
    this.report = {
      month: MonthlyLedger.monthOf(day), from: days.length ? days[0].day : day, to: day, ...s, prev,
      cash: { from: start.cash, to: now.cash }, reviewCount: { from: start.reviews, to: now.reviews },
      bestDay: best && best.profit > 0 ? { day: best.day, profit: best.profit } : null, staff, goal, nextGoal: this.goal,
    };
    this.days = []; this.start = now;
    return this.report;
  }

  toJSON() { return { days: this.days, report: this.report, goal: this.goal, start: this.start }; }
  restore(d, snapshot) {
    if (!d) { this.days = []; this.report = null; this.goal = null; this.start = snapshot; return; }
    Object.assign(this, { days: d.days || [], report: d.report || null, goal: d.goal || null, start: d.start || snapshot });
  }
}
