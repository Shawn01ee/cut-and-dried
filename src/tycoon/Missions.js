import { pick } from '../core/math.js';

/**
 * Side missions in the growth tab. Three are open at a time; finish one, collect its bonus and a new one takes its
 * place, so there is always something to aim for. Goals and bonuses grow with the salon's level.
 * `needs` is the feature a mission waits for before it can be drawn.
 */
const KINDS = {
  serve: { goal: lv => 4 + lv * 2, reward: 60 },
  happy: { goal: lv => 2 + lv, reward: 80 },
  colour: { goal: lv => 2 + lv, reward: 70, needs: 'colour' },
  perm: { goal: lv => 1 + lv, reward: 70, needs: 'perm' },
  revenue: { goal: lv => 400 + lv * 300, reward: 90 },
  five: { goal: lv => 1 + Math.ceil(lv / 2), reward: 80 },
  reply: { goal: lv => 3 + lv, reward: 50 },
  post: { goal: lv => 2 + Math.ceil(lv / 2), reward: 60, needs: 'marketing' },
  followers: { goal: lv => 50 + lv * 60, reward: 70, needs: 'marketing' },
  vip: { goal: lv => 1 + Math.floor(lv / 2), reward: 120, needs: 'vip' },
  villain: { goal: lv => 1 + Math.floor(lv / 2), reward: 90 },
  train: { goal: lv => 1 + Math.floor(lv / 3), reward: 80, needs: 'training' },
};
const OPEN = 3;

export class Missions {
  constructor(economy) { this.economy = economy; this.open = []; this.done = 0; this.earned = 0; this.version = 0; this.onDone = null; }
  /** Missions finished and waiting to be collected. */
  get claimable() { return this.open.filter(m => m.progress >= m.goal).length; }
  /** The bonus grows with the salon's level and a little with every mission finished. */
  #reward(kind, level) { return Math.round(KINDS[kind].reward * (1 + level * .5) * (1 + Math.min(this.done, 30) * .03) / 5) * 5; }
  /** Keeps three missions open, choosing kinds the salon can already do that are not open yet. */
  fill(level, isUnlocked) {
    while (this.open.length < OPEN) {
      const kinds = Object.keys(KINDS).filter(k => (!KINDS[k].needs || isUnlocked(KINDS[k].needs)) && !this.open.some(m => m.kind === k));
      if (!kinds.length) break;
      const kind = pick(kinds);
      this.open.push({ kind, goal: KINDS[kind].goal(level), progress: 0, reward: this.#reward(kind, level) });
    }
    this.version++;
  }
  /** Counts `amount` towards every open mission of `kind`. */
  record(kind, amount = 1) {
    if (!(amount > 0)) return;
    for (const m of this.open) {
      if (m.kind !== kind || m.progress >= m.goal) continue;
      m.progress = Math.min(m.goal, m.progress + amount); this.version++;
      if (m.progress >= m.goal && this.onDone) this.onDone(m);
    }
  }
  /** Pays out finished mission `i` and opens a new one in its place. Returns the mission, or null. */
  claim(i, level, isUnlocked) {
    const m = this.open[i];
    if (!m || m.progress < m.goal) return null;
    this.economy.fund('missionBonus', m.reward); this.earned += m.reward; this.done++;
    this.open.splice(i, 1); this.fill(level, isUnlocked);
    return m;
  }
  toJSON() { return { open: this.open, done: this.done, earned: this.earned }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { open: (d.open || []).filter(m => KINDS[m.kind]), done: d.done || 0, earned: d.earned || 0 });
    this.version++;
  }
}
