import * as THREE from 'three';
import { $, V, UP, rand, pick, clamp, lerp, smooth, angLerp, fwd, rgt } from './core/math.js';
import { lab2lin, labCss, labMix, hexCss, PAL_LAB, PAL_RGB } from './rendering/color.js';
import { STR, NS, CAP } from './hair/strands.js';
import { profile, SHAPES, WAVES, DYES, dyeLab, cloneHair, hasColour, opColour, opWave, opCut, applyPlan, score, aiPlan, blankPlan } from './hair/rules.js';
import { StylingSession } from './hair/StylingSession.js';
import { NATURAL, WANT } from './customers/catalog.js';
import { I18n } from './i18n/I18n.js';
import { DYE_KO, WANT_KO, NAT_KO } from './i18n/strings.js';
import { HOW } from './i18n/tycoonStrings.js';
import { TycoonGame } from './tycoon/TycoonGame.js';
import { BuildMode } from './building/BuildMode.js';
import { FurnitureView } from './rendering/FurnitureView.js';
import { TycoonUI } from './ui/TycoonUI.js';

const game = new TycoonGame(), i18n = new I18n(window.__lang);
const tx = (k, ...a) => i18n.t(k, ...a), nm = n => i18n.name(n);

/* ================= renderer & post ================= */
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x7ea2d0);
const world=new THREE.Group();scene.add(world);
let W=320,H=240,PIX=3,rt=null,refRT=null;
const postMat=new THREE.ShaderMaterial({
  uniforms:{tColor:{value:null},tDepth:{value:null},res:{value:new THREE.Vector2()},palLab:{value:PAL_LAB},palRgb:{value:PAL_RGB},edge:{value:0.0028}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`precision highp float;uniform sampler2D tColor,tDepth;uniform vec2 res;uniform vec3 palLab[64];uniform vec3 palRgb[64];uniform float edge;varying vec2 vUv;
  vec3 lab(vec3 c){c=max(c,vec3(1e-6));float l=pow(0.4122214708*c.r+0.5363325363*c.g+0.0514459929*c.b,1./3.);float m=pow(0.2119034982*c.r+0.6806995451*c.g+0.1073969566*c.b,1./3.);float s=pow(0.0883024619*c.r+0.2817188376*c.g+0.6299787005*c.b,1./3.);
  return vec3(0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s);}
  void main(){vec2 px=1./res;vec2 uv=(floor(vUv*res)+.5)*px;vec3 c=texture2D(tColor,uv).rgb;float d=texture2D(tDepth,uv).r;
  float n=max(max(texture2D(tDepth,uv+vec2(px.x,0.)).r,texture2D(tDepth,uv-vec2(px.x,0.)).r),max(texture2D(tDepth,uv+vec2(0.,px.y)).r,texture2D(tDepth,uv-vec2(0.,px.y)).r));
  if(n-d>edge)c*=.3;vec3 q=lab(c);float bd=1e9;vec3 o=vec3(0.);
  for(int i=0;i<64;i++){vec3 e=palLab[i]-q;e.x*=1.35;float dd=dot(e,e);if(dd<bd){bd=dd;o=palRgb[i];}}
  gl_FragColor=vec4(o,1.);}`,
  depthTest:false,depthWrite:false});
const post=new THREE.Scene();const pq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat);pq.frustumCulled=false;post.add(pq);
const postCam=new THREE.Camera();

function resize(){
  const vw=innerWidth,vh=innerHeight;
  PIX=Math.max(2,Math.round(Math.min(vw,vh)/250));
  W=Math.floor(vw/PIX);H=Math.floor(vh/PIX);
  renderer.setSize(W*PIX,H*PIX);
  rt&&rt.dispose();refRT&&refRT.dispose();
  const o={type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter};
  rt=new THREE.WebGLRenderTarget(W,H,o);rt.depthTexture=new THREE.DepthTexture(W,H);rt.depthTexture.type=THREE.UnsignedIntType;
  refRT=new THREE.WebGLRenderTarget(W,H,o);
  postMat.uniforms.tColor.value=rt.texture;postMat.uniforms.tDepth.value=rt.depthTexture;postMat.uniforms.res.value.set(W,H);
  puddleMat.uniforms.tRefl.value=refRT.texture;puddleMat.uniforms.res.value.set(W,H);
}

/* ================= camera ================= */
const cam=new THREE.OrthographicCamera(-1,1,1,-1,0.1,80);
let camK=0,camAz=Math.PI/4,zoom=1;const EL=Math.atan(1/Math.SQRT2);const camTarget=V(0,.55,1.2);
let camBlend=0;const camHome=V(0,.55,1.2),camClose=V();
function updateCam(dt){
  const goal=Math.PI/4+camK*Math.PI/2;camAz+=(goal-camAz)*Math.min(1,dt*9);if(Math.abs(goal-camAz)<1e-3)camAz=goal;
  camBlend+=((styling?1:0)-camBlend)*Math.min(1,dt*6);if(Math.abs((styling?1:0)-camBlend)<.002)camBlend=styling?1:0;camTarget.copy(camHome).lerp(camClose,camBlend);
  const a=W/H,vh=lerp(Math.max(10.8,12.8/a)/zoom,Math.max(2.6,1.7/a),camBlend);
  cam.left=-vh*a/2;cam.right=vh*a/2;cam.top=vh/2;cam.bottom=-vh/2;cam.updateProjectionMatrix();
  cam.position.copy(camTarget).add(V(Math.sin(camAz)*Math.cos(EL),Math.sin(EL),Math.cos(camAz)*Math.cos(EL)).multiplyScalar(40));
  cam.lookAt(camTarget);cam.updateMatrixWorld();
  const u=vh/H,r=V().setFromMatrixColumn(cam.matrixWorld,0),up=V().setFromMatrixColumn(cam.matrixWorld,1);
  const x=cam.position.dot(r),y=cam.position.dot(up);
  cam.position.addScaledVector(r,Math.round(x/u)*u-x).addScaledVector(up,Math.round(y/u)*u-y);cam.updateMatrixWorld();
}

/* ================= materials & builders ================= */
const BOX=new THREE.BoxGeometry(1,1,1);
const MC={};const M=h=>MC[h]||(MC[h]=new THREE.MeshLambertMaterial({color:h}));
const VCMAT=new THREE.MeshLambertMaterial({vertexColors:true});
const GLASS=new THREE.MeshLambertMaterial({color:0x7fb6f0,transparent:true,opacity:0.45,emissive:0xffd98a,emissiveIntensity:0});
const LAMP=new THREE.MeshLambertMaterial({color:0xfff1c4,emissive:0xffd98a,emissiveIntensity:0});
const HAIRMAT=new THREE.MeshLambertMaterial({color:0xffffff});
const noRay=()=>{};
class SB{constructor(){this.p=[];this.n=[];this.c=[];}
  add(g,hex){g=g.index?g.toNonIndexed():g;g.computeVertexNormals();const c=new THREE.Color(hex),p=g.attributes.position.array,n=g.attributes.normal.array;
    for(let i=0;i<p.length;i+=3){this.p.push(p[i],p[i+1],p[i+2]);this.n.push(n[i],n[i+1],n[i+2]);this.c.push(c.r,c.g,c.b);}g.dispose();return this;}
  box(w,h,d,hex,x,y,z,ry=0){const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);return this.add(g,hex);}
  build(par=world,cast=true){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    const m=new THREE.Mesh(g,VCMAT);m.castShadow=cast;m.receiveShadow=true;par.add(m);return m;}}
function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');draw(g,cv);const t=new THREE.CanvasTexture(cv);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.userData={g,cv,draw};return t;}

/* ================= lights ================= */
const hemi=new THREE.HemisphereLight(0xb6d2ec,0x5f9e45,1);world.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1c4,2.8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-9.5,right:9.5,top:9.5,bottom:-9.5,near:1,far:70});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.03;
world.add(sun);world.add(sun.target);
const inLights=[V(-1.6,2.4,-0.6),V(2,2.4,0.6)].map(p=>{const l=new THREE.PointLight(0xffd98a,0,8,1.5);l.position.copy(p);world.add(l);return l;});
const spots=[[V(-3.7,3.3,4.5),V(-1.8,0,3.4)],[V(4.3,3.3,3.7),V(2.6,0,4.7)],[V(-3.7,3.3,4.5),V(-.2,0,5)]].map(([p,t])=>{const s=new THREE.SpotLight(0xfff1c4,0,11,0.5,0,1);s.position.copy(p);s.target.position.copy(t);world.add(s);world.add(s.target);return s;});

/* ================= build world ================= */
const S=new SB();
// base slab and the pavement in front of the door
S.box(9.0,.5,9.6,0x45404f,0,-.27,1.4);
for(let i=0;i<18;i++)for(let j=0;j<6;j++)S.box(.5,.06,.5,pick((i+j)%2?[0x9a8f84,0x9c98a2]:[0xb7a99a,0xbdb9c0]),-4.25+i*.5,-.02,3.45+j*.5);
// salon floor
for(let i=0;i<16;i++)for(let j=0;j<12;j++)S.box(.5,.06,.5,(i+j)%2?0x2e2a38:0xdcd9dc,-3.75+i*.5,-.02,-2.75+j*.5);
// stations
const STX=[-2.4,-0.4,1.6];
const stationGroups=STX.map(()=>{const g=new THREE.Group();world.add(g);return g;});
STX.forEach((x,i)=>{const S=new SB();
  S.box(1.4,.85,.4,0xf6f3ee,x,.425,-2.75).box(1.42,.04,.42,0x3a2618,x,.87,-2.75);
  S.box(.95,1.15,.04,0x3a2618,x,1.55,-2.98).box(.85,1.05,.03,0xb6d2ec,x,1.55,-2.955);
  S.box(.12,.12,.15,0x2f6fd6,x-.4,.95,-2.75).box(.08,.18,.08,0xe25c8f,x+.45,.98,-2.8).box(.1,.1,.1,0xffd98a,x+.25,.94,-2.72);
  S.box(.42,.08,.42,0x45404f,x,.04,-1.8).box(.12,.4,.12,0xbdb9c0,x,.28,-1.8).box(.52,.12,.5,0x1d1a26,x,.55,-1.8).box(.5,.3,.08,0x1d1a26,x,.76,-1.53);
  S.box(.06,.06,.42,0x1d1a26,x-.26,.72,-1.8).box(.06,.06,.42,0x1d1a26,x+.26,.72,-1.8).box(.4,.04,.16,0xbdb9c0,x,.14,-2.25).box(.03,.42,.03,0xbdb9c0,x,.35,-2.1);
  S.box(.32,.04,.32,0x5f5a68,x+.72,.62,-1.85).box(.32,.04,.32,0x5f5a68,x+.72,.32,-1.85).box(.04,.62,.04,0xbdb9c0,x+.72,.31,-1.85).box(.1,.06,.1,0x8a4fc2,x+.66,.67,-1.85).box(.1,.06,.1,0xc8642a,x+.79,.67,-1.8);
  S.build(stationGroups[i]);
});
// basin, dryer, desk, bench, shelves, plants, rug
S.box(.7,.85,.7,0xdcd9dc,3.65,.425,-1.6).box(.6,.12,.55,0xbdb9c0,3.6,.91,-1.6).box(.5,.08,.45,0x7d7884,3.6,.96,-1.6).box(.06,.25,.06,0xbdb9c0,3.85,1.08,-1.6);
S.box(.5,.1,.6,0x1d1a26,3.05,.5,-1.6).box(.12,.5,.6,0x1d1a26,3.3,.72,-1.6,0).box(.3,.45,.3,0x45404f,3.0,.22,-1.6);
S.box(.55,.1,.55,0xd8314a,-3.45,.5,-2.3).box(.55,.5,.08,0xd8314a,-3.45,.78,-2.56).box(.12,.45,.12,0xbdb9c0,-3.45,.25,-2.3).box(.12,1.2,.12,0xbdb9c0,-3.72,1.0,-2.62).box(.56,.42,.56,0xf2a0c0,-3.45,1.55,-2.3);
S.box(.6,1.05,1.5,0x8a6040,-3.15,.525,1.0).box(.66,.05,1.56,0x3a2618,-3.15,1.07,1.0).box(.2,.06,.2,0x45404f,-3.25,1.12,.6).box(.08,.25,.06,0x2f6fd6,-3.3,1.2,1.3);
S.box(.3,.06,.3,0x1d1a26,-3.6,.72,1.0).box(.06,.72,.06,0xbdb9c0,-3.6,.36,1.0);
S.box(1.9,.08,.46,0x5e3d24,2.6,.44,2.5).box(1.9,.5,.08,0x5e3d24,2.6,.75,2.76);[1.75,3.45].forEach(x=>S.box(.08,.42,.4,0x3a2618,x,.21,2.5));
S.box(2.2,.02,1.1,0xc24a46,2.6,.015,1.55).box(1.9,.02,.8,0xffb15a,2.6,.02,1.55);
for(let k=0;k<3;k++){S.box(.25,.04,.9,0x8a6040,-3.85,.9+k*.45,2.45);for(let i=0;i<4;i++)S.box(.12,.2,.12,pick([0x2f6fd6,0xe25c8f,0x1fa39a,0xffd98a,0xd8314a,0xf6f3ee]),-3.82,1.02+k*.45,2.1+i*.22);}
[[3.7,2.7],[-0.9,-2.75],[0.6,2.75]].forEach(([x,z])=>{S.box(.32,.38,.32,0xb88a5a,x,.19,z);S.box(.36,.5,.36,0x3a7a3a,x,.62,z).box(.24,.3,.24,0x5f9e45,x,.98,z);});
S.box(.9,.02,.5,0x1fa39a,-2,.015,2.55);
// lamp posts
[[-3.7,4.5],[4.3,3.7]].forEach(([x,z])=>{S.box(.14,3.3,.14,0x1d1a26,x,1.65,z).box(.3,.08,.3,0x1d1a26,x,3.32,z);});
// side bench, clock post and barber pole base
S.box(.46,.08,1.4,0x5e3d24,3.55,.44,.475).box(.08,.5,1.4,0x5e3d24,3.82,.75,.475);[-.15,1.1].forEach(z=>S.box(.4,.42,.08,0x3a2618,3.55,.21,z));
S.box(.12,2.6,.12,0x1d1a26,2.7,1.3,5.7).box(.5,.5,.2,0x1d1a26,2.7,2.85,5.7);
S.box(.24,.16,.24,0x45404f,-1.2,.08,3.4).box(.18,.12,.18,0xbdb9c0,-1.2,1.72,3.4).box(.18,.12,.18,0xbdb9c0,-1.2,.2,3.4);
S.build();

// lamp heads (emissive)
[[-3.7,4.5],[4.3,3.7]].forEach(([x,z])=>{const m=new THREE.Mesh(BOX,LAMP);m.scale.set(.22,.12,.22);m.position.set(x,3.22,z);world.add(m);});
STX.forEach((x,i)=>{const m=new THREE.Mesh(BOX,LAMP);m.scale.set(.85,.05,.05);m.position.set(x,2.12,-2.94);stationGroups[i].add(m);});

/* walls with cutaway */
const WALLC=0xf1dfae,SKIRT=0x8a6040;
function makeWall(along,c,segs,n){
  const full=new SB(),low=new SB(),glass=[];
  segs.forEach(([a,b,t])=>{const L=b-a,m=(a+b)/2;
    const put=(sb,y0,y1,col,th=.16)=>{const h=y1-y0;if(along==='x')sb.box(L,h,th,col,m,y0+h/2,c);else sb.box(th,h,L,col,c,y0+h/2,m);};
    if(t==='s'){put(full,0,2.6,WALLC);put(low,0,.32,WALLC);}
    if(t==='w'){put(full,0,.85,WALLC);put(full,2.15,2.6,WALLC);put(full,.82,.88,0x5e3d24,.2);put(full,2.12,2.18,0x5e3d24,.2);put(low,0,.32,WALLC);glass.push([L,m]);}
    if(t==='d'){put(full,2.25,2.6,WALLC);put(full,2.22,2.27,0x5e3d24,.2);}
    if(t!=='d'){put(full,0,.18,SKIRT,.2);put(low,0,.18,SKIRT,.2);}
  });
  const gF=new THREE.Group(),gL=new THREE.Group();world.add(gF);world.add(gL);full.build(gF);low.build(gL);
  glass.forEach(([L,m])=>{const g=new THREE.Mesh(BOX,GLASS);if(along==='x'){g.scale.set(L,1.24,.04);g.position.set(m,1.5,c);}else{g.scale.set(.04,1.24,L);g.position.set(c,1.5,m);}gF.add(g);});
  return {n,full:gF,low:gL};
}
const walls=[
  makeWall('x',-3.08,[[-4.16,4.16,'s']],V(0,0,-1)),
  makeWall('x',3.08,[[-4.16,-2.5,'s'],[-2.5,-1.5,'d'],[-1.5,-0.6,'s'],[-0.6,3.4,'w'],[3.4,4.16,'s']],V(0,0,1)),
  makeWall('z',-4.08,[[-3,-1.6,'s'],[-1.6,0.2,'w'],[0.2,3,'s']],V(-1,0,0)),
  makeWall('z',4.08,[[-3,-0.4,'s'],[-0.4,1.6,'w'],[1.6,3,'s']],V(1,0,0)),
];
// sign on back wall
const signTex=canvasTex(96,16,g=>{g.fillStyle='#1d1a26';g.fillRect(0,0,96,16);g.fillStyle='#ffd98a';g.font='bold 11px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('CUT & DRIED',48,9);g.fillStyle='#e25c8f';g.fillRect(2,2,92,1);g.fillRect(2,13,92,1);});
{const sb=new SB();sb.box(3.4,.7,.12,0x1d1a26,0,2.95,-3.08);sb.box(.08,.4,.08,0x1d1a26,-1.2,2.6,-3.08).box(.08,.4,.08,0x1d1a26,1.2,2.6,-3.08);sb.build(walls[0].full);
 const p=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.6),new THREE.MeshBasicMaterial({map:signTex}));p.position.set(0,2.95,-3.01);walls[0].full.add(p);
 }
// awning on front wall
const awning=new THREE.Group();awning.position.set(1.4,2.42,3.16);walls[1].full.add(awning);
for(let i=0;i<10;i++){const m=new THREE.Mesh(BOX,M(i%2?0xf6f3ee:0xc24a46));m.scale.set(.4,.05,1);m.position.set(-1.8+i*.4,0,.5);m.castShadow=true;awning.add(m);}
awning.rotation.x=0.38;
// clock
const clockTex=canvasTex(20,20,g=>{});
function drawClock(){const g=clockTex.userData.g;const d=new Date();g.fillStyle='#1d1a26';g.fillRect(0,0,20,20);g.fillStyle='#f6f3ee';
  for(let y=0;y<20;y++)for(let x=0;x<20;x++){const r=Math.hypot(x-9.5,y-9.5);if(r<8.6)g.fillRect(x,y,1,1);}
  g.fillStyle='#1d1a26';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.fillRect(Math.round(9.5+Math.sin(a)*7.4-.5),Math.round(9.5-Math.cos(a)*7.4-.5),1,1);}
  const hand=(a,L,c)=>{g.fillStyle=c;for(let t=0;t<=L;t+=.4)g.fillRect(Math.floor(9.5+Math.sin(a)*t),Math.floor(9.5-Math.cos(a)*t),1,1);};
  const h=d.getHours()%12+d.getMinutes()/60,mi=d.getMinutes()+d.getSeconds()/60;
  hand(h/12*Math.PI*2,4.2,'#1d1a26');hand(mi/60*Math.PI*2,6.6,'#1d1a26');hand(d.getSeconds()/60*Math.PI*2,6.8,'#c24a46');clockTex.needsUpdate=true;}
drawClock();
[0,Math.PI].forEach(r=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(.44,.44),new THREE.MeshBasicMaterial({map:clockTex}));p.position.set(2.7,2.85,5.7+(r?-.105:.105));p.rotation.y=r;world.add(p);});
// barber pole
const poleTex=canvasTex(8,16,g=>{for(let y=0;y<16;y++)for(let x=0;x<8;x++){const k=((x+y)%12);g.fillStyle=k<4?'#d8314a':k<6?'#f6f3ee':k<10?'#2f6fd6':'#f6f3ee';g.fillRect(x,y,1,1);}});
poleTex.wrapS=poleTex.wrapT=THREE.RepeatWrapping;poleTex.repeat.set(1,2);
{const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.4,6),new THREE.MeshLambertMaterial({map:poleTex}));p.position.set(-1.2,.96,3.4);p.castShadow=true;world.add(p);}
// wet floor sign
const wetSign=new THREE.Group();{const sb=new SB();sb.box(.32,.5,.04,0xffd98a,0,.25,.08,0).box(.32,.5,.04,0xffd98a,0,.25,-.08).box(.2,.08,.05,0x1d1a26,0,.3,.11);sb.build(wetSign);}
wetSign.position.set(-1.4,0,2.1);wetSign.visible=false;world.add(wetSign);
// selection marker
const marker=new THREE.Mesh(new THREE.ConeGeometry(.16,.32,4),M(0xffd98a));marker.rotation.x=Math.PI;world.add(marker);marker.raycast=noRay;

/* puddles & rain (outside the mirrored world group) */
const puddleMat=new THREE.ShaderMaterial({uniforms:{tRefl:{value:null},res:{value:new THREE.Vector2()},time:{value:0},wet:{value:0},tint:{value:new THREE.Color(0x2a4478)}},transparent:true,depthWrite:false,
  vertexShader:`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tRefl;uniform vec2 res;uniform float time,wet;uniform vec3 tint;varying vec2 vP;
  void main(){vec2 uv=gl_FragCoord.xy/res;float rp=sin(vP.x*16.+time*3.)*sin(vP.y*15.-time*2.6);uv.x+=rp*.004;vec3 r=texture2D(tRefl,uv).rgb;gl_FragColor=vec4(mix(tint*.4,r,.78),clamp(wet*1.5,0.,.95));}`});
const puddles=new THREE.Group();scene.add(puddles);
[[-0.8,5.4,.55],[1.5,5.3,.4],[-3.2,5.3,.42],[3.5,4.0,.32],[.8,3.8,.3],[-3.5,3.75,.28]].forEach(([x,z,r])=>{const m=new THREE.Mesh(new THREE.CircleGeometry(r,7).rotateX(-Math.PI/2),puddleMat);m.position.set(x,.03,z);m.userData.r=1;m.raycast=noRay;puddles.add(m);});
const rainXZ=()=>[rand(-4.5,4.5),rand(3.3,6.2)];
const NR=260,rainPos=new Float32Array(NR*6);for(let i=0;i<NR;i++){const [x,z]=rainXZ(),y=rand(0,7);rainPos.set([x,y,z,x-.05,y+.45,z],i*6);}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xb6d2ec,depthWrite:false,transparent:true,opacity:.8}));rain.frustumCulled=false;rain.raycast=noRay;scene.add(rain);

/* clippings & footprints */
const NC=900,clipMesh=new THREE.InstancedMesh(BOX,HAIRMAT,NC);clipMesh.frustumCulled=false;clipMesh.raycast=noRay;clipMesh.count=0;world.add(clipMesh);
const clips=[];let clipHead=0;const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_s=V(),_c=new THREE.Color();
for(let i=0;i<NC;i++){clipMesh.setColorAt(i,_c.set(0));}
function spawnClip(p,lab){const [r,g,b]=lab2lin(lab.L,lab.a,lab.b);const o={p:p.clone(),v:V(rand(-.25,.25),rand(0,.3),rand(-.25,.25)),landed:false,alive:true,ry:rand(0,3)};
  if(clips.length<NC)clips.push(o);else{clips[clipHead]=o;clipHead=(clipHead+1)%NC;}const i=clips.indexOf(o);clipMesh.setColorAt(i,_c.setRGB(r,g,b,THREE.LinearSRGBColorSpace));clipMesh.instanceColor.needsUpdate=true;}
const NF=140,fpMesh=new THREE.InstancedMesh(BOX,M(0x7d7884),NF);fpMesh.frustumCulled=false;fpMesh.raycast=noRay;fpMesh.count=0;world.add(fpMesh);
const prints=[];
function spawnPrint(p,yaw){if(prints.length>=NF)prints.shift();prints.push({p:p.clone(),yaw,life:1});}

/* ================= figures ================= */
function bone(m,a,b,w){m.position.copy(a).add(b).multiplyScalar(.5);const d=b.clone().sub(a),L=d.length()||1;m.quaternion.setFromUnitVectors(UP,d.divideScalar(L));m.scale.set(w,L+.02,w);}
function ik(a,t,l1,l2,pole){const d=t.clone().sub(a);let L=d.length();const mx=l1+l2-.002;if(L>mx){L=mx;}if(L<.06)L=.06;const dir=d.normalize();
  const c=clamp((l1*l1+L*L-l2*l2)/(2*l1*L),-1,1),sn=Math.sqrt(1-c*c);const p=pole.clone().addScaledVector(dir,-pole.dot(dir));if(p.lengthSq()<1e-6)p.set(0,1,0);p.normalize();
  return [a.clone().addScaledVector(dir,l1*c).addScaledVector(p,l1*sn),a.clone().addScaledVector(dir,L)];}
const figs=[];
function setFade(f,s){f.root.scale.setScalar(s);f.root.position.copy(f.pos).multiplyScalar(1-s);}
class Fig{
  constructor(o){this.o=o;this.root=new THREE.Group();world.add(this.root);
    const add=h=>{const m=new THREE.Mesh(BOX,M(h));m.castShadow=true;m.receiveShadow=true;m.userData.fig=this;this.root.add(m);return m;};
    this.pelvis=add(o.pants);this.torso=add(o.shirt);
    const sleeve=o.sleeveless?o.skin:o.shirt;this.uaL=add(sleeve);this.uaR=add(sleeve);this.faL=add(o.skin);this.faR=add(o.skin);
    this.thL=add(o.pants);this.thR=add(o.pants);this.shL=add(o.pants);this.shR=add(o.pants);this.ftL=add(0x1d1a26);this.ftR=add(0x1d1a26);
    if(o.apron){this.apron=add(o.apron);}
    this.head=new THREE.Group();this.root.add(this.head);
    const hb=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(BOX,M(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.userData.fig=this;this.head.add(m);return m;};
    hb(.24,.27,.25,o.skin,0,0,0);hb(.035,.035,.01,0x1d1a26,-.055,.01,.126);hb(.035,.035,.01,0x1d1a26,.055,.01,.126);hb(.05,.02,.01,0x8a2d3b,0,-.07,.126);
    if(o.staffHair!=null){const c=o.staffHair;hb(.27,.08,.28,c,0,.14,-.005);hb(.27,.2,.06,c,0,.03,-.125);hb(.03,.14,.2,c,-.13,.06,-.03);hb(.03,.14,.2,c,.13,.06,-.03);
      if(o.long)hb(.25,.32,.05,c,0,-.18,-.14);if(o.bun)hb(.12,.12,.12,c,0,.2,-.12);
      if(o.bob){hb(.05,.27,.2,c,-.135,-.035,-.02);hb(.05,.27,.2,c,.135,-.035,-.02);hb(.29,.27,.06,c,0,-.035,-.135);hb(.05,.22,.02,c,-.1,.02,.132);hb(.04,.17,.02,c,.1,.045,.132);hb(.1,.045,.02,c,-.06,.098,.132);}}
    this.tool=new THREE.Group();this.root.add(this.tool);this.toolKind=null;
    this.umb=new THREE.Group();{const s=new THREE.Mesh(BOX,M(0x1d1a26));s.scale.set(.025,.85,.025);s.position.y=.4;this.umb.add(s);const c=new THREE.Mesh(new THREE.ConeGeometry(.55,.24,6),M(pick([0xd8314a,0x2f6fd6,0xffd98a,0x1fa39a,0x8a4fc2])));c.position.y=.85;c.castShadow=true;this.umb.add(c);}
    this.umb.visible=false;this.root.add(this.umb);
    this.pos=V();this.yaw=0;this.mode='stand';this.path=[];this.cb=null;this.phase=rand(0,6);this.seatH=.5;this.footY=.06;this.tilt=0;this.look=0;
    this.handL=null;this.handR=null;this.clapT=0;this.toolAim=null;this.spd=1.25;this.wetFeet=0;this.lastStep=0;figs.push(this);}
  setTool(k){if(this.toolKind===k)return;this.toolKind=k;this.tool.clear();if(!k)return;
    const b=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(BOX,M(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;this.tool.add(m);};
    if(k==='scissors'){b(.014,.14,.01,0xdcd9dc,-.012,.08,0);b(.014,.14,.01,0xdcd9dc,.012,.08,0);b(.055,.03,.016,0xd8314a,0,.01,0);}
    if(k==='comb')b(.022,.15,.008,0x1d1a26,0,.08,0);
    if(k==='brush'){b(.02,.17,.02,0x1d1a26,0,.08,0);b(.04,.05,.03,0x8a4fc2,0,.18,0);}
    if(k==='dryer'){b(.05,.1,.05,0x1d1a26,0,.04,0);b(.08,.08,.22,0xe25c8f,0,.11,.07);}
    if(k==='broom'){b(.03,1.0,.03,0x8a6040,0,.48,0);b(.34,.1,.08,0xe8c27a,0,.98,0);}
    if(k==='mop'){b(.03,1.0,.03,0x2f6fd6,0,.48,0);b(.3,.08,.16,0xdcd9dc,0,.98,0);}
    if(k==='bowl'){b(.13,.06,.13,0x1d1a26,0,.02,.04);}}
  walkTo(pts,cb){this.path=pts.map(p=>p.clone());this.cb=cb||null;if(this.mode==='sit')this.mode='stand';}
  remove(){world.remove(this.root);figs.splice(figs.indexOf(this),1);}
  update(dt){
    let moving=false;
    if(this.path.length){const t=this.path[0],d=V(t.x-this.pos.x,0,t.z-this.pos.z),L=d.length(),st=this.spd*dt;
      if(L<=st){this.pos.set(t.x,0,t.z);this.path.shift();if(!this.path.length){this.mode='stand';const cb=this.cb;this.cb=null;cb&&cb();}}
      else{this.pos.addScaledVector(d,st/L);this.yaw=angLerp(this.yaw,Math.atan2(d.x,d.z),Math.min(1,dt*10));moving=true;}}
    if(moving){this.mode='walk';this.phase+=dt*this.spd*5.4;
      const inside=Math.abs(this.pos.x)<4&&Math.abs(this.pos.z)<3;if(!inside&&rainAmt>.4)this.wetFeet=8;
      if(inside&&this.wetFeet>0){this.wetFeet-=dt;const k=Math.floor(this.phase/Math.PI);if(k!==this.lastStep){this.lastStep=k;spawnPrint(this.pos.clone().addScaledVector(rgt(this.yaw),k%2?.1:-.1),this.yaw);}}}
    else if(this.mode==='walk')this.mode='stand';
    this.pose(dt);}
  pose(dt){
    const f=fwd(this.yaw),r=rgt(this.yaw),sit=this.mode==='sit',walk=this.mode==='walk';
    const hips=sit?V(this.pos.x,this.seatH+.1,this.pos.z).addScaledVector(f,.03):V(this.pos.x,.9+(walk?Math.abs(Math.cos(this.phase))*.035:0),this.pos.z);
    const s=UP.clone().multiplyScalar(Math.cos(this.tilt)).addScaledVector(f,Math.sin(this.tilt)).normalize();
    const fz=V().crossVectors(r,s);const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r,s,fz));
    this.pelvis.position.copy(hips);this.pelvis.quaternion.copy(q);this.pelvis.scale.set(.34,.16,.21);
    this.torso.position.copy(hips).addScaledVector(s,.31);this.torso.quaternion.copy(q);this.torso.scale.set(.38,.44,.22);
    if(this.apron){this.apron.position.copy(hips).addScaledVector(s,.12).addScaledVector(fz,.115);this.apron.quaternion.copy(q);this.apron.scale.set(.32,.5,.02);}
    this.head.position.copy(hips).addScaledVector(s,.69);this.head.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(UP,this.look));
    for(const sd of [-1,1]){const hj=hips.clone().addScaledVector(r,sd*.1).addScaledVector(s,-.05);let foot;
      if(sit)foot=V(this.pos.x,this.footY,this.pos.z).addScaledVector(f,.46).addScaledVector(r,sd*.12);
      else{const ph=this.phase+(sd>0?Math.PI:0);foot=V(this.pos.x,.07+(walk?Math.max(0,Math.cos(ph))*.1:0),this.pos.z).addScaledVector(f,walk?Math.sin(ph)*.22:0).addScaledVector(r,sd*.11);}
      const [kn,an]=ik(hj,foot,.42,.42,f);bone(sd<0?this.thL:this.thR,hj,kn,.15);bone(sd<0?this.shL:this.shR,kn,an,.12);
      const ft=sd<0?this.ftL:this.ftR;ft.position.copy(an).addScaledVector(f,.05);ft.position.y=Math.max(.035,an.y-.03);ft.quaternion.setFromAxisAngle(UP,this.yaw);ft.scale.set(.12,.07,.25);}
    const chest=hips.clone().addScaledVector(s,.48);
    const outside=!(Math.abs(this.pos.x)<4.1&&Math.abs(this.pos.z)<3.1)&&!(this.pos.x>4.4&&this.pos.z>-1.6&&this.pos.z<3);
    this.umb.visible=rainAmt>.45&&outside&&!sit;
    for(const sd of [-1,1]){const sh=chest.clone().addScaledVector(r,sd*.23);let tg=sd<0?this.handL:this.handR;
      if(this.clapT>0){const k=Math.abs(Math.sin(this.clapT*18));tg=chest.clone().addScaledVector(fz,.3).addScaledVector(s,.02).addScaledVector(r,sd*(.02+.07*k));}
      else if(!tg){if(sd>0&&this.umb.visible)tg=sh.clone().addScaledVector(UP,.05).addScaledVector(f,.28).addScaledVector(r,-.08);
        else if(sit)tg=hips.clone().addScaledVector(f,.3).addScaledVector(r,sd*.15).addScaledVector(UP,.1);
        else{const ph=this.phase+(sd<0?Math.PI:0);tg=sh.clone().addScaledVector(UP,-.53).addScaledVector(f,walk?Math.sin(ph)*.16:.03).addScaledVector(r,sd*.05);}}
      const pole=f.clone().multiplyScalar(-1).addScaledVector(r,sd*.7).addScaledVector(UP,-.6);
      const [el,hd]=ik(sh,tg,.29,.28,pole);bone(sd<0?this.uaL:this.uaR,sh,el,.11);bone(sd<0?this.faL:this.faR,el,hd,.09);
      if(sd>0){this.tool.position.copy(hd);const dir=this.toolAim?this.toolAim.clone().sub(hd).normalize():hd.clone().sub(el).normalize();this.tool.quaternion.setFromUnitVectors(UP,dir);
        if(this.umb.visible){this.umb.position.copy(hd).add(V(0,-.25,0));this.umb.quaternion.identity();}}}
    if(this.clapT>0)this.clapT-=dt;}
}

/* ================= hair ================= */
class Hair{
  constructor(head,fig){this.mesh=new THREE.InstancedMesh(BOX,HAIRMAT,CAP.length+NS*17);this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;this.mesh.raycast=noRay;head.add(this.mesh);this.head=head;this.ends=STR.map(()=>V());this.dirty=true;
    this.var=[];for(let i=0;i<CAP.length+NS*17;i++)this.var.push(rand(-.06,.06));}
  build(h,tint,ta){
    const lab=ta>0?labMix(h.lab,tint,ta):h.lab,[r,g,b]=lab2lin(lab.L,lab.a,lab.b),w=h.wave,cs=.052,mm=this.mesh;let i=0;
    const put=(p,sx,sy,sz,shade)=>{_m4.compose(p,_q.identity(),_s.set(sx,sy,sz));mm.setMatrixAt(i,_m4);const f=1+shade+this.var[i];mm.setColorAt(i,_c.setRGB(clamp(r*f),clamp(g*f),clamp(b*f),THREE.LinearSRGBColorSpace));i++;};
    let side=0,ns=0;STR.forEach((s,j)=>{if(s.z===2){side+=h.len[j];ns++;}});side/=ns;
    const puff=1+.12*w;
    CAP.forEach(c=>{const p=c.p.clone();if(c.z===2){const k=clamp(side/4,.35,1);p.x+=Math.sign(p.x)*(.01*w-(1-k)*.012);put(p,cs*puff*k,cs*puff,cs*puff,.04);}else{p.addScaledVector(c.p.clone().normalize(),.008*w);put(p,cs*puff,cs*puff,cs*puff,.06);}});
    STR.forEach((s,j)=>{const vis=h.len[j]*(1-.12*w),n=vis/4.2,cnt=Math.min(17,Math.ceil(n)),t=V().crossVectors(UP,s.n);
      this.ends[j].copy(s.p);
      for(let k=0;k<cnt;k++){const fr=Math.min(1,n-k),amp=.013*w*Math.min(1,.4+k*.15),ph=k*(.9+.35*w)+j*1.7;
        const out=.006*Math.min(k,5)+.012*w+(s.z===2?Math.min(k,4)*.01:0);
        const p=s.p.clone().addScaledVector(s.n,out+amp*Math.sin(ph)).addScaledVector(t,amp*Math.cos(ph)*(w>1.5?1:.25));p.y=s.p.y-cs*.88*k-cs*fr*.5;
        put(p,cs*(1+.1*w),cs*fr*1.04,cs*(1+.1*w),-k*.018);this.ends[j].copy(p);this.ends[j].y-=cs*fr*.5;}});
    mm.count=i;mm.instanceMatrix.needsUpdate=true;if(mm.instanceColor)mm.instanceColor.needsUpdate=true;this.dirty=false;}
  endWorld(j){this.head.updateMatrixWorld(true);return this.head.localToWorld(this.ends[j].clone());}
}

/* ================= people ================= */
const SKINS=[0x6b3e2a,0x9c6644,0xc98e66,0xe7b892,0xf6d6bd,0x3b2219];
const SHIRTS=[0xd8314a,0x2f6fd6,0x1fa39a,0xffb15a,0x8a4fc2,0x5f9e45,0xf2a0c0,0x7fb6f0,0xc24a46,0xe8c27a,0xdcd9dc];
const PANTS=[0x1d1a26,0x2a4478,0x45404f,0x5e3d24,0x16264e];
const STY=game.staff.candidates,OWNER=game.staff.owner;
const stations=STX.map((x,i)=>({i,x,chair:V(x,0,-1.8),stand:V(x,0,-1.2),sty:STY[i],cust:null,state:'free',plan:null,ops:[],opi:0,timer:0,touched:false}));
stations.forEach(st=>{const s=st.sty;s.fig=new Fig({skin:pick(SKINS),shirt:0x45404f,pants:0x2e2a38,apron:s.apron,staffHair:s.hair,long:s.long});s.fig.pos.copy(st.stand);s.fig.yaw=Math.PI;});
OWNER.fig=new Fig({skin:0xf6d6bd,shirt:0xdcd9dc,pants:0x1d1a26,staffHair:OWNER.hair,bob:true,sleeveless:true});
const VAC={name:'Vacant',style:'Vacant',apron:0x5f5a68,spd:1,stats:{served:0,sum:0,earn:0}},OWNER_IDLE=V(-1.2,0,.4);
STY.forEach(s=>{s.fig.root.visible=false;});
stations.forEach((st,i)=>{if(i===0){st.sty=OWNER;OWNER.fig.pos.copy(st.stand);OWNER.fig.yaw=Math.PI;}else{st.sty=VAC;st.vacant=true;st.state='vacant';}});
const recep=new Fig({skin:0xc98e66,shirt:0x8a4fc2,pants:0x1d1a26,staffHair:0x2e1d14,bun:true});recep.pos.set(-3.6,0,1.0);recep.yaw=Math.PI/2;recep.mode='sit';recep.seatH=.72;recep.footY=.3;
const jr={fig:new Fig({skin:0xe7b892,shirt:0xffb15a,pants:0x2a4478,apron:0x5f9e45,staffHair:0x8f5a2e}),task:null,idle:V(3.6,0,-0.85)};jr.fig.pos.copy(jr.idle);jr.fig.yaw=Math.PI;
const friends=[];
const bench=[1.95,2.6,3.25].map(x=>({pos:V(x,0,2.45),yaw:Math.PI,h:.44,app:[V(x,0,1.8)],occ:null}));
const terr=[.15,.8].map(z=>({pos:V(3.55,0,z),yaw:-Math.PI/2,h:.44,app:[V(2.9,0,z)],occ:null}));
const DOOR_IN=V(-2,0,2.45),DOOR_OUT=V(-2,0,3.6);
const STREET=V(4.1,0,4.7),STREET_DOOR=V(-2,0,4.4);
const ROUTE_IN=[STREET_DOOR,DOOR_OUT,DOOR_IN];
const ROUTE_OUT=[DOOR_IN,DOOR_OUT,STREET_DOOR,STREET];
const furnitureView=new FurnitureView(world,SB,terr,game.layout.cells.length),build=new BuildMode(game.layout,game.economy,furnitureView);
const custs=[],queue=[];

function lenDesc(L){return tx('len.'+(L<8?'pixie':L<18?'chin':L<28?'shoulder':L<40?'midback':'long'));}
const natName=i=>i18n.lang==='ko'?NAT_KO[i]:NATURAL[i][0], wantName=i=>i18n.lang==='ko'?WANT_KO[i]:WANT[i][0], dyeName=i=>i18n.lang==='ko'?DYE_KO[i]:DYES[i].n;
const colName=o=>o.col.t==='nat'?tx('naturalOf',natName(o.col.i)):wantName(o.col.i);
function orderText(o){return `${tx('shape.'+o.shape)} · ${o.L} cm (${lenDesc(o.L)}) · ${colName(o)} · ${tx('wave.'+WAVES[o.wave])}`;}
function spawnCustomer(){
  if(custs.filter(c=>c.state!=='gone').length>=10)return;
  const c=game.newCustomer(new Set(custs.map(q=>q.name))),fig=new Fig({skin:pick(SKINS),shirt:pick(SHIRTS),pants:pick(PANTS)});
  c.fig=fig;c.hm=new Hair(fig.head,fig);fig.pos.copy(STREET);fig.yaw=-Math.PI/2;c.fadeIn=0;setFade(fig,.01);
  c.tag=document.createElement('div');c.tag.className='tag';c.tag.innerHTML='<i></i>';c.tag.style.display='none';$('#pops').appendChild(c.tag);
  custs.push(c);if(c.vip)popup(tx('vipArrive',nm(c.name)),recep.head,'big');
  fig.walkTo(ROUTE_IN,()=>{if(!game.clock.isOpen){leave(c,'full');return;}const seat=bench.find(s=>!s.occ)||terr.find(s=>!s.occ);
    if(!seat){popup(tx('noSeats'),fig.head,'');leave(c,'full');return;}
    seat.occ=c;c.seat=seat;fig.walkTo([...seat.app,seat.pos],()=>{fig.mode='sit';fig.yaw=seat.yaw;fig.seatH=seat.h;fig.footY=.06;c.state='wait';queue.push(c);});});
}
function freeSeat(c){if(c.seat){c.seat.occ=null;c.seat=null;}const i=queue.indexOf(c);if(i>=0)queue.splice(i,1);}
function leave(c,why){freeSeat(c);c.state='leaving';const f=c.fig,p=f.pos;let pts;
  pts=(Math.abs(p.x)<4.1&&Math.abs(p.z)<3.1)?[V(Math.min(p.x,2.9),0,Math.min(p.z,1.9)),...ROUTE_OUT]:[STREET_DOOR,STREET];
  if(why==='full')pts=[DOOR_OUT,STREET_DOOR,STREET];
  f.walkTo(pts,()=>{c.state='gone';c.fadeOut=1;});}
function assign(st,c){const seat=c.seat;freeSeat(c);c.state='toStation';st.cust=c;st.state='await';st.touched=false;st.byOwner=false;st.worker=null;const f=c.fig;
  const from=f.pos.clone();let pts=[];
  pts=seat?[seat.app[0]]:[V(from.x,0,1.8)];
  pts.push(V(st.x,0,1.8),V(st.x,0,-.9),st.chair.clone());
  f.walkTo(pts,()=>{f.mode='sit';f.pos.copy(st.chair);f.yaw=Math.PI;f.seatH=.55;f.footY=.17;c.state='chair';c.tStart=simT;st.state='consult';st.playerPlan=st.sty===OWNER&&!autoOn;st.plan=st.playerPlan?blankPlan(c.hair):aiPlan(c,st.sty);st.timer=c.vip?10:2;if(st.playerPlan&&!styling&&typeof sel==='number')sel=lastChair=st.i;if(sel===st.i)renderPanel(true);});
  if(sel===st.i)renderPanel(true);}
function startWork(st){if(st.state!=='consult')return;const worker=st.byOwner?OWNER:st.sty;if(worker===OWNER&&ownerBusy())return;if(styling&&styling.station===st)closeStyling(true);st.worker=worker;const p=st.plan,ops=[];
  if(hasColour(p))ops.push({type:'colour',dur:13});
  if(p.doWave&&Math.abs(p.wave-st.cust.hair.wave)>.05)ops.push({type:'wave',dur:10});
  if(p.doCut)ops.push({type:'cut',dur:9});
  ops.push({type:'dry',dur:3.5});const prof=game.serviceProfileOf(worker);ops.forEach(o=>o.dur/=prof.spd);game.chargeMaterials(ops);if(worker!==st.sty)st.sty.fig.walkTo([V(st.x-.8,0,-.7)]);
  st.ops=ops;st.opi=0;st.state='work';beginOp(st);renderPanel(true);}
const TOOLS={colour:'brush',wave:'comb',cut:'scissors',dry:'dryer'};
function beginOp(st){const op=st.ops[st.opi],h=st.cust.hair,s=game.serviceProfileOf(st.worker);op.t=0;op.from=cloneHair(h);op.acc=new Array(NS).fill(0);
  op.to=op.type==='colour'?opColour(h,st.plan,s,true):op.type==='wave'?opWave(h,st.plan,s,true):op.type==='cut'?opCut(h,st.plan,s,true):cloneHair(h);
  st.worker.fig.setTool(TOOLS[op.type]);}
function runOps(st,dt){const op=st.ops[st.opi],c=st.cust,h=c.hair,sf=st.worker.fig;op.t+=dt;const k=clamp(op.t/op.dur),t=simT;
  if(op.type==='cut'){for(let j=0;j<NS;j++){const kk=clamp(k*1.6-(j/NS)*.6),nl=lerp(op.from.len[j],op.to.len[j],kk),rem=h.len[j]-nl;if(rem>0){op.acc[j]+=rem;h.len[j]=nl;while(op.acc[j]>1.4){op.acc[j]-=1.4;spawnClip(c.hm.endWorld(j),h.lab);}}}}
  if(op.type==='colour'){h.lab=labMix(op.from.lab,op.to.lab,smooth(k));c.tint=Math.sin(Math.PI*k)*.7;}
  if(op.type==='wave')h.wave=lerp(op.from.wave,op.to.wave,smooth(k));
  c.hm.dirty=true;
  // stylist motion (two-bone IK hands)
  c.fig.head.updateMatrixWorld(true);const hp=c.fig.head.getWorldPosition(V());const mx=Math.max(...h.len)*(1-.12*h.wave)*.011;
  let sx=0;
  if(op.type==='cut'){sx=Math.sin(t*1.3)*.18;const dy=-.05-(.5+.5*Math.sin(t*.7))*Math.min(.55,mx);const snip=Math.sin(t*22)*.012;
    sf.handR=hp.clone().add(V(sx,dy+snip,.2));sf.handL=hp.clone().add(V(sx+.09,dy+.06,.17));}
  else if(op.type==='colour'){sx=Math.sin(t*.8)*.12;sf.handR=hp.clone().add(V(sx+Math.sin(t*2.5)*.06,.1+Math.sin(t*3.1)*.05,.17));sf.handL=hp.clone().add(V(-.18,-.28,.32));}
  else if(op.type==='wave'){sf.handR=hp.clone().add(V(-.17,-.06+Math.sin(t*4)*.07,.06));sf.handL=hp.clone().add(V(.17,-.06+Math.cos(t*4)*.07,.06));}
  else{sx=Math.sin(t*1.5)*.15;sf.handR=hp.clone().add(V(sx*1.6,.14,.32));sf.handL=hp.clone().add(V(-sx*.6,.13,.14));}
  sf.pos.x=lerp(sf.pos.x,st.x+sx*.8,Math.min(1,dt*4));sf.pos.z=st.stand.z;sf.yaw=Math.PI;
  if(op.t>=op.dur){Object.assign(h,cloneHair(op.to));c.tint=0;c.hm.dirty=true;st.opi++;if(st.opi>=st.ops.length)reveal(st);else beginOp(st);if(sel===st.i)renderPanel(true);}}
const WORDS=[[.9,'w0'],[.75,'w1'],[.55,'w2'],[.35,'w3'],[0,'w4']];
let last=null;
function reveal(st){const c=st.cust,s=st.worker,sf=s.fig;st.state='reveal';sf.setTool(null);sf.handL=sf.handR=null;
  const sc=game.completeService(c,s,st.byOwner);c.result=sc;const pay=sc.payment;
  last={name:c.name,sty:s.name,all:sc.all,mins:(simT-c.tStart)/60};
  sf.walkTo([V(st.x-.55,0,-1.1)],()=>{sf.yaw=Math.PI*.8;});
  c.fig.walkTo([V(st.x+.55,0,-1.05)],()=>{c.fig.yaw=Math.PI;
    popup(`${Math.round(sc.all*100)}% · ${tx(WORDS.find(w=>sc.all>=w[0])[1])}`,c.fig.head,'big');
    later(.6,()=>{c.fig.yaw=Math.PI*.15;clapAll(sc.all);popup(tx('chairPct',st.i+1,Math.round(sc.all*100)),recep.head,'');});
    later(2.8,()=>{st.state='free';st.cust=null;sf.walkTo([s===st.sty?st.stand:(stations[0].sty===OWNER?stations[0].stand:OWNER_IDLE)],()=>sf.yaw=Math.PI);if(sel===st.i)renderPanel(true);
      c.fig.walkTo([V(st.x+.55,0,.2),V(-2.35,0,1.0)],()=>{c.fig.yaw=-Math.PI/2;later(1.3,()=>{game.receivePayment(pay);popup('+$'+pay,c.fig.head,'big');c.state='paid';leave(c);});});});});
  if(sel===st.i)renderPanel(true);}
function clapAll(q){const n=q>.5;const who=[recep,jr.fig,...friends,...STY.map(s=>s.fig),...custs.filter(c=>c.state==='wait').map(c=>c.fig)];who.forEach(f=>{if(n||Math.random()<.3)f.clapT=rand(1.2,1.8);});}

/* junior: sweeps clippings, mops wet footprints, puts out the wet-floor sign */
function jrUpdate(dt){const f=jr.fig,T=jr.task;
  if(T){if(T.phase==='work'){T.t-=dt;f.toolAim=V(T.aim.x+Math.sin(simT*5)*.35,0,T.aim.z+Math.cos(simT*2.5)*.12);f.handR=f.pos.clone().add(V(0,1.02,0)).addScaledVector(fwd(f.yaw),.22).addScaledVector(rgt(f.yaw),.1);f.handL=f.handR.clone().add(V(0,-.22,0)).addScaledVector(fwd(f.yaw),.05);
      if(T.t<=0){T.done();jr.task=null;f.handL=f.handR=null;f.toolAim=null;f.setTool(null);}}return;}
  const go=(standAt,aim,tool,dur,done)=>{jr.task={phase:'walk',aim,done};f.handL=f.handR=null;f.walkTo([standAt],()=>{jr.task.phase='work';jr.task.t=dur;f.setTool(tool);f.yaw=Math.atan2(aim.x-f.pos.x,aim.z-f.pos.z);});};
  if(rainAmt>.5&&!wetSign.visible){go(V(-1.4,0,1.5),V(-1.4,0,2.1),'bowl',1,()=>{wetSign.visible=true;});return;}
  if(rainAmt<.1&&wetSign.visible){go(V(-1.4,0,1.5),V(-1.4,0,2.1),'bowl',1,()=>{wetSign.visible=false;});return;}
  const landed=clips.filter(c=>c.alive&&c.landed);
  if(landed.length>24){const a=landed[0].p.clone();a.y=0;const sa=a.clone().add(V(.5,0,.45));sa.x=clamp(sa.x,-3.6,3.6);sa.z=clamp(sa.z,-2.2,2.2);
    go(sa,a,'broom',3.2,()=>{clips.forEach(c=>{if(c.alive&&c.landed&&Math.hypot(c.p.x-a.x,c.p.z-a.z)<1.0)c.alive=false;});});return;}
  if(prints.length>12){const a=prints[0].p.clone();a.y=0;const sa=a.clone().add(V(.45,0,-.45));
    go(sa,a,'mop',3,()=>{for(let i=prints.length-1;i>=0;i--)if(prints[i].p.distanceTo(a)<1.3)prints[i].life=Math.min(prints[i].life,.08);});return;}
  if(!f.path.length&&f.pos.distanceTo(jr.idle)>.05){f.handL=f.handR=null;f.walkTo([jr.idle],()=>f.yaw=Math.PI);}
  if(f.pos.distanceTo(jr.idle)<.06&&!f.path.length){f.handR=V(3.5,1.0+Math.sin(simT*3)*.04,-1.32);f.handL=V(3.75,1.0+Math.cos(simT*3)*.04,-1.32);}else if(!f.path.length){f.handL=f.handR=null;}
}

/* ================= time, weather, timers ================= */
let started=false,paused=false,booted=false,styling=null,savedCamK=0,lastChair=0;
const canAuto=st=>autoOn&&!st.touched;
const ownerBusy=()=>stations.some(x=>(x.state==='work'||x.state==='reveal')&&x.worker===OWNER);
const openChair=()=>stations.find(x=>x.vacant&&x.i<game.layout.chairs)||(stations[0].sty===OWNER&&stations[0].state==='free'&&!styling?stations[0]:null);
function syncChairs(){stationGroups.forEach((g,i)=>{g.visible=i<game.layout.chairs;});}
function placeStaff(e,st){const wasOwner=st.sty===OWNER;st.sty=e;st.vacant=false;st.state='free';e.fig.root.visible=true;e.fig.pos.copy(st.stand);e.fig.yaw=Math.PI;if(wasOwner)OWNER.fig.walkTo([OWNER_IDLE],()=>OWNER.fig.yaw=Math.PI);}
function hireStaff(e){const st=openChair();if(st&&game.staff.hire(e)){placeStaff(e,st);game.updateProgress();}}
function fireStaff(e){const st=stations.find(x=>x.sty===e);if(!st||st.state!=='free'||!game.staff.fire(e))return;e.fig.root.visible=false;if(st.i===0&&!stations.some(x=>x.sty===OWNER)){st.sty=OWNER;OWNER.fig.walkTo([st.stand],()=>OWNER.fig.yaw=Math.PI);}else{st.sty=VAC;st.vacant=true;st.state='vacant';}}
function restoreGame(){const d=game.saves.load();if(!d)return;game.restore(d);
  d.layout.items.forEach(x=>{const cell=game.layout.cells.find(c=>Math.abs(c.x-x.x)<.01&&Math.abs(c.z-x.z)<.01),cells=cell&&game.layout.footprint(x.id,cell,x.rotation);if(cells)furnitureView.spawn(game.layout.add(x.id,cells,x.rotation));});
  game.staff.hired.forEach(e=>{const st=openChair();if(st)placeStaff(e,st);else e.hired=false;});}
function finishDay(){game.closeDay();paused=true;openMenu('day','day');}
function dayTick(dt){if(game.report)return;game.clock.tick(dt);if(!game.clock.isOpen&&!stations.some(x=>x.cust)&&!custs.some(c=>c.state!=='gone'&&c.state!=='leaving'))finishDay();}
game.bus.on('day:closed',()=>{popup(tx('closed'),recep.head,'big');queue.slice().forEach(c=>leave(c));});
game.bus.on('level:up',l=>{popup(tx('levelUp',l,tx('lv.'+l)),recep.head,'big');renderPanel(true);});
function openStyling(st){if(styling||st.state!=='consult'||!st.cust||ownerBusy())return;styling=new StylingSession(st,st.cust);if(!st.playerPlan){st.plan=blankPlan(st.cust.hair);st.playerPlan=true;}st.byOwner=true;st.touched=true;st.sty.fig.root.visible=false;savedCamK=camK;camK=Math.round(camK/4)*4;document.body.classList.add('closeup');renderPanel(true);}
function closeStyling(confirmed){const s=styling;if(!s)return;styling=null;document.body.classList.remove('closeup');camK=savedCamK;s.station.sty.fig.root.visible=true;const c=s.customer;c.previewHair=null;c.hm.dirty=true;c.fig.yaw=Math.PI;if(!confirmed){const st=s.station;st.byOwner=false;if(autoOn||st.sty!==OWNER){st.plan=aiPlan(c,st.sty);st.playerPlan=false;st.touched=false;st.timer=2;}}renderPanel(true);}
function stylingTick(dt){if(!styling)return;const c=styling.customer;c.fig.yaw=angLerp(c.fig.yaw,styling.targetYaw(Math.PI*1.25),Math.min(1,dt*10));c.fig.look=0;const hp=c.fig.head.getWorldPosition(V());camClose.set(hp.x,hp.y-(W/H<1?.62:.2),hp.z);}
let simT=0,speed=1,autoOn=true,timeMode='auto',wxMode='auto',rainAmt=0,wet=0,rainTarget=0,wxTimer=40,spawnTimer=1.5;
const timers=[];const later=(s,fn)=>timers.push({t:s,fn});
const PRE={day:{sky:0x7ea2d0,sun:0xfff1c4,si:2.8,sp:V(6,12,5),hs:0xb6d2ec,hg:0xb7a99a,hi:1.1,inI:0,spI:0,glow:0},
  dusk:{sky:0xd88a6a,sun:0xff7a3d,si:1.9,sp:V(-11,4,4),hs:0xffb15a,hg:0x5a2440,hi:.75,inI:7,spI:22,glow:.55},
  night:{sky:0x0b1530,sun:0x7ea2d0,si:.3,sp:V(-4,10,-6),hs:0x2a4478,hg:0x0d0b14,hi:.3,inI:10,spI:38,glow:1}};
function phaseNow(){if(timeMode!=='auto')return timeMode;const d=new Date(),h=started?game.clock.hour:d.getHours()+d.getMinutes()/60;return(h>=7&&h<17.5)?'day':((h>=17.5&&h<19.5)||(h>=5.5&&h<7))?'dusk':'night';}
const L={sky:new THREE.Color(0x7ea2d0),sun:new THREE.Color(0xfff1c4),si:2.8,sp:V(6,12,5),hs:new THREE.Color(0xb6d2ec),hg:new THREE.Color(0x5f9e45),hi:1.1,inI:0,spI:0,glow:0};
const _ca=new THREE.Color(),_cb=new THREE.Color();
function updateLights(dt){const P=PRE[phaseNow()],k=Math.min(1,dt*1.5);
  _ca.set(P.sky).lerp(_cb.set(P===PRE.night?0x1d1a26:0x7d8a98),rainAmt*.75);L.sky.lerp(_ca,k);
  L.sun.lerp(_ca.set(P.sun),k);L.si=lerp(L.si,P.si*(1-.7*rainAmt),k);L.sp.lerp(P.sp,k);L.hs.lerp(_ca.set(P.hs).lerp(_cb.set(0x9c98a2),rainAmt*.5),k);L.hg.lerp(_ca.set(P.hg),k);
  L.hi=lerp(L.hi,P.hi*(1+.25*rainAmt),k);L.inI=lerp(L.inI,Math.max(P.inI,rainAmt*4),k);L.spI=lerp(L.spI,P.spI+(P===PRE.day?0:0),k);L.glow=lerp(L.glow,Math.max(P.glow,rainAmt*.35),k);
  scene.background.copy(L.sky);sun.color.copy(L.sun);sun.intensity=L.si;sun.position.copy(L.sp).normalize().multiplyScalar(30);hemi.color.copy(L.hs);hemi.groundColor.copy(L.hg);hemi.intensity=L.hi;
  inLights.forEach(l=>l.intensity=L.inI);spots.forEach(s=>s.intensity=L.spI);GLASS.emissiveIntensity=L.glow*.6;LAMP.emissiveIntensity=L.glow*1.2+.05;}

/* ================= popups ================= */
const pops=[];
function popup(text,obj,cls){const el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=text;$('#pops').appendChild(el);pops.push({el,obj,t:0,life:2.6});}
const _p=V();
function screenOf(v){_p.copy(v).project(cam);return [(_p.x+1)/2*W*PIX,(1-_p.y)/2*H*PIX];}
function updatePops(dt){for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;const w=p.obj.getWorldPosition(V());w.y+=.35+p.t*.25;const [x,y]=screenOf(w);p.el.style.left=x+'px';p.el.style.top=y+'px';p.el.style.opacity=clamp((p.life-p.t)*2);if(p.t>p.life){p.el.remove();pops.splice(i,1);}}
  custs.forEach(c=>{if(c.state==='wait'){const w=c.fig.head.getWorldPosition(V());w.y+=.3;const [x,y]=screenOf(w);c.tag.style.display='block';c.tag.style.left=x+'px';c.tag.style.top=y+'px';const k=clamp(c.pat/c.maxPat);const i=c.tag.firstChild;i.style.width=(k*100)+'%';i.style.background=k>.5?'#8fc25a':k>.25?'#ffb15a':'#d8314a';}else c.tag.style.display='none';});}

/* ================= simulation step ================= */
function simStep(dt){simT+=dt;
  for(let i=timers.length-1;i>=0;i--){if((timers[i].t-=dt)<=0){const f=timers[i].fn;timers.splice(i,1);f();}}
  // arrivals
  if(game.clock.isOpen){spawnTimer-=dt;if(spawnTimer<=0){spawnCustomer();spawnTimer=game.nextArrival(rainAmt);}}
  dayTick(dt);
  // weather
  if(wxMode==='auto'){wxTimer-=dt;if(wxTimer<=0){rainTarget=Math.random()<.32?1:0;wxTimer=rand(50,110);}}else rainTarget=wxMode==='rain'?1:0;
  rainAmt+=(rainTarget-rainAmt)*Math.min(1,dt*.35);wet+=((rainAmt>.3?1:0)-wet)*Math.min(1,dt*(rainAmt>.3?.12:.05));
  // waiting patience
  custs.forEach(c=>{if(c.state==='wait'){c.pat-=dt;if(c.pat<=0){popup(tx('tooSlow'),c.fig.head,'');game.customerGaveUp();leave(c);}}});
  // stations
  stations.forEach(st=>{
    if(st.vacant)return;
    if(st.state==='free'){if(st.sty.restUntil>simT||!game.clock.isOpen)return;const c=queue.find(c=>c.state==='wait');if(c)assign(st,c);}
    else if(st.state==='consult'){if(!game.clock.isOpen&&!(styling&&styling.station===st)&&!ownerBusy()){if(st.sty===OWNER)st.plan=aiPlan(st.cust,OWNER);startWork(st);}else if(canAuto(st)){st.timer-=dt;if(st.timer<=0){st.plan=aiPlan(st.cust,st.sty);startWork(st);}}}
    else if(st.state==='work')runOps(st,dt);
    if(st.state!=='work'&&st.state!=='reveal'){const sf=st.sty.fig;sf.handL=sf.handR=null;sf.setTool(st.state==='consult'?'comb':null);
      if(!sf.path.length&&sf.pos.distanceTo(st.stand)>.05)sf.walkTo([st.stand],()=>sf.yaw=Math.PI);
      if(st.state==='consult'&&st.cust){const hp=st.cust.fig.head.getWorldPosition(V());sf.handR=hp.clone().add(V(Math.sin(simT*2)*.08,.05,.22));}}});
  jrUpdate(dt);
  // receptionist watches the latest reveal / door
  const rv=stations.find(s=>s.state==='reveal');{const tgt=rv?rv.chair:DOOR_IN;const a=Math.atan2(tgt.x-recep.pos.x,tgt.z-recep.pos.z)-recep.yaw;recep.look=angLerp(recep.look,clamp(((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,-1,1),Math.min(1,dt*3));}
  // spectators look at reveals
  custs.forEach(c=>{if(c.state==='wait'){c.fig.look=rv?angLerp(c.fig.look,.4*Math.sin(simT*.3),.02):Math.sin(simT*.4+c.id)*.3;}
    else if(c.state==='chair')c.fig.look=Math.sin(simT*.5+c.id)*.15;else c.fig.look=0;});
  // figures
  figs.forEach(f=>f.update(dt));
  custs.slice().forEach(c=>{if(c.fadeIn<1){c.fadeIn=Math.min(1,c.fadeIn+dt*2.5);setFade(c.fig,Math.max(.01,c.fadeIn));}
    if(c.fadeOut!=null){c.fadeOut-=dt*2.5;setFade(c.fig,Math.max(.01,c.fadeOut));if(c.fadeOut<=0){c.fig.remove();c.tag.remove();c.hm.mesh.dispose();custs.splice(custs.indexOf(c),1);}}
    if(c.hm.dirty||c.tint>0)c.hm.build(c.previewHair||c.hair,FOIL,c.tint);});
  // clippings
  let n=0;for(let i=0;i<clips.length;i++){const c=clips[i];if(!c.alive){_m4.makeScale(0,0,0);clipMesh.setMatrixAt(i,_m4);continue;}
    if(!c.landed){c.v.y-=4.5*dt;c.v.multiplyScalar(1-dt*1.5);c.p.addScaledVector(c.v,dt);if(c.p.y<=.02){c.p.y=.02;c.landed=true;}}
    _m4.compose(c.p,_q.setFromAxisAngle(UP,c.ry),_s.set(.035,.02,.08));clipMesh.setMatrixAt(i,_m4);n=i+1;}
  clipMesh.count=n;clipMesh.instanceMatrix.needsUpdate=true;
  for(let i=prints.length-1;i>=0;i--){prints[i].life-=dt/40;if(prints[i].life<=0)prints.splice(i,1);}
  prints.forEach((p,i)=>{const k=clamp(p.life*3);_m4.compose(V(p.p.x,.014,p.p.z),_q.setFromAxisAngle(UP,p.yaw),_s.set(.09*k,.004,.15*k));fpMesh.setMatrixAt(i,_m4);});fpMesh.count=prints.length;fpMesh.instanceMatrix.needsUpdate=true;
}
const FOIL={L:.8,a:-.002,b:-.006};

/* ================= environment animation (real time) ================= */
function envStep(dt,t){
  const pa=rainGeo.attributes.position.array,fall=13*dt*speed;
  if(rainAmt>.03){for(let i=0;i<NR;i++){const o=i*6;pa[o+1]-=fall;pa[o+4]-=fall;if(pa[o+1]<0){const [x,z]=rainXZ(),y=rand(5,8);pa[o]=x;pa[o+1]=y;pa[o+2]=z;pa[o+3]=x-.05;pa[o+4]=y+.45;pa[o+5]=z;}}rainGeo.attributes.position.needsUpdate=true;}
  rain.visible=rainAmt>.03;rainGeo.setDrawRange(0,Math.floor(NR*clamp(rainAmt))*2);
  puddles.visible=wet>.03;puddles.children.forEach(m=>m.scale.setScalar(Math.max(.01,wet)));puddleMat.uniforms.time.value=t;puddleMat.uniforms.wet.value=wet;
  poleTex.offset.y=(t*.4)%1;
  awning.scale.z=1+.5*rainAmt;
  // cutaway walls facing the camera
  const v=V(Math.sin(camAz),0,Math.cos(camAz));walls.forEach(w=>{const front=w.n.dot(v)>.2;w.full.visible=!front;w.low.visible=front;});
  // selection marker
  if(started&&typeof sel==='number'){const st=stations[sel];marker.visible=true;marker.position.set(st.x,2.35+Math.abs(Math.sin(t*3))*.15,-1.8);}else marker.visible=false;
}

/* ================= UI ================= */
let sel=0;const tabs=$('#tabs'),pbody=$('#pbody');let panelKey='';
function stLabel(st){if(!st.cust)return`<span class="dim">${tx('st.free')}</span>`;if(st.state==='await')return tx('st.walk');
  if(st.state==='consult')return canAuto(st)?tx('st.auto',Math.max(0,st.timer).toFixed(0)):`<span class="gold">${tx('st.wait')}</span>`;
  if(st.state==='work'){const o=st.ops[st.opi];return `${tx('doing.'+o.type)} ${Math.round(clamp(o.t/o.dur)*100)}%`;}return tx('st.reveal');}
function renderTabs(){const T=[['salon','tab.salon'],['staff','tab.staff'],['build','tab.build'],['biz','tab.biz'],['prog','tab.prog']];
  tabs.innerHTML=T.map(([k,l])=>`<button data-t="${k}" class="${(k==='salon'?typeof sel==='number':sel===k)?'sel':''}">${tx(l)}</button>`).join('')+`<button class="tog" id="bMin">${$('#panel').classList.contains('min')?'▴':'▾'}</button>`;
  tabs.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{sel=b.dataset.t==='salon'?lastChair:b.dataset.t;$('#panel').classList.remove('min');renderPanel(true);});
  $('#bMin').onclick=()=>{$('#panel').classList.toggle('min');renderTabs();};}
function swatches(k,cur){return `<button class="sw none ${cur<0?'sel':''}" data-${k}="-1" title="-"></button>`+DYES.map((d,i)=>`<button class="sw ${cur===i?'sel':''}" data-${k}="${i}" title="${dyeName(i)}" style="background:${hexCss(d.h)}"></button>`).join('');}
function seg(k,list,cur,lab=n=>n){return `<span class="seg">${list.map((n,i)=>`<button data-${k}="${typeof cur==='string'?n:i}" class="${(typeof cur==='string'?n===cur:i===cur)?'sel':''}">${lab(n)}</button>`).join('')}</span>`;}
function renderPanel(force){
  const key=typeof sel==='number'?(()=>{const st=stations[sel];return [sel,st.state,st.sty.name,st.cust&&st.cust.id,st.opi,game.layout.chairs,!!styling,i18n.lang].join('|');})():ui.key(sel);
  if(!force&&key===panelKey){refreshDynamic();return;}panelKey=key;renderTabs();
  if(typeof sel!=='number'){pbody.innerHTML=ui.render(sel);return;}
  const st=stations[sel],c=st.cust,chairRow=`<div class="seg" style="margin-bottom:4px">${stations.map(x=>`<button data-do="chair-tab:${x.i}" class="${x.i===sel?'sel':''}">${x.i+1}·${nm(x.sty.name)}</button>`).join('')}</div>`;
  if(st.i>=game.layout.chairs){pbody.innerHTML=chairRow+`<div class="dim">${tx('vac.noChair')}</div>`;return;}
  if(st.vacant){pbody.innerHTML=chairRow+`<div class="dim">${tx('vac.note')}</div>`;return;}
  let h=chairRow+`<div class="ph"><b>${tx('chair',st.i+1)}</b> · <span style="color:${hexCss(st.sty.apron)}">${nm(st.sty.name)}</span> <span class="dim">(${tx('style.'+st.sty.style)})</span> · <span id="stl">${stLabel(st)}</span></div>`;
  if(!c){pbody.innerHTML=h+`<div class="dim">${tx('free.next',queue.length?queue.map(q=>nm(q.name)).join(', '):tx('free.nobody'))}</div><div id="help">${tx('free.help')}</div>`;return;}
  h+=`<div class="ord">${c.vip?`<span class="gold">${tx('vip')}</span> `:''}<b>${tx('order.wants',nm(c.name))}</b> <span class="otext">${orderText(c.order)}</span> <span class="dim">· $${c.price} · ${tx('p.budget',c.budget)}</span>${st.state==='consult'&&!styling?` <button class="go" data-do="style" ${ownerBusy()?'disabled':''}>${tx('p.direct')}</button>`:''}</div>`;
  h+=`<div class="pv"><figure><canvas id="pvO" width="48" height="56"></canvas><figcaption>${tx('fig.order')}</figcaption></figure><figure><canvas id="pvN" width="48" height="56"></canvas><figcaption>${tx('fig.now')}</figcaption></figure>${st.state==='consult'?`<figure><canvas id="pvP" width="48" height="56"></canvas><figcaption>${tx('fig.plan')}</figcaption></figure>`:''}<div class="bars" id="bars"></div></div>`;
  if(st.state==='consult'){const p=st.plan;
    h+=`${styling&&styling.station===st?`<div class="row"><button data-do="turn:-1">◀</button><button data-do="turn:1">▶</button><button data-do="compare">${tx('style.compare')}</button><button data-do="style-close">${tx('style.close')}</button></div>`:''}<div class="row"><label><input type="checkbox" data-k="doCut" ${p.doCut?'checked':''}> ${tx('p.cut')}</label>${seg('shape',SHAPES,p.shape,n=>tx('shape.'+n))}</div>
    <div class="row"><label class="dim">${tx('p.length')}</label><input type="range" min="1" max="60" step="0.5" value="${p.L}" data-r="L"><span id="Lv"></span></div>
    <div class="row"><label class="dim">${tx('p.zFront')}</label><input type="range" min="-12" max="12" step="0.5" value="${p.zones.front}" data-z="front"><span id="zfront"></span></div><div class="row"><label class="dim">${tx('p.zSide')}</label><input type="range" min="-12" max="12" step="0.5" value="${p.zones.side}" data-z="side"><span id="zside"></span></div><div class="row"><label class="dim">${tx('p.zBack')}</label><input type="range" min="-12" max="12" step="0.5" value="${p.zones.back}" data-z="back"><span id="zback"></span></div>
    <div class="row"><label><input type="checkbox" data-k="doColour" ${p.doColour?'checked':''}> ${tx('p.colour')}</label><span class="dim">${tx('p.bleach')}</span>${seg('bl',['0','1','2','3'],p.bleach)}</div>
    <div class="row"><label class="dim">${tx('p.tubeA')}</label>${swatches('a',p.dyeA)}</div>
    <div class="row"><label class="dim">${tx('p.tubeB')}</label>${swatches('b',p.dyeB)}</div>
    <div class="row"><label class="dim">${tx('p.mix')}</label><input type="range" min="0.05" max="0.95" step="0.05" value="${p.mix}" data-r="mix"><span id="Mv"></span></div>
    <div class="row"><label><input type="checkbox" data-k="doWave" ${p.doWave?'checked':''}> ${tx('p.wave')}</label>${seg('wv',WAVES,p.wave,n=>tx('wave.'+n))}</div>
    <div class="row"><button id="bPlan">${tx('p.autoplan')}</button><button id="bStart" class="go">${st.sty===OWNER||(styling&&styling.station===st)?tx('p.ownerAuto'):tx('p.start')}</button><span class="dim" id="dyeN"></span></div>`;}
  if(st.state==='work')h+=`<div id="ops" class="dim"></div>`;
  pbody.innerHTML=h;
  if(st.state==='consult'&&!game.isUnlocked('colour'))pbody.querySelectorAll('.row').forEach(r=>{if(r.querySelector('[data-k=doColour],[data-k=doWave],[data-a],[data-b],[data-r=mix]'))r.style.display='none';});
  const designing=(styling&&styling.station===st)||(st.sty===OWNER&&!autoOn);
  if(st.state==='consult'&&!styling&&((st.sty===OWNER&&!autoOn)||canAuto(st)))pbody.querySelectorAll('.row').forEach(r=>{r.style.display='none';});
  if(st.state==='consult'&&designing)$('#bPlan').style.display='none';
  if(st.state==='consult'){const p=st.plan,touch=()=>{st.touched=true;},markCut=()=>{p.doCut=true;pbody.querySelector('[data-k=doCut]').checked=true;};
    pbody.querySelectorAll('[data-z]').forEach(e=>e.oninput=()=>{p.zones[e.dataset.z]=+e.value;markCut();touch();refreshDynamic();});
    pbody.querySelectorAll('[data-k]').forEach(e=>e.onchange=()=>{p[e.dataset.k]=e.checked;touch();refreshDynamic();});
    pbody.querySelectorAll('[data-r]').forEach(e=>e.oninput=()=>{p[e.dataset.r]=+e.value;if(e.dataset.r==='L')markCut();touch();refreshDynamic();});
    pbody.querySelectorAll('[data-shape]').forEach(e=>e.onclick=()=>{p.shape=e.dataset.shape;p.doCut=true;touch();renderPanel(true);});
    pbody.querySelectorAll('[data-bl]').forEach(e=>e.onclick=()=>{p.bleach=+e.dataset.bl;p.doColour=true;touch();renderPanel(true);});
    pbody.querySelectorAll('[data-a]').forEach(e=>e.onclick=()=>{p.dyeA=+e.dataset.a;p.doColour=true;touch();renderPanel(true);});
    pbody.querySelectorAll('[data-b]').forEach(e=>e.onclick=()=>{p.dyeB=+e.dataset.b;p.doColour=true;touch();renderPanel(true);});
    pbody.querySelectorAll('[data-wv]').forEach(e=>e.onclick=()=>{p.wave=+e.dataset.wv;p.doWave=true;touch();renderPanel(true);});
    $('#bPlan').onclick=()=>{st.plan=aiPlan(c,st.sty);touch();renderPanel(true);};
    $('#bStart').onclick=()=>startWork(st);}
  refreshDynamic();}
function bars(sc,label){return `<div class="dim" style="font-size:.9em">${label}</div>`+[[tx('b.cut'),sc.cut,`±${sc.mad.toFixed(1)}cm`],[tx('b.colour'),sc.col,`ΔE ${sc.dE.toFixed(0)}`],[tx('b.wave'),sc.wav,''],[tx('b.match'),sc.all,'']].map(([n,v,x])=>`<div class="bar"><span>${n}</span><div class="tr"><div class="fl" style="width:${Math.round(v*100)}%;background:${v>.75?'#8fc25a':v>.5?'#ffb15a':'#d8314a'}"></div></div><b>${Math.round(v*100)}% <span class="dim">${x}</span></b></div>`).join('')+(sc.dmg>0?`<div class="bad" style="font-size:.9em">${tx('b.damage',Math.round(sc.dmg*100))}</div>`:'');}
function resultBars(r){return `<div class="dim" style="font-size:.9em">${tx('r.title')}</div>`+[['r.length',r.length],['r.style',r.style],['r.colour',r.colour],['r.quality',r.quality],['r.satisfaction',r.satisfaction]].map(([k,v])=>`<div class="bar"><span>${tx(k)}</span><div class="tr"><div class="fl" style="width:${Math.round(v*100)}%;background:${v>.75?'#8fc25a':v>.5?'#ffb15a':'#d8314a'}"></div></div><b>${Math.round(v*100)}%</b></div>`).join('');}
function refreshDynamic(){if(typeof sel!=='number')return;const st=stations[sel],c=st.cust;const e=$('#stl');if(e)e.innerHTML=stLabel(st);if(!c)return;
  const skin=hexCss(c.fig.o.skin);const o={len:profile(c.order.shape,c.order.L).map(v=>v/(1-.12*c.order.wave)),lab:c.order.lab,wave:c.order.wave};
  drawPV($('#pvO'),o,skin);drawPV($('#pvN'),c.hair,skin,c.tint);
  if(st.state==='consult'){const p=st.plan,pr=applyPlan(c.hair,p,st.sty,false);drawPV($('#pvP'),pr,skin);if(styling&&styling.station===st){c.previewHair=styling.showCurrent?null:pr;c.hm.dirty=true;}['front','side','back'].forEach(z=>{const e=$('#z'+z);if(e)e.textContent=(p.zones[z]>0?'+':'')+p.zones[z]+' cm';});$('#bars').innerHTML=(styling&&styling.station===st)||(st.sty===OWNER&&!autoOn)?`<div class="dim">${tx('style.hint')}</div>`:bars(score(pr,c.order),tx('b.predicted'));
    const wv=p.doWave?p.wave:c.hair.wave;$('#Lv').textContent=tx('p.lv',p.L,(p.L*(1-.12*wv)).toFixed(1));
    const dl=dyeLab(p.dyeA,p.dyeB,p.mix);$('#Mv').textContent=p.dyeA>=0&&p.dyeB>=0?`${Math.round((1-p.mix)*100)}:${Math.round(p.mix*100)}`:tx('p.oneTube');
    $('#dyeN').innerHTML=p.doColour?` ${tx('p.result')} <span style="display:inline-block;width:14px;height:12px;vertical-align:-2px;background:${labCss(pr.lab)}"></span>${dl?'':tx('p.bleachOnly')}`:'';}
  else{$('#bars').innerHTML=c.result?resultBars(c.result):bars(score(c.hair,c.order),tx('b.live'));}
  const ops=$('#ops');if(ops&&st.ops.length)ops.innerHTML=st.ops.map((o,i)=>`<span class="${i===st.opi?'gold':i<st.opi?'good':''}">${i<st.opi?'✓ ':''}${tx('op.'+o.type)}</span>`).join(' → ');}
function drawPV(cv,h,skin,tint=0){if(!cv)return;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#1d1a26';g.fillRect(0,0,48,56);
  const lab=tint>0?labMix(h.lab,FOIL,tint):h.lab;
  g.fillStyle='#5f5a68';g.fillRect(7,41,34,15);g.fillStyle=skin;g.fillRect(20,32,8,10);g.fillRect(15,10,18,22);
  const w=h.wave,side=(h.len[7]+h.len[8]+h.len[9]+h.len[10])/4,capW=side<4?14:20;
  g.fillStyle=labCss(lab,.93);g.fillRect(24-capW/2,7,capW,13);g.fillRect(24-capW/2+1,6,capW-2,1);
  const order=[11,12,7,8,9,10,5,6,0,1,2,3,4];
  order.forEach(j=>{const s=STR[j],x0=Math.round(24-s.p.x*75*(s.p.z>.05?1.2:1)),y0=s.z===3?12:s.z===2?13:16,vis=h.len[j]*(1-.12*w),Lp=Math.round(vis*.62);
    g.fillStyle=labCss(lab,s.z===0?1:.86);for(let y=0;y<Lp;y++){const off=Math.round(Math.sin(y*(.35+.12*w)+j)*w*1.1);g.fillRect(x0-1+off,y0+y,3,1);}});}
function updateHud(){const g=game,e=g.economy,money=n=>(n<0?'−$':'$')+Math.abs(n);
  const stage=st=>!st.cust?`<span class="dim">${tx('stage.free')}</span>`:st.state==='work'?tx('stage.'+st.ops[st.opi].type):tx('stage.'+(st.state==='consult'?'consult':st.state==='await'?'seating':'reveal'));
  const m=st=>st.cust?Math.round(score(st.cust.hair,st.cust.order).all*100)+'%':'',row=(k,v)=>`<tr><td>${tx(k)}</td><td style="text-align:right">${v}</td></tr>`;
  $('#hud').innerHTML=`<h1><span>CUT &amp; DRIED</span><span>${tx('hud.day',g.clock.day)} ${g.clock.timeText}</span></h1>
  <table>${row('hud.cash',money(e.cash))}${row('hud.rep',g.reputation.starText)}${row('hud.cust',`${g.servedToday} / ${g.expectedClients}`)}${row('hud.staff',`${g.staff.hired.length+1} / ${g.layout.chairs+1}`)}${row('hud.profit',money(e.dailyProfit))}</table>
  <table class="foot">${stations.filter(st=>st.i<g.layout.chairs).map(st=>`<tr class="${st.state==='work'?'srv':''}"><td>${st.state==='work'?'✂':st.i+1}</td><td>${nm(st.sty.name)}</td><td>${st.cust?(st.cust.vip?'★':'')+nm(st.cust.name):'—'}</td><td>${st.vacant?'':stage(st)}</td><td>${m(st)}</td></tr>`).join('')}</table>
  ${last?`<div class="dim">${tx('hud.last',nm(last.name),Math.round(last.all*100),nm(last.sty),last.mins.toFixed(1))}</div>`:''}`;}

/* controls */
$('#bRotL').onclick=()=>camK--;$('#bRotR').onclick=()=>camK++;
addEventListener('keydown',e=>{const K=e.key.toLowerCase();
  if(styling){if(K==='q')styling.turn(-1);if(K==='e')styling.turn(1);return;}
  if(build.isActive){if(K==='r'){build.rotate();renderPanel(true);}if(K==='escape'){build.cancel();renderPanel(true);}return;}
  if(K==='q')camK--;if(K==='e')camK++;});
const TM=['auto','day','dusk','night'],WM=['auto','clear','rain'];
function syncCtrl(){$('#bTime').textContent=tx('time.'+timeMode);$('#bWx').textContent=tx('wx.'+wxMode);$('#bSpd').textContent='×'+speed;$('#bSpd').classList.toggle('on',speed===3);
  $('#bAuto').textContent=tx('ctl.auto');$('#bAuto').classList.toggle('on',autoOn);$('#bLang').textContent=tx('ctl.lang');
  [['bRotL','rotL'],['bRotR','rotR'],['bTime','time'],['bWx','wx'],['bSpd','spd'],['bAuto','auto'],['bHelp','help'],['bLang','lang']].forEach(([i,k])=>$('#'+i).title=tx('tt.'+k));}
function setAuto(on){autoOn=on;syncCtrl();renderPanel(true);}
function setLang(l){i18n.lang=l;document.documentElement.lang=l;try{localStorage.setItem('cd-lang',l);}catch(e){}syncCtrl();updateHud();renderPanel(true);if(!$('#menu').classList.contains('hide'))renderMenu();}
$('#bTime').onclick=()=>{timeMode=TM[(TM.indexOf(timeMode)+1)%4];syncCtrl();};
$('#bWx').onclick=()=>{wxMode=WM[(WM.indexOf(wxMode)+1)%3];syncCtrl();};
$('#bSpd').onclick=()=>{speed=speed===1?3:1;syncCtrl();};
$('#bAuto').onclick=()=>setAuto(!autoOn);
$('#bLang').onclick=()=>setLang(i18n.lang==='ko'?'en':'ko');
$('#bHelp').onclick=()=>{build.cancel();paused=true;openMenu('how','game');};
$('#bZo').onclick=()=>zoom=clamp(zoom/1.2,.6,2.2);$('#bZi').onclick=()=>zoom=clamp(zoom*1.2,.6,2.2);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY<0?1.1:1/1.1),.6,2.2);},{passive:false});
const ptrs=new Map();let pinch0=0,zoom0=1,down=null;
canvas.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===1)down=[e.clientX,e.clientY];if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom0=zoom;down=null;}});
canvas.addEventListener('pointermove',e=>{if(build.isActive){const q=groundAt(e.clientX,e.clientY);if(q)build.hover(q);}if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];zoom=clamp(zoom0*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch0,.6,2.2);}});
const endP=e=>{if(down&&ptrs.size===1&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<10)pickAt(e.clientX,e.clientY);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=0;if(!ptrs.size)down=null;};
canvas.addEventListener('pointerup',endP);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null;});
const ray=new THREE.Raycaster();
const groundPlane=new THREE.Plane(UP,0),_gp=V();
function groundAt(x,y){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),cam);return ray.ray.intersectPlane(groundPlane,_gp)?{x:_gp.x,z:_gp.z}:null;}
function pickAt(x,y){if(build.isActive){const q=groundAt(x,y);if(q&&build.commit(q))renderPanel(true);return;}if(styling)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),cam);
  const hits=ray.intersectObjects(world.children,true).filter(h=>h.object.visible&&h.object.parent.visible);if(!hits.length)return;
  const h=hits[0],f=h.object.userData.fig;
  if(f){const st=stations.find(s=>s.sty.fig===f||(s.cust&&s.cust.fig===f));if(st){sel=st.i;lastChair=st.i;$('#panel').classList.remove('min');renderPanel(true);return;}
    const c=custs.find(c=>c.fig===f);if(c){popup(`${nm(c.name)}: ${orderText(c.order)}`,c.fig.head,'');return;}}
  const p=h.point;let best=null,bd=.9;stations.forEach(s=>{const d=Math.hypot(p.x-s.x,p.z-s.chair.z);if(d<bd){bd=d;best=s;}});
  if(best){sel=best.i;$('#panel').classList.remove('min');renderPanel(true);}}

const ui=new TycoonUI(game,build,i18n,{now:()=>simT,hasOpenChair:()=>!!openChair(),hire:hireStaff,fire:fireStaff,syncChairs});
pbody.addEventListener('click',e=>{const b=e.target.closest('[data-do]');if(!b||b.disabled)return;const [a,v]=b.dataset.do.split(':');
  if(a==='chair-tab'){sel=lastChair=+v;}else if(a==='style')openStyling(stations[sel]);else if(a==='style-close')closeStyling(false);else if(a==='turn'){styling.turn(+v);return;}else if(a==='compare'){styling.toggleCompare();refreshDynamic();return;}else ui.handle(a,v);
  renderPanel(true);});

/* ================= start menu ================= */
let menuScreen='main',menuFrom='main';
const mbox=$('#mcard');
function mSeg(act,opts,cur){return `<span class="seg">${opts.map(([v,l])=>`<button data-act="${act}:${v}" class="${String(v)===String(cur)?'sel':''}">${l}</button>`).join('')}</span>`;}
const langRow=()=>`<div class="mrow"><label>${tx('m.lang')}</label>${mSeg('lang',[['ko','한국어'],['en','English']],i18n.lang)}</div>`;
function renderMenu(){const top=mbox.scrollTop;let h;
  const backBtn=menuFrom==='game'?`<button class="go" data-act="back">${tx('m.resume')}</button>`:`<button data-act="back">${tx('m.back')}</button>`;
  if(menuScreen==='main')h=`<div class="mtitle">CUT &amp; DRIED</div><div class="msub">${tx('m.sub')}</div>${langRow()}
    <div class="mrow"><label>${tx('m.mode')}</label>${mSeg('mode',[['auto',tx('m.auto')],['manual',tx('m.manual')]],autoOn?'auto':'manual')}</div>
    <div class="mhint">${tx(autoOn?'m.autoD':'m.manualD')}</div>
    <div class="mbtns">${game.saves.has()?`<button class="go big" data-act="start">${tx('m.continue',game.saves.load().day)}</button><button data-act="new">${tx('m.new')}</button>`:`<button class="go big" data-act="new">${tx('m.start')}</button>`}<button data-act="how">${tx('m.how')}</button><button data-act="opts">${tx('m.opts')}</button></div>`;
  else if(menuScreen==='how')h=`<div class="mhead">${tx('m.how')}</div>${HOW[i18n.lang].map(([t,b])=>`<div class="hsec"><h3>${t}</h3>${b}</div>`).join('')}<div class="mbtns side">${backBtn}</div>`;
  else if(menuScreen==='day'){const q=game.report,line=(k,v,c)=>`<tr><td>${k}</td><td style="text-align:right" class="${c||''}">${v}</td></tr>`,ledger=(o,sign,c)=>Object.entries(o).map(([k,v])=>line(tx('led.'+k),sign+'$'+v,c)).join('');
    h=`<div class="mhead">${tx('day.title',q.day)}</div><table style="width:100%;border-collapse:collapse">${ledger(q.revenue,'')}${ledger(q.expenses,'−','bad')}${line(tx('day.totalRev'),'$'+q.totalRevenue)}${line(tx('day.totalExp'),'−$'+q.totalExpenses,'bad')}${line(tx('day.profit'),(q.profit<0?'−$':'$')+Math.abs(q.profit),q.profit<0?'bad':'good')}${line(tx('day.rep'),(q.reputation>=0?'+':'')+q.reputation.toFixed(1))}</table><div class="mbtns"><button class="go big" data-act="nextday">${tx('day.next')}</button></div>`;}
  else h=`<div class="mhead">${tx('m.opts')}</div>${langRow()}
    <div class="mrow"><label>${tx('m.time')}</label>${mSeg('time',TM.map(v=>[v,tx('m.t.'+v)]),timeMode)}</div>
    <div class="mrow"><label>${tx('m.wx')}</label>${mSeg('wx',WM.map(v=>[v,tx('m.w.'+v)]),wxMode)}</div>
    <div class="mrow"><label>${tx('m.speed')}</label>${mSeg('spd',[[1,'×1'],[3,'×3']],speed)}</div>
    <div class="mbtns side">${backBtn}</div>`;
  mbox.innerHTML=h;mbox.scrollTop=top;}
function openMenu(s,from){menuScreen=s;menuFrom=from;mbox.scrollTop=0;$('#menu').classList.remove('hide');renderMenu();mbox.scrollTop=0;}
function closeMenu(){$('#menu').classList.add('hide');}
function openDay(){game.startDay();spawnTimer=1.5;paused=false;}
function startGame(fresh){if(fresh)game.saves.clear();else restoreGame();started=true;closeMenu();document.body.classList.remove('inmenu');syncChairs();openDay();game.updateProgress();updateHud();renderPanel(true);}
mbox.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const [a,v]=b.dataset.act.split(':');
  if(a==='start')startGame(false);
  else if(a==='new')startGame(true);
  else if(a==='nextday'){game.nextDay();spawnTimer=1.5;paused=false;closeMenu();updateHud();renderPanel(true);}
  else if(a==='how'||a==='opts')openMenu(a,'main');
  else if(a==='back'){if(menuFrom==='game'){paused=false;closeMenu();}else openMenu('main','main');}
  else if(a==='lang')setLang(v);
  else{if(a==='mode')setAuto(v==='auto');if(a==='time')timeMode=v;if(a==='wx')wxMode=v;if(a==='spd')speed=+v;syncCtrl();renderMenu();}});
function boot(){const fonts=document.fonts?Promise.all([document.fonts.load('16px VT323'),document.fonts.load('14px Silkscreen'),document.fonts.load('13px Galmuri11','가')]):Promise.resolve();
  Promise.race([fonts,new Promise(r=>setTimeout(r,2500))]).catch(()=>{}).then(()=>LOADER.ready(()=>openMenu('main','main')));}
syncCtrl();

/* ================= main loop ================= */
const clipPlane=new THREE.Plane(V(0,-1,0),-0.03);
resize();addEventListener('resize',resize);
renderPanel(true);updateHud();
syncChairs();
let lastT=performance.now(),hudT=0,clockT=0,realT=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-lastT)/1000);lastT=now;realT+=dt;
  if(started&&!paused)simStep(dt*(styling?1:speed));else figs.forEach(f=>f.pose(0));
  stylingTick(dt);
  updateLights(dt);updateCam(dt);envStep(dt,realT);updatePops(dt);
  if((hudT+=dt)>.25){hudT=0;if(started){updateHud();renderPanel(false);}}
  if((clockT+=dt)>1){clockT=0;drawClock();}
  if(wet>.03){world.scale.y=-1;puddles.visible=false;const rv=rain.visible;rain.visible=false;renderer.clippingPlanes=[clipPlane];
    renderer.setRenderTarget(refRT);renderer.render(scene,cam);world.scale.y=1;renderer.clippingPlanes=[];puddles.visible=true;rain.visible=rv;}
  renderer.setRenderTarget(rt);renderer.render(scene,cam);
  renderer.setRenderTarget(null);renderer.render(post,postCam);
  if(!booted){booted=true;boot();}}
requestAnimationFrame(frame);
