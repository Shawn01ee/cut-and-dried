import { PlaytestReport } from '../playtest/PlaytestReport.js';

/**
 * The facilitator's results screen: the three tables for every participant on this computer, and the same tables as
 * Markdown to paste into the test document.
 */
export class PlaytestResults {
  constructor(i18n) { this.i18n = i18n; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }
  /** A screen or a control as the facilitator would name it: a tab, a menu screen, build mode, or the raw id. */
  #name(id) {
    if (!id) return '–';
    const [k, v] = id.split(':'), has = key => this.#t(key) !== key;
    if (k === 'tab' && has('tab.' + v)) return this.#t('pt.n.tab', this.#t('tab.' + v));
    if (k === 'menu' && has('pt.n.menu.' + v)) return this.#t('pt.n.menu.' + v);
    if (k === 'build' && has('f.' + v)) return this.#t('pt.n.build', this.#t('f.' + v));
    if (id === 'styling') return this.#t('pt.n.styling');
    return id;
  }
  /** Rows as cells: header first. Shared by the screen and the Markdown. */
  #tables(sessions) {
    const R = new PlaytestReport(sessions), t = (k, ...a) => this.#t(k, ...a), dash = v => v == null || v === '' ? '–' : String(v);
    const money = n => (n < 0 ? '−$' : '+$') + Math.abs(n).toLocaleString();
    const A = [[t('pt.c.who'), t('pt.exp'), t('pt.c.service'), t('pt.c.happy'), t('pt.c.seat'), t('pt.c.hire'), t('pt.c.idle'), t('pt.c.verdicts')],
      ...R.milestones.map(m => [m.who, m.exp == null ? '–' : t(m.exp ? 'pt.yes' : 'pt.no'), dash(m.service), dash(m.happy), dash(m.seat), dash(m.hire), m.idle ? `${m.idle} · ${m.longest}s` : '0',
        t('pt.c.verdictLine', m.right, m.partly, m.wrong, m.unsure)])];
    const B = [[t('pt.c.who'), t('pt.c.min'), t('pt.c.what'), t('pt.c.screen')],
      ...R.stuck.map(r => [r.who, r.t, r.kind === 'idle' ? t('pt.c.idleRow', r.detail) : t('pt.c.repeatRow', this.#name(r.what), r.detail), this.#name(r.view)])];
    const C = [[t('pt.c.who'), t('pt.c.day'), t('pt.c.top'), t('pt.c.reason'), t('pt.c.verdict'), t('pt.c.plans'), t('pt.c.followed'), t('pt.c.note')],
      ...R.answers.map(a => [a.who, a.day, a.top ? `${t('pt.r.' + a.top.group)} ${money(a.top.amount)}` : '–', a.reason ? t('pt.r.' + a.reason) : t('pt.r.unsure'), t('pt.v.' + a.verdict),
        a.plans.length ? a.plans.map(p => t('pt.p.' + p)).join(', ') : '–', a.followed ? t('pt.f.' + a.followed) : '–', dash(a.note)])];
    return { A, B, C };
  }
  render(sessions) {
    const T = this.#tables(sessions), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const table = rows => `<table class="pttab"><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join('')}</tr>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${rows[0].length}" class="dim">${this.#t('pt.none')}</td></tr>`}</table>`;
    return `<div class="mhead">${this.#t('pt.resTitle', sessions.length)}</div><div class="dim">${this.#t('pt.resNote')}</div>
      <div class="hsec"><h3>${this.#t('pt.resA')}</h3>${table(T.A)}</div><div class="hsec"><h3>${this.#t('pt.resB')}</h3>${table(T.B)}</div><div class="hsec"><h3>${this.#t('pt.resC')}</h3>${table(T.C)}</div>`;
  }
  /** The three tables as Markdown, ready to paste into the document. */
  markdown(sessions) {
    const T = this.#tables(sessions), md = rows => [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map(r => '| ' + r.map(c => String(c).replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |').join('\n');
    return `### ${this.#t('pt.resA')}\n\n${md(T.A)}\n\n### ${this.#t('pt.resB')}\n\n${md(T.B)}\n\n### ${this.#t('pt.resC')}\n\n${md(T.C)}\n`;
  }
}
