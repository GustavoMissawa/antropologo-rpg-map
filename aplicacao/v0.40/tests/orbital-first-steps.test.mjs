import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceFirstSteps, pendingFirstStepsCue, FIRST_STEPS_IDLE_MS} from '../lib/orbital-first-steps.ts';

const initial = {settings: 'pending', systems: 'pending', disk: 'pending'};
const advance = (...actions) => actions.reduce(advanceFirstSteps, initial);

test('Primeiros Passos respeita os estágios e oferece 30 s na Home e 10 s em Sistemas', () => {
  assert.deepEqual(FIRST_STEPS_IDLE_MS, {entry: 30000, systems: 30000, disk: 10000});
  assert.equal(pendingFirstStepsCue(null, 'home'), null);
  const opened = advance('settings-opened');
  assert.equal(pendingFirstStepsCue(opened, 'home'), null);
  const settings = advanceFirstSteps(opened, 'settings-closed');
  assert.equal(pendingFirstStepsCue(settings, 'home'), 'systems');
  assert.equal(pendingFirstStepsCue(settings, 'systems'), null);
  const offered = advanceFirstSteps(settings, 'systems-presented');
  assert.equal(pendingFirstStepsCue(offered, 'home'), null);
  assert.equal(pendingFirstStepsCue(offered, 'systems'), null);
  const visited = advanceFirstSteps(offered, 'systems-visited');
  assert.equal(pendingFirstStepsCue(visited, 'systems'), 'disk');
  const disk = advanceFirstSteps(visited, 'disk-presented');
  assert.equal(pendingFirstStepsCue(disk, 'systems'), null);
  assert.deepEqual(advanceFirstSteps(disk, 'disk-used'), {settings:'completed', systems:'completed', disk:'completed'});
});

test('Descobertas em qualquer ordem silenciam os destaques e não podem regredir', () => {
  const explored = advance('disk-used', 'systems-visited', 'settings-closed');
  assert.deepEqual(explored, {settings:'discovered', systems:'discovered', disk:'discovered'});
  for (const action of ['settings-opened','settings-closed','systems-presented','systems-visited','disk-presented','disk-used']) {
    assert.equal(advanceFirstSteps(explored, action), explored);
  }
  assert.equal(pendingFirstStepsCue(explored, 'home'), null);
  assert.equal(pendingFirstStepsCue(explored, 'systems'), null);
});
