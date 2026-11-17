import { REASONS, PLANS } from '../playtest/ProfitReading.js';

/**
 * Playtest only: two questions under a day's report, answered with a tap. Why did today's profit change (one reason),
 * and what will they change tomorrow (any number of plans)? "Can't tell" is an answer too: it marks where the report
 * did not explain enough. A line of their own words is optional. The answers are kept with what the report showed,
 * so they can be checked against it (see ProfitReading).
 */
export class DayQuestions {
  constructor(i18n) { this.i18n = i18n; this.draft = this.#blank(null); }
  #blank(day) { return { day, reason: null, plans: [], unsure: false, note: '' }; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }
  /** Which first question fits today: the first day, a lower profit than yesterday, or a higher one. */
  ask(report) { const c = report.comparison; return !c ? 'pt.q1first' : c.delta < 0 ? 'pt.q1down' : 'pt.q1up'; }
  render(report) {
    if (this.draft.day !== report.day) this.draft = this.#blank(report.day);
    const d = this.draft, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const chip = (q, v, on) => `<button data-act="ptpick:${q}.${v}" class="${on ? 'sel' : ''}">${this.#t('pt.' + q + '.' + v)}</button>`;
    return `<div class="hsec ptq"><h3>${this.#t('pt.title')}</h3>
      <label>${this.#t(this.ask(report))}</label><div class="ptpicks">${REASONS.map(v => chip('r', v, d.reason === v)).join('')}${chip('r', 'unsure', d.unsure)}</div>
      <label>${this.#t('pt.q2')}</label><div class="ptpicks">${PLANS.map(v => chip('p', v, d.plans.includes(v))).join('')}</div>
      <label>${this.#t('pt.note')}</label><textarea data-pt="note" rows="1">${esc(d.note)}</textarea></div>`;
  }
  /** A tap on a choice: one reason (or "can't tell"), any number of plans. */
  pick(value) {
    const [q, v] = value.split('.'), d = this.draft;
    if (q === 'r') { if (v === 'unsure') { d.unsure = !d.unsure; d.reason = null; } else { d.reason = d.reason === v ? null : v; d.unsure = false; } }
    else d.plans = d.plans.includes(v) ? d.plans.filter(x => x !== v) : [...d.plans, v];
  }
  /** Keeps what is typed, so redrawing the report does not lose it. True when the element was the note. */
  input(el) { if (!el || !el.dataset || el.dataset.pt !== 'note') return false; this.draft.note = el.value; return true; }
  /** The answers, and what the report showed: profit, every part of the change from yesterday, today's costs, visits. */
  collect(report) {
    const c = report.comparison, d = this.draft, m = report.metrics || {};
    return { asked: this.ask(report), reason: d.reason, plans: d.plans, unsure: d.unsure, note: d.note.trim(),
      facts: { profit: report.profit, delta: c ? c.delta : null, parts: c ? c.parts.map(p => ({ part: p.group + ':' + p.category, amount: Math.round(p.amount) })) : [],
        costs: Object.fromEntries(Object.entries(report.operating || {}).map(([k, v]) => [k, Math.round(v)])), arrivals: m.arrivals, served: report.served, lost: m.lost, overtime: report.overtime || 0 } };
  }
}
