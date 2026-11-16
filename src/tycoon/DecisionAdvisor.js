/** Suggestions from observed events. No inferred lost revenue, causal claims or automatic purchases. */
export class DecisionAdvisor {
  suggest(report) {
    const m = report.metrics; if (!m) return [];
    const out = [], add = (id, ...args) => out.push({ id, args });
    if (m.lost.seats) add('seats', m.lost.seats);
    if (m.lost.patience) add('patience', m.lost.patience);
    if (m.lost.closing) add('closing', m.lost.closing);
    if (report.overtime) add('overtime', report.overtime, report.overtimePay);
    if (!out.length) {
      if (m.served && !m.happy) add('style', m.served);
      else add('observe');
    }
    return out.slice(0, 2);
  }
}
