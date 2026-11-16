import { promotionStatus } from './Career.js';
/**
 * Staff welfare: programmes the salon chooses to run for its stylists. Each states its cost and its one effect.
 * `perHead` is charged for every stylist at work that day; one-off costs are charged when they happen.
 */
export const PROGRAMMES = {
  // a meal allowance: everyone eats properly, and unwinds a little every working day
  meals: { perHead: 10, stress: -3 },
  // private health cover: people put up with more before they think of quitting
  health: { perHead: 8, resignAt: 10 },
  // guaranteed breaks: the day's work weighs less, services take a little longer
  breaks: { perHead: 0, load: .75, speed: .97 },
  // an education allowance: experience from every service goes further
  education: { perHead: 6, learning: 1.25 },
  // paid leave on request: the most stressed stylist past `at` takes tomorrow off
  leave: { perHead: 0, at: 70 },
  // birthdays: a gift and a fuss on the day
  birthday: { gift: 100, stress: -30 },
  // long-service awards: every `every` days a payment, relief and more patience with the job (up to `maxLoyalty`)
  longService: { every: 30, pay: 300, stress: -40, loyalty: 2, maxLoyalty: 10 },
};
export const WELFARE_IDS = Object.keys(PROGRAMMES);
/** A one-to-one chat with Lia: once a week per stylist, it eases stress and they say what is on their mind. */
export const TALK_EVERY = 7, TALK_RELIEF = -10;

/** A stylist's birthday, fixed by who they are: month 1-12 and date 1-30. */
export function birthdayOf(e) {
  let h = 7; for (const ch of e.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { month: 1 + (h % 12), date: 1 + ((h >>> 4) % 30) };
}

/** What weighs on a stylist most, from yesterday's stress and their situation (`staff` adds colleagues and welfare). */
export function concernOf(e, staff = null) {
  if (e.grudge > 0) return 'grudge';
  if (promotionStatus(e)?.ready) return 'promotion';
  if (staff) { const { rival } = staff.friendsOf(e); if (rival && rival[1] <= -40) return 'rival'; }
  if (e.stress < 30) return 'fine';
  if (staff && !staff.welfare.size && e.stress >= 55) return 'welfare';
  if (e.daysEmployed >= 60 && !e.raises && e.stress >= 50) return 'pay';
  const s = e.lastStress; if (!s) return 'fine';
  return [['busy', s.work], ['tired', s.fatigue], ['overtime', s.overtime]].sort((a, b) => b[1] - a[1])[0][0];
}
