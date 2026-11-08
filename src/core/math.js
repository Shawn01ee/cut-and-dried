import * as THREE from 'three';

export const $ = s => document.querySelector(s);
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const UP = V(0, 1, 0);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
export function angLerp(a, b, t) { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; }
export const fwd = y => V(Math.sin(y), 0, Math.cos(y));
export const rgt = y => V(Math.cos(y), 0, -Math.sin(y));
