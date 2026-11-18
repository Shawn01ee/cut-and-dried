import { FORMATS } from '../tycoon/SalonNetwork.js';

/** Where the franchises stand: down the street past the second salon, one plot every `gap` metres. */
export const OUTLET_STREET = { from: 40, gap: 20 };
export const outletX = i => OUTLET_STREET.from + i * OUTLET_STREET.gap;

/**
 * How a franchise's day looks, in shares of its open day: a client takes `enter` to walk in and `pay` at the desk, and a
 * chair takes `chairShare` of the time the day's capacity needs (so a full book finishes about on time).
 */
export const OUTLET_PACE = { enter: .03, pay: .02, chairShare: .85, turned: .04 };

/**
 * Each format's floor, in the shop's own frame (metres from its centre): styling chairs [x, z] (all facing the back
 * wall), the desk, the waiting bench, spots to stand when the bench is full, plants, and the aisle clients walk along.
 */
const PLANS = {
  room: { chairs: [[-1.75, -2.25], [.25, -2.25], [2.25, -2.25]], aisle: .2, plants: [[-.75, 2.75], [3.75, 2.75]] },
  flagship: { chairs: [[-2.25, -4.25], [.25, -4.25], [2.75, -4.25], [-.85, -1.75], [1.35, -1.75]], aisle: .3, plants: [[-.75, 2.75], [3.75, 2.75], [-3.75, -4.6]] },
};
const DESK = { at: [-3.5, 1.25], seat: [-3.6, 1.25], pay: [-2.35, 1.25] };
const BENCH = { at: [.5, 2.75], seats: [[1.15, 2.65], [.5, 2.65], [-.15, 2.65]], approachZ: 2.15, h: .44 };
const STAND = [[2.2, 2.25], [2.8, 2.25], [3.4, 2.25]];
const DOOR = { street: [4.1, 4.7], door: [-2, 4.4], out: [-2, 3.6], inn: [-2, 2.45], far: [7.5, 4.7] };

const SKINS = [0xf6d6bd, 0xe7b892, 0xc98e66, 0x8d5a3b], HAIR = [0x16110f, 0x2e1d14, 0x6e4428, 0xc8642a, 0xb8b0a8];
const SHIRTS = [0x2f6fd6, 0xe25c8f, 0x1fa39a, 0xffd98a, 0xf6f3ee, 0x8a4fc2, 0xc8642a, 0x5f9e45], HAIRDOS = ['short', 'long', 'bob', 'bun', 'curly', 'buzz'];
const APRONS = [0x1d1a26, 0x45404f, 0x2a4478];

/** A small deterministic random source, so a shop's people look the same each time it is shown. */
const seeded = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) + .5) / 4294967296;
const pickOf = (r, list) => list[Math.floor(r() * list.length)];

/**
 * The day at one franchise, as a plan: clients in arrival order (today's drawn clients and the ones our desks sent),
 * the first `capacity` served first come first served on `chairs` chairs, the rest turned away at the door.
 * Pure: the same arrivals give the same plan, so the view can be rebuilt at any moment of the day.
 */
export function outletPlan(arrivals, chairs, capacity, pace = OUTLET_PACE) {
  const length = chairs / capacity * pace.chairShare, free = Array(chairs).fill(0);
  return arrivals.slice().sort((a, b) => a.a - b.a).map((c, i) => {
    if (i >= capacity) return { ...c, served: false };
    let k = 0; for (let j = 1; j < chairs; j++) if (free[j] < free[k]) k = j;
    const start = Math.max(c.a + pace.enter, free[k]), end = start + length; free[k] = end;
    return { ...c, served: true, chair: k, start, end };
  });
}
/** Where a client of the plan is at day share `t`: 'out', 'wait', 'chair', 'leave' or (turned away) 'turned'. */
export function phaseAt(c, t) {
  if (t < c.a) return 'out';
  if (!c.served) return 'turned';
  return t < c.start ? 'wait' : t < c.end ? 'chair' : 'leave';
}

/** Whether outlet `o` of `game` has its doors open now, else why not: 'sunday', 'paused', 'new' (opens tomorrow) or 'closed' (day over). */
export function outletState(game, o) {
  if (game.isSunday || game.dayOff) return 'sunday';
  if (o.paused) return 'paused';
  if (o.opened >= game.clock.day) return 'new';
  return o.last?.day === game.clock.day || !(game.clock.isOpen || game.clock.after) ? 'closed' : 'open';
}

/**
 * One shop's people for the day: a stylist per chair, someone at the desk, and the day's clients walking in, waiting,
 * sitting in the chairs, paying and leaving, following the outlet's drawn day (see SalonNetwork.todayOf).
 */
class ShopCast {
  constructor(deps, index, shop) {
    Object.assign(this, { deps, index, shop }); this.clients = new Map(); this.done = new Set(); this.plan = []; this.key = null; this.sway = 0;
    const o = this.outlet, r = seeded(o.id * 7919), { makeFig } = deps;
    this.staff = shop.plan.chairs.map(([x, z]) => { const f = makeFig({ skin: pickOf(r, SKINS), shirt: 0x45404f, pants: 0x2e2a38, apron: pickOf(r, APRONS), staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) }); f.pos.copy(this.at(x, z + 1.05)); f.yaw = Math.PI; return f; });
    this.desk = makeFig({ skin: pickOf(r, SKINS), shirt: pickOf(r, SHIRTS), pants: 0x1d1a26, staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) });
    Object.assign(this.desk, { mode: 'sit', seatH: .72, footY: .3, yaw: Math.PI / 2 }); this.desk.pos.copy(this.at(...DESK.seat));
  }
  get outlet() { return this.deps.network.outlets[this.index]; }
  /** World point from the shop's frame. */
  at(x, z) { return new this.deps.THREE.Vector3(outletX(this.index) + x, 0, z); }
  get t() { const c = this.deps.clock; return (c.hour - c.openHour) / Math.max(1, c.closeHour - c.openHour); }
  dispose() { [...this.staff, this.desk].forEach(f => f.remove()); this.#dropClients(); }
  /** Now: clients come so far today, in the chairs, waiting (bench or standing); and the plan's totals. */
  stats() {
    const t = this.t, on = [...this.clients.values()];
    return { came: this.plan.filter(c => c.a <= t).length, chair: on.filter(s => s.seat === 'chair').length, wait: on.filter(s => s.seat && s.seat !== 'chair').length,
      plan: this.plan.length, served: this.plan.filter(c => c.served).length, turned: this.plan.filter(c => !c.served).length, onFloor: this.clients.size, gone: this.done.size };
  }
  #arrivals(o) {
    const N = this.deps.network, today = N.todayOf(o), sent = N.referredToday(o) ? (o.referred.at || []) : [];
    return [...today.times.map((a, i) => ({ id: 't' + i, a })), ...sent.map((a, i) => ({ id: 'r' + i, a, referred: true }))];
  }
  update(dt) {
    const N = this.deps.network, o = this.outlet; if (!o) return;
    const open = outletState(N.game, o) === 'open', key = open ? `${N.game.clock.day}:${N.referredToday(o)}` : 'closed';
    this.staff.forEach(f => { f.root.visible = open; }); this.desk.root.visible = open;
    if (this.key !== key) {
      // a new day (or the first look) places everyone where they are now; a client sent by our desk just joins the day
      const sameDay = open && this.key?.split(':')[0] === key.split(':')[0];
      this.key = key; this.plan = open ? outletPlan(this.#arrivals(o), this.shop.plan.chairs.length, FORMATS[o.format].capacity) : [];
      if (!sameDay) this.#dropClients(); this.instant = !sameDay;
    }
    const t = this.t;
    for (const c of this.plan) this.#move(c, phaseAt(c, t), this.instant);
    this.instant = false; this.sway += dt;
    // the stylists: scissors while their chair is taken, a little sway as they work
    this.staff.forEach((f, k) => { const busy = [...this.clients.values()].some(c => c.seat === 'chair' && c.chair === k && c.sat); f.setTool(busy ? 'scissors' : null); f.yaw = Math.PI + (busy ? Math.sin(this.sway * 2.5 + k) * .25 : 0); });
    for (const c of this.clients.values()) if (c.fade != null) { c.fade = Math.min(1, c.fade + dt * 2.5); this.deps.fade(c.fig, Math.max(.01, c.fade)); if (c.fade >= 1) c.fade = null; }
  }
  #dropClients() { this.clients.forEach(c => c.fig.remove()); this.clients.clear(); this.done.clear(); }
  #spawn(c, at) {
    const r = seeded(c.a * 1e6 | 0), fig = this.deps.makeFig({ skin: pickOf(r, SKINS), shirt: pickOf(r, SHIRTS), pants: pickOf(r, [0x45404f, 0x1d1a26, 0x2a4478]), staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) });
    fig.pos.copy(at); const s = { fig, chair: c.chair, phase: null, seat: null, sat: false, fade: 0 }; this.deps.fade(fig, .01); this.clients.set(c.id, s); return s;
  }
  /** A free waiting place: a bench seat, else a spot to stand. */
  #waitSpot() {
    const used = new Set([...this.clients.values()].filter(s => s.seat && s.seat !== 'chair').map(s => s.seat));
    const i = BENCH.seats.findIndex((_, k) => !used.has('b' + k)); if (i >= 0) return 'b' + i;
    const j = STAND.findIndex((_, k) => !used.has('s' + k)); return j >= 0 ? 's' + j : 's0';
  }
  #sit(f, at, yaw, h, foot) { Object.assign(f, { mode: 'sit', yaw, seatH: h, footY: foot }); f.pos.copy(at); }
  #placeWait(s, instant) {
    const f = s.fig, spot = s.seat = this.#waitSpot(), k = +spot.slice(1), A = (x, z) => this.at(x, z);
    if (spot[0] === 'b') { const [x, z] = BENCH.seats[k], seat = A(x, z); if (instant) this.#sit(f, seat, Math.PI, BENCH.h, .06); else f.walkTo([A(x, BENCH.approachZ), seat], () => this.#sit(f, seat, Math.PI, BENCH.h, .06)); }
    else { const [x, z] = STAND[k]; if (instant) { f.pos.copy(A(x, z)); f.yaw = Math.PI; } else f.walkTo([A(x, z)], () => { f.yaw = Math.PI; }); }
  }
  #toChair(s, instant) {
    const f = s.fig, [x, z] = this.shop.plan.chairs[s.chair], aisle = this.shop.plan.aisle, A = (a, b) => this.at(a, b), seat = A(x, z + .45);
    s.seat = 'chair'; s.sat = false; const sit = () => { this.#sit(f, seat, Math.PI, .55, .17); s.sat = true; };
    if (instant) { sit(); return; }
    f.walkTo([A(f.pos.x - outletX(this.index), aisle), A(x, aisle), A(x, z + 1.35), seat], sit);
  }
  #leave(s, c) {
    const f = s.fig, A = (x, z) => this.at(x, z), aisle = this.shop.plan.aisle, path = [];
    if (s.seat === 'chair') { const [x, z] = this.shop.plan.chairs[s.chair]; path.push(A(x, z + 1.35), A(x, aisle)); }
    s.seat = null; s.sat = false; s.phase = 'gone';
    f.walkTo([...path, A(...DESK.pay)], () => { f.yaw = Math.PI * 1.5; this.deps.later(1.2, () => this.#out(s, c)); });
  }
  /** Out of the door and down the street; gone for good once out of sight. */
  #out(s, c) {
    const mine = () => !this.disposed && this.clients.get(c.id) === s; if (!mine()) return; const A = (x, z) => this.at(x, z);
    s.fig.walkTo([A(...DOOR.inn), A(...DOOR.out), A(...DOOR.door), A(...DOOR.street), A(...DOOR.far)], () => { if (!mine()) return; s.fig.remove(); this.clients.delete(c.id); this.done.add(c.id); });
  }
  #move(c, want, instant) {
    let s = this.clients.get(c.id);
    if (this.done.has(c.id) || s?.phase === 'gone' || (s && s.phase === want) || want === 'out') return;
    const A = (x, z) => this.at(x, z);
    if (!s) {
      // already finished or turned away before we looked: nobody to show
      if (want === 'leave' || (want === 'turned' && (instant || this.t > c.a + OUTLET_PACE.turned))) return;
      s = this.#spawn(c, instant ? A(...DOOR.inn) : A(...DOOR.street)); if (instant) { s.fade = null; this.deps.fade(s.fig, 1); }
      if (!instant) { s.phase = 'entering'; s.fig.walkTo([A(...DOOR.door), A(...DOOR.out), A(...DOOR.inn)], () => { s.phase = null; this.#move(c, phaseAt(c, this.t), false); }); return; }
    }
    if (s.phase === 'entering') return;
    if (want === 'turned') { s.phase = 'gone'; s.fig.yaw = Math.PI; this.deps.later(.8, () => this.#out(s, c)); return; }
    s.phase = want;
    if (want === 'wait') this.#placeWait(s, instant);
    else if (want === 'chair') { s.seat = null; this.#toChair(s, instant); }
    else if (want === 'leave') this.#leave(s, c);
  }
}

/**
 * The franchises on the street. Each outlet gets a building (from `shell`), its furniture and a sign; the shops on
 * show (one looked at, or all of them on the monitor wall) also get their people (a ShopCast each), so a long street
 * costs nothing while nobody is looking at it.
 */
export class OutletView {
  #shops = []; #casts = new Map();
  /** `deps`: { THREE, world, network, clock, shell(root, format, signText), furniture, makeFig(look), fade(fig, s), later(seconds, fn) }. */
  constructor(deps) { this.deps = deps; }
  /** Builds the buildings of outlets opened since the last call. */
  sync() {
    const { THREE, world, network, shell, furniture } = this.deps;
    network.outlets.slice(this.#shops.length).forEach(o => {
      const n = this.#shops.length, root = new THREE.Group(), plan = PLANS[o.format] || PLANS.room; root.position.set(outletX(n), 0, 0); world.add(root);
      shell(root, o.format, `CIEL ${o.format === 'flagship' ? 'FLAGSHIP' : 'ROOM'} ${o.id}`);
      plan.chairs.forEach(([x, z]) => furniture.buildStatic('station', x, z, 0, root));
      furniture.buildStatic('desk', DESK.at[0], DESK.at[1], 1, root); furniture.buildStatic('bench', BENCH.at[0], BENCH.at[1], 2, root); furniture.buildStatic('mat', -2, 2.75, 0, root);
      plan.plants.forEach(([x, z]) => furniture.buildStatic('plant', x, z, 0, root));
      this.#shops.push({ id: o.id, root, plan });
    });
  }
  /** Where to look at outlet `i` and how much to take in (a flagship's floor runs deeper); `tight` frames the shop alone, for a tile. */
  home(i, tight = false) {
    const big = this.deps.network.outlets[i]?.format === 'flagship';
    return tight ? { x: outletX(i) + .3, z: big ? -1.1 : -.1, scale: big ? 1.12 : 1 } : { x: outletX(i), z: big ? .2 : 1.2, scale: big ? 1.15 : 1 };
  }
  /** The outlets whose people are shown (indices on the street); the others' people leave the stage. */
  show(indices) {
    this.sync(); const want = new Set(indices.filter(i => i >= 0 && i < this.#shops.length));
    for (const [i, c] of this.#casts) if (!want.has(i)) { c.disposed = true; c.dispose(); this.#casts.delete(i); }
    for (const i of want) if (!this.#casts.has(i)) this.#casts.set(i, new ShopCast(this.deps, i, this.#shops[i]));
  }
  get shown() { return [...this.#casts.keys()]; }
  /** Outlet `i` right now (null when it is not on show). */
  stats(i) { return this.#casts.get(i)?.stats() ?? null; }
  update(dt) { for (const c of this.#casts.values()) c.update(dt); }
}
