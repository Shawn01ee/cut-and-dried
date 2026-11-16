/** Presents the report's observations and explanations; all decisions live in the simulation objects. */
export class DayInsights {
  constructor(i18n) { this.i18n = i18n; }
  render(report) {
    const m = report.metrics; if (!m) return '';
    const t = (k, ...a) => this.i18n.t('ins.' + k, ...a), usd = n => (n < 0 ? '−' : n > 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const c = report.comparison, row = p => `<div class="brow"><span>${t(p.group)} · ${this.i18n.t('led.' + p.category)}</span><span class="sp"></span><span class="${p.amount < 0 ? 'bad' : 'good'}">${usd(p.amount)}</span></div>`;
    let comparison = `<div class="dim">${t('first')}</div>`;
    if (c) {
      const shown = c.parts.slice(0, 3), rest = c.parts.slice(3).reduce((s, p) => s + p.amount, 0);
      comparison = `<div class="${c.delta < 0 ? 'bad' : 'good'}">${t('change', c.day, usd(c.delta))}</div>${shown.map(row).join('')}${c.parts.length > 3 ? `<div>${t('other', usd(rest))}</div>` : ''}`;
      if (c.hours != null && c.hours !== report.hours) comparison += `<div class="dim">${t('hours', c.hours, report.hours)}</div>`;
    }
    return `<div class="hsec"><h3>${t('title')}</h3>${comparison}<div class="dim">${t('ledgerNote')}</div>
      <div>${t('visits', m.arrivals, m.served, m.lost.seats, m.lost.patience, m.lost.closing)}</div>${m.satisfaction == null ? '' : `<div>${t('satisfaction', m.served, Math.round(m.satisfaction * 100))}</div>`}
      <h3>${t('next')}</h3>${(report.advice || []).map(a => `<p>${t('advice.' + a.id, ...a.args)}</p>`).join('')}<div class="dim">${t('uncertainty')}</div></div>`;
  }
}
