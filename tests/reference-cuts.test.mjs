import test from 'node:test';
import assert from 'node:assert/strict';
import { REFERENCE_CUTS, REFERENCE_MENU } from '../src/hair/ReferenceCuts.js';
import { CUTS } from '../src/hair/StyleMenu.js';
import { I18n } from '../src/i18n/I18n.js';

const strands = [0,1,2,3].flatMap(z => [-.1,0,.1].map(x => ({ z, p: { x } })));
test('all 31 reference cuts have distinct, positive, scale-consistent profiles', () => {
  assert.equal(REFERENCE_CUTS.length, 31);
  const profiles = new Set();
  for (const c of REFERENCE_CUTS) {
    const short = c.profile(10,strands), long = c.profile(20,strands);
    assert.ok(short.every(v => Number.isFinite(v) && v > 0));
    short.forEach((v,i) => assert.ok(Math.abs(2*v-long[i])<1e-10));
    profiles.add(JSON.stringify(short));
    assert.ok(c.L[0] > 0 && c.L[0] <= c.L[1] && c.L[1] <= 60);
    assert.ok(c.profile(c.L[0],strands).every(v => v >= 1));
    assert.deepEqual(CUTS[c.id], REFERENCE_MENU[c.id]);
    assert.equal(CUTS[c.id].trend, undefined);
  }
  assert.equal(profiles.size,31);
});

test('reference features differ at the fringe and perimeter', () => {
  const get = id => REFERENCE_CUTS.find(c=>c.id===id).profile(40,strands);
  assert.ok(get('lea')[10] < get('sleek')[10]);
  assert.ok(get('feather')[7] < get('block')[7]);
  assert.notEqual(get('comma')[9],get('comma')[11]);
  assert.equal(get('bono')[9],get('bono')[11]);
});

test('every new menu/shape/description is translated and legacy menu definitions survive', () => {
  for (const lang of ['ko','en']) {
    const i18n = new I18n(lang);
    for (const c of REFERENCE_CUTS) for (const key of ['cut.'+c.id,'shape.'+c.shape,'cut.note.'+c.id]) assert.notEqual(i18n.t(key),key);
  }
  assert.deepEqual(CUTS.hush,{g:'f',shape:'Hush',L:[22,38],price:95,trend:true});
  assert.deepEqual(CUTS.dandy,{g:'m',shape:'Dandy',L:[7,12],price:60});
});
