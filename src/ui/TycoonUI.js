import { NetworkPanel } from './NetworkPanel.js';
import { DepartmentsPanel } from './DepartmentsPanel.js';
import { FURNITURE, FURNITURE_IDS, CHAIR_PRICE, EXPANSIONS, CATEGORIES, categoryOf } from '../building/FurnitureCatalog.js';
import { REACH, reachKind } from '../building/Surroundings.js';
import { REP_CEILING } from '../tycoon/Reputation.js';
import { INTERIOR_SETS, SET_SPAN } from '../building/InteriorSets.js';
import { BOOK_GROUPS, STYLE_BOOK_SIZE, MILESTONES, PERFECT, SIGNATURE, SIGNATURE_PAY } from '../tycoon/StyleBook.js';
import { siteOf } from '../building/SalonLayout.js';
import { nameColour, rankMark, RANK_COLOURS } from './nameStyle.js';
import { portraitURL, crownURL } from './Portrait.js';
import { REVIEW_REP, PRICE_MULTIPLIER, LAST_CALLS, CLOSING, REBOOK_ACCEPT, TO_RIVAL, DESK_PLAN } from '../tycoon/TycoonGame.js';
import { SPECIALTY_BONUS, SPECIALTY_SATISFACTION, GRUDGE_PENALTY, TALENT_LEVELS } from '../employees/Employee.js';
import { clamp } from '../core/math.js';
// Which skill each specialty raises, to highlight it on the card.
const SPECIAL_SKILL = { cut: 'cutting', colour: 'colouring', perm: 'perming' };
import { COMMISSION, BONUS, LEAVE_DAYS, DINNER_PER_HEAD, RESIGN_STRESS } from '../employees/StaffManager.js';
import { PROGRAMMES, WELFARE_IDS, TALK_EVERY, TALK_RELIEF } from '../employees/Welfare.js';
import { MGMT } from '../employees/Management.js';
import { TRAITS } from '../employees/Traits.js';
import { PROMOTION, PROMO_PAY, PROMO_RELIEF, PROMO_LOYALTY, CERTS, promotionStatus, hasCert } from '../employees/Career.js';
import { CAMPAIGNS, CHANNELS, INFLUENCER_FEE, INFLUENCER_POSTS, HAIR_SHOW, AGENCY } from '../tycoon/Marketing.js';
import { AMENITIES } from '../tycoon/Hospitality.js';
import { starsFor } from '../tycoon/ReviewBoard.js';
import { dateOf, seasonOf, eventsOn, nextEvent, SEASONS } from '../tycoon/Calendar.js';
import { WEATHER, SURPRISES } from '../tycoon/Weather.js';
import { ReviewRewards, milestoneBase, ratingMultiplier, streakPay } from '../tycoon/ReviewRewards.js';
import { INVESTMENTS, LOANS, MISSION, MAX_SHARE } from '../tycoon/Finance.js';
import { missionWho } from '../tycoon/Missions.js';
import { SYNERGIES } from '../tycoon/Synergies.js';
import { shows, featuresAt } from '../tycoon/Features.js';
import { CONTESTS, CONCEPTS, baseScore } from '../tycoon/Contests.js';
import { ORDERS, TRUST, HQ_GAP, HQ_GAP_INVESTED } from '../tycoon/Headquarters.js';
import { SPY } from '../tycoon/RivalSpy.js';
import { PRODUCT_TYPES, LINES, QUALITY, DESK, ONLINE, BATCHES, DEALS } from '../tycoon/Brand.js';
import { FOOTING, MATCH_PRICE, MATCH_BLUNTS, SCOUT_LEVEL, REOPEN_DAYS } from '../tycoon/Rival.js';
import { CUTS, PERMS, TREND_COLOURS, GRADE_PAY, TREND_PAY, TREND_PERK_SATISFACTION, COLOUR_PRICE, TREND_COLOUR_PRICE, BLEACH_PRICE, isHot } from '../hair/StyleMenu.js';
import { WANT } from '../customers/catalog.js';
import { WANT_KO } from '../i18n/strings.js';
import { STORIES, MAX_HEARTS, BOOK_SIZE, HEART_UP, HEART_DOWN, HEART_FRIEND, FRIEND_CHANCE, HEART_LOYAL, LOYAL_PAY, FAVOURITE_SATISFACTION, OCCASION_PAY, OCCASION_NEED, OCCASION_HEARTS, CHAPTER_VISITS, STORY_GIFT, STORY_REWARDS, CHAPTER_DAYS } from '../tycoon/Regulars.js';
import { SPECIALS, SPECIAL_CHANCE, SPECIAL_LEVEL, SPECIAL_FAIL_REP, SPECIAL_PRICE, SPECIAL_PATIENCE } from '../tycoon/SpecialClients.js';

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const SPEC_STYLE = { cut: 'CutSpecialist', colour: 'ColourSpecialist', perm: 'PermSpecialist' };
const level = v => v >= 70 ? 'bad' : v >= 40 ? 'gold' : 'good';

/** Renders the Staff, Build, Business, Promo, Reviews and Growth pages and routes their button presses. */
export class TycoonUI {
  constructor(game, build, i18n, hooks) { Object.assign(this, { game, build, i18n, hooks }); this.departmentsPanel = new DepartmentsPanel(game, i18n); this.networkPanel = new NetworkPanel(game, i18n); this.reviewFilter = 'all'; this.reviewLimit = 25; this.staffPage = 'team'; this.progPage = 'grow'; this.staffRole = 'all'; this.staffSpec = 'all'; this.staffPerk = 'all'; this.bizPage = 'money'; this.bizSub = { money: 'today', fund: 'value', ops: 'demand' }; this.ladderSort = 'earn'; this.clientPage = 'reviews'; this.mktPage = 'promo'; this.concept = 'classic'; this.line = 'signature'; this.buildPage = 'shop'; this.shopCat = 'service'; this.ownedCat = 'all'; }
  #t(k, ...a) { return this.i18n.t(k, ...a); }

  key(page) {
    const g = this.game, b = this.build.active;
    return [page, g.network.version, this.hooks.canLead?.(), g.departments.version, page === 'staff' && this.staffPage === 'parts' ? Math.floor(g.clock.hour * 6) : 0, this.i18n.lang, g.economy.cash, g.served, Math.floor(g.reputation.value), g.progression.level, g.priceLevel, g.layout.chairs, g.layout.tier, g.layout.branchOpen, g.layout.branchTier, Math.round(g.weekRevenue), g.monthReport && g.monthReport.to, g.layout.items.length, b && b.id, g.staff.owner.level, g.staff.owner.experience, g.staff.candidates.map(s => [s.hired, s.level, s.experience, Math.round(s.fatigue / 5), Math.round(s.stress / 5), s.restUntil > this.hooks.now(), this.hooks.hasChair(s)]).join(), g.staff.support.map(s => [s.hired, s.skills.marketing]).join(),
      g.clock.day, g.nextHours && g.nextHours.join(), g.lastCall, g.closingPolicy, g.spy.version, g.hq.version, this.hooks.filming(), this.hooks.canFilm(), g.marketing.version, g.reviews.version, g.hospitality.version, g.staff.version, g.finance.version, g.rival.version, g.missions.version, g.dayOff, g.weather, g.surprise && g.surprise.state, g.synergies.map(x => x.id).join(), g.regulars, this.reviewFilter, this.reviewLimit, this.staffPage, this.progPage, g.book.version, this.staffRole, this.staffSpec, this.staffPerk, this.bizPage, Object.values(this.bizSub).join(), this.ladderSort, this.clientPage, this.mktPage, this.concept, this.line, g.brand.version, g.contest && [g.contest.entrant, g.contest.result && g.contest.result.place].join(), g.matchUntil, this.buildPage, this.shopCat, this.ownedCat, g.layout.items.map(it => it.id).join(), g.regularBook.version, g.special && g.special.state, g.specialLog.length].join('|');
  }
  render(page) { return { staff: () => this.#staff(), syn: () => this.#synergies(), build: () => this.#build(), biz: () => this.#business(), mkt: () => this.#mktPages(), rev: () => this.#clients(), prog: () => this.#progress() }[page](); }

  #status(e) {
    const t = (k, ...a) => this.#t(k, ...a), day = this.game.clock.day, tags = [];
    if (e.onLeave(day)) tags.push(`<span class="gold">${t('st2.leave', e.leaveTo)}</span>`);
    else if (e.leaveBooked(day)) tags.push(`<span class="gold">${t('st2.leaveSoon')}</span>`);
    else if (!this.hooks.hasChair(e)) tags.push(`<span class="dim">${t('st2.bench')}</span>`);
    if (e.settling) tags.push(`<span class="dim">${t('st2.settling')}</span>`);
    if (e.grudge > 0) tags.push(`<span class="bad">${t('st2.grudge', e.grudge, GRUDGE_PENALTY)}</span>`);
    if (e.raises) tags.push(`<span class="dim">${t('st2.raised', e.raises)}</span>`);
    return tags.join(' ');
  }
  #staffRow(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, s = e.effectiveSkills, owner = e === g.staff.owner, now = this.hooks.now(), day = g.clock.day, cash = g.economy;
    let actions = '';
    if (!owner && e.hired) actions = `<button data-do="talk:${e.id}" ${g.staff.canTalk(e, day) ? '' : 'disabled'}>${t('wf.talk')}</button><button data-do="train:${e.id}" ${!cash.canAfford(g.staff.trainingCostFor(e)) || !e.canTrain || !g.isUnlocked('training') ? 'disabled' : ''}>${t('staff.train', g.staff.trainingCostFor(e))}</button><button data-do="bonus:${e.id}" ${cash.canAfford(BONUS) ? '' : 'disabled'}>${t('staff.bonus', BONUS)}</button><button data-do="leave:${e.id}" ${e.leaveBooked(day) ? 'disabled' : ''}>${t('staff.leave', LEAVE_DAYS)}</button><button data-do="rest:${e.id}" ${e.restUntil > now || e.onLeave(day) ? 'disabled' : ''}>${t(e.restUntil > now ? 'staff.resting' : 'staff.rest')}</button><button data-do="fire:${e.id}">${t('staff.fire')}</button>`;
    if (!e.hired) {
      const locked = !g.isUnlocked('staff') || (e.unlock && !g.isUnlocked(e.unlock)), seat = this.hooks.hasOpenChair();
      actions = locked ? `<span class="dim">${t('build.lockedAt')}</span>` : `${seat ? '' : `<span class="dim">${t('staff.noChair')}</span>`}<button class="go" data-do="hire:${e.id}" ${!seat || !cash.canAfford(e.hireCost) ? 'disabled' : ''}>${t('staff.hire', e.hireCost)}</button>`;
    }
    const info = owner ? t('staff.ownerLv', e.level, e.experience, e.experienceToNext) + ' · ' + t('staff.you')
      : e.hired ? `${t('staff.pay', e.level, e.salary, Math.round(e.fatigue), e.experience, e.experienceToNext)} · <span class="${level(e.stress)}">${t('staff.stress', Math.round(e.stress))}</span> ${this.#status(e)}` : t('staff.wage', e.salary);
    const seat = this.hooks.seatOf(e), at = seat >= 0 ? this.hooks.seats()[seat].site : 0, mins = k => e.totalMinutes(k, g.speedFor(k, at), g.processSpeedFor(k));
    const grade = g.gradeOf(e), times = `${t('staff.times', mins('cut'), mins('colour'), mins('wave'), mins('dry'))} · <span class="gold">${t('grade.pay', t('grade.' + grade), GRADE_PAY[grade])}</span>`;
    const r = g.reviews.ratingFor(e.name), perf = e.hired ? `${t('staff.perf', r.count ? '★' + r.average.toFixed(1) : '–', r.count, e.today.earn.toLocaleString(), e.stats.earn.toLocaleString(), e.stats.served)}` : '';
    const special = SPECIAL_SKILL[e.specialty], stats = [['cut', s.cutting, 'cutting'], ['colour', s.colouring, 'colouring'], ['perm', s.perming, 'perming'], ['speed', s.speed, 'speed'], ['service', s.customerService, 'customerService'], ...(owner ? [['manage', Math.floor(g.staff.management), 'management']] : [])];
    const rows = [[e.specialty ? 'special' : null, `<span class="gold">${e.specialty ? t('staff.special', t('svc.' + e.specialty), SPECIALTY_BONUS, Math.round(SPECIALTY_SATISFACTION * 100)) : ''}</span>`],
      [owner ? 'scope' : null, t('staff.allround')], [e.perk || e.id !== 'owner' ? 'perk' : null, `<span class="good">${e.allPerks.map(p => t('perk.' + p)).join('<br>')}</span>${e.id !== 'owner' && e.allPerks.length < 3 && TALENT_LEVELS.some(l => l > e.level) ? `<div class="dim">${t('talent.next', TALENT_LEVELS.find(l => l > e.level))}</div>` : ''}`], ['times', times], [e.hired ? 'state' : 'pay', info], [owner ? 'mgmt' : null, owner ? this.#mgmt() : ''], [e.hired && !owner ? 'risk' : null, e.hired && !owner ? this.#risk(e) : ''], [e.hired && !owner ? 'rel' : null, e.hired && !owner ? this.#bonds(e) : ''], [perf ? 'perf' : null, perf], [this.hooks.seatOf(e) >= 0 ? 'seat' : null, this.#seatChips(e)]];
    return `<div class="scard r-${this.#kind(e)}">${this.#cardHead(e, actions)}${this.#statBars(stats.map(([k, v, key]) => [k, v, key === special]))}${this.#rows(rows)}</div>`;
  }
  /** Lia's management: what it does now, how it grows, and a course to raise it. */
  #mgmt() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff, m = st.mgmt, day = g.clock.day, wait = MGMT.study.every - (day - st.lastStudy);
    const btn = st.management >= MGMT.max ? '' : `<button data-do="study" ${st.canStudy(day) && g.economy.canAfford(MGMT.study.cost) ? '' : 'disabled'}>${st.canStudy(day) ? t('mgmt.study', MGMT.study.cost.toLocaleString(), MGMT.study.gain) : t('mgmt.wait', wait)}</button>`;
    return `<span class="gold">${t('mgmt.row', Math.floor(st.management), m.teamStress, m.talk, Math.round(m.persuade * 100), Math.round(m.costs * 100))}</span> ${btn}<div class="dim">${t('mgmt.how')}</div>`;
  }
  /** A stylist's closest friend and worst rival on the team. */
  #bonds(e) { const t = (k, ...a) => this.#t(k, ...a), { friend, rival } = this.game.staff.friendsOf(e), n = x => this.i18n.name(x[0].name); return [friend ? `<span class="good">♥ ${n(friend)} ${Math.round(friend[1])}</span>` : '', rival ? `<span class="bad">⚡ ${n(rival)} ${Math.round(rival[1])}</span>` : ''].filter(Boolean).join(' · ') || `<span class="dim">${t('rel.none')}</span>`; }
  /** Careers: each stylist's way to the next grade, the promotion when it is earned, and the certificate courses. */
  #careers() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff, pct = v => Math.round(v * 100);
    const certInfo = id => { const c = CERTS[id]; return c.skill ? t('certd.skill', t('sk.' + { cutting: 'cut', colouring: 'colour', perming: 'perm', customerService: 'service' }[c.skill]), c.plus) + (c.satisfaction ? ' · ' + t('certd.sat', t('svc2.' + c.service), pct(c.satisfaction)) : '') : t('certd.' + id, pct(c.treatment || c.occasion || 0)); };
    const legend = `<div class="dim">${t('car.note', Math.round((PROMO_PAY - 1) * 100), PROMO_RELIEF, PROMO_LOYALTY)}</div><div class="dim">${Object.entries(PROMOTION).map(([r, p]) => t('car.req', t('grade.' + r), p.level, p.served, pct(p.satisfaction))).join(' · ')}</div><div class="dim">${t('car.certNote')}</div>`;
    const card = e => {
      const s = promotionStatus(e), fmt = (k, [h, n]) => `<span class="${h >= n ? 'good' : 'dim'}">${t('car.' + k, k === 'satisfaction' ? pct(h) : h, k === 'satisfaction' ? pct(n) : n)}</span>`;
      const promo = !s ? `<div class="dim">${t('car.top')}</div>` : `<div class="brow"><span>${t('car.next', t('grade.' + s.to))}</span><span class="sp"></span><button class="go" data-do="promote:${e.id}" ${s.ready ? '' : 'disabled'}>${s.ready ? t('car.promote', Math.round(e.defSalary * PROMO_PAY ** (e.promotions + 1) * (1.15 ** e.raises)) - e.salary) : t('car.notYet')}</button></div><div class="brow">${Object.entries(s.parts).map(([k, v]) => fmt(k, v)).join(' · ')}</div>${s.ready && e.trait === 'ambitious' ? `<div class="gold">${t('car.waiting')}</div>` : ''}`;
      const certs = Object.keys(CERTS).map(id => hasCert(e, id) ? `<span class="chip cert">✓ ${t('cert.' + id)}</span>` : `<button data-do="cert:${e.id}.${id}" ${g.economy.canAfford(CERTS[id].cost) && g.isUnlocked('training') ? '' : 'disabled'} title="${certInfo(id)}">${t('cert.' + id)} $${CERTS[id].cost}</button>`).join('');
      return `<div class="rcard"><div class="brow"><b style="color:${nameColour(e)}">${rankMark(e)}${this.i18n.name(e.name)}</b><span class="dim">${t('role.' + e.role)} · Lv${e.level}</span><span class="sp"></span><span class="chip trait">${t('trait.' + e.trait)}</span></div>${promo}<div class="chips">${certs}</div></div>`;
    };
    const certList = Object.keys(CERTS).map(id => `<div class="brow"><b>${t('cert.' + id)}</b><span class="sp"></span><span class="dim">${certInfo(id)}</span></div>`).join('');
    return `<div class="bsec"><h4>${t('car.title')}</h4>${legend}${g.isUnlocked('training') ? '' : `<div class="bad">${t('car.lock')}</div>`}</div><div class="bsec">${st.hired.length ? st.hired.map(card).join('') : `<div class="dim">${t('wf.noStaff')}</div>`}</div><div class="bsec"><h4>${t('car.certs')}</h4>${certList}</div>`;
  }
  /** Relationships: every pair on the team and how they get on, with what personalities and bonds do. */
  #relations() {
    const t = (k, ...a) => this.#t(k, ...a), st = this.game.staff, H = st.hired, name = n => this.i18n.name(n);
    const label = v => v >= 60 ? 'best' : v >= 25 ? 'friend' : v > -25 ? 'ok' : v > -60 ? 'cold' : 'enemy', cls = { best: 'good', friend: 'good', ok: 'dim', cold: 'gold', enemy: 'bad' };
    const pairs = []; H.forEach((a, i) => H.slice(i + 1).forEach(b => pairs.push([a, b, st.relation(a, b)]))); pairs.sort((x, y) => y[2] - x[2]);
    const rows = pairs.map(([a, b, v]) => `<div class="brow"><span>${name(a.name)} <span class="dim">(${t('trait.' + a.trait)})</span> · ${name(b.name)} <span class="dim">(${t('trait.' + b.trait)})</span></span><span class="sp"></span><div class="meter" style="width:90px"><i style="width:${Math.round((v + 100) / 2)}%;background:${v >= 25 ? '#8fc25a' : v <= -25 ? '#d8314a' : '#9c98a2'}"></i></div><span class="${cls[label(v)]}">${t('rel.' + label(v))} ${Math.round(v)}</span></div>`).join('');
    const traits = Object.keys(TRAITS).map(k => `<div class="brow"><span class="chip trait">${t('trait.' + k)}</span><span class="sp"></span><span class="dim">${t('trd.' + k)}</span></div>`).join('');
    return `<div class="bsec"><h4>${t('rel.title')}</h4><div class="dim">${t('rel.note')}</div>${rows || `<div class="dim">${t('rel.few')}</div>`}</div><div class="bsec"><h4>${t('rel.traits')}</h4>${traits}</div>`;
  }
  /** How close a stylist is to quitting, and what moved their stress yesterday. */
  #risk(e) {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, at = g.staff.resignAt(e), s = e.lastStress, b = g.staff.birthdayOf(e), sg = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
    const cls = e.stress >= at - 10 ? 'bad' : e.stress >= at - 30 ? 'gold' : 'good';
    const why = s ? ` · ${t('wf.yesterday', sg(s.total), sg(s.work), sg(s.fatigue), sg(s.overtime), sg(s.relief), sg(s.team || 0))}` : '';
    return `<span class="${cls}">${t('wf.risk', Math.round(e.stress), at)}</span>${why} · <span class="dim">${t('wf.bday', b.month, b.date)}${e.loyalty ? ' · ' + t('wf.loyal', e.loyalty) : ''}${g.staff.canTalk(e, g.clock.day) ? '' : ' · ' + t('wf.talkIn', TALK_EVERY - (g.clock.day - e.talkDay))}</span>`;
  }
  /** Welfare: each programme with what it does and costs, today's bill, and who is closest to quitting. */
  #welfare() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff, heads = st.working(g.clock.day).length, W = PROGRAMMES, pct = v => Math.round(Math.abs(1 - v) * 100);
    const effect = { meals: t('wf.e.meals', -W.meals.stress), health: t('wf.e.health', W.health.resignAt, RESIGN_STRESS, RESIGN_STRESS + W.health.resignAt), breaks: t('wf.e.breaks', pct(W.breaks.load), pct(W.breaks.speed)),
      education: t('wf.e.education', pct(W.education.learning)), leave: t('wf.e.leave', W.leave.at), birthday: t('wf.e.birthday', W.birthday.gift, -W.birthday.stress),
      longService: t('wf.e.longService', W.longService.every, W.longService.pay, -W.longService.stress, W.longService.loyalty, W.longService.maxLoyalty) };
    const cost = id => W[id].perHead ? t('wf.c.perHead', W[id].perHead, W[id].perHead * heads) : W[id].gift ? t('wf.c.gift', W[id].gift) : W[id].pay ? t('wf.c.award', W[id].pay) : t('wf.c.free');
    const rows = WELFARE_IDS.map(id => { const on = st.has(id); return `<div class="frow"><div class="fx"><b class="${on ? 'good' : ''}">${on ? '✓ ' : ''}${t('wf.' + id)}</b> <span class="dim">${cost(id)}</span><div class="dim">${effect[id]}</div></div><button class="${on ? '' : 'go'}" data-do="welfare:${id}.${on ? 0 : 1}">${t(on ? 'wf.off' : 'wf.on')}</button></div>`; }).join('');
    const risk = st.hired.slice().sort((a, b) => (b.stress - st.resignAt(b)) - (a.stress - st.resignAt(a))).map(e => { const at = st.resignAt(e), cls = e.stress >= at - 10 ? 'bad' : e.stress >= at - 30 ? 'gold' : 'good'; return `<div class="brow"><span>${this.i18n.name(e.name)}</span><span class="sp"></span><div class="meter" style="width:120px"><i style="width:${Math.round(e.stress / at * 100)}%;background:${cls === 'bad' ? '#d8314a' : cls === 'gold' ? '#ffd98a' : '#8fc25a'}"></i></div><span class="${cls}">${Math.round(e.stress)} / ${at}</span></div>`; }).join('');
    return `<div class="bsec"><h4>${t('wf.title')}</h4><div class="dim">${t('wf.note', RESIGN_STRESS)}</div><div class="brow"><span>${t('wf.today', heads)}</span><span class="sp"></span><b class="gold">$${st.welfareCostFor(heads)}</b></div>${rows}</div>`
      + `<div class="bsec"><h4>${t('wf.riskTitle')}</h4><div class="dim">${t('wf.talkNote', TALK_EVERY, -TALK_RELIEF + g.staff.mgmt.talk)}</div>${risk || `<div class="dim">${t('wf.noStaff')}</div>`}</div>`;
  }
  /** Every team synergy: the ones today's team has first, each with what it needs and what it gives. */
  #synergies() {
    const t = (k, ...a) => this.#t(k, ...a), on = new Set(this.game.synergies.map(s => s.id));
    const rows = [...SYNERGIES].sort((a, b) => on.has(b.id) - on.has(a.id)).map(s => `<div class="syn ${on.has(s.id) ? 'on' : ''}"><div class="brow"><b>${on.has(s.id) ? '✓ ' : ''}${t('syn.' + s.id)}</b><span class="sp"></span><span class="dim">${t('syn.' + s.id + '.need')}</span></div><div>${t('syn.' + s.id + '.effect')}</div></div>`).join('');
    return `<div class="bsec"><h4>${t('syn.title', on.size)}</h4><div class="dim">${t('syn.note')}</div>${rows}</div>`;
  }
  /** Name, grade mark, role and gender, with the action buttons on the right. */
  /** Lia is the owner; everyone else stands by rank. */
  #kind(e) { return e === this.game.staff.owner ? 'owner' : e.rank; }
  /** A card's head: the pixel portrait, name, role and gender, specialty and talent chips, and the actions. */
  #cardHead(e, actions) {
    const t = (k, ...a) => this.#t(k, ...a), role = RANK_COLOURS[e.rank] ? `<span style="color:${RANK_COLOURS[e.rank]}">${t('role.' + e.role)}</span>` : `<span class="dim">${t('role.' + e.role)}</span>`;
    const chips = [e.specialty ? `<span class="chip spec">${t('style.' + SPEC_STYLE[e.specialty])}</span>` : e.style === 'AllRounder' ? `<span class="chip">${t('style.AllRounder')}</span>` : '', e.perk ? `<span class="chip perk">${t('perk.' + e.perk).split(' · ')[0]}</span>` : '', e.trait ? `<span class="chip trait" title="${t('trd.' + e.trait)}">${t('trait.' + e.trait)}</span>` : '', ...(e.certs || []).map(c => `<span class="chip cert">${t('cert.' + c)}</span>`)].join('');
    const kind = this.#kind(e), crown = kind === 'owner' ? `<img class="crown" src="${crownURL()}" alt="">` : '';
    return `<div class="shead"><img class="face r-${kind}" src="${portraitURL(e, kind)}" alt=""><div class="who"><div class="brow"><b style="color:${nameColour(e)}">${crown}${rankMark(e)}${this.i18n.name(e.name)}</b>${kind === 'owner' ? `<span class="chip boss">${t(this.game.network.executive ? 'role.CEO' : 'st.ownerTag')}</span>` : role}${e.gender ? `<span class="dim">${t('gender.' + e.gender)}</span>` : ''}</div>${chips ? `<div class="chips">${chips}</div>` : ''}</div><div class="act">${actions}</div></div>`;
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
    const desks = [0, ...(g.layout.branchOpen ? [1] : [])].filter(s => !g.staff.receptionistAt(s).hired), afford = g.economy.canAfford(e.hireCost);
    const hireDesk = desks.length ? desks.map(s => `<button class="go" data-do="rhire:${e.id}.${s}" ${afford ? '' : 'disabled'}>${t('staff.hireDesk', s + 1, e.hireCost)}</button>`).join('') : `<span class="dim">${t(g.layout.branchOpen ? 'staff.desksFull' : 'staff.deskFull1')}</span>`;
    const action = e.hired ? `${course}<button data-do="sfire:${e.id}">${t('staff.fire')}</button>` : desk ? hireDesk : `<button class="go" data-do="shire:${e.id}" ${!afford ? 'disabled' : ''}>${t('staff.hire', e.hireCost)}</button>`;
    const k = e.skills, stats = desk ? [['speed', k.speed], ['service', k.customerService], ['marketing', k.marketing || 0]] : [['shampoo', k.shampoo], ['cleaning', k.cleaning], ['speed', k.speed], ['service', k.customerService]];
    const effect = desk ? (e.hired ? t('rc.at', e.site + 1) + ' · ' + t(e.site ? 'support.juno' : 'rc.desk0', Math.round(g.branchDeskReach * 100)) : t('rc.deskAny')) : t('staff.aeffect', e.serviceMinutes('shampoo', g.speedFor('shampoo')), this.hooks.sweepMinutes(e.cleaning), (e.washQuality >= .6 ? '+' : '−') + Math.abs(Math.round((e.washQuality - .6) * 25)));
    return `<div class="scard">${this.#cardHead(e, action)}${this.#statBars(stats)}${this.#rows([['about', desk ? t('rc.' + e.id) : t('support.' + e.id)], ['effect', effect], ['pay', t('staff.wage', e.salary)]])}</div>`;
  }
  /**
   * The staff tab in three pages: the team (who is hired), hiring (who is available) and the team policy.
   * People are grouped by rank, and the specialty and talent filters narrow the team and hiring pages.
   */
  #staff() {
    const lvl = this.game.progression.level, open = k => k === 'team' || k === 'hire' || shows('staff.' + k, lvl);
    if (!open(this.staffPage)) this.staffPage = 'team';
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, st = g.staff, page = this.staffPage, onTeam = page === 'team';
    const counts = { team: 1 + st.hired.length + st.support.filter(e => e.hired).length, hire: st.candidates.filter(e => !e.hired && (e.rival == null || this.game.rival.released.includes(e.id))).length + st.support.filter(e => !e.hired).length };
    const tabs = `<div class="seg stabs">${[['team', t('st.team', counts.team)], ['hire', t('st.hire', counts.hire)], ['parts', t('dept.tab')], ['policy', t('st.policy')], ['welfare', t('st.welfare', st.welfare.size)], ['career', t('st.career', st.hired.filter(e => promotionStatus(e)?.ready).length || '')], ['rel', t('st.rel')]].filter(([k]) => open(k)).map(([k, l]) => `<button data-do="stp:${k}" class="${page === k ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
    if (page === 'parts') return tabs + this.departmentsPanel.render();
    if (page === 'welfare') return tabs + this.#welfare();
    if (page === 'career') return tabs + this.#careers();
    if (page === 'rel') return tabs + this.#relations();
    if (page === 'policy') {
      const commission = COMMISSION.map((r, i) => `<button data-do="commission:${i}" class="${st.commission === i ? 'sel' : ''}" ${this.game.hqFx.commission ? 'disabled' : ''}>${Math.round(r * 100)}%</button>`).join('');
      return `${tabs}<div class="bsec"><h4>${t('staff.policy')}</h4><div class="brow"><span>${t('staff.commission')}</span><span class="sp"></span><span class="seg">${commission}</span></div>
      <div class="brow"><span>${t('staff.shuffle')}</span><span class="sp"></span><span class="seg"><button data-do="shuffle:0" class="${st.seatShuffle ? '' : 'sel'}">${t('pol.off')}</button><button data-do="shuffle:1" class="${st.seatShuffle ? 'sel' : ''}">${t('pol.on')}</button></span></div><div class="dim">${t('staff.shuffleD')}</div>
      <div class="brow"><span>${t('staff.dinner')}</span><span class="dim">${t('staff.perHead', DINNER_PER_HEAD)}</span><span class="sp"></span><button data-do="dinner" ${!st.hired.length || st.dinnerDay === g.clock.day || !g.economy.canAfford(st.dinnerCost()) ? 'disabled' : ''}>${st.dinnerDay === g.clock.day ? t('staff.dinnerDone') : '$' + st.dinnerCost()}</button></div></div>`;
    }
    const pass = e => (this.staffSpec === 'all' || (e.specialty || 'none') === this.staffSpec) && (this.staffPerk === 'all' || e.hasPerk(this.staffPerk));
    const pool = st.candidates.filter(e => e.hired === onTeam && (onTeam || (e.rival == null || this.game.rival.released.includes(e.id))) && pass(e)), filtered = this.staffSpec !== 'all' || this.staffPerk !== 'all';
    const groups = [['owner', onTeam && pass(st.owner) ? [st.owner] : []], ...['deputy', 'master', 'senior', 'designer', 'junior'].map(r => [r, pool.filter(e => e.rank === r)])];
    const role = this.staffRole, designers = role === 'all' || role === 'designer', support = filtered || role === 'designer' ? [] : st.support.filter(e => e.hired === onTeam && (role === 'all' || (role === 'reception') === (e.effect === 'reception')));
    const group = (r, list, row) => list.length ? `<div class="sgroup"><h5>${t(r === 'owner' && g.network.executive ? 'role.CEO' : 'rank.' + r)} <span class="dim">${list.length}</span></h5>${list.map(row).join('')}</div>` : '';
    const seg = (act, cur, opts) => `<span class="seg">${opts.map(([v, l]) => `<button data-do="${act}:${v}" class="${cur === v ? 'sel' : ''}">${l}</button>`).join('')}</span>`;
    const short = k => t(k).split(' · ')[0];
    const roles = `<div class="brow"><span class="dim">${t('sf.role')}</span>${seg('sfr', role, [['all', t('sf.all')], ['designer', t('sf.designers')], ['reception', t('sf.reception')], ['assistant', t('sf.assistant')]])}</div>`;
    const filters = !designers ? `<div class="sfilt">${roles}</div>` : `<div class="sfilt">${roles}<div class="brow"><span class="dim">${t('sf.spec')}</span>${seg('sfs', this.staffSpec, [['all', t('sf.all')], ['cut', t('svc.cut')], ['colour', t('svc.colour')], ['perm', t('svc.perm')], ['none', t('style.AllRounder')]])}</div>
      <div class="brow"><span class="dim">${t('sf.perk')}</span>${seg('sfp', this.staffPerk, [['all', t('sf.all')], ...['consult', 'calm', 'speed', 'trend', 'vip', 'mentor'].map(p => [p, short('perk.' + p)])])}</div></div>`;
    const body = (designers ? groups.map(([r, list]) => group(r, list, e => this.#staffRow(e))).join('') : '') + group('reception', support.filter(e => e.effect === 'reception'), e => this.#supportRow(e)) + group('assistant', support.filter(e => e.effect !== 'reception'), e => this.#supportRow(e));
    const lock = !onTeam && !g.isUnlocked('staff') ? `<div class="dim">${t('staff.lock')}</div>` : '';
    return `${tabs}<div class="bsec">${filters}${lock}${body || `<div class="dim">${t(onTeam && !filtered ? 'st.noneTeam' : 'sf.none')}</div>`}</div>`;
  }
  #build() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, l = g.layout, active = this.build.active;
    if (active) return `<div>${t('build.placing', t('f.' + active.id))}</div><div class="brow"><button data-do="rot">${t('build.rotate')}</button><button data-do="cancel">${t('build.cancel')}</button></div>`;
    const next = l.nextExpansion;
    const expand = next ? `<button class="go" data-do="expand" ${!g.isUnlocked(next.requires) || !g.economy.canAfford(next.cost) ? 'disabled' : ''}>${g.isUnlocked(next.requires) ? t('build.expandBuy', next.cost) : t('build.lockedAt')}</button>` : `<span class="dim">${t('build.maxed')}</span>`;
    const sites = [0, ...(l.branchOpen ? [1] : [])], has = k => this.#t(k) !== k, siteTag = s => `<span class="chip">${t('build.site' + s)}</span>`;
    // How many of a piece each salon has, against what it may have.
    const owned = id => { const f = FURNITURE[id]; return sites.map(s => `${l.branchOpen ? t('build.site' + s) + ' ' : ''}${l.countAt(id, s)}${f.max != null ? '/' + l.maxOf(id, s) : ''}`).join(' · '); };
    const shopRow = id => { const f = FURNITURE[id], locked = f.requires && !g.isUnlocked(f.requires), full = !sites.some(s => l.countAt(id, s) < l.maxOf(id, s) && (!f.chairs || l.chairsAt(s) + f.chairs.length <= l.maxChairsAt(s))), small = f.minTier > l.tier;
      return `<div class="frow"><div class="fx"><b>${t('f.' + id)}</b> <span class="dim">${t('build.own', owned(id))}</span><div class="dim">${t('fd.' + id)}${reachKind(id) ? ' · ' + t('reach.' + reachKind(id), REACH[reachKind(id)]) : ''}</div></div><button class="go" data-do="buy:${id}" ${locked || small || full || !g.economy.canAfford(f.price) ? 'disabled' : ''}>${locked ? t('build.lockedAt') : small ? t('build.size', f.minTier + 1) : full ? t('build.full') : '$' + f.price.toLocaleString()}</button></div>`; };
    const ownedRow = (it, i) => `<div class="frow"><div class="fx"><b>${t('f.' + it.id)}</b> ${l.branchOpen ? siteTag(siteOf(it.x)) : ''}${has('fd.' + it.id) ? `<div class="dim">${t('fd.' + it.id)}</div>` : ''}</div>${this.hooks.isQueued(it) ? `<span class="gold">${t('build.moving')}</span>` : ''}<button data-do="move:${i}" ${this.hooks.canMove(it) ? '' : 'disabled'}>${t('build.move')}</button><button data-do="sell:${i}" ${FURNITURE[it.id].essential || !this.hooks.canSell(it) ? 'disabled' : ''}>${t('build.sell', Math.floor(FURNITURE[it.id].price / 2))}</button></div>`;
    const page = this.buildPage, cats = Object.keys(CATEGORIES), mine = l.items.map((it, i) => [it, i]);
    const tabs = `<div class="seg stabs">${[['space', t('bd.space')], ['shop', t('bd.shop')], ['owned', t('bd.owned', l.items.length)]].map(([k, v]) => `<button data-do="bdp:${k}" class="${page === k ? 'sel' : ''}">${v}</button>`).join('')}</div>`;
    if (page === 'shop') {
      const sub = `<div class="seg stabs sub">${cats.map(k => `<button data-do="bdc:${k}" class="${this.shopCat === k ? 'sel' : ''}">${t('cat.' + k)} ${FURNITURE_IDS.filter(id => categoryOf(id) === k).length}</button>`).join('')}</div>`;
      return `${tabs}${sub}<div class="bsec"><div class="dim">${t('build.help')}</div>${FURNITURE_IDS.filter(id => categoryOf(id) === this.shopCat).map(shopRow).join('')}</div>`;
    }
    if (page === 'owned') {
      const sub = `<div class="seg stabs sub">${['all', ...cats].map(k => `<button data-do="bdo:${k}" class="${this.ownedCat === k ? 'sel' : ''}">${t('cat.' + k)} ${k === 'all' ? mine.length : mine.filter(([it]) => categoryOf(it.id) === k).length}</button>`).join('')}</div>`;
      const shown = mine.filter(([it]) => this.ownedCat === 'all' || categoryOf(it.id) === this.ownedCat).sort(([a], [b]) => siteOf(a.x) - siteOf(b.x) || cats.indexOf(categoryOf(a.id)) - cats.indexOf(categoryOf(b.id)));
      return `${tabs}${sub}<div class="bsec">${shown.length ? shown.map(([it, i]) => ownedRow(it, i)).join('') : `<div class="dim">${t('build.none')}</div>`}</div>`;
    }
    return `${tabs}<div class="bsec"><h4>${t('build.chairs')}</h4><div class="brow"><span>${l.branchOpen ? t('build.chairLine2', l.chairsAt(0), l.maxChairsAt(0), l.chairsAt(1), l.maxChairsAt(1)) : t('build.chairLine', l.chairsAt(0), l.maxChairsAt(0))}</span><span class="sp"></span><button class="go" data-do="buy:station" ${!g.isUnlocked('chairs') || !l.chairRoom || !g.economy.canAfford(CHAIR_PRICE) ? 'disabled' : ''}>${g.isUnlocked('chairs') ? t('build.chairBuy', CHAIR_PRICE) : t('build.lockedAt')}</button></div><div class="dim">${t('build.chairHint')}</div></div>
    ${shows('build.expand', g.progression.level) ? `<div class="bsec"><h4>${t('build.expand')}</h4><div class="brow"><span>${t('build.expandLine', l.tier + 1, EXPANSIONS.length + 1)}</span><span class="sp"></span>${expand}</div>${next ? `<div class="dim">${t('build.next.' + l.tier)}</div>` : ''}</div>` : ''}
    ${shows('build.branch', g.progression.level) || l.branchOpen ? this.#branch() : ''}${this.#sets()}`;
  }
  /** Interior sets: found ones by name, pieces and bonus, with where they stand complete; the rest as ???. */
  #sets() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, done = g.layout.completeSets, found = g.sets.found;
    const fx = s => Object.entries(s.fx).map(([k, v]) => t('setfx.' + k, k === 'comfort' || k === 'followers' ? v : Math.round(v * 100))).join(' · ');
    const pieces = s => Object.entries(s.needs).map(([id, n]) => t('f.' + id) + (n > 1 ? ' ×' + n : '')).join(' · ');
    const row = s => { const where = done.filter(c => c.id === s.id).map(c => t('build.site' + c.site)), n = Object.values(s.needs).reduce((a, b) => a + b, 0);
      return found.includes(s.id)
        ? `<div class="brow"><span class="${where.length ? 'good' : 'dim'}">${where.length ? '✓' : '·'} <b>${t('set.' + s.id)}</b> · ${fx(s)}</span><span class="sp"></span><span class="dim">${where.length ? where.join(' · ') : t('set.apart')}</span></div><div class="dim">${pieces(s)}</div>`
        : `<div class="brow"><span class="dim">· ??? · ${t('set.unknown', n)}</span></div>`; };
    return `<div class="bsec"><h4>${t('set.title', found.length, INTERIOR_SETS.length)}</h4><div class="dim">${t('set.note', SET_SPAN)}</div>${INTERIOR_SETS.map(row).join('')}</div>`;
  }
  /** The second salon: what it takes to open, then that it is open. */
  #branch() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, B = g.branchStatus;
    const nx = g.layout.nextBranchExpansion, grow = !g.layout.branchOpen ? '' : nx ? `<div class="brow"><span>${t('br.size', g.layout.branchTier + 1, g.layout.maxChairsAt(1))}</span><span class="sp"></span><button class="go" data-do="bexpand" ${!g.isUnlocked(nx.requires) || !g.economy.canAfford(nx.cost) ? 'disabled' : ''}>${g.isUnlocked(nx.requires) ? t('br.expandBuy', nx.cost.toLocaleString(), [9, 12][g.layout.branchTier]) : t('br.expandLocked')}</button></div>` : `<div class="dim">${t('br.maxed', g.layout.maxChairsAt(1))}</div>`;
    const body = g.layout.branchOpen ? `<div class="good">${t('br.isOpen')}</div><div class="brow"><span class="sp"></span><button data-do="view:1">${t('br.view')}</button></div>${grow}`
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
  /** The business tab in four pages: money (today, the month, running costs), funding, operations (demand, hours, prices, treats) and the stylist ranking. */
  #business() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, e = g.economy, money = n => (n < 0 ? '−$' : '$') + Math.abs(n), line = (k, v) => `<div class="brow"><span>${t(k)}</span><span class="sp"></span><span>${v}</span></div>`;
    const costs = `<div class="bsec"><h4>${t('biz.opTitle')}</h4>${Object.entries(g.operatingCosts.breakdown).map(([k, v]) => line('led.' + k, `$${e.today.expenses[k] || 0} / $${v}`)).join('')}${line('led.materials', '$' + (e.today.expenses.materials || 0))}<div class="dim">${t('biz.opNote')}</div></div>`;
    const rep = g.reputation, prices = (g.isUnlocked('luxury') ? [0, 1, 2, 3] : [0, 1, 2]).map(i => `<button data-do="price:${i}" class="${g.priceLevel === i ? 'sel' : ''}" ${g.priceLocked ? 'disabled' : ''}>${t('price.' + i)}</button>`).join('');
    // the ranking, Lia included, best first by whichever measure is picked
    const avg = s => s.stats.served ? s.stats.sum / s.stats.served : -1, rating = s => { const r = g.reviews.ratingFor(s.name); return r.count ? r.average + r.count / 1e4 : -1; };
    const BY = { earn: s => s.stats.earn, today: s => s.today.earn, sat: avg, rating, served: s => s.stats.served };
    const rows = [g.staff.owner, ...g.staff.hired].sort((a, b) => (BY[this.ladderSort](b) - BY[this.ladderSort](a)) || (b.stats.earn - a.stats.earn)), rated = s => { const r = g.reviews.ratingFor(s.name); return r.count ? `★${r.average.toFixed(1)} (${r.count})` : '–'; };
    const hs = g.hospitality, treats = Object.entries(AMENITIES).map(([id, a]) => `<div class="brow"><span>${t('hs.' + id)}</span><span class="dim">${t('hs.cost', a.cost)}</span><span class="sp"></span>${hs.available(id) ? `<span class="seg"><button data-do="amen:${id}" class="${hs.isOffered(id) ? 'sel' : ''}">${t('hs.on')}</button><button data-do="amen:${id}" class="${hs.isOffered(id) ? '' : 'sel'}">${t('hs.off')}</button></span>` : `<span class="dim">${t('hs.needs', a.needs.map(n => t('f.' + n)).join(' / '))}</span>`}</div>`).join('');
    const lvl = g.progression.level, opsKeys = ['demand', 'menu', 'hours', 'price', 'treats'].filter(k => shows('ops.' + k, lvl));
    if (!shows('biz.' + this.bizPage, lvl)) this.bizPage = 'money'; if (!opsKeys.includes(this.bizSub.ops)) this.bizSub.ops = 'demand';
    const page = this.bizPage, tabs = `<div class="seg stabs">${[['money', t('bz.money')], ['fund', t('bz.fund')], ['ops', t('bz.ops')], ['rank', t('bz.rank')], ['network', t('net.tab')], ['hq', t('bz.hq')]].filter(([k]) => shows('biz.' + k, lvl)).map(([k, l]) => `<button data-do="bzp:${k}" class="${page === k ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
    const sub = keys => `<div class="seg ssub">${keys.map(k => `<button data-do="bzs:${page}.${k}" class="${this.bizSub[page] === k ? 'sel' : ''}">${t('bzs.' + k)}</button>`).join('')}</div>`;
    if (page === 'fund') return tabs + sub(['value', 'invest', 'loan']) + this.#funding(this.bizSub.fund);
    if (page === 'network') return tabs + this.networkPanel.render(this.hooks.canLead?.());
    if (page === 'hq') return tabs + this.#hq();
    if (page === 'ops') return tabs + (opsKeys.length > 1 ? sub(opsKeys) : '') + { demand: () => this.#calendar() + this.#demand(), menu: () => this.#menu(), hours: () => `<div class="bsec"><h4>${t('hours.title')}</h4>${this.#hours()}<div class="dim">${t('hours.note')}</div></div>`, price: () => `<div class="bsec"><h4>${t('biz.price')}</h4>${g.isUnlocked('pricing') ? `<div class="seg">${prices}</div><div class="dim">${t('price.h')}</div>` : `<div class="dim">${t('biz.lockPrice')}</div>`}</div>${this.#rival()}`, treats: () => `<div class="bsec"><h4>${t('hs.title')}</h4>${treats}<div class="brow"><span>${t('hs.floor')}</span><span class="sp"></span><b class="${hs.floor ? 'good' : 'dim'}">${hs.floor ? t('hs.floorV', Math.round(hs.floor * 100), starsFor(hs.floor)) : t('hs.none')}</b></div><div class="dim">${t('hs.what')}</div></div>` }[this.bizSub.ops]();
    const by = this.ladderSort, th = (k, label) => `<th class="${by === k ? 'on' : ''}">${t(label)}</th>`;
    const sorts = `<div class="seg ssub">${['earn', 'today', 'sat', 'rating', 'served'].map(k => `<button data-do="lsort:${k}" class="${by === k ? 'sel' : ''}">${t('lsort.' + k)}</button>`).join('')}</div>`;
    if (page === 'rank') return `${tabs}${sorts}<div class="bsec"><h4>${t('biz.ladder')}</h4><table class="lad"><tr><th>#</th><th>${t('lad.stylist')}</th>${th('served', 'lad.done')}${th('sat', 'lad.avg')}${th('rating', 'lad.rating')}${th('today', 'lad.today')}${th('earn', 'lad.earn')}</tr>${rows.map((s, i) => `<tr class="${i < 3 ? 'top' + (i + 1) : ''}"><td>${i + 1}</td><td style="color:${nameColour(s)}">${rankMark(s)}${this.i18n.name(s.name)}</td><td>${s.stats.served}</td><td>${s.stats.served ? Math.round(s.stats.sum / s.stats.served * 100) + '%' : '–'}</td><td>${rated(s)}</td><td>$${s.today.earn.toLocaleString()}</td><td>$${s.stats.earn.toLocaleString()}</td></tr>`).join('')}</table></div>`;
    return tabs + sub(['today', 'month', 'costs']) + { today: () => `<div class="bsec"><h4>${t('biz.finance')}</h4>${line('biz.cash', money(e.cash))}${line('biz.rev', money(e.dailyRevenue))}${line('biz.exp', money(-e.dailyOperatingCost))}${line('biz.profit', money(e.dailyProfit))}${e.dailyInvestment ? line('biz.invest', money(-e.dailyInvestment)) : ''}${line('biz.total', g.served)}${line('biz.sat', g.served ? Math.round(g.averageSatisfaction * 100) + '%' : '–')}${line('biz.rep', rep.starText + ' ' + Math.floor(rep.value))}${line('biz.comfort', `${g.comfort} <span class="dim">(${t('biz.comfortMax')})</span>`)}${line('biz.regulars', g.regulars)}</div>`, month: () => this.#month(), costs: () => costs }[this.bizSub.money]();
  }
  /** Where today's clients come from. */
  /** Today on the calendar: the season, events and happening, what they change, and the next event. */
  #calendar() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, day = g.clock.day, d = dateOf(day), season = seasonOf(day), nx = nextEvent(day);
    const fx = f => Object.entries(f).filter(([k, v]) => typeof v === 'number' && !['month', 'from', 'to'].includes(k) && t('fx.' + k) !== 'fx.' + k).map(([k, v]) => t('fx.' + k) + ' ×' + (Math.round(v * 100) / 100)).join(' · ');
    const su = g.surprise && g.surprise.state !== 'due' ? g.surprise : null;
    const rows = [[t('season.' + season), fx(SEASONS[season]) || t('cal.plain')], [t('wx.' + g.weather), fx(WEATHER[g.weather]) || t('cal.plain')], ...(su ? [[t('su.' + su.id + '.t'), (def => su.state === 'fixed' ? t('cal.handled') : def.followers ? t('su.followers', def.followers) : def.walkIns ? t('su.walkIns', def.walkIns) : g.surpriseFx.drinks === 0 ? t('fx.noDrinks') : fx(g.surpriseFx) || t('cal.handled'))(SURPRISES.find(x => x.id === su.id))]] : []), ...eventsOn(day).map(e => [t('ev.' + e.id), fx(e)]), ...(g.happening ? [[t('hap.' + g.happening.id + '.t'), g.happening.kind === 'inspection' ? t(g.happening.pass ? 'cal.inspPass' : 'cal.inspFail') : fx(g.happeningFx) || t('cal.handled')]] : []), ...(day <= g.trendUntil ? [[t('hap.trend.t'), t('cal.until', g.trendUntil - day + 1)]] : [])];
    return `<div class="bsec"><h4>${t('cal.title', d.month, d.date)}</h4>${rows.map(([a, b]) => `<div class="brow"><span>${a}</span><span class="sp"></span><span class="dim">${b}</span></div>`).join('')}${nx ? `<div class="dim">${t('cal.next', t('ev.' + nx.event.id), nx.in)}</div>` : ''}</div>`;
  }
  #demand() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, { add, mult } = g.demandParts, f1 = v => (Math.round(v * 10) / 10).toString(), x = v => '×' + (Math.round(v * 100) / 100);
    const rows = Object.entries(add).filter(([k]) => k !== 'branch' || g.layout.branchOpen).map(([k, v]) => `<div class="brow"><span>${t('demand.' + k)}</span><span class="sp"></span><span>${f1(v)}</span></div>`).join('');
    const today = Math.round(g.dailyDemand * g.clock.hours / 8);
    return `<div class="bsec"><h4>${t('demand.title')}</h4>${rows}<div class="dim">${t('demand.mult', x(mult.price), x(mult.marketing), x(mult.reviews), x(mult.rival))}${['calendar', 'award', 'booking', 'fame', 'signs', 'contest', 'story', 'hq'].filter(k => mult[k] !== 1).map(k => ' · ' + t('demand.' + k, x(mult[k]))).join('')}</div><div class="brow"><span>${t('demand.total', g.clock.hours)}</span><span class="sp"></span><b class="gold">${t('demand.people', today)}</b></div></div>`;
  }
  /** The menu board: every cut, perm and colour with its price, this month's trends, and pricing by grade. */
  #menu() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, T = g.trends, k = PRICE_MULTIPLIER[g.priceLevel], usd = v => '$' + Math.round(v * k);
    const want = i => this.i18n.lang === 'ko' ? WANT_KO[i] : WANT[i][0], who = x => x.g === 'any' ? t('menu.any') : t('gender.' + x.g);
    const item = (name, x, hot, locked, extra = '') => `<div class="brow ${locked ? 'dim' : ''}"><span>${hot ? '<b class="gold">★ ' : ''}${name}${hot ? '</b>' : ''}${x.trend ? ` <span class="chip spec">2026</span>` : ''}</span><span class="dim">${extra}</span><span class="sp"></span><b>${locked ? t('build.lockedAt') : usd(x.price)}</b></div>`;
    const cutRows = reference => Object.entries(CUTS).filter(([, c]) => !!c.reference === reference).map(([id, c]) => item(t('cut.' + id), c, isHot(T, id), c.advanced && !g.isUnlocked('chairs'), `${who(c)} · ${c.L[0]}–${c.L[1]}cm`) + (c.reference ? `<div class="dim">${t('cut.note.' + id)}</div>` : '')).join('');
    const cuts = cutRows(false) + `<h4>${t('cuts.collection')}</h4><div class="dim">${t('cuts.note')}</div>` + cutRows(true);
    const perms = Object.entries(PERMS).map(([id, p]) => item(t('perm.' + id), p, isHot(T, id), !g.isUnlocked('perm'), `${who(p)} · ${t(p.straighten ? 'menu.straight' : 'wave.' + ['Straight', 'Wavy', 'Curly', 'Coily'][p.wave])}`)).join('');
    const colours = TREND_COLOURS.map(i => `<span class="chip ${isHot(T, i) ? 'spec' : ''}"><i class="dot" style="background:#${WANT[i][1].toString(16).padStart(6, '0')}"></i>${isHot(T, i) ? '★ ' : ''}${want(i)}</span>`).join('');
    const grades = Object.entries(GRADE_PAY).map(([r, v]) => `${t('grade.' + r)} ×${v}`).join(' · ');
    return `<div class="bsec"><h4>${t('menu.trends')}</h4><div class="gold">★ ${[t('cut.' + T.cutF), t('cut.' + T.cutM), t('perm.' + T.permF), t('perm.' + T.permM), want(T.colour)].join(' · ')}</div><div class="dim">${t('menu.trendNote', Math.round((TREND_PAY - 1) * 100), Math.round(TREND_PERK_SATISFACTION * 100))}</div></div>`
      + `<div class="bsec"><h4>${t('menu.grades')}</h4><div>${grades}</div><div class="dim">${t('menu.gradeNote', k)}</div></div>`
      + `<div class="bsec"><h4>${t('menu.cuts')}</h4>${cuts}</div><div class="bsec"><h4>${t('menu.perms')}</h4>${perms}</div>`
      + `<div class="bsec"><h4>${t('menu.colours')}</h4><div class="brow"><span>${t('menu.colourFull')}</span><span class="sp"></span><b>${usd(COLOUR_PRICE)}</b></div><div class="brow"><span>${t('menu.colourTrend')}</span><span class="sp"></span><b>${usd(TREND_COLOUR_PRICE)}</b></div><div class="brow"><span>${t('menu.bleach')}</span><span class="sp"></span><b>+${usd(BLEACH_PRICE)}</b></div><div class="chips">${colours}</div></div>`;
  }
  /** Shawn: his trust, the rules of his orders, what is running now and how past orders ended. */
  #hq() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, H = g.hq, F = g.hqFx, day = g.clock.day, pct = v => Math.round(v * 100);
    if (g.network.executive) return `<div class="bsec"><h4>${t('role.CEO')}</h4><p>${t('net.ceoDone')}</p></div>`;
    const bar = `<div class="brow"><span>${t('hq.trust')}</span><span class="sp"></span><b class="${H.trust >= TRUST.refuseMin ? 'good' : H.bossy ? 'bad' : 'gold'}">${H.trust} / 100</b></div>`;
    const rules = [t('hq.r.when', HQ_GAP[0], HQ_GAP[1], HQ_GAP_INVESTED[0], HQ_GAP_INVESTED[1]), t('hq.r.accept', TRUST.accept), t('hq.r.talk', pct(g.hqTalkOdds), -TRUST.talkWin, -TRUST.talkLose), t('hq.r.refuse', TRUST.refuseMin, -TRUST.refuse),
      t('hq.r.low', TRUST.low), t('hq.r.week', TRUST.weekProfit, -TRUST.weekLoss)].map(r => `<div class="dim">· ${r}</div>`).join('');
    const now = [F.price >= day && t('hq.now.price', F.price - day + 1), F.promo >= day && t('hq.now.promo', F.promo - day + 1, pct(1 - ORDERS.promo.price), pct(ORDERS.promo.demand - 1)), F.hours && t('hq.now.hours', F.hours.until - day + 1),
      F.commission && t('hq.now.commission', F.commission.until - day + 1), F.product && t('hq.now.product', Math.max(0, F.product.due - day))].filter(Boolean).map(x => `<div class="gold">${x}</div>`).join('');
    const log = H.log.map(l => `<div class="brow"><span>${t('hq.o.' + l.id)}</span><span class="sp"></span><span class="dim">${t('hq.day', l.day)} · ${t('hq.how.' + l.how)}</span></div>`).join('');
    return `<div class="bsec"><h4>${t('hq.title')}</h4>${bar}<div class="dim">${t('hq.note')}</div>${rules}</div><div class="bsec"><h4>${t('hq.active')}</h4>${now || `<div class="dim">${t('hq.none')}</div>`}</div>`
      + `<div class="bsec"><h4>${t('hq.log')}</h4>${log || `<div class="dim">${t('hq.noLog')}</div>`}</div>`;
  }
  /** Steppers for tomorrow's opening and closing hours. */
  #hours() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, [o, c] = g.plannedHours;
    const step = (w, s) => `<button data-do="hrs:${w}${s > 0 ? '+' : '-'}" ${g.canShiftHours(w === 'o' ? 0 : 1, s) && !g.hqFx.hours ? '' : 'disabled'}>${s > 0 ? '+' : '−'}</button>`;
    const now = `${g.clock.openHour}:00–${g.clock.closeHour}:00`;
    return `<div class="brow"><span>${t('hours.open')}</span><span class="sp"></span>${step('o', -1)}<b style="min-width:52px;text-align:center">${o}:00</b>${step('o', 1)}</div>
      <div class="brow"><span>${t('hours.close')}</span><span class="sp"></span>${step('c', -1)}<b style="min-width:52px;text-align:center">${c}:00</b>${step('c', 1)}</div>
      <div class="brow"><span>${t('hours.today', now)}</span><span class="sp"></span><span class="${g.nextHours ? 'gold' : 'dim'}">${g.nextHours ? t('hours.tomorrow', o, c, c - o) : t('hours.length', c - o)}</span></div>
      ${g.hqFx.hours ? `<div class="gold">${t('hq.now.hours', g.hqFx.hours.until - g.clock.day + 1)}</div>` : ''}
      <div class="brow"><span>${t('hours.lastCall')}</span><span class="sp"></span><span class="seg">${LAST_CALLS.map(m => `<button data-do="lastcall:${m}" class="${g.lastCall === m ? 'sel' : ''}">${m ? t('hours.before', m) : t('hours.atClose')}</button>`).join('')}</span></div>
      <div class="brow"><span>${t('hours.closing')}</span><span class="sp"></span><span class="seg">${CLOSING.map(k => `<button data-do="closing:${k}" class="${g.closingPolicy === k ? 'sel' : ''}">${t('hours.cl.' + k)}</button>`).join('')}</span></div>
      <div class="dim">${t('hours.clNote.' + g.closingPolicy, Math.round(REBOOK_ACCEPT * 100))}</div>
      <div class="dim">${t('hours.desk', DESK_PLAN.minutesPerClient)}</div>
      <div class="dim">${t('hours.lastCallNote', g.lastCall ? `${c - 1}:${String(60 - g.lastCall).padStart(2, '0')}` : `${c}:00`, Math.round(g.staff.hired.reduce((n, e) => n + e.salary, 0) / Math.max(1, g.staff.hired.length) * 1.5 / 8))}</div>`;
  }
  /** The funding page: `part` is the salon's value, Shawn's investment or the bank. */
  #funding(part) {
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
    return { value: valueSec, invest: ceoSec, loan: bankSec }[part] || valueSec + ceoSec + bankSec;
  }
  #rival() {
    const t = (k, ...a) => this.#t(k, ...a), r = this.game.rival;
    if (!r.open) return '';
    return `<div class="bsec"><h4>${t('rival.title')}</h4><div class="brow"><b>${r.name}</b><span class="dim">${t('price.' + r.priceLevel)} · ★ ${r.rating.toFixed(1)}</span></div>${r.move ? `<div class="gold">${t('rival.now.' + r.move, r.daysLeft)}</div>` : `<div class="dim">${t('rival.quiet')}</div>`}</div>`;
  }
  /** The marketing tab in three pages: promotion, hair contests and the rival. */
  #mktPages() {
    const t = (k, ...a) => this.#t(k, ...a), lvl = this.game.progression.level, keys = [['promo', t('mp.promo')], ['brand', t('mp.brand')], ['contest', t('mp.contest')], ['rival', t('mp.rival')]].filter(([k]) => k === 'promo' || shows('mkt.' + k, lvl));
    if (!keys.some(([k]) => k === this.mktPage)) this.mktPage = 'promo';
    const tabs = keys.length < 2 ? '' : `<div class="seg stabs">${keys.map(([k, l]) => `<button data-do="mkp:${k}" class="${this.mktPage === k ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
    return tabs + (this.mktPage === 'brand' ? this.#brand() : this.mktPage === 'contest' ? this.#contest() : this.mktPage === 'rival' ? this.#rivalPage() : this.#marketing());
  }
  /** The brand: products with their stock and sales, restocking, and research for new ones. */
  #brand() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, B = g.brand, cash = g.economy, day = g.clock.day, stars = r => '★' + r.toFixed(1);
    const rules = `<div class="dim">${t('brand.rules', Math.round(DESK.base * 100), Math.round(DESK.satisfaction * 100), Math.round(DESK.display * 100), ONLINE.per.toLocaleString(), ONLINE.shipping)}</div>`;
    const today = `<div class="brow"><span>${t('brand.today')}</span><span class="sp"></span><b class="gold">$${Math.round(['brand', 'online', 'wholesale', 'retail'].reduce((n, k) => n + (cash.today.revenue[k] || 0), 0)).toLocaleString()}</b></div><div class="dim">${t('brand.total', B.sold.desk.toLocaleString(), B.sold.online.toLocaleString(), g.displays)}</div>`;
    const product = p => { const price = B.unitPrice(p), cost = B.unitCost(p);
      return `<div class="rcard"><div class="brow"><b>CIEL ${t('pt.' + p.type)}</b><span class="chip">${t('line.' + p.line)}</span><span class="sp"></span><span class="gold">${stars(B.rating(p))}</span></div>`
        + `<div class="dim">${t('brand.row', p.quality, LINES[p.line].expect, price, cost, (price - cost).toFixed(1), p.sold.toLocaleString())}</div>`
        + `<div class="brow"><span class="${!p.stock || p.stock < B.weeklyNeed(p.type) ? 'bad' : ''}">${t('brand.stock', p.stock)}${B.weeklyNeed(p.type) ? ' · ' + t('brand.need', B.weeklyNeed(p.type)) : ''}</span><span class="sp"></span>${BATCHES.map(n => `<button data-do="restock:${p.type}.${n}" ${cash.canAfford(Math.round(cost * n)) ? '' : 'disabled'}>+${n} ($${Math.round(cost * n).toLocaleString()})</button>`).join('')}</div></div>`; };
    const team = [g.staff.owner, ...g.staff.hired], r = B.research;
    const lines = Object.keys(LINES).map(k => `<button data-do="line:${k}" class="${this.line === k ? 'sel' : ''}">${t('line.' + k)}</button>`).join('');
    const research = r ? `<div class="gold">${t('brand.researching', t('pt.' + r.type), t('line.' + r.line), Math.max(0, r.ready - day))}</div>`
      : Object.keys(PRODUCT_TYPES).filter(k => !B.get(k)).map(k => { const T = PRODUCT_TYPES[k], q = B.expectedQuality(k, team, g.staff.management), L = LINES[this.line];
        const cost = B.researchCost(k, this.line);
        return `<div class="frow"><div class="fx"><b>${t('pt.' + k)}</b> <span class="dim">${t('brand.plan', q, L.expect, Math.round(T.price * L.price), B.researchDays(k, this.line), t('sk.' + { customerService: 'service', cutting: 'cut', colouring: 'colour', perming: 'perm' }[T.skill]))}</span></div><button class="go" data-do="research:${k}" ${cash.canAfford(cost) ? '' : 'disabled'}>${t('brand.start', cost.toLocaleString())}</button></div>`; }).join('');
    const deals = [...B.contracts.map(c => `<div class="brow"><span>${t('deal.' + c.deal)}</span><span class="sp"></span><span class="dim">${t('brand.contract', c.units, t('pt.' + c.type), c.price, c.weeksLeft, c.next)}</span></div>`),
      ...B.listings.map(l => `<div class="brow"><span>${t('deal.' + l.deal)}</span><span class="sp"></span><span class="dim">${t('brand.listed', l.daily[0], l.daily[1], Math.round(l.cut * 100))}</span></div>`),
      ...(B.boostNow > 1 ? [`<div class="gold">${t('brand.boost', B.boostNow, B.boost.until - day + 1)}</div>`] : [])].join('');
    const dealSec = `<div class="bsec"><h4>${t('brand.deals')}</h4><div class="dim">${t('brand.dealsNote', Object.keys(DEALS).length)}</div>${deals || `<div class="dim">${t('brand.noDeals')}</div>`}</div>`;
    return `<div class="bsec"><h4>${t('brand.title')}</h4>${rules}${today}</div><div class="bsec"><h4>${t('brand.products')}</h4>${B.products.length ? B.products.map(product).join('') : `<div class="dim">${t('brand.none')}</div>`}</div>`
      + dealSec + `<div class="bsec"><h4>${t('brand.lab')}</h4><div class="dim">${t('brand.labNote', QUALITY.base, Math.round(QUALITY.skill * 100), QUALITY.cert, Math.round(QUALITY.mgmt * 100), QUALITY.luck)}</div>${r ? '' : `<div class="brow"><span>${t('brand.line')}</span><span class="seg">${lines}</span></div><div class="dim">${t('brand.lineNote', Math.round(LINES[this.line].research * 100), LINES[this.line].days >= 0 ? '+' + LINES[this.line].days : LINES[this.line].days, LINES[this.line].expect, Math.round(LINES[this.line].price * 100))}</div>`}${research || `<div class="dim">${t('brand.allDone')}</div>`}</div>`;
  }
  /** This month's hair contest: when, what, the stakes, who could enter and how they would score; and past results. */
  #contest() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, c = g.contest, day = g.clock.day, name = n => this.i18n.name(n), lvl = g.progression.level;
    if (lvl < CONTESTS.local.level) return `<div class="bsec"><div class="dim">${t('contest.locked', CONTESTS.local.level)}</div></div>`;
    const concepts = Object.entries(CONCEPTS).map(([k, [lo, hi]]) => `<button data-do="concept:${k}" class="${this.concept === k ? 'sel' : ''}" title="${lo} ~ +${hi}">${t('concept.' + k)} (${lo}~+${hi})</button>`).join('');
    const rules = `<div class="dim">${t('contest.rules')}</div>`;
    let body;
    if (!c) body = `<div class="dim">${t('contest.none')}</div>`;
    else {
      const def = CONTESTS[c.kind], when = c.day - day, stakes = [0, 1, 2].map(i => t('contest.place', i + 1, def.prizes[i].toLocaleString(), def.followers[i].toLocaleString(), def.rep[i])).join(' · ');
      const head = `<div class="rcard sp"><div class="brow"><b class="gold">${t('contest.kind.' + c.kind)} · ${t('contest.cat.' + c.category)}</b><span class="sp"></span><span>${when > 0 ? t('contest.when', when) : t('contest.today')}</span></div><div class="dim">${t('contest.fee', def.fee)} · ${t('contest.field', def.field)} · ${stakes}</div></div>`;
      if (c.result) body = head + `<div>${c.result.withdrew ? t('contest.withdrew') : t('contest.placed', name(c.result.name), c.result.place + 1)}</div>`;
      else if (c.entrant) { const e = c.entrant === 'owner' ? g.staff.owner : g.staff.find(c.entrant); body = head + `<div class="good">${t('contest.entered', name(e.name), t('concept.' + c.concept))}</div>`; }
      else {
        const who = [g.staff.owner, ...g.staff.hired].map(e => { const own = e === g.staff.owner, s = baseScore(e, c.category, own), parts = Object.entries(s.parts).filter(([, v]) => v).map(([k, v]) => t('cs.' + k, v)).join(' · ');
          return `<div class="frow"><div class="fx"><b>${name(e.name)}</b> <span class="gold">${s.total}</span><div class="dim">${parts}</div></div><button class="go" data-do="enter:${own ? 'owner' : e.id}" ${g.economy.canAfford(def.fee) && when > 0 ? '' : 'disabled'}>${t('contest.enter', def.fee)}</button></div>`; }).join('');
        body = head + `<div class="brow"><span>${t('contest.concept')}</span><span class="seg">${concepts}</span></div>` + who;
      }
    }
    const log = g.contestLog.map(x => `<div class="brow"><span>${t('contest.kind.' + x.kind)} · ${t('contest.cat.' + x.category)}</span><span class="sp"></span><span class="${x.place < 3 ? 'gold' : 'dim'}">${name(x.name)} · ${t('contest.nth', x.place + 1)} (${x.score})</span></div>`).join('');
    return `<div class="bsec"><h4>${t('contest.title')}</h4>${rules}${body}</div><div class="bsec"><h4>${t('contest.log')}</h4>${log || `<div class="dim">${t('sp.logNone')}</div>`}</div>`;
  }
  /** The rival: who they are, what they are doing, the street's split, how close they are to closing, and their stylists. */
  #rivalPage() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, r = g.rival, name = n => this.i18n.name(n), day = g.clock.day;
    if (!r.open) return `<div class="bsec"><h4>${t('rv2.title')}</h4><div class="dim">${r.closed ? t('rv2.closed', r.closed, r.next, Math.max(0, r.reopenDay - day)) : t('rival.quiet')}</div></div>`;
    const share = g.marketShare, pct = v => Math.round(v * 100);
    const war = r.move === 'priceCut' || r.move === 'promo' ? (g.matching ? `<div class="good">${t('rv2.matching', g.matchUntil - day + 1)}</div>` : `<div class="brow"><span class="gold">${t('rv2.war', pct(r.discount))}</span><span class="sp"></span><button data-do="matchwar">${t('pw.match')}</button></div><div class="dim">${t('pw.matchN', pct(1 - MATCH_PRICE), pct(MATCH_BLUNTS))}</div>`) : '';
    const scouts = r.stylists.map(id => { const e = g.staff.find(id), cost = g.scoutCost(id); return `<div class="frow"><div class="fx"><b>${name(e.name)}</b> <span class="dim">${t('role.' + e.role)} · ${t('sk.cut')} ${e.skills.cutting} · ${t('sk.colour')} ${e.skills.colouring} · ${t('sk.perm')} ${e.skills.perming}</span></div><button class="go" data-do="scout:${id}" ${cost && g.economy.canAfford(cost) && this.hooks.hasOpenChair() ? '' : 'disabled'}>${cost ? t('rv2.scout', cost.toLocaleString()) : t('rv2.scoutLv', SCOUT_LEVEL)}</button></div>`; }).join('');
    return `<div class="bsec"><h4>${t('rv2.title')}</h4><div class="brow"><b>${r.name}</b><span class="dim">${t('rv2.tier', r.tier + 1)} · ${t('price.' + r.priceLevel)} · ★ ${r.rating.toFixed(1)}</span></div><div class="dim">${t('rv2.style.' + r.tier % 3)}</div>${r.move ? `<div class="${['mishap', 'scandal'].includes(r.move) ? 'good' : 'gold'}">${t('rival.now.' + r.move, r.daysLeft)}</div>` : `<div class="dim">${r.rest ? t('rv2.rest', r.rest) : t('rival.quiet')}</div>`}${war}`
      + `${r.history.length ? `<div class="dim">${t('rv2.history')}: ${r.history.map(h => t('rv2.h', h.day, t('rv2.m.' + h.id))).join(' · ')}</div>` : ''}</div>`
      + `<div class="bsec"><h4>${t('rv2.share')}</h4><div class="brow"><span>Ciel Ground ${pct(share)}%</span><span class="sp"></span><span>${r.name} ${pct(1 - share)}%</span></div><div class="meter"><i style="width:${pct(share)}%"></i></div>${g.toRival.yesterday ? `<div class="bad">${t('rv2.lost', g.toRival.yesterday, r.name, (g.rivalCatch * 100).toFixed(1))}</div>` : ''}<div class="dim">${t('rv2.lostNote', Math.round(TO_RIVAL.share * 100), Math.round(TO_RIVAL.cap * 100))}</div>${this.#footing(r, t, pct)}</div>`
      + `<div class="bsec"><h4>${t('rv2.spyT')}</h4><div class="brow"><span>${t('rv2.spy', g.spy.caught, g.spy.missed)}</span><span class="sp"></span><b>${t('rv2.spyOdds', Math.round(g.spyOdds(0) * 100))}</b></div><div class="dim">${t('rv2.spyNote', Math.round(SPY.spot.cctv * 100), Math.round(SPY.spite * 100), SPY.feed)}</div></div>`
      + `<div class="bsec"><h4>${t('rv2.staff')}</h4><div class="dim">${t('rv2.scoutNote')}</div>${scouts || `<div class="dim">${t('rv2.noStaff')}</div>`}</div>`;
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
    const A = m.auto, tog = (k, on) => `<span class="seg"><button data-do="mkauto:${k}.1" class="${on ? 'sel' : ''}">${t('pol.on')}</button><button data-do="mkauto:${k}.0" class="${on ? '' : 'sel'}">${t('pol.off')}</button></span>`;
    const done = m.autoLog.map(l => l.gained != null ? t('mk.auto.posted', t('mk.ch.' + l.id), l.gained.toLocaleString()) : t('mk.auto.ran', t('mk.' + l.id))).join(' · ');
    const agency = `<div class="bsec"><h4>${t('mk.auto.title')}</h4><div class="dim">${t('mk.auto.note', AGENCY.fee)}</div>`
      + `<div class="brow"><span>${t('mk.auto.posts')}</span><span class="sp"></span>${tog('posts', A.posts)}</div><div class="dim">${t('mk.auto.postsD', Math.round(AGENCY.postMarkup * 100), Math.round(AGENCY.quality * 100))}</div>`
      + `<div class="brow"><span>${t('mk.auto.ads')}</span><span class="sp"></span>${tog('ads', A.ads)}</div><div class="dim">${t('mk.auto.adsD', AGENCY.adCash.toLocaleString(), Math.round(AGENCY.adMarkup * 100))}</div>`
      + `${done ? `<div class="gold">${t('mk.auto.today', done)}</div>` : ''}<div class="brow"><span>${t('mk.auto.spent')}</span><span class="sp"></span><b>$${(cash.today.expenses.agency || 0).toLocaleString()}</b></div></div>`;
    return agency + `<div class="bsec"><h4>${t('mk.sns')}</h4><div class="brow"><span>${t('mk.followers')}</span><span class="sp"></span><b>${m.followers.toLocaleString()}</b></div><div class="dim">${manager}</div>${Object.keys(CHANNELS).map(channel).join('')}${buzz}</div>
      <div class="bsec"><h4>${t('mk.ads')}</h4>${campaign('flyers')}${campaign('instaAd')}<div class="brow"><span>${t('mk.influencer')}</span><span class="dim">${t('mk.infNote', INFLUENCER_FEE)}</span><span class="sp"></span>${influencer}</div><div class="dim">${INFLUENCER_POSTS.map(p => t('mk.infTier.' + p.tier, p.min.toLocaleString(), Math.round(p.demand * 100), p.days, Math.abs(p.rep))).join('<br>')}</div></div>${this.#hairShow()}`;
  }
  /** The hair show, once it is unlocked: what it costs and brings, and when it can be held again. */
  #hairShow() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, m = g.marketing, day = g.clock.day;
    if (!g.isUnlocked('hairShow')) return '';
    const wait = m.showReady - day, gain = Math.max(HAIR_SHOW.minFollowers, Math.round(m.followers * HAIR_SHOW.share)), running = m.active.find(a => a.id === 'hairShow');
    const btn = wait > 0 ? `<span class="dim">${t('show.wait', wait)}</span>` : `<button class="go" data-do="hairShow" ${g.economy.canAfford(HAIR_SHOW.cost) ? '' : 'disabled'}>${t('show.btn', HAIR_SHOW.cost.toLocaleString())}</button>`;
    return `<div class="bsec"><h4>${t('show.title')}</h4><div class="dim">${t('show.desc', gain.toLocaleString(), HAIR_SHOW.rep, Math.round(HAIR_SHOW.demand * 100), HAIR_SHOW.days)}</div>${running ? `<div class="good">${t('show.on', running.daysLeft)}</div>` : ''}<div class="brow"><span class="sp"></span>${btn}</div></div>`;
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
  /** The clients tab in three pages: the reviews, the regulars' book and the special bookings. */
  #clients() {
    const lvl = this.game.progression.level, open = k => k === 'reviews' || shows('clients.' + k, lvl);
    if (!open(this.clientPage)) this.clientPage = 'reviews';
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, page = this.clientPage, keys = [['reviews', t('cl.reviews')], ['regulars', t('cl.regulars', g.regulars)], ['special', t('cl.special')]].filter(([k]) => open(k));
    const tabs = keys.length < 2 ? '' : `<div class="seg stabs">${keys.map(([k, l]) => `<button data-do="clp:${k}" class="${page === k ? 'sel' : ''}">${l}${k === 'special' && g.special && (g.special.state === 'due' || g.special.state === 'arrived') ? ' ✦' : ''}</button>`).join('')}</div>`;
    return tabs + (page === 'regulars' ? this.#regulars() : page === 'special' ? this.#specials() : this.#reviews());
  }
  /** The regulars' book: how hearts work, then each named regular with their stylist, visits and story so far. */
  #regulars() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, B = g.regularBook, name = n => this.i18n.name(n), pct = v => Math.round(v * 100);
    const hearts = n => `<span class="hearts">${'♥'.repeat(n)}<span class="dim">${'♡'.repeat(MAX_HEARTS - n)}</span></span>`;
    const rules = [t('reg.r.heart', pct(HEART_UP), pct(HEART_DOWN)), t('reg.r.fav', pct(FAVOURITE_SATISFACTION)), t('reg.r.friend', HEART_FRIEND, pct(FRIEND_CHANCE)), t('reg.r.loyal', HEART_LOYAL, pct(LOYAL_PAY - 1)),
      t('reg.r.story', CHAPTER_VISITS.join('·'), CHAPTER_DAYS), t('reg.r.occ', OCCASION_PAY, pct(OCCASION_NEED), OCCASION_HEARTS), t('reg.r.gift', STORY_GIFT)].map(r => `<div class="dim">· ${r}</div>`).join('');
    const card = e => {
      const story = STORIES[e.story], next = e.chapter + 1;
      const lines = story.slice(0, next).map((ch, i) => `<div class="say"><b>${i + 1}</b>${t('story.' + e.story + '.' + i)}${ch.occasion ? ` <span class="gold">· ${t('occ.' + ch.occasion)}</span>` : ''}</div>`).join('');
      const wait = Math.max(0, (e.chapterDay ?? -CHAPTER_DAYS) + CHAPTER_DAYS - g.clock.day);
      const upcoming = next < story.length ? t('reg.next', CHAPTER_VISITS[next], next + 1) + (wait ? ' · ' + t('reg.wait', wait) : '') : t(e.lifelong ? 'reg.storyDone' : 'reg.storyLast');
      const reward = e.lifelong ? `<div class="say"><b>✓</b>${t('story.' + e.story + '.end')}</div>` : `<div class="dim">${t('reg.reward', STORY_GIFT, this.hooks.storyReward(STORY_REWARDS[e.story], e.stylist))}</div>`;
      return `<div class="rcard ${e.lifelong ? 'life' : ''}"><div class="brow"><b>${name(e.name)}</b>${e.lifelong ? `<span class="chip boss">${t('reg.lifelong')}</span>` : ''}<span class="sp"></span>${hearts(e.hearts)}</div>`
        + `<div class="brow dim"><span>${t('reg.fav', e.stylist ? name(e.stylist) : t('reg.anyone'))}</span><span class="sp"></span><span>${t('reg.visits', e.visits, e.lastDay)}</span></div>`
        + `${lines || `<div class="dim">${t('reg.noStory')}</div>`}<div class="dim">${t('reg.chapter', Math.max(0, next), story.length)} · ${upcoming}</div>${reward}</div>`;
    };
    const list = B.entries.slice().sort((a, b) => b.lifelong - a.lifelong || b.hearts - a.hearts || b.visits - a.visits);
    return `<div class="bsec"><h4>${t('reg.title')}</h4><div>${t('reg.count', g.regulars, B.size, BOOK_SIZE, B.lifelong)}</div><div class="dim">${t('reg.note')}</div>${rules}</div>`
      + `<div class="bsec">${list.length ? list.map(card).join('') : `<div class="dim">${t('reg.empty')}</div>`}</div>`;
  }
  /** Special bookings: today's, what each kind asks and pays, and how past ones went. */
  #specials() {
    const t = (k, ...a) => this.#t(k, ...a), g = this.game, s = g.special, lvl = g.progression.level, pct = v => Math.round(v * 100);
    const today = s ? `<div class="rcard sp"><div class="brow"><b class="gold">✦ ${t('sp.' + s.kind)}</b><span class="sp"></span><span>${s.hour}:00 · ${t('sp.state.' + s.state)}</span></div><div>${t('sp.terms', pct(s.need), s.reward.toLocaleString(), s.followers.toLocaleString(), s.rep)}</div>${s.name ? `<div class="dim">${t('sp.who', this.i18n.name(s.name))}</div>` : ''}</div>`
      : `<div class="dim">${lvl < SPECIAL_LEVEL ? t('sp.locked', SPECIAL_LEVEL) : t('sp.none', pct(SPECIAL_CHANCE))}</div>`;
    const kinds = Object.entries(SPECIALS).map(([k, v]) => `<div class="brow ${v.level <= lvl ? '' : 'dim'}"><b>${t('sp.' + k)}</b><span class="sp"></span><span>${v.level <= lvl ? t('sp.row', pct(v.need), v.reward.toLocaleString(), v.followers.toLocaleString(), v.rep) : t('sp.fromLv', v.level)}</span></div>`).join('');
    const log = g.specialLog.map(x => `<div class="brow"><span>${t('rv.day', x.day)} · ${t('sp.' + x.kind)}</span><span class="sp"></span><span class="${x.ok ? 'good' : 'bad'}">${x.sat}% ${x.ok ? '✓' : '✗'}</span></div>`).join('');
    return `<div class="bsec"><h4>${t('sp.today')}</h4>${today}${s?.kind==='idol'?`<div class="dim">${t('dept.idolFlow')}</div>`:''}</div><div class="bsec"><h4>${t('sp.kinds')}</h4><div class="dim">${t('sp.note', SPECIAL_PRICE, SPECIAL_PATIENCE, -SPECIAL_FAIL_REP, pct(SPECIAL_CHANCE))}</div>${kinds}</div>`
      + `<div class="bsec"><h4>${t('sp.log')}</h4>${log || `<div class="dim">${t('sp.logNone')}</div>`}</div>`;
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
  /** How high reputation can go on today's reviews, once there are enough of them. */
  #repCeiling(t) { const g = this.game, top = g.reputation.ceiling; return (top < 100 ? `<div class="dim">${t('prog.repCeiling', Math.floor(top), g.reviews.rating.toFixed(2), REP_CEILING.base, REP_CEILING.perStar)}</div>` : '')
    + `<div class="dim">${t('prog.repGain', Math.round(g.reputation.gainShare * 100))}</div>`; }
  /** The growth tab: levels and missions, or the style book. */
  #progress() {
    const t = (k, ...a) => this.#t(k, ...a), b = this.game.book;
    const tabs = `<div class="seg stabs">${[['grow', t('pg.grow')], ['book', t('pg.book', b.size, STYLE_BOOK_SIZE)]].map(([k, v]) => `<button data-do="pgp:${k}" class="${this.progPage === k ? 'sel' : ''}">${v}</button>`).join('')}</div>`;
    return tabs + (this.progPage === 'book' ? this.#book() : this.#growth());
  }
  /** How much fight the rival has left: a bar, yesterday's change and why, and when it closes at that pace. */
  #footing(r, t, pct) {
    const F = FOOTING, ch = Math.round(r.lastChange), left = Math.round(r.footing), when = r.closesIn;
    return `<div class="brow"><span>${t('rv2.footing', r.name)}</span><span class="sp"></span><b>${left} / ${r.maxFooting}</b></div><div class="meter rival"><i style="width:${Math.round(left / r.maxFooting * 100)}%"></i></div>`
      + (r.lastShare == null ? '' : `<div class="${ch < 0 ? 'good' : 'bad'}">${t(ch < 0 ? 'rv2.wore' : 'rv2.mended', pct(r.lastShare), Math.abs(ch), pct(F.hold))}${when ? ' · ' + t('rv2.closesIn', when) : ''}</div>`)
      + `<div class="dim">${t('rv2.footingNote', pct(F.hold), F.wear / 100, F.mend / 100, REOPEN_DAYS[0], REOPEN_DAYS[1], F.perTier)}</div>`;
  }
  /** The style book: how full it is, the next reward, then every section's styles (??? until first done). */
  #book() {
    const t = (k, ...a) => this.#t(k, ...a), b = this.game.book, next = MILESTONES[b.paid];
    const name = key => { const [k, id] = key.split(':'); return k === 'col' ? (this.i18n.lang === 'ko' ? WANT_KO[+id] : WANT[+id][0]) : t(k + '.' + id); };
    const chip = key => { const e = b.entries[key]; if (!e) return '<span class="bchip off">???</span>';
      const sig = b.isSignature(key); return `<span class="bchip${sig ? ' sig' : e.star ? ' star' : ''}" title="${t('book.best', Math.round(e.best * 100))}"><span>${name(key)}${e.star ? ' ★' : ''}</span><i>${e.n}</i></span>`; };
    const head = `<div class="bsec"><h4>${t('book.title', b.size, STYLE_BOOK_SIZE)}</h4><div>${t('book.counts', b.stars, b.signatures.length)}</div>`
      + `<div class="dim">${t('book.note', Math.round(PERFECT * 100), SIGNATURE, Math.round((SIGNATURE_PAY - 1) * 100))}</div>`
      + (next ? `<div class="brow"><span>${t('book.next', next.at, b.size)}</span><span class="sp"></span><span class="gold">${t('book.reward', next.cash.toLocaleString(), next.followers)}</span></div>` : `<div class="good">${t('book.full')}</div>`) + '</div>';
    return head + Object.entries(BOOK_GROUPS).map(([g, keys]) => `<div class="bsec"><h4>${t('book.g.' + g)} <span class="dim">${keys.filter(k => b.entries[k]).length}/${keys.length}</span></h4><div class="bookgrid">${keys.map(chip).join('')}</div></div>`).join('');
  }
  #growth() {
    const t = (k, ...a) => this.#t(k, ...a), p = this.game.progression, next = p.next, ctx = this.game.context;
    return this.#missions() + `<div class="bsec"><h4>${t('prog.current', p.level, t('lv.' + p.level))}</h4><div>${next ? t('prog.next', t('goal.' + next.level, ...next.goal(ctx))) : t('prog.max')}</div>${this.#repCeiling(t)}</div><div class="bsec"><h4>${t('prog.unlocks')}</h4>${p.all.map(l => `<div class="brow"><span class="${l.level <= p.level ? 'good' : 'dim'}">${l.level <= p.level ? '✓' : '·'} ${l.level}. ${t('lv.' + l.level)}</span><span class="sp"></span><span class="dim">${[...l.unlocks.map(u => t('u.' + u)), ...featuresAt(l.level).map(k => t('feat.' + k))].join(', ')}</span></div>`).join('')}</div>`;
  }

  handle(action, value) {
    const g = this.game, e = g.staff.find(value);
    const run = {
      hire: () => this.hooks.hire(e), fire: () => this.hooks.fire(e),
      netflagship: () => { if(g.network.upgrade())this.hooks.networkChanged?.(); }, netopen: () => g.network.open(value), netcoach: () => g.network.coach(value), netpause: () => g.network.toggle(value), netlead: () => this.hooks.lead?.(),
      depthire: () => g.departments.hire(value), deptfire: () => g.departments.fire(value), depttrain: () => g.departments.train(value), deptpromote: () => g.departments.promote(value),
      shire: () => { if (g.staff.hire(e)) this.hooks.syncSupport(); }, sfire: () => { if (g.staff.fire(e)) this.hooks.syncSupport(); }, train: () => { if (g.trainStaff(e)) g.bus.emit('staff:levelup', e); }, claim: () => { if (g.claimMission(+value)) this.hooks.spent(); },
      rest: () => { e.restUntil = this.hooks.now() + 20; e.rest(50); },
      price: () => { if (!g.priceLocked) g.priceLevel = +value; }, openBranch: () => this.hooks.openBranch(), hairShow: () => { const n = g.hostHairShow(); if (n != null) this.hooks.hairShow(n); }, bexpand: () => { if (g.expandBranch()) this.hooks.branchExpanded(); }, monthView: () => this.hooks.openMonth(), view: () => this.hooks.viewSite(+value),
      expand: () => { if (g.expand()) this.hooks.expanded(); },
      buy: () => this.build.start(value), move: () => { const it = g.layout.items[+value]; this.build.start(it.id, it); },
      sell: () => this.build.sell(g.layout.items[+value]), rot: () => this.build.rotate(), cancel: () => this.build.cancel(),
      post: () => this.hooks.post(value), campaign: () => { if (g.runCampaign(value)) this.hooks.spent(); }, influencer: () => { if (g.staff.receptionist.hired) g.marketing.bookInfluencer(g.clock.day); },
      reply: () => { const [id, kind] = value.split('.'); this.hooks.reply(+id, kind); }, rvf: () => { this.reviewFilter = value; this.reviewLimit = 25; }, clp: () => { this.clientPage = value; }, mkp: () => { this.mktPage = value; }, mkauto: () => { const [k, on] = value.split('.'); g.marketing.auto[k] = on === '1'; g.marketing.version++; }, line: () => { this.line = value; }, research: () => { if (g.startResearch(value, this.line)) this.hooks.spent(); }, restock: () => { const [type, n] = value.split('.'); if (g.brand.restock(type, +n, g.economy)) this.hooks.spent(); }, concept: () => { this.concept = value; }, enter: () => { if (g.enterContest(value, this.concept)) this.hooks.spent(); },
      matchwar: () => { g.matchPriceWar(); }, scout: () => { const s = g.staff.find(value), cost = g.scoutCost(value); if (!s || !cost) return; s.hireCost = cost; this.hooks.hire(s); if (s.hired) { g.rival.lose(value); this.hooks.scouted(s); } }, welfare: () => { const [id, on] = value.split('.'); g.staff.setWelfare(id, on === '1'); }, talk: () => { const c = g.staff.talk(e, g.clock.day); if (c) this.hooks.talked(e, c); }, promote: () => { if (g.staff.promote(e)) this.hooks.promoted(e); }, study: () => { if (g.staff.study(g.clock.day)) this.hooks.spent(); }, cert: () => { const [id, c] = value.split('.'); const who = g.staff.find(id); if (g.staff.takeCert(who, c, g.clock.day)) this.hooks.certified(who, c); }, bdp: () => { this.buildPage = value; }, pgp: () => { this.progPage = value; }, bdc: () => { this.shopCat = value; }, bdo: () => { this.ownedCat = value; }, stp: () => { this.staffPage = value; }, sfr: () => { this.staffRole = value; if (value !== 'all' && value !== 'designer') { this.staffSpec = 'all'; this.staffPerk = 'all'; } }, rhire: () => { const [id, site] = value.split('.'), who = g.staff.find(id); if (who && g.staff.hireAt(who, +site)) this.hooks.syncSupport(); }, bzp: () => { this.bizPage = value; }, bzs: () => { const [p, k] = value.split('.'); this.bizSub[p] = k; }, lsort: () => { this.ladderSort = value; }, sfs: () => { this.staffSpec = value; }, sfp: () => { this.staffPerk = value; }, rvmore: () => { this.reviewLimit += 25; },
      amen: () => g.hospitality.toggle(value), autoreply: () => { g.reviews.autoReply = !g.reviews.autoReply; g.reviews.version++; }, lastcall: () => g.setLastCall(+value), closing: () => { if (CLOSING.includes(value)) g.closingPolicy = value; }, hrs: () => g.shiftHours(value[0] === 'o' ? 0 : 1, value[1] === '+' ? 1 : -1),
      commission: () => { if (!g.hqFx.commission) g.staff.setCommission(+value); }, shuffle: () => g.staff.setSeatShuffle(value === '1'),
      seat: () => { const [id, i] = value.split('.'), who = id === 'owner' ? g.staff.owner : g.staff.find(id); if (who) this.hooks.moveSeat(who, +i); }, dinner: () => { if (g.staff.teamDinner(g.clock.day)) this.hooks.spent(); },
      bonus: () => { if (g.staff.giveBonus(e)) this.hooks.spent(); }, leave: () => g.staff.sendOnLeave(e, g.clock.day), mtrain: () => { if (g.staff.trainMarketing(e)) this.hooks.spent(); },
      invest: () => { if (g.investIn(+value)) this.hooks.spent(); }, buyback: () => { if (g.buyBackStake()) this.hooks.spent(); },
      loan: () => { if (g.finance.takeLoan(+value)) this.hooks.spent(); }, repay: () => g.finance.repayLoan(),
    }[action];
    if (run) run();
  }
}
