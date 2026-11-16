import * as THREE from 'three';

/**
 * The salon's real light: a fixed pool of point lights placed on the furniture that gives light (floor lamps, the
 * mirror lights over each chair, the photo zone's ring light...). The pool never changes size, so placing furniture
 * never forces the materials to rebuild; unused lights stay dark. The brightest sources get a light first.
 */
export class LightRig {
  constructor(parent, { size = 8, range = 4.5, decay = 1.6, strength = 6 } = {}) {
    this.strength = strength; this.sources = [];
    this.lights = Array.from({ length: size }, () => { const l = new THREE.PointLight(0xffd98a, 0, range, decay); l.visible = false; parent.add(l); return l; });
  }
  /** Where the light comes from: [{ x, y, z, power, color }], strongest first. */
  sync(sources) {
    this.sources = sources.slice().sort((a, b) => b.power - a.power).slice(0, this.lights.length);
    this.lights.forEach((l, i) => { const s = this.sources[i]; l.visible = !!s; if (s) { l.position.set(s.x, s.y, s.z); l.color.setHex(s.color); } });
  }
  /** How lit the salon is (0 off, 1 full), from the time of day, the weather and whether it is open. */
  setLevel(k) { this.lights.forEach((l, i) => { const s = this.sources[i]; l.intensity = s ? k * this.strength * s.power : 0; }); }
}
