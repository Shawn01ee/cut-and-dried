import test from 'node:test';
import assert from 'node:assert/strict';
import { wallGrid, wallTurn, WALL_TILE, WALL_PACE } from '../src/scene/OutletWall.js';
test('the monitor wall fits every shop in the area without overlap, pictures at the same shape, the last row centred',()=>{
 for (const [w,h] of [[780,830],[1200,600],[420,900]]) for (let n=1;n<=12;n++) {
  const T=wallGrid(n,w,h);assert.equal(T.length,n);
  for (const r of T) { assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=w+1&&r.y+r.h<=h+1,`inside ${n} ${w}x${h}`); assert.ok(Math.abs(r.w/(r.h-WALL_TILE.head-WALL_TILE.foot)-WALL_TILE.aspect)<.05); }
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) { const a=T[i],b=T[j]; assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'no overlap'); }
 }
 const three=wallGrid(3,780,830);assert.equal(three[2].x+three[2].w/2,390);assert.deepEqual(wallGrid(0,100,100),[]);
});
test('the wall draws a few tiles a frame in turn: every tile within a round, all of them on a fresh picture',()=>{
 const k=WALL_PACE.perFrame;
 for (let n=1;n<=12;n++) {
  assert.deepEqual(wallTurn(n,5,true).draw,[...Array(n).keys()],'fresh: all');
  let turn=0;const seen=new Map();const rounds=Math.ceil(n/k);
  for (let f=0;f<rounds*3;f++) { const t=wallTurn(n,turn,false);assert.ok(t.draw.length===Math.min(n,k));t.draw.forEach(i=>seen.set(i,(seen.get(i)||0)+1));turn=t.next;
   if (f===rounds-1) assert.equal(seen.size,n,`every tile within ${rounds} frames (${n})`); }
  const c=[...seen.values()];assert.ok(Math.max(...c)-Math.min(...c)<=1,`fair turns (${n})`);
 }
 assert.deepEqual(wallTurn(0,3,false),{draw:[],next:0});assert.deepEqual(wallTurn(3,7,false).draw,[1,2,0],'fewer tiles than before: wraps');
});
