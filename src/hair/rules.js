import { STR, NS } from './strands.js';
import { hexLab, labMix, labDist } from '../rendering/color.js';
import { gauss, clamp, lerp } from '../core/math.js';

/* ================= salon rules: cut, colour, wave ================= */
export const SHAPES=['Blunt','Layered','A-line','Undercut'];
export const WAVES=['Straight','Wavy','Curly','Coily'];
export function profile(shape,L){return STR.map(s=>{const z=s.z;switch(shape){case'Layered':return L*[1,.86,.72,.58][z];case'A-line':return L*[.72,.84,1,1][z];case'Undercut':return(z===1||z===2)?1.5:L*(z===3?.9:1);default:return L;}});}
export const DYES=[['Jet Black',0x1a1410],['Dark Brown',0x3b2618],['Chestnut',0x6a3f25],['Caramel',0x9a6436],['Copper',0xc25a26],['Auburn',0x8e2f1c],['Golden',0xd9ad62],['Ash',0xc9bfa4],['Platinum',0xece6dc],['Silver',0xb9b9c2],['Rose',0xe07aa0],['Violet',0x6f3fa8],['Ocean',0x2c6fb8],['Teal',0x1e9c94],['Cherry',0xb8203a],['Lilac',0xc4a8e6]].map(([n,h])=>({n,h,lab:hexLab(h)}));
export function dyeLab(a,b,mix){if(a<0&&b<0)return null;if(a<0)return DYES[b].lab;if(b<0)return DYES[a].lab;return labMix(DYES[a].lab,DYES[b].lab,mix);}
export function colourResult(base,dye,bleach){
  const b={L:Math.min(.94,base.L+bleach*.2),a:base.a*(bleach?.8:1)+.008*bleach,b:base.b*(bleach?.85:1)+.03*bleach}; // bleach lifts and turns brassy
  if(!dye)return b;
  const cap=b.L+.05,k=.45+.5*clamp((b.L-.2)/.7); // dye can't lift much; colour shows more on lighter hair
  return {L:lerp(b.L,Math.min(dye.L,cap),.92),a:lerp(b.a,dye.a,k),b:lerp(b.b,dye.b,k)};}
export const cloneHair=h=>({len:h.len.slice(),lab:{...h.lab},wave:h.wave,damage:h.damage});
export const hasColour=p=>p.doColour&&(p.dyeA>=0||p.dyeB>=0||p.bleach>0);
export function opColour(h,p,st,noise){const o=cloneHair(h);if(!hasColour(p))return o;const r=colourResult(o.lab,dyeLab(p.dyeA,p.dyeB,p.mix),p.bleach);
  if(noise){r.L+=gauss()*st.col*.6;r.a+=gauss()*st.col;r.b+=gauss()*st.col;}o.lab=r;o.damage+=p.bleach*.7+.1;return o;}
export function opWave(h,p,st,noise){const o=cloneHair(h);if(!p.doWave||Math.abs(o.wave-p.wave)<.05)return o;o.wave=clamp(p.wave+(noise?gauss()*st.wave:0),0,3.3);o.damage+=.5;return o;}
export function opCut(h,p,st,noise){const o=cloneHair(h);if(!p.doCut)return o;const pr=planProfile(p),g=noise?gauss()*st.cut*.5+st.bias:0;
  for(let j=0;j<NS;j++)o.len[j]=Math.min(o.len[j],Math.max(1,pr[j]+g+(noise?gauss()*st.cut:0)));return o;}
export const applyPlan=(h,p,st,noise)=>opCut(opWave(opColour(h,p,st,noise),p,st,noise),p,st,noise);
export function score(h,o){const tp=profile(o.shape,o.L),wf=1-.12*h.wave;let mad=0;for(let j=0;j<NS;j++)mad+=Math.abs(h.len[j]*wf-tp[j]);mad/=NS;
  const cut=clamp(1-mad/8),dE=labDist(h.lab,o.lab)*100,col=clamp(1-dE/20),wav=clamp(1-Math.abs(h.wave-o.wave)/1.5),dmg=Math.max(0,h.damage-2.2)*.07;
  return {cut,col,wav,dE,mad,dmg,all:clamp(.4*cut+.4*col+.2*wav-dmg)};}
export function aiPlan(c,st){const h=c.hair,o=c.order;
  const L=Math.round(o.L/(1-.12*o.wave)*2)/2,pr=profile(o.shape,L);
  const p={doCut:h.len.some((x,j)=>x>pr[j]+.8),shape:o.shape,L,doWave:Math.abs(h.wave-o.wave)>.3,wave:o.wave,doColour:false,dyeA:-1,dyeB:-1,mix:.5,bleach:0,zones:{front:0,side:0,back:0}};
  if(labDist(h.lab,o.lab)>.035){let best=1e9;const step=st.fine?.05:.1;
    for(let bl=0;bl<=3;bl++)for(let a=-1;a<16;a++)for(let b=-1;b<16;b++){if(b>=0&&(a<0||b<=a||st.single))continue;
      const mixes=(a>=0&&b>=0)?Array.from({length:Math.round(1/step)-1},(_,i)=>(i+1)*step):[.5];
      for(const m of mixes){const r=colourResult(h.lab,dyeLab(a,b,m),bl),e=labDist(r,o.lab)+bl*.012+(a>=0&&b>=0?.002:0);if(e<best){best=e;Object.assign(p,{dyeA:a,dyeB:b,mix:m,bleach:bl});}}}
    p.doColour=best<labDist(h.lab,o.lab)-.01;}
  return p;}


/** The cut the player designed: the base shape plus front, side and back adjustments in cm. */
export function planProfile(p){const base=profile(p.shape,p.L),z=p.zones||{};return STR.map((s,j)=>Math.max(1,base[j]+({3:z.front||0,2:z.side||0,1:z.side||0,0:z.back||0})[s.z]));}

/** A plan that changes nothing, so the player designs the look from scratch. */
export function blankPlan(hair){return {doCut:false,shape:'Blunt',L:Math.min(60,Math.round(Math.max(...hair.len)*2)/2),doWave:false,wave:Math.round(clamp(hair.wave,0,3)),doColour:false,dyeA:-1,dyeB:-1,mix:.5,bleach:0,zones:{front:0,side:0,back:0}};}
