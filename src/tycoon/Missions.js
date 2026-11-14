import { pick } from '../core/math.js';

/**
 * Side missions in the growth tab: little requests from Ruby, Lia and Shawn. Three are open at a time; finish one,
 * collect its bonus and a new one takes its place. Each comes with a line from whoever asks, which nudges the player
 * towards something worth trying. Goals and bonuses grow with the salon.
 *
 * `from` is the first level the request turns up at, `needs` a feature it waits for, and `who` who asks.
 * Requests with `state` track how the salon stands (its comfort, its staff) instead of counting events, and their
 * goal is set a little above where the salon is when the request is made.
 */
const KINDS = {
  serve: { from: 1, who: 'ruby', reward: 60, goal: lv => 4 + lv * 2 },
  happy: { from: 1, who: 'lia', reward: 80, goal: lv => 2 + lv },
  comfort: { from: 1, who: 'ruby', reward: 70, state: true, needs: 'furniture', goal: (lv, now) => now + 2 + Math.floor(lv / 2) },
  reply: { from: 1, who: 'ruby', reward: 50, goal: lv => 3 + lv },
  post: { from: 1, who: 'ruby', reward: 60, needs: 'marketing', goal: lv => 2 + Math.ceil(lv / 2) },
  five: { from: 1, who: 'shawn', reward: 80, goal: lv => 1 + Math.ceil(lv / 2) },
  revenue: { from: 1, who: 'shawn', reward: 90, goal: lv => 400 + lv * 300 },
  colour: { from: 1, who: 'lia', reward: 70, needs: 'colour', goal: lv => 2 + lv },
  perm: { from: 1, who: 'lia', reward: 70, needs: 'perm', goal: lv => 1 + lv },
  hire: { from: 2, who: 'shawn', reward: 100, state: true, needs: 'staff', goal: (lv, now) => now + 1, cap: 14 },
  assistant: { from: 2, who: 'lia', reward: 90, state: true, goal: (lv, now) => now + 1, cap: 3 },
  regulars: { from: 2, who: 'ruby', reward: 90, state: true, goal: (lv, now) => now + 2 + lv },
  followers: { from: 2, who: 'ruby', reward: 70, needs: 'marketing', goal: lv => 50 + lv * 60 },
  villain: { from: 2, who: 'lia', reward: 90, goal: lv => 1 + Math.floor(lv / 2) },
  train: { from: 2, who: 'shawn', reward: 80, needs: 'training', goal: lv => 1 + Math.floor(lv / 3) },
  vip: { from: 4, who: 'ruby', reward: 120, needs: 'vip', goal: lv => 1 + Math.floor(lv / 2) },
};
const OPEN = 3, LINES = 2;
/** Who asks for a mission of `kind`. */
export const missionWho = kind => KINDS[kind]?.who || 'ruby';

export class Missions {
  constructor(economy) { this.economy = economy; this.open = []; this.done = 0; this.earned = 0; this.version = 0; this.onDone = null; }
  /** Missions finished and waiting to be collected. */
  get claimable() { return this.open.filter(m => m.progress >= m.goal).length; }
  /** The bonus grows with the salon's level and a little with every mission finished. */
  #reward(kind, level) { return Math.round(KINDS[kind].reward * (1 + level * .5) * (1 + Math.min(this.done, 30) * .03) / 5) * 5; }
  /**
   * Keeps three missions open. Requests the salon can take on now are chosen, those new at this level more often.
   * `stateOf(kind)` reports where the salon stands for requests that track it.
   */
  fill(level, isUnlocked, stateOf) {
    while (this.open.length < OPEN) {
      const kinds = Object.keys(KINDS).filter(k => { const K = KINDS[k]; return K.from <= level && (!K.needs || isUnlocked(K.needs)) && !this.open.some(m => m.kind === k) && !(K.cap != null && stateOf(k) >= K.cap); });
      if (!kinds.length) break;
      const kind = pick(kinds.flatMap(k => KINDS[k].from === level ? [k, k, k] : [k])), K = KINDS[kind];
      const goal = K.state ? Math.min(K.cap ?? Infinity, K.goal(level, stateOf(kind))) : K.goal(level);
      this.open.push({ kind, goal, progress: K.state ? Math.min(goal, stateOf(kind)) : 0, reward: this.#reward(kind, level), line: Math.floor(Math.random() * LINES) });
    }
    this.version++;
  }
  #finish(m, value) { const was = m.progress; m.progress = Math.min(m.goal, value); if (m.progress !== was) this.version++; if (was < m.goal && m.progress >= m.goal && this.onDone) this.onDone(m); }
  /** Counts `amount` towards every open mission of `kind`. */
  record(kind, amount = 1) { if (amount > 0) for (const m of this.open) if (m.kind === kind && m.progress < m.goal && !KINDS[kind].state) this.#finish(m, m.progress + amount); }
  /** Updates the requests that track how the salon stands. Once reached, a request stays done. */
  sync(stateOf) { for (const m of this.open) if (KINDS[m.kind]?.state && m.progress < m.goal) this.#finish(m, stateOf(m.kind)); }
  /** Pays out finished mission `i` and opens a new one in its place. Returns the mission, or null. */
  claim(i, level, isUnlocked, stateOf) {
    const m = this.open[i];
    if (!m || m.progress < m.goal) return null;
    this.economy.fund('missionBonus', m.reward); this.earned += m.reward; this.done++;
    this.open.splice(i, 1); this.fill(level, isUnlocked, stateOf);
    return m;
  }
  toJSON() { return { open: this.open, done: this.done, earned: this.earned }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { open: (d.open || []).filter(m => KINDS[m.kind]).map(m => ({ line: 0, ...m })), done: d.done || 0, earned: d.earned || 0 });
    this.version++;
  }
}
