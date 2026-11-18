import { outletState } from './OutletView.js';

/** A tile's text strips (CSS pixels): the name row above the picture and the numbers row below it; the gap between tiles. */
export const WALL_TILE = { head: 22, foot: 20, gap: 8, aspect: 1.35 };

/**
 * Tiles for `n` shops in a `w` × `h` area: the column count that shows each shop largest at `aspect` (picture width
 * over height), tiles centred in the area and the last row centred under the others. Pure: [{ x, y, w, h }].
 */
export function wallGrid(n, w, h, { head, foot, gap, aspect } = WALL_TILE) {
  if (!n) return [];
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols), tw = (w - gap * (cols - 1)) / cols, th = (h - gap * (rows - 1)) / rows, view = Math.min(tw / aspect, th - head - foot);
    if (!best || view > best.view) best = { cols, rows, view };
  }
  const tw = Math.floor(best.view * aspect), th = Math.floor(best.view + head + foot), height = best.rows * th + gap * (best.rows - 1), y0 = (h - height) / 2;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / best.cols), inRow = Math.min(best.cols, n - r * best.cols), width = inRow * tw + gap * (inRow - 1);
    return { x: Math.round((w - width) / 2 + (i % best.cols) * (tw + gap)), y: Math.round(y0 + r * (th + gap)), w: tw, h: th };
  });
}

/**
 * The franchise monitor wall: every outlet at once, live, one tile each (its name, whether it is open, its quality, and
 * how many came, sit in the chairs and wait), drawn into the game's own picture so it keeps the pixel look. A tile
 * picked opens that shop on its own (`onPick`). Built from the outlet view (people and framing) and the network.
 */
export class OutletWall {
  #tiles = []; #region = '';
  /** `deps`: { THREE, el (the tiles' layer), view (OutletView), network, t (translate), region() → { x0, y0, x1, y1 } in CSS pixels, onPick(i) }. */
  constructor(deps) {
    this.deps = deps; this.on = false; this.cam = new deps.THREE.OrthographicCamera(-1, 1, 1, -1, .1, 80); this.fresh = true;
    deps.el.addEventListener('click', e => { const b = e.target.closest('[data-wall]'); if (b) deps.onPick(+b.dataset.wall); });
  }
  open(pix) { this.on = true; this.fresh = true; document.body.classList.add('wall'); this.deps.view.show(this.deps.network.outlets.map((_, i) => i)); this.layout(pix, true); }
  close() { if (!this.on) return; this.on = false; document.body.classList.remove('wall'); this.deps.el.replaceChildren(); this.#tiles = []; this.#region = ''; }
  /** Places the tiles in the free area (again when it moved or the outlets changed) and redraws their text. */
  layout(pix, force = false) {
    if (!this.on) return;
    const R = this.deps.region(), n = this.deps.network.outlets.length, key = [R.x0, R.y0, R.x1, R.y1, n, pix].map(Math.round).join(',');
    if (force || key !== this.#region) {
      this.#region = key; this.fresh = true; this.deps.view.show(this.deps.network.outlets.map((_, i) => i));
      const { head, foot } = WALL_TILE;
      this.#tiles = wallGrid(n, R.x1 - R.x0, R.y1 - R.y0).map((r, i) => {
        const x = R.x0 + r.x, y = R.y0 + r.y, view = { x: Math.round(x / pix), y: Math.round((y + head) / pix), w: Math.max(1, Math.round(r.w / pix)), h: Math.max(1, Math.round((r.h - head - foot) / pix)) };
        return { i, x, y, w: r.w, h: r.h, view };
      });
      this.deps.el.replaceChildren(...this.#tiles.map(T => { const d = document.createElement('div'); d.className = 'wtile'; d.dataset.wall = T.i; Object.assign(d.style, { left: T.x + 'px', top: T.y + 'px', width: T.w + 'px', height: T.h + 'px' }); d.innerHTML = '<div class="wt-head"></div><div class="wt-foot"></div>'; return d; }));
    }
    this.refresh();
  }
  /** The tiles' words and numbers, now. */
  refresh() {
    const { network: N, view, t } = this.deps, money = v => (v < 0 ? '−$' : '+$') + Math.abs(Math.round(v)).toLocaleString('en-US');
    this.deps.el.querySelectorAll('.wtile').forEach(d => {
      const i = +d.dataset.wall, o = N.outlets[i]; if (!o) return;
      const state = outletState(N.game, o), s = view.stats(i), r = o.last;
      d.classList.toggle('shut', state !== 'open'); d.title = t('wall.look');
      d.children[0].innerHTML = `<b>${o.format.toUpperCase()} #${o.id}</b><span class="chip">${t('wall.state.' + state)}</span><span class="sp"></span><span>${t('wall.quality', o.quality)}</span>`;
      d.children[1].textContent = state === 'open' && s ? t('wall.now', s.came, s.chair, s.wait) : r ? t('wall.last', r.day, r.arrivals, money(r.royalty - r.support)) : '';
    });
  }
  /**
   * Draws every tile into the low-resolution picture `rt` (whose height is `rt.height`): a camera per shop at the game's
   * angle (`az`, `elev`) and the sun moved over each shop so its shadows fall there too.
   */
  render(renderer, scene, rt, { az, elev, sun, background }) {
    const { THREE, view } = this.deps, cam = this.cam, H = rt.height, dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
    if (this.fresh) { rt.scissorTest = false; rt.viewport.set(0, 0, rt.width, rt.height); renderer.setRenderTarget(rt); const c = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha(); renderer.setClearColor(background, 1); renderer.clear(); renderer.setClearColor(c, a); this.fresh = false; }
    const sunAt = sun.position.clone(), aim = sun.target.position.clone();
    rt.scissorTest = true;
    for (const T of this.#tiles) {
      const v = T.view, home = view.home(T.i, true), a = v.w / v.h, vh = Math.max(8.4, 11.4 / a) * home.scale, target = new THREE.Vector3(home.x, .55, home.z);
      rt.viewport.set(v.x, H - v.y - v.h, v.w, v.h); rt.scissor.copy(rt.viewport); renderer.setRenderTarget(rt);
      Object.assign(cam, { left: -vh * a / 2, right: vh * a / 2, top: vh / 2, bottom: -vh / 2 }); cam.updateProjectionMatrix();
      cam.position.copy(target).addScaledVector(dir, 40); cam.lookAt(target); cam.updateMatrixWorld();
      sun.position.copy(sunAt).add(target).sub(aim); sun.target.position.copy(target);
      renderer.render(scene, cam);
    }
    sun.position.copy(sunAt); sun.target.position.copy(aim);
    rt.scissorTest = false; rt.viewport.set(0, 0, rt.width, rt.height); rt.scissor.set(0, 0, rt.width, rt.height);
  }
}
