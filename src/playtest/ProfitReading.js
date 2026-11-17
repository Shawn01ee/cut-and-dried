/**
 * How a player's reading of a day's report is checked. The report's ledger lines are gathered into a few groups a
 * player can pick from; the "right" group is the one that moved profit most that day (on the first day, with nothing
 * to compare, the largest cost). Picking it is right, picking another of the top three is partly right.
 */
export const REASONS = ['svc', 'sales', 'bonus', 'staff', 'ot', 'mat', 'fixed', 'mkt', 'other'];
const GROUP = {
  services: 'svc', treatment: 'svc', membership: 'svc', special: 'svc', makeup: 'svc', nails: 'svc',
  products: 'sales', online: 'sales', retail: 'sales', wholesale: 'sales', brand: 'sales', ppl: 'sales', sponsor: 'sales', royalties: 'sales',
  onboarding: 'bonus', styleBook: 'bonus', missionBonus: 'bonus', monthGoal: 'bonus', reviewBonus: 'bonus', contest: 'bonus', regularGift: 'bonus',
  wages: 'staff', commission: 'staff', bonus: 'staff', welfare: 'staff', recruiting: 'staff', training: 'staff', seminar: 'staff', networkTraining: 'staff',
  overtime: 'ot', materials: 'mat',
  rent: 'fixed', utilities: 'fixed', maintenance: 'fixed', repairs: 'fixed', fees: 'fixed', fine: 'fixed', penalty: 'fixed', loanInterest: 'fixed', shipping: 'fixed', production: 'fixed',
  marketing: 'mkt', agency: 'mkt',
};
export const groupOf = category => GROUP[category] || 'other';
/** What tomorrow's plan can be, and how a change shows in the record (see PlaytestReport). */
export const PLANS = ['seat', 'hire', 'hours', 'price', 'mkt', 'care', 'none', 'other'];

/**
 * The groups in the order that explains the day: by how much they moved profit (in the direction it moved), or on the
 * first day the costs, largest first. `facts` is what DayQuestions kept from the report.
 */
export function explainingGroups(facts) {
  const sums = {};
  if (facts.delta == null) for (const [k, v] of Object.entries(facts.costs || {})) sums[groupOf(k)] = (sums[groupOf(k)] || 0) - v;
  else for (const p of facts.parts || []) { const g = groupOf(p.part.split(':')[1]); sums[g] = (sums[g] || 0) + p.amount; }
  const sign = facts.delta == null || facts.delta < 0 ? 1 : -1;
  return Object.entries(sums).filter(([, v]) => v * sign < 0).sort((a, b) => (a[1] - b[1]) * sign).map(([g, v]) => ({ group: g, amount: Math.round(v) }));
}
/** 'right', 'partly', 'wrong' or 'unsure' for one answer. */
export function judge(answer) {
  if (answer.unsure || !answer.reason) return 'unsure';
  const order = explainingGroups(answer.facts).map(x => x.group);
  return order[0] === answer.reason ? 'right' : order.slice(0, 3).includes(answer.reason) ? 'partly' : 'wrong';
}
