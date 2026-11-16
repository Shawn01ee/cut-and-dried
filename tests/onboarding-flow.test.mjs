import test from 'node:test';
import assert from 'node:assert/strict';
import { Onboarding } from '../src/tycoon/Onboarding.js';
import { Economy } from '../src/tycoon/Economy.js';

test('first happy visit leads to a seat investment, salon level and first hire in order', () => {
  const o=new Onboarding(), economy=new Economy(2000);
  const game={served:0,layout:{items:[]},progression:{level:1},staff:{hired:[]},economy};
  assert.equal(o.check(game),null);
  game.served=1;o.served(.82);assert.equal(o.check(game).id,'serve');assert.equal(o.check(game).id,'happy');
  assert.equal(o.check(game),null);game.layout.items.push({id:'bench'});assert.equal(o.check(game).id,'seat');
  assert.equal(o.check(game),null);game.progression.level=2;assert.equal(o.check(game).id,'level2');
  assert.equal(o.check(game),null);game.staff.hired.push({id:'stylist'});assert.equal(o.check(game).id,'hire');
  assert.equal(o.done,true);assert.equal(economy.totalEarned,430);
});
