/**
 * Careers: promotion up the grades (junior, designer, senior, master) once a stylist has the level, the clients and
 * the results, and certificates from short courses that each add one skill or one thing they do better.
 */
export const RANKS = ['junior', 'designer', 'senior', 'master'];
/** What each promotion asks for: the level, clients served, and average client satisfaction. */
export const PROMOTION = {
  designer: { level: 4, served: 40, satisfaction: .7 },
  senior: { level: 7, served: 150, satisfaction: .78 },
  master: { level: 10, served: 350, satisfaction: .85 },
};
/** A promotion's rewards: a raise in base pay, relief, and more reason to stay. */
export const PROMO_PAY = 1.2, PROMO_RELIEF = 20, PROMO_LOYALTY = 5;
export const ROLE_OF = { junior: 'Junior Designer', designer: 'Designer', senior: 'Senior Designer', master: 'Master Designer' };
export const nextRank = e => RANKS[RANKS.indexOf(e.rank || 'designer') + 1] || null;
/** How far a stylist is from their next promotion: each requirement as [have, need], and whether all are met. */
export function promotionStatus(e) {
  const to = nextRank(e); if (!to) return null;
  const need = PROMOTION[to], avg = e.stats.served ? e.stats.sum / e.stats.served : 0;
  const parts = { level: [e.level, need.level], served: [e.stats.served, need.served], satisfaction: [avg, need.satisfaction] };
  return { to, parts, ready: Object.values(parts).every(([h, n]) => h >= n) };
}

/** Certificates: a day's course (they are away tomorrow), paid once. `plus` adds to a skill; the rest are what they do better. */
export const CERTS = {
  colour: { cost: 900, skill: 'colouring', plus: 8, service: 'colour', satisfaction: .02 },
  perm: { cost: 900, skill: 'perming', plus: 8, service: 'perm', satisfaction: .02 },
  cut: { cost: 800, skill: 'cutting', plus: 8, service: 'haircut', satisfaction: .02 },
  scalp: { cost: 1000, treatment: .1 },
  service: { cost: 600, skill: 'customerService', plus: 8 },
  bridal: { cost: 900, occasion: .05 },
};
/** Satisfaction a stylist's certificates add for this client. */
export function certSatisfaction(e, customer) {
  return (e.certs || []).reduce((n, id) => { const c = CERTS[id]; return n + (c.service === customer.requestedService ? c.satisfaction : 0) + (c.occasion && (customer.occasion || customer.special === 'bride') ? c.occasion : 0); }, 0);
}
export const hasCert = (e, id) => (e.certs || []).includes(id);
