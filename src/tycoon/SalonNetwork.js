import { appointmentTimes } from '../core/ArrivalProcess.js';
import { WEATHER } from './Weather.js';

/** Explicit simulation assumptions, not estimates of a real salon business. Each franchise pays its own local costs. */
export const FORMATS = {
  room: { cost:6000, capacity:18, ticket:90, dailyCost:650, materials:12, royalty:.12, support:40, arrivals:16 },
  flagship: { cost:16000, capacity:24, ticket:160, dailyCost:1450, materials:24, royalty:.12, support:80, arrivals:21 },
};
export const FLAGSHIP_COST = 20000, COACH_COST = 500, COACH_GAIN = 5, REST_FIXED_SHARE = .3, REST_SUPPORT = 10, REST_RECOVERY = 2, LOSS_QUALITY = 1;

/** Lia's company: the original salon, franchised outlets and an optional transition out of chair work. */
export class SalonNetwork {
  constructor(game) { this.game = game; this.flagship = false; this.outlets = []; this.executive = false; this.version = 0; }
  get stage() { return this.executive ? 'ceo' : this.outlets.length ? 'franchise' : this.flagship ? 'flagship' : this.game.staff.hired.length ? 'room' : 'solo'; }
  get flagshipChecks() { const g=this.game; return { level:g.progression.level>=6, space:g.layout.tier>=3, parts:g.departments.idolReady, reputation:g.reputation.value>=70, cash:g.economy.canAfford(FLAGSHIP_COST) }; }
  get canFlagship() { return !this.flagship && Object.values(this.flagshipChecks).every(Boolean); }
  upgrade() { if (!this.canFlagship || !this.game.economy.spend('flagship',FLAGSHIP_COST)) return false; this.flagship=true; this.version++; return true; }
  canOpen(format) { return !!FORMATS[format] && this.flagship && this.game.progression.level>=8 && this.game.economy.canAfford(FORMATS[format].cost); }
  open(format) {
    if (!this.canOpen(format) || !this.game.economy.spend('franchiseSetup',FORMATS[format].cost)) return false;
    this.outlets.push({ id:this.outlets.length+1, format, quality:70, paused:false, opened:this.game.clock.day, trained:0, last:null }); this.version++; return true;
  }
  coach(id) { const o=this.outlets.find(o=>o.id===Number(id)), g=this.game; if (!o || o.quality>=100 || o.trained===g.clock.day || !g.economy.spend('networkTraining',COACH_COST)) return false; o.quality=Math.min(100,o.quality+COACH_GAIN); o.trained=g.clock.day; this.version++; return true; }
  toggle(id) { const o=this.outlets.find(o=>o.id===Number(id)); if (!o) return false; o.paused=!o.paused; this.version++; return true; }
  get ceoChecks() { const g=this.game; return { level:g.progression.level>=10, flagship:this.flagship, network:this.outlets.length>=3, manager:g.staff.hired.some(e=>e.rank==='deputy'), team:g.staff.hired.length>=2, management:g.staff.management>=60, reputation:g.reputation.value>=85, hq:!g.hq.order }; }
  get canLead() { return !this.executive && Object.values(this.ceoChecks).every(Boolean); }
  lead() { if (!this.canLead) return false; this.executive=true; this.game.staff.owner.role='CEO'; this.version++; return true; }
  /** Conditional Poisson arrivals; all outlets share today's weather. Capacity caps actual service, not raw arrivals. */
  forecast(o) { const g=this.game, f=FORMATS[o.format]; return f.arrivals*(.5+g.reputation.value/200)*(.5+o.quality/200)*(WEATHER[g.weather]?.demand ?? 1); }
  settle(random=Math.random) {
    const g=this.game; if (g.isSunday) return;
    for (const o of this.outlets) {
      if (o.opened>=g.clock.day || o.last?.day===g.clock.day) continue;
      const f=FORMATS[o.format], expected=o.paused?0:this.forecast(o), referred=this.referredToday(o), arrivals=appointmentTimes(0,1,expected,random).length+referred;
      const served=Math.min(arrivals,f.capacity), revenue=served*f.ticket, royalty=Math.round(revenue*f.royalty);
      // Temporary closure still pays local fixed costs and HQ support. No guaranteed revenue.
      const fixed=o.paused?Math.round(f.dailyCost*REST_FIXED_SHARE):f.dailyCost, support=o.paused?REST_SUPPORT:f.support;
      const expenses=fixed+served*f.materials+royalty, profit=revenue-expenses;
      const qualityBefore=o.quality;
      if(o.paused)o.quality=Math.min(100,o.quality+REST_RECOVERY);
      else if(profit<0)o.quality=Math.max(30,o.quality-LOSS_QUALITY);
      o.last={ day:g.clock.day, paused:o.paused, expected, referred, arrivals, served, lost:arrivals-served, revenue, expenses, profit, royalty, support, qualityBefore, qualityAfter:o.quality };
      g.economy.earn('royalties',royalty); g.economy.charge('network',support);
    }
    this.version++;
  }
  /** Clients our salons' desks sent to this outlet today. */
  referredToday(o) { return o.referred && o.referred.day===this.game.clock.day ? o.referred.n : 0; }
  /**
   * The open outlet with the most room left today for a client our desk cannot fit in, or null. Room = capacity less what
   * it expects, a margin of one standard deviation of its own (Poisson) arrivals, and those we already sent.
   */
  referralOutlet() {
    const g=this.game, room=o=>{ const e=this.forecast(o); return FORMATS[o.format].capacity-e-Math.ceil(Math.sqrt(e))-this.referredToday(o); };
    return this.outlets.filter(o=>!o.paused && o.opened<g.clock.day && room(o)>=1).sort((a,b)=>room(b)-room(a))[0] || null;
  }
  /** One client sent to an outlet by our desk: counted in its arrivals when the day is settled. */
  refer(o) { o.referred={ day:this.game.clock.day, n:this.referredToday(o)+1 }; this.version++; }
  /** Today's settled accounts only; opening fees and training purchases stay in the main ledger. */
  daySummary() {
    const rows=this.outlets.map(o=>o.last).filter(r=>r?.day===this.game.clock.day);
    return { outlets:rows.length, closed:rows.filter(r=>r.paused).length, operatingLosses:rows.filter(r=>!r.paused&&r.profit<0).length,
      served:rows.reduce((n,r)=>n+r.served,0), localProfit:rows.reduce((n,r)=>n+r.profit,0), hqContribution:rows.reduce((n,r)=>n+r.royalty-r.support,0) };
  }
  toJSON() { return { flagship:this.flagship, outlets:this.outlets, executive:this.executive }; }
  restore(d) { this.flagship=!!d?.flagship; this.outlets=(d?.outlets||[]).filter(o=>FORMATS[o.format]); this.executive=!!d?.executive; if(this.executive)this.game.staff.owner.role='CEO'; this.version++; }
}
