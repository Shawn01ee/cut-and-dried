/** Exact ledger differences, not causal estimates. Keeps only the last open day's comparison data. */
export class PerformanceExplainer {
  constructor() { this.previous = null; }
  explain(report) {
    const p = this.previous;
    if (!p || p.day >= report.day) return null;
    const parts = [];
    for (const [group, sign] of [['revenue', 1], ['operating', -1]]) {
      const now = report[group] || {}, before = p[group] || {};
      for (const category of new Set([...Object.keys(now), ...Object.keys(before)])) {
        const amount = ((now[category] || 0) - (before[category] || 0)) * sign;
        if (amount) parts.push({ group, category, amount });
      }
    }
    parts.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    return { day: p.day, delta: report.profit - p.profit, hours: p.hours, parts };
  }
  remember(report) { this.previous = { day: report.day, profit: report.profit, hours: report.hours, revenue: { ...report.revenue }, operating: { ...report.operating } }; }
  toJSON() { return this.previous; }
  restore(d) { this.previous = d && Number.isFinite(d.profit) && Number.isFinite(d.day) ? d : null; }
}
