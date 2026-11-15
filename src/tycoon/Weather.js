/**
 * Melbourne weather, one kind a day, and the surprises it can bring in the middle of a working day.
 * Effects use the same multipliers as the calendar (see Calendar.js); `drinks: 0` stops drinks being served.
 */
export const WEATHER = {
  sunny: { demand: 1.05 },
  cloudy: {},
  rain: { demand: .9, patience: 1.1 },
  storm: { demand: .75, patience: 1.15 },
  heat: { demand: .9, cut: 1.2 },
  cold: { demand: .9, perm: 1.1 },
};
/** How likely each kind is in each season: hot, dry summers, wet winters and stormy springs. */
const ODDS = {
  summer: { sunny: .45, cloudy: .2, rain: .1, storm: .07, heat: .18 },
  autumn: { sunny: .35, cloudy: .3, rain: .25, storm: .08, heat: .02 },
  winter: { sunny: .2, cloudy: .35, rain: .3, storm: .07, cold: .08 },
  spring: { sunny: .3, cloudy: .3, rain: .25, storm: .12, heat: .03 },
};
export function rollWeather(season) {
  const odds = ODDS[season] || ODDS.autumn; let r = Math.random();
  for (const [k, p] of Object.entries(odds)) if ((r -= p) < 0) return k;
  return 'cloudy';
}

/**
 * Surprises in the middle of the day. `fix` is what a quick repair costs (otherwise `effect` lasts until closing);
 * `walkIns` brings extra clients at once; `followers` is free attention. `weather` lists when each can happen.
 */
export const SURPRISES = [
  { id: 'leak', weather: ['storm'], fix: 300, effect: { wash: .7 } },
  { id: 'outage', weather: ['storm'], fix: 400, effect: { speed: .8 } },
  { id: 'coffee', weather: ['storm', 'rain', 'cloudy', 'sunny'], fix: 150, effect: { drinks: 0 } },
  { id: 'aircon', weather: ['heat'], fix: 250, effect: { patience: .85 } },
  { id: 'boiler', weather: ['cold'], fix: 200, effect: { wash: .6 } },
  { id: 'umbrella', weather: ['rain', 'storm'], walkIns: 2 },
  { id: 'tourGroup', weather: ['sunny', 'cloudy'], walkIns: 3 },
  { id: 'streetShoot', weather: ['sunny', 'heat'], followers: 150 },
  { id: 'delivery', weather: ['sunny', 'cloudy', 'rain', 'heat', 'cold'], fix: 100, effect: { materials: 1.5 } },
];
/** The chance of a surprise on an open day without a morning happening, by the weather. */
export const SURPRISE_CHANCE = { storm: .6, heat: .35, cold: .35, rain: .15, sunny: .12, cloudy: .1 };
/** Today's surprise, if any: which, and at what hour (well inside opening hours). */
export function rollSurprise(weather, openHour, closeHour) {
  if (Math.random() >= (SURPRISE_CHANCE[weather] || 0)) return null;
  const pool = SURPRISES.filter(s => s.weather.includes(weather)); if (!pool.length) return null;
  const s = pool[Math.floor(Math.random() * pool.length)];
  return { id: s.id, hour: openHour + 1 + Math.random() * Math.max(1, closeHour - openHour - 3), state: 'due' };
}
