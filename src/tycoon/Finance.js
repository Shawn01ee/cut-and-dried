/**
 * Rounds Shawn, the company's CEO, is willing to invest. The share he asks for comes from the salon's value:
 * the better the salon is doing, the less of it each dollar costs.
 */
export const INVESTMENTS = [
  { amount: 3000, level: 1 },
  { amount: 8000, level: 2 },
  { amount: 15000, level: 3 },
  { amount: 30000, level: 5 },
];
/**
 * Bank loans: the principal is paid back in equal daily parts, and every day interest is charged on what is still
 * owed. Paying the rest off early saves the interest that would have followed.
 */
export const LOANS = [
  { amount: 2000, days: 10, rate: .01 },
  { amount: 5000, days: 20, rate: .011 },
  { amount: 12000, days: 30, rate: .012 },
];
// Lia always keeps control. Each round comes with a revenue mission: meet it and Shawn hands back part of his stake,
// miss it and he takes more.
export const MAX_SHARE = .49;
const ROUND_GAP = 5;
export const MISSION = { days: 7, multiple: 1.2, reward: .02, penalty: .03 };
const BUYBACK_CHUNK = .05, BUYBACK_PREMIUM = 1.2, HISTORY_DAYS = 7;
/** How the salon's value is counted. */
export const VALUE_RULES = { profitMultiple: 80, floor: 15000, perReputation: 120, perFollower: 2, perChair: 900, perBranch: 6000 };
const roundShare = s => Math.round(s * 200) / 200;

/** Investor money, its missions and dividends, and the bank loan. */
export class Finance {
  constructor(economy) {
    this.economy = economy;
    this.investorShare = 0; this.invested = 0; this.dividendsPaid = 0; this.lastRoundDay = -99; this.target = null;
    this.profits = []; this.loan = null; this.version = 0;
  }
  /** Average daily operating profit over the last week. */
  get averageProfit() { return this.profits.length ? this.profits.reduce((a, b) => a + b, 0) / this.profits.length : 0; }
  /** The parts that make up the salon's value. `ctx` is { reputation, followers, chairs, branches }. */
  valuationParts(ctx) {
    const R = VALUE_RULES;
    return [
      ['profit', Math.round(this.averageProfit), Math.round(Math.max(R.floor, this.averageProfit * R.profitMultiple))],
      ['rep', Math.round(ctx.reputation), Math.round(ctx.reputation * R.perReputation)],
      ['followers', ctx.followers, ctx.followers * R.perFollower],
      ['chairs', ctx.chairs, ctx.chairs * R.perChair],
      ['branches', ctx.branches, ctx.branches * R.perBranch],
    ];
  }
  /** What the salon is worth to an investor. */
  valuation(ctx) { return Math.round(this.valuationParts(ctx).reduce((sum, [, , v]) => sum + v, 0) / 100) * 100; }
  shareFor(amount, value) { return roundShare(amount / (value + amount)); }
  roundWait(day) { return Math.max(0, ROUND_GAP - (day - this.lastRoundDay)); }
  canInvest(i, level, value, day) {
    const o = INVESTMENTS[i];
    return !!o && level >= o.level && !this.target && !this.roundWait(day) && this.investorShare + this.shareFor(o.amount, value) <= MAX_SHARE + 1e-9;
  }
  /** Revenue the mission for a round of `amount` asks for. */
  missionFor(amount) { return Math.round(amount * MISSION.multiple); }
  /** Takes a round: cash now, a share for Shawn and a revenue mission for the next week. */
  takeInvestment(i, level, value, day) {
    if (!this.canInvest(i, level, value, day)) return false;
    const o = INVESTMENTS[i];
    this.economy.fund('investorFunds', o.amount);
    this.investorShare = roundShare(this.investorShare + this.shareFor(o.amount, value)); this.invested += o.amount; this.lastRoundDay = day;
    this.target = { due: day + MISSION.days, need: this.missionFor(o.amount), progress: 0 };
    this.version++; return true;
  }
  /** Buying back a slice costs today's value or the value Shawn paid in at, whichever is higher, plus a premium. */
  buybackPrice(value) { const paidAt = this.investorShare ? this.invested / this.investorShare : 0; return Math.round(Math.min(BUYBACK_CHUNK, this.investorShare) * Math.max(value, paidAt) * BUYBACK_PREMIUM); }
  buyBack(value) {
    if (!this.investorShare) return false;
    const chunk = Math.min(BUYBACK_CHUNK, this.investorShare);
    if (!this.economy.spend('buyback', this.buybackPrice(value))) return false;
    this.invested = Math.round(this.invested * (1 - chunk / this.investorShare)); this.investorShare = roundShare(this.investorShare - chunk);
    this.version++; return true;
  }
  /** A loan's terms: the daily part of the principal and the interest it would cost if run to the end. */
  loanTerms(i) { const l = LOANS[i]; return { ...l, perDay: Math.ceil(l.amount / l.days), interest: Math.round(l.amount * l.rate * (l.days + 1) / 2) }; }
  takeLoan(i) {
    if (this.loan || !LOANS[i]) return false;
    const t = this.loanTerms(i);
    this.economy.fund('loanFunds', t.amount); this.loan = { principal: t.amount, perDay: t.perDay, rate: t.rate, daysLeft: t.days };
    this.version++; return true;
  }
  /** Interest the loan will charge at the next closing. */
  get interestDue() { return this.loan ? Math.round(this.loan.principal * this.loan.rate) : 0; }
  /** Pays off the principal still owed in one go; no more interest is charged. */
  repayLoan() {
    if (!this.loan || !this.economy.spend('loanRepayment', this.loan.principal)) return false;
    this.loan = null; this.version++; return true;
  }
  /**
   * At closing: Shawn's dividend on a profitable day, the loan's interest and daily part, and the mission.
   * Returns { dividend, instalment, interest, news } where news is 'met', 'missed' or null.
   */
  closeDay(profit, revenue, day) {
    this.profits.push(profit); if (this.profits.length > HISTORY_DAYS) this.profits.shift();
    const dividend = profit > 0 ? Math.round(profit * this.investorShare) : 0;
    if (dividend) { this.economy.charge('dividend', dividend); this.dividendsPaid += dividend; }
    let instalment = 0, interest = 0, news = null;
    if (this.loan) {
      interest = this.interestDue; instalment = Math.min(this.loan.perDay, this.loan.principal);
      if (interest) this.economy.charge('loanInterest', interest);
      this.economy.charge('loanRepayment', instalment);
      this.loan.principal -= instalment; this.loan.daysLeft--;
      if (this.loan.principal <= 0) this.loan = null;
    }
    if (this.target) {
      this.target.progress += revenue;
      if (this.target.progress >= this.target.need) { this.investorShare = roundShare(Math.max(0, this.investorShare - MISSION.reward)); this.target = null; news = 'met'; }
      else if (day >= this.target.due) { this.investorShare = roundShare(Math.min(MAX_SHARE, this.investorShare + MISSION.penalty)); this.target = null; news = 'missed'; }
    }
    this.version++;
    return { dividend, instalment, interest, news };
  }
  toJSON() { return { investorShare: this.investorShare, invested: this.invested, dividendsPaid: this.dividendsPaid, lastRoundDay: this.lastRoundDay, target: this.target, profits: this.profits, loan: this.loan }; }
  restore(d) {
    if (!d) return;
    // Loans from older saves stored what was left to repay, interest included.
    const loan = d.loan && d.loan.principal == null ? { principal: d.loan.remaining, perDay: d.loan.daily, rate: .01, daysLeft: d.loan.daysLeft } : d.loan || null;
    Object.assign(this, { investorShare: d.investorShare || 0, invested: d.invested || 0, dividendsPaid: d.dividendsPaid || 0, lastRoundDay: d.lastRoundDay ?? -99, target: d.target || null, profits: d.profits || [], loan });
    this.version++;
  }
}
