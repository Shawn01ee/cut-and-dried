import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentTimes } from '../src/core/ArrivalProcess.js';
import { SalonNetwork, FORMATS, REST_FIXED_SHARE, REST_SUPPORT, REST_RECOVERY, LOSS_QUALITY } from '../src/tycoon/SalonNetwork.js';
import { Economy } from '../src/tycoon/Economy.js';
import { NetworkPanel } from '../src/ui/NetworkPanel.js';
import { outletPlan, phaseAt } from '../src/scene/OutletView.js';
import { I18n } from '../src/i18n/I18n.js';
const seeded = () => { let s=81231; return ()=>((s=(1664525*s+1013904223)>>>0)+.5)/4294967296; };
function setup() { const g={economy:new Economy(1e6),clock:{day:1},isSunday:false,weather:'cloudy',reputation:{value:85},progression:{level:10},layout:{tier:3},departments:{idolReady:true},staff:{hired:[{rank:'deputy'}, {rank:'designer'}],management:60,owner:{}},hq:{order:null}};g.network=new SalonNetwork(g);return g; }
test('Poisson counts have specified mean and variance without padding',()=>{
 const rng=seeded(), counts=Array.from({length:30000},()=>appointmentTimes(10,18,.5,rng).length);
 const mean=counts.reduce((a,b)=>a+b)/counts.length, variance=counts.reduce((a,b)=>a+(b-mean)**2,0)/(counts.length-1);
 assert.ok(Math.abs(mean-4)<.06);assert.ok(Math.abs(variance-4)<.13);assert.ok(counts.includes(0));assert.deepEqual(appointmentTimes(0,1,0),[]);
 assert.deepEqual(appointmentTimes(0,1,1,()=>0),[]);
});
test('growth gates, franchise royalty accounting, idempotence and closure costs',()=>{
 const g=setup(), n=g.network;assert.equal(n.open('room'),false);g.departments.idolReady=false;assert.equal(n.upgrade(),false);g.departments.idolReady=true;assert.equal(n.upgrade(),true);assert.equal(n.upgrade(),false);
 assert.equal(n.open('unknown'),false);assert.equal(n.open('room'),true);n.settle();assert.equal(n.outlets[0].last,null);
 g.clock.day++;g.economy.startDay();n.settle(()=>.95);const o=n.outlets[0],r=o.last,f=FORMATS.room;
 assert.equal(r.served,f.capacity);assert.equal(r.revenue,r.served*f.ticket);assert.equal(r.profit,r.revenue-r.expenses);assert.equal(g.economy.dailyProfit,r.royalty-f.support);
 const cash=g.economy.cash;n.settle();assert.equal(g.economy.cash,cash);
 n.toggle(o.id);g.clock.day++;g.economy.startDay();n.settle();assert.equal(o.last.revenue,0);assert.equal(o.last.profit,-Math.round(f.dailyCost*REST_FIXED_SHARE));assert.equal(g.economy.dailyProfit,-REST_SUPPORT);assert.equal(o.quality,70+REST_RECOVERY);
 assert.equal(n.coach(o.id),true);assert.equal(n.coach(o.id),false);assert.equal(o.quality,77);assert.equal(g.economy.dailyOperatingCost,REST_SUPPORT+500);
});
test('CEO requires deputy and handover; restored companies retain results and role',()=>{
 const g=setup(),n=g.network;n.upgrade();for(let i=0;i<3;i++)n.open('room');g.staff.hired[0].rank='master';assert.equal(n.lead(),false);g.staff.hired[0].rank='deputy';g.hq.order={};assert.equal(n.lead(),false);g.hq.order=null;assert.equal(n.lead(),true);assert.equal(g.staff.owner.role,'CEO');
 const h=setup();h.network.restore(JSON.parse(JSON.stringify(n)));assert.equal(h.network.stage,'ceo');assert.equal(h.staff.owner.role,'CEO');assert.equal(h.network.outlets.length,3);
 const old=setup();old.network.restore();assert.equal(old.network.flagship,false);assert.equal(old.network.executive,false);
});
test('an unprofitable outlet loses quality, while a closed outlet recovers at a cost',()=>{
 const g=setup(),n=g.network;n.upgrade();n.open('flagship');const o=n.outlets[0];
 g.clock.day++;g.economy.startDay();n.settle(()=>0);
 assert.equal(o.last.arrivals,0);assert.equal(o.last.profit,-FORMATS.flagship.dailyCost);
 assert.equal(o.last.qualityBefore,70);assert.equal(o.last.qualityAfter,70-LOSS_QUALITY);
 assert.equal(o.quality,70-LOSS_QUALITY);
 n.toggle(o.id);g.clock.day++;g.economy.startDay();n.settle(()=>0);
 assert.equal(o.last.qualityBefore,70-LOSS_QUALITY);
 assert.equal(o.last.qualityAfter,70-LOSS_QUALITY+REST_RECOVERY);
 assert.equal(g.economy.dailyProfit,-REST_SUPPORT);
});
test('weather is a shared demand input and bilingual UI has complete labels',()=>{
 const g=setup(),n=g.network;n.upgrade();n.open('flagship');const mean=n.forecast(n.outlets[0]);g.weather='storm';assert.equal(n.forecast(n.outlets[0]),mean*.75);
 for(const lang of ['ko','en']) { const html=new NetworkPanel(g,new I18n(lang)).render(true);assert.ok(!/net\.[a-z]|NaN|undefined/.test(html)); }
});
test('the morning draw is what the evening settles; a shop serves first come up to its capacity, one client a chair at a time',()=>{
 const g=setup(),n=g.network;n.upgrade();n.open('room');const o=n.outlets[0];g.clock.day++;Object.assign(g.clock,{elapsed:30,dayLength:150});g.economy.startDay();
 n.startDay(()=>.5);const drawn=o.today.times.length;assert.ok(drawn>0);n.refer(o);assert.deepEqual(o.referred.at,[.2]);
 n.settle(()=>.99);assert.equal(o.last.arrivals,drawn+1);assert.equal(o.last.referred,1);
 const cap=FORMATS.room.capacity,plan=outletPlan(Array.from({length:cap+2},(_,i)=>({id:i,a:i/(cap+2)})),3,cap);
 assert.equal(plan.filter(c=>c.served).length,cap);assert.ok(plan.slice(-2).every(c=>!c.served&&phaseAt(c,1)==='turned'));
 for(let k=0;k<3;k++){const on=plan.filter(c=>c.chair===k).sort((a,b)=>a.start-b.start);for(let i=1;i<on.length;i++)assert.ok(on[i].start>=on[i-1].end-1e-9);}
 assert.deepEqual(['out','wait','chair','leave'].map((_,i)=>phaseAt({a:.1,served:true,start:.2,end:.3},[.05,.15,.25,.35][i])),['out','wait','chair','leave']);
});
