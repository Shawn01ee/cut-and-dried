import { FURNITURE, FURNITURE_IDS, CHAIR_PRICE, EXPANSIONS } from '../building/FurnitureCatalog.js';
import { hexCss } from '../rendering/color.js';
import { SPECIALTY_BONUS, SPECIALTY_SATISFACTION } from '../employees/Employee.js';

/** Renders the Staff, Build, Business and Growth pages and routes their button presses. */
export class TycoonUI {
  constructor(game, build, i18n, hooks) { Object.assign(this, { game, build, i18n, hooks }); }
  #t(k, ...a) { return this.i18n.t(k, ...a); }

  key(page) {
    const g = this.game, b = this.build.active;
    return [page, this.i18n.lang, g.economy.cash, g.served, Math.floor(g.reputation.value), g.progression.level, g.priceLevel, g.layout.chairs, g.layout.tier, g.layout.items.length, b && b.id, g.franchise.branches.filter(x => x.open).length, g.staff.owner.level, g.staff.owner.experience, g.staff.candidates.map(s => [s.hired, s.level, s.experience, Math.round(s.fatigue / 5), s.restUntil > this.hooks.now()]).join(), g.staff.support.map(s => s.hired).join(), g.franchise.branches.map(b => b.clientsToday).join()].join('|');
  }
  render(page) { return { staff: () => this.#staff(), build: () => this.#build(), biz: () => this.#business(), prog: () => this.#growth() }[page](); }

  #staffRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, s = e.effectiveSkills, owner = e === g.staff.owner, now = this.hooks.now();
    let actions = '';
    if (!owner && e.hired) actions = `<button data-do="train:${e.id}" ${!g.economy.canAfford(e.trainingCost) || !e.canTrain || !g.isUnlocked('training') ? 'disabled' : ''}>${t('staff.train', e.trainingCost)}</button><button data-do="rest:${e.id}" ${e.restUntil > now ? 'disabled' : ''}>${t(e.restUntil > now ? 'staff.resting' : 'staff.rest')}</button><button data-do="fire:${e.id}">${t('staff.fire')}</button>`;
    if (!e.hired) { const seat = this.hooks.hasOpenChair(); actions = `${seat ? '' : `<span class="dim">${t('staff.noChair')}</span>`}<button class="go" data-do="hire:${e.id}" ${!seat || !g.economy.canAfford(e.hireCost) || !g.isUnlocked('staff') ? 'disabled' : ''}>${t('staff.hire', e.hireCost)}</button>`; }
    return `<div class="brow"><b style="color:${hexCss(e.apron)}">${this.i18n.name(e.name)}</b><span class="dim">${t('style.' + e.style)}</span><span class="sp"></span>${actions}</div><div class="dim">${t('staff.skills', s.cutting, s.colouring, s.perming, s.speed, s.customerService)}${e.specialty ? `<br><span class="gold">${t('staff.special', t('svc.' + e.specialty), SPECIALTY_BONUS, Math.round(SPECIALTY_SATISFACTION * 100))}</span>` : ''}<br>${owner ? t('staff.ownerLv', e.level, e.experience, e.experienceToNext) + ' · ' + t('staff.you') : t('staff.pay', e.level, e.salary, Math.round(e.fatigue), e.experience, e.experienceToNext)}</div>`;
  }
  #supportRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game;
    const action = e.hired ? `<button data-do="sfire:${e.id}">${t('staff.fire')}</button>` : `<button class="go" data-do="shire:${e.id}" ${!g.economy.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.rehire', e.hireCost)}</button>`;
    return `<div class="brow"><b style="color:${hexCss(e.apron)}">${this.i18n.name(e.name)}</b><span class="dim">${t('style.' + e.style)}</span><span class="sp"></span>${action}</div><div class="dim">${t('support.' + e.id)}<br>${t('staff.wage', e.salary)}</div>`;
  }
  #staff() {
    const g = this.game;
    return `<div class="bsec"><h4>${this.#t('tab.staff')}</h4>${g.isUnlocked('staff') ? '' : `<div class="dim">${this.#t('staff.lock')}</div>`}${g.staff.all.map(e => this.#staffRow(e)).join('')}</div><div class="bsec"><h4>${this.#t('staff.support')}</h4>${g.staff.support.map(e => this.#supportRow(e)).join('')}</div>`;
  }
  #build() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, l = g.layout, active = this.build.active;
    if (active) return `<div>${t('build.placing', t('f.' + active.id))}</div><div class="brow"><button data-do="rot">${t('build.rotate')}</button><button data-do="cancel">${t('build.cancel')}</button></div>`;
    const next = l.nextExpansion;
    const expand = next ? `<button class="go" data-do="expand" ${!g.isUnlocked(next.requires) || !g.economy.canAfford(next.cost) ? 'disabled' : ''}>${g.isUnlocked(next.requires) ? t('build.expandBuy', next.cost) : t('build.lockedAt')}</button>` : `<span class="dim">${t('build.maxed')}</span>`;
    const furniture = FURNITURE_IDS.map(id => { const f = FURNITURE[id], locked = f.requires && !g.isUnlocked(f.requires); return `<div class="brow"><span>${t('f.' + id)}</span><span class="dim">${t('fd.' + id)}</span><span class="sp"></span><button class="go" data-do="buy:${id}" ${locked || !g.economy.canAfford(f.price) ? 'disabled' : ''}>${locked ? t('build.lockedAt') : '$' + f.price}</button></div>`; }).join('');
    const placed = l.items.length ? l.items.map((it, i) => `<div class="brow"><span>${t('f.' + it.id)}</span><span class="sp"></span><button data-do="move:${i}" ${this.hooks.canModify(it) ? '' : 'disabled'}>${t('build.move')}</button><button data-do="sell:${i}" ${FURNITURE[it.id].essential || !this.hooks.canSell(it) ? 'disabled' : ''}>${t('build.sell', Math.floor(FURNITURE[it.id].price / 2))}</button></div>`).join('') : `<div class="dim">${t('build.none')}</div>`;
    return `<div class="bsec"><h4>${t('build.chairs')}</h4><div class="brow"><span>${t('build.chairLine', l.chairs, l.maxChairs)}</span><span class="sp"></span><button class="go" data-do="buy:station" ${!g.isUnlocked('chairs') || l.chairs >= l.maxChairs || !g.economy.canAfford(CHAIR_PRICE) ? 'disabled' : ''}>${g.isUnlocked('chairs') ? t('build.chairBuy', CHAIR_PRICE) : t('build.lockedAt')}</button></div></div>
    <div class="bsec"><h4>${t('build.expand')}</h4><div class="brow"><span>${t('build.expandLine', l.tier + 1, EXPANSIONS.length + 1)}</span><span class="sp"></span>${expand}</div>${l.tier === 2 ? `<div class="dim">${t('build.annex')}</div>` : ''}</div>
    <div class="bsec"><h4>${t('build.furniture')}</h4><div class="dim">${t('build.help')}</div>${furniture}</div><div class="bsec"><h4>${t('build.placed')}</h4>${placed}</div>`;
  }
  #business() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, e = g.economy, money = n => (n < 0 ? '−$' : '$') + Math.abs(n), line = (k, v) => `<div class="brow"><span>${t(k)}</span><span class="sp"></span><span>${v}</span></div>`;
    const costs = `<div class="bsec"><h4>${t('biz.opTitle')}</h4>${Object.entries(g.operatingCosts.breakdown).map(([k, v]) => line('led.' + k, `$${e.today.expenses[k] || 0} / $${v}`)).join('')}${line('led.materials', '$' + (e.today.expenses.materials || 0))}<div class="dim">${t('biz.opNote')}</div></div>`;
    const rep = g.reputation, prices = [0, 1, 2].map(i => `<button data-do="price:${i}" class="${g.priceLevel === i ? 'sel' : ''}">${t('price.' + i)}</button>`).join('');
    const branches = g.isUnlocked('branches') ? `<div class="bsec"><h4>${t('biz.branch')}</h4>${g.franchise.branches.map((b, i) => `<div class="brow"><span>${t('bn.' + b.id)}</span><span class="sp"></span>${b.open ? `<span class="good">${t('branch.owned')}</span><button data-do="view:${i}">${t('branch.view')}</button>` : `<button class="go" data-do="branch:${i}" ${!e.canAfford(b.cost) ? 'disabled' : ''}>${t('branch.open', b.cost)}</button>`}<span class="dim">${b.open ? t('branch.today', b.clientsToday, b.clientsToday ? Math.round(b.satisfactionSum / b.clientsToday * 100) : 0, b.revenueToday) : t('branch.income', g.franchise.incomeOf(b, rep.value))}</span></div>`).join('')}</div>` : '';
    const rows = g.staff.all.filter(s => s.hired).sort((a, b) => (b.stats.sum / (b.stats.served || 1)) - (a.stats.sum / (a.stats.served || 1)));
    return `<div class="bsec"><h4>${t('biz.finance')}</h4>${line('biz.cash', money(e.cash))}${line('biz.rev', money(e.dailyRevenue))}${line('biz.exp', money(-e.dailyOperatingCost))}${line('biz.profit', money(e.dailyProfit))}${e.dailyInvestment ? line('biz.invest', money(-e.dailyInvestment)) : ''}${line('biz.total', g.served)}${line('biz.sat', g.served ? Math.round(g.averageSatisfaction * 100) + '%' : '–')}${line('biz.rep', rep.starText + ' ' + Math.floor(rep.value))}${line('biz.comfort', g.comfort)}</div>${costs}
    <div class="bsec"><h4>${t('biz.price')}</h4>${g.isUnlocked('pricing') ? `<div class="seg">${prices}</div><div class="dim">${t('price.h')}</div>` : `<div class="dim">${t('biz.lockPrice')}</div>`}</div>${branches}
    <div class="bsec"><h4>${t('biz.ladder')}</h4><table class="lad"><tr><th>#</th><th>${t('lad.stylist')}</th><th>${t('lad.done')}</th><th>${t('lad.avg')}</th><th>${t('lad.earn')}</th></tr>${rows.map((s, i) => `<tr><td>${i + 1}</td><td style="color:${hexCss(s.apron)}">${this.i18n.name(s.name)}</td><td>${s.stats.served}</td><td>${s.stats.served ? Math.round(s.stats.sum / s.stats.served * 100) + '%' : '–'}</td><td>$${s.stats.earn}</td></tr>`).join('')}</table></div>`;
  }
  #growth() {
    const t = (k, ...a) => this.#t(k, ...a), p = this.game.progression, next = p.next, ctx = this.game.context;
    return `<div class="bsec"><h4>${t('prog.current', p.level, t('lv.' + p.level))}</h4><div>${next ? t('prog.next', t('goal.' + next.level, ...next.goal(ctx))) : t('prog.max')}</div></div><div class="bsec"><h4>${t('prog.unlocks')}</h4>${p.all.map(l => `<div class="brow"><span class="${l.level <= p.level ? 'good' : 'dim'}">${l.level <= p.level ? '✓' : '·'} ${l.level}. ${t('lv.' + l.level)}</span><span class="sp"></span><span class="dim">${l.unlocks.map(u => t('u.' + u)).join(', ')}</span></div>`).join('')}</div>`;
  }

  handle(action, value) {
    const g = this.game, e = g.staff.find(value);
    const run = {
      hire: () => this.hooks.hire(e), fire: () => this.hooks.fire(e),
      shire: () => { if (g.staff.hire(e)) this.hooks.syncSupport(); }, sfire: () => { if (g.staff.fire(e)) this.hooks.syncSupport(); }, train: () => { if (g.staff.train(e)) g.bus.emit('staff:levelup', e); },
      rest: () => { e.restUntil = this.hooks.now() + 20; e.rest(50); },
      price: () => { g.priceLevel = +value; }, branch: () => { if (g.franchise.open(g.franchise.branches[+value])) this.hooks.syncBranches(); }, view: () => this.hooks.viewSite(+value),
      expand: () => { if (g.expand()) this.hooks.syncChairs(); },
      buy: () => this.build.start(value), move: () => { const it = g.layout.items[+value]; this.build.start(it.id, it); },
      sell: () => this.build.sell(g.layout.items[+value]), rot: () => this.build.rotate(), cancel: () => this.build.cancel(),
    }[action];
    if (run) run();
  }
}
