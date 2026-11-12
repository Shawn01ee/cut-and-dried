import { Employee } from './Employee.js';

const DEFINITIONS = [
  { id: 'mia', name: 'Mia', role: 'Senior Stylist', style: 'CutSpecialist', specialty: 'cut', skills: { cutting: 80, colouring: 62, perming: 55, speed: 48, customerService: 80 }, salary: 220, hireCost: 1800, apron: 0x2f6fd6, hair: 0xf1dfae },
  { id: 'shawn', name: 'Shawn', role: 'Junior Stylist', style: 'PermSpecialist', specialty: 'perm', skills: { cutting: 45, colouring: 40, perming: 72, speed: 90, customerService: 60 }, salary: 120, hireCost: 600, bias: -1.2, single: true, apron: 0x1fa39a, hair: 0x16110f },
  { id: 'ethan', name: 'Ethan', role: 'Barber', style: 'CutSpecialist', specialty: 'cut', skills: { cutting: 76, colouring: 45, perming: 40, speed: 75, customerService: 70 }, salary: 180, hireCost: 1400, apron: 0x2a4478, hair: 0x6e4428 },
  { id: 'yuri', name: 'Yuri', role: 'Senior Designer', style: 'AllRounder', skills: { cutting: 78, colouring: 78, perming: 78, speed: 60, customerService: 85 }, salary: 280, hireCost: 2500, fine: true, apron: 0xffb15a, hair: 0x16110f, long: true },
  { id: 'rosa', name: 'Rosa', role: 'Colourist', style: 'ColourSpecialist', specialty: 'colour', skills: { cutting: 55, colouring: 90, perming: 44, speed: 60, customerService: 70 }, salary: 200, hireCost: 1500, bias: .6, fine: true, apron: 0xe25c8f, hair: 0xc8642a, long: true },
];

const SUPPORT = [
  { id: 'sophie', name: 'Sophie', role: 'Receptionist', style: 'Reception', effect: 'reception', skills: { cutting: 0, colouring: 0, perming: 0, speed: 50, customerService: 85 }, salary: 60, hireCost: 200, apron: 0x8a4fc2 },
  { id: 'max', name: 'Max', role: 'Assistant', style: 'Assistant', effect: 'tidy', skills: { cutting: 0, colouring: 0, perming: 0, speed: 60, customerService: 60 }, salary: 50, hireCost: 200, apron: 0x5f9e45 },
];

/** Owns the roster: who can be hired, who works here, and what they cost. */
export class StaffManager {
  constructor(economy) {
    this.economy = economy;
    this.owner = new Employee({ id: 'owner', name: 'Lia', role: 'Owner', style: 'Owner', skills: { cutting: 65, colouring: 60, perming: 52, speed: 60, customerService: 75 }, salary: 0, single: true, apron: 0xffd98a, hair: 0x2e1d14 });
    this.owner.hired = true;
    this.candidates = DEFINITIONS.map(d => new Employee(d));
    // Front desk and floor help: on the payroll from day one, never at a styling chair.
    this.support = SUPPORT.map(d => Object.assign(new Employee(d), { effect: d.effect, hired: true }));
  }
  get all() { return [this.owner, ...this.candidates]; }
  get hired() { return this.candidates.filter(e => e.hired); }
  get payroll() { return [...this.hired, ...this.support.filter(e => e.hired)].reduce((sum, e) => sum + e.salary, 0); }
  hasSupport(effect) { return this.support.some(e => e.hired && e.effect === effect); }
  find(id) { return [...this.all, ...this.support].find(e => e.id === id); }
  hire(employee) { if (employee.hired || !this.economy.spend('recruiting', employee.hireCost)) return false; employee.hired = true; return true; }
  fire(employee) { if (!employee.hired || employee === this.owner) return false; employee.hired = false; employee.status = 'idle'; return true; }
  /** Paid training: a block of experience that may lift the stylist a level. Returns levels gained. */
  train(employee) { if (!employee.hired || !employee.canTrain || !this.economy.spend('training', employee.trainingCost)) return 0; return employee.gainExperience(60); }
  startDay() { this.all.forEach(e => { e.stamina = 100; e.restUntil = 0; }); }
}
