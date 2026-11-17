/**
 * Playtest only: two questions under a day's report, asked after the player has read it. Why did today's profit change,
 * and what will they change tomorrow? "Not sure" is an answer too: it marks where the report did not explain enough.
 * The answers are kept with what the report actually showed, so they can be compared later.
 */
export class DayQuestions {
  constructor(i18n) { this.i18n = i18n; this.draft = { day: null, q1: '', q2: '', unsure: false }; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }
  /** Which first question fits today: the first day, a lower profit than yesterday, or a higher one. */
  ask(report) { const c = report.comparison; return !c ? 'pt.q1first' : c.delta < 0 ? 'pt.q1down' : 'pt.q1up'; }
  render(report) {
    if (this.draft.day !== report.day) this.draft = { day: report.day, q1: '', q2: '', unsure: false };
    const d = this.draft, esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<div class="hsec ptq"><h3>${this.#t('pt.title')}</h3>
      <label>${this.#t(this.ask(report))}</label><textarea data-pt="q1" rows="2">${esc(d.q1)}</textarea>
      <label>${this.#t('pt.q2')}</label><textarea data-pt="q2" rows="2">${esc(d.q2)}</textarea>
      <label class="ptu"><input type="checkbox" data-pt="unsure" ${d.unsure ? 'checked' : ''}> ${this.#t('pt.unsure')}</label></div>`;
  }
  /** Keeps what is typed, so redrawing the report does not lose it. True when the element was one of the answers. */
  input(el) { const k = el && el.dataset && el.dataset.pt; if (!k) return false; this.draft[k] = k === 'unsure' ? el.checked : el.value; return true; }
  /** The answers, and what the report showed: profit, the change from yesterday with its three largest parts, visits. */
  collect(report) {
    const c = report.comparison, d = this.draft, m = report.metrics || {};
    return { asked: this.ask(report), q1: d.q1.trim(), q2: d.q2.trim(), unsure: d.unsure,
      facts: { profit: report.profit, delta: c ? c.delta : null, top: c ? c.parts.slice(0, 3).map(p => ({ part: p.group + ':' + p.category, amount: Math.round(p.amount) })) : [],
        arrivals: m.arrivals, served: report.served, lost: m.lost, overtime: report.overtime || 0 } };
  }
}
