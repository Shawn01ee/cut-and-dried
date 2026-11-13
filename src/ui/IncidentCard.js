/**
 * A decision a client forces on the owner, such as a refund demand.
 * Shows one at a time and takes the fallback option when time runs out.
 */
export class IncidentCard {
  #queue = []; #current = null;
  constructor(el, { timeout = 12 } = {}) {
    this.el = el; this.timeout = timeout;
    el.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) this.#resolve(+b.dataset.pick); });
  }
  get busy() { return !!this.#current; }
  /** `options` is a list of { label, run }. */
  show({ title, text, options, fallback = 0 }) {
    this.#queue.push({ title, text, options, fallback, left: this.timeout });
    if (!this.#current) this.#next();
  }
  #next() {
    const c = this.#current = this.#queue.shift() || null;
    this.el.classList.toggle('show', !!c);
    if (!c) { this.el.innerHTML = ''; return; }
    this.el.innerHTML = `<b class="gold">${c.title}</b><div class="itext">${c.text}</div><div class="ibtns">${c.options.map((o, i) => `<button data-pick="${i}">${o.label}</button>`).join('')}</div><div class="tbar"><i></i></div>`;
  }
  #resolve(i) { const c = this.#current; if (!c) return; this.#current = null; c.options[i].run(); this.#next(); }
  /** Counts down in real seconds, so a fast game speed does not rush the player. */
  update(dt) {
    const c = this.#current;
    if (!c) return;
    c.left -= dt;
    const bar = this.el.querySelector('.tbar i');
    if (bar) bar.style.width = Math.max(0, c.left / this.timeout * 100) + '%';
    if (c.left <= 0) this.#resolve(c.fallback);
  }
}
