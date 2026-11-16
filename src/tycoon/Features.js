/**
 * Which tabs, pages and sections a salon of each level gets to see. A new game starts with the salon, building,
 * the money and the reviews; the rest opens as the salon levels up, and the level-up says what opened.
 */
export const FEATURE_LEVEL = {
  'biz.network': 2, 'staff.parts': 3,
  // level 2: hiring, regulars, prices
  'tab.staff': 2, 'clients.regulars': 2, 'ops.price': 2,
  // level 3: marketing and the rival, the menu and hours, a bigger salon
  'tab.mkt': 3, 'mkt.rival': 3, 'mkt.contest': 3, 'ops.menu': 3, 'ops.hours': 3, 'build.expand': 3,
  // level 4: running a team, head office, the brand
  'tab.syn': 4, 'staff.policy': 4, 'staff.welfare': 4, 'biz.rank': 4, 'ops.treats': 4, 'biz.hq': 4, 'mkt.brand': 4,
  // level 5: careers, relationships, funding, special bookings, a second salon
  'staff.career': 5, 'staff.rel': 5, 'biz.fund': 5, 'clients.special': 5, 'build.branch': 5,
};
/** True when a salon at `level` shows the feature. */
export const shows = (key, level) => level >= (FEATURE_LEVEL[key] || 1);
/** The features that open at exactly this level. */
export const featuresAt = level => Object.keys(FEATURE_LEVEL).filter(k => FEATURE_LEVEL[k] === level);
