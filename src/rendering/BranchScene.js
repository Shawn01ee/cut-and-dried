import { V, rand, clamp, lerp, smooth } from '../core/math.js';
import { labMix } from './color.js';
import { aiPlan, applyPlan, score, cloneHair } from '../hair/rules.js';

const CHAIR_X = [-2.25, -.25, 1.75];
const STREET = V(4.1, 0, 4.7), STREET_DOOR = V(-2, 0, 4.4), DOOR_OUT = V(-2, 0, 3.6), DOOR_IN = V(-2, 0, 2.45);
// Branch stylists are steady professionals run by a manager.
const STAFF_PROFILE = { cut: 1.2, bias: 0, col: .012, wave: .12, fine: true, single: false };

/** Animates one branch: three stylists work through a steady flow of clients while the salon is open. */
export class BranchScene {
  constructor(branch, origin, deps) {
    Object.assign(this, { branch, origin, deps });
    const at = this.#at.bind(this);
    this.desk = deps.makeFig('desk');
    Object.assign(this.desk, { mode: 'sit', seatH: .72, footY: .3, yaw: Math.PI / 2 }); this.desk.pos.copy(at(V(-3.6, 0, 1.25)));
    this.chairs = CHAIR_X.map((x, i) => {
      const stylist = deps.makeFig('stylist', i); stylist.pos.copy(at(V(x, 0, -1.2))); stylist.yaw = Math.PI;
      return { x, stylist, client: null, timer: rand(1, 8) };
    });
  }
  #at(v) { return v.clone().add(this.origin); }

  update(dt, t) {
    for (const chair of this.chairs) {
      if (!chair.client) { chair.timer -= dt; if (chair.timer <= 0 && this.deps.isOpen()) this.#admit(chair); continue; }
      const c = chair.client;
      if (c.state === 'service') this.#serve(chair, dt, t);
      if (c.hm.dirty) c.hm.build(c.data.hair, null, 0);
    }
  }

  #admit(chair) {
    const at = this.#at.bind(this), data = this.deps.newCustomer(), fig = this.deps.makeFig('client');
    const plan = aiPlan(data, STAFF_PROFILE), result = applyPlan(data.hair, plan, STAFF_PROFILE, true);
    const c = chair.client = { data, fig, hm: this.deps.makeHair(fig), from: cloneHair(data.hair), to: result, t: 0, dur: rand(14, 24), state: 'walk' };
    fig.pos.copy(at(STREET)); fig.yaw = -Math.PI / 2;
    fig.walkTo([STREET_DOOR, DOOR_OUT, DOOR_IN, V(chair.x, 0, 1.8), V(chair.x, 0, -.9), V(chair.x, 0, -1.8)].map(at), () => {
      Object.assign(fig, { mode: 'sit', yaw: Math.PI, seatH: .55, footY: .17 }); c.state = 'service';
      chair.stylist.setTool('scissors');
    });
  }

  #serve(chair, dt, t) {
    const c = chair.client, h = c.data.hair, k = smooth(clamp((c.t += dt) / c.dur));
    h.len = c.from.len.map((l, j) => lerp(l, c.to.len[j], k));
    h.lab = labMix(c.from.lab, c.to.lab, k); h.wave = lerp(c.from.wave, c.to.wave, k); c.hm.dirty = true;
    const head = c.fig.head.getWorldPosition(V()), sx = Math.sin(t * 1.3) * .16, snip = Math.sin(t * 22) * .012;
    chair.stylist.handR = head.clone().add(V(sx, -.12 + snip, .2)); chair.stylist.handL = head.clone().add(V(sx + .09, -.06, .17));
    if (c.t < c.dur) return;
    this.deps.record(this.branch, score(h, c.data.order).all);
    const s = chair.stylist; s.setTool(null); s.handL = s.handR = null; c.state = 'leave';
    c.fig.walkTo([V(chair.x + .55, 0, -.9), V(chair.x + .55, 0, 1.8), DOOR_IN, DOOR_OUT, STREET_DOOR, STREET].map(this.#at.bind(this)), () => {
      c.hm.mesh.dispose(); c.fig.remove(); chair.client = null; chair.timer = rand(2, 8);
    });
  }
}
