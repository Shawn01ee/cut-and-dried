/**
 * Which tabs, pages and sections a salon of each level gets to see. A new game starts with the salon, building,
 * the money and the reviews; the rest opens as the salon levels up, and the level-up says what opened.
 */
export const FEATURE_LEVEL = {
  'tab.staff': 2, 'tab.mkt': 2, 'tab.syn': 3,
  'staff.policy': 2, 'staff.welfare': 3, 'staff.career': 3, 'staff.rel': 4,
  'biz.rank': 2, 'biz.fund': 3, 'ops.menu': 2, 'ops.hours': 2, 'ops.price': 2, 'ops.treats': 2,
  'clients.regulars': 2, 'clients.special': 3,
  'build.expand': 2, 'build.branch': 4,
};
/** True when a salon at `level` shows the feature. */
export const shows = (key, level) => level >= (FEATURE_LEVEL[key] || 1);
/** The features that open at exactly this level. */
export const featuresAt = level => Object.keys(FEATURE_LEVEL).filter(k => FEATURE_LEVEL[k] === level);
