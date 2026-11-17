import { judge, explainingGroups } from './ProfitReading.js';

/**
 * Turns playtest records (one per participant) into the facilitator's tables, so nothing has to be copied by hand:
 * milestone times, places they may have got stuck (long pauses, the same control clicked again and again), and each
 * day's answer beside what actually moved profit, with whether they then did what they said.
 */
const CLICKS = { hours: /^(act|do):hrs/, price: /^do:price/, mkt: /^do:(post|mkauto|camp|run|infl)/, care: /^do:(talk|train|welfare|rest|promote|leave|mtrain)/ };
/** A control clicked this many times within `REPEAT_SECONDS` counts as a possible stuck point. */
export const REPEAT_CLICKS = 3, REPEAT_SECONDS = 20;
const min = s => Math.round(s / 6) / 10;

/** What the player changed between one day's report and the next: plan ids (see ProfitReading PLANS), or null. */
export function doneBetween(session, day) {
  const reps = (session.events || []).filter(e => e.kind === 'report'), a = reps.find(e => e.day === day), b = reps.find(e => e.day === day + 1);
  if (!a || !b) return null;
  const clicks = session.events.filter(e => e.kind === 'click' && e.t >= a.t && e.t < b.t).map(e => e.what), done = new Set(), x = a.snap, y = b.snap;
  if (y.seats > x.seats || y.items > x.items) done.add('seat');
  if (y.hired > x.hired) done.add('hire');
  if (y.hours !== x.hours || clicks.some(w => CLICKS.hours.test(w))) done.add('hours');
  if (y.price !== x.price || clicks.some(w => CLICKS.price.test(w))) done.add('price');
  for (const k of ['mkt', 'care']) if (clicks.some(w => CLICKS[k].test(w))) done.add(k);
  return done;
}
/** 'yes' (every plan that can be checked was done), 'some', 'no', or null when there is nothing to check yet. */
export function followed(plans, done) {
  if (!done) return null;
  const checkable = plans.filter(p => p !== 'none' && p !== 'other');
  if (!checkable.length) return plans.includes('none') ? (done.size ? 'no' : 'yes') : null;
  const hit = checkable.filter(p => done.has(p)).length;
  return hit === checkable.length ? 'yes' : hit ? 'some' : 'no';
}

export class PlaytestReport {
  constructor(sessions) { this.sessions = sessions.filter(s => s && s.session); }
  /** Table A: one row per participant, times in minutes (null = not reached). */
  get milestones() {
    return this.sessions.map(s => {
      const ms = s.milestones || {}, at = id => ms[id] ? min(ms[id].t) : null, verdicts = (s.answers || []).map(judge), count = v => verdicts.filter(x => x === v).length;
      return { who: s.session.label, exp: s.session.exp ?? null, service: at('firstService'), happy: at('firstHappy'), seat: at('firstSeat'), hire: at('firstHire'),
        idle: (s.idle || []).length, longest: Math.max(0, ...(s.idle || []).map(x => x.seconds)), right: count('right'), partly: count('partly'), wrong: count('wrong'), unsure: count('unsure') };
    });
  }
  /** Table B candidates: long pauses and repeated clicks, with the screen they were on. */
  get stuck() {
    const rows = [];
    for (const s of this.sessions) {
      for (const g of s.idle || []) rows.push({ who: s.session.label, t: min(g.t), kind: 'idle', detail: g.seconds, view: g.view });
      const clicks = (s.events || []).filter(e => e.kind === 'click');
      for (let i = 0; i < clicks.length; i++) {
        const run = clicks.slice(i).filter(e => e.what === clicks[i].what && e.t - clicks[i].t <= REPEAT_SECONDS);
        if (run.length >= REPEAT_CLICKS && !rows.some(r => r.who === s.session.label && r.kind === 'repeat' && r.what === clicks[i].what && Math.abs(r.t - min(clicks[i].t)) < REPEAT_SECONDS / 60))
          rows.push({ who: s.session.label, t: min(clicks[i].t), kind: 'repeat', detail: run.length, what: clicks[i].what, view: clicks[i].view });
      }
    }
    return rows.sort((a, b) => a.who.localeCompare(b.who) || a.t - b.t);
  }
  /** Table C: each day's answer beside what moved profit most, the verdict and whether they followed their plan. */
  get answers() {
    return this.sessions.flatMap(s => (s.answers || []).map(a => {
      const top = explainingGroups(a.facts)[0] || null;
      return { who: s.session.label, day: a.day, profit: a.facts.profit, delta: a.facts.delta, top, reason: a.reason, verdict: judge(a), plans: a.plans || [], followed: followed(a.plans || [], doneBetween(s, a.day)), note: a.note || '' };
    }));
  }
}
