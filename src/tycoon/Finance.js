/**
 * Rounds Daniel, the company's CEO, is willing to invest. The share he asks for comes from the salon's value:
 * the better the salon is doing, the less of it each dollar costs.
 */
export const INVESTMENTS = [
  { amount: 3000, level: 1 },
  { amount: 8000, level: 2 },
  { amount: 15000, level: 3 },
  { amount: 30000, level: 5 },
];
/** Bank loans: repaid in equal daily instalments. Bigger and longer loans carry more interest. */
export const LOANS = [
  { amount: 2000, days: 10, rate: .06 },
  { amount: 5000, days: 20, rate: .12 },
  { amount: 12000, days: 30, rate: .2 },
];
// Lia always keeps control. Each round comes with a revenue target; missing it costs more of the salon.
const MAX_SHARE = .49, ROUND_GAP = 5, TARGET_DAYS = 7, TARGET_MULTIPLE = 1.2, MISSED_PENALTY = .03;
const BUYBACK_CHUNK = .05, BUYBACK_PREMIUM = 1.2, HISTORY_DAYS = 7;
const roundShare = s => Math.round(s * 200) / 200;

/** Investor money, its targets and dividends, and the bank loan. */
export class Finance {
  constructor(economy) {
    this.economy = economy;
    this.investorShare = 0; this.invested = 0; this.dividendsPaid = 0; this.lastRoundDay = -99; this.target = null;
    this.profits = []; this.loan = null; this.version = 0;
  }
  /** Average daily operating profit over the last week. */
  get averageProfit() { return this.profits.length ? this.profits.reduce((a, b) => a + b, 0) / this.profits.length : 0; }
  /** What the salon is worth to an investor. `ctx` is { reputation, followers, chairs, branches }. */
  valuation(ctx) {
    const v = Math.max(15000, this.averageProfit * 80) + ctx.reputation * 120 + ctx.followers * 2 + ctx.chairs * 900 + ctx.branches * 6000;
    return Math.round(v / 100) * 100;
  }
  shareFor(amount, value) { return roundShare(amount / (value + amount)); }
  roundWait(day) { return Math.max(0, ROUND_GAP - (day - this.lastRoundDay)); }
  canInvest(i, level, value, day) {
    const o = INVESTMENTS[i];
    return !!o && level >= o.level && !this.target && !this.roundWait(day) && this.investorShare + this.shareFor(o.amount, value) <= MAX_SHARE + 1e-9;
  }
  /** Takes a round: cash now, a share for Daniel and a revenue target for the next week. */
  takeInvestment(i, level, value, day) {
    if (!this.canInvest(i, level, value, day)) return false;
    const o = INVESTMENTS[i];
    this.economy.fund('investorFunds', o.amount);
    this.investorShare = roundShare(this.investorShare + this.shareFor(o.amount, value)); this.invested += o.amount; this.lastRoundDay = day;
    this.target = { due: day + TARGET_DAYS, need: Math.round(o.amount * TARGET_MULTIPLE), progress: 0 };
    this.version++; return true;
  }
  /** Buying back a slice costs today's value or the value Daniel paid in at, whichever is higher, plus a premium. */
  buybackPrice(value) { const paidAt = this.investorShare ? this.invested / this.investorShare : 0; return Math.round(Math.min(BUYBACK_CHUNK, this.investorShare) * Math.max(value, paidAt) * BUYBACK_PREMIUM); }
  buyBack(value) {
    if (!this.investorShare) return false;
    const chunk = Math.min(BUYBACK_CHUNK, this.investorShare);
    if (!this.economy.spend('buyback', this.buybackPrice(value))) return false;
    this.invested = Math.round(this.invested * (1 - chunk / this.investorShare)); this.investorShare = roundShare(this.investorShare - chunk);
    this.version++; return true;
  }
  loanTerms(i) { const l = LOANS[i], total = Math.round(l.amount * (1 + l.rate)); return { ...l, total, daily: Math.ceil(total / l.days) }; }
  takeLoan(i) {
    if (this.loan || !LOANS[i]) return false;
    const t = this.loanTerms(i);
    this.economy.fund('loanFunds', t.amount); this.loan = { amount: t.amount, daily: t.daily, remaining: t.total, daysLeft: t.days };
    this.version++; return true;
  }
  /** Pays off whatever is left in one go. */
  repayLoan() {
    if (!this.loan || !this.economy.spend('loanRepayment', this.loan.remaining)) return false;
    this.loan = null; this.version++; return true;
  }
  /**
   * At closing: Daniel's dividend on a profitable day, the loan instalment and the investment target.
   * Returns { dividend, instalment, news } where news is 'met', 'missed' or null.
   */
  closeDay(profit, revenue, day) {
    this.profits.push(profit); if (this.profits.length > HISTORY_DAYS) this.profits.shift();
    const dividend = profit > 0 ? Math.round(profit * this.investorShare) : 0;
    if (dividend) { this.economy.charge('dividend', dividend); this.dividendsPaid += dividend; }
    let instalment = 0, news = null;
    if (this.loan) {
      instalment = Math.min(this.loan.daily, this.loan.remaining);
      this.economy.charge('loanRepayment', instalment);
      this.loan.remaining -= instalment; this.loan.daysLeft--;
      if (this.loan.remaining <= 0) this.loan = null;
    }
    if (this.target) {
      this.target.progress += revenue;
      if (this.target.progress >= this.target.need) { this.target = null; news = 'met'; }
      else if (day >= this.target.due) { this.investorShare = roundShare(Math.min(MAX_SHARE, this.investorShare + MISSED_PENALTY)); this.target = null; news = 'missed'; }
    }
    this.version++;
    return { dividend, instalment, news };
  }
  toJSON() { return { investorShare: this.investorShare, invested: this.invested, dividendsPaid: this.dividendsPaid, lastRoundDay: this.lastRoundDay, target: this.target, profits: this.profits, loan: this.loan }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { investorShare: d.investorShare || 0, invested: d.invested || 0, dividendsPaid: d.dividendsPaid || 0, lastRoundDay: d.lastRoundDay ?? -99, target: d.target || null, profits: d.profits || [], loan: d.loan || null });
    this.version++;
  }
}
