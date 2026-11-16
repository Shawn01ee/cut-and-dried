/**
 * Salon-wide notes (news, level-ups, arrivals worth knowing about) in one fixed place: a column at the top centre of
 * the screen, newest last, a few at a time. Notes about one person still rise from that person in the scene.
 */
export class Toasts {
  constructor(parent, { max = 4, life = 3.6, perChar = .045, fade = .4 } = {}) {
    Object.assign(this, { max, life, perChar, fade });
    this.el = document.createElement('div'); this.el.id = 'toasts'; parent.appendChild(this.el);
    this.items = [];
  }
  /** Shows a note; `kind` is '' for news that matters, 'quiet' for the routine. The oldest goes when there are too many. */
  show(text, kind = '') {
    const el = document.createElement('div'); el.className = 'toast' + (kind ? ' ' + kind : ''); el.textContent = text; this.el.appendChild(el);
    this.items.push({ el, t: 0, life: this.life + text.length * this.perChar });
    while (this.items.length > this.max) this.#drop(this.items[0]);
  }
  update(dt) {
    for (const it of this.items.slice()) {
      it.t += dt;
      if (it.t >= it.life) this.#drop(it); else it.el.style.opacity = it.t > it.life - this.fade ? Math.max(0, (it.life - it.t) / this.fade) : 1;
    }
  }
  /** The column's box on screen, for anything that has to keep clear of it (speech bubbles), or null when empty. */
  get rect() { if (!this.items.length) return null; const r = this.el.getBoundingClientRect(); return { L: r.left, R: r.right, T: r.top, B: r.bottom }; }
  #drop(it) { it.el.remove(); this.items.splice(this.items.indexOf(it), 1); }
}
