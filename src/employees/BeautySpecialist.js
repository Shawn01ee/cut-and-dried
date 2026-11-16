import { Employee } from './Employee.js';
import { clamp } from '../core/math.js';

/** A professional in a separate service department; never assigned to a hair chair. */
export class BeautySpecialist extends Employee {
  constructor(def) {
    super({ ...def, skills: { cutting: 0, colouring: 0, perming: 0, ...def.skills } });
    this.department = def.department; this.site = 0;
  }
  get craft() { return clamp(this.skills[this.department] + this.boost - (this.settling ? 6 : 0) - (this.grudge ? 12 : 0), 0, 100); }
  gainExperience(points) { const levels = super.gainExperience(points); this.skills[this.department] = Math.min(100, this.skills[this.department] + levels * 6); return levels; }
  minutes(base) { return Math.max(10, Math.round(base * (1.6 - this.effectiveSkills.speed / 100) * (1.2 - this.craft / 250) * (1 + this.fatigue / 250))); }
  /** Mean and standard deviation before bounding satisfaction to [0,1]; design assumptions, not survey estimates. */
  get qualityModel() { return { mean: .45 + .0045 * this.craft + .001 * this.effectiveSkills.customerService - this.fatigue / 400, sd: .01 + (100 - this.craft) / 1000 }; }
}

export const BEAUTY_STAFF = [
  { id:'makeup_iris', name:'Iris', department:'makeup', role:'Designer', rank:'designer', style:'MakeupArtist', gender:'f', skills:{makeup:72,speed:65,customerService:76}, salary:280, hireCost:1400, apron:0x1d1a26,hair:0x2e1d14,hairdo:'long',skin:0xe7b892 },
  { id:'makeup_noa', name:'Noa', department:'makeup', role:'Senior Designer', rank:'senior', style:'MakeupArtist', gender:'m', skills:{makeup:88,speed:76,customerService:86}, salary:420, hireCost:3200, apron:0x45404f,hair:0x16110f,hairdo:'short',skin:0xc98e66,unlock:'masters' },
  { id:'nails_mina', name:'Mina', department:'nails', role:'Designer', rank:'designer', style:'NailArtist', gender:'f', skills:{nails:74,speed:62,customerService:78}, salary:260, hireCost:1200, apron:0x7a5d6e,hair:0x6e4428,hairdo:'bob',skin:0xf6d6bd },
  { id:'nails_june', name:'June', department:'nails', role:'Senior Designer', rank:'senior', style:'NailArtist', gender:'f', skills:{nails:90,speed:70,customerService:84}, salary:390, hireCost:3000, apron:0x1d1a26,hair:0x16110f,hairdo:'bun',skin:0xe7b892,unlock:'masters' },
];
