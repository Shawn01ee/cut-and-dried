import { pick } from '../core/math.js';

/**
 * The regulars' book: named clients who keep coming back. Each one remembers the stylist they like, keeps hearts
 * (0-5) for how their visits have gone, and has a small story of their own that moves on as they keep coming.
 */
export const BOOK_SIZE = 30;
export const MAX_HEARTS = 5;
/** Satisfaction that wins a heart, and below which one is lost. */
export const HEART_UP = .8, HEART_DOWN = .6;
/** From three hearts a happy regular may bring a friend; at five they pay more. */
export const HEART_FRIEND = 3, FRIEND_CHANCE = .3;
export const HEART_LOYAL = 5, LOYAL_PAY = 1.15;
/** Served by the stylist they like. */
export const FAVOURITE_SATISFACTION = .03;
/** A special day (a wedding, an interview...): they pay more and expect more. */
export const OCCASION_PAY = 1.5, OCCASION_NEED = .85, OCCASION_HEARTS = 2;
/** The visits that open each chapter of a story; a chapter also needs as many hearts as its number. */
export const CHAPTER_VISITS = [2, 4, 6, 8];
/** A story seen to its end: a thank-you gift, and they stay whatever the rival does. */
export const STORY_GIFT = 300;
/** Days between a regular's visits, at least; and between two chapters of a story, so that it has time to happen. */
const VISIT_GAP = 2;
export const CHAPTER_DAYS = 6;

/** Each story has four chapters; some chapters are a special day, one may send a friend. */
export const STORIES = {
  double: [{}, {}, { occasion: 'shoot' }, {}],
  groomer: [{}, {}, { occasion: 'dogShow' }, {}],
  barista: [{}, { friend: true }, {}, { occasion: 'final' }],
  grandma: [{}, {}, {}, { occasion: 'reunion' }],
  novelist: [{}, {}, {}, { occasion: 'launch' }],
  magician: [{}, {}, { occasion: 'stage' }, {}],
  foodtruck: [{}, { friend: true }, {}, { occasion: 'festival' }],
  model: [{}, {}, { occasion: 'photoshoot' }, {}],
};
/**
 * What each story leaves behind when it ends, on top of the thank-you gift: followers, reputation, a few days of
 * extra clients ([×, days]), a permanent hospitality point, a skill for the stylist they like, calmer staff, or
 * points at the next hair contest.
 */
export const STORY_REWARDS = {
  double: { followers: 300, boost: [1.15, 7] },
  groomer: { followers: 400 },
  barista: { hospitality: 1 },
  grandma: { skill: ['cutting', 5] },
  novelist: { rep: 3, followers: 200 },
  magician: { boost: [1.25, 3] },
  foodtruck: { calm: 15 },
  model: { contest: 6 },
};

/** The chance a walk-in is someone from the book, which grows as the book fills. */
export const returnChance = n => Math.min(.3, n * .02);

export class RegularBook {
  constructor() { this.entries = []; this.version = 0; this.nextId = 1; this.stories = 0; }
  get size() { return this.entries.length; }
  find(id) { return this.entries.find(e => e.id === id) || null; }

  /** A happy client becomes a named regular, if there is room in the book and no one of the same name in it. */
  add(customer, stylist, site, day) {
    if (this.entries.length >= BOOK_SIZE || this.entries.some(e => e.name === customer.name)) return null;
    const e = { id: this.nextId++, name: customer.name, gender: customer.gender, stylist, site, visits: 1, hearts: 1, story: pick(Object.keys(STORIES)), chapter: -1, since: day, lastDay: day, lifelong: false };
    this.entries.push(e); this.version++; return e;
  }

  /**
   * Who from the book walks in today, if anyone: someone who has not been in for a couple of days, at this salon,
   * and not already inside. Their visit count moves on, and with it maybe the next chapter of their story.
   */
  visitor(site, day, inside) {
    if (Math.random() >= returnChance(this.entries.length)) return null;
    const free = this.entries.filter(e => e.site === site && day - e.lastDay >= VISIT_GAP && !inside.has(e.name));
    if (!free.length) return null;
    const e = pick(free); e.visits++; e.gap = day - e.lastDay; e.lastDay = day;
    const next = e.chapter + 1, story = STORIES[e.story];
    const chapter = next < story.length && e.visits >= CHAPTER_VISITS[next] && e.hearts >= next + 1 && day - (e.chapterDay ?? -CHAPTER_DAYS) >= CHAPTER_DAYS ? next : null;
    if (chapter != null) { e.chapter = chapter; e.chapterDay = day; }
    this.version++;
    return { entry: e, chapter, occasion: chapter != null ? story[chapter].occasion || null : null, friend: chapter != null && !!story[chapter].friend };
  }

  /**
   * After a regular's visit: hearts go up or down, a stylist who did really well becomes the favourite, and a regular
   * with no hearts left stops coming (unless they are a lifelong regular). Returns what happened.
   */
  visited(entry, { satisfaction, stylist, occasion }) {
    const before = entry.hearts, out = { lost: false, gift: 0, friend: false, occasionMet: null, finished: false };
    if (occasion) { out.occasionMet = satisfaction >= OCCASION_NEED; entry.hearts += out.occasionMet ? OCCASION_HEARTS : -OCCASION_HEARTS; }
    else if (satisfaction >= HEART_UP) entry.hearts++;
    else if (satisfaction < HEART_DOWN) entry.hearts--;
    entry.hearts = Math.max(0, Math.min(MAX_HEARTS, entry.hearts));
    if (stylist !== entry.stylist && satisfaction >= .9) entry.stylist = stylist;
    // The last chapter seen to its end, on a good visit.
    if (!entry.lifelong && entry.chapter === STORIES[entry.story].length - 1 && satisfaction >= HEART_DOWN) { entry.lifelong = true; out.gift = STORY_GIFT; out.finished = true; this.stories++; }
    if (entry.hearts >= HEART_FRIEND && satisfaction >= HEART_UP && Math.random() < FRIEND_CHANCE) out.friend = true;
    if (entry.hearts === 0 && !entry.lifelong) { this.remove(entry); out.lost = true; }
    out.change = entry.hearts - before;
    this.version++;
    return out;
  }

  remove(entry) { const i = this.entries.indexOf(entry); if (i >= 0) { this.entries.splice(i, 1); this.version++; } }
  /** A stylist who has left: their regulars will see whoever is free. */
  forget(stylist) { this.entries.forEach(e => { if (e.stylist === stylist) e.stylist = null; }); this.version++; }
  /** Keeps the book no bigger than the salon's count of regulars, letting the least attached go first. */
  trim(regulars) {
    while (this.entries.length > regulars) {
      const out = this.entries.filter(e => !e.lifelong).sort((a, b) => a.hearts - b.hearts || a.visits - b.visits)[0];
      if (!out) break; this.remove(out);
    }
  }
  get lifelong() { return this.entries.filter(e => e.lifelong).length; }

  toJSON() { return { entries: this.entries, nextId: this.nextId, stories: this.stories }; }
  // A story from an older version starts over as one of today's.
  restore(d) { if (!d) return; this.entries = (d.entries || []).map(e => STORIES[e.story] ? e : { ...e, story: pick(Object.keys(STORIES)), chapter: -1, lifelong: false }); this.nextId = d.nextId || this.entries.length + 1; this.stories = d.stories || 0; this.version++; }
}
