import test from 'node:test';
import assert from 'node:assert/strict';
import { DailyMetrics } from '../src/tycoon/DailyMetrics.js';
import { PerformanceExplainer } from '../src/tycoon/PerformanceExplainer.js';
import { DecisionAdvisor } from '../src/tycoon/DecisionAdvisor.js';
import { DayInsights } from '../src/ui/DayInsights.js';
import { I18n } from '../src/i18n/I18n.js';

test('departures count once and completed services are not closing losses', () => {
  const m = new DailyMetrics(), served = {}, waiting = {}, full = {};
  for (const c of [served, waiting, full]) { m.arrive(c); m.arrive(c); }
  m.service(served, { satisfaction: .9 }); m.service(served, { satisfaction: .1 }); m.leave(served, 'closing');
  m.leave(waiting, 'patience'); m.leave(waiting, 'closing'); m.leave(full, 'seats'); m.leave(full, 'closing');
  assert.deepEqual(m.snapshot(), { arrivals: 3, served: 1, happy: 1, satisfaction: .9, lost: { seats: 1, patience: 1, closing: 0 } });
  const old = m.snapshot(); m.startDay(); m.arrive(served); m.leave(served, 'closing');
  assert.equal(old.lost.closing, 0); assert.equal(m.snapshot().satisfaction, null); assert.equal(m.arrivals, 1);
});

test('ledger contributions reconcile including new and disappeared categories, excluding investments', () => {
  const e = new PerformanceExplainer();
  e.remember({ day: 6, hours: 8, profit: 500, revenue: { services: 1000, gift: 100 }, operating: { wages: 400, rent: 200 } });
  const r = { day: 8, hours: 9, profit: 220, revenue: { services: 900, online: 50 }, operating: { wages: 500, rent: 200, materials: 30 }, investment: { equipment: 5000 } };
  const c = e.explain(r);
  assert.equal(c.day, 6); assert.equal(c.delta, -280);
  assert.equal(c.parts.reduce((s, p) => s + p.amount, 0), c.delta);
  assert.equal(c.parts.find(p => p.category === 'wages').amount, -100);
  assert.ok(!c.parts.some(p => p.category === 'equipment'));
});

test('comparison survives JSON saves, skips missing history and rejects same-day comparison', () => {
  const e = new PerformanceExplainer(), r = { day: 6, hours: 8, profit: 20, revenue: { services: 40 }, operating: { rent: 20 } };
  assert.equal(e.explain(r), null); e.remember(r); r.revenue.services = 0;
  const restored = new PerformanceExplainer(); restored.restore(JSON.parse(JSON.stringify(e)));
  assert.equal(restored.previous.revenue.services, 40); assert.equal(restored.explain(r), null);
  assert.equal(restored.explain({ ...r, day: 8 }).day, 6);
  restored.restore(); assert.equal(restored.explain(r), null);
});

test('advice is bounded and based on recorded events, without modifying the report', () => {
  const a = new DecisionAdvisor(), r = { metrics: { served: 3, happy: 1, lost: { seats: 2, patience: 1, closing: 4 } }, overtime: 1, overtimePay: 20 };
  const before = JSON.stringify(r);
  assert.deepEqual(a.suggest(r).map(x => x.id), ['seats', 'patience']); assert.equal(JSON.stringify(r), before);
  assert.deepEqual(a.suggest({}), []);
  assert.equal(a.suggest({ metrics: { served: 0, happy: 0, lost: {} } })[0].id, 'observe');
});

test('English and Korean render a first day and all advice without missing keys or NaN', () => {
  for (const lang of ['en', 'ko']) {
    const ui = new DayInsights(new I18n(lang)); assert.equal(ui.render({}), '');
    for (const id of ['seats', 'patience', 'closing', 'overtime', 'style', 'observe']) {
      const r = { metrics: { arrivals: 2, served: 1, satisfaction: .8, lost: { seats: 1, patience: 0, closing: 0 } }, advice: [{ id, args: [1, 20] }] };
      const html = ui.render(r); assert.doesNotMatch(html, /ins\.|undefined|NaN/);
      r.comparison = { day: 1, delta: -30, hours: 8, parts: [{ group: 'operating', category: 'wages', amount: -30 }] }; r.hours = 9;
      assert.doesNotMatch(ui.render(r), /ins\.|undefined|NaN/);
    }
  }
});
