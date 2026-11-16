import { DEPARTMENTS, DEPARTMENT_LEVEL, appointmentRate } from '../tycoon/Departments.js';
import { promotionStatus } from '../employees/Career.js';
import { portraitURL } from './Portrait.js';

/** Professional departments and their live appointment book, separate from hair-chair controls. */
export class DepartmentsPanel {
  constructor(game, i18n) { Object.assign(this, { game, i18n }); }
  render() {
    const g = this.game, d = g.departments, t = (k,...a) => this.i18n.t(k,...a), hour = v => `${Math.floor(v)}:${String(Math.floor(v%1*60)).padStart(2,'0')}`;
    const person = e => {
      const busy = d.occupied(e), p = promotionStatus(e), locked = e.unlock && !g.isUnlocked(e.unlock);
      const action = e.hired ? `<button data-do="depttrain:${e.id}" ${busy || !e.canTrain || !g.economy.canAfford(g.staff.trainingCostFor(e)) ? 'disabled' : ''}>${t('staff.train',g.staff.trainingCostFor(e))}</button><button data-do="deptpromote:${e.id}" ${busy || !p?.ready ? 'disabled' : ''}>${p ? t('car.next',t('grade.'+p.to)) : t('car.top')}</button><button data-do="deptfire:${e.id}" ${busy?'disabled':''}>${t('staff.fire')}</button>`
        : `<button data-do="depthire:${e.id}" ${locked || !d.capacity(e.department) || !g.economy.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.hire',e.hireCost)}</button>`;
      return `<div class="rcard"><div class="brow"><img width="40" height="40" src="${portraitURL(e,e.rank)}" alt=""><b>${t('dept.name.'+e.id)}</b><span>${t('grade.'+e.rank)}</span><span class="sp"></span>${action}</div><div>${t('dept.skills',Math.round(e.craft),e.effectiveSkills.speed,e.effectiveSkills.customerService)} · Lv${e.level} · ${t('staff.wage',e.salary)}</div>${e.hired?`<div class="dim">${t('dept.performance',e.today.served,e.stats.served,Math.round(e.stats.served?e.stats.sum/e.stats.served*100:0))}${busy?' · '+t('dept.working'):''}</div>`:''}${p&&e.hired?`<div class="dim">${Object.entries(p.parts).map(([k,[have,need]])=>t('car.'+k,k==='satisfaction'?Math.round(have*100):have,k==='satisfaction'?Math.round(need*100):need)).join(' · ')}</div>`:''}</div>`;
    };
    const parts = Object.entries(DEPARTMENTS).map(([id,x])=>`<div class="bsec"><h4>${t('dept.'+id)}</h4><div>${t('dept.require',t('f.'+x.station),d.capacity(id),d.team(id).length)}</div><div class="dim">${t('dept.service',x.minutes,x.price,x.materials)}</div>${d.staff.filter(e=>e.department===id).map(person).join('')}</div>`).join('');
    const jobs = d.jobs.map(j=>`<div class="rcard"><div class="brow"><b>${j.idol?t('sp.idol'):t('dept.visit',this.i18n.name(j.name),t('dept.'+j.steps[j.step]||''))}</b><span class="sp"></span>${hour(j.bookedHour??j.hour)} · ${t('dept.state.'+j.state)}</div><div>${j.steps.map((p,i)=>(i<j.step?'✓ ':'')+t('dept.'+p)).join(' → ')}${j.state==='working'?' · '+t('dept.until',hour(j.end)):''}</div>${j.quality!=null?`<div>${t('dept.quality',Math.round(j.quality*100))}</div>`:''}</div>`).join('');
    return `<div class="bsec"><h4>${t('dept.title')}</h4><div>${t('dept.hierarchy')}</div><div class="dim">${t('dept.note',DEPARTMENT_LEVEL)}</div><div>${t('dept.hairTeam',(g.network.executive?0:1)+g.staff.hired.length)}</div></div>${parts}<div class="bsec"><h4>${t('dept.bookings')}</h4><div class="dim">${t('dept.demand',(appointmentRate(g.reputation.value)*g.clock.hours).toFixed(1))}</div>${jobs||t('dept.empty')}</div><div class="bsec"><h4>${t('sp.idol')}</h4><div>${t(d.idolReady?'dept.idolReady':'dept.idolNeeds')}</div><div class="dim">${t('dept.idolFlow')}</div></div>`;
  }
}
