import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** Furniture Lia can straighten up or wipe down. */
export const TIDY_AT = ['shelf', 'displayTable', 'plant', 'coffeeBar', 'cafeBar', 'sideTable', 'mirror', 'bookcase', 'towelStation', 'kiosk', 'lamp'];
/**
 * How long a quiet spell lasts before she finds something to do, the rest between jobs, how much patience a word
 * from her gives a waiting client (a share of their total), and how much hair on the floor makes her sweep.
 */
export const OWNER_IDLE = { wait: 4, rest: [3, 8], care: .25, mess: 6 };

/**
 * What Lia does with time on her hands. At her own chair: straighten up or sweep, back the moment a client waits.
 * Without a chair (her seat given to a stylist): look after the clients who are waiting first, then sweep or tidy.
 *
 * The scene hands in what she needs through `ctx` (her figure, paths, the queue, the floor, speech); this class only
 * decides what she does and moves her while she does it.
 */
export class OwnerRoutine {
  constructor(ctx) { this.ctx = ctx; this.idle = 0; this.job = null; this.rest = 2; }

  /** At her chair with no client: after a quiet spell, a job for her station to hold (or null). */
  atChair(site, dt) {
    if (this.ctx.waiting(site).length) { this.idle = 0; return null; }
    if ((this.idle += dt) < OWNER_IDLE.wait) return null;
    this.idle = -this.ctx.rand(...OWNER_IDLE.rest);
    return this.#chores(site);
  }
  /** Advances a job; true once it is done (or dropped because a client is waiting). */
  advance(job, dt) { return job.kind === 'care' ? this.#updateCare(job, dt) : job.kind === 'tidy' ? this.#updateTidy(job, dt) : this.ctx.sweep.update(job, dt); }

  /** Without a chair: her own run of jobs, the waiting clients first. Call every frame; `on` is false while she is needed elsewhere. */
  float(dt, on) {
    if (!on) { this.job = null; return; }
    if (this.job) { if (this.advance(this.job, dt)) this.job = null; return; }
    const f = this.ctx.fig; if (f.path.length) return;
    // a waiting client comes first, straight away; chores wait for a breather
    const site = this.ctx.siteOf(f.pos.x), c = this.ctx.waiting(site).find(q => !q.cared);
    if (c) { this.job = this.#startCare(c); return; }
    if ((this.rest -= dt) > 0) return;
    this.rest = this.ctx.rand(...OWNER_IDLE.rest); this.job = this.#chores(site);
  }

  /** Sweeping when the floor needs it and no assistant is on it, otherwise a bit of tidying. */
  #chores(site) { const X = this.ctx; return (X.mess(site) > OWNER_IDLE.mess && !X.helpersOut() ? X.sweep.start(X.fig) : null) || this.#startTidy(site); }

  #startTidy(site) {
    const X = this.ctx, f = X.fig, items = X.items(site).filter(it => TIDY_AT.includes(it.id)); if (!items.length) return null;
    const it = items[Math.floor(Math.random() * items.length)], c = V(it.x, 0, it.z), dir = f.pos.clone().sub(c).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
    const job = { kind: 'tidy', phase: 'walk', aim: c, t: X.rand(2.5, 4.5), site };
    f.handL = f.handR = null; f.setTool(null);
    f.walkTo(X.route(f.pos, c.clone().addScaledVector(dir, .7)), () => { job.phase = 'work'; f.yaw = Math.atan2(c.x - f.pos.x, c.z - f.pos.z); });
    return job;
  }
  #updateTidy(job, dt) {
    const X = this.ctx, f = X.fig;
    if (X.waiting(job.site).length) { this.#stop(); return true; }
    if (job.phase !== 'work') return false;
    job.t -= dt; const k = Math.sin(X.time() * 3.2);
    f.handR = f.pos.clone().add(V(0, 1.0 + k * .06, 0)).addScaledVector(X.fwd(f.yaw), .3).addScaledVector(X.rgt(f.yaw), .12);
    f.handL = f.handR.clone().addScaledVector(X.rgt(f.yaw), -.24).add(V(0, -k * .08, 0));
    if (job.t > 0) return false;
    f.handL = f.handR = null; return true;
  }

  /** Walks over to a waiting client and has a word: they wait a little longer for it. */
  #startCare(c) {
    const X = this.ctx, f = X.fig, job = { kind: 'care', phase: 'walk', c, t: 1.6 };
    f.handL = f.handR = null; f.setTool(null);
    f.walkTo(X.route(f.pos, c.fig.pos.clone().add(V(.55, 0, .35))), () => {
      job.phase = 'talk'; f.yaw = Math.atan2(c.fig.pos.x - f.pos.x, c.fig.pos.z - f.pos.z);
      if (c.state !== 'wait') return;
      c.cared = true; c.pat = Math.min(c.maxPat, c.pat + c.maxPat * OWNER_IDLE.care);
      X.say(f, X.line('owner.care', { n: X.name(c.name) }), true); X.later(1.3, () => X.say(c.fig, X.line('owner.careOk'), false));
    });
    return job;
  }
  #updateCare(job, dt) { if (job.phase !== 'talk') { if (job.c.state !== 'wait') { this.#stop(); return true; } return false; } return (job.t -= dt) <= 0; }
  #stop() { const f = this.ctx.fig; f.handL = f.handR = null; f.path.length = 0; }
}
