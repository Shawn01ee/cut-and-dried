import { V, clamp, lerp } from '../core/math.js';

/* ================= OKLab ================= */
export const s2l=c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
export const l2s=c=>{c=clamp(c);return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;};
export function lin2lab(r,g,b){const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b),m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b),s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  return {L:0.2104542553*l+0.7936177850*m-0.0040720468*s,a:1.9779984951*l-2.4285922050*m+0.4505937099*s,b:0.0259040371*l+0.7827717662*m-0.8086757660*s};}
export function lab2lin(L,a,b){const l=(L+0.3963377774*a+0.2158037573*b)**3,m=(L-0.1055613458*a-0.0638541728*b)**3,s=(L-0.0894841775*a-1.2914855480*b)**3;
  return [clamp(4.0767416621*l-3.3077115913*m+0.2309699292*s),clamp(-1.2684380046*l+2.6097574011*m-0.3413193965*s),clamp(-0.0041960863*l-0.7034186147*m+1.7076147010*s)];}
export const hexLab=h=>lin2lab(s2l((h>>16&255)/255),s2l((h>>8&255)/255),s2l((h&255)/255));
export function labCss(l,k=1){const [r,g,b]=lab2lin(l.L*k,l.a,l.b);return `rgb(${Math.round(l2s(r)*255)},${Math.round(l2s(g)*255)},${Math.round(l2s(b)*255)})`;}
export const labMix=(x,y,t)=>({L:lerp(x.L,y.L,t),a:lerp(x.a,y.a,t),b:lerp(x.b,y.b,t)});
export const labDist=(x,y)=>Math.hypot(x.L-y.L,x.a-y.a,x.b-y.b);
export const hexCss=h=>'#'+h.toString(16).padStart(6,'0');

/* fixed 64-colour palette */
export const PAL=[0x0d0b14,0x1d1a26,0x2e2a38,0x45404f,0x5f5a68,0x7d7884,0x9c98a2,0xbdb9c0,0xdcd9dc,0xf6f3ee,0xffffff,
0x3b2219,0x6b3e2a,0x9c6644,0xc98e66,0xe7b892,0xf6d6bd,
0x16110f,0x2e1d14,0x4a2e1c,0x6e4428,0x8f5a2e,0xa8401e,0xc8642a,0xd99a4a,0xe8c27a,0xf1dfae,0xb7a99a,0x7a5d6e,
0xe25c8f,0xf2a0c0,0x8a4fc2,0xb79be8,0x2f6fd6,0x7fb6f0,0x1fa39a,0xd8314a,
0x173a24,0x24552e,0x3a7a3a,0x5f9e45,0x8fc25a,0xc4de86,0x2d4a3a,
0x0b1530,0x16264e,0x2a4478,0x4b6fa8,0x7ea2d0,0xb6d2ec,0x5a7d9a,
0xff7a3d,0xffb15a,0xffd98a,0xfff1c4,0x8a2d3b,0xc24a46,0x5a2440,
0x3a2618,0x5e3d24,0x8a6040,0xb88a5a,0x9a8f84,0x4f6b6a];
export const PAL_LAB=PAL.map(h=>{const l=hexLab(h);return V(l.L,l.a,l.b);});
export const PAL_RGB=PAL.map(h=>V((h>>16&255)/255,(h>>8&255)/255,(h&255)/255));

