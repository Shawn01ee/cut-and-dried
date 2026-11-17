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

/**
 * The franchises on the street. Each outlet gets a building (from `shell`), its furniture and a sign; the one in view
 * also gets its people: a stylist per chair, someone at the desk, and the day's clients walking in, waiting, sitting
 * in the chairs, paying and leaving, following the outlet's drawn day (see SalonNetwork.todayOf), so what is seen is
 * what is settled. Only the outlet in view has people, so a long street costs nothing while you look elsewhere.
 */
export class OutletView {
  #shops = []; #focus = null; #cast = null;
  /** `deps`: { THREE, world, network, clock, shell(root, format, signText), furniture, makeFig(look), fade(fig, s), later(seconds, fn) }. */
  constructor(deps) { this.deps = deps; }
  get focus() { return this.#focus; }
  /** The outlet in view today: clients in its plan, how many are served or turned away, and how many are on the floor now. */
  get stats() { const C = this.#cast; return C ? { plan: C.plan.length, served: C.plan.filter(c => c.served).length, turned: C.plan.filter(c => !c.served).length, onFloor: C.clients.size, gone: C.done.size } : null; }
  /** Builds the buildings of outlets opened since the last call. */
  sync() {
    const { THREE, world, network, shell, furniture } = this.deps;
    network.outlets.slice(this.#shops.length).forEach((o, i) => {
      const n = this.#shops.length, root = new THREE.Group(), plan = PLANS[o.format] || PLANS.room; root.position.set(outletX(n), 0, 0); world.add(root);
      shell(root, o.format, `CIEL ${o.format === 'flagship' ? 'FLAGSHIP' : 'ROOM'} ${o.id}`);
      plan.chairs.forEach(([x, z]) => furniture.buildStatic('station', x, z, 0, root));
      furniture.buildStatic('desk', DESK.at[0], DESK.at[1], 1, root); furniture.buildStatic('bench', BENCH.at[0], BENCH.at[1], 2, root); furniture.buildStatic('mat', -2, 2.75, 0, root);
      plan.plants.forEach(([x, z]) => furniture.buildStatic('plant', x, z, 0, root));
      this.#shops.push({ id: o.id, root, plan });
    });
  }
  /** The camera's spot for outlet `i` (its index on the street) and how much it takes in: a flagship's floor runs deeper. */
  home(i) { const big = this.deps.network.outlets[i]?.format === 'flagship'; return { x: outletX(i), z: big ? .2 : 1.2, scale: big ? 1.15 : 1 }; }
  /** Shows outlet `i`'s people (null: none). */
  setFocus(i) {
    if (i === this.#focus) return;
    this.#clear(); this.#focus = i;
  }
  #clear() { const C = this.#cast; if (C) { [...C.staff, C.desk].forEach(f => f.remove()); C.clients.forEach(s => s.fig.remove()); } this.#cast = null; }
  /** World point from the shop's frame. */
  #at(x, z) { const { THREE } = this.deps; return new THREE.Vector3(outletX(this.#focus) + x, 0, z); }
  #arrivals(o) {
    const N = this.deps.network, today = N.todayOf(o), sent = N.referredToday(o) ? (o.referred.at || []) : [];
    return [...today.times.map((a, i) => ({ id: 't' + i, a })), ...sent.map((a, i) => ({ id: 'r' + i, a, referred: true }))];
  }
  /** The open-day share now (past 1 while our own salons work overtime). */
  get #t() { const c = this.deps.clock; return (c.hour - c.openHour) / Math.max(1, c.closeHour - c.openHour); }
  /** Whether outlet `o` has its doors open now. */
  #open(o) { const g = this.deps.network.game; return !g.isSunday && !g.dayOff && !o.paused && o.opened < g.clock.day && o.last?.day !== g.clock.day && (g.clock.isOpen || g.clock.after); }
  update(dt) {
    if (this.#focus == null) return;
    const N = this.deps.network, o = N.outlets[this.#focus], shop = this.#shops[this.#focus]; if (!o || !shop) return;
    const open = this.#open(o), key = open ? `${N.game.clock.day}:${N.referredToday(o)}` : 'closed';
    if (!this.#cast) this.#cast = this.#staff(o, shop);
    const cast = this.#cast; cast.staff.forEach(f => { f.root.visible = open; }); cast.desk.root.visible = open;
    if (cast.key !== key) {
      // a new day (or the first look) places everyone where they are now; a client sent by our desk just joins the day
      const sameDay = open && cast.key?.split(':')[0] === key.split(':')[0];
      cast.key = key; cast.plan = open ? outletPlan(this.#arrivals(o), shop.plan.chairs.length, FORMATS[o.format].capacity) : [];
      if (!sameDay) this.#dropClients(); cast.instant = !sameDay;
    }
    const t = this.#t;
    for (const c of cast.plan) this.#move(c, phaseAt(c, t), cast.instant);
    cast.instant = false;
    // the stylists: scissors while their chair is taken, a little sway as they work
    cast.sway = (cast.sway || 0) + dt;
    cast.staff.forEach((f, k) => { const busy = [...cast.clients.values()].some(c => c.seat === 'chair' && c.chair === k && c.sat); f.setTool(busy ? 'scissors' : null); f.yaw = Math.PI + (busy ? Math.sin(cast.sway * 2.5 + k) * .25 : 0); });
    for (const c of cast.clients.values()) if (c.fade != null) { c.fade = Math.min(1, c.fade + dt * 2.5); this.deps.fade(c.fig, Math.max(.01, c.fade)); if (c.fade >= 1) c.fade = null; }
  }
  #staff(o, shop) {
    const { makeFig } = this.deps, r = seeded(o.id * 7919);
    const staff = shop.plan.chairs.map(([x, z]) => { const f = makeFig({ skin: pickOf(r, SKINS), shirt: 0x45404f, pants: 0x2e2a38, apron: pickOf(r, APRONS), staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) }); f.pos.copy(this.#at(x, z + 1.05)); f.yaw = Math.PI; return f; });
    const desk = makeFig({ skin: pickOf(r, SKINS), shirt: pickOf(r, SHIRTS), pants: 0x1d1a26, staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) });
    Object.assign(desk, { mode: 'sit', seatH: .72, footY: .3, yaw: Math.PI / 2 }); desk.pos.copy(this.#at(...DESK.seat));
    return { staff, desk, clients: new Map(), done: new Set(), plan: [], key: null };
  }
  #dropClients() { const C = this.#cast.clients; C.forEach(c => c.fig.remove()); C.clear(); this.#cast.done.clear(); }
  #spawn(c, at) {
    const r = seeded(c.a * 1e6 | 0), fig = this.deps.makeFig({ skin: pickOf(r, SKINS), shirt: pickOf(r, SHIRTS), pants: pickOf(r, [0x45404f, 0x1d1a26, 0x2a4478]), staffHair: pickOf(r, HAIR), hairdo: pickOf(r, HAIRDOS) });
    fig.pos.copy(at); const s = { fig, chair: c.chair, phase: null, seat: null, sat: false, fade: 0 }; this.deps.fade(fig, .01); this.#cast.clients.set(c.id, s); return s;
  }
  #free(s) { s.seat = null; s.sat = false; }
  /** A free waiting place: a bench seat, else a spot to stand. */
  #waitSpot() {
    const used = new Set([...this.#cast.clients.values()].filter(s => s.seat && s.seat !== 'chair').map(s => s.seat));
    const i = BENCH.seats.findIndex((_, k) => !used.has('b' + k)); if (i >= 0) return 'b' + i;
    const j = STAND.findIndex((_, k) => !used.has('s' + k)); return j >= 0 ? 's' + j : 's0';
  }
  #sit(f, at, yaw, h, foot) { Object.assign(f, { mode: 'sit', yaw, seatH: h, footY: foot }); f.pos.copy(at); }
  #placeWait(s, instant) {
    const f = s.fig, spot = s.seat = this.#waitSpot(), k = +spot.slice(1), A = (x, z) => this.#at(x, z);
    if (spot[0] === 'b') { const [x, z] = BENCH.seats[k], seat = A(x, z); if (instant) this.#sit(f, seat, Math.PI, BENCH.h, .06); else f.walkTo([A(x, BENCH.approachZ), seat], () => this.#sit(f, seat, Math.PI, BENCH.h, .06)); }
    else { const [x, z] = STAND[k]; if (instant) { f.pos.copy(A(x, z)); f.yaw = Math.PI; } else f.walkTo([A(x, z)], () => { f.yaw = Math.PI; }); }
  }
  #toChair(s, instant) {
    const f = s.fig, [x, z] = this.#shops[this.#focus].plan.chairs[s.chair], aisle = this.#shops[this.#focus].plan.aisle, A = (a, b) => this.#at(a, b), seat = A(x, z + .45);
    s.seat = 'chair'; s.sat = false; const sit = () => { this.#sit(f, seat, Math.PI, .55, .17); s.sat = true; };
    if (instant) { sit(); return; }
    f.walkTo([A(f.pos.x - outletX(this.#focus), aisle), A(x, aisle), A(x, z + 1.35), seat], sit);
  }
  #leave(s, c) {
    const f = s.fig, A = (x, z) => this.#at(x, z), aisle = this.#shops[this.#focus].plan.aisle, path = [];
    if (s.seat === 'chair') { const [x, z] = this.#shops[this.#focus].plan.chairs[s.chair]; path.push(A(x, z + 1.35), A(x, aisle)); }
    this.#free(s); s.phase = 'gone';
    f.walkTo([...path, A(...DESK.pay)], () => { f.yaw = Math.PI * 1.5; this.deps.later(1.2, () => this.#out(s, c)); });
  }
  /** Out of the door and down the street; gone for good once out of sight. */
  #out(s, c) {
    const mine = () => this.#cast?.clients.get(c.id) === s; if (!mine()) return; const A = (x, z) => this.#at(x, z);
    s.fig.walkTo([A(...DOOR.inn), A(...DOOR.out), A(...DOOR.door), A(...DOOR.street), A(...DOOR.far)], () => { if (!mine()) return; s.fig.remove(); this.#cast.clients.delete(c.id); this.#cast.done.add(c.id); });
  }
  #move(c, want, instant) {
    const C = this.#cast.clients; let s = C.get(c.id);
    if (this.#cast.done.has(c.id) || s?.phase === 'gone' || (s && s.phase === want)) return;
    if (want === 'out') return;
    const A = (x, z) => this.#at(x, z);
    if (!s) {
      // already finished or turned away before we looked: nobody to show
      if (want === 'leave' || (want === 'turned' && (instant || this.#t > c.a + OUTLET_PACE.turned))) return;
      s = this.#spawn(c, instant ? A(...DOOR.inn) : A(...DOOR.street)); if (instant) { s.fade = null; this.deps.fade(s.fig, 1); }
      if (!instant) { s.phase = 'entering'; s.fig.walkTo([A(...DOOR.door), A(...DOOR.out), A(...DOOR.inn)], () => { s.phase = null; this.#move(c, phaseAt(c, this.#t), false); }); return; }
    }
    if (s.phase === 'entering') return;
    if (want === 'turned') { this.#turnAway(s, c); return; }
    s.phase = want;
    if (want === 'wait') this.#placeWait(s, instant);
    else if (want === 'chair') { this.#free(s); this.#toChair(s, instant); }
    else if (want === 'leave') this.#leave(s, c);
  }
  #turnAway(s, c) { s.phase = 'gone'; s.fig.yaw = Math.PI; this.deps.later(.8, () => this.#out(s, c)); }
}
