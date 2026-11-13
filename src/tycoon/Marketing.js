import { rand, clamp } from '../core/math.js';

/** Paid campaigns: cost, how many days they run, extra demand while running and followers gained. */
export const CAMPAIGNS = {
  flyers: { cost: 90, days: 2, demand: .15, followers: [5, 20] },
  instaAd: { cost: 320, days: 3, demand: .35, followers: [60, 130] },
};
/**
 * Social channels. Each post costs a little, can go out every `cooldown` days and turns views into followers.
 * TikTok is a gamble, YouTube is slow and steady and keeps people talking for a few days.
 */
export const CHANNELS = {
  instagram: { cost: 40, cooldown: 1, base: 200, perFollower: 1.2, spread: [.6, 1.5], viral: [.03, .1], convert: [.025, .05] },
  tiktok: { cost: 30, cooldown: 1, base: 120, perFollower: 2, spread: [.3, 2.2], viral: [.06, .14], convert: [.012, .03] },
  youtube: { cost: 150, cooldown: 3, base: 60, perFollower: .8, spread: [.8, 1.25], viral: [.01, .03], convert: [.06, .1], buzz: { days: 4, demand: .12 }, unlock: 'youtube' },
};
const VIRAL = { days: 2, demand: .5 }, INFLUENCER = { days: 3, demand: .45 };
const START_FOLLOWERS = { instagram: 150, tiktok: 0, youtube: 0 };

/**
 * Social media and advertising: followers per channel, running campaigns and influencer visits.
 * `power` (about 0.5 to 1.25) is how well the front desk runs marketing.
 */
export class Marketing {
  constructor(economy) {
    this.economy = economy;
    this.channels = Object.fromEntries(Object.keys(CHANNELS).map(id => [id, { followers: START_FOLLOWERS[id], lastDay: -99, last: null }]));
    this.active = []; this.influencerBooked = false; this.influencerDay = 0; this.version = 0;
  }
  get followers() { return Object.values(this.channels).reduce((sum, c) => sum + c.followers, 0); }
  get demandMultiplier() { return 1 + this.active.reduce((sum, a) => sum + a.demand, 0); }
  /** Extra clients a day who come because they follow the salon. */
  get followerClients() { return Math.min(20, this.followers / 250); }
  isRunning(id) { return this.active.some(a => a.id === id); }
  #boost(id, days, demand) {
    const running = this.active.find(a => a.id === id);
    if (running) running.daysLeft = Math.max(running.daysLeft, days); else this.active.push({ id, daysLeft: days, demand });
    this.version++;
  }
  #gain(channel, n) { const c = this.channels[channel]; c.followers = Math.max(0, Math.round(c.followers + n)); this.version++; }

  run(id, power = 1) {
    const c = CAMPAIGNS[id];
    if (!c || this.isRunning(id) || !this.economy.spend('marketing', c.cost)) return false;
    this.#boost(id, c.days, c.demand * power); this.#gain('instagram', rand(...c.followers) * power);
    return true;
  }

  canPost(id, day) { const c = CHANNELS[id]; return day - this.channels[id].lastDay >= c.cooldown && this.economy.canAfford(c.cost); }
  /** Films and posts on a channel. `quality` (0 to 1) is how good the salon and its latest work look on camera. */
  post(id, day, quality, power = 1) {
    const def = CHANNELS[id], ch = this.channels[id];
    if (!def || !this.canPost(id, day) || !this.economy.spend('marketing', def.cost)) return null;
    const q = clamp(quality * power), viral = Math.random() < def.viral[0] + q * def.viral[1];
    let views = Math.round((def.base + ch.followers * def.perFollower) * (.3 + q) * rand(...def.spread));
    if (viral) { views = Math.round(views * rand(8, 15)); this.#boost('viral', VIRAL.days, VIRAL.demand); }
    if (def.buzz) this.#boost(id, def.buzz.days, def.buzz.demand * power);
    const gained = Math.round(views * rand(...def.convert));
    ch.lastDay = day; this.#gain(id, gained);
    ch.last = { day, views, gained, viral };
    return { channel: id, ...ch.last };
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
    this.#gain('instagram', change);
    return change;
  }

  /** Campaigns run for whole days, counting the day they were bought. */
  startDay() { this.active.forEach(a => a.daysLeft--); this.active = this.active.filter(a => a.daysLeft > 0); this.version++; }
  toJSON() { return { channels: this.channels, active: this.active, influencerBooked: this.influencerBooked, influencerDay: this.influencerDay }; }
  restore(d) {
    if (!d) return;
    if (d.channels) Object.entries(d.channels).forEach(([id, c]) => { if (this.channels[id]) Object.assign(this.channels[id], c); });
    // Saves from before channels: everything was Instagram.
    else this.channels.instagram = { followers: d.followers ?? START_FOLLOWERS.instagram, lastDay: d.reelDay || -99, last: d.lastReel || null };
    Object.assign(this, { active: d.active || [], influencerBooked: !!d.influencerBooked, influencerDay: d.influencerDay || 0 });
    this.version++;
  }
}
