import { V } from '../core/math.js';

export const STR=[];
[-.1,-.05,0,.05,.1].forEach(x=>STR.push({p:V(x,0,-.15),z:0}));
[-1,1].forEach(s=>STR.push({p:V(.125*s,.02,-.12),z:1}));
[-1,1].forEach(s=>{STR.push({p:V(.145*s,.03,-.05),z:2});STR.push({p:V(.145*s,.04,.03),z:2});});
[-1,1].forEach(s=>STR.push({p:V(.14*s,.08,.1),z:3}));
STR.forEach(o=>o.n=V(o.p.x,0,o.p.z).normalize());
export const NS=STR.length;
export const CAP=[];for(const x of [-.1,-.05,0,.05,.1])for(const z of [-.11,-.055,0,.055,.1])CAP.push({p:V(x,.145,z),z:-1});
for(const x of [-.1,-.05,0,.05,.1])for(const y of [.09,.035])CAP.push({p:V(x,y,-.135),z:-1});
for(const s of [-1,1])for(const z of [-.08,-.01,.06])CAP.push({p:V(.13*s,.085,z),z:2});
