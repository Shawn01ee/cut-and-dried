import { Employee, RAISE, GRUDGE_DAYS } from './Employee.js';
import { PROGRAMMES, TALK_EVERY, TALK_RELIEF, birthdayOf, concernOf } from './Welfare.js';

/**
 * The stylists who can be hired. Skills run 0 to 100; the specialty adds +10 on top.
 * Senior designers are the strongest and the most expensive, and only join an established salon.
 */
const DEFINITIONS = [
  // Master designers: among the best in Melbourne, and priced like it
  { id: 'daniel', name: 'Daniel', gender: 'm', role: 'Master Designer', rank: 'master', unlock: 'masters', style: 'ColourSpecialist', specialty: 'colour', perk: 'mentor', skills: { cutting: 88, colouring: 98, perming: 86, speed: 70, customerService: 99 }, salary: 600, hireCost: 6500, fine: true, apron: 0x0d0b14, hair: 0x9c98a2, hairdo: 'curly', shades: true, skin: 0x9c6644 },
  { id: 'somi', name: 'Somi', gender: 'f', role: 'Master Designer', rank: 'master', unlock: 'masters', style: 'ColourSpecialist', specialty: 'colour', perk: 'trend', skills: { cutting: 86, colouring: 97, perming: 80, speed: 94, customerService: 84 }, salary: 560, hireCost: 6000, fine: true, apron: 0x1d1a26, hair: 0x2e1d14, hairdo: 'long', skin: 0xf6d6bd },
  // Senior designers
  { id: 'kai', name: 'Kai', gender: 'm', role: 'Senior Designer', rank: 'senior', unlock: 'seniors', style: 'CutSpecialist', specialty: 'cut', perk: 'speed', skills: { cutting: 92, colouring: 76, perming: 74, speed: 80, customerService: 82 }, salary: 420, hireCost: 3300, fine: true, apron: 0x45404f, hair: 0x16110f, hairdo: 'short', skin: 0xe7b892 },
  { id: 'soo', name: 'Soo', gender: 'f', role: 'Senior Designer', rank: 'senior', unlock: 'seniors', style: 'PermSpecialist', specialty: 'perm', perk: 'consult', skills: { cutting: 85, colouring: 80, perming: 92, speed: 66, customerService: 88 }, salary: 420, hireCost: 3300, fine: true, apron: 0x7a5d6e, hair: 0x5e3d24, hairdo: 'long', skin: 0xf6d6bd },
  // Designers
  { id: 'sophia', name: 'Sophia', gender: 'f', role: 'Designer', style: 'CutSpecialist', specialty: 'cut', perk: 'calm', skills: { cutting: 76, colouring: 58, perming: 54, speed: 62, customerService: 78 }, salary: 290, hireCost: 1200, apron: 0x2f6fd6, hair: 0xf1dfae, hairdo: 'bob', skin: 0xf6d6bd },
  { id: 'rosa', name: 'Rosa', gender: 'f', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', skills: { cutting: 56, colouring: 80, perming: 48, speed: 58, customerService: 72 }, salary: 290, hireCost: 1200, bias: .6, fine: true, apron: 0xe25c8f, hair: 0xc8642a, hairdo: 'long', skin: 0xe7b892 },
  { id: 'seo', name: 'Seo', gender: 'm', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', perk: 'vip', skills: { cutting: 60, colouring: 78, perming: 55, speed: 58, customerService: 76 }, salary: 295, hireCost: 1250, fine: true, apron: 0x4f6b6a, hair: 0x16110f, hairdo: 'short', skin: 0xe7b892 },
  { id: 'ella', name: 'Ella', gender: 'f', role: 'Designer', style: 'PermSpecialist', specialty: 'perm', perk: 'consult', skills: { cutting: 62, colouring: 58, perming: 76, speed: 60, customerService: 80 }, salary: 290, hireCost: 1200, apron: 0xb79be8, hair: 0xe8c27a, hairdo: 'long', skin: 0xf6d6bd },
  { id: 'marco', name: 'Marco', gender: 'm', role: 'Designer', style: 'CutSpecialist', specialty: 'cut', perk: 'trend', skills: { cutting: 74, colouring: 52, perming: 50, speed: 66, customerService: 70 }, salary: 285, hireCost: 1150, apron: 0x2d4a3a, hair: 0x2e1d14, hairdo: 'short', beard: true, skin: 0xc98e66 },
  { id: 'yuri', name: 'Yuri', gender: 'f', role: 'Designer', style: 'AllRounder', perk: 'vip', skills: { cutting: 66, colouring: 66, perming: 66, speed: 62, customerService: 74 }, salary: 300, hireCost: 1300, apron: 0xffb15a, hair: 0x16110f, hairdo: 'long', skin: 0xf6d6bd },
  { id: 'ethan', name: 'Ethan', gender: 'm', role: 'Barber', style: 'CutSpecialist', specialty: 'cut', perk: 'speed', skills: { cutting: 72, colouring: 40, perming: 36, speed: 84, customerService: 64 }, salary: 270, hireCost: 1000, apron: 0x2a4478, hair: 0x6e4428, hairdo: 'buzz', beard: true, skin: 0x6b3e2a },
  { id: 'nina', name: 'Nina', gender: 'f', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', perk: 'trend', skills: { cutting: 58, colouring: 79, perming: 50, speed: 60, customerService: 74 }, salary: 295, hireCost: 1250, fine: true, apron: 0x8a4fc2, hair: 0xb04a6a, hairdo: 'long', skin: 0xf6d6bd },
  { id: 'leon', name: 'Leon', gender: 'm', role: 'Designer', style: 'CutSpecialist', specialty: 'cut', perk: 'calm', skills: { cutting: 77, colouring: 54, perming: 52, speed: 60, customerService: 72 }, salary: 290, hireCost: 1200, apron: 0x3a5a8c, hair: 0x2e1d14, hairdo: 'short', skin: 0xe7b892 },
  { id: 'iris', name: 'Iris', gender: 'f', role: 'Designer', style: 'PermSpecialist', specialty: 'perm', perk: 'speed', skills: { cutting: 58, colouring: 52, perming: 78, speed: 74, customerService: 66 }, salary: 290, hireCost: 1200, apron: 0x1fa39a, hair: 0x16110f, hairdo: 'bun', skin: 0xf6d6bd },
  { id: 'dylan', name: 'Dylan', gender: 'm', role: 'Barber', style: 'CutSpecialist', specialty: 'cut', perk: 'consult', skills: { cutting: 75, colouring: 44, perming: 40, speed: 72, customerService: 78 }, salary: 280, hireCost: 1100, bias: -.6, apron: 0x45404f, hair: 0x16110f, hairdo: 'buzz', beard: true, skin: 0xc98e66 },
  { id: 'clara', name: 'Clara', gender: 'f', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', perk: 'consult', skills: { cutting: 60, colouring: 81, perming: 52, speed: 56, customerService: 80 }, salary: 300, hireCost: 1300, apron: 0xc8642a, hair: 0xe8c27a, hairdo: 'bob', skin: 0xf6d6bd },
  { id: 'ray', name: 'Ray', gender: 'm', role: 'Designer', style: 'PermSpecialist', specialty: 'perm', perk: 'trend', skills: { cutting: 60, colouring: 55, perming: 77, speed: 62, customerService: 70 }, salary: 290, hireCost: 1200, apron: 0xffb15a, hair: 0x16110f, hairdo: 'curly', skin: 0x6b3e2a },
  { id: 'stella', name: 'Stella', gender: 'f', role: 'Designer', style: 'AllRounder', perk: 'mentor', skills: { cutting: 70, colouring: 70, perming: 70, speed: 58, customerService: 76 }, salary: 320, hireCost: 1400, apron: 0x2d4a3a, hair: 0x9c98a2, hairdo: 'bob', skin: 0xe7b892 },
  { id: 'ivan', name: 'Ivan', gender: 'm', role: 'Barber', style: 'CutSpecialist', specialty: 'cut', perk: 'speed', skills: { cutting: 73, colouring: 42, perming: 40, speed: 82, customerService: 60 }, salary: 270, hireCost: 1000, apron: 0x7a5d6e, hair: 0xc8a070, hairdo: 'buzz', skin: 0xf6d6bd },
  { id: 'luna', name: 'Luna', gender: 'f', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', perk: 'vip', skills: { cutting: 58, colouring: 80, perming: 54, speed: 56, customerService: 78 }, salary: 305, hireCost: 1300, fine: true, apron: 0x0d0b14, hair: 0x16110f, hairdo: 'long', skin: 0xe7b892 },
  { id: 'elliot', name: 'Elliot', gender: 'm', role: 'Designer', style: 'PermSpecialist', specialty: 'perm', perk: 'calm', skills: { cutting: 62, colouring: 56, perming: 76, speed: 58, customerService: 76 }, salary: 290, hireCost: 1200, apron: 0x5f9e45, hair: 0x6e4428, hairdo: 'short', skin: 0xf6d6bd },
  // Junior designers
  { id: 'owen', name: 'Owen', gender: 'm', role: 'Junior Designer', rank: 'junior', style: 'PermSpecialist', specialty: 'perm', skills: { cutting: 48, colouring: 42, perming: 70, speed: 86, customerService: 60 }, salary: 240, hireCost: 600, bias: -1.2, single: true, apron: 0x1fa39a, hair: 0x16110f, hairdo: 'short', skin: 0xe7b892 },
  { id: 'dami', name: 'Dami', gender: 'f', role: 'Junior Designer', rank: 'junior', style: 'ColourSpecialist', specialty: 'colour', perk: 'calm', skills: { cutting: 44, colouring: 66, perming: 40, speed: 70, customerService: 64 }, salary: 220, hireCost: 500, apron: 0xf2a0c0, hair: 0x6e4428, hairdo: 'bun', skin: 0xf6d6bd },
  { id: 'hyun', name: 'Hyun', gender: 'm', role: 'Junior Designer', rank: 'junior', style: 'CutSpecialist', specialty: 'cut', perk: 'speed', skills: { cutting: 64, colouring: 38, perming: 42, speed: 80, customerService: 56 }, salary: 230, hireCost: 550, apron: 0x7fb6f0, hair: 0x16110f, hairdo: 'short', skin: 0xe7b892 },
  { id: 'bora', name: 'Bora', gender: 'f', role: 'Junior Designer', rank: 'junior', style: 'PermSpecialist', specialty: 'perm', perk: 'consult', skills: { cutting: 44, colouring: 40, perming: 66, speed: 72, customerService: 68 }, salary: 225, hireCost: 550, apron: 0xb79be8, hair: 0x2e1d14, hairdo: 'bob', skin: 0xf6d6bd },
  { id: 'toby', name: 'Toby', gender: 'm', role: 'Junior Designer', rank: 'junior', style: 'CutSpecialist', specialty: 'cut', perk: 'trend', skills: { cutting: 62, colouring: 40, perming: 38, speed: 76, customerService: 58 }, salary: 225, hireCost: 550, apron: 0x2f6fd6, hair: 0xe8c27a, hairdo: 'short', skin: 0xf6d6bd },
  { id: 'nari', name: 'Nari', gender: 'f', role: 'Junior Designer', rank: 'junior', style: 'ColourSpecialist', specialty: 'colour', perk: 'speed', skills: { cutting: 42, colouring: 64, perming: 40, speed: 82, customerService: 60 }, salary: 225, hireCost: 550, apron: 0xe25c8f, hair: 0x16110f, hairdo: 'long', skin: 0xe7b892 },
  { id: 'joel', name: 'Joel', gender: 'm', role: 'Junior Designer', rank: 'junior', style: 'PermSpecialist', specialty: 'perm', perk: 'calm', skills: { cutting: 46, colouring: 42, perming: 64, speed: 70, customerService: 64 }, salary: 220, hireCost: 500, apron: 0x4f6b6a, hair: 0x2e1d14, hairdo: 'curly', skin: 0xc98e66 },
  { id: 'yeri', name: 'Yeri', gender: 'f', role: 'Junior Designer', rank: 'junior', style: 'CutSpecialist', specialty: 'cut', perk: 'vip', skills: { cutting: 63, colouring: 44, perming: 40, speed: 70, customerService: 66 }, salary: 230, hireCost: 600, apron: 0xffd98a, hair: 0x6e4428, hairdo: 'bun', skin: 0xf6d6bd },
  { id: 'sena', name: 'Sena', gender: 'f', role: 'Junior Designer', rank: 'junior', style: 'ColourSpecialist', specialty: 'colour', perk: 'consult', skills: { cutting: 44, colouring: 65, perming: 42, speed: 68, customerService: 70 }, salary: 225, hireCost: 550, apron: 0x1d1a26, hair: 0xc8642a, hairdo: 'bob', skin: 0xe7b892 },
];

/** Stand-ins for an empty front desk, so callers can simply ask whether its receptionist is hired. */
const NO_DESK = [0, 1].map(site => Object.freeze({ id: null, name: '', effect: 'reception', site, hired: false, away: false, skills: Object.freeze({ speed: 0, customerService: 0, marketing: 0 }) }));
const SUPPORT = [
  { id: 'ruby', name: 'Ruby', gender: 'f', role: 'Receptionist', style: 'Reception', effect: 'reception', site: 0, skills: { cutting: 0, colouring: 0, perming: 0, speed: 50, customerService: 85, marketing: 35 }, salary: 220, hireCost: 300, apron: 0x8a4fc2, hair: 0x2e1d14, hairdo: 'bun', skin: 0xc98e66, startsHired: true },
  // The second salon's front desk: greets its clients and brings in its passers-by. Hired once it opens.
  { id: 'juno', name: 'Juno', gender: 'f', role: 'Receptionist', style: 'Reception', effect: 'reception', site: 1, skills: { cutting: 0, colouring: 0, perming: 0, speed: 58, customerService: 80, marketing: 45 }, salary: 230, hireCost: 400, apron: 0x1fa39a, hair: 0x6e4428, hairdo: 'bob', skin: 0xe7b892 },
  // More receptionists to choose from: a marketer, a host and a newcomer. Each is posted to a free desk when hired.
  { id: 'gina', name: 'Gina', gender: 'f', role: 'Receptionist', style: 'Reception', effect: 'reception', skills: { cutting: 0, colouring: 0, perming: 0, speed: 55, customerService: 66, marketing: 72 }, salary: 270, hireCost: 650, apron: 0xe25c8f, hair: 0x16110f, hairdo: 'long', skin: 0xf6d6bd },
  { id: 'eden', name: 'Eden', gender: 'm', role: 'Receptionist', style: 'Reception', effect: 'reception', skills: { cutting: 0, colouring: 0, perming: 0, speed: 62, customerService: 93, marketing: 30 }, salary: 250, hireCost: 500, apron: 0x2a4478, hair: 0x2e1d14, hairdo: 'short', skin: 0xc98e66 },
  { id: 'nell', name: 'Nell', gender: 'f', role: 'Receptionist', style: 'Reception', effect: 'reception', skills: { cutting: 0, colouring: 0, perming: 0, speed: 70, customerService: 68, marketing: 22 }, salary: 150, hireCost: 150, apron: 0xffd98a, hair: 0xc8642a, hairdo: 'bun', skin: 0xf6d6bd },
  // Assistants wash and sweep. `shampoo` is how good a wash is, `cleaning` how quickly and widely they sweep.
  { id: 'hugo', name: 'Hyunjo', gender: 'm', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 60, customerService: 60, shampoo: 60, cleaning: 60 }, salary: 140, hireCost: 260, apron: 0x5f9e45, hair: 0x8f5a2e, skin: 0xe7b892 },
  { id: 'jin', name: 'Jin', gender: 'm', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 74, customerService: 52, shampoo: 45, cleaning: 84 }, salary: 135, hireCost: 240, apron: 0xffb15a, hair: 0x16110f, skin: 0xc98e66 },
  { id: 'tess', name: 'Tess', gender: 'f', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 54, customerService: 72, shampoo: 86, cleaning: 42 }, salary: 155, hireCost: 320, apron: 0x7fb6f0, hair: 0xc8642a, hairdo: 'long', skin: 0xf6d6bd },
  { id: 'momo', name: 'Momo', gender: 'f', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 48, customerService: 82, shampoo: 95, cleaning: 36 }, salary: 175, hireCost: 380, apron: 0xe25c8f, hair: 0x16110f, hairdo: 'bun', skin: 0xf6d6bd },
  { id: 'dex', name: 'Dex', gender: 'm', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 82, customerService: 50, shampoo: 38, cleaning: 96 }, salary: 145, hireCost: 260, apron: 0x45404f, hair: 0x16110f, hairdo: 'buzz', beard: true, skin: 0x6b3e2a },
  { id: 'kit', name: 'Kit', gender: 'f', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 64, customerService: 66, shampoo: 48, cleaning: 52 }, salary: 90, hireCost: 100, apron: 0xffd98a, hair: 0xe8c27a, hairdo: 'bob', skin: 0xf6d6bd },
  { id: 'bao', name: 'Bao', gender: 'm', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 74, customerService: 74, shampoo: 82, cleaning: 80 }, salary: 220, hireCost: 480, apron: 0x2d4a3a, hair: 0x2e1d14, skin: 0xe7b892 },
  { id: 'lulu', name: 'Lulu', gender: 'f', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 92, customerService: 70, shampoo: 64, cleaning: 50 }, salary: 160, hireCost: 300, apron: 0x8a4fc2, hair: 0xb04a6a, hairdo: 'long', skin: 0xc98e66 },
];

/** Performance pay as a share of each stylist's takings: steadier staff and a small skill lift, at a cost. */
export const COMMISSION = [0, .05, .1, .15];
const COMMISSION_BOOST = [0, 2, 4, 6], COMMISSION_CALM = [1, .85, .7, .55];
/** The better known a stylist, the harder they are to talk round. */
const RANK_PERSUASION = { master: -.25, senior: -.15, designer: 0, junior: .1 };
export const BONUS = 200, LEAVE_DAYS = 2, RESIGN_LEAVE = 3, DINNER_PER_HEAD = 45, MARKETING_COURSE = 400;
export const RESIGN_STRESS = 85;

/** Owns the roster: who can be hired, who works here, what they cost and how they are holding up. */
export class StaffManager {
  constructor(economy) {
    this.economy = economy;
    // Lia owns the salon: she does every service, specialises in colour, runs the place thriftily and draws no wage.
    this.owner = new Employee({ id: 'owner', name: 'Lia', gender: 'f', role: 'Director', style: 'Owner', specialty: 'colour', perk: 'manage', skills: { cutting: 78, colouring: 76, perming: 74, speed: 62, customerService: 84 }, salary: 0, apron: 0xffd98a, hair: 0x2e1d14, hairdo: 'bob' });
    this.owner.hired = true; this.owner.daysEmployed = Infinity;
    this.candidates = DEFINITIONS.map(d => new Employee(d));
    // Front desk and floor help, never at a styling chair. Only the receptionist is there on day one.
    this.support = SUPPORT.map(d => Object.assign(new Employee(d), { effect: d.effect, site: d.site ?? null, hired: !!d.startsHired }));
    this.commission = 0; this.dinnerDay = 0; this.seatShuffle = false; this.version = 0;
    // Welfare programmes the salon runs, and news of them for the morning.
    this.welfare = new Set(); this.news = [];
  }
  get all() { return [this.owner, ...this.candidates]; }
  get hired() { return this.candidates.filter(e => e.hired); }
  /** The first salon's receptionist, who also runs the salon's marketing and reviews. */
  get receptionist() { return this.receptionistAt(0); }
  /** The receptionist at a salon's front desk. */
  receptionistAt(site) { return this.support.find(e => e.effect === 'reception' && e.hired && e.site === site) || NO_DESK[site]; }
  /** Hires a receptionist for a salon's desk, if that desk is free. */
  hireAt(e, site) { if (e.effect !== 'reception' || this.receptionistAt(site).hired || !this.hire(e)) return false; e.site = site; this.version++; return true; }
  /** Hired stylists who are in today rather than on leave. */
  working(day) { return this.hired.filter(e => !e.onLeave(day)); }
  get payroll() { return [...this.hired, ...this.support.filter(e => e.hired)].reduce((sum, e) => sum + e.salary, 0); }
  /** True when someone with this job is hired and at their post (the receptionist can be out filming). */
  hasSupport(effect, site = null) { return this.support.some(e => e.hired && !e.away && e.effect === effect && (site == null || e.site === site)); }
  find(id) { return [...this.all, ...this.support].find(e => e.id === id); }
  hire(employee) { if (employee.hired || !this.economy.spend('recruiting', employee.hireCost)) return false; Object.assign(employee, { hired: true, daysEmployed: 0, stress: 0, leaveFrom: 0, leaveTo: 0, loyalty: 0, lastStress: null }); this.version++; return true; }
  has(programme) { return this.welfare.has(programme); }
  setWelfare(programme, on) { if (!PROGRAMMES[programme]) return; if (on) this.welfare.add(programme); else this.welfare.delete(programme); this.version++; }
  /** What the programmes cost per working day, with this many stylists at work. */
  welfareCostFor(heads) { return [...this.welfare].reduce((n, id) => n + (PROGRAMMES[id].perHead || 0) * heads, 0); }
  /** The stress at which a stylist wants to quit: higher with health cover and long service. */
  resignAt(e) { return Math.min(100, RESIGN_STRESS + (this.has('health') ? PROGRAMMES.health.resignAt : 0) + (e.loyalty || 0)); }
  /** How much experience a service gives under the education allowance. */
  get learning() { return this.has('education') ? PROGRAMMES.education.learning : 1; }
  /** Services take a touch longer with guaranteed breaks. */
  get pace() { return this.has('breaks') ? PROGRAMMES.breaks.speed : 1; }
  /** A one-to-one with Lia, once a week each: eases stress and tells what is on their mind. */
  canTalk(e, day) { return e.hired && e !== this.owner && day - e.talkDay >= TALK_EVERY; }
  talk(e, day) { if (!this.canTalk(e, day)) return null; const concern = concernOf(e); e.talkDay = day; e.addStress(TALK_RELIEF); this.version++; return concern; }
  /** The morning: birthdays are celebrated under the birthday programme. */
  welfareMorning(date) {
    if (!this.has('birthday')) return;
    for (const e of this.hired) { const b = birthdayOf(e); if (b.month === date.month && b.date === date.date) { this.economy.charge('welfare', PROGRAMMES.birthday.gift); e.addStress(PROGRAMMES.birthday.stress); this.news.push({ key: 'wf.news.birthday', name: e.name, n: PROGRAMMES.birthday.gift }); } }
    this.version++;
  }
  fire(employee) { if (!employee.hired || employee === this.owner) return false; employee.hired = false; employee.status = 'idle'; this.version++; return true; }
  /** True when a hired stylist has this special talent. */
  hasPerk(perk) { return this.hired.some(e => e.perk === perk); }
  /** A mentor on the team makes training cheaper. */
  trainingCostFor(e) { return Math.round(e.trainingCost * (this.hasPerk('mentor') ? .7 : 1) * (1 - (this.extraTrainingDiscount ? this.extraTrainingDiscount() : 0))); }
  /** Paid training: a block of experience that may lift the stylist a level. Returns levels gained. */
  train(employee) { if (!employee.hired || !employee.canTrain || !this.economy.spend('training', this.trainingCostFor(employee))) return 0; employee.addStress(-5); this.version++; return employee.gainExperience(60); }
  marketingCourseCost(e) { return MARKETING_COURSE + Math.max(0, (e.skills.marketing || 0) - 35) * 10; }
  /** Sends the receptionist on a marketing course. */
  trainMarketing(e) { if (!e.hired || (e.skills.marketing || 0) >= 100 || !this.economy.spend('training', this.marketingCourseCost(e))) return false; e.skills.marketing = Math.min(100, (e.skills.marketing || 0) + 10); this.version++; return true; }
  giveBonus(e) { if (!e.hired || !this.economy.spend('bonus', BONUS)) return false; e.addStress(-25); this.version++; return true; }
  /** Two days of paid leave from tomorrow. Someone else has to cover the chair. */
  sendOnLeave(e, day, days = LEAVE_DAYS) { if (!e.hired || e.leaveBooked(day)) return false; e.leaveFrom = day + 1; e.leaveTo = day + days; this.version++; return true; }
  /**
   * The chance of talking a stylist out of quitting: better the more experienced Lia is and the longer they have
   * worked here, worse each time it has been tried before.
   */
  persuadeChance(e) { return Math.min(.85, Math.max(.1, .45 + this.owner.level * .05 + (e.daysEmployed >= 30 ? .1 : 0) - e.persuaded * .15 + (RANK_PERSUASION[e.rank] || 0))); }
  /**
   * Answers a stylist who wants to quit. `how` is bonus, talk, raise, leave or go. Returns whether they stay;
   * a talk that fails, or letting them go, means they leave tonight.
   */
  answerResignation(e, how, day) {
    if (!e.hired) return false;
    if (how === 'bonus') { this.economy.charge('bonus', e.salary * 2); e.addStress(-45); }
    else if (how === 'raise') { e.raises++; e.salary = Math.round(e.baseSalary * RAISE ** e.raises); e.addStress(-30); }
    else if (how === 'leave') { if (!this.sendOnLeave(e, day, RESIGN_LEAVE)) return this.answerResignation(e, 'go', day); e.addStress(-35); }
    else if (how === 'talk') {
      const stays = Math.random() < this.persuadeChance(e); e.persuaded++;
      if (!stays) { e.quits = true; this.version++; return false; }
      e.grudge = GRUDGE_DAYS; e.addStress(-15);
    } else { e.quits = true; this.version++; return false; }
    this.version++; return true;
  }
  dinnerCost() { return DINNER_PER_HEAD * (1 + this.hired.length + this.support.filter(e => e.hired).length); }
  /** A team dinner once a day: everyone unwinds a little. */
  teamDinner(day) { if (this.dinnerDay === day || !this.hired.length || !this.economy.spend('bonus', this.dinnerCost())) return false; this.dinnerDay = day; this.hired.forEach(e => e.addStress(-12)); this.version++; return true; }
  setCommission(i) { if (COMMISSION[i] != null) { this.commission = i; this.version++; } }

  startDay(day) {
    // A night's rest clears tiredness, except what long opening hours carry over.
    this.all.forEach(e => { e.stamina = 100 - (e.carry || 0); e.carry = 0; e.restUntil = 0; e.today = { served: 0, earn: 0 }; });
    this.hired.forEach(e => { e.boost = this.baseBoost; if (e.onLeave(day)) e.addStress(-35); });
    this.version++;
  }
  /** Sunday off: tiredness carried over is gone and everyone unwinds. */
  restDay() { this.hired.forEach(e => { e.carry = 0; e.addStress(-20); }); this.version++; }
  /**
   * End-of-day staff upkeep: performance pay, then stress from the day's load.
   * Returns the stylists so stressed they want to quit.
   */
  closeDay(day, restRate, hours = 8) {
    const rate = COMMISSION[this.commission], calm = COMMISSION_CALM[this.commission];
    const pay = Math.round(this.hired.reduce((sum, e) => sum + e.today.earn, 0) * rate);
    if (pay) this.economy.charge('commission', pay);
    const quitting = [], at = this.working(day), W = PROGRAMMES;
    const welfare = this.welfareCostFor(at.length); if (welfare) this.economy.charge('welfare', welfare);
    for (const e of at) {
      // Every hour past eight adds stress and leaves some tiredness for tomorrow. Yesterday's stress is kept by cause.
      const overtime = Math.max(0, hours - 8);
      const k = calm * (e.perk === 'calm' ? .6 : 1) / restRate * (this.has('breaks') ? W.breaks.load : 1);
      const parts = { work: (Math.max(0, e.today.served - 4) * 3 + 2) * k, fatigue: e.fatigue * .2 * k, overtime: overtime * 4 * k, relief: -(restRate > 1 ? 4 : 0) + (this.has('meals') ? W.meals.stress : 0) };
      e.carry = Math.round(e.fatigue * overtime * .08);
      const before = e.stress; e.addStress(parts.work + parts.fatigue + parts.overtime + parts.relief);
      e.lastStress = { ...Object.fromEntries(Object.entries(parts).map(([n, v]) => [n, Math.round(v * 10) / 10])), total: Math.round((e.stress - before) * 10) / 10 };
      e.daysEmployed++; if (e.grudge > 0) e.grudge--;
      // Long-service awards on every round number of days.
      if (this.has('longService') && e.daysEmployed % W.longService.every === 0) {
        this.economy.charge('welfare', W.longService.pay); e.addStress(W.longService.stress); e.loyalty = Math.min(W.longService.maxLoyalty, (e.loyalty || 0) + W.longService.loyalty);
        this.news.push({ key: 'wf.news.longService', name: e.name, n: e.daysEmployed });
      }
      if (e.stress >= this.resignAt(e)) quitting.push(e);
    }
    // Paid leave on request: the most stressed stylist past the line (and not quitting) takes tomorrow off.
    if (this.has('leave')) {
      const tired = at.filter(e => e.stress >= W.leave.at && !quitting.includes(e) && !e.leaveBooked(day + 1)).sort((a, b) => b.stress - a.stress)[0];
      if (tired && this.sendOnLeave(tired, day, 1)) this.news.push({ key: 'wf.news.leave', name: tired.name, n: Math.round(tired.stress) });
    }
    // Only one stylist asks to leave on any day: whoever is furthest past their limit. Others wait, and are counted.
    quitting.sort((a, b) => (b.stress - this.resignAt(b)) - (a.stress - this.resignAt(a)));
    this.waitingToQuit = Math.max(0, quitting.length - 1);
    this.version++;
    return quitting.slice(0, 1);
  }
  /** The skill boost performance pay gives everyone. */
  get baseBoost() { return COMMISSION_BOOST[this.commission]; }
  /** Whether stylists get a random chair each morning. */
  setSeatShuffle(on) { this.seatShuffle = !!on; this.version++; }
  toJSON() { return { commission: this.commission, seatShuffle: this.seatShuffle, welfare: [...this.welfare] }; }
  restore(d) { this.commission = d?.commission || 0; this.seatShuffle = !!d?.seatShuffle; this.welfare = new Set((d?.welfare || []).filter(id => PROGRAMMES[id])); this.version++; }
  /** A stylist's birthday, for their card. */
  birthdayOf(e) { return birthdayOf(e); }
}
