import { FURNITURE, FURNITURE_IDS, CHAIR_PRICE, EXPANSIONS } from '../building/FurnitureCatalog.js';
import { hexCss } from '../rendering/color.js';
import { SPECIALTY_BONUS, SPECIALTY_SATISFACTION } from '../employees/Employee.js';
import { CAMPAIGNS, REEL_COST } from '../tycoon/Marketing.js';
import { AMENITIES } from '../tycoon/Hospitality.js';

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Renders the Staff, Build, Business, Promo, Reviews and Growth pages and routes their button presses. */
export class TycoonUI {
  constructor(game, build, i18n, hooks) { Object.assign(this, { game, build, i18n, hooks }); this.reviewFilter = 'all'; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }

  key(page) {
    const g = this.game, b = this.build.active;
    return [page, this.i18n.lang, g.economy.cash, g.served, Math.floor(g.reputation.value), g.progression.level, g.priceLevel, g.layout.chairs, g.layout.tier, g.layout.items.length, b && b.id, g.franchise.branches.filter(x => x.open).length, g.staff.owner.level, g.staff.owner.experience, g.staff.candidates.map(s => [s.hired, s.level, s.experience, Math.round(s.fatigue / 5), s.restUntil > this.hooks.now()]).join(), g.staff.support.map(s => s.hired).join(), g.franchise.branches.map(b => b.clientsToday).join(),
      g.clock.day, g.marketing.version, g.reviews.version, g.hospitality.version, this.reviewFilter].join('|');
  }
  render(page) { return { staff: () => this.#staff(), build: () => this.#build(), biz: () => this.#business(), mkt: () => this.#marketing(), rev: () => this.#reviews(), prog: () => this.#growth() }[page](); }

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
    const hs = g.hospitality, treats = Object.entries(AMENITIES).map(([id, a]) => `<div class="brow"><span>${t('hs.' + id)}</span><span class="dim">${t('hs.cost', a.cost)}</span><span class="sp"></span>${hs.available(id) ? `<span class="seg"><button data-do="amen:${id}" class="${hs.isOffered(id) ? 'sel' : ''}">${t('hs.on')}</button><button data-do="amen:${id}" class="${hs.isOffered(id) ? '' : 'sel'}">${t('hs.off')}</button></span>` : `<span class="dim">${t('hs.needs', t('f.' + a.needs))}</span>`}</div>`).join('');
    return `<div class="bsec"><h4>${t('biz.finance')}</h4>${line('biz.cash', money(e.cash))}${line('biz.rev', money(e.dailyRevenue))}${line('biz.exp', money(-e.dailyOperatingCost))}${line('biz.profit', money(e.dailyProfit))}${e.dailyInvestment ? line('biz.invest', money(-e.dailyInvestment)) : ''}${line('biz.total', g.served)}${line('biz.sat', g.served ? Math.round(g.averageSatisfaction * 100) + '%' : '–')}${line('biz.rep', rep.starText + ' ' + Math.floor(rep.value))}${line('biz.comfort', g.comfort)}</div>${costs}
    <div class="bsec"><h4>${t('biz.price')}</h4>${g.isUnlocked('pricing') ? `<div class="seg">${prices}</div><div class="dim">${t('price.h')}</div>` : `<div class="dim">${t('biz.lockPrice')}</div>`}</div>
    <div class="bsec"><h4>${t('hs.title')}</h4>${treats}</div>${branches}
    <div class="bsec"><h4>${t('biz.ladder')}</h4><table class="lad"><tr><th>#</th><th>${t('lad.stylist')}</th><th>${t('lad.done')}</th><th>${t('lad.avg')}</th><th>${t('lad.earn')}</th></tr>${rows.map((s, i) => `<tr><td>${i + 1}</td><td style="color:${hexCss(s.apron)}">${this.i18n.name(s.name)}</td><td>${s.stats.served}</td><td>${s.stats.served ? Math.round(s.stats.sum / s.stats.served * 100) + '%' : '–'}</td><td>$${s.stats.earn}</td></tr>`).join('')}</table></div>`;
  }
  #marketing() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, m = g.marketing, day = g.clock.day, cash = g.economy;
    const last = m.lastReel ? t(m.lastReel.viral ? 'mk.lastViral' : 'mk.last', m.lastReel.views.toLocaleString(), m.lastReel.gained.toLocaleString()) : t('mk.noReel');
    const campaign = id => { const c = CAMPAIGNS[id], run = m.active.find(a => a.id === id); return `<div class="brow"><span>${t('mk.' + id)}</span><span class="dim">${t('mk.days', c.days)}</span><span class="sp"></span>${run ? `<span class="good">${t('mk.running', run.daysLeft)}</span>` : `<button class="go" data-do="campaign:${id}" ${cash.canAfford(c.cost) ? '' : 'disabled'}>$${c.cost}</button>`}</div>`; };
    const influencer = !g.isUnlocked('influencer') ? `<span class="dim">${t('build.lockedAt')}</span>` : m.influencerBooked ? `<span class="good">${t('mk.infBooked')}</span>` : `<button class="go" data-do="influencer" ${m.canBookInfluencer(day) ? '' : 'disabled'}>${t('mk.infBook')}</button>`;
    const buzz = m.active.filter(a => !CAMPAIGNS[a.id]).map(a => `<div class="brow"><span class="gold">${t('mk.buzz.' + a.id)}</span><span class="sp"></span><span class="dim">${t('mk.running', a.daysLeft)}</span></div>`).join('');
    return `<div class="bsec"><h4>${t('mk.sns')}</h4><div class="brow"><span>${t('mk.followers')}</span><span class="sp"></span><b>${m.followers.toLocaleString()}</b></div>
      <div class="brow"><span>${t('mk.reel')}</span><span class="dim">${last}</span><span class="sp"></span><button class="go" data-do="reel" ${m.canPostReel(day) ? '' : 'disabled'}>${m.reelDay === day ? t('mk.reelDone') : '$' + REEL_COST}</button></div>${buzz}</div>
      <div class="bsec"><h4>${t('mk.ads')}</h4>${campaign('flyers')}${campaign('instaAd')}<div class="brow"><span>${t('mk.influencer')}</span><span class="dim">${t('mk.infNote')}</span><span class="sp"></span>${influencer}</div></div>`;
  }
  #reviews() {
    const t = (k, ...a) => this.#t(k, ...a), rv = this.game.reviews, f = this.reviewFilter, name = n => this.i18n.name(n);
    rv.markRead();
    const dist = [5, 4, 3, 2, 1].map(s => { const n = rv.visible.filter(r => r.stars === s).length; return `<div class="bar"><span>${s}★</span><div class="tr"><div class="fl" style="width:${rv.count ? Math.round(n / rv.count * 100) : 0}%;background:#ffd98a"></div></div><b>${n}</b></div>`; }).join('');
    const shown = rv.list.filter(r => f === 'todo' ? !r.replied && !r.removed : f === 'low' ? r.stars <= 2 && !r.removed : true).slice(0, 25);
    const visit = v => v ? ` · ${v.stylist ? name(v.stylist) + ' · ' : ''}${t('rvs.' + v.service)}` : '';
    const actions = r => r.replied ? `<div class="reply">↳ ${t('rv.reply.' + r.replied)}</div>` : `<div class="brow">${r.stars >= 4 ? `<button data-do="reply:${r.id}.thanks">${t('rv.thanks')}</button>` : `<button data-do="reply:${r.id}.apology">${t('rv.apology')}</button><button data-do="reply:${r.id}.report">${t('rv.report')}</button>`}</div>`;
    const row = r => r.removed ? `<div class="rv dim">${t('rv.removedNote', name(r.author))}</div>` : `<div class="rv"><div class="brow"><b>${name(r.author)}</b><span class="gold">${stars(r.stars)}</span><span class="dim">${t('rv.day', r.day)}${visit(r.visit)}${r.edited ? ' · ' + t('rv.edited') : ''}</span></div><div>${t('rv.' + r.key, ...r.args.map(name))}</div>${actions(r)}</div>`;
    const filters = ['all', 'todo', 'low'].map(k => `<button data-do="rvf:${k}" class="${f === k ? 'sel' : ''}">${t('rv.f.' + k)}</button>`).join('');
    return `<div class="bsec"><h4>${t('rv.title')}</h4><div class="brow"><b class="gold">${rv.count ? '★ ' + rv.rating.toFixed(1) : '–'}</b><span class="dim">${t('rv.count', rv.count)}</span></div>${dist}</div>
      <div class="bsec"><div class="seg" style="margin-bottom:4px">${filters}</div>${shown.length ? shown.map(row).join('') : `<div class="dim">${t('rv.none')}</div>`}</div>`;
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
      reel: () => this.hooks.postReel(), campaign: () => { if (g.marketing.run(value)) this.hooks.spent(); }, influencer: () => g.marketing.bookInfluencer(g.clock.day),
      reply: () => { const [id, kind] = value.split('.'); this.hooks.reply(+id, kind); }, rvf: () => { this.reviewFilter = value; },
      amen: () => g.hospitality.toggle(value),
    }[action];
    if (run) run();
  }
}
