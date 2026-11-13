import { rand, clamp } from '../core/math.js';

/** Paid campaigns: cost, how many days they run, extra demand while running and followers gained. */
export const CAMPAIGNS = {
  flyers: { cost: 90, days: 2, demand: .15, followers: [5, 20] },
  instaAd: { cost: 320, days: 3, demand: .35, followers: [60, 130] },
};
export const REEL_COST = 40;
const VIRAL = { days: 2, demand: .5 }, INFLUENCER = { days: 3, demand: .45 };
const START_FOLLOWERS = 150;

/** Social media and advertising: followers, running campaigns, the daily reel and influencer visits. */
export class Marketing {
  constructor(economy) {
    this.economy = economy;
    this.followers = START_FOLLOWERS; this.active = []; this.reelDay = 0; this.lastReel = null;
    this.influencerBooked = false; this.influencerDay = 0; this.version = 0;
  }
  get demandMultiplier() { return 1 + this.active.reduce((sum, a) => sum + a.demand, 0); }
  /** Extra clients a day who come because they follow the salon. */
  get followerClients() { return Math.min(20, this.followers / 250); }
  isRunning(id) { return this.active.some(a => a.id === id); }
  #boost(id, days, demand) {
    const running = this.active.find(a => a.id === id);
    if (running) running.daysLeft = Math.max(running.daysLeft, days); else this.active.push({ id, daysLeft: days, demand });
    this.version++;
  }
  #gain(n) { this.followers = Math.max(0, Math.round(this.followers + n)); this.version++; }

  run(id) {
    const c = CAMPAIGNS[id];
    if (!c || this.isRunning(id) || !this.economy.spend('marketing', c.cost)) return false;
    this.#boost(id, c.days, c.demand); this.#gain(rand(...c.followers));
    return true;
  }

  canPostReel(day) { return this.reelDay !== day && this.economy.canAfford(REEL_COST); }
  /** Films and posts today's reel. `quality` (0 to 1) is how good the salon and its latest work look on camera. */
  postReel(day, quality) {
    if (!this.canPostReel(day) || !this.economy.spend('marketing', REEL_COST)) return null;
    const q = clamp(quality), viral = Math.random() < .03 + q * .1;
    let views = Math.round((200 + this.followers * 1.2) * (.3 + q) * rand(.6, 1.5));
    if (viral) { views = Math.round(views * rand(8, 15)); this.#boost('viral', VIRAL.days, VIRAL.demand); }
    const gained = Math.round(views * rand(.025, .05));
    this.reelDay = day; this.#gain(gained);
    this.lastReel = { day, views, gained, viral };
    return this.lastReel;
  }

  canBookInfluencer(day) { return !this.influencerBooked && this.influencerDay !== day; }
  bookInfluencer(day) { if (!this.canBookInfluencer(day)) return false; this.influencerBooked = true; this.influencerDay = day; this.version++; return true; }
  /** The booked influencer turns up as the next walk-in. */
  takeInfluencer() { if (!this.influencerBooked) return null; this.influencerBooked = false; this.version++; return { followers: Math.round(rand(5, 40)) * 1000 }; }
  /** How the influencer's post landed. Returns the change in followers. */
  influencerPosted(influencer, satisfaction) {
    let change;
    if (satisfaction >= .75) { change = Math.round(influencer.followers * rand(.02, .04)); this.#boost('influencer', INFLUENCER.days, INFLUENCER.demand); }
    else if (satisfaction >= .55) change = Math.round(influencer.followers * rand(.004, .01));
    else change = -Math.round(rand(30, 90));
    this.#gain(change);
    return change;
  }

  /** Campaigns run for whole days, counting the day they were bought. */
  startDay() { this.active.forEach(a => a.daysLeft--); this.active = this.active.filter(a => a.daysLeft > 0); this.version++; }
  toJSON() { return { followers: this.followers, active: this.active, reelDay: this.reelDay, lastReel: this.lastReel, influencerBooked: this.influencerBooked, influencerDay: this.influencerDay }; }
  restore(d) {
    if (!d) return;
    Object.assign(this, { followers: d.followers ?? START_FOLLOWERS, active: d.active || [], reelDay: d.reelDay || 0, lastReel: d.lastReel || null, influencerBooked: !!d.influencerBooked, influencerDay: d.influencerDay || 0 });
    this.version++;
  }
}
