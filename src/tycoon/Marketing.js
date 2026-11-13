import { rand, clamp } from '../core/math.js';

/** Paid campaigns: cost, how many days they run, extra demand while running and followers gained. */
export const CAMPAIGNS = {
  flyers: { cost: 90, days: 2, demand: .15, followers: [5, 20] },
  instaAd: { cost: 320, days: 3, demand: .35, followers: [60, 130] },
};
/**
 * Social channels. A post costs money and `film` seconds of someone's time, can go out every `cooldown` days,
 * always brings at least `minGain` followers and a short `buzz`, and sometimes far more.
 * TikTok is a gamble, YouTube is slow and steady and keeps people talking for days.
 */
export const CHANNELS = {
  instagram: { cost: 40, film: 8, cooldown: 1, base: 200, perFollower: 1.2, spread: [.6, 1.5], viral: [.03, .1], convert: [.025, .05], minGain: 10, buzz: { days: 1, demand: .08 } },
  tiktok: { cost: 30, film: 6, cooldown: 1, base: 120, perFollower: 2, spread: [.3, 2.2], viral: [.06, .14], convert: [.012, .03], minGain: 3, buzz: { days: 1, demand: .05 } },
  youtube: { cost: 150, film: 20, cooldown: 3, base: 60, perFollower: .8, spread: [.8, 1.25], viral: [.01, .03], convert: [.06, .1], minGain: 20, buzz: { days: 4, demand: .12 }, unlock: 'youtube' },
};
/** An influencer wants a fee on top of the free service. */
export const INFLUENCER_FEE = 400;
/**
 * What an influencer's post brings, by how happy they left (`from` is the satisfaction needed): at least `min` followers
 * or `share` of their own audience if that is more, `demand` extra clients for `days` days, and a change in reputation.
 */
export const INFLUENCER_POSTS = [
  { tier: 'great', from: .75, min: 600, share: [.03, .05], days: 4, demand: .7, rep: 3 },
  { tier: 'good', from: .55, min: 250, share: [.01, .02], days: 2, demand: .3, rep: 1 },
  { tier: 'poor', from: 0, min: 60, share: [0, 0], days: 1, demand: .1, rep: -3 },
];
const VIRAL = { days: 2, demand: .5 };
const START_FOLLOWERS = { instagram: 150, tiktok: 0, youtube: 0 };

/**
 * Social media and advertising: followers per channel, running campaigns and influencer visits.
 * `power` (about 0.5 to 1.25) is how well the front desk runs marketing.
 */
export class Marketing {
  constructor(economy) {
    this.economy = economy;
    this.channels = Object.fromEntries(Object.keys(CHANNELS).map(id => [id, { followers: START_FOLLOWERS[id], lastDay: -99, last: null }]));
    this.active = []; this.booked = null; this.influencerDay = 0; this.version = 0;
  }
  get followers() { return Object.values(this.channels).reduce((sum, c) => sum + c.followers, 0); }
  get demandMultiplier() { return 1 + this.active.reduce((sum, a) => sum + a.demand, 0); }
  /** Extra clients a day who come because they follow the salon. */
  get followerClients() { return Math.min(20, this.followers / 250); }
  isRunning(id) { return this.active.some(a => a.id === id); }
  #boost(id, days, demand) {
    const running = this.active.find(a => a.id === id);
    if (running) { running.daysLeft = Math.max(running.daysLeft, days); running.demand = Math.max(running.demand, demand); } else this.active.push({ id, daysLeft: days, demand });
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
    this.#boost(id, def.buzz.days, def.buzz.demand * power);
    const gained = Math.max(def.minGain, Math.round(views * rand(...def.convert)));
    ch.lastDay = day; this.#gain(id, gained);
    ch.last = { day, views, gained, viral };
    return { channel: id, ...ch.last };
  }

  get influencerBooked() { return !!this.booked; }
  canBookInfluencer(day) { return !this.booked && this.influencerDay !== day && this.economy.canAfford(INFLUENCER_FEE); }
  /** Books an influencer for the fee; their audience size is known from the start. */
  bookInfluencer(day) {
    if (!this.canBookInfluencer(day) || !this.economy.spend('marketing', INFLUENCER_FEE)) return false;
    this.booked = { followers: Math.round(rand(8, 40)) * 1000 }; this.influencerDay = day; this.version++; return true;
  }
  /** The booked influencer turns up as the next walk-in. */
  takeInfluencer() { const b = this.booked; if (!b) return null; this.booked = null; this.version++; return { ...b }; }
  /** The influencer's post: followers and extra clients always, more the happier they were. Returns the tier with the followers gained. */
  influencerPosted(influencer, satisfaction) {
    const post = INFLUENCER_POSTS.find(p => satisfaction >= p.from), followers = Math.max(post.min, Math.round(influencer.followers * rand(...post.share)));
    this.#gain('instagram', followers); this.#boost('influencer', post.days, post.demand);
    return { ...post, followers };
  }

  /** Campaigns run for whole days, counting the day they were bought. */
  startDay() { this.active.forEach(a => a.daysLeft--); this.active = this.active.filter(a => a.daysLeft > 0); this.version++; }
  toJSON() { return { channels: this.channels, active: this.active, booked: this.booked, influencerDay: this.influencerDay }; }
  restore(d) {
    if (!d) return;
    if (d.channels) Object.entries(d.channels).forEach(([id, c]) => { if (this.channels[id]) Object.assign(this.channels[id], c); });
    // Saves from before channels: everything was Instagram.
    else this.channels.instagram = { followers: d.followers ?? START_FOLLOWERS.instagram, lastDay: d.reelDay || -99, last: d.lastReel || null };
    Object.assign(this, { active: d.active || [], booked: d.booked || (d.influencerBooked ? { followers: 20000 } : null), influencerDay: d.influencerDay || 0 });
    this.version++;
  }
}
