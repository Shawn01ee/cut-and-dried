import { FURNITURE, FURNITURE_IDS, CHAIR_PRICE, EXPANSIONS } from '../building/FurnitureCatalog.js';
import { nameColour, rankMark, RANK_COLOURS } from './nameStyle.js';
import { REVIEW_REP } from '../tycoon/TycoonGame.js';
import { SPECIALTY_BONUS, SPECIALTY_SATISFACTION } from '../employees/Employee.js';
import { clamp } from '../core/math.js';
// Which skill each specialty raises, to highlight it on the card.
const SPECIAL_SKILL = { cut: 'cutting', colour: 'colouring', perm: 'perming' };
import { COMMISSION, BONUS, LEAVE_DAYS, DINNER_PER_HEAD } from '../employees/StaffManager.js';
import { CAMPAIGNS, CHANNELS, INFLUENCER_FEE, INFLUENCER_POSTS } from '../tycoon/Marketing.js';
import { AMENITIES } from '../tycoon/Hospitality.js';
import { starsFor } from '../tycoon/ReviewBoard.js';
import { ReviewRewards, milestoneBase, ratingMultiplier, streakPay } from '../tycoon/ReviewRewards.js';
import { INVESTMENTS, LOANS, MISSION, MAX_SHARE } from '../tycoon/Finance.js';
import { missionWho } from '../tycoon/Missions.js';
import { SYNERGIES } from '../tycoon/Synergies.js';

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const RANK_ORDER = { master: 0, senior: 1, designer: 2, junior: 3 };
const level = v => v >= 70 ? 'bad' : v >= 40 ? 'gold' : 'good';

/** Renders the Staff, Build, Business, Promo, Reviews and Growth pages and routes their button presses. */
export class TycoonUI {
  constructor(game, build, i18n, hooks) { Object.assign(this, { game, build, i18n, hooks }); this.reviewFilter = 'all'; this.reviewLimit = 25; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }

  key(page) {
    const g = this.game, b = this.build.active;
    return [page, this.i18n.lang, g.economy.cash, g.served, Math.floor(g.reputation.value), g.progression.level, g.priceLevel, g.layout.chairs, g.layout.tier, g.layout.branchOpen, Math.round(g.weekRevenue), g.monthReport && g.monthReport.to, g.layout.items.length, b && b.id, g.staff.owner.level, g.staff.owner.experience, g.staff.candidates.map(s => [s.hired, s.level, s.experience, Math.round(s.fatigue / 5), Math.round(s.stress / 5), s.restUntil > this.hooks.now(), this.hooks.hasChair(s)]).join(), g.staff.support.map(s => [s.hired, s.skills.marketing]).join(), 
      g.clock.day, g.nextHours && g.nextHours.join(), this.hooks.filming(), this.hooks.canFilm(), g.marketing.version, g.reviews.version, g.hospitality.version, g.staff.version, g.finance.version, g.rival.version, g.missions.version, g.dayOff, g.synergies.map(x => x.id).join(), g.regulars, this.reviewFilter, this.reviewLimit].join('|');
  }
  render(page) { return { staff: () => this.#staff(), syn: () => this.#synergies(), build: () => this.#build(), biz: () => this.#business(), mkt: () => this.#marketing(), rev: () => this.#reviews(), prog: () => this.#growth() }[page](); }

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
    const times = `${t('staff.times', e.totalMinutes('cut', g.speedFor('cut'), g.processSpeedFor('cut')), e.totalMinutes('colour', g.speedFor('colour'), g.processSpeedFor('colour')), e.totalMinutes('wave', g.speedFor('wave'), g.processSpeedFor('wave')), e.totalMinutes('dry', g.speedFor('dry'), g.processSpeedFor('dry')))}`;
    const r = g.reviews.ratingFor(e.name), perf = e.hired ? `${t('staff.perf', r.count ? '★' + r.average.toFixed(1) : '–', r.count, e.today.earn.toLocaleString(), e.stats.earn.toLocaleString(), e.stats.served)}` : '';
    const special = SPECIAL_SKILL[e.specialty], stats = [['cut', s.cutting, 'cutting'], ['colour', s.colouring, 'colouring'], ['perm', s.perming, 'perming'], ['speed', s.speed, 'speed'], ['service', s.customerService, 'customerService']];
    const rows = [[e.specialty ? 'special' : null, `<span class="gold">${e.specialty ? t('staff.special', t('svc.' + e.specialty), SPECIALTY_BONUS, Math.round(SPECIALTY_SATISFACTION * 100)) : ''}</span>`],
      [owner ? 'scope' : null, t('staff.allround')], [e.perk ? 'perk' : null, `<span class="good">${e.perk ? t('perk.' + e.perk) : ''}</span>`], ['times', times], [e.hired ? 'state' : 'pay', info], [perf ? 'perf' : null, perf], [this.hooks.seatOf(e) >= 0 ? 'seat' : null, this.#seatChips(e)]];
    return `<div class="scard">${this.#cardHead(e, actions)}${this.#statBars(stats.map(([k, v, key]) => [k, v, key === special]))}${this.#rows(rows)}</div>`;
  }
  /** Every team synergy: the ones today's team has first, each with what it needs and what it gives. */
  #synergies() {
    const t = (k, ...a) => this.#t(k, ...a), on = new Set(this.game.synergies.map(s => s.id));
    const rows = [...SYNERGIES].sort((a, b) => on.has(b.id) - on.has(a.id)).map(s => `<div class="syn ${on.has(s.id) ? 'on' : ''}"><div class="brow"><b>${on.has(s.id) ? '✓ ' : ''}${t('syn.' + s.id)}</b><span class="sp"></span><span class="dim">${t('syn.' + s.id + '.need')}</span></div><div>${t('syn.' + s.id + '.effect')}</div></div>`).join('');
    return `<div class="bsec"><h4>${t('syn.title', on.size)}</h4><div class="dim">${t('syn.note')}</div>${rows}</div>`;
  }
  /** Name, grade mark, role and gender, with the action buttons on the right. */
  #cardHead(e, actions) {
    const t = (k, ...a) => this.#t(k, ...a), role = RANK_COLOURS[e.rank] ? `<span style="color:${RANK_COLOURS[e.rank]}">${t('role.' + e.role)}</span>` : `<span class="dim">${t('role.' + e.role)}</span>`;
    return `<div class="brow"><b style="color:${nameColour(e)}">${rankMark(e)}${this.i18n.name(e.name)}</b>${role}${e.gender ? `<span class="dim">${t('gender.' + e.gender)}</span>` : ''}<span class="sp"></span>${actions}</div>`;
  }
  /** Skills as short bars in one line; `hi` marks a specialty. */
  #statBars(list) {
    const t = (k, ...a) => this.#t(k, ...a);
    return `<div class="sk">${list.map(([k, v, hi]) => `<div class="${hi ? 'hi' : ''}"><span>${t('sk.' + k)}</span><b>${v}</b><i style="--v:${clamp(v, 0, 100)}%"></i></div>`).join('')}</div>`;
  }
  /** Numbered chair buttons: pick one to move this stylist there, trading places with whoever sits there. ★ is the VIP room. */
  #seatChips(e) {
    const mine = this.hooks.seatOf(e); if (mine < 0) return '';
    return `<span class="seg seats">${this.hooks.seats().map((s, i) => `<button data-do="seat:${e.id}.${i}" class="${i === mine ? 'sel' : ''}">${s.site ? '2-' : ''}${s.num}${s.vip ? '★' : ''}</button>`).join('')}</span>`;
  }
  /** Label and value rows that line up; rows without a label are left out. */
  #rows(rows) { return `<dl class="kv">${rows.filter(([k]) => k).map(([k, v]) => `<dt>${this.#t('sl.' + k)}</dt><dd>${v}</dd>`).join('')}</dl>`; }
  #supportRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, desk = e.effect === 'reception';
    const course = desk && e.hired ? `<button data-do="mtrain:${e.id}" ${(e.skills.marketing || 0) >= 100 || !g.economy.canAfford(g.staff.marketingCourseCost(e)) ? 'disabled' : ''}>${t('staff.mcourse', g.staff.marketingCourseCost(e))}</button>` : '';
    const action = e.hired ? `${course}<button data-do="sfire:${e.id}">${t('staff.fire')}</button>` : `<button class="go" data-do="shire:${e.id}" ${!g.economy.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.hire', e.hireCost)}</button>`;
    const k = e.skills, stats = desk ? [['speed', k.speed], ['service', k.customerService], ['marketing', k.marketing || 0]] : [['shampoo', k.shampoo], ['cleaning', k.cleaning], ['speed', k.speed], ['service', k.customerService]];
    const effect = desk ? t('support.ruby') : t('staff.aeffect', e.serviceMinutes('shampoo', g.speedFor('shampoo')), this.hooks.sweepMinutes(e.cleaning), (e.washQuality >= .6 ? '+' : '−') + Math.abs(Math.round((e.washQuality - .6) * 25)));
    return `<div class="scard">${this.#cardHead(e, action)}${this.#statBars(stats)}${this.#rows([['about', desk ? t('support.deskRole') : t('support.' + e.id)], ['effect', effect], ['pay', t('staff.wage', e.salary)]])}</div>`;
  }
  #staff() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff;
    const commission = COMMISSION.map((r, i) => `<button data-do="commission:${i}" class="${st.commission === i ? 'sel' : ''}">${Math.round(r * 100)}%</button>`).join('');
    const team = [...st.candidates].sort((a, b) => (b.hired - a.hired) || (RANK_ORDER[a.rank] - RANK_ORDER[b.rank]));
    return `<div class="bsec"><h4>${t('staff.policy')}</h4><div class="brow"><span>${t('staff.commission')}</span><span class="sp"></span><span class="seg">${commission}</span></div>
      <div class="brow"><span>${t('staff.shuffle')}</span><span class="sp"></span><span class="seg"><button data-do="shuffle:0" class="${st.seatShuffle ? '' : 'sel'}">${t('pol.off')}</button><button data-do="shuffle:1" class="${st.seatShuffle ? 'sel' : ''}">${t('pol.on')}</button></span></div><div class="dim">${t('staff.shuffleD')}</div>
      <div class="brow"><span>${t('staff.dinner')}</span><span class="dim">${t('staff.perHead', DINNER_PER_HEAD)}</span><span class="sp"></span><button data-do="dinner" ${!st.hired.length || st.dinnerDay === g.clock.day || !g.economy.canAfford(st.dinnerCost()) ? 'disabled' : ''}>${st.dinnerDay === g.clock.day ? t('staff.dinnerDone') : '$' + st.dinnerCost()}</button></div></div>
      <div class="bsec"><h4>${t('staff.designers')}</h4>${g.isUnlocked('staff') ? '' : `<div class="dim">${t('staff.lock')}</div>`}${[st.owner, ...team].map(e => this.#staffRow(e)).join('')}</div><div class="bsec"><h4>${t('staff.support')}</h4>${st.support.map(e => this.#supportRow(e)).join('')}</div>`;
  }
  #build() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, l = g.layout, active = this.build.active;
    if (active) return `<div>${t('build.placing', t('f.' + active.id))}</div><div class="brow"><button data-do="rot">${t('build.rotate')}</button><button data-do="cancel">${t('build.cancel')}</button></div>`;
    const next = l.nextExpansion;
    const expand = next ? `<button class="go" data-do="expand" ${!g.isUnlocked(next.requires) || !g.economy.canAfford(next.cost) ? 'disabled' : ''}>${g.isUnlocked(next.requires) ? t('build.expandBuy', next.cost) : t('build.lockedAt')}</button>` : `<span class="dim">${t('build.maxed')}</span>`;
    const furniture = FURNITURE_IDS.map(id => { const f = FURNITURE[id], locked = f.requires && !g.isUnlocked(f.requires), full = ![0, ...(l.branchOpen ? [1] : [])].some(s => l.countAt(id, s) < l.maxOf(id, s) && (!f.chairs || l.chairsAt(s) + f.chairs.length <= l.maxChairsAt(s))), small = f.minTier > l.tier; return `<div class="brow"><span>${t('f.' + id)}</span><span class="dim">${t('fd.' + id)}${f.max != null && !small ? ' · ' + t('build.max', l.maxOf(id)) : ''}</span><span class="sp"></span><button class="go" data-do="buy:${id}" ${locked || small || full || !g.economy.canAfford(f.price) ? 'disabled' : ''}>${locked ? t('build.lockedAt') : small ? t('build.size', f.minTier + 1) : '$' + f.price}</button></div>`; }).join('');
    const placed = l.items.length ? l.items.map((it, i) => `<div class="brow"><span>${t('f.' + it.id)}</span><span class="sp"></span>${this.hooks.isQueued(it) ? `<span class="gold">${t('build.moving')}</span>` : ''}<button data-do="move:${i}" ${this.hooks.canMove(it) ? '' : 'disabled'}>${t('build.move')}</button><button data-do="sell:${i}" ${FURNITURE[it.id].essential || !this.hooks.canSell(it) ? 'disabled' : ''}>${t('build.sell', Math.floor(FURNITURE[it.id].price / 2))}</button></div>`).join('') : `<div class="dim">${t('build.none')}</div>`;
    return `<div class="bsec"><h4>${t('build.chairs')}</h4><div class="brow"><span>${l.branchOpen ? t('build.chairLine2', l.chairsAt(0), l.maxChairsAt(0), l.chairsAt(1), l.maxChairsAt(1)) : t('build.chairLine', l.chairsAt(0), l.maxChairsAt(0))}</span><span class="sp"></span><button class="go" data-do="buy:station" ${!g.isUnlocked('chairs') || !l.chairRoom || !g.economy.canAfford(CHAIR_PRICE) ? 'disabled' : ''}>${g.isUnlocked('chairs') ? t('build.chairBuy', CHAIR_PRICE) : t('build.lockedAt')}</button></div><div class="dim">${t('build.chairHint')}</div></div>
    <div class="bsec"><h4>${t('build.expand')}</h4><div class="brow"><span>${t('build.expandLine', l.tier + 1, EXPANSIONS.length + 1)}</span><span class="sp"></span>${expand}</div>${next ? `<div class="dim">${t('build.next.' + l.tier)}</div>` : ''}</div>
    ${this.#branch()}
    <div class="bsec"><h4>${t('build.furniture')}</h4><div class="dim">${t('build.help')}</div>${furniture}</div><div class="bsec"><h4>${t('build.placed')}</h4>${placed}</div>`;
  }
  /** The second salon: what it takes to open, then that it is open. */
  #branch() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, B = g.branchStatus;
    const body = g.layout.branchOpen ? `<div class="good">${t('br.isOpen')}</div><div class="brow"><span class="sp"></span><button data-do="view:1">${t('br.view')}</button></div>`
      : `${B.checks.map(c => `<div class="brow"><span class="${c.ok ? 'good' : 'dim'}">${c.ok ? '✓' : '·'} ${t('br.c.' + c.k, ...c.args)}</span></div>`).join('')}<div class="brow"><span class="dim">${t('br.cost', B.cost.toLocaleString())}</span><span class="sp"></span><button class="go" data-do="openBranch" ${B.ready ? '' : 'disabled'}>${t('br.open')}</button></div>`;
    return `<div class="bsec"><h4>${t('br.title')}</h4>${body}<div class="dim">${t('br.note')}</div></div>`;
  }
  /** This month's revenue goal, how far along it is, and the last monthly settlement. */
  #month() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, m = g.monthProgress, usd = n => '$' + Math.round(n).toLocaleString();
    const goal = m.goal ? `<div class="brow"><span>${t('month.goalNow', usd(m.goal.revenue), usd(m.goal.reward))}</span></div>
      <div class="bar"><div class="tr"><div class="fl" style="width:${Math.round(clamp(m.revenue / m.goal.revenue) * 100)}%;background:${m.revenue >= m.goal.revenue ? '#8fc25a' : '#ffd98a'}"></div></div></div>
      <div class="brow"><span class="dim">${t('month.goalSoFar', usd(m.revenue), Math.round(m.revenue / m.goal.revenue * 100))}</span></div>` : `<div class="dim">${t('month.noGoal')}</div>`;
    const last = g.monthReport ? `<div class="brow"><span class="sp"></span><button data-do="monthView">${t('month.last', g.monthReport.month)}</button></div>` : '';
    return `<div class="bsec"><h4>${t('month.tabTitle', m.month, m.day)}</h4>${goal}<div class="dim">${t('month.goalNote')}</div>${last}</div>`;
  }
  #business() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, e = g.economy, money = n => (n < 0 ? '−$' : '$') + Math.abs(n), line = (k, v) => `<div class="brow"><span>${t(k)}</span><span class="sp"></span><span>${v}</span></div>`;
    const costs = `<div class="bsec"><h4>${t('biz.opTitle')}</h4>${Object.entries(g.operatingCosts.breakdown).map(([k, v]) => line('led.' + k, `$${e.today.expenses[k] || 0} / $${v}`)).join('')}${line('led.materials', '$' + (e.today.expenses.materials || 0))}<div class="dim">${t('biz.opNote')}</div></div>`;
    const rep = g.reputation, prices = (g.isUnlocked('luxury') ? [0, 1, 2, 3] : [0, 1, 2]).map(i => `<button data-do="price:${i}" class="${g.priceLevel === i ? 'sel' : ''}">${t('price.' + i)}</button>`).join('');
    const rows = g.staff.all.filter(s => s.hired).sort((a, b) => b.stats.earn - a.stats.earn), rated = s => { const r = g.reviews.ratingFor(s.name); return r.count ? `★${r.average.toFixed(1)} (${r.count})` : '–'; };
    const hs = g.hospitality, treats = Object.entries(AMENITIES).map(([id, a]) => `<div class="brow"><span>${t('hs.' + id)}</span><span class="dim">${t('hs.cost', a.cost)}</span><span class="sp"></span>${hs.available(id) ? `<span class="seg"><button data-do="amen:${id}" class="${hs.isOffered(id) ? 'sel' : ''}">${t('hs.on')}</button><button data-do="amen:${id}" class="${hs.isOffered(id) ? '' : 'sel'}">${t('hs.off')}</button></span>` : `<span class="dim">${t('hs.needs', t('f.' + a.needs))}</span>`}</div>`).join('');
    return `<div class="bsec"><h4>${t('biz.finance')}</h4>${line('biz.cash', money(e.cash))}${line('biz.rev', money(e.dailyRevenue))}${line('biz.exp', money(-e.dailyOperatingCost))}${line('biz.profit', money(e.dailyProfit))}${e.dailyInvestment ? line('biz.invest', money(-e.dailyInvestment)) : ''}${line('biz.total', g.served)}${line('biz.sat', g.served ? Math.round(g.averageSatisfaction * 100) + '%' : '–')}${line('biz.rep', rep.starText + ' ' + Math.floor(rep.value))}${line('biz.comfort', g.comfort)}${line('biz.regulars', g.regulars)}</div>${this.#month()}${costs}${this.#funding()}
    ${this.#demand()}
    <div class="bsec"><h4>${t('hours.title')}</h4>${this.#hours()}<div class="dim">${t('hours.note')}</div></div>
    <div class="bsec"><h4>${t('biz.price')}</h4>${g.isUnlocked('pricing') ? `<div class="seg">${prices}</div><div class="dim">${t('price.h')}</div>` : `<div class="dim">${t('biz.lockPrice')}</div>`}</div>${this.#rival()}
    <div class="bsec"><h4>${t('hs.title')}</h4>${treats}<div class="brow"><span>${t('hs.floor')}</span><span class="sp"></span><b class="${hs.floor ? 'good' : 'dim'}">${hs.floor ? t('hs.floorV', Math.round(hs.floor * 100), starsFor(hs.floor)) : t('hs.none')}</b></div><div class="dim">${t('hs.what')}</div></div>
    <div class="bsec"><h4>${t('biz.ladder')}</h4><table class="lad"><tr><th>#</th><th>${t('lad.stylist')}</th><th>${t('lad.done')}</th><th>${t('lad.avg')}</th><th>${t('lad.rating')}</th><th>${t('lad.today')}</th><th>${t('lad.earn')}</th></tr>${rows.map((s, i) => `<tr><td>${i + 1}</td><td style="color:${nameColour(s)}">${rankMark(s)}${this.i18n.name(s.name)}</td><td>${s.stats.served}</td><td>${s.stats.served ? Math.round(s.stats.sum / s.stats.served * 100) + '%' : '–'}</td><td>${rated(s)}</td><td>$${s.today.earn.toLocaleString()}</td><td>$${s.stats.earn.toLocaleString()}</td></tr>`).join('')}</table></div>`;
  }
  /** Where today's clients come from. */
  #demand() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, { add, mult } = g.demandParts, f1 = v => (Math.round(v * 10) / 10).toString(), x = v => '×' + (Math.round(v * 100) / 100);
    const rows = Object.entries(add).filter(([k]) => k !== 'branch' || g.layout.branchOpen).map(([k, v]) => `<div class="brow"><span>${t('demand.' + k)}</span><span class="sp"></span><span>${f1(v)}</span></div>`).join('');
    const today = Math.round(g.dailyDemand * g.clock.hours / 8);
    return `<div class="bsec"><h4>${t('demand.title')}</h4>${rows}<div class="dim">${t('demand.mult', x(mult.price), x(mult.marketing), x(mult.reviews), x(mult.rival))}${mult.award > 1 ? ' · ' + t('demand.award', x(mult.award)) : ''}</div><div class="brow"><span>${t('demand.total', g.clock.hours)}</span><span class="sp"></span><b class="gold">${t('demand.people', today)}</b></div></div>`;
  }
  /** Steppers for tomorrow's opening and closing hours. */
  #hours() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, [o, c] = g.plannedHours;
    const step = (w, s) => `<button data-do="hrs:${w}${s > 0 ? '+' : '-'}" ${g.canShiftHours(w === 'o' ? 0 : 1, s) ? '' : 'disabled'}>${s > 0 ? '+' : '−'}</button>`;
    const now = `${g.clock.openHour}:00–${g.clock.closeHour}:00`;
    return `<div class="brow"><span>${t('hours.open')}</span><span class="sp"></span>${step('o', -1)}<b style="min-width:52px;text-align:center">${o}:00</b>${step('o', 1)}</div>
      <div class="brow"><span>${t('hours.close')}</span><span class="sp"></span>${step('c', -1)}<b style="min-width:52px;text-align:center">${c}:00</b>${step('c', 1)}</div>
      <div class="brow"><span>${t('hours.today', now)}</span><span class="sp"></span><span class="${g.nextHours ? 'gold' : 'dim'}">${g.nextHours ? t('hours.tomorrow', o, c, c - o) : t('hours.length', c - o)}</span></div>`;
  }
  #funding() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, f = g.finance, cash = g.economy, lv = g.progression.level, day = g.clock.day, value = g.valuation;
    const pct = v => (Math.round(v * 1000) / 10).toString(), usd = v => '$' + Math.round(v).toLocaleString(), bar = (k, cls = '') => `<div class="meter ${cls}"><i style="width:${Math.round(Math.min(1, Math.max(0, k)) * 100)}%"></i></div>`;
    // what the salon is worth, part by part
    const parts = g.valuationParts.map(([k, n, v]) => `<div class="brow"><span class="dim">${t('fin.vp.' + k, n.toLocaleString())}</span><span class="sp"></span><span>${usd(v)}</span></div>`).join('');
    const valueSec = `<div class="bsec"><h4>${t('fin.valueTitle')}</h4>${parts}<div class="brow"><span>${t('fin.value')}</span><span class="sp"></span><b class="gold">${usd(value)}</b></div><div class="dim">${t('fin.valueNote')}</div></div>`;
    // who owns the salon, and what Shawn takes
    const lia = 1 - f.investorShare;
    const own = `<div class="brow"><span style="color:#ff9fc4">${t('fin.lia', pct(lia))}</span><span class="sp"></span><span style="color:#8fd0ff">${t('fin.shawn', pct(f.investorShare))}</span></div><div class="own"><i style="width:${lia * 100}%"></i></div>`
      + (f.investorShare ? `<div class="dim">${t('fin.divNote', pct(f.investorShare), f.dividendsPaid.toLocaleString())}</div><div class="brow"><span class="sp"></span><button data-do="buyback" ${cash.canAfford(f.buybackPrice(value)) ? '' : 'disabled'}>${t('fin.buyback5', f.buybackPrice(value).toLocaleString())}</button></div>` : `<div class="dim">${t('fin.noShare')}</div>`);
    const mission = f.target ? `<div class="brow"><span class="gold">${t('fin.missionNow', f.target.progress.toLocaleString(), f.target.need.toLocaleString(), Math.max(0, f.target.due - day))}</span></div>${bar(f.target.progress / f.target.need, 'gold')}` : '';
    const wait = f.roundWait(day), note = f.target ? t('fin.busy') : wait ? t('fin.wait', wait) : '';
    const offers = INVESTMENTS.map((o, i) => `<div class="offer"><div class="brow"><b>${t('fin.get', usd(o.amount))}</b><span class="sp"></span>${lv < o.level ? `<span class="dim">${t('build.lockedAt')}</span>` : `<button class="go" data-do="invest:${i}" ${f.canInvest(i, lv, value, day) ? '' : 'disabled'}>${t('fin.accept')}</button>`}</div><div class="dim">${f.investorShare + f.shareFor(o.amount, value) > MAX_SHARE + 1e-9 ? t('fin.overCap', Math.round(MAX_SHARE * 100)) : t('fin.offerLine', pct(f.shareFor(o.amount, value)), usd(f.missionFor(o.amount)))}</div></div>`).join('');
    const ceoSec = `<div class="bsec"><h4>${t('fin.ceoTitle')}</h4><div class="dim">${t('fin.ceo')}</div>${own}${mission}<div class="dim" style="margin:4px 0">${t('fin.mission', MISSION.days, MISSION.multiple, Math.round(MISSION.reward * 100), Math.round(MISSION.penalty * 100))}</div>${offers}${note ? `<div class="dim">${note}</div>` : ''}</div>`;
    // the bank
    const L = f.loan, loanSec = L ? `<div class="offer"><div class="brow"><span>${t('fin.loanLeft', usd(L.principal))}</span><span class="sp"></span><button data-do="repay" ${cash.canAfford(L.principal) ? '' : 'disabled'}>${t('fin.repay2', usd(L.principal))}</button></div><div class="dim">${t('fin.loanNow2', usd(f.interestDue), usd(Math.min(L.perDay, L.principal)), L.daysLeft, pct(L.rate))}</div></div>`
      : LOANS.map((l, i) => { const k = f.loanTerms(i); return `<div class="offer"><div class="brow"><b>${t('fin.borrowAmt', usd(k.amount))}</b><span class="sp"></span><button data-do="loan:${i}">${t('fin.borrow')}</button></div><div class="dim">${t('fin.loanOffer2', k.days, pct(k.rate), usd(k.perDay), usd(k.interest))}</div></div>`; }).join('');
    const bankSec = `<div class="bsec"><h4>${t('fin.bank')}</h4><div class="dim">${t('fin.bankNote')}</div>${loanSec}</div>`;
    return valueSec + ceoSec + bankSec;
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
    const influencer = !g.isUnlocked('influencer') ? `<span class="dim">${t('build.lockedAt')}</span>` : !desk.hired ? `<span class="dim">${t('mk.needDesk')}</span>` : m.influencerBooked ? `<span class="good">${t('mk.infBooked', m.booked.followers.toLocaleString())}</span>` : `<button class="go" data-do="influencer" ${m.canBookInfluencer(day) ? '' : 'disabled'}>${t('mk.infBook')}</button>`;
    const buzz = m.active.filter(a => !CAMPAIGNS[a.id]).map(a => `<div class="brow"><span class="gold">${t('mk.buzz.' + a.id)}</span><span class="sp"></span><span class="dim">${t('mk.running', a.daysLeft)}</span></div>`).join('');
    const manager = (desk.hired ? t('mk.manager', this.i18n.name(desk.name), desk.skills.marketing || 0) : t('mk.managerSelf', this.i18n.name(g.staff.owner.name))) + (this.hooks.filming() ? ' · ' + t('mk.filmingNow') : '');
    return `<div class="bsec"><h4>${t('mk.sns')}</h4><div class="brow"><span>${t('mk.followers')}</span><span class="sp"></span><b>${m.followers.toLocaleString()}</b></div><div class="dim">${manager}</div>${Object.keys(CHANNELS).map(channel).join('')}${buzz}</div>
      <div class="bsec"><h4>${t('mk.ads')}</h4>${campaign('flyers')}${campaign('instaAd')}<div class="brow"><span>${t('mk.influencer')}</span><span class="dim">${t('mk.infNote', INFLUENCER_FEE)}</span><span class="sp"></span>${influencer}</div><div class="dim">${INFLUENCER_POSTS.map(p => t('mk.infTier.' + p.tier, p.min.toLocaleString(), Math.round(p.demand * 100), p.days, Math.abs(p.rep))).join('<br>')}</div></div>`;
  }
  /** Review milestones and the 5-star streak: where they stand and exactly what the next one pays. */
  #reviewRewards() {
    const t = (k, ...a) => this.#t(k, ...a), rv = this.game.reviews, R = this.game.reviewRewards, every = ReviewRewards.streakEvery;
    const n = ReviewRewards.countOf(rv), base = milestoneBase(R.next), mult = ratingMultiplier(rv.rating);
    const nextStreak = (Math.floor(R.streak / every) + 1) * every;
    return `<div class="bsec"><h4>${t('rv.bonusTitle')}</h4>
      <div class="brow"><span>${t('rv.next', R.next, n)}</span></div>
      <div class="bar"><div class="tr"><div class="fl" style="width:${Math.round(clamp(n / R.next) * 100)}%;background:#ffd98a"></div></div></div>
      <div class="brow"><span class="dim">${rv.count ? t('rv.nextPay', base.toLocaleString(), mult.toFixed(2), Math.round(base * mult).toLocaleString()) : t('rv.nextPayNone', base.toLocaleString())}</span></div>
      <div class="dim">${t('rv.multNote')}</div>
      <div class="brow"><span>${t('rv.streak', R.streak, R.best)}</span><span class="sp"></span><span class="gold">${t('rv.streakNext', nextStreak, streakPay(nextStreak).toLocaleString())}</span></div>
      <div class="dim">${t('rv.streakNote')}</div></div>`;
  }
  #reviews() {
    const t = (k, ...a) => this.#t(k, ...a), rv = this.game.reviews, f = this.reviewFilter, name = n => this.i18n.name(n);
    rv.markRead();
    const dist = [5, 4, 3, 2, 1].map(s => { const n = rv.visible.filter(r => r.stars === s).length; return `<div class="bar"><span>${s}★</span><div class="tr"><div class="fl" style="width:${rv.count ? Math.round(n / rv.count * 100) : 0}%;background:#ffd98a"></div></div><b>${n}</b></div>`; }).join('');
    const shown = rv.list.filter(r => f === 'todo' ? !r.replied && !r.removed : f === 'low' ? r.stars <= 2 && !r.removed : true);
    const page = shown.slice(0, this.reviewLimit), more = shown.length > page.length ? `<button data-do="rvmore">${t('rv.more', shown.length - page.length)}</button>` : '';
    const visit = v => v ? ` · ${v.stylist ? name(v.stylist) + ' · ' : ''}${t('rvs.' + v.service)}` : '';
    const who = r => t(r.byRole === 'desk' ? 'rv.by.desk' : 'rv.by.owner', name(r.by || this.game.staff.owner.name));
    const actions = r => r.replied ? `<div class="reply">↳ ${t('rv.reply.' + r.replied, who(r))}</div>` : `<div class="brow">${r.stars >= 4 ? `<button data-do="reply:${r.id}.thanks">${t('rv.thanks')}</button>` : `<button data-do="reply:${r.id}.apology">${t('rv.apology')}</button><button data-do="reply:${r.id}.report">${t('rv.report')}</button>`}</div>`;
    const row = r => r.removed ? `<div class="rv dim">${t(r.villain ? 'rv.removedAbuse' : 'rv.removedNote', name(r.author))}</div>` : `<div class="rv"><div class="brow"><b>${name(r.author)}</b><span class="gold">${stars(r.stars)}</span><span class="dim">${t('rv.day', r.day)}${visit(r.visit)}${r.edited ? ' · ' + t('rv.edited') : ''}</span></div><div>${t('rv.' + r.key, ...r.args.map(name))}</div>${actions(r)}</div>`;
    const filters = ['all', 'todo', 'low'].map(k => `<button data-do="rvf:${k}" class="${f === k ? 'sel' : ''}">${t('rv.f.' + k)}</button>`).join('');
    const mgr = this.game.reviewManager, auto = this.game.staff.receptionist.hired ? `<button data-do="autoreply" class="${rv.autoReply ? 'sel' : ''}">${t(rv.autoReply ? 'rv.autoOn' : 'rv.autoOff')}</button>` : '';
    return `<div class="bsec"><h4>${t('rv.title')}</h4><div class="brow"><span class="dim">${t('rv.manager', t(mgr.role === 'desk' ? 'rv.by.desk' : 'rv.by.owner', name(mgr.name)))}</span><span class="sp"></span>${auto}</div><div class="dim">${t('rv.weightNote')} ${t('rv.repNote', [5, 4, 3, 2, 1].map(n => `★${n} ${REVIEW_REP[n] > 0 ? '+' : REVIEW_REP[n] < 0 ? '−' : ''}${Math.abs(REVIEW_REP[n])}`).join(' · '))}</div><div class="brow"><b class="gold">${rv.count ? '★ ' + rv.rating.toFixed(1) : '–'}</b><span class="dim">${t('rv.count', rv.count)}</span></div>${dist}</div>
      ${this.#reviewRewards()}
      <div class="bsec"><div class="seg" style="margin-bottom:4px">${filters}</div>${page.length ? page.map(row).join('') + more : `<div class="dim">${t('rv.none')}</div>`}</div>`;
  }
  /** Side missions: three requests at a time, each with its progress, bonus and a line from whoever asks. */
  #missions() {
    const t = (k, ...a) => this.#t(k, ...a), M = this.game.missions;
    const cards = M.open.map((m, i) => {
      const done = m.progress >= m.goal, who = missionWho(m.kind), f = v => m.kind === 'revenue' ? '$' + Math.round(v).toLocaleString() : Math.round(v).toLocaleString();
      return `<div class="mcard ${done ? 'done' : ''}"><div class="brow"><b class="mt">${t('ms.t.' + m.kind)}</b><span class="sp"></span>${done ? `<button class="go" data-do="claim:${i}">${t('ms.claim', m.reward)}</button>` : `<span class="gold">${t('ms.reward', m.reward)}</span>`}</div>`
        + `<div>${t('ms.' + m.kind, f(m.goal))}</div><div class="meter ${done ? 'gold' : ''}"><i style="width:${Math.round(m.progress / m.goal * 100)}%"></i></div>`
        + `<div class="dim">${done ? `<span class="gold">${t('ms.stamp')}</span>` : `${f(m.progress)} / ${f(m.goal)}`}</div>`
        + `<div class="say ${who}"><b>${t('ms.who.' + who)}</b> ${t('ms.l.' + m.kind + '.' + (m.line || 0))}</div></div>`;
    }).join('');
    return `<div class="bsec"><h4>${t('ms.title')}</h4><div class="dim">${t('ms.note')}</div>${cards}<div class="dim">${t('ms.total', M.earned.toLocaleString(), M.done)}</div></div>`;
  }
  #growth() {
    const t = (k, ...a) => this.#t(k, ...a), p = this.game.progression, next = p.next, ctx = this.game.context;
    return this.#missions() + `<div class="bsec"><h4>${t('prog.current', p.level, t('lv.' + p.level))}</h4><div>${next ? t('prog.next', t('goal.' + next.level, ...next.goal(ctx))) : t('prog.max')}</div></div><div class="bsec"><h4>${t('prog.unlocks')}</h4>${p.all.map(l => `<div class="brow"><span class="${l.level <= p.level ? 'good' : 'dim'}">${l.level <= p.level ? '✓' : '·'} ${l.level}. ${t('lv.' + l.level)}</span><span class="sp"></span><span class="dim">${l.unlocks.map(u => t('u.' + u)).join(', ')}</span></div>`).join('')}</div>`;
  }

  handle(action, value) {
    const g = this.game, e = g.staff.find(value);
    const run = {
      hire: () => this.hooks.hire(e), fire: () => this.hooks.fire(e),
      shire: () => { if (g.staff.hire(e)) this.hooks.syncSupport(); }, sfire: () => { if (g.staff.fire(e)) this.hooks.syncSupport(); }, train: () => { if (g.trainStaff(e)) g.bus.emit('staff:levelup', e); }, claim: () => { if (g.claimMission(+value)) this.hooks.spent(); },
      rest: () => { e.restUntil = this.hooks.now() + 20; e.rest(50); },
      price: () => { g.priceLevel = +value; }, openBranch: () => this.hooks.openBranch(), monthView: () => this.hooks.openMonth(), view: () => this.hooks.viewSite(+value),
      expand: () => { if (g.expand()) this.hooks.expanded(); },
      buy: () => this.build.start(value), move: () => { const it = g.layout.items[+value]; this.build.start(it.id, it); },
      sell: () => this.build.sell(g.layout.items[+value]), rot: () => this.build.rotate(), cancel: () => this.build.cancel(),
      post: () => this.hooks.post(value), campaign: () => { if (g.runCampaign(value)) this.hooks.spent(); }, influencer: () => { if (g.staff.receptionist.hired) g.marketing.bookInfluencer(g.clock.day); },
      reply: () => { const [id, kind] = value.split('.'); this.hooks.reply(+id, kind); }, rvf: () => { this.reviewFilter = value; this.reviewLimit = 25; }, rvmore: () => { this.reviewLimit += 25; },
      amen: () => g.hospitality.toggle(value), autoreply: () => { g.reviews.autoReply = !g.reviews.autoReply; g.reviews.version++; }, hrs: () => g.shiftHours(value[0] === 'o' ? 0 : 1, value[1] === '+' ? 1 : -1),
      commission: () => g.staff.setCommission(+value), shuffle: () => g.staff.setSeatShuffle(value === '1'),
      seat: () => { const [id, i] = value.split('.'), who = id === 'owner' ? g.staff.owner : g.staff.find(id); if (who) this.hooks.moveSeat(who, +i); }, dinner: () => { if (g.staff.teamDinner(g.clock.day)) this.hooks.spent(); },
      bonus: () => { if (g.staff.giveBonus(e)) this.hooks.spent(); }, leave: () => g.staff.sendOnLeave(e, g.clock.day), mtrain: () => { if (g.staff.trainMarketing(e)) this.hooks.spent(); },
      invest: () => { if (g.investIn(+value)) this.hooks.spent(); }, buyback: () => { if (g.buyBackStake()) this.hooks.spent(); },
      loan: () => { if (g.finance.takeLoan(+value)) this.hooks.spent(); }, repay: () => g.finance.repayLoan(),
    }[action];
    if (run) run();
  }
}
