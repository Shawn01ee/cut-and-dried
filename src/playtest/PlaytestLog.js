/**
 * A playtest session record, kept only when the page is opened with ?playtest. It changes nothing in the game.
 *
 * Times are real seconds since the session started (`t`), with the game day and clock beside them. Milestones are
 * kept once (the first time); events, idle gaps and the player's answers after each day's report are kept in order.
 * Everything stays in this browser (localStorage). Each participant's record is kept: "New participant" files the
 * current one away and starts the next, so the results screen can show everyone (see PlaytestReport).
 */
export const MILESTONES = ['firstArrival', 'firstService', 'firstHappy', 'firstSeat', 'level2', 'firstHire', 'firstReport'];
/** No input for this many seconds while the salon is open counts as an idle gap (a possible place where they got stuck). */
export const IDLE_SECONDS = 45;
const KEY = 'cd.playtest', ARCHIVE = 'cd.playtest.archive';

export class PlaytestLog {
  constructor({ build, lang, store = globalThis.localStorage, now = () => performance.now() }) {
    Object.assign(this, { store, now });
    const old = this.#load(KEY);
    // A record from an older build is filed away, not lost.
    if (old && old.session && old.session.build !== build) { this.#file(old); this.#remove(KEY); }
    this.data = old && old.session && old.session.build === build ? old : {
      session: { id: Math.random().toString(36).slice(2, 8), label: 'P' + (this.archive.length + 1), started: new Date().toISOString(), build, lang, screen: `${innerWidth}x${innerHeight}`, exp: null },
      milestones: {}, checklist: [], answers: [], idle: [], events: [],
    };
    if (!this.data.session.label) this.data.session.label = 'P' + (this.archive.length + 1);
    // Real time carries on across a reload of the same session.
    this.offset = this.data.session.elapsed || 0; this.t0 = now(); this.lastInput = now(); this.view = 'menu';
  }
  /** Seconds since the session started, to a tenth. */
  get t() { return Math.round((this.offset + (this.now() - this.t0) / 1000) * 10) / 10; }
  /** The first time something happens; `where` is the game day and clock. */
  mark(id, where) { if (this.data.milestones[id]) return false; this.data.milestones[id] = { t: this.t, ...where }; this.event('milestone', { id }); return true; }
  step(id, where) { this.data.checklist.push({ id, t: this.t, ...where }); }
  event(kind, info = {}) { this.data.events.push({ t: this.t, kind, ...info }); if (this.data.events.length > 3000) this.data.events.shift(); this.save(); }
  /** What is on screen now (a tab, a menu screen, build mode); logged when it changes. */
  setView(view) { if (view !== this.view) { this.view = view; this.event('view', { view }); } }
  /** Any input. A long gap before it is kept as an idle gap, with what was on screen. */
  input(running) { const gap = (this.now() - this.lastInput) / 1000; if (running && gap >= IDLE_SECONDS) this.data.idle.push({ t: Math.round((this.t - gap) * 10) / 10, seconds: Math.round(gap), view: this.view }); this.lastInput = this.now(); }
  /** The player's answers after a day's report, beside what actually changed. */
  answer(day, a) { this.data.answers = this.data.answers.filter(x => x.day !== day); this.data.answers.push({ day, t: this.t, ...a }); this.save(); }
  /** Whether this participant has played tycoon games before (true, false, or null when not asked). */
  setExp(v) { this.data.session.exp = v; this.save(); }
  save() { this.data.session.elapsed = this.t; try { this.store.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full or blocked: the session still runs */ } }
  #load(key) { try { return JSON.parse(this.store.getItem(key) || 'null'); } catch (e) { return null; } }
  #remove(key) { try { this.store.removeItem(key); } catch (e) { /* ignore */ } }
  /** Earlier participants' records on this computer. */
  get archive() { return this.#load(ARCHIVE) || []; }
  #file(record) { try { this.store.setItem(ARCHIVE, JSON.stringify([...this.archive, record])); } catch (e) { /* ignore */ } }
  /** Every participant so far, this one last. */
  get sessions() { return [...this.archive, this.data]; }
  /** Whether anything has happened in this session yet. */
  get used() { return this.data.events.length > 0 || this.data.answers.length > 0; }
  /** A short summary first (milestone times in minutes), then the full record. */
  toJSON() {
    const min = s => Math.round(s / 6) / 10, ms = this.data.milestones;
    return { summary: { minutes: Object.fromEntries(MILESTONES.map(id => [id, ms[id] ? min(ms[id].t) : null])), idleGaps: this.data.idle.length, longestIdle: Math.max(0, ...this.data.idle.map(x => x.seconds)), answered: this.data.answers.length, unsure: this.data.answers.filter(a => a.unsure || !a.reason).length }, ...this.data };
  }
  /** Downloads every participant's record on this computer as one JSON file. */
  download() {
    const blob = new Blob([JSON.stringify({ sessions: this.sessions }, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `cut-and-dried-playtest-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  /** The next participant: this record is filed with the others (when anything happened) and a new one starts. */
  next() { this.save(); if (this.used) this.#file(this.data); this.#remove(KEY); }
  /** Clears every record on this computer (after they are downloaded). */
  clearAll() { this.#remove(KEY); this.#remove(ARCHIVE); }
}
