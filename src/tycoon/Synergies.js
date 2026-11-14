/**
 * Team synergies: combinations of the people at work today that bring a bonus tied to what they are good at.
 * `has(team)` says whether today's team qualifies. Effects:
 * `speed` speeds up services by type, `satisfaction` adds to every client's satisfaction (`colourSatisfaction` to
 * colour clients only), `juniorBoost` raises juniors' skills, `vipPay` and `vipPatience` scale VIP payments and
 * patience, `reel` lifts post quality, and `calm` lets every stylist shrug off difficult clients.
 */
export const SYNERGIES = [
  { id: 'colourLab', has: T => T.specialists('colour') >= 2, speed: { colour: 1.15 }, colourSatisfaction: .03 },
  { id: 'cutCrew', has: T => T.specialists('cut') >= 2, speed: { cut: 1.15 } },
  { id: 'permStudio', has: T => T.specialists('perm') >= 2, speed: { wave: 1.15 } },
  { id: 'fullHouse', has: T => ['cut', 'colour', 'perm'].every(k => T.specialists(k) >= 1), satisfaction: .03 },
  { id: 'mentoring', has: T => T.perk('mentor') >= 1 && T.rank('junior') >= 1, juniorBoost: 5 },
  { id: 'vipLounge', has: T => T.perk('vip') >= 1 && T.perk('consult') >= 1, vipPay: 1.1, vipPatience: 1.2 },
  { id: 'trendCrew', has: T => T.perk('trend') >= 1 && T.marketing >= 50, reel: .1 },
  { id: 'speedRun', has: T => T.perk('speed') >= 2, speed: { cut: 1.05, colour: 1.05, wave: 1.05, dry: 1.05 } },
  { id: 'calmCare', has: T => T.perk('calm') >= 1 && T.perk('consult') >= 1, calm: true },
  { id: 'shampooDuo', has: T => T.assistants >= 2, speed: { shampoo: 1.25 } },
];

/** Today's team as the synergies see it: the stylists at work (Lia included) and the support staff. */
export function teamOf(stylists, support) {
  const count = f => stylists.filter(f).length, desk = support.find(e => e.effect === 'reception' && e.hired);
  return {
    specialists: k => count(e => e.specialty === k), perk: p => count(e => e.perk === p), rank: r => count(e => e.rank === r),
    marketing: desk ? desk.skills.marketing || 0 : 0, assistants: support.filter(e => e.effect === 'tidy' && e.hired).length,
  };
}
