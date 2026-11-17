import assert from 'node:assert/strict';
import test from 'node:test';
import {advanceOrbitalRotation} from '../lib/orbital-rotation.ts';

const initial = {phase: 0, speed: 1};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≈ ${b}`);

test('A interação desacelera até 20% e a saída recupera a velocidade sem parar a rotação', () => {
  const entered = advanceOrbitalRotation(initial, .05, true);
  const held = advanceOrbitalRotation(entered, 1, true);
  const leaving = advanceOrbitalRotation(held, .05, false);
  const left = advanceOrbitalRotation(leaving, 1, false);

  assert.ok(entered.speed < 1 && entered.speed > held.speed);
  assert.ok(held.speed >= .2 && held.speed < .201);
  assert.ok(leaving.speed > held.speed && leaving.speed < left.speed);
  assert.ok(left.speed > .999 && left.speed <= 1);
  assert.ok(initial.phase < entered.phase && entered.phase < held.phase);
  assert.ok(held.phase < leaving.phase && leaving.phase < left.phase);
});

test('O avanço é equivalente a 30 e 60 quadros por segundo, inclusive ao alternar rapidamente', () => {
  function simulate(hz) {
    let rotation = initial;
    for (const slow of [false, true, false, true, true, false]) {
      for (let frame = 0; frame < hz / 6; frame++) {
        const next = advanceOrbitalRotation(rotation, 1 / hz, slow);
        assert.ok(next.phase > rotation.phase && next.phase - rotation.phase <= 1 / hz + 1e-10);
        rotation = next;
      }
    }
    return rotation;
  }

  const compact = simulate(30);
  const desktop = simulate(60);
  near(compact.phase, desktop.phase);
  near(compact.speed, desktop.speed);
  assert.deepEqual(advanceOrbitalRotation(desktop, 0, true), desktop);
});
