import { COMMISSION } from '../employees/StaffManager.js';
import { appointmentTimes } from '../core/ArrivalProcess.js';
export { appointmentTimes } from '../core/ArrivalProcess.js';
import { BeautySpecialist, BEAUTY_STAFF } from '../employees/BeautySpecialist.js';
import { GRADE_PAY } from '../hair/StyleMenu.js';
import { clamp, gauss } from '../core/math.js';
import { siteOf } from '../building/SalonLayout.js';

/** Main-salon departments. Rates, prices and durations are explicit game-design assumptions. */
export const DEPARTMENTS = {
  makeup: { station:'makeupVanity', minutes:50, price:150, materials:20 },
  nails: { station:'nailDesk', minutes:60, price:100, materials:15 },
};
export const DEPARTMENT_LEVEL = 3;
const GUEST_NAMES = ['Ari','Yuna','Hana','Mia','Sora','Leah','June','Min'];
/** Homogeneous Poisson appointment process per open hour: expected count and variance are rate × hours. */
export const appointmentRate = reputation => (2 + Math.max(0, reputation) * .02) / 8;

/** Owns the specialist roster and sequential appointments. Staff/equipment constrain simultaneous service. */
export class Departments {
  constructor(game) { this.game = game; this.staff = BEAUTY_STAFF.map(d => new BeautySpecialist(d)); this.jobs = []; this.history = []; this.nextId = 1; this.version = 0; }
  get hired() { return this.staff.filter(e => e.hired); }
  get payroll() { return this.hired.reduce((n,e) => n + e.salary, 0); }
  get busy() { return this.jobs.some(j => j.state === 'working'); }
  find(id) { return this.staff.find(e => e.id === id); }
  team(part) { return this.hired.filter(e => e.department === part && !e.onLeave(this.game.clock.day)); }
  stations(part) { return this.game.layout.items.filter(it => it.id === DEPARTMENTS[part].station && siteOf(it.x) === 0); }
  capacity(part) { return this.stations(part).length; }
  stationFor(job) { return job.workplace || null; }
  ready(part) { return this.game.progression.level >= DEPARTMENT_LEVEL && this.capacity(part) > 0 && this.team(part).length > 0; }
  get idolReady() { return Object.keys(DEPARTMENTS).every(p => this.ready(p)); }
  uses(item) { return this.jobs.some(j => j.state === 'working' && this.stationFor(j) === item); }
  occupied(e) { return this.jobs.some(j => j.state === 'working' && j.worker === e.id); }
  hire(id) { const e = this.find(id), g = this.game; if (!e || g.progression.level < DEPARTMENT_LEVEL || (e.unlock && !g.isUnlocked(e.unlock)) || !this.capacity(e.department)) return false; const ok = g.staff.hire(e); if (ok) this.version++; return ok; }
  fire(id) { const e = this.find(id); if (!e || this.occupied(e)) return false; const ok = this.game.staff.fire(e); if (ok) this.version++; return ok; }
  train(id) { const e = this.find(id); if (!e || this.occupied(e)) return false; if (!e.hired || !e.canTrain || !this.game.economy.canAfford(this.game.staff.trainingCostFor(e))) return false; this.game.staff.train(e); this.version++; return true; }
  promote(id) { const e = this.find(id); if (!e || this.occupied(e)) return false; const ok = this.game.staff.promote(e); if (ok) this.version++; return ok; }
  book(steps, hour, { idol = false, name = null, hair = null } = {}) {
    const id=this.nextId++, job = { id, steps:[...steps], step:0, hour, bookedHour:hour, idol, name:name||GUEST_NAMES[(id-1)%GUEST_NAMES.length], scores:hair == null ? [] : [hair], state:'due', worker:null, station:null, workplace:null, end:null };
    this.jobs.push(job); this.version++; return job;
  }
  startDay() {
    const g = this.game; this.jobs = [];
    for (const e of this.hired) { e.stamina = 100; e.today = { served:0, earn:0 }; e.addStress(g.isSunday ? -20 : -8); }
    if (!g.isSunday) for (const part of Object.keys(DEPARTMENTS)) if (this.ready(part)) {
      for (const hour of appointmentTimes(g.clock.openHour, g.clock.closeHour, appointmentRate(g.reputation.value))) this.book([part], hour);
    }
    this.version++;
  }
  /** Advances arrivals/services. Returns newly settled jobs once, including idol bundles. */
  tick(hour, open) {
    const out = [], g = this.game;
    for (const j of this.jobs) {
      if (j.state === 'done' || j.state === 'missed') continue;
      if (j.state === 'working' && hour >= j.end) {
        const e = this.find(j.worker); e.boost = g.staff.baseBoost;
        const part = j.steps[j.step], d = DEPARTMENTS[part], model = e.qualityModel;
        const quality = clamp(model.mean + gauss() * model.sd), pay = Math.round(d.price * (GRADE_PAY[e.rank] || 1));
        e.recordService(quality, pay); e.gainExperience(15); e.tire(12); j.scores.push(quality); g.economy.earn(part, pay);
        j.step++; j.worker = null; j.station = null; j.workplace = null; j.state = 'due'; j.hour = hour; this.version++;
        if (j.step === j.steps.length) { j.state = 'done'; j.quality = Math.min(...j.scores); out.push(j); continue; }
      }
      if (j.state === 'working') continue;
      if (!open) { j.state = 'missed'; j.quality = 0; out.push(j); this.version++; continue; }
      if (hour < j.hour) continue;
      if (j.state === 'due') { j.state='arrived'; this.version++; }
      const part = j.steps[j.step], occupied = new Set(this.jobs.filter(x => x.state === 'working' && x.steps[x.step] === part).map(x => x.workplace));
      const e = this.team(part).find(e => !this.occupied(e));
      const stations = this.stations(part), station = stations.findIndex(it => !occupied.has(it));
      if (!e || station < 0) continue;
      const d = DEPARTMENTS[part]; j.worker = e.id; j.station = station; j.workplace = stations[station]; j.state = 'working'; j.end = hour + e.minutes(d.minutes) / 60;
      g.economy.charge('materials', d.materials); this.version++;
    }
    return out;
  }
  closeDay() {
    const pay = Math.round(this.hired.reduce((n,e) => n + e.today.earn, 0) * COMMISSION[this.game.staff.commission]);
    if (pay) this.game.economy.charge('commission', pay);
    for (const e of this.hired) { e.daysEmployed++; e.addStress(Math.max(0, e.today.served - 3) * 2); }
    this.history = [...this.jobs.map(j => ({ day:this.game.clock.day, idol:j.idol, steps:j.steps, state:j.state, quality:j.quality ?? 0 })), ...this.history].slice(0,30); this.version++;
  }
  /** Completed and missed bookings observed today; standalone visits and idol bundles are counted separately. */
  daySummary() {
    const count = jobs => ({ booked:jobs.length, completed:jobs.filter(j=>j.state==='done').length, missed:jobs.filter(j=>j.state==='missed').length });
    return { makeup:count(this.jobs.filter(j=>!j.idol&&j.steps[0]==='makeup')), nails:count(this.jobs.filter(j=>!j.idol&&j.steps[0]==='nails')), idol:count(this.jobs.filter(j=>j.idol)) };
  }
  toJSON() { return { staff:this.staff, history:this.history, nextId:this.nextId }; }
  restore(d) { for (const e of d?.staff || []) this.find(e.id)?.restore(e); this.history = d?.history || []; this.nextId = d?.nextId || 1; this.jobs = []; this.version++; }
}
