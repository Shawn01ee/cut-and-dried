import { Employee } from './Employee.js';

const DEFINITIONS = [
  { id: 'mia', name: 'Mia', role: 'Senior Stylist', style: 'Precise', skills: { cutting: 80, colouring: 76, perming: 68, speed: 48, customerService: 80 }, salary: 220, hireCost: 1800, apron: 0x2f6fd6, hair: 0xf1dfae },
  { id: 'jun', name: 'Jun', role: 'Junior Stylist', style: 'Speedy', skills: { cutting: 35, colouring: 40, perming: 12, speed: 90, customerService: 60 }, salary: 120, hireCost: 600, bias: -1.2, single: true, apron: 0x1fa39a, hair: 0x16110f },
  { id: 'rosa', name: 'Rosa', role: 'Colourist', style: 'Colourist', skills: { cutting: 55, colouring: 90, perming: 44, speed: 60, customerService: 70 }, salary: 200, hireCost: 1500, bias: .6, fine: true, apron: 0xe25c8f, hair: 0xc8642a, long: true },
];

/** Owns the roster: who can be hired, who works here, and what they cost. */
export class StaffManager {
  constructor(economy) {
    this.economy = economy;
    this.owner = new Employee({ id: 'owner', name: 'Lia', role: 'Owner', style: 'Owner', skills: { cutting: 65, colouring: 60, perming: 52, speed: 60, customerService: 75 }, salary: 0, single: true, apron: 0xffd98a, hair: 0x2e1d14 });
    this.owner.hired = true;
    this.candidates = DEFINITIONS.map(d => new Employee(d));
  }
  get all() { return [this.owner, ...this.candidates]; }
  get hired() { return this.candidates.filter(e => e.hired); }
  get payroll() { return this.hired.reduce((sum, e) => sum + e.salary, 0); }
  find(id) { return this.all.find(e => e.id === id); }
  hire(employee) { if (employee.hired || !this.economy.spend('recruiting', employee.hireCost)) return false; employee.hired = true; return true; }
  fire(employee) { if (!employee.hired || employee === this.owner) return false; employee.hired = false; employee.status = 'idle'; return true; }
  train(employee) { if (!employee.hired || !employee.canTrain || !this.economy.spend('training', employee.trainingCost)) return false; employee.improve(); return true; }
  startDay() { this.all.forEach(e => { e.stamina = 100; e.restUntil = 0; }); }
}
