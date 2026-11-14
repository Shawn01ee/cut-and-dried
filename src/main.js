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
import { PROCESS_MINUTES } from './employees/Employee.js';
import { nameColour, rankMark } from './ui/nameStyle.js';
import { NavGrid } from './building/NavGrid.js';
import { paintSign } from './rendering/pixelFont.js';
import { BRANCH_X, siteOf } from './building/SalonLayout.js';
import { FURNITURE } from './building/FurnitureCatalog.js';
import { CHANNELS } from './tycoon/Marketing.js';
import { AudioManager } from './audio/AudioManager.js';
import { IncidentCard } from './ui/IncidentCard.js';

const game = new TycoonGame(), i18n = new I18n(window.__lang), audio = new AudioManager(game.bus);
const tx = (k, ...a) => i18n.t(k, ...a), nm = n => i18n.name(n);

/* ================= renderer & post ================= */
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x7ea2d0);
const world=new THREE.Group();scene.add(world);
let W=320,H=240,PIX=3,rt=null,pixScale=1;
const postMat=new THREE.ShaderMaterial({
  uniforms:{tColor:{value:null},tDepth:{value:null},res:{value:new THREE.Vector2()},off:{value:new THREE.Vector2()},palLab:{value:PAL_LAB},palRgb:{value:PAL_RGB},edge:{value:0.0028}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
  fragmentShader:`precision highp float;uniform sampler2D tColor,tDepth;uniform vec2 res,off;uniform vec3 palLab[64];uniform vec3 palRgb[64];uniform float edge;varying vec2 vUv;
  vec3 lab(vec3 c){c=max(c,vec3(1e-6));float l=pow(0.4122214708*c.r+0.5363325363*c.g+0.0514459929*c.b,1./3.);float m=pow(0.2119034982*c.r+0.6806995451*c.g+0.1073969566*c.b,1./3.);float s=pow(0.0883024619*c.r+0.2817188376*c.g+0.6299787005*c.b,1./3.);
  return vec3(0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s);}
  void main(){vec2 px=1./res;vec2 uv=(floor(vUv*res-off)+.5)*px;vec3 c=texture2D(tColor,uv).rgb;float d=texture2D(tDepth,uv).r;
  float n=max(max(texture2D(tDepth,uv+vec2(px.x,0.)).r,texture2D(tDepth,uv-vec2(px.x,0.)).r),max(texture2D(tDepth,uv+vec2(0.,px.y)).r,texture2D(tDepth,uv-vec2(0.,px.y)).r));
  if(n-d>edge)c*=.3;vec3 q=lab(c);float bd=1e9;vec3 o=vec3(0.);
  for(int i=0;i<64;i++){vec3 e=palLab[i]-q;e.x*=1.35;float dd=dot(e,e);if(dd<bd){bd=dd;o=palRgb[i];}}
  gl_FragColor=vec4(o,1.);}`,
  depthTest:false,depthWrite:false});
const post=new THREE.Scene();const pq=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat);pq.frustumCulled=false;post.add(pq);
const postCam=new THREE.Camera();

function resize(){
  const vw=innerWidth,vh=innerHeight;
  PIX=Math.max(1,Math.round(Math.max(2,Math.round(Math.min(vw,vh)/250))*pixScale));
  W=Math.floor(vw/PIX);H=Math.floor(vh/PIX);
  renderer.setSize(W*PIX,H*PIX);
  rt&&rt.dispose();
  const o={type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter};
  rt=new THREE.WebGLRenderTarget(W,H,o);rt.depthTexture=new THREE.DepthTexture(W,H);rt.depthTexture.type=THREE.UnsignedIntType;
  postMat.uniforms.tColor.value=rt.texture;postMat.uniforms.tDepth.value=rt.depthTexture;postMat.uniforms.res.value.set(W,H);
}

/* ================= camera ================= */
const cam=new THREE.OrthographicCamera(-1,1,1,-1,0.1,80);
let camK=0,camAz=Math.PI/4,zoom=1,zoomGoal=1;const camOff=new THREE.Vector2();const EL=Math.atan(1/Math.SQRT2);const camTarget=V(0,.55,1.2);
let camBlend=0,viewScale=1;const camHome=V(0,.55,1.2),camClose=V(),camPan=V(0,.55,1.2);
function updateCam(dt){
  zoom+=(zoomGoal-zoom)*Math.min(1,dt*10);if(Math.abs(zoomGoal-zoom)<1e-3)zoom=zoomGoal;
  const goal=Math.PI/4+camK*Math.PI/2;camAz+=(goal-camAz)*Math.min(1,dt*9);if(Math.abs(goal-camAz)<1e-3)camAz=goal;
  camBlend+=((styling?1:0)-camBlend)*Math.min(1,dt*6);if(Math.abs((styling?1:0)-camBlend)<.002)camBlend=styling?1:0;camPan.lerp(camHome,Math.min(1,dt*4));camTarget.copy(camPan).lerp(camClose,camBlend);
  const a=W/H,vh=lerp(Math.max(10.8,12.8/a)*viewScale/zoom,Math.max(2.6,1.7/a),camBlend);
  cam.left=-vh*a/2;cam.right=vh*a/2;cam.top=vh/2;cam.bottom=-vh/2;cam.updateProjectionMatrix();
  cam.position.copy(camTarget).add(V(Math.sin(camAz)*Math.cos(EL),Math.sin(EL),Math.cos(camAz)*Math.cos(EL)).multiplyScalar(40));
  cam.lookAt(camTarget);cam.updateMatrixWorld();
  const u=vh/H,r=V().setFromMatrixColumn(cam.matrixWorld,0),up=V().setFromMatrixColumn(cam.matrixWorld,1);
  const x=cam.position.dot(r),y=cam.position.dot(up);
  // Snap to whole texels so pixels stay stable, then shift the upscaled picture by what was rounded off so motion stays smooth.
  const dx=Math.round(x/u)*u-x,dy=Math.round(y/u)*u-y;camOff.set(dx/u,dy/u);postMat.uniforms.off.value.copy(camOff);
  cam.position.addScaledVector(r,dx).addScaledVector(up,dy);cam.updateMatrixWorld();
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
const S=new SB(),extras=[];
// base slab and the pavement in front of the door
S.box(9.0,.5,9.6,0x45404f,0,-.27,1.4);
S.box(9,.06,3,0xb7a99a,0,-.02,4.7);S.box(9,.1,.18,0x7d7884,0,0,6.11);
// salon floor: large pale stone tiles with thin joints
S.box(8,.06,6,0xdcd9dc,0,-.02,0);
/** A flat tiled surface drawn as a pixel texture, so joints stay crisp one-pixel lines. */
function tiledSurface(w,d,fill,joint,x,z,parent=world){const P=16,tex=canvasTex(w*P,d*P,g=>{g.fillStyle=fill;g.fillRect(0,0,w*P,d*P);g.fillStyle=joint;for(let i=0;i<=w;i++)g.fillRect(Math.min(i*P,w*P-1),0,1,d*P);for(let j=0;j<=d;j++)g.fillRect(0,Math.min(j*P,d*P-1),w*P,1);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tex}));m.position.set(x,.012,z);m.receiveShadow=true;parent.add(m);return m;}
/** Salon floor: pale large-format tiles, kept plain so people and furniture stand out. */
function salonFloor(w,d,x,z,parent=world){return tiledSurface(w,d,'#dcd9dc','#bdb9c0',x,z,parent);}
salonFloor(8,6,0,0);tiledSurface(9,3,'#b7a99a','#9a8f84',0,4.7);
// lamp posts
[[-3.7,4.5],[4.3,3.7]].forEach(([x,z])=>{S.box(.14,3.3,.14,0x1d1a26,x,1.65,z).box(.3,.08,.3,0x1d1a26,x,3.32,z);});
// clock post and barber pole base
S.box(.12,2.6,.12,0x1d1a26,2.7,1.3,5.7).box(.5,.5,.2,0x1d1a26,2.7,2.85,5.7);
S.box(.24,.16,.24,0x45404f,-1.2,.08,3.4).box(.18,.12,.18,0xbdb9c0,-1.2,1.72,3.4).box(.18,.12,.18,0xbdb9c0,-1.2,.2,3.4);
const salonMesh=S.build();

// lamp heads (emissive)
[[-3.7,4.5],[4.3,3.7]].forEach(([x,z])=>{const m=new THREE.Mesh(BOX,LAMP);m.scale.set(.22,.12,.22);m.position.set(x,3.22,z);world.add(m);extras.push(m);});

/* walls with cutaway */
// Greige plaster walls, steel window frames and a warm cove light along the top, after the real Ciel Ground.
const WALLC=0xb7a99a,SKIRT=0x45404f,TRIM=0x7d7884;
function makeWall(along,c,segs,n){
  const full=new SB(),low=new SB(),glass=[];
  segs.forEach(([a,b,t])=>{const L=b-a,m=(a+b)/2;
    const put=(sb,y0,y1,col,th=.16)=>{const h=y1-y0;if(along==='x')sb.box(L,h,th,col,m,y0+h/2,c);else sb.box(th,h,L,col,c,y0+h/2,m);};
    if(t==='s'){put(full,0,2.6,WALLC);put(low,0,.32,WALLC);}
    if(t==='w'){put(full,0,.85,WALLC);put(full,2.15,2.6,WALLC);put(full,.82,.88,TRIM,.2);put(full,2.12,2.18,TRIM,.2);put(low,0,.32,WALLC);glass.push([L,m]);}
    if(t==='d'){put(full,2.25,2.6,WALLC);put(full,2.22,2.27,TRIM,.2);}
    if(t!=='d'){put(full,0,.18,SKIRT,.2);put(low,0,.18,SKIRT,.2);}
  });
  const gF=new THREE.Group(),gL=new THREE.Group();world.add(gF);world.add(gL);full.build(gF);low.build(gL);
  glass.forEach(([L,m])=>{const g=new THREE.Mesh(BOX,GLASS);if(along==='x'){g.scale.set(L,1.24,.04);g.position.set(m,1.5,c);}else{g.scale.set(.04,1.24,L);g.position.set(c,1.5,m);}gF.add(g);});
  const a=segs[0][0],b=segs[segs.length-1][1],cove=new THREE.Mesh(BOX,LAMP);cove.raycast=noRay;
  if(along==='x'){cove.scale.set(b-a,.05,.05);cove.position.set((a+b)/2,2.5,c-n.z*.11);}else{cove.scale.set(.05,.05,b-a);cove.position.set(c-n.x*.11,2.5,(a+b)/2);}gF.add(cove);
  return {n,full:gF,low:gL};
}
/** Every wall, with the salon sizes it stands at. The first four are the original room. */
const walls=[];
function addWall(show,...args){const w=makeWall(...args);w.show=show;walls.push(w);return w;}
addWall(t=>t<1,'x',-3.08,[[-4.16,4.16,'s']],V(0,0,-1));
addWall(()=>true,'x',3.08,[[-4.16,-2.5,'s'],[-2.5,-1.5,'d'],[-1.5,-0.6,'s'],[-0.6,3.4,'w'],[3.4,4.16,'s']],V(0,0,1));
addWall(()=>true,'z',-4.08,[[-3,-1.6,'s'],[-1.6,0.2,'w'],[0.2,3,'s']],V(-1,0,0));
addWall(t=>t<2,'z',4.08,[[-3,-0.4,'s'],[-0.4,1.6,'w'],[1.6,3,'s']],V(1,0,0));
// size 2: the back of the shop
const backWall=addWall(t=>t===1||t===2,'x',-5.08,[[-4.16,4.16,'s']],V(0,0,-1));
addWall(t=>t>=1,'z',-4.08,[[-5.16,-3,'s']],V(-1,0,0));
addWall(t=>t===1,'z',4.08,[[-5.16,-3,'s']],V(1,0,0));
// size 3: the whole shop next door, front to back
addWall(t=>t>=2,'x',3.08,[[4.16,5,'s'],[5,7.4,'w'],[7.4,8.24,'s']],V(0,0,1));
addWall(t=>t===2||t===3,'z',8.16,[[-5.16,-3.6,'s'],[-3.6,-1.8,'w'],[-1.8,-.8,'s'],[-.8,1.2,'w'],[1.2,3,'s']],V(1,0,0));
addWall(t=>t===2,'x',-5.08,[[4.16,8.24,'s']],V(0,0,-1));
// size 4: a deeper room across the whole back
const rearWall=addWall(t=>t===3||t===4,'x',-7.08,[[-4.16,8.24,'s']],V(0,0,-1));
addWall(t=>t>=3,'z',-4.08,[[-7.16,-5,'s']],V(-1,0,0));
addWall(t=>t===3,'z',8.16,[[-7.16,-5,'s']],V(1,0,0));
// size 5: another shop next door, front to back
addWall(t=>t>=4,'x',3.08,[[8.16,9,'s'],[9,11.4,'w'],[11.4,12.24,'s']],V(0,0,1));
addWall(t=>t>=4,'z',12.16,[[-7.16,-5.2,'s'],[-5.2,-3.2,'w'],[-3.2,-1,'s'],[-1,1,'w'],[1,3,'s']],V(1,0,0));
addWall(t=>t===4,'x',-7.08,[[8.16,12.24,'s']],V(0,0,-1));
// size 6: the whole back, deeper again
const rear2Wall=addWall(t=>t>=5,'x',-9.08,[[-4.16,12.24,'s']],V(0,0,-1));
addWall(t=>t>=5,'z',-4.08,[[-9.16,-7,'s']],V(-1,0,0));
addWall(t=>t>=5,'z',12.16,[[-9.16,-7,'s']],V(1,0,0));
/** Floor, slab and a ceiling light for an area that opens with an expansion. */
function zoneGroup(slab,floor,light){const g=new THREE.Group();g.visible=false;world.add(g);const A=new SB();A.box(...slab,0x45404f,slab[3],-.27,slab[4]);A.box(floor[0],.06,floor[1],0xdcd9dc,floor[2],-.02,floor[3]);A.build(g);
  salonFloor(floor[0],floor[1],floor[2],floor[3],g);const l=new THREE.PointLight(0xffd98a,0,8,1.5);l.position.set(light[0],2.4,light[1]);g.add(l);inLights.push(l);return g;}
const backGroup=zoneGroup([9,.5,2.4,0,-4.1],[8,2,0,-4],[0,-4]);
const annexGroup=zoneGroup([4.1,.5,11.6,6.55,.4],[4,8,6,-1],[6,-1]);
{const A=new SB();A.box(4.1,.06,3,0xb7a99a,6.55,-.02,4.7).box(4.1,.1,.18,0x7d7884,6.55,0,6.11);A.build(annexGroup);tiledSurface(4,3,'#b7a99a','#9a8f84',6.5,4.7,annexGroup);}
const rearGroup=zoneGroup([13.1,.5,2.4,2.05,-6.1],[12,2,2,-6],[2,-6]);
const annex2Group=zoneGroup([4.1,.5,13.6,10.55,-.6],[4,10,10,-2],[10,-2]);
{const A=new SB();A.box(4.1,.06,3,0xb7a99a,10.55,-.02,4.7).box(4.1,.1,.18,0x7d7884,10.55,0,6.11);A.build(annex2Group);tiledSurface(4,3,'#b7a99a','#9a8f84',10.5,4.7,annex2Group);}
const rear2Group=zoneGroup([17.1,.5,2.4,4.05,-8.1],[16,2,4,-8],[4,-8]);
// sign on the back wall, moved back with the wall when the shop grows
const signTex=canvasTex(140,22,g=>paintSign(g,140,22,'CIEL GROUND'));
function mountSign(wall,z,x=0){const sb=new SB();sb.box(4.5,.82,.12,0xf6f3ee,x,2.95,z);sb.box(.08,.4,.08,TRIM,x-1.8,2.6,z).box(.08,.4,.08,TRIM,x+1.8,2.6,z);sb.build(wall.full);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(4.4,.69),new THREE.MeshBasicMaterial({map:signTex}));p.position.set(x,2.95,z+.07);wall.full.add(p);}
// shelves of hair products on the wall behind reception (decoration only)
{const sb=new SB(),X=-3.99,COLS=[0x2f6fd6,0xe25c8f,0x1fa39a,0xffd98a,0xf6f3ee,0x1d1a26,0xc8642a,0x8a4fc2,0xf6f3ee,0x5f9e45];let k=0;
  for(const y of [1.42,1.8,2.18]){sb.box(.26,.04,1.7,0xb88a5a,X+.13,y,1.3);
    for(let z=.6;z<=2.02;z+=.13){const h=.12+((k*7)%5)*.025,w=.07+((k*3)%3)*.01;sb.box(w,h,.07,COLS[k%COLS.length],X+.12,y+.02+h/2,z);if(k%4===1)sb.box(.03,.04,.03,0x1d1a26,X+.12,y+.04+h,z);k++;}
    const glow=new THREE.Mesh(BOX,LAMP);glow.raycast=noRay;glow.scale.set(.04,.03,1.62);glow.position.set(X+.24,y-.03,1.3);walls[2].full.add(glow);}
  sb.box(.04,.34,1.0,0xf6f3ee,X+.02,2.48,1.3);sb.build(walls[2].full);}
mountSign(walls[0],-3.08);mountSign(backWall,-5.08);mountSign(rearWall,-7.08,2);mountSign(rear2Wall,-9.08,4);
// storefront sign above the window, white with black lettering like the real shop
{const sb=new SB();sb.box(3.4,.5,.1,0xf6f3ee,1.4,2.36,3.21);sb.build(walls[1].full);const p=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.42),new THREE.MeshBasicMaterial({map:signTex}));p.position.set(1.4,2.36,3.27);walls[1].full.add(p);}
// clock
const clockTex=canvasTex(20,20,g=>{});
function drawClock(){const g=clockTex.userData.g;const d=new Date();g.fillStyle='#1d1a26';g.fillRect(0,0,20,20);g.fillStyle='#f6f3ee';
  for(let y=0;y<20;y++)for(let x=0;x<20;x++){const r=Math.hypot(x-9.5,y-9.5);if(r<8.6)g.fillRect(x,y,1,1);}
  g.fillStyle='#1d1a26';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.fillRect(Math.round(9.5+Math.sin(a)*7.4-.5),Math.round(9.5-Math.cos(a)*7.4-.5),1,1);}
  const hand=(a,L,c)=>{g.fillStyle=c;for(let t=0;t<=L;t+=.4)g.fillRect(Math.floor(9.5+Math.sin(a)*t),Math.floor(9.5-Math.cos(a)*t),1,1);};
  const h=d.getHours()%12+d.getMinutes()/60,mi=d.getMinutes()+d.getSeconds()/60;
  hand(h/12*Math.PI*2,4.2,'#1d1a26');hand(mi/60*Math.PI*2,6.6,'#1d1a26');hand(d.getSeconds()/60*Math.PI*2,6.8,'#c24a46');clockTex.needsUpdate=true;}
drawClock();
[0,Math.PI].forEach(r=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(.44,.44),new THREE.MeshBasicMaterial({map:clockTex}));p.position.set(2.7,2.85,5.7+(r?-.105:.105));p.rotation.y=r;world.add(p);extras.push(p);});
// barber pole
const poleTex=canvasTex(8,16,g=>{for(let y=0;y<16;y++)for(let x=0;x<8;x++){const k=((x+y)%12);g.fillStyle=k<4?'#d8314a':k<6?'#f6f3ee':k<10?'#2f6fd6':'#f6f3ee';g.fillRect(x,y,1,1);}});
poleTex.wrapS=poleTex.wrapT=THREE.RepeatWrapping;poleTex.repeat.set(1,2);
{const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,1.4,6),new THREE.MeshLambertMaterial({map:poleTex}));p.position.set(-1.2,.96,3.4);p.castShadow=true;world.add(p);extras.push(p);}
// selection marker
const marker=new THREE.Mesh(new THREE.ConeGeometry(.16,.32,4),M(0xffd98a));marker.rotation.x=Math.PI;world.add(marker);marker.raycast=noRay;

/* clippings */
const NC=900,clipMesh=new THREE.InstancedMesh(BOX,HAIRMAT,NC);clipMesh.frustumCulled=false;clipMesh.raycast=noRay;clipMesh.count=0;world.add(clipMesh);
const clips=[];let clipHead=0;const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_s=V(),_c=new THREE.Color();
for(let i=0;i<NC;i++){clipMesh.setColorAt(i,_c.set(0));}
function spawnClip(p,lab){const [r,g,b]=lab2lin(lab.L,lab.a,lab.b);const o={p:p.clone(),v:V(rand(-.25,.25),rand(0,.3),rand(-.25,.25)),landed:false,alive:true,ry:rand(0,3)};
  if(clips.length<NC)clips.push(o);else{clips[clipHead]=o;clipHead=(clipHead+1)%NC;}const i=clips.indexOf(o);clipMesh.setColorAt(i,_c.setRGB(r,g,b,THREE.LinearSRGBColorSpace));clipMesh.instanceColor.needsUpdate=true;}

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
    if(o.staffHair!=null){const c=o.staffHair,hd=o.hairdo||(o.long?'long':o.bob?'bob':o.bun?'bun':'short');
      if(hd==='curly'){hb(.33,.16,.33,c,0,.15,-.01);hb(.07,.2,.27,c,-.155,.04,-.03);hb(.07,.2,.27,c,.155,.04,-.03);hb(.31,.26,.07,c,0,.02,-.145);hb(.09,.07,.09,c,-.09,.25,.05);hb(.09,.07,.09,c,.08,.25,-.06);hb(.08,.06,.08,c,0,.24,.1);}
      else if(hd==='buzz'){hb(.255,.035,.265,c,0,.13,-.003);hb(.255,.14,.025,c,0,.06,-.126);hb(.02,.09,.18,c,-.122,.07,-.03);hb(.02,.09,.18,c,.122,.07,-.03);}
      else{hb(.27,.08,.28,c,0,.14,-.005);hb(.27,.2,.06,c,0,.03,-.125);hb(.03,.14,.2,c,-.13,.06,-.03);hb(.03,.14,.2,c,.13,.06,-.03);}
      if(hd==='long')hb(.25,.32,.05,c,0,-.18,-.14);if(hd==='bun')hb(.12,.12,.12,c,0,.2,-.12);
      if(hd==='bob'){hb(.05,.27,.2,c,-.135,-.035,-.02);hb(.05,.27,.2,c,.135,-.035,-.02);hb(.29,.27,.06,c,0,-.035,-.135);hb(.05,.22,.02,c,-.1,.02,.132);hb(.04,.17,.02,c,.1,.045,.132);hb(.1,.045,.02,c,-.06,.098,.132);}}
    if(o.beard!=null){const c=o.beard;hb(.2,.07,.03,c,0,-.105,.122);hb(.03,.1,.1,c,-.115,-.07,.08);hb(.03,.1,.1,c,.115,-.07,.08);hb(.1,.022,.02,c,0,-.048,.128);}
    if(o.shades){hb(.21,.05,.02,0x0d0b14,0,.015,.132);hb(.02,.02,.14,0x0d0b14,-.115,.025,.06);hb(.02,.02,.14,0x0d0b14,.115,.025,.06);}
    this.tool=new THREE.Group();this.root.add(this.tool);this.toolKind=null;
    this.pos=V();this.yaw=0;this.mode='stand';this.path=[];this.cb=null;this.phase=rand(0,6);this.seatH=.5;this.footY=.06;this.tilt=0;this.look=0;
    this.handL=null;this.handR=null;this.clapT=0;this.toolAim=null;this.spd=1.25;figs.push(this);}
  setTool(k){if(this.toolKind===k)return;this.toolKind=k;this.tool.clear();if(!k)return;
    const b=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(BOX,M(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;this.tool.add(m);};
    if(k==='scissors'){b(.014,.14,.01,0xdcd9dc,-.012,.08,0);b(.014,.14,.01,0xdcd9dc,.012,.08,0);b(.055,.03,.016,0xd8314a,0,.01,0);}
    if(k==='comb')b(.022,.15,.008,0x1d1a26,0,.08,0);
    if(k==='brush'){b(.02,.17,.02,0x1d1a26,0,.08,0);b(.04,.05,.03,0x8a4fc2,0,.18,0);}
    if(k==='dryer'){b(.05,.1,.05,0x1d1a26,0,.04,0);b(.08,.08,.22,0xe25c8f,0,.11,.07);}
    if(k==='broom'){b(.03,1.0,.03,0x8a6040,0,.48,0);b(.34,.1,.08,0xe8c27a,0,.98,0);}
    if(k==='bowl'){b(.13,.06,.13,0x1d1a26,0,.02,.04);}
    if(k==='cup'){b(.07,.09,.07,0xf6f3ee,0,.05,0);b(.05,.01,.05,0x5e3d24,0,.1,0);}
    if(k==='phone'){b(.05,.1,.012,0x1d1a26,0,.05,0);}
    if(k==='juice'){b(.06,.12,.06,0xffb15a,0,.06,0);b(.012,.06,.012,0xd8314a,.015,.14,0);}}
  walkTo(pts,cb){this.path=pts.map(p=>p.clone());this.cb=cb||null;if(this.mode==='sit')this.mode='stand';}
  remove(){world.remove(this.root);figs.splice(figs.indexOf(this),1);}
  update(dt){
    let moving=false;
    if(this.path.length){const t=this.path[0],d=V(t.x-this.pos.x,0,t.z-this.pos.z),L=d.length(),st=this.spd*dt;
      if(L<=st){this.pos.set(t.x,0,t.z);this.path.shift();if(!this.path.length){this.mode='stand';const cb=this.cb;this.cb=null;cb&&cb();}}
      else{this.pos.addScaledVector(d,st/L);this.yaw=angLerp(this.yaw,Math.atan2(d.x,d.z),Math.min(1,dt*10));moving=true;}}
    if(moving){this.mode='walk';this.phase+=dt*this.spd*5.4;}
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
    for(const sd of [-1,1]){const sh=chest.clone().addScaledVector(r,sd*.23);let tg=sd<0?this.handL:this.handR;
      if(this.clapT>0){const k=Math.abs(Math.sin(this.clapT*18));tg=chest.clone().addScaledVector(fz,.3).addScaledVector(s,.02).addScaledVector(r,sd*(.02+.07*k));}
      else if(!tg){if(sit)tg=hips.clone().addScaledVector(f,.3).addScaledVector(r,sd*.15).addScaledVector(UP,.1);
        else{const ph=this.phase+(sd<0?Math.PI:0);tg=sh.clone().addScaledVector(UP,-.53).addScaledVector(f,walk?Math.sin(ph)*.16:.03).addScaledVector(r,sd*.05);}}
      const pole=f.clone().multiplyScalar(-1).addScaledVector(r,sd*.7).addScaledVector(UP,-.6);
      const [el,hd]=ik(sh,tg,.29,.28,pole);bone(sd<0?this.uaL:this.uaR,sh,el,.11);bone(sd<0?this.faL:this.faR,el,hd,.09);
      if(sd>0){this.tool.position.copy(hd);const dir=this.toolAim?this.toolAim.clone().sub(hd).normalize():hd.clone().sub(el).normalize();this.tool.quaternion.setFromUnitVectors(UP,dir);}}
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
// Red is kept for difficult clients so they stand out.
const SHIRTS=[0x2f6fd6,0x1fa39a,0xffb15a,0x8a4fc2,0x5f9e45,0xf2a0c0,0x7fb6f0,0xe8c27a,0xdcd9dc],VILLAIN_SHIRT=0xd8314a;
const PANTS=[0x1d1a26,0x2a4478,0x45404f,0x5e3d24,0x16264e];
const STY=game.staff.candidates,OWNER=game.staff.owner;
const stations=[];
STY.forEach(s=>{s.fig=new Fig({skin:s.skin??pick(SKINS),shirt:0x45404f,pants:0x2e2a38,apron:s.apron,staffHair:s.hair,hairdo:s.hairdo,shades:s.shades,beard:s.beard?s.hair:null});});
OWNER.fig=new Fig({skin:0xf6d6bd,shirt:0xdcd9dc,pants:0x1d1a26,staffHair:OWNER.hair,bob:true,sleeveless:true});
const VAC={name:'Vacant',style:'Vacant',apron:0x5f5a68,spd:1,stats:{served:0,sum:0,earn:0}},OWNER_IDLE=V(-1.2,0,.4);
STY.forEach(s=>{s.fig.root.visible=false;});
OWNER.floating=false;
const ownerStation=()=>stations.find(s=>s.sty===OWNER);
const quarter=(x,z,r)=>[[x,z],[z,-x],[-x,-z],[-z,x]][((r%4)+4)%4];
/** A styling chair's anchor points in the world, from its furniture item and the chair's place on it. */
function frameStation(st){const it=st.item,[ox,oz,t]=FURNITURE[it.id].chairs[st.k],yaw=(it.rotation+t)*Math.PI/2;
  const at=(lx,lz)=>{const [rx,rz]=quarter(lx,lz,t),p=game.layout.toWorld(it,ox+rx,oz+rz);return V(p.x,0,p.z);};
  Object.assign(st,{yaw,face:yaw+Math.PI,at,rot:v=>v.clone().applyAxisAngle(UP,yaw),chair:at(0,.45),stand:at(0,1.05),approach:at(0,1.35)});}
function makeStation(item,k){const st={item,k,sty:VAC,vacant:true,cust:null,state:'vacant',plan:null,ops:[],opi:0,timer:0,touched:false,washing:null,sweep:null};frameStation(st);return st;}
const recep=new Fig({skin:0xc98e66,shirt:0x8a4fc2,pants:0x1d1a26,staffHair:0x2e1d14,bun:true});recep.pos.set(-3.6,0,1.0);recep.yaw=Math.PI/2;recep.mode='sit';recep.seatH=.72;recep.footY=.3;
// Assistants wash hair at the shampoo booths and sweep up. Each has a figure and at most one job.
const HELPER_LOOKS={hugo:{skin:0xe7b892,shirt:0xffb15a,pants:0x2a4478,staffHair:0x8f5a2e},jin:{skin:0xc98e66,shirt:0x1d1a26,pants:0x2e2a38,staffHair:0x16110f},tess:{skin:0xf6d6bd,shirt:0xdcd9dc,pants:0x2a4478,staffHair:0xc8642a,long:true}};
const helpers=game.staff.support.filter(e=>e.effect==='tidy').map(e=>{const fig=new Fig({...HELPER_LOOKS[e.id],apron:e.apron});fig.root.visible=false;fig.pos.set(3.6,0,-.85);fig.yaw=Math.PI;return {e,fig,task:null,idle:V(3.6,0,-.85),idleYaw:Math.PI,booth:null};});
const friends=[];
const bench=[];
const terr=[],procSeats=[];
const DOOR_IN=V(-2,0,2.45);
/** Each salon's way in from the street: where clients appear, the street door, just outside and just inside. */
const SITE_DOORS=[0,BRANCH_X].map(x=>({street:V(x+4.1,0,4.7),door:V(x-2,0,4.4),out:V(x-2,0,3.6),inn:V(x-2,0,2.45)}));
const furnitureView=new FurnitureView(world,SB,terr,game.layout,LAMP,procSeats),nav=new NavGrid(game.layout);
const build=new BuildMode(game.layout,game.economy,furnitureView,{validate:(c,ex)=>nav.wouldConnect(c,ex),blockedBy:(c,ex)=>nav.blockedBy(c,ex),canModify:it=>canModify(it),canMove:it=>canMove(it),queueMove:(it,x,z,r)=>queueMove(it,x,z,r),canSell:it=>canSell(it),onChange:()=>{syncFurniture();renderPanel(true);}});
/** A walk to `to` that goes around the furniture. */
function route(from,to){return [...nav.path(from,to).map(p=>V(p.x,0,p.z)),to.clone()];}
const custs=[],queue=[];

function lenDesc(L){return tx('len.'+(L<8?'pixie':L<18?'chin':L<28?'shoulder':L<40?'midback':'long'));}
const natName=i=>i18n.lang==='ko'?NAT_KO[i]:NATURAL[i][0], wantName=i=>i18n.lang==='ko'?WANT_KO[i]:WANT[i][0], dyeName=i=>i18n.lang==='ko'?DYE_KO[i]:DYES[i].n;
const colName=o=>o.col.t==='nat'?tx('naturalOf',natName(o.col.i)):wantName(o.col.i);
function orderText(o){return `${tx('shape.'+o.shape)} · ${o.L} cm (${lenDesc(o.L)}) · ${colName(o)} · ${tx('wave.'+WAVES[o.wave])}`;}
function spawnCustomer(){
  if(custs.filter(c=>c.state!=='gone').length>=40)return;
  const site=pickSite(),D=SITE_DOORS[site],c=game.newCustomer(new Set(custs.map(q=>q.name)),true,site),fig=new Fig({skin:pick(SKINS),shirt:c.villain?VILLAIN_SHIRT:pick(SHIRTS),pants:c.villain?0x0d0b14:pick(PANTS),beard:c.look.beard});
  c.fig=fig;c.hm=new Hair(fig.head,fig);fig.pos.copy(D.street);fig.yaw=-Math.PI/2;c.fadeIn=0;setFade(fig,.01);
  c.tag=document.createElement('div');c.tag.className='tag'+(c.villain?' villain':'');c.tag.innerHTML='<i></i>';c.tag.style.display='none';$('#pops').appendChild(c.tag);
  custs.push(c);if(c.vip)popup(tx('vipArrive',nm(c.name)),recep.head,'big');if(c.influencer)popup(tx('inf.arrive',c.influencer.handle,c.influencer.followers.toLocaleString()),recep.head,'big');
  fig.walkTo([D.door,D.out,D.inn],()=>{if(!game.clock.isOpen){leave(c,'full');return;}audio.play('chime');const mine=s=>!s.occ&&siteOf(s.pos.x)===site,seat=bench.find(mine)||terr.find(mine);
    if(!seat){popup(tx('noSeats'),fig.head,'');audio.play('bad');game.customerTurnedAway(c);leave(c,'full');return;}
    seat.occ=c;c.seat=seat;fig.walkTo([...route(fig.pos,seat.app[0]),seat.pos],()=>{if(!game.clock.isOpen){leave(c);return;}fig.mode='sit';fig.yaw=seat.yaw;fig.seatH=seat.h;fig.footY=.06;c.state='wait';queue.push(c);
      // Drinks and snacks are served as soon as the client sits down.
      const drink=game.hospitality.serve(c);if(drink)fig.setTool(drink==='juice'?'juice':'cup');});});
}
/** Which salon a new client walks into: in proportion to the stylists at each salon's chairs. */
function pickSite(){if(!game.layout.branchOpen)return 0;const w=[0,1].map(s=>stations.filter(st=>!st.vacant&&siteOf(st.item.x)===s).length),t=w[0]+w[1];return t&&Math.random()*t>=w[0]?1:0;}
function freeSeat(c){if(c.seat){c.seat.occ=null;c.seat=null;}const i=queue.indexOf(c);if(i>=0)queue.splice(i,1);}
function leave(c,why){freeSeat(c);c.state='leaving';const f=c.fig,p=f.pos,site=c.site||0,D=SITE_DOORS[site],T=game.layout.tier;
  const inside=site?Math.abs(p.x-BRANCH_X)<4.1&&p.z<3.1&&p.z>-3.1:p.x>-4.1&&p.x<(T>=4?12.1:T>=2?8.1:4.1)&&p.z<3.1&&p.z>(T>=5?-9.1:T>=3?-7.1:T>=1?-5.1:-3.1);
  let pts=inside?[...route(p,D.inn),D.out,D.door,D.street]:[D.door,D.street];
  if(why==='full')pts=[D.out,D.door,D.street];
  f.walkTo(pts,()=>{c.state='gone';c.fadeOut=1;});}
function assign(st,c){const seat=c.seat;freeSeat(c);c.state='toStation';st.cust=c;st.state='await';st.touched=false;st.byOwner=false;st.worker=null;const f=c.fig;
  const start=seat?seat.app[0]:f.pos.clone(),lead=seat?[seat.app[0]]:[],toChair=from=>[...route(from,st.approach),st.chair.clone()];
  // Every client has a shampoo first when the salon has somewhere to do it.
  if(booths.some(b=>siteOf(b.item.x)===siteOf(st.item.x))&&!c.washed)shampoo(c,st,lead,start,()=>f.walkTo(toChair(f.pos),arrive));else f.walkTo([...lead,...toChair(start)],arrive);
  function arrive(){f.mode='sit';f.pos.copy(st.chair);f.yaw=st.face;f.seatH=.55;f.footY=.17;c.state='chair';c.tStart=simT;st.state='consult';st.playerPlan=st.sty===OWNER&&!autoOn;st.plan=st.playerPlan?blankPlan(c.hair):aiPlan(c,st.sty);st.timer=c.vip?10:2;if(st.playerPlan&&!styling&&typeof sel==='number')sel=lastChair=st.i;if(sel===st.i)renderPanel(true);}
  if(sel===st.i)renderPanel(true);}
const booths=[],washes=[];
const freeBooth=site=>booths.find(b=>!b.client&&siteOf(b.item.x)===site&&!pendingMoves.has(b.item)&&!queuedMoves.has(b.item)),freeHelper=site=>helpers.find(h=>h.fig.root.visible&&!h.task&&siteOf(h.idle.x)===site);
/** Shampoo at a free booth: a free assistant washes, otherwise the client's own stylist steps away from the chair to do it. */
function shampoo(c,st,lead,start,then){const site=siteOf(st.item.x),b=freeBooth(site),h=freeHelper(site),washer=h?h.fig:st.sty.fig,T={b,c,st,h,then,ready:false,seated:false,t:(h?h.e:st.sty).serviceMinutes('shampoo',game.speedFor('shampoo'))*game.clock.hourLength/60};
  b.client=c;c.inWash=true;if(h)h.task={kind:'wash',T};else st.washing=T;washes.push(T);
  washer.handL=washer.handR=null;washer.setTool(null);washer.walkTo(route(washer.pos,b.washAt),()=>{washer.yaw=b.washYaw;T.ready=true;});
  c.fig.walkTo([...lead,...route(start,b.seatApp),b.seat.clone()],()=>{Object.assign(c.fig,{mode:'sit',yaw:b.seatYaw,seatH:.5,footY:.2,tilt:-.45});c.fig.pos.copy(b.seat);T.seated=true;audio.play('swish');});}
const washerOf=T=>T.h?T.h.fig:T.st.sty.fig;
function updateWashes(dt){for(const T of washes.slice()){if(!T.ready||!T.seated)continue;const f=washerOf(T);T.t-=dt;
  const hp=T.c.fig.head.getWorldPosition(V()),k=Math.sin(simT*9)*.06;f.handR=hp.clone().add(V(k,.06,0));f.handL=hp.clone().add(V(-k,.04,.05));if(T.t<=0)endWash(T);}}
function endWash(T){const i=washes.indexOf(T);if(i<0)return;washes.splice(i,1);const f=washerOf(T);f.handL=f.handR=null;if(T.h)T.h.task=null;else T.st.washing=null;
  if(T.b.item.id==='spaBooth')T.c.spa=true;T.c.washQuality=(T.h?T.h.e:T.st.sty).washQuality;T.b.client=null;T.c.fig.tilt=0;T.c.washed=true;T.c.inWash=false;T.then();}
function startWork(st){if(st.state!=='consult')return;const worker=st.byOwner?OWNER:st.sty;if(worker===OWNER&&ownerBusy())return;if(styling&&styling.station===st)closeStyling(true);st.worker=worker;const p=st.plan,ops=[];
  // Colour and perm are applied, then left to process; that part needs no stylist.
  if(hasColour(p))ops.push({type:'colour'},{type:'process',of:'colour'});
  if(p.doWave&&Math.abs(p.wave-st.cust.hair.wave)>.05)ops.push({type:'wave'},{type:'process',of:'wave'});
  if(p.doCut)ops.push({type:'cut'});
  // Each step takes the stylist's own time for it, from the standard service times.
  ops.push({type:'dry'});timeOps(ops,worker);game.chargeMaterials(ops);if(worker!==st.sty)st.sty.fig.walkTo(route(st.sty.fig.pos,st.at(-.8,1.55)));
  st.ops=ops;st.opi=0;st.state='work';beginOp(st);renderPanel(true);}
const TOOLS={colour:'brush',wave:'comb',cut:'scissors',dry:'dryer'};
/** Minutes and simulated time for each step: the stylist's own times, and the fixed processing times. */
function timeOps(ops,worker){ops.forEach(o=>{o.minutes=o.type==='process'?Math.round(PROCESS_MINUTES[o.of]/game.processSpeedFor(o.of)):worker.serviceMinutes(o.type,game.speedFor(o.type));o.dur=o.minutes*game.clock.hourLength/60;});}
/**
 * A processing client moves to a free seat at the styling island, so the chair and stylist are free for someone else.
 * They come back to a chair when it is done. Returns false when no island seat is free.
 */
function toIsland(st){const seat=procSeats.find(s=>!s.occ&&siteOf(s.pos.x)===siteOf(st.item.x));if(!seat)return false;
  const c=st.cust,op=st.ops[st.opi],w=st.worker;seat.occ=c;
  Object.assign(c,{procSeat:seat,state:'process',procLeft:op.dur-op.t,procTotal:op.dur,procSeated:false,resume:{sty:st.sty,plan:st.plan,ops:st.ops.slice(st.opi+1)}});
  popup(tx('proc.toIsland',tx('proc.of.'+op.of),Math.ceil(op.minutes*(1-clamp(op.t/op.dur)))),c.fig.head,'');
  st.cust=null;st.state='free';st.ops=[];st.opi=0;w.fig.setTool(null);w.fig.handL=w.fig.handR=null;
  if(w!==st.sty){const home=ownerStation();goTo(w.fig,home?home.stand:OWNER_IDLE,home?home.face:Math.PI);}
  const f=c.fig;f.walkTo([...route(f.pos,seat.app[0]),seat.pos],()=>{Object.assign(f,{mode:'sit',yaw:seat.yaw,seatH:seat.h,footY:.06});c.procSeated=true;});
  if(sel===st.i)renderPanel(true);return true;}
/** While a finished client waits at the island, the front desk brings them whatever the salon offers. */
function islandTreat(c){if(!game.staff.receptionist.hired||c.islandTreated)return;const drink=game.hospitality.topUp(c);if(drink==null)return;c.islandTreated=true;
  if(drink)c.fig.setTool(drink==='juice'?'juice':'cup');
  const what=tx('hs.'+(drink||'snacks'));popup(tx(drink?'proc.treatDrink':'proc.treatSnack',nm(recepName()),i18n.lang==='en'?what.toLowerCase():what),c.fig.head,'');}
/** A client whose colour or perm has processed comes back to a chair to finish. */
function resumeAt(st,c){if(c.procSeat)c.procSeat.occ=null;c.procSeat=null;c.state='toStation';st.cust=c;st.state='await';st.touched=true;
  const f=c.fig;f.walkTo([...route(f.pos,st.approach),st.chair.clone()],()=>{Object.assign(f,{mode:'sit',yaw:st.face,seatH:.55,footY:.17});f.pos.copy(st.chair);c.state='chair';
    const R=c.resume;c.resume=null;Object.assign(st,{plan:R.plan,byOwner:false,worker:st.sty,ops:R.ops,opi:0,state:'work'});timeOps(st.ops,st.sty);beginOp(st);if(sel===st.i)renderPanel(true);});
  if(sel===st.i)renderPanel(true);}
function beginOp(st){const op=st.ops[st.opi],h=st.cust.hair,s=game.serviceProfileOf(st.worker);op.t=0;op.from=cloneHair(h);op.acc=new Array(NS).fill(0);
  if(op.type==='process'){op.to=cloneHair(h);st.worker.fig.setTool(null);toIsland(st);return;}
  op.to=op.type==='colour'?opColour(h,st.plan,s,true):op.type==='wave'?opWave(h,st.plan,s,true):op.type==='cut'?opCut(h,st.plan,s,true):cloneHair(h);
  st.worker.fig.setTool(TOOLS[op.type]);if(op.type==='dry')audio.play('dryer',{duration:op.dur/speed});else if(op.type!=='cut')audio.play('swish');}
function runOps(st,dt){const op=st.ops[st.opi],c=st.cust,h=c.hair,sf=st.worker.fig;
  // Processing in the chair while the island is full: the stylist waits, and the client moves over if a seat frees up.
  if(op.type==='process'){if(toIsland(st))return;op.t+=dt;c.tint=op.of==='colour'?.3:.12;sf.handL=sf.handR=null;
    if(op.t>=op.dur){c.tint=0;st.opi++;beginOp(st);if(sel===st.i)renderPanel(true);}return;}
  op.t+=dt;const k=clamp(op.t/op.dur),t=simT;
  if(op.type==='cut'){for(let j=0;j<NS;j++){const kk=clamp(k*1.6-(j/NS)*.6),nl=lerp(op.from.len[j],op.to.len[j],kk),rem=h.len[j]-nl;if(rem>0){op.acc[j]+=rem;h.len[j]=nl;while(op.acc[j]>1.4){op.acc[j]-=1.4;audio.play('snip');spawnClip(c.hm.endWorld(j),h.lab);}}}}
  if(op.type==='colour'){h.lab=labMix(op.from.lab,op.to.lab,smooth(k));c.tint=Math.sin(Math.PI*k)*.7;}
  if(op.type==='wave')h.wave=lerp(op.from.wave,op.to.wave,smooth(k));
  c.hm.dirty=true;
  // stylist motion (two-bone IK hands)
  c.fig.head.updateMatrixWorld(true);const hp=c.fig.head.getWorldPosition(V());const mx=Math.max(...h.len)*(1-.12*h.wave)*.011;
  let sx=0;
  if(op.type==='cut'){sx=Math.sin(t*1.3)*.18;const dy=-.05-(.5+.5*Math.sin(t*.7))*Math.min(.55,mx);const snip=Math.sin(t*22)*.012;
    sf.handR=hp.clone().add(st.rot(V(sx,dy+snip,.2)));sf.handL=hp.clone().add(st.rot(V(sx+.09,dy+.06,.17)));}
  else if(op.type==='colour'){sx=Math.sin(t*.8)*.12;sf.handR=hp.clone().add(st.rot(V(sx+Math.sin(t*2.5)*.06,.1+Math.sin(t*3.1)*.05,.17)));sf.handL=hp.clone().add(st.rot(V(-.18,-.28,.32)));}
  else if(op.type==='wave'){sf.handR=hp.clone().add(st.rot(V(-.17,-.06+Math.sin(t*4)*.07,.06)));sf.handL=hp.clone().add(st.rot(V(.17,-.06+Math.cos(t*4)*.07,.06)));}
  else{sx=Math.sin(t*1.5)*.15;sf.handR=hp.clone().add(st.rot(V(sx*1.6,.14,.32)));sf.handL=hp.clone().add(st.rot(V(-sx*.6,.13,.14)));}
  {const k=Math.min(1,dt*4),tg=st.stand.clone().add(st.rot(V(sx*.8,0,0)));sf.pos.x=lerp(sf.pos.x,tg.x,k);sf.pos.z=lerp(sf.pos.z,tg.z,k);sf.yaw=st.face;}
  if(op.t>=op.dur){Object.assign(h,cloneHair(op.to));c.tint=0;c.hm.dirty=true;st.opi++;if(st.opi>=st.ops.length)reveal(st);else beginOp(st);if(sel===st.i)renderPanel(true);}}
const WORDS=[[.9,'w0'],[.75,'w1'],[.55,'w2'],[.35,'w3'],[0,'w4']];
let last=null;
function reveal(st){const c=st.cust,s=st.worker,sf=s.fig;st.state='reveal';sf.setTool(null);sf.handL=sf.handR=null;
  const sc=game.completeService(c,s,st.byOwner);c.result=sc;
  last={name:c.name,sty:s.name,all:sc.all,mins:(simT-c.tStart)/60};
  sf.walkTo([st.at(-.55,1.15)],()=>{sf.yaw=st.face-Math.PI*.2;});
  c.fig.walkTo([st.at(.55,1.2)],()=>{c.fig.yaw=st.face;audio.play(sc.all>=.6?'happy':'sad');
    popup(`${Math.round(sc.all*100)}% · ${tx(WORDS.find(w=>sc.all>=w[0])[1])}`,c.fig.head,'big');
    later(.6,()=>{c.fig.yaw=st.face-Math.PI*.85;clapAll(sc.all);popup(tx('chairPct',st.i+1,Math.round(sc.all*100)),recep.head,'');});
    later(2.8,()=>{st.state='free';st.cust=null;{const home=s===st.sty?st:ownerStation();goTo(sf,home?home.stand:OWNER_IDLE,home?home.face:Math.PI);}if(sel===st.i)renderPanel(true);
      const dk=deskAt[c.site||0]||deskAt[0];c.fig.walkTo(route(c.fig.pos,dk.pay),()=>{c.fig.yaw=dk.payYaw;later(1.3,()=>checkout(c,sc));});});});
  if(sel===st.i)renderPanel(true);}
/** Paying at the desk. Difficult clients may haggle, demand a refund or run off without paying. */
function checkout(c,sc){const pay=sc.payment,head=c.fig.head;
  const settle=(amount,outcome={})=>{if(amount>0){game.receivePayment(amount);audio.play('cash');popup('+$'+amount,head,'big');}
    const r=game.finishVisit(c,sc,outcome);const ip=r.influencerPost;if(ip)popup(tx('inf.post.'+ip.tier,ip.followers.toLocaleString(),ip.days,Math.round(ip.demand*100)),head,'big');c.state='paid';leave(c);};
  if(c.influencer){popup(tx('inf.sponsored'),recep.head,'');settle(0);return;}
  if(c.villain==='dasher'){
    if(game.staff.hasSupport('reception')&&Math.random()<.85){popup(tx('vil.caught',nm(recepName())),recep.head,'big');settle(pay);return;}
    audio.play('bad');popup(tx('vil.dashed',pay),head,'big');game.finishVisit(c,sc,{dashed:true});c.state='paid';c.fig.spd=3.4;leave(c);return;}
  if(c.villain==='complainer'&&sc.satisfaction<.72){audio.play('bad');
    incidents.show({title:tx('inc.complain.t',nm(c.name)),text:tx('inc.complain'),options:[{label:tx('inc.refund',pay),run:()=>settle(0,{refunded:true})},{label:tx('inc.refuse'),run:()=>settle(pay,{refusedRefund:true})}]});return;}
  if(c.villain==='haggler'){const off=Math.max(5,Math.round(pay*.25));
    incidents.show({title:tx('inc.haggle.t',nm(c.name)),text:tx('inc.haggle',off),options:[{label:tx('inc.discount',off),run:()=>settle(pay-off,{discount:off})},{label:tx('inc.fullPrice'),run:()=>settle(pay,{haggleRefused:true})}]});return;}
  settle(pay);}
const recepName=()=>game.staff.support.find(e=>e.effect==='reception').name;
function clapAll(q){const n=q>.5;if(n)audio.play('clap');const who=[recep,...helpers.map(h=>h.fig),...friends,...STY.map(s=>s.fig),...custs.filter(c=>c.state==='wait').map(c=>c.fig)];who.forEach(f=>{if(n||Math.random()<.3)f.clapT=rand(1.2,1.8);});}

/* sweeping: assistants keep the floor clean; without them Lia does it between clients */
const landedClips=()=>clips.filter(c=>c.alive&&c.landed);
/** Sweeping time and reach follow `cleaning` (0 to 100); Lia and stylists sweep at 50. */
const sweepTime=cleaning=>3.2*(1.5-cleaning/100);
function startSweep(fig,cleaning=50){const S=siteOf(fig.pos.x),landed=landedClips().filter(c=>siteOf(c.p.x)===S);if(!landed.length)return null;const a=landed[0].p.clone();a.y=0;const t=game.layout.tier;
  const at=a.clone().add(V(.5,0,.45));if(S){at.x=clamp(at.x,BRANCH_X-3.6,BRANCH_X+3.6);at.z=clamp(at.z,-2.6,2.6);}else{at.x=clamp(at.x,-3.6,t>=4?11.6:t>=2?7.6:3.6);at.z=clamp(at.z,t>=5?-8.6:t>=3?-6.6:t>=1?-4.6:-2.6,2.6);}
  const job={kind:'sweep',phase:'walk',fig,aim:a,t:sweepTime(cleaning),r:.8+cleaning/250};fig.handL=fig.handR=null;fig.walkTo(route(fig.pos,at),()=>{job.phase='work';fig.setTool('broom');fig.yaw=Math.atan2(a.x-fig.pos.x,a.z-fig.pos.z);});return job;}
/** Advances a sweeping job; true once the patch of floor is clean. */
function updateSweep(job,dt){if(job.phase!=='work')return false;const f=job.fig,a=job.aim;job.t-=dt;f.toolAim=V(a.x+Math.sin(simT*5)*.35,0,a.z+Math.cos(simT*2.5)*.12);
  f.handR=f.pos.clone().add(V(0,1.02,0)).addScaledVector(fwd(f.yaw),.22).addScaledVector(rgt(f.yaw),.1);f.handL=f.handR.clone().add(V(0,-.22,0)).addScaledVector(fwd(f.yaw),.05);
  if(job.t>0)return false;clips.forEach(c=>{if(c.alive&&c.landed&&Math.hypot(c.p.x-a.x,c.p.z-a.z)<job.r)c.alive=false;});f.handL=f.handR=null;f.toolAim=null;f.setTool(null);return true;}
function helpersUpdate(dt){const messAt=site=>landedClips().filter(c=>siteOf(c.p.x)===site).length;
  helpers.forEach(h=>{const f=h.fig,T=h.task;if(!f.root.visible)return;
    if(T&&T.kind==='wash')return;
    if(T&&T.kind==='sweep'){if(updateSweep(T,dt))h.task=null;return;}
    // A keen cleaner picks up the broom sooner.
    if(messAt(siteOf(h.idle.x))>40-h.e.cleaning/4&&!helpers.some(o=>o.task&&o.task.kind==='sweep'&&siteOf(o.idle.x)===siteOf(h.idle.x))){h.task=startSweep(f,h.e.cleaning);if(h.task)return;}
    if(!f.path.length&&f.pos.distanceTo(h.idle)>.05){f.handL=f.handR=null;f.walkTo(route(f.pos,h.idle),()=>f.yaw=h.idleYaw);}});}

/* ================= time, weather, timers ================= */
let started=false,paused=false,booted=false,styling=null,savedCamK=0,lastChair=0;
const canAuto=st=>autoOn&&!st.touched;
const ownerBusy=()=>stations.some(x=>(x.state==='work'||x.state==='reveal')&&x.worker===OWNER);
const openChair=()=>stations.find(x=>x.vacant)||(()=>{const o=ownerStation();return o&&o.state==='free'&&!styling?o:null;})();
function syncSupport(){recep.root.visible=game.staff.receptionist.hired;helpers.forEach(h=>{h.fig.root.visible=h.e.hired;if(h.e.hired||!h.task)return;if(h.task.kind==='wash')endWash(h.task.T);else{h.fig.setTool(null);h.fig.toolAim=null;h.fig.handL=h.fig.handR=null;}h.task=null;});}
const CAM_BY_SIZE=[[0,1.2,1],[0,.2,1.15],[2,.2,1.38],[2,-.8,1.55],[4,-.8,1.8],[4,-1.8,1.95]];
function syncChairs(){const t=game.layout.tier;backGroup.visible=t>=1;annexGroup.visible=t>=2;rearGroup.visible=t>=3;annex2Group.visible=t>=4;rear2Group.visible=t>=5;walls.forEach(w=>{if(w.show)w.off=!w.show(t);});if(site===0){const [x,z,k]=CAM_BY_SIZE[t];camHome.set(x,.55,z);viewScale=k;}}
function placeStaff(e,st){const wasOwner=st.sty===OWNER;st.sty=e;st.vacant=false;st.state='free';e.fig.root.visible=true;e.fig.pos.copy(st.stand);e.fig.yaw=st.face;if(wasOwner){OWNER.floating=true;OWNER.fig.walkTo(route(OWNER.fig.pos,OWNER_IDLE),()=>OWNER.fig.yaw=Math.PI);}}
function hireStaff(e){const st=openChair();if(st&&game.staff.hire(e)){audio.play('cash');placeStaff(e,st);game.updateProgress();}}
function fireStaff(e){const st=stations.find(x=>x.sty===e);if(st&&st.state!=='free')return;if(!game.staff.fire(e))return;e.fig.root.visible=false;if(st)vacate(st);}
/** A stylist leaves their chair: Lia takes it if she has none, otherwise it stands empty. */
function vacate(st){const e=st.sty;if(e===OWNER||st.vacant)return;e.fig.root.visible=false;
  if(OWNER.floating){OWNER.floating=false;st.sty=OWNER;st.state='free';goToChair(OWNER.fig,st);}else{st.sty=VAC;st.vacant=true;st.state='vacant';}}
/** Staff walk within a salon; going to the other salon they simply arrive there. */
function goTo(f,pos,face){if(siteOf(f.pos.x)!==siteOf(pos.x)){f.path=[];f.pos.copy(pos);f.yaw=face;}else f.walkTo(route(f.pos,pos),()=>f.yaw=face);}
function goToChair(f,st){goTo(f,st.stand,st.face);}
/** A chair nobody is being served at, so its stylist can change places. */
const seatFree=st=>!st.cust&&!st.washing&&!st.sweep&&!st.filming&&(st.state==='free'||st.state==='vacant')&&!(styling&&styling.station===st);
/** Two chairs trade stylists. */
function swapSeats(a,b){if(a===b||!seatFree(a)||!seatFree(b))return false;const ea=a.sty,va=a.vacant;
  Object.assign(a,{sty:b.sty,vacant:b.vacant,state:b.vacant?'vacant':'free'});Object.assign(b,{sty:ea,vacant:va,state:va?'vacant':'free'});
  for(const st of [a,b])if(!st.vacant)goToChair(st.sty.fig,st);return true;}
/** The player moves a stylist to chair `i`, trading places with whoever sits there. */
function moveToSeat(e,i){const to=stations[i],from=stations.find(s=>s.sty===e);if(!to||!from||from===to)return false;
  if(!swapSeats(from,to)){popup(tx('seat.busy'),recep.head,'');audio.play('deny');return false;}return true;}
/** Each morning: shuffle the chairs if that is the policy, then a VIP specialist on duty takes the VIP room. */
function morningSeats(){if(game.staff.seatShuffle){const sts=stations.filter(s=>!s.vacant&&seatFree(s)),people=sts.map(s=>s.sty);
    for(let i=people.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[people[i],people[j]]=[people[j],people[i]];}
    sts.forEach((s,k)=>{s.sty=people[k];goToChair(s.sty.fig,s);});}
  const room=stations.find(s=>s.item.id==='vipRoom');if(!room||room.sty.perk==='vip')return;
  const vip=stations.find(s=>s!==room&&!s.vacant&&s.sty.perk==='vip');if(vip)swapSeats(room,vip);}
/** Each morning: stylists on leave give up their chair and stylists who are in take any free one. */
function syncRoster(){const day=game.clock.day;
  stations.forEach(st=>{if(!st.vacant&&st.sty!==OWNER&&!st.cust&&(!st.sty.hired||st.sty.onLeave(day)))vacate(st);});
  game.staff.working(day).forEach(e=>{if(stations.some(s=>s.sty===e))return;const st=openChair();if(st)placeStaff(e,st);});}
function restoreGame(){const d=game.saves.load();if(!d)return;furnitureView.clear();stations.length=0;game.restore(d);syncFurniture();
  game.staff.hired.forEach(e=>{const st=openChair();if(st)placeStaff(e,st);});}
/** Keeps stations, seats, the desk and the basin in step with the furniture layout. */
function syncFurniture(){game.layout.items.forEach(it=>{if(!furnitureView.has(it))furnitureView.spawn(it);});furnitureView.prune(game.layout.items);syncStations();syncAnchors();}
function syncStations(){const items=game.layout.items.filter(it=>FURNITURE[it.id].chairs);
  for(let i=stations.length-1;i>=0;i--)if(!items.includes(stations[i].item))stations.splice(i,1);
  items.forEach(it=>FURNITURE[it.id].chairs.forEach((_,k)=>{let st=stations.find(s=>s.item===it&&s.k===k);
    if(!st){st=makeStation(it,k);stations.push(st);if(!OWNER.floating&&!ownerStation()){st.sty=OWNER;st.vacant=false;st.state='free';if(!started){OWNER.fig.pos.copy(st.stand);OWNER.fig.yaw=st.face;}else OWNER.fig.walkTo(route(OWNER.fig.pos,st.stand),()=>OWNER.fig.yaw=st.face);}return;}
    frameStation(st);const f=st.sty.fig;if(f&&!st.cust&&!st.washing&&!st.sweep&&(st.state==='free'||st.state==='vacant'))f.walkTo(route(f.pos,st.stand),()=>f.yaw=st.face);}));
  stations.forEach((s,i)=>{s.i=i;});}
let deskInfo=null,deskAt=[];
// Where people stand and sit at a shampoo booth (or an older basin), in the item's own frame.
const BOOTH_ANCHORS={shampooBooth:{seat:[0,.12],seatApp:[0,1.05],face:[0,1],washAt:[.42,-.2],washFace:[-1,0],idle:[.45,1.15]},spaBooth:{seat:[0,.12],seatApp:[0,1.05],face:[0,1],washAt:[.42,-.2],washFace:[-1,0],idle:[.45,1.15]},
  basin:{seat:[-.45,-.1],seatApp:[-.45,.75],face:[-1,0],washAt:[.05,.5],washFace:[0,-1],idle:[.1,.75]}};
function syncAnchors(){const L=game.layout,w=(it,x,z)=>{const p=L.toWorld(it,x,z);return V(p.x,0,p.z);},dir=(it,x,z)=>{const a=L.toWorld(it,0,0),b=L.toWorld(it,x,z);return Math.atan2(b.x-a.x,b.z-a.z);},desk=L.items.find(it=>it.id==='desk'&&siteOf(it.x)===0);
  deskAt=[0,1].map(site=>{const d=L.items.find(it=>it.id==='desk'&&siteOf(it.x)===site);if(!d)return null;const y=d.rotation*Math.PI/2;return {pay:w(d,0,1.15),payYaw:y+Math.PI};});
  if(desk){const yaw=desk.rotation*Math.PI/2;deskInfo={seat:w(desk,0,-.1),seatYaw:yaw,pay:w(desk,0,1.15),payYaw:yaw+Math.PI};recep.pos.copy(deskInfo.seat);recep.yaw=yaw;}
  const items=L.items.filter(it=>BOOTH_ANCHORS[it.id]);
  for(let i=booths.length-1;i>=0;i--)if(!items.includes(booths[i].item))booths.splice(i,1);
  items.forEach(it=>{let b=booths.find(x=>x.item===it);if(!b){b={item:it,client:null};booths.push(b);}const A=BOOTH_ANCHORS[it.id];
    Object.assign(b,{seat:w(it,...A.seat),seatApp:w(it,...A.seatApp),seatYaw:dir(it,...A.face),washAt:w(it,...A.washAt),washYaw:dir(it,...A.washFace),idle:w(it,...A.idle),idleYaw:dir(it,0,-1)});});
  // Each assistant keeps a post beside a shampoo booth, facing the room and out of the clients' way;
  // when no spot by a booth is free they wait beside the reception desk instead.
  const taken=[],free=p=>{const c=L.nearestCell(p.x,p.z);return !!c&&L.placeable(c)&&!L.occupant(c,null,false)&&!taken.some(q=>q.distanceTo(p)<.45);};
  const SIDES=[[1.05,.45],[-1.05,.45],[1.05,-.25],[-1.05,-.25],[.85,1.05],[-.85,1.05]],DESK_SIDES=[[1.1,.55],[-1.1,.55],[1.1,1.1],[-1.1,1.1]];
  helpers.forEach((h,i)=>{const b=booths.length?booths[i%booths.length]:null;h.booth=b;
    let spot=null,yaw=Math.PI;
    for(const o of b?[b,...booths.filter(x=>x!==b)]:[]){const q=SIDES.map(([x,z])=>w(o.item,x,z)).find(free);if(q){spot=q;yaw=dir(o.item,0,1);break;}}
    if(!spot&&desk){const q=DESK_SIDES.map(([x,z])=>w(desk,x,z)).find(free);if(q){spot=q;yaw=dir(desk,0,1);}}
    if(!spot)spot=V(3.6,0,-.85).add(V(-.6*i,0,0));
    taken.push(spot);h.idle=spot;h.idleYaw=yaw;});}
const stationsOf=it=>stations.filter(s=>s.item===it);
// Pieces waiting to follow a wall: their chairs and booths take no new clients until they have moved.
/**
 * Furniture that stood against a wall when an expansion took it away, with the spot it stood on. It follows the wall
 * as soon as it is free; anything placed later, or moved by the player in the meantime, stays where it is put.
 */
const pendingMoves=new Map();
function alignToWalls(expanded=false){const L=game.layout;let moved=false;
  if(expanded)L.items.forEach(it=>{if(L.wallShift(it))pendingMoves.set(it,[it.x,it.z]);});
  for(const [it,[x,z]] of pendingMoves)if(!L.items.includes(it)||it.x!==x||it.z!==z||!L.wallShift(it))pendingMoves.delete(it);
  for(let pass=0;pass<3;pass++){let any=false;
    for(const it of [...pendingMoves.keys()]){const to=L.wallShift(it);if(build.active&&build.active.existing===it)continue;const cells=L.footprint(it.id,to.x,to.z,it.rotation);
      if(!cells||!L.canOccupy(it.id,cells,it)||!nav.wouldConnect({id:it.id,x:to.x,z:to.z,rotation:it.rotation,cells},it)||!canModify(it))continue;
      pendingMoves.delete(it);furnitureView.despawn(it);L.move(it,to.x,to.z,it.rotation);any=moved=true;}
    if(!any)break;}
  if(moved){syncFurniture();renderPanel(true);}return moved;}
function canModify(it){if(booths.some(b=>b.item===it&&b.client))return false;if(!FURNITURE[it.id].chairs)return !furnitureView.isOccupied(it);
  const sts=stationsOf(it);return sts.length>0&&sts.every(st=>!st.cust&&!st.washing&&!st.sweep&&(st.state==='free'||st.state==='vacant')&&!(styling&&styling.station===st));}
/** Chairs and shampoo booths can be moved even while in use; the move waits until they are free. */
function canMove(it){return canModify(it)||!!FURNITURE[it.id].chairs||!!BOOTH_ANCHORS[it.id];}
/** Moves the player asked for while a chair or booth was busy: [x, z, quarter turns] for each piece. */
const queuedMoves=new Map();
function queueMove(it,x,z,r){queuedMoves.set(it,[x,z,r]);popup(tx('build.queued'),recep.head,'big');syncFurniture();renderPanel(true);}
function applyQueuedMoves(){const L=game.layout;let moved=false;
  for(const [it,[x,z,r]] of queuedMoves){if(!L.items.includes(it)){queuedMoves.delete(it);continue;}if(!canModify(it))continue;queuedMoves.delete(it);
    const cells=L.footprint(it.id,x,z,r);if(!cells||!L.canOccupy(it.id,cells,it)||!nav.wouldConnect({id:it.id,x,z,rotation:r,cells},it))continue;
    furnitureView.despawn(it);L.move(it,x,z,r);moved=true;}
  if(moved){syncFurniture();renderPanel(true);}}
function canSell(it){if(!canModify(it))return false;return !FURNITURE[it.id].chairs||stationsOf(it).every(st=>st.vacant);}
/** The camera quarter-turn that looks at a client's back, so the mirror never blocks the view. */
function bestCamK(st){const base=Math.round(camK);let best=base,bd=-2;[0,-1,1,-2,2].forEach(o=>{const k=base+o,a=Math.PI/4+k*Math.PI/2,d=Math.sin(a)*Math.sin(st.yaw)+Math.cos(a)*Math.cos(st.yaw);if(d>bd+1e-6){bd=d;best=k;}});return best;}
function finishDay(){game.staff.hired.filter(e=>e.quits).forEach(e=>{e.quits=false;fireStaff(e);popup(tx('staff.quit',nm(e.name)),recep.head,'big');});
  game.closeDay();audio.play('dayEnd');paused=true;openMenu('day','day');}
function dayTick(dt){if(game.report||game.dayOff)return;game.tick(dt);if(!game.clock.isOpen&&queue.length)queue.slice().forEach(c=>leave(c));if(!game.clock.isOpen&&!stations.some(x=>x.cust)&&!custs.some(c=>c.state!=='gone'&&c.state!=='leaving'))finishDay();}
game.bus.on('day:closed',()=>{popup(tx('closed'),recep.head,'big');queue.slice().forEach(c=>leave(c));});
game.bus.on('mission:done',m=>{popup(tx('ms.done',tx('ms.t.'+m.kind)),recep.head,'big');audio.play('levelUp');renderPanel(true);});
$('#offday').addEventListener('click',e=>{const b=e.target.closest('[data-off]');if(!b)return;if(b.dataset.off==='week')openMenu('week','game');else{game.save();beginDay();}});
game.bus.on('staff:levelup',e=>{popup(tx('staffLevelUp',nm(e.name),e.level),e.fig.head,'big');audio.play('levelUp');renderPanel(true);});
game.bus.on('level:up',l=>{popup(tx('levelUp',l,tx('lv.'+l)),recep.head,'big');renderPanel(true);});
game.bus.on('review:bonus',b=>{popup(b.kind==='streak'?tx('rv.bonusStreak',b.streak,b.amount.toLocaleString()):tx('rv.bonusMilestone',b.at,b.amount.toLocaleString(),b.rating.toFixed(1),b.mult.toFixed(2)),recep.head,'big');audio.play('cash');renderPanel(true);});
game.bus.on('review:new',r=>{if(sel==='rev')game.reviews.markRead();if(r.stars<=2){popup(tx('rv.newLow','★'.repeat(r.stars)),recep.head,'');audio.play('bad');}});
function openStyling(st){if(site!==siteOf(st.item.x))focusSite(siteOf(st.item.x));if(styling||st.state!=='consult'||!st.cust||ownerBusy())return;styling=new StylingSession(st,st.cust);if(!st.playerPlan){st.plan=blankPlan(st.cust.hair);st.playerPlan=true;}st.byOwner=true;st.touched=true;st.sty.fig.root.visible=false;savedCamK=camK;camK=bestCamK(st);document.body.classList.add('closeup');pixScale=.5;resize();const hp=st.cust.fig.head.getWorldPosition(V());camClose.set(hp.x,hp.y-(W/H<1?.62:.2),hp.z);audio.play('swish');renderPanel(true);}
function closeStyling(confirmed){const s=styling;if(!s)return;styling=null;document.body.classList.remove('closeup');pixScale=1;resize();camK=savedCamK;s.station.sty.fig.root.visible=true;const c=s.customer;c.previewHair=null;c.hm.dirty=true;c.fig.yaw=Math.PI;if(!confirmed){const st=s.station;st.byOwner=false;if(autoOn||st.sty!==OWNER){st.plan=aiPlan(c,st.sty);st.playerPlan=false;st.touched=false;st.timer=2;}}renderPanel(true);}
function stylingTick(dt){if(!styling)return;const c=styling.customer;c.fig.yaw=angLerp(c.fig.yaw,styling.targetYaw(Math.PI/4+camK*Math.PI/2+Math.PI),Math.min(1,dt*10));c.fig.look=0;}
let simT=0,speed=1,autoOn=true,timeMode='auto',spawnTimer=1.5;
const timers=[];const later=(s,fn)=>timers.push({t:s,fn});
const PRE={day:{sky:0x7ea2d0,sun:0xfff1c4,si:2.8,sp:V(6,12,5),hs:0xb6d2ec,hg:0xb7a99a,hi:1.1,inI:0,spI:0,glow:0},
  dusk:{sky:0xd88a6a,sun:0xff7a3d,si:1.9,sp:V(-11,4,4),hs:0xffb15a,hg:0x5a2440,hi:.75,inI:7,spI:22,glow:.55},
  night:{sky:0x0b1530,sun:0x7ea2d0,si:.3,sp:V(-4,10,-6),hs:0x2a4478,hg:0x0d0b14,hi:.3,inI:10,spI:38,glow:1}};
function phaseNow(){if(timeMode!=='auto')return timeMode;const d=new Date(),h=started?game.clock.hour:d.getHours()+d.getMinutes()/60;return(h>=7&&h<17.5)?'day':((h>=17.5&&h<19.5)||(h>=5.5&&h<7))?'dusk':'night';}
const L={sky:new THREE.Color(0x7ea2d0),sun:new THREE.Color(0xfff1c4),si:2.8,sp:V(6,12,5),hs:new THREE.Color(0xb6d2ec),hg:new THREE.Color(0x5f9e45),hi:1.1,inI:0,spI:0,glow:0};
const _ca=new THREE.Color(),_cb=new THREE.Color();
function updateLights(dt){const P=PRE[phaseNow()],k=Math.min(1,dt*1.5);
  _ca.set(P.sky);L.sky.lerp(_ca,k);
  L.sun.lerp(_ca.set(P.sun),k);L.si=lerp(L.si,P.si,k);L.sp.lerp(P.sp,k);L.hs.lerp(_ca.set(P.hs),k);L.hg.lerp(_ca.set(P.hg),k);
  L.hi=lerp(L.hi,P.hi,k);L.inI=lerp(L.inI,P.inI,k);L.spI=lerp(L.spI,P.spI+(P===PRE.day?0:0),k);L.glow=lerp(L.glow,P.glow,k);
  scene.background.copy(L.sky);sun.color.copy(L.sun);sun.intensity=L.si;sun.position.copy(L.sp).normalize().multiplyScalar(30).add(camTarget);sun.target.position.copy(camTarget);hemi.color.copy(L.hs);hemi.groundColor.copy(L.hg);hemi.intensity=L.hi;
  inLights.forEach(l=>l.intensity=L.inI);spots.forEach(s=>s.intensity=L.spI);GLASS.emissiveIntensity=L.glow*.6;LAMP.emissiveIntensity=L.glow*1.2+.05;}

/* ================= popups ================= */
const pops=[];
function popup(text,obj,cls){const el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=text;$('#pops').appendChild(el);pops.push({el,obj,t:0,life:cls==='big'?4.2:2.6,w:null,h:null});}
const _p=V();
function screenOf(v){_p.copy(v).project(cam);return [(_p.x+1)/2*W*PIX+camOff.x*PIX,(1-_p.y)/2*H*PIX-camOff.y*PIX];}
/** Floating notes rise from whoever they are about. Notes about the same person stack by their real height, and the stack stays clear of the HUD, the panel and the screen edges. */
function updatePops(dt){if(!pops.length)return;const hud=$('#hud').getBoundingClientRect(),pan=$('#panel').getBoundingClientRect(),groups=new Map();
  for(const p of pops){p.t+=dt;if(p.w==null){p.w=p.el.offsetWidth;p.h=p.el.offsetHeight;}if(!groups.has(p.obj))groups.set(p.obj,[]);groups.get(p.obj).push(p);}
  for(const [obj,g] of groups){const w=obj.getWorldPosition(V()),k=Math.min(1,g[0].t/g[0].life);w.y+=.35+(1-(1-k)*(1-k))*.6;let [x,y]=screenOf(w);
    const W=Math.max(...g.map(p=>p.w)),total=g.reduce((n,p)=>n+p.h+4,-4);x=clamp(x,W/2+8,innerWidth-W/2-8);
    const over=r=>r.width&&x-W/2<r.right&&x+W/2>r.left,lo=(over(hud)?hud.bottom+6:8)+total,hi=over(pan)?pan.top-6:innerHeight-8;
    y=Math.max(lo,Math.min(y,hi));for(const p of g){p.el.style.left=x+'px';p.el.style.top=y+'px';p.el.style.opacity=clamp((p.life-p.t)*2);y-=p.h+4;}}
  for(let i=pops.length-1;i>=0;i--)if(pops[i].t>pops[i].life){pops[i].el.remove();pops.splice(i,1);}
  custs.forEach(c=>{if(c.state==='wait'){const w=c.fig.head.getWorldPosition(V());w.y+=.3;const [x,y]=screenOf(w);c.tag.style.display='block';c.tag.style.left=x+'px';c.tag.style.top=y+'px';const k=clamp(c.pat/c.maxPat);const i=c.tag.firstChild;i.style.width=(k*100)+'%';i.style.background=k>.5?'#8fc25a':k>.25?'#ffb15a':'#d8314a';}
    else if(c.state==='process'&&c.procSeated){const w=c.fig.head.getWorldPosition(V());w.y+=.55;const [x,y]=screenOf(w);c.tag.style.display='block';c.tag.style.left=x+'px';c.tag.style.top=y+'px';const i=c.tag.firstChild;i.style.width=(clamp(1-c.procLeft/c.procTotal)*100)+'%';i.style.background='#7fb6f0';}
    else c.tag.style.display='none';});}

/* ================= simulation step ================= */
function simStep(dt){simT+=dt;
  for(let i=timers.length-1;i>=0;i--){if((timers[i].t-=dt)<=0){const f=timers[i].fn;timers.splice(i,1);f();}}
  // arrivals
  if(game.clock.isOpen){spawnTimer-=dt;if(spawnTimer<=0){spawnCustomer();spawnTimer=game.nextArrival();}}
  dayTick(dt);
  // waiting patience
  custs.forEach(c=>{if(c.state==='process'&&c.procSeated){c.procLeft-=dt;c.tint=.3;if(c.procLeft<=0){c.state='ready';c.readyAt=simT;c.tint=0;popup(tx('proc.done'),c.fig.head,'');islandTreat(c);}}});
  custs.forEach(c=>{if(c.state==='wait'){c.pat-=dt;if(c.pat<=0){popup(tx('tooSlow'),c.fig.head,'');audio.play('bad');game.customerGaveUp(c);leave(c);}}});
  // stations
  stations.forEach(st=>{
    if(st.vacant)return;
    if(st.sweep){if(updateSweep(st.sweep,dt))st.sweep=null;}
    else if(st.state==='free'&&st.sty===OWNER&&!helpers.some(h=>h.fig.root.visible)&&!queue.some(q=>q.state==='wait')&&landedClips().length>24)st.sweep=startSweep(OWNER.fig);
    if(st.state==='free'){if(st.sty.restUntil>simT||st.sweep||st.filming||pendingMoves.has(st.item)||queuedMoves.has(st.item))return;
      // A client whose colour or perm is done waits at the island for their own stylist; another takes over only if theirs is not at a chair, or after an hour.
      const here=siteOf(st.item.x),done=custs.filter(q=>q.state==='ready'&&(q.site||0)===here),back=done.find(q=>q.resume.sty===st.sty)||done.find(q=>!stations.some(s=>s.sty===q.resume.sty)||simT-q.readyAt>game.clock.hourLength);if(back){resumeAt(st,back);return;}
      if(!game.clock.isOpen||(booths.some(b=>siteOf(b.item.x)===here)&&!freeBooth(here)))return;const vipRoom=st.item.id==='vipRoom',vipChair=vipRoom||st.sty.perk==='vip',vipOnDuty=stations.some(s=>!s.vacant&&siteOf(s.item.x)===here&&(s.item.id==='vipRoom'||s.sty.perk==='vip'));
      // VIP clients wait for a VIP chair (the VIP room or a VIP specialist) while one is on duty, unless half their patience is gone.
      const waiting=queue.filter(q=>q.state==='wait'&&(q.site||0)===here&&(!q.vip||vipChair||!vipOnDuty||q.pat<q.maxPat*.5));
      // A stylist whose client is processing at the island takes a quick cut first, to be free when that client is ready.
      const islandClient=custs.some(q=>(q.state==='process'||q.state==='ready')&&q.resume&&q.resume.sty===st.sty);
      const c=(vipChair&&waiting.find(q=>q.vip))||(islandClient&&waiting.find(q=>q.requestedService==='haircut'))||waiting.slice(0,3).find(q=>st.sty.handles(q))||waiting[0];if(c)c.vipRoom=vipRoom;if(c)assign(st,c);}
    else if(st.state==='consult'){if(!game.clock.isOpen&&!(styling&&styling.station===st)&&!ownerBusy()){if(st.sty===OWNER)st.plan=aiPlan(st.cust,OWNER);startWork(st);}else if(canAuto(st)){st.timer-=dt;if(st.timer<=0){st.plan=aiPlan(st.cust,st.sty);startWork(st);}}}
    else if(st.state==='work')runOps(st,dt);
    if(st.state!=='work'&&st.state!=='reveal'&&!st.washing&&!st.sweep&&!st.filming){const sf=st.sty.fig;sf.handL=sf.handR=null;sf.setTool(st.state==='consult'?'comb':null);
      if(!sf.path.length&&sf.pos.distanceTo(st.stand)>.05)goToChair(sf,st);
      if(st.state==='consult'&&st.cust){const hp=st.cust.fig.head.getWorldPosition(V());sf.handR=hp.clone().add(st.rot(V(Math.sin(simT*2)*.08,.05,.22)));}}});
  updateWashes(dt);helpersUpdate(dt);
  // receptionist watches the latest reveal / door
  const rv=stations.find(s=>s.state==='reveal');{const tgt=rv?rv.chair:DOOR_IN;const a=Math.atan2(tgt.x-recep.pos.x,tgt.z-recep.pos.z)-recep.yaw;recep.look=angLerp(recep.look,clamp(((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,-1,1),Math.min(1,dt*3));}
  // spectators look at reveals
  custs.forEach(c=>{if(c.state==='wait'){c.fig.look=rv?angLerp(c.fig.look,.4*Math.sin(simT*.3),.02):Math.sin(simT*.4+c.id)*.3;}
    else if(c.state==='chair'&&!(styling&&styling.customer===c))c.fig.look=Math.sin(simT*.5+c.id)*.15;else c.fig.look=0;});
  // figures
  figs.forEach(f=>f.update(dt));
  custs.slice().forEach(c=>{if(c.fadeIn<1){c.fadeIn=Math.min(1,c.fadeIn+dt*2.5);setFade(c.fig,Math.max(.01,c.fadeIn));}
    if(c.fadeOut!=null){c.fadeOut-=dt*2.5;setFade(c.fig,Math.max(.01,c.fadeOut));if(c.fadeOut<=0){c.fig.remove();c.tag.remove();c.hm.mesh.dispose();custs.splice(custs.indexOf(c),1);}}
    if(c.hm.dirty||c.tint>0)c.hm.build(c.previewHair||c.hair,FOIL,c.tint);});
  // clippings
  let n=0;for(let i=0;i<clips.length;i++){const c=clips[i];if(!c.alive){_m4.makeScale(0,0,0);clipMesh.setMatrixAt(i,_m4);continue;}
    if(!c.landed){c.v.y-=4.5*dt;c.v.multiplyScalar(1-dt*1.5);c.p.addScaledVector(c.v,dt);if(c.p.y<=.02){c.p.y=.02;c.landed=true;}}
    _m4.compose(c.p,_q.setFromAxisAngle(UP,c.ry),_s.set(.035,.02,.08));clipMesh.setMatrixAt(i,_m4);n=i+1;}
  clipMesh.count=n;clipMesh.instanceMatrix.needsUpdate=true;game.dirt=landedClips().length;
}
const FOIL={L:.8,a:-.002,b:-.006};

/* ================= environment animation (real time) ================= */
function envStep(dt,t){
  poleTex.offset.y=(t*.4)%1;
  // cutaway walls facing the camera
  const v=V(Math.sin(camAz),0,Math.cos(camAz));walls.forEach(w=>{if(w.off){w.full.visible=w.low.visible=false;return;}const front=w.n.dot(v)>.2||build.isActive;w.full.visible=!front;w.low.visible=front;});
  // selection marker
  if(started&&typeof sel==='number'){const st=stations[sel];marker.visible=true;marker.position.set(st.chair.x,2.35+Math.abs(Math.sin(t*3))*.15,st.chair.z);}else marker.visible=false;
}

/* ================= UI ================= */
let sel=0;const tabs=$('#tabs'),pbody=$('#pbody');let panelKey='';
function stLabel(st){if(!st.cust)return`<span class="dim">${tx('st.free')}</span>`;if(st.state==='await')return tx(st.cust.inWash?'st.shampoo':'st.walk');
  if(st.state==='consult')return canAuto(st)?tx('st.auto',Math.max(0,st.timer).toFixed(0)):`<span class="gold">${tx('st.wait')}</span>`;
  if(st.state==='work'){const o=st.ops[st.opi];return `${tx('doing.'+o.type)} ${Math.round(clamp(o.t/o.dur)*100)}% · ${tx('st.left',Math.max(0,Math.ceil(o.minutes*(1-clamp(o.t/o.dur)))))}`;}return tx('st.reveal');}
function renderTabs(){const T=[['salon','tab.salon'],['staff','tab.staff'],['syn','tab.syn'],['build','tab.build'],['biz','tab.biz'],['mkt','tab.mkt'],['rev','tab.rev'],['prog','tab.prog']],unread=game.reviews.unread;
  tabs.innerHTML=T.map(([k,l])=>`<button data-t="${k}" class="${(k==='salon'?typeof sel==='number':sel===k)?'sel':''}">${tx(l)}${k==='rev'&&unread&&sel!=='rev'?`<span class="badge">${unread>99?'99+':unread}</span>`:''}${k==='prog'&&game.missions.claimable?`<span class="badge">${game.missions.claimable}</span>`:''}</button>`).join('')+`<button class="tog" id="bMin">${$('#panel').classList.contains('min')?'▴':'▾'}</button>`;
  tabs.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{sel=b.dataset.t==='salon'?lastChair:b.dataset.t;$('#panel').classList.remove('min');renderPanel(true);const pb=$('#pbody');pb.classList.remove('fade');void pb.offsetWidth;pb.classList.add('fade');});
  $('#bMin').onclick=()=>{$('#panel').classList.toggle('min');renderTabs();};}
function swatches(k,cur){return `<button class="sw none ${cur<0?'sel':''}" data-${k}="-1" title="-"></button>`+DYES.map((d,i)=>`<button class="sw ${cur===i?'sel':''}" data-${k}="${i}" title="${dyeName(i)}" style="background:${hexCss(d.h)}"></button>`).join('');}
function seg(k,list,cur,lab=n=>n){return `<span class="seg">${list.map((n,i)=>`<button data-${k}="${typeof cur==='string'?n:i}" class="${(typeof cur==='string'?n===cur:i===cur)?'sel':''}">${lab(n)}</button>`).join('')}</span>`;}
/** A press on the panel holds back redraws until the click lands, so a payment mid-press cannot swallow the click. */
let panelHeldAt=0,panelPending=false;
function releasePanel(){if(!panelHeldAt)return;panelHeldAt=0;setTimeout(()=>{if(panelPending){panelPending=false;renderPanel(true);}},0);}
$('#panel').addEventListener('pointerdown',()=>{panelHeldAt=performance.now();});
addEventListener('pointerup',releasePanel);addEventListener('pointercancel',releasePanel);addEventListener('blur',releasePanel);
function renderPanel(force){if(panelHeldAt&&performance.now()-panelHeldAt<2000){panelPending=true;return;}if(typeof sel==='number'&&!stations[sel])sel=lastChair=0;
  const key=(typeof sel==='number'?(()=>{const st=stations[sel];return [sel,st.state,st.sty.name,st.cust&&st.cust.id,st.opi,game.layout.chairs,!!styling,i18n.lang].join('|');})():ui.key(sel))+'|'+game.reviews.unread;
  if(!force&&key===panelKey){refreshDynamic();return;}panelKey=key;renderTabs();
  if(typeof sel!=='number'){pbody.innerHTML=ui.render(sel);return;}
  const st=stations[sel],c=st.cust,chairRow=`<div class="seg" style="margin-bottom:4px">${stations.map(x=>`<button data-do="chair-tab:${x.i}" class="${x.i===sel?'sel':''}">${x.i+1}·${nm(x.sty.name)}</button>`).join('')}</div>`;
  if(st.vacant){pbody.innerHTML=chairRow+`<div class="dim">${tx('vac.note')}</div>`;return;}
  let h=chairRow+`<div class="ph"><b>${tx('chair',st.i+1)}</b> · <span style="color:${nameColour(st.sty)}">${rankMark(st.sty)}${nm(st.sty.name)}</span> <span class="dim">(${tx('style.'+st.sty.style)})</span> · <span id="stl">${stLabel(st)}</span></div>`;
  if(!c){pbody.innerHTML=h+`<div class="dim">${tx('free.next',queue.length?queue.map(q=>nm(q.name)).join(', '):tx('free.nobody'))}</div><div id="help">${tx('free.help')}</div>`;return;}
  h+=`<div class="ord">${c.vip?`<span class="gold">${tx('vip')}</span> `:''}${c.influencer?`<span class="gold">${tx('inf.tag',c.influencer.handle)}</span> `:''}<b class="${c.villain?'bad':''}">${tx('order.wants',nm(c.name))}</b> <span class="otext">${orderText(c.order)}</span> <span class="dim">· ${c.influencer?tx('inf.free'):`$${c.price} · ${tx('p.budget',c.budget)}`}</span>${st.state==='consult'&&!styling?` <button class="go" data-do="style" ${ownerBusy()?'disabled':''}>${tx('p.direct')}</button>`:''}</div>`;
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
function resultBars(r){return `<div class="dim" style="font-size:.9em">${tx('r.title')}</div>`+[['r.length',r.length],['r.style',r.style],['r.colour',r.colour],['r.quality',r.quality],['r.service',r.service??0],['r.satisfaction',r.satisfaction]].map(([k,v])=>`<div class="bar"><span>${tx(k)}</span><div class="tr"><div class="fl" style="width:${Math.round(v*100)}%;background:${v>.75?'#8fc25a':v>.5?'#ffb15a':'#d8314a'}"></div></div><b>${Math.round(v*100)}%</b></div>`).join('')+(r.specialist?`<div class="good">${tx('r.specialty',5)}</div>`:'');}
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
  const lab=tint>0?labMix(h.lab,FOIL,tint):h.lab,w=h.wave;
  const strand=(j,width,shade)=>{const s=STR[j],x0=Math.round(24-s.p.x*75*(s.p.z>.05?1.2:1)),y0=s.z===3?12:s.z===2?13:16,Lp=Math.round(h.len[j]*(1-.12*w)*.62);
    g.fillStyle=labCss(lab,shade);for(let y=0;y<Lp;y++){const off=Math.round(Math.sin(y*(.35+.12*w)+j)*w*1.1);g.fillRect(x0-(width>>1)+off,y0+y,width,1);}};
  g.fillStyle='#5f5a68';g.fillRect(7,41,34,15);
  [0,1,2,3,4,5,6].forEach(j=>strand(j,5,.78)); // hair behind the head shows around the neck and shoulders, never across the face
  g.fillStyle=skin;g.fillRect(20,32,8,10);g.fillRect(15,10,18,22);
  const side=(h.len[7]+h.len[8]+h.len[9]+h.len[10])/4,capW=side<4?14:20;
  g.fillStyle=labCss(lab,.93);g.fillRect(24-capW/2,7,capW,13);g.fillRect(24-capW/2+1,6,capW-2,1);
  [7,8,9,10,11,12].forEach(j=>strand(j,3,.86));}
function updateHud(){game.syncMissions();const g=game,e=g.economy,money=n=>(n<0?'−$':'$')+Math.abs(n);$('#offday').classList.toggle('show',started&&g.dayOff&&$('#menu').classList.contains('hide'));
  const stage=st=>!st.cust?`<span class="dim">${tx('stage.free')}</span>`:st.state==='work'?tx('stage.'+st.ops[st.opi].type):tx('stage.'+(st.state==='consult'?'consult':st.state==='await'?(st.cust.inWash?'shampoo':'seating'):'reveal'));
  const m=st=>st.cust?Math.round(score(st.cust.hair,st.cust.order).all*100)+'%':'',row=(k,v)=>`<tr><td>${tx(k)}</td><td style="text-align:right">${v}</td></tr>`;
  $('#hud').innerHTML=`<h1><span>CIEL GROUND</span><span>${tx('hud.day',g.clock.day)}(${tx('wd.'+g.weekday)}) ${g.dayOff?tx('hud.off'):g.clock.timeText}</span></h1>
  <table>${row('hud.cash',money(e.cash))}${row('hud.rep',g.reputation.starText)}${row('hud.rating',g.reviews.count?`★${g.reviews.rating.toFixed(1)} (${g.reviews.count})`:'–')}${row('hud.followers',g.marketing.followers.toLocaleString())}${row('hud.hours',`${g.clock.openHour}:00–${g.clock.closeHour}:00`)}${row('hud.cust',g.servedToday)}${row('hud.load',`${queue.length+stations.filter(s=>s.cust).length+custs.filter(q=>q.state==='process'||q.state==='ready').length} / ${stations.length+terr.length+procSeats.length}`)}${row('hud.staff',`${g.staff.hired.length+1} / ${g.layout.chairs+1}`)}${row('hud.opcost',money(-e.dailyOperatingCost))}${row('hud.profit',money(e.dailyProfit))}</table>
  <table class="foot">${stations.map(st=>`<tr class="${st.state==='work'?'srv':''}"><td>${st.state==='work'?'✂':st.i+1}</td><td style="color:${nameColour(st.sty)}">${rankMark(st.sty)}${nm(st.sty.name)}</td><td class="${st.cust&&st.cust.villain?'bad':''}">${st.cust?(st.cust.vip?'★':'')+nm(st.cust.name):'—'}</td><td>${st.vacant?'':stage(st)}</td><td>${m(st)}</td></tr>`).join('')}</table>
  ${last?`<div class="dim">${tx('hud.last',nm(last.name),Math.round(last.all*100),nm(last.sty),last.mins.toFixed(1))}</div>`:''}`;}

/* controls */
$('#bRotL').onclick=()=>camK--;$('#bRotR').onclick=()=>camK++;
// Keys are read by position so they work with a Korean keyboard layout too.
addEventListener('keydown',e=>{const K={KeyQ:'q',KeyE:'e',KeyR:'r',Escape:'escape'}[e.code]||e.key.toLowerCase();
  if(styling){if(K==='q')styling.turn(-1);if(K==='e')styling.turn(1);return;}
  if(build.isActive){if(K==='r'){build.rotate();renderPanel(true);}if(K==='escape'){build.cancel();renderPanel(true);}return;}
  if(K==='q')camK--;if(K==='e')camK++;});
const TM=['auto','day','dusk','night'];
function syncCtrl(){$('#bTime').textContent=tx('time.'+timeMode);$('#bSpd').textContent='×'+speed;$('#bSpd').classList.toggle('on',speed>1);
  $('#bAuto').textContent=tx('ctl.auto');$('#bAuto').classList.toggle('on',autoOn);$('#bLang').textContent=tx('ctl.lang');$('#bSound').textContent=tx('ctl.sound');$('#bSound').classList.toggle('on',!audio.muted);
  [['bRotL','rotL'],['bRotR','rotR'],['bTime','time'],['bSpd','spd'],['bAuto','auto'],['bHelp','help'],['bLang','lang'],['bSound','sound']].forEach(([i,k])=>$('#'+i).title=tx('tt.'+k));}
function setAuto(on){autoOn=on;syncCtrl();renderPanel(true);}
function setLang(l){i18n.lang=l;document.documentElement.lang=l;try{localStorage.setItem('cd-lang',l);}catch(e){}syncCtrl();updateHud();renderPanel(true);renderSites();if(!$('#menu').classList.contains('hide'))renderMenu();}
$('#bTime').onclick=()=>{timeMode=TM[(TM.indexOf(timeMode)+1)%4];syncCtrl();};
$('#bSpd').onclick=()=>{speed={1:3,3:5,5:1}[speed]||1;syncCtrl();};
$('#bAuto').onclick=()=>setAuto(!autoOn);
$('#bLang').onclick=()=>setLang(i18n.lang==='ko'?'en':'ko');
$('#bSound').onclick=()=>{audio.toggleMute();syncCtrl();};
$('#bHelp').onclick=()=>{build.cancel();paused=true;openMenu('how','game');};
$('#bZo').onclick=()=>zoomGoal=clamp(zoomGoal/1.2,.6,2.2);$('#bZi').onclick=()=>zoomGoal=clamp(zoomGoal*1.2,.6,2.2);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomGoal=clamp(zoomGoal*(e.deltaY<0?1.1:1/1.1),.6,2.2);},{passive:false});
const ptrs=new Map();let pinch0=0,zoom0=1,down=null;
canvas.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===1)down=[e.clientX,e.clientY];if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom0=zoomGoal;down=null;}});
canvas.addEventListener('pointermove',e=>{if(build.isActive){const q=groundAt(e.clientX,e.clientY);if(q)build.hover(q);ghostTip(e.clientX,e.clientY);}else ghostTip();if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===2&&pinch0){const [a,b]=[...ptrs.values()];zoomGoal=clamp(zoom0*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch0,.6,2.2);}});
const endP=e=>{if(down&&ptrs.size===1&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<10)pickAt(e.clientX,e.clientY);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=0;if(!ptrs.size)down=null;};
canvas.addEventListener('pointerup',endP);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null;});
const ray=new THREE.Raycaster();
const groundPlane=new THREE.Plane(UP,0),_gp=V();
function groundAt(x,y){const r=canvas.getBoundingClientRect();x-=camOff.x*PIX;y+=camOff.y*PIX;ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),cam);return ray.ray.intersectPlane(groundPlane,_gp)?{x:_gp.x,z:_gp.z}:null;}
/** A note beside the cursor saying why the piece cannot go where it is held. */
const tipEl=document.createElement('div');tipEl.className='gtip';$('#pops').appendChild(tipEl);
function ghostTip(x,y){const r=build.isActive&&build.active.reason;if(!r){tipEl.style.display='none';return;}
  const [k,id]=r.split(':');tipEl.textContent=tx('build.why.'+k,id?tx('f.'+id):'');tipEl.style.display='block';tipEl.style.left=x+'px';tipEl.style.top=y+'px';}
function pickAt(x,y){if(build.isActive){const q=groundAt(x,y);if(q){build.hover(q);const ok=build.commit(q);audio.play(ok?'place':'deny');ghostTip(x,y);if(ok)renderPanel(true);}return;}if(styling)return;const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-((y-r.top)/r.height)*2+1),cam);
  if(sel==='build'){const it=furnitureView.pick(ray);if(it&&build.start(it.id,it))renderPanel(true);return;}
  const hits=ray.intersectObjects(world.children,true).filter(h=>h.object.visible&&h.object.parent.visible);if(!hits.length)return;
  const h=hits[0],f=h.object.userData.fig;
  if(f){const st=stations.find(s=>s.sty.fig===f||(s.cust&&s.cust.fig===f));if(st){sel=st.i;lastChair=st.i;$('#panel').classList.remove('min');renderPanel(true);return;}
    const c=custs.find(c=>c.fig===f);if(c){popup(`${nm(c.name)}: ${orderText(c.order)}`,c.fig.head,'');return;}}
  const p=h.point;let best=null,bd=.9;stations.forEach(s=>{const d=Math.hypot(p.x-s.chair.x,p.z-s.chair.z);if(d<bd){bd=d;best=s;}});
  if(best){sel=best.i;$('#panel').classList.remove('min');renderPanel(true);}}

const incidents=new IncidentCard($('#incident'));
let filming=null;
/** Who films a post: Ruby, leaving the desk, or Lia when there is no receptionist and she has no client. */
function filmer(){if(filming||styling)return null;if(game.staff.receptionist.hired)return {fig:recep,desk:true};const st=ownerStation();
  if(OWNER.floating||!st)return {fig:OWNER.fig};return st.state==='free'&&!st.sweep&&!st.washing?{fig:OWNER.fig,st}:null;}
function postOn(channel){const who=filmer();if(!who){popup(tx('mk.busy'),OWNER.fig.head,'');audio.play('deny');return;}
  const r=game.post(channel);if(!r)return;const name=tx('mk.ch.'+channel),f=who.fig,film=CHANNELS[channel].film;
  filming={who};if(who.desk)game.staff.receptionist.away=true;if(who.st)who.st.filming=true;
  const spot=stations[0]?stations[0].approach.clone().add(V(.7,0,.5)):V(0,0,.6);f.handL=f.handR=null;f.walkTo(route(f.pos,spot),()=>{f.setTool('phone');f.yaw=stations[0]?stations[0].face+Math.PI:0;});popup(tx('mk.shooting',name),f.head,'');
  later(film,()=>{f.setTool(null);filming=null;if(who.st)who.st.filming=false;
    if(who.desk){f.walkTo([...route(f.pos,deskInfo.pay),deskInfo.seat.clone()],()=>{Object.assign(f,{mode:'sit',yaw:deskInfo.seatYaw,seatH:.72,footY:.3});f.pos.copy(deskInfo.seat);game.staff.receptionist.away=false;});}
    popup(r.viral?tx('mk.viralPop',name,r.views.toLocaleString()):tx('mk.postPop',name,r.views.toLocaleString(),r.gained.toLocaleString()),f.head,'big');audio.play(r.viral?'levelUp':'happy');renderPanel(true);});
  renderPanel(true);}
/** Morning news: what the rival did overnight, and stylists who have had enough. */
function morningNews(){game.news.splice(0).forEach((k,i)=>later(.6+i*1.4,()=>popup(k.startsWith('fin:')?tx('fin.news.'+k.slice(4)):tx('rival.news.'+k),recep.head,'big')));
  game.resignations.splice(0).forEach(e=>{if(!e.hired)return;const cost=e.salary*2;audio.play('bad');
    incidents.show({title:tx('inc.resign.t',nm(e.name)),text:tx('inc.resign'),fallback:1,options:[{label:tx('inc.keep',cost),run:()=>{game.economy.charge('bonus',cost);e.addStress(-45);}},{label:tx('inc.letGo'),run:()=>{e.quits=true;}}]});});}
function replyToReview(id,kind){const r=game.replyToReview(id,kind);if(!r)return;
  if(r.review.removed)popup(tx('rv.pop.removed'),recep.head,'big');else if(r.review.replied==='rejected'){popup(tx('rv.pop.rejected'),recep.head,'big');audio.play('bad');}else if(r.edited)popup(tx('rv.pop.edited'),recep.head,'big');}
const ui=new TycoonUI(game,build,i18n,{now:()=>simT,sweepMinutes:c=>Math.round(sweepTime(c)/game.clock.hourLength*60),canMove:it=>canMove(it),isQueued:it=>queuedMoves.has(it),hasOpenChair:()=>!!openChair(),hire:hireStaff,fire:fireStaff,syncChairs:()=>{syncFurniture();syncChairs();alignToWalls();},expanded:()=>{syncFurniture();syncChairs();alignToWalls(true);},syncSupport,openBranch,openMonth:()=>{monthFrom='panel';openMenu('month','game');paused=true;},viewSite:i=>focusSite(i),canModify:it=>canModify(it),canSell:it=>canSell(it),
  post:postOn,canFilm:()=>!!filmer(),filming:()=>!!filming,reply:replyToReview,spent:()=>audio.play('cash'),hasChair:e=>stations.some(s=>s.sty===e),seats:()=>{const n=[0,0];return stations.map(s=>{const site=siteOf(s.item.x);return {vip:s.item.id==='vipRoom',site,num:++n[site]};});},seatOf:e=>stations.findIndex(s=>s.sty===e),moveSeat:(e,i)=>moveToSeat(e,i)});
pbody.addEventListener('click',e=>{const b=e.target.closest('[data-do]');if(!b||b.disabled)return;const [a,v]=b.dataset.do.split(':');
  if(a==='chair-tab'){sel=lastChair=+v;}else if(a==='style')openStyling(stations[sel]);else if(a==='style-close')closeStyling(false);else if(a==='turn'){styling.turn(+v);return;}else if(a==='compare'){styling.toggleCompare();refreshDynamic();return;}else ui.handle(a,v);
  renderPanel(true);});

/* ================= branches: separate salons beside the main one ================= */
let site=0,branchShell=null;
function signTexture(text){const w=Math.max(140,text.length*12+8);return canvasTex(w,22,g=>paintSign(g,w,22,text));}
/** The second salon's building: the first salon's shell further down the street, with its own sign and light. */
function buildBranchShell(){if(branchShell||!game.layout.branchOpen)return;const root=new THREE.Group();root.position.set(BRANCH_X,0,0);world.add(root);branchShell=root;
  const copy=o=>{const c=o.clone();c.visible=true;root.add(c);return c;},sign=signTexture('CIEL GROUND 2');
  copy(salonMesh);extras.forEach(copy);salonFloor(8,6,0,0,root);tiledSurface(9,3,'#b7a99a','#9a8f84',0,4.7,root);
  walls.slice(0,4).forEach(w=>{const full=copy(w.full),low=copy(w.low);full.traverse(o=>{if(o.isMesh&&o.material.map===signTex)o.material=new THREE.MeshBasicMaterial({map:sign});});walls.push({n:w.n,full,low,off:false});});
  const light=new THREE.PointLight(0xffd98a,0,8,1.5);light.position.set(0,2.4,0);root.add(light);inLights.push(light);}
/** Opens the second salon, if the game allows it, and shows it. */
function openBranch(){if(!game.openBranch())return false;buildBranchShell();syncFurniture();renderSites();focusSite(1);audio.play('levelUp');popup(tx('br.opened'),recep.head,'big');return true;}
function focusSite(i){site=i;build.cancel();if(i===0)syncChairs();else{camHome.set(BRANCH_X,.55,1.2);viewScale=1;}renderSites();renderPanel(true);}
function renderSites(){const el=$('#sites'),open=game.layout.branchOpen;el.classList.toggle('show',open);
  el.innerHTML=open?[0,1].map(i=>`<button data-site="${i}" class="${site===i?'sel':''}">${tx(i?'site.branch':'site.main')}</button>`).join(''):'';}
function updateBranchCard(){$('#branchCard').classList.remove('show');}
$('#sites').addEventListener('click',e=>{const b=e.target.closest('[data-site]');if(b)focusSite(+b.dataset.site);});

/**
 * Daily profit as bars around a zero line: profit rises in blue, a loss drops in orange, closed Sundays are hatched grey.
 * Only the best and worst days carry a value; hovering any day shows its own. `label(day, i)` names the x-axis ticks.
 */
function profitChart(days,label){const usd=v=>(v<0?'−$':'$')+Math.abs(Math.round(v)).toLocaleString(),closed=d=>(d.day-1)%7===6;
  const hi=Math.max(0,...days.map(d=>d.profit)),lo=Math.max(0,...days.map(d=>-d.profit)),range=Math.max(1,hi+lo),zero=hi/range*100;
  const open=days.filter(d=>!closed(d)),best=open.reduce((b,d)=>!b||d.profit>b.profit?d:b,null),worst=open.reduce((b,d)=>!b||d.profit<b.profit?d:b,null);
  const cols=days.map((d,i)=>{const h=Math.abs(d.profit)/range*100,top=d.profit>=0?zero-h:zero,off=closed(d);
    const tag=d===best&&d.profit>0?`<b class="mc-v" style="bottom:${100-top}%">${usd(d.profit)}</b>`:d===worst&&d.profit<0?`<b class="mc-v" style="top:${top+h}%">${usd(d.profit)}</b>`:'';
    const tip=tx('chart.tip',d.day,tx('wd.'+((d.day-1)%7)),usd(d.profit))+(off?' · '+tx('chart.closed'):'');
    return `<div class="mc-col${i<3?' l':i>days.length-4?' r':''}" data-tip="${tip}"><i class="${off?'off':d.profit<0?'neg':''}" style="top:${top}%;height:max(${d.profit?2:0}px,${h}%)"></i>${tag}</div>`;}).join('');
  const ys=[[hi,0],[0,zero],[-lo,100]].filter(([v,at],k)=>k===1||(v&&Math.abs(at-zero)>16)).map(([v,at])=>`<span style="top:${at}%">${usd(v)}</span>`).join('');
  return `<div class="mchart"><div class="mc-y">${ys}</div><div class="mc-plot"><div class="mc-zero" style="top:${zero}%"></div>${cols}</div><div></div><div class="mc-x">${days.map((d,i)=>`<span>${label(d,i)}</span>`).join('')}</div></div>
    <div class="mc-key"><span><i></i>${tx('chart.profit')}</span><span><i class="neg"></i>${tx('chart.loss')}</span><span><i class="off"></i>${tx('chart.closed')}</span></div>`;}

/* ================= start menu ================= */
let menuScreen='main',menuFrom='main',monthFrom='panel';
const mbox=$('#mcard');
/** Tomorrow's opening hours, adjustable from the end-of-day report. */
function dayHours(){const [o,c]=game.plannedHours,b=(w,s)=>`<button data-act="hrs:${w}${s>0?'+':'-'}" ${game.canShiftHours(w==='o'?0:1,s)?'':'disabled'}>${s>0?'+':'−'}</button>`;
  return `<div class="mrow"><label>${tx('hours.tomorrowL')}</label>${b('o',-1)}<b>${o}:00</b>${b('o',1)} – ${b('c',-1)}<b>${c}:00</b>${b('c',1)}<span class="dim">${tx('hours.length',c-o)}</span></div>`;}
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
    h=`<div class="mhead">${tx('day.title',q.day)}</div><table style="width:100%;border-collapse:collapse">${ledger(q.revenue,'')}${line(tx('day.totalRev'),'$'+q.totalRevenue,'gold')}${ledger(q.operating,'−','bad')}${line(tx('day.totalOp'),'−$'+q.totalOperating,'gold')}${line(tx('day.profit'),(q.profit<0?'−$':'$')+Math.abs(q.profit),q.profit<0?'bad':'good')}${q.totalInvestment?ledger(q.investment,'−','dim')+line(tx('day.invest'),'−$'+q.totalInvestment,'dim'):''}${Object.keys(q.funding||{}).length?ledger(q.funding,'+','good'):''}${line(tx('day.rep'),(q.reputation>=0?'+':'')+q.reputation.toFixed(1))}${line(tx('day.reviews'),q.reviews.count?tx('day.reviewsV',q.reviews.count,q.reviews.average.toFixed(1)):'–')}${line(tx('day.followers'),`${q.followers.now.toLocaleString()} (${q.followers.change>=0?'+':'−'}${Math.abs(q.followers.change).toLocaleString()})`)}${['dashed','refunds','discounts'].map(k=>q.incidents[k]?line(tx('day.'+k),'−$'+q.incidents[k],'dim'):'').join('')}</table>${dayHours()}<div class="mbtns">${game.monthClosedToday?`<button class="go big" data-act="month">${tx('month.view')}</button>`:`<button class="go big" data-act="nextday">${tx(game.weekday===5?'day.toSunday':'day.next')}</button>`}</div>`;}
  else if(menuScreen==='week'){const w=game.weekReport,line=(k,v,c)=>`<tr><td>${k}</td><td style="text-align:right" class="${c||''}">${v}</td></tr>`,ledger=(o,sign,c)=>Object.entries(o).map(([k,v])=>line(tx('led.'+k),sign+'$'+v.toLocaleString(),c)).join(''),usd=v=>(v<0?'−$':'$')+Math.abs(v).toLocaleString();
    const bars=profitChart(w.days,d=>tx('wd.'+((d.day-1)%7)));
    h=`<div class="mhead">${tx('week.title',w.week,w.from,w.to)}</div><div class="dim">${tx('week.sub')}</div>${bars}<table style="width:100%;border-collapse:collapse">${ledger(w.revenue,'')}${line(tx('day.totalRev'),usd(w.totalRevenue),'gold')}${ledger(w.operating,'−','bad')}${line(tx('day.totalOp'),'−$'+w.totalOperating.toLocaleString(),'gold')}${line(tx('week.profit'),usd(w.profit),w.profit<0?'bad':'good')}${w.totalInvestment?ledger(w.investment,'−','dim'):''}${Object.keys(w.funding).length?ledger(w.funding,'+','good'):''}${line(tx('week.served'),w.served)}${line(tx('day.reviews'),w.reviews.count?tx('day.reviewsV',w.reviews.count,w.reviews.average.toFixed(1)):'–')}${line(tx('day.rep'),(w.reputation>=0?'+':'')+w.reputation.toFixed(1))}${line(tx('day.followers'),(w.followers>=0?'+':'−')+Math.abs(w.followers).toLocaleString())}</table><div class="mbtns">${game.monthClosedToday?`<button class="go big" data-act="month">${tx('month.view')}</button>`:''}<button class="${game.monthClosedToday?'':'go big'}" data-act="weekfix">${tx('week.fix')}</button><button data-act="monday">${tx('week.monday')}</button></div>`;}
  else if(menuScreen==='month'){const m=game.monthReport,usd=v=>(v<0?'−$':'$')+Math.abs(Math.round(v)).toLocaleString(),line=(k,v,c)=>`<tr><td>${k}</td><td style="text-align:right" class="${c||''}">${v}</td></tr>`,ledger=(o,sign,c)=>Object.entries(o).map(([k,v])=>line(tx('led.'+k),sign+'$'+v.toLocaleString(),c)).join('');
    const vs=(a,b)=>{if(!b)return '';const p=Math.round((a-b)/Math.abs(b)*100);return ` <span class="${p>=0?'good':'bad'}">(${tx('month.vsPrev',(p>=0?'+':'−')+Math.abs(p)+'%')})</span>`;},P=m.prev||{};
    const weeks=[];m.days.forEach(d=>{const k=Math.floor((d.day-m.from)/7),w=weeks[k]||(weeks[k]={from:d.day,to:d.day,revenue:0,profit:0});w.to=d.day;w.revenue+=d.revenue||0;w.profit+=d.profit;});
    const bars=profitChart(m.days,(d,i)=>i===0||d.day%5===0?d.day:'')+`<table class="mweeks"><tr><th>${tx('month.colWeek')}</th><th>${tx('month.colDays')}</th><th>${tx('month.colRev')}</th><th>${tx('month.colProfit')}</th></tr>${weeks.map((w,k)=>`<tr><td>${tx('month.wk',k+1)}</td><td>${tx('month.days',w.from,w.to)}</td><td>${usd(w.revenue)}</td><td>${usd(w.profit)}</td></tr>`).join('')}</table>`;
    const staff=m.staff.length?m.staff.map((x,i)=>`<div class="brow"><span>${i+1}. <b>${nm(x.name)}</b></span><span class="sp"></span><span class="dim">${tx('month.staffRow',x.served,x.earn.toLocaleString())}</span></div>`).join(''):`<div class="dim">–</div>`;
    const goal=m.goal?`<div class="${m.goal.hit?'good':'dim'}">${tx(m.goal.hit?'month.goalHit':'month.goalMiss',m.goal.revenue.toLocaleString(),m.goal.made.toLocaleString(),m.goal.reward.toLocaleString())}</div>`:'';
    const btns=monthFrom==='day'?`<button class="go big" data-act="nextday">${tx(game.weekday===5?'day.toSunday':'day.next')}</button>`:monthFrom==='week'?`<button class="go big" data-act="weekfix">${tx('week.fix')}</button><button data-act="monday">${tx('week.monday')}</button>`:`<button class="go" data-act="back">${tx('m.resume')}</button>`;
    h=`<div class="mhead">${tx('month.title',m.month,m.from,m.to)}</div><div class="dim">${tx('month.sub')}</div>${bars}<table style="width:100%;border-collapse:collapse">${ledger(m.revenue,'')}${line(tx('day.totalRev'),usd(m.totalRevenue)+vs(m.totalRevenue,P.totalRevenue),'gold')}${ledger(m.operating,'−','bad')}${line(tx('day.totalOp'),'−$'+m.totalOperating.toLocaleString(),'gold')}${line(tx('month.profit'),usd(m.profit)+vs(m.profit,P.profit),m.profit<0?'bad':'good')}${m.totalInvestment?ledger(m.investment,'−','dim'):''}${Object.keys(m.funding).length?ledger(m.funding,'+','good'):''}${line(tx('week.served'),m.served+vs(m.served,P.served))}${line(tx('day.reviews'),m.reviews.count?tx('day.reviewsV',m.reviews.count,m.reviews.average.toFixed(1)):'–')}${line(tx('day.rep'),(m.reputation>=0?'+':'')+m.reputation.toFixed(1))}${line(tx('day.followers'),(m.followers>=0?'+':'−')+Math.abs(m.followers).toLocaleString())}${line(tx('month.cash'),usd(m.cash.from)+' → '+usd(m.cash.to))}${m.bestDay?line(tx('month.bestDay'),tx('month.bestDayV',m.bestDay.day,m.bestDay.profit.toLocaleString())):''}</table>
      <div class="hsec"><h3>${tx('month.staffTitle')}</h3>${staff}</div><div class="hsec"><h3>${tx('month.goalTitle')}</h3>${goal}<div class="gold">${tx('month.nextGoal',m.nextGoal.revenue.toLocaleString(),m.nextGoal.reward.toLocaleString())}</div><div class="dim">${tx('month.goalNote')}</div></div><div class="mbtns">${btns}</div>`;}
  else h=`<div class="mhead">${tx('m.opts')}</div>${langRow()}
    <div class="mrow"><label>${tx('m.time')}</label>${mSeg('time',TM.map(v=>[v,tx('m.t.'+v)]),timeMode)}</div>
    <div class="mrow"><label>${tx('m.speed')}</label>${mSeg('spd',[[1,'×1'],[3,'×3'],[5,'×5']],speed)}</div>
    <div class="mrow"><label>${tx('m.music')}</label><input type="range" min="0" max="100" value="${Math.round(audio.musicVolume*100)}" data-vol="music"></div>
    <div class="mrow"><label>${tx('m.sfx')}</label><input type="range" min="0" max="100" value="${Math.round(audio.sfxVolume*100)}" data-vol="sfx"></div>
    <div class="mbtns side">${backBtn}</div>`;
  mbox.innerHTML=h;mbox.scrollTop=top;}
function openMenu(s,from){menuScreen=s;menuFrom=from;mbox.scrollTop=0;$('#menu').classList.remove('hide');renderMenu();mbox.scrollTop=0;}
/** Opens the next day; a Sunday opens on the weekly settlement instead of the salon floor. */
function beginDay(){game.nextDay();spawnTimer=1.5;paused=false;closeMenu();alignToWalls();syncRoster();morningSeats();morningNews();updateHud();renderPanel(true);if(game.dayOff)openMenu('week','game');}
function offdayText(){const o=$('#offday');o.querySelector('.offt').textContent=tx('off.banner');o.querySelector('[data-off="week"]').textContent=tx('off.week');o.querySelector('[data-off="monday"]').textContent=tx('week.monday');}
function closeMenu(){offdayText();$('#menu').classList.add('hide');}
function openDay(){game.startDay();spawnTimer=1.5;paused=false;}
function startGame(fresh){if(fresh)game.saves.clear();else restoreGame();started=true;closeMenu();document.body.classList.remove('inmenu');syncChairs();syncSupport();buildBranchShell();renderSites();openDay();alignToWalls();syncRoster();morningSeats();morningNews();game.updateProgress();updateHud();renderPanel(true);if(game.dayOff)openMenu('week','game');}
mbox.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const [a,v]=b.dataset.act.split(':');
  if(a==='start')startGame(false);
  else if(a==='new')startGame(true);
  else if(a==='nextday'||a==='monday'){if(a==='monday')game.save();beginDay();}
  else if(a==='weekfix'){closeMenu();paused=false;updateHud();renderPanel(true);}
  else if(a==='month'){monthFrom=menuScreen;openMenu('month',menuFrom);}
  else if(a==='how'||a==='opts')openMenu(a,'main');
  else if(a==='back'){if(menuFrom==='game'){paused=false;closeMenu();}else openMenu('main','main');}
  else if(a==='lang')setLang(v);
  else if(a==='hrs'){game.shiftHours(v[0]==='o'?0:1,v[1]==='+'?1:-1);renderMenu();}
  else{if(a==='mode')setAuto(v==='auto');if(a==='time')timeMode=v;if(a==='spd')speed=+v;syncCtrl();renderMenu();}});
mbox.addEventListener('input',e=>{const k=e.target.dataset.vol;if(k)audio.setVolume(k,+e.target.value/100);});
addEventListener('click',e=>{if(e.target.closest('button'))audio.play('click');});
function boot(){const fonts=document.fonts?Promise.all([document.fonts.load('16px VT323'),document.fonts.load('14px Silkscreen'),document.fonts.load('13px Galmuri11','가')]):Promise.resolve();
  Promise.race([fonts,new Promise(r=>setTimeout(r,2500))]).catch(()=>{}).then(()=>LOADER.ready(()=>openMenu('main','main')));}
syncCtrl();

/* ================= main loop ================= */
resize();addEventListener('resize',resize);
syncFurniture();syncChairs();renderPanel(true);updateHud();
let lastT=performance.now(),hudT=0,clockT=0,realT=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-lastT)/1000);lastT=now;realT+=dt;
  // Fast speeds run the simulation in small steps so walking and services stay smooth.
  if(started&&!paused){const total=dt*(styling?1:speed),steps=Math.ceil(total/.06);for(let i=0;i<steps;i++)simStep(total/steps);}else figs.forEach(f=>f.pose(0));
  stylingTick(dt);if(started&&!paused)incidents.update(dt);
  updateLights(dt);updateCam(dt);envStep(dt,realT);updatePops(dt);
  if((hudT+=dt)>.25){hudT=0;if(started){updateHud();renderPanel(false);updateBranchCard();}
    // The music turns tense while a difficult client is in or around the salon.
    audio.setMood(started&&custs.some(c=>c.villain&&c.state!=='gone')?'tense':'calm');}
  if((clockT+=dt)>1){clockT=0;drawClock();if(started){alignToWalls();applyQueuedMoves();}}
  renderer.setRenderTarget(rt);renderer.render(scene,cam);
  renderer.setRenderTarget(null);renderer.render(post,postCam);
  if(!booted){booted=true;boot();}}
requestAnimationFrame(frame);
// `?debug` exposes the simulation for automated play tests.
if(new URLSearchParams(location.search).has('debug'))window.__cd={game,build,stations,custs,queue,incidents,nav,helpers,booths,sync:()=>{syncFurniture();syncChairs();},get speed(){return speed;},set speed(v){speed=v;}};
