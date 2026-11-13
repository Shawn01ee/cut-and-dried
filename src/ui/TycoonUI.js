import { FURNITURE, FURNITURE_IDS, CHAIR_PRICE, EXPANSIONS } from '../building/FurnitureCatalog.js';
import { hexCss } from '../rendering/color.js';
import { SPECIALTY_BONUS, SPECIALTY_SATISFACTION } from '../employees/Employee.js';
import { COMMISSION, BONUS, LEAVE_DAYS, DINNER_PER_HEAD } from '../employees/StaffManager.js';
import { CAMPAIGNS, CHANNELS, INFLUENCER_FEE } from '../tycoon/Marketing.js';
import { HOURS } from '../tycoon/TycoonGame.js';
import { AMENITIES } from '../tycoon/Hospitality.js';
import { starsFor } from '../tycoon/ReviewBoard.js';
import { INVESTMENTS, LOANS } from '../tycoon/Finance.js';

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const RANK_ORDER = { master: 0, senior: 1, designer: 2, junior: 3 };
const level = v => v >= 70 ? 'bad' : v >= 40 ? 'gold' : 'good';

/** Renders the Staff, Build, Business, Promo, Reviews and Growth pages and routes their button presses. */
export class TycoonUI {
  constructor(game, build, i18n, hooks) { Object.assign(this, { game, build, i18n, hooks }); this.reviewFilter = 'all'; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }

  key(page) {
    const g = this.game, b = this.build.active;
    return [page, this.i18n.lang, g.economy.cash, g.served, Math.floor(g.reputation.value), g.progression.level, g.priceLevel, g.layout.chairs, g.layout.tier, g.layout.items.length, b && b.id, g.franchise.branches.filter(x => x.open).length, g.staff.owner.level, g.staff.owner.experience, g.staff.candidates.map(s => [s.hired, s.level, s.experience, Math.round(s.fatigue / 5), Math.round(s.stress / 5), s.restUntil > this.hooks.now(), this.hooks.hasChair(s)]).join(), g.staff.support.map(s => [s.hired, s.skills.marketing]).join(), g.franchise.branches.map(b => b.clientsToday).join(),
      g.clock.day, g.nextHours && g.nextHours.join(), this.hooks.filming(), this.hooks.canFilm(), g.marketing.version, g.reviews.version, g.hospitality.version, g.staff.version, g.finance.version, g.rival.version, g.regulars, this.reviewFilter].join('|');
  }
  render(page) { return { staff: () => this.#staff(), build: () => this.#build(), biz: () => this.#business(), mkt: () => this.#marketing(), rev: () => this.#reviews(), prog: () => this.#growth() }[page](); }

  #status(e) {
    const t = (k, ...a) => this.#t(k, ...a), day = this.game.clock.day, tags = [];
    if (e.onLeave(day)) tags.push(`<span class="gold">${t('st2.leave', e.leaveTo)}</span>`);
    else if (e.leaveBooked(day)) tags.push(`<span class="gold">${t('st2.leaveSoon')}</span>`);
    else if (!this.hooks.hasChair(e)) tags.push(`<span class="dim">${t('st2.bench')}</span>`);
    if (e.settling) tags.push(`<span class="dim">${t('st2.settling')}</span>`);
    return tags.join(' ');
  }
  #staffRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, s = e.effectiveSkills, owner = e === g.staff.owner, now = this.hooks.now(), day = g.clock.day, cash = g.economy;
    let actions = '';
    if (!owner && e.hired) actions = `<button data-do="train:${e.id}" ${!cash.canAfford(g.staff.trainingCostFor(e)) || !e.canTrain || !g.isUnlocked('training') ? 'disabled' : ''}>${t('staff.train', g.staff.trainingCostFor(e))}</button><button data-do="bonus:${e.id}" ${cash.canAfford(BONUS) ? '' : 'disabled'}>${t('staff.bonus', BONUS)}</button><button data-do="leave:${e.id}" ${e.leaveBooked(day) ? 'disabled' : ''}>${t('staff.leave', LEAVE_DAYS)}</button><button data-do="rest:${e.id}" ${e.restUntil > now || e.onLeave(day) ? 'disabled' : ''}>${t(e.restUntil > now ? 'staff.resting' : 'staff.rest')}</button><button data-do="fire:${e.id}">${t('staff.fire')}</button>`;
    if (!e.hired) {
      const locked = !g.isUnlocked('staff') || (e.unlock && !g.isUnlocked(e.unlock)), seat = this.hooks.hasOpenChair();
      actions = locked ? `<span class="dim">${t('build.lockedAt')}</span>` : `${seat ? '' : `<span class="dim">${t('staff.noChair')}</span>`}<button class="go" data-do="hire:${e.id}" ${!seat || !cash.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.hire', e.hireCost)}</button>`;
    }
    const info = owner ? t('staff.ownerLv', e.level, e.experience, e.experienceToNext) + ' · ' + t('staff.you')
      : e.hired ? `${t('staff.pay', e.level, e.salary, Math.round(e.fatigue), e.experience, e.experienceToNext)} · <span class="${level(e.stress)}">${t('staff.stress', Math.round(e.stress))}</span> ${this.#status(e)}` : t('staff.wage', e.salary);
    const r = g.reviews.ratingFor(e.name), perf = e.hired ? `<br>${t('staff.perf', r.count ? '★' + r.average.toFixed(1) : '–', r.count, e.today.earn.toLocaleString(), e.stats.earn.toLocaleString(), e.stats.served)}` : '';
    return `<div class="brow"><b style="color:${hexCss(e.apron)}">${this.i18n.name(e.name)}</b><span class="dim">${t('role.' + e.role)}</span><span class="sp"></span>${actions}</div><div class="dim">${t('staff.skills', s.cutting, s.colouring, s.perming, s.speed, s.customerService)}${e.specialty ? `<br><span class="gold">${t('staff.special', t('svc.' + e.specialty), SPECIALTY_BONUS, Math.round(SPECIALTY_SATISFACTION * 100))}</span>` : owner ? `<br><span class="gold">${t('staff.allround')}</span>` : ''}${e.perk ? `<br><span class="good">${t('perk.' + e.perk)}</span>` : ''}<br>${info}${perf}</div>`;
  }
  #supportRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, desk = e.effect === 'reception';
    const course = desk && e.hired ? `<button data-do="mtrain:${e.id}" ${(e.skills.marketing || 0) >= 100 || !g.economy.canAfford(g.staff.marketingCourseCost(e)) ? 'disabled' : ''}>${t('staff.mcourse', g.staff.marketingCourseCost(e))}</button>` : '';
    const action = e.hired ? `${course}<button data-do="sfire:${e.id}">${t('staff.fire')}</button>` : `<button class="go" data-do="shire:${e.id}" ${!g.economy.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.rehire', e.hireCost)}</button>`;
    return `<div class="brow"><b style="color:${hexCss(e.apron)}">${this.i18n.name(e.name)}</b><span class="dim">${t('role.' + e.role)}</span><span class="sp"></span>${action}</div><div class="dim">${t('support.' + e.id)}${desk ? '<br>' + t('staff.marketing', e.skills.marketing || 0) : ''}<br>${t('staff.wage', e.salary)}</div>`;
  }
  #staff() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff;
    const commission = COMMISSION.map((r, i) => `<button data-do="commission:${i}" class="${st.commission === i ? 'sel' : ''}">${Math.round(r * 100)}%</button>`).join('');
    const team = [...st.candidates].sort((a, b) => (b.hired - a.hired) || (RANK_ORDER[a.rank] - RANK_ORDER[b.rank]));
    return `<div class="bsec"><h4>${t('staff.policy')}</h4><div class="brow"><span>${t('staff.commission')}</span><span class="sp"></span><span class="seg">${commission}</span></div>
      <div class="brow"><span>${t('staff.dinner')}</span><span class="dim">${t('staff.perHead', DINNER_PER_HEAD)}</span><span class="sp"></span><button data-do="dinner" ${!st.hired.length || st.dinnerDay === g.clock.day || !g.economy.canAfford(st.dinnerCost()) ? 'disabled' : ''}>${st.dinnerDay === g.clock.day ? t('staff.dinnerDone') : '$' + st.dinnerCost()}</button></div></div>
      <div class="bsec"><h4>${t('staff.designers')}</h4>${g.isUnlocked('staff') ? '' : `<div class="dim">${t('staff.lock')}</div>`}${[st.owner, ...team].map(e => this.#staffRow(e)).join('')}</div><div class="bsec"><h4>${t('staff.support')}</h4>${st.support.map(e => this.#supportRow(e)).join('')}</div>`;
  }
  #build() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, l = g.layout, active = this.build.active;
    if (active) return `<div>${t('build.placing', t('f.' + active.id))}</div><div class="brow"><button data-do="rot">${t('build.rotate')}</button><button data-do="cancel">${t('build.cancel')}</button></div>`;
    const next = l.nextExpansion;
    const expand = next ? `<button class="go" data-do="expand" ${!g.isUnlocked(next.requires) || !g.economy.canAfford(next.cost) ? 'disabled' : ''}>${g.isUnlocked(next.requires) ? t('build.expandBuy', next.cost) : t('build.lockedAt')}</button>` : `<span class="dim">${t('build.maxed')}</span>`;
    const furniture = FURNITURE_IDS.map(id => { const f = FURNITURE[id], locked = f.requires && !g.isUnlocked(f.requires), full = l.items.filter(it => it.id === id).length >= l.maxOf(id) || (f.chairs && l.chairs + f.chairs.length > l.maxChairs), small = f.minTier > l.tier; return `<div class="brow"><span>${t('f.' + id)}</span><span class="dim">${t('fd.' + id)}${f.max != null && !small ? ' · ' + t('build.max', l.maxOf(id)) : ''}</span><span class="sp"></span><button class="go" data-do="buy:${id}" ${locked || small || full || !g.economy.canAfford(f.price) ? 'disabled' : ''}>${locked ? t('build.lockedAt') : small ? t('build.size', f.minTier + 1) : '$' + f.price}</button></div>`; }).join('');
    const placed = l.items.length ? l.items.map((it, i) => `<div class="brow"><span>${t('f.' + it.id)}</span><span class="sp"></span><button data-do="move:${i}" ${this.hooks.canModify(it) ? '' : 'disabled'}>${t('build.move')}</button><button data-do="sell:${i}" ${FURNITURE[it.id].essential || !this.hooks.canSell(it) ? 'disabled' : ''}>${t('build.sell', Math.floor(FURNITURE[it.id].price / 2))}</button></div>`).join('') : `<div class="dim">${t('build.none')}</div>`;
    return `<div class="bsec"><h4>${t('build.chairs')}</h4><div class="brow"><span>${t('build.chairLine', l.chairs, l.maxChairs)}</span><span class="sp"></span><button class="go" data-do="buy:station" ${!g.isUnlocked('chairs') || l.chairs >= l.maxChairs || !g.economy.canAfford(CHAIR_PRICE) ? 'disabled' : ''}>${g.isUnlocked('chairs') ? t('build.chairBuy', CHAIR_PRICE) : t('build.lockedAt')}</button></div></div>
    <div class="bsec"><h4>${t('build.expand')}</h4><div class="brow"><span>${t('build.expandLine', l.tier + 1, EXPANSIONS.length + 1)}</span><span class="sp"></span>${expand}</div>${next ? `<div class="dim">${t('build.next.' + l.tier)}</div>` : ''}</div>
    <div class="bsec"><h4>${t('build.furniture')}</h4><div class="dim">${t('build.help')}</div>${furniture}</div><div class="bsec"><h4>${t('build.placed')}</h4>${placed}</div>`;
  }
  #business() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, e = g.economy, money = n => (n < 0 ? '−$' : '$') + Math.abs(n), line = (k, v) => `<div class="brow"><span>${t(k)}</span><span class="sp"></span><span>${v}</span></div>`;
    const costs = `<div class="bsec"><h4>${t('biz.opTitle')}</h4>${Object.entries(g.operatingCosts.breakdown).map(([k, v]) => line('led.' + k, `$${e.today.expenses[k] || 0} / $${v}`)).join('')}${line('led.materials', '$' + (e.today.expenses.materials || 0))}<div class="dim">${t('biz.opNote')}</div></div>`;
    const rep = g.reputation, prices = [0, 1, 2].map(i => `<button data-do="price:${i}" class="${g.priceLevel === i ? 'sel' : ''}">${t('price.' + i)}</button>`).join('');
    const branches = g.isUnlocked('branches') ? `<div class="bsec"><h4>${t('biz.branch')}</h4>${g.franchise.branches.map((b, i) => `<div class="brow"><span>${t('bn.' + b.id)}</span><span class="sp"></span>${b.open ? `<span class="good">${t('branch.owned')}</span><button data-do="view:${i}">${t('branch.view')}</button>` : `<button class="go" data-do="branch:${i}" ${!e.canAfford(b.cost) ? 'disabled' : ''}>${t('branch.open', b.cost)}</button>`}<span class="dim">${b.open ? t('branch.today', b.clientsToday, b.clientsToday ? Math.round(b.satisfactionSum / b.clientsToday * 100) : 0, b.revenueToday) : t('branch.income', g.franchise.incomeOf(b, rep.value))}</span></div>`).join('')}</div>` : '';
    const rows = g.staff.all.filter(s => s.hired).sort((a, b) => b.stats.earn - a.stats.earn), rated = s => { const r = g.reviews.ratingFor(s.name); return r.count ? `★${r.average.toFixed(1)} (${r.count})` : '–'; };
    const hs = g.hospitality, treats = Object.entries(AMENITIES).map(([id, a]) => `<div class="brow"><span>${t('hs.' + id)}</span><span class="dim">${t('hs.cost', a.cost)}</span><span class="sp"></span>${hs.available(id) ? `<span class="seg"><button data-do="amen:${id}" class="${hs.isOffered(id) ? 'sel' : ''}">${t('hs.on')}</button><button data-do="amen:${id}" class="${hs.isOffered(id) ? '' : 'sel'}">${t('hs.off')}</button></span>` : `<span class="dim">${t('hs.needs', t('f.' + a.needs))}</span>`}</div>`).join('');
    return `<div class="bsec"><h4>${t('biz.finance')}</h4>${line('biz.cash', money(e.cash))}${line('biz.rev', money(e.dailyRevenue))}${line('biz.exp', money(-e.dailyOperatingCost))}${line('biz.profit', money(e.dailyProfit))}${e.dailyInvestment ? line('biz.invest', money(-e.dailyInvestment)) : ''}${line('biz.total', g.served)}${line('biz.sat', g.served ? Math.round(g.averageSatisfaction * 100) + '%' : '–')}${line('biz.rep', rep.starText + ' ' + Math.floor(rep.value))}${line('biz.comfort', g.comfort)}${line('biz.regulars', g.regulars)}</div>${costs}${this.#funding()}
    <div class="bsec"><h4>${t('hours.title')}</h4><div class="seg">${HOURS.map(([o, c], i) => { const cur = g.nextHours || [g.clock.openHour, g.clock.closeHour]; return `<button data-do="hours:${i}" class="${cur[0] === o && cur[1] === c ? 'sel' : ''}">${o}–${c}</button>`; }).join('')}</div><div class="dim">${t('hours.note')}${g.nextHours ? ' ' + t('hours.tomorrow', ...g.nextHours) : ''}</div></div>
    <div class="bsec"><h4>${t('biz.price')}</h4>${g.isUnlocked('pricing') ? `<div class="seg">${prices}</div><div class="dim">${t('price.h')}</div>` : `<div class="dim">${t('biz.lockPrice')}</div>`}</div>${this.#rival()}
    <div class="bsec"><h4>${t('hs.title')}</h4>${treats}<div class="brow"><span>${t('hs.floor')}</span><span class="sp"></span><b class="${hs.floor ? 'good' : 'dim'}">${hs.floor ? t('hs.floorV', Math.round(hs.floor * 100), starsFor(hs.floor)) : t('hs.none')}</b></div><div class="dim">${t('hs.what')}</div></div>${branches}
    <div class="bsec"><h4>${t('biz.ladder')}</h4><table class="lad"><tr><th>#</th><th>${t('lad.stylist')}</th><th>${t('lad.done')}</th><th>${t('lad.avg')}</th><th>${t('lad.rating')}</th><th>${t('lad.today')}</th><th>${t('lad.earn')}</th></tr>${rows.map((s, i) => `<tr><td>${i + 1}</td><td style="color:${hexCss(s.apron)}">${this.i18n.name(s.name)}</td><td>${s.stats.served}</td><td>${s.stats.served ? Math.round(s.stats.sum / s.stats.served * 100) + '%' : '–'}</td><td>${rated(s)}</td><td>$${s.today.earn.toLocaleString()}</td><td>$${s.stats.earn.toLocaleString()}</td></tr>`).join('')}</table></div>`;
  }
  #funding() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, f = g.finance, cash = g.economy, lv = g.progression.level;
    const offers = INVESTMENTS.map((o, i) => `<div class="brow"><span>${t('fin.offer', o.amount.toLocaleString(), Math.round(o.share * 100))}</span><span class="sp"></span>${f.taken.includes(i) ? `<span class="good">${t('fin.taken')}</span>` : lv < o.level ? `<span class="dim">${t('build.lockedAt')}</span>` : `<button data-do="invest:${i}" ${f.canInvest(i, lv) ? '' : 'disabled'}>${t('fin.accept')}</button>`}</div>`).join('');
    const stake = f.investorShare ? `<div class="brow"><span>${t('fin.stake', Math.round(f.investorShare * 100), f.invested.toLocaleString())}</span><span class="sp"></span><button data-do="buyback" ${cash.canAfford(f.buybackCost) ? '' : 'disabled'}>${t('fin.buyback', f.buybackCost.toLocaleString())}</button></div>` : '';
    const loan = f.loan ? `<div class="brow"><span>${t('fin.loanNow', f.loan.remaining.toLocaleString(), f.loan.daily, f.loan.daysLeft)}</span><span class="sp"></span><button data-do="repay" ${cash.canAfford(f.loan.remaining) ? '' : 'disabled'}>${t('fin.repay', f.loan.remaining.toLocaleString())}</button></div>`
      : LOANS.map((l, i) => { const k = f.loanTerms(i); return `<div class="brow"><span>${t('fin.loanOffer', k.amount.toLocaleString(), k.days, k.daily)}</span><span class="sp"></span><button data-do="loan:${i}">${t('fin.borrow')}</button></div>`; }).join('');
    return `<div class="bsec"><h4>${t('fin.title')}</h4><div class="dim">${t('fin.daniel')}</div>${stake}${offers}<div class="dim" style="margin-top:4px">${t('fin.bank')}</div>${loan}</div>`;
  }
  #rival() {
    const t = (k, ...a) => this.#t(k, ...a), r = this.game.rival;
    if (!r.open) return '';
    return `<div class="bsec"><h4>${t('rival.title')}</h4><div class="brow"><b>${r.name}</b><span class="dim">${t('price.' + r.priceLevel)} · ★ ${r.rating.toFixed(1)}</span></div>${r.move ? `<div class="gold">${t('rival.now.' + r.move, r.daysLeft)}</div>` : `<div class="dim">${t('rival.quiet')}</div>`}</div>`;
  }
  #marketing() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, m = g.marketing, day = g.clock.day, cash = g.economy, desk = g.staff.receptionist, power = g.marketingPower;
    const channel = id => {
      const def = CHANNELS[id], ch = m.channels[id], locked = def.unlock && !g.isUnlocked(def.unlock), wait = def.cooldown - (day - ch.lastDay);
      const last = ch.last ? t(ch.last.viral ? 'mk.lastViral' : 'mk.last', ch.last.views.toLocaleString(), ch.last.gained.toLocaleString()) : t('mk.noReel');
      const button = locked ? `<span class="dim">${t('build.lockedAt')}</span>` : wait > 0 ? `<span class="dim">${ch.lastDay === day ? t('mk.reelDone') : t('mk.wait', wait)}</span>` : `<button class="go" data-do="post:${id}" ${cash.canAfford(def.cost) && this.hooks.canFilm() ? '' : 'disabled'}>${t('mk.post.' + id)} $${def.cost}</button>`;
      return `<div class="brow"><b>${t('mk.ch.' + id)}</b><span>${ch.followers.toLocaleString()}</span><span class="dim">${last}</span><span class="sp"></span>${button}</div><div class="dim">${t('mk.chEffect', def.minGain, Math.round(def.buzz.demand * power * 100), def.buzz.days, def.film)}</div>`;
    };
    const campaign = id => { const c = CAMPAIGNS[id], run = m.active.find(a => a.id === id); return `<div class="brow"><span>${t('mk.' + id)}</span><span class="dim">${t('mk.adEffect', c.days, Math.round(c.demand * power * 100))}</span><span class="sp"></span>${run ? `<span class="good">${t('mk.running', run.daysLeft)}</span>` : `<button class="go" data-do="campaign:${id}" ${cash.canAfford(c.cost) ? '' : 'disabled'}>$${c.cost}</button>`}</div>`; };
    const influencer = !g.isUnlocked('influencer') ? `<span class="dim">${t('build.lockedAt')}</span>` : !desk.hired ? `<span class="dim">${t('mk.needDesk')}</span>` : m.influencerBooked ? `<span class="good">${t('mk.infBooked')}</span>` : `<button class="go" data-do="influencer" ${m.canBookInfluencer(day) ? '' : 'disabled'}>${t('mk.infBook')}</button>`;
    const buzz = m.active.filter(a => !CAMPAIGNS[a.id]).map(a => `<div class="brow"><span class="gold">${t('mk.buzz.' + a.id)}</span><span class="sp"></span><span class="dim">${t('mk.running', a.daysLeft)}</span></div>`).join('');
    const manager = (desk.hired ? t('mk.manager', this.i18n.name(desk.name), desk.skills.marketing || 0) : t('mk.managerSelf', this.i18n.name(g.staff.owner.name))) + (this.hooks.filming() ? ' · ' + t('mk.filmingNow') : '');
    return `<div class="bsec"><h4>${t('mk.sns')}</h4><div class="brow"><span>${t('mk.followers')}</span><span class="sp"></span><b>${m.followers.toLocaleString()}</b></div><div class="dim">${manager}</div>${Object.keys(CHANNELS).map(channel).join('')}${buzz}</div>
      <div class="bsec"><h4>${t('mk.ads')}</h4>${campaign('flyers')}${campaign('instaAd')}<div class="brow"><span>${t('mk.influencer')}</span><span class="dim">${t('mk.infNote', INFLUENCER_FEE)}</span><span class="sp"></span>${influencer}</div></div>`;
  }
  #reviews() {
    const t = (k, ...a) => this.#t(k, ...a), rv = this.game.reviews, f = this.reviewFilter, name = n => this.i18n.name(n);
    rv.markRead();
    const dist = [5, 4, 3, 2, 1].map(s => { const n = rv.visible.filter(r => r.stars === s).length; return `<div class="bar"><span>${s}★</span><div class="tr"><div class="fl" style="width:${rv.count ? Math.round(n / rv.count * 100) : 0}%;background:#ffd98a"></div></div><b>${n}</b></div>`; }).join('');
    const shown = rv.list.filter(r => f === 'todo' ? !r.replied && !r.removed : f === 'low' ? r.stars <= 2 && !r.removed : true).slice(0, 25);
    const visit = v => v ? ` · ${v.stylist ? name(v.stylist) + ' · ' : ''}${t('rvs.' + v.service)}` : '';
    const who = r => t(r.byRole === 'desk' ? 'rv.by.desk' : 'rv.by.owner', name(r.by || this.game.staff.owner.name));
    const actions = r => r.replied ? `<div class="reply">↳ ${t('rv.reply.' + r.replied, who(r))}</div>` : `<div class="brow">${r.stars >= 4 ? `<button data-do="reply:${r.id}.thanks">${t('rv.thanks')}</button>` : `<button data-do="reply:${r.id}.apology">${t('rv.apology')}</button><button data-do="reply:${r.id}.report">${t('rv.report')}</button>`}</div>`;
    const row = r => r.removed ? `<div class="rv dim">${t('rv.removedNote', name(r.author))}</div>` : `<div class="rv"><div class="brow"><b>${name(r.author)}</b><span class="gold">${stars(r.stars)}</span><span class="dim">${t('rv.day', r.day)}${visit(r.visit)}${r.edited ? ' · ' + t('rv.edited') : ''}</span></div><div>${t('rv.' + r.key, ...r.args.map(name))}</div>${actions(r)}</div>`;
    const filters = ['all', 'todo', 'low'].map(k => `<button data-do="rvf:${k}" class="${f === k ? 'sel' : ''}">${t('rv.f.' + k)}</button>`).join('');
    const mgr = this.game.reviewManager, auto = this.game.staff.receptionist.hired ? `<button data-do="autoreply" class="${rv.autoReply ? 'sel' : ''}">${t(rv.autoReply ? 'rv.autoOn' : 'rv.autoOff')}</button>` : '';
    return `<div class="bsec"><h4>${t('rv.title')}</h4><div class="brow"><span class="dim">${t('rv.manager', t(mgr.role === 'desk' ? 'rv.by.desk' : 'rv.by.owner', name(mgr.name)))}</span><span class="sp"></span>${auto}</div><div class="dim">${t('rv.weightNote')}</div><div class="brow"><b class="gold">${rv.count ? '★ ' + rv.rating.toFixed(1) : '–'}</b><span class="dim">${t('rv.count', rv.count)}</span></div>${dist}</div>
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
      post: () => this.hooks.post(value), campaign: () => { if (g.runCampaign(value)) this.hooks.spent(); }, influencer: () => { if (g.staff.receptionist.hired) g.marketing.bookInfluencer(g.clock.day); },
      reply: () => { const [id, kind] = value.split('.'); this.hooks.reply(+id, kind); }, rvf: () => { this.reviewFilter = value; },
      amen: () => g.hospitality.toggle(value), autoreply: () => { g.reviews.autoReply = !g.reviews.autoReply; g.reviews.version++; }, hours: () => g.setHours(...HOURS[+value]),
      commission: () => g.staff.setCommission(+value), dinner: () => { if (g.staff.teamDinner(g.clock.day)) this.hooks.spent(); },
      bonus: () => { if (g.staff.giveBonus(e)) this.hooks.spent(); }, leave: () => g.staff.sendOnLeave(e, g.clock.day), mtrain: () => { if (g.staff.trainMarketing(e)) this.hooks.spent(); },
      invest: () => { if (g.finance.takeInvestment(+value, g.progression.level)) this.hooks.spent(); }, buyback: () => g.finance.buyBack(),
      loan: () => { if (g.finance.takeLoan(+value)) this.hooks.spent(); }, repay: () => g.finance.repayLoan(),
    }[action];
    if (run) run();
  }
}
