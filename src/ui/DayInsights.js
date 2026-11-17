/** Presents the report's observations and explanations; all decisions live in the simulation objects. */
export class DayInsights {
  constructor(i18n) { this.i18n = i18n; }
  /** Chairs that sat free while clients waited for a shampoo booth, in chair-hours. */
  #waits(m, t) { const h = m.waits?.booth || 0; return h >= .1 ? `<div>${t('boothWait', h.toFixed(1))}</div>` : ''; }
  /** Who stayed past closing and what it cost. */
  #overtime(report, t, usd) {
    const by = report.overtimeBy || []; if (!by.length) return '';
    const shown = by.slice(0, 4).map(x => t('otOne', this.i18n.name(x.name), x.hours)).join(' · ') + (by.length > 4 ? ' ' + t('otMore', by.length - 4) : '');
    return `<div>${t('overtime', shown, usd(-report.overtimePay))}</div>`;
  }
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
    const departments=report.departments||{}, partRows=['makeup','nails','idol'].filter(k=>departments[k]?.booked).map(k=>`<div>${t('part',this.i18n.t(k==='idol'?'sp.idol':'dept.'+k),departments[k].booked,departments[k].completed,departments[k].missed)}</div>`).join('');
    const network=report.network, networkRow=network?.outlets?`<div>${t('network',network.outlets,network.closed,network.operatingLosses,usd(network.localProfit),usd(network.hqContribution))}</div>`:'';
    return `<div class="hsec"><h3>${t('title')}</h3>${comparison}<div class="dim">${t('ledgerNote')}</div>
      <div>${t('visits', m.arrivals, m.served, m.lost.seats, m.lost.patience, m.lost.closing)}</div>${this.#waits(m, t)}${this.#overtime(report, t, usd)}${m.satisfaction == null ? '' : `<div>${t('satisfaction', m.served, Math.round(m.satisfaction * 100))}</div>`}
      ${partRows}${networkRow}
      <h3>${t('next')}</h3>${(report.advice || []).map(a => `<p>${t('advice.' + a.id, ...a.args)}</p>`).join('')}<div class="dim">${t('uncertainty')}</div></div>`;
  }
}
