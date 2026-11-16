/**
 * Which kinds of notes the player wants to see, kept in the browser between visits. Decisions (cards) always show:
 * only passive notes can be switched off.
 *
 * - news: salon-wide notes in the top column (level-ups, bookings, the weather, the rival)
 * - people: what rises from someone's head (payments, satisfaction)
 * - minor: small routine notes (a new regular, a review, a heart)
 * - chat: speech bubbles
 */
export const NOTIFY_KINDS = ['news', 'people', 'minor', 'chat'];
const KEY = 'cd.notify';

export class NotifySettings {
  /** `onChat(on)` keeps the older chat setting in step (it lives in the menu too). */
  constructor({ chat = true, onChat = () => {} } = {}) {
    this.onChat = onChat;
    this.on = Object.fromEntries(NOTIFY_KINDS.map(k => [k, true])); this.on.chat = chat;
    try { Object.assign(this.on, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* private mode: defaults */ }
  }
  allows(kind) { return this.on[kind] !== false; }
  set(kind, on) {
    if (!NOTIFY_KINDS.includes(kind)) return;
    this.on[kind] = on; if (kind === 'chat') this.onChat(on);
    try { localStorage.setItem(KEY, JSON.stringify(this.on)); } catch { /* private mode */ }
  }
  /** The settings card: one aligned row per kind, label on the left, on/off on the right. */
  html(t) {
    const row = k => `<div class="brow"><span>${t('nt.' + k)}</span><span class="sp"></span><span class="seg"><button data-nt="${k}.1" class="${this.allows(k) ? 'sel' : ''}">${t('pol.on')}</button><button data-nt="${k}.0" class="${this.allows(k) ? '' : 'sel'}">${t('pol.off')}</button></span></div><div class="dim">${t('nt.' + k + 'D')}</div>`;
    return `<div class="brow"><b>${t('nt.title')}</b><span class="sp"></span><button data-nt="close">×</button></div>${NOTIFY_KINDS.map(row).join('')}<div class="dim">${t('nt.cards')}</div>`;
  }
}
