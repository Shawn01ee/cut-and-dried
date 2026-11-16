/**
 * Lia's management skill (0-100): it grows as she runs the salon and looks after people, and it makes the team
 * calmer, her one-to-ones count for more, talking people out of quitting likelier and running costs lower.
 */
export const MGMT = {
  start: 30, max: 100,
  // what grows it
  day: .15, talk: 1, wish: 2, clash: 2, goal: 3, promotion: 1,
  // a management course: its cost, what it adds, and how often she can take one
  study: { cost: 1500, gain: 5, every: 7 },
};
/** What a given management skill does, as numbers the UI can show. */
export const mgmtEffects = m => ({
  teamStress: Math.round(m / 50 * 10) / 10, // less stress for each stylist every working day
  talk: Math.round(m / 10), // extra stress a one-to-one takes away
  persuade: m / 300, // added to the chance of talking someone out of quitting
  costs: m / 1000, // share taken off running costs
});

/** What a stylist asks for in a one-to-one, by what weighs on them most. Granting it helps on top of the chat. */
export const WISHES = { tired: 'dayoff', busy: 'breaks', overtime: 'hours', pay: 'raise', grudge: 'time', fine: 'learn', rival: 'apart', promotion: 'promote', welfare: 'meals' };
export const WISH_RELIEF = 20, WISH_LOYALTY = 2, WISH_MAX = 3;
/** Breaks looked after: the day's work weighs this much less for this many days. */
export const BREAK_DAYS = 5, BREAK_EASE = .7;
