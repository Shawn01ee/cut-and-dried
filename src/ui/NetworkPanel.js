import { FORMATS, FLAGSHIP_COST, COACH_COST, REST_FIXED_SHARE, REST_SUPPORT, REST_RECOVERY, LOSS_QUALITY } from '../tycoon/SalonNetwork.js';
import { DIRECTOR, ExecutiveDirector } from '../tycoon/ExecutiveDirector.js';

/** Growth requirements and franchise accounts, using the same rules as the model. */
export class NetworkPanel {
  constructor(game,i18n) { Object.assign(this,{game,i18n}); }
  /** The executive director (a CEO's): appointed or not, the rules they follow, the target, the format, and this morning's work. */
  #director() {
    const D=this.game.network.director,t=(k,...a)=>this.i18n.t(k,...a),seg=(pairs,cur)=>`<span class="seg">${pairs.map(([v,label,act])=>`<button data-do="${act}:${v}" class="${cur===v?'sel':''}">${label}</button>`).join('')}</span>`;
    const head=`<div class="brow"><b>${t('net.dir.title')}</b><span class="sp"></span>${seg([['1',t('net.dir.on'),'netdir'],['0',t('net.dir.off'),'netdir']],D.on?'1':'0')}</div>`;
    const rules=`<div class="dim">${t('net.dir.rules',DIRECTOR.pay,DIRECTOR.coachBelow,COACH_COST,DIRECTOR.lossDays,DIRECTOR.reopenAt,DIRECTOR.pace,DIRECTOR.reserve.toLocaleString('en-US'))}</div>`;
    if(!D.on)return `<div class="rcard">${head}${rules}</div>`;
    const n=this.game.network.outlets.length,target=`<div class="brow"><span>${t('net.dir.target')}</span><span class="sp"></span><button data-do="nettarget:-1" ${D.target<=n?'disabled':''}>−</button> <b>${D.target}</b> <button data-do="nettarget:1" ${D.target>=DIRECTOR.most?'disabled':''}>+</button></div>`;
    const format=`<div class="brow"><span>${t('net.dir.format')}</span><span class="sp"></span>${seg(Object.keys(FORMATS).map(k=>[k,k.toUpperCase(),'netformat']),D.format)}</div>`;
    const done=D.day===this.game.clock.day?D.today:[],today=`<div>${t('net.dir.today')}: ${done.length?ExecutiveDirector.describe(done,t):`<span class="dim">${t('net.dir.idle')}</span>`}</div>`;
    return `<div class="rcard">${head}${rules}${target}${format}${today}</div>`;
  }
  render(canLeaveChair=false) {
    const g=this.game,n=g.network,t=(k,...a)=>this.i18n.t(k,...a);
    const checks=(group,values)=>Object.entries(values).map(([k,ok])=>`<div class="${ok?'good':'dim'}">${ok?'✓':'○'} ${t('net.'+group+'.'+k)}</div>`).join('');
    const stages=['solo','room','flagship','franchise','ceo'].map(k=>`<span class="chip ${n.stage===k?'boss':''}">${t('net.stage.'+k)}</span>`).join(' → ');
    const formats=Object.entries(FORMATS).map(([k,f])=>`<div class="rcard"><b>CIEL ${k.toUpperCase()}</b><div>${t('net.format.'+k)}</div><div>${t('net.terms',f.capacity,f.ticket,f.dailyCost,f.materials)}</div><div class="dim">${t('net.fees',Math.round(f.royalty*100),f.support)}</div><button data-do="netopen:${k}" ${n.canOpen(k)?'':'disabled'}>${t('net.open',f.cost)}</button></div>`).join('');
    const outlets=n.outlets.map(o=>{const r=o.last;return `<div class="rcard"><div class="brow"><b>CIEL ${o.format.toUpperCase()} #${o.id}</b><span class="sp"></span><button data-do="netpause:${o.id}">${t(o.paused?'net.resume':'net.pause')}</button></div><div>${t('net.quality',o.quality)} <button data-do="netcoach:${o.id}" ${o.quality>=100||o.trained===g.clock.day||!g.economy.canAfford(COACH_COST)?'disabled':''}>${t('net.coach',COACH_COST)}</button></div><div class="dim">${t('net.expect',(o.paused?0:n.forecast(o)).toFixed(1))}</div>${r?`<div>${t('net.visits',r.day,r.arrivals,r.served,r.lost)}</div><div>${t('net.local',r.revenue,r.expenses,r.profit)}</div><div class="dim">${t('net.qualityChange',r.qualityBefore,r.qualityAfter)}</div><div class="${r.royalty-r.support>=0?'good':'bad'}">${t('net.hqIncome',r.royalty,r.support,r.royalty-r.support)}</div>`:`<div class="dim">${t('net.nextDay')}</div>`}</div>`;}).join('');
    return `<div class="bsec"><h4>${t('net.title')}</h4><div>${stages}</div><p>${t('net.story')}</p><div class="dim">${t('net.scope')}</div></div><div class="bsec"><h4>CIEL ${n.flagship?'FLAGSHIP':'ROOM'} · ${t('net.main')}</h4>${n.flagship?t('net.flagshipDone'):checks('flagship',n.flagshipChecks)+`<button data-do="netflagship" ${n.canFlagship?'':'disabled'}>${t('net.upgrade',FLAGSHIP_COST)}</button>`}</div><div class="bsec"><h4>${t('net.franchise')}</h4><div>${t('net.openNeeds')}</div><div class="dim">${t('net.rules',LOSS_QUALITY,Math.round(REST_FIXED_SHARE*100),REST_SUPPORT,REST_RECOVERY)}</div>${formats}${outlets}</div><div class="bsec"><h4>${t('net.stage.ceo')}</h4>${n.executive?t('net.ceoDone')+this.#director():checks('ceo',n.ceoChecks)+`<div class="dim">${t('net.handover')}</div><button data-do="netlead" ${n.canLead&&canLeaveChair?'':'disabled'}>${t('net.lead')}</button>`}</div>`;
  }
}
