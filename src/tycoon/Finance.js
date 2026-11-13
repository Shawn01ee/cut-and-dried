/**
 * Capital from Daniel, the company's CEO: cash now for a share of every profitable day from then on.
 * Larger rounds open as the salon grows; Lia never gives away more than MAX_SHARE.
 */
export const INVESTMENTS = [
  { amount: 3000, share: .1, level: 1 },
  { amount: 8000, share: .15, level: 2 },
  { amount: 15000, share: .2, level: 3 },
];
/** Bank loans: repaid in equal daily instalments. Bigger and longer loans carry more interest. */
export const LOANS = [
  { amount: 2000, days: 10, rate: .06 },
  { amount: 5000, days: 20, rate: .12 },
  { amount: 12000, days: 30, rate: .2 },
];
const MAX_SHARE = .45, BUYBACK_MULTIPLE = 1.5;

/** Investor money, loan repayments and what they cost each day. */
export class Finance {
  constructor(economy) { this.economy = economy; this.investorShare = 0; this.invested = 0; this.taken = []; this.loan = null; this.version = 0; }
  canInvest(i, level) { const o = INVESTMENTS[i]; return !!o && level >= o.level && !this.taken.includes(i) && this.investorShare + o.share <= MAX_SHARE + 1e-9; }
  takeInvestment(i, level) {
    if (!this.canInvest(i, level)) return false;
    const o = INVESTMENTS[i];
    this.economy.fund('investorFunds', o.amount); this.investorShare += o.share; this.invested += o.amount; this.taken.push(i);
    this.version++; return true;
  }
  get buybackCost() { return Math.round(this.invested * BUYBACK_MULTIPLE); }
  /** Buys Daniel's whole stake back. */
  buyBack() {
    if (!this.investorShare || !this.economy.spend('buyback', this.buybackCost)) return false;
    this.investorShare = 0; this.invested = 0; this.taken = []; this.version++; return true;
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
  /** At closing: Daniel's share of a profitable day, then today's loan instalment. Returns what was paid. */
  closeDay(profit) {
    const dividend = profit > 0 ? Math.round(profit * this.investorShare) : 0;
    if (dividend) this.economy.charge('dividend', dividend);
    let instalment = 0;
    if (this.loan) {
      instalment = Math.min(this.loan.daily, this.loan.remaining);
      this.economy.charge('loanRepayment', instalment);
      this.loan.remaining -= instalment; this.loan.daysLeft--;
      if (this.loan.remaining <= 0) this.loan = null;
    }
    this.version++;
    return { dividend, instalment };
  }
  toJSON() { return { investorShare: this.investorShare, invested: this.invested, taken: this.taken, loan: this.loan }; }
  restore(d) { if (!d) return; Object.assign(this, { investorShare: d.investorShare || 0, invested: d.invested || 0, taken: d.taken || [], loan: d.loan || null }); this.version++; }
}
