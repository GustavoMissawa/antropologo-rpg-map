import assert from 'node:assert/strict';
import test from 'node:test';
import {rotateHeroPoint} from '../lib/hero-die-geometry.ts';
import {
  addOrbitalInput, advanceOrbitalDie, advanceOrbitalRotation, beginOrbitalInput,
  createOrbitalDie, endOrbitalInput, rotateOrbitalPoint,
} from '../lib/orbital-rotation.ts';

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

test('O giro autônomo conserva a trajetória anterior e a orientação não se deforma', () => {
  const die = createOrbitalDie();
  for (let i = 0; i < 500; i++) {
    advanceOrbitalDie(die, 1 / 60, false, false);
    const clock = die.automatic.phase;
    const angles = [.51 + Math.sin(clock * .42) * .47, .68 + clock * .57, .26 + clock * .21];
    const point = [.25, -.5, .7];
    const previous = rotateHeroPoint(point, angles);
    rotateOrbitalPoint(point, die.orientation).forEach((n, j) => near(n, previous[j]));
    near(Math.hypot(...die.orientation), 1);
  }
});

test('O controle acumula rotação nos eixos da tela e a inércia volta ao giro orbital sem reposicionar', () => {
  const die = createOrbitalDie();
  const initialPose = [...die.orientation];
  beginOrbitalInput(die, 0);
  addOrbitalInput(die, 0, .75, .04);
  advanceOrbitalDie(die, .15, true, false);
  const horizontal = [...die.orientation];
  assert.notDeepEqual(horizontal, initialPose);
  addOrbitalInput(die, .49, -.29, .065);
  advanceOrbitalDie(die, .15, true, false);
  const diagonal = [...die.orientation];
  assert.notDeepEqual(diagonal, horizontal);
  assert.ok(die.automatic.speed < .04, 'controle manual prevalece sobre a desaceleração orbital');
  endOrbitalInput(die, .07, true);
  assert.ok(Math.hypot(die.velocity.pitch, die.velocity.yaw) > 0);
  assert.deepEqual(die.orientation, diagonal);
  const early = Math.hypot(die.velocity.pitch, die.velocity.yaw);
  advanceOrbitalDie(die, .11, true, false);
  assert.ok(Math.hypot(die.velocity.pitch, die.velocity.yaw) < early);
  for (let i = 0; i < 100; i++) advanceOrbitalDie(die, 1 / 60, true, false);
  assert.ok(Math.abs(die.automatic.speed - .2) < .001);
  assert.ok(Math.hypot(die.velocity.pitch, die.velocity.yaw) < .001);
  assert.notDeepEqual(die.orientation, initialPose);
});

test('Com movimento reduzido, o dado só responde ao comando direto, sem giro ou inércia', () => {
  const die = createOrbitalDie();
  const initialPose = [...die.orientation];
  beginOrbitalInput(die, 0);
  advanceOrbitalDie(die, .2, false, true);
  die.orientation.forEach((n, i) => near(n, initialPose[i]));
  addOrbitalInput(die, -.4, 0, .03);
  advanceOrbitalDie(die, 0, false, true);
  const manualPose = [...die.orientation];
  assert.notDeepEqual(initialPose, manualPose);
  endOrbitalInput(die, .031, false);
  advanceOrbitalDie(die, .5, false, true);
  die.orientation.forEach((n, i) => near(n, manualPose[i]));
  assert.equal(die.automatic.phase, 0);
});

test('A saída após um gesto estacionado evita reaproveitar velocidade antiga', () => {
  const die = createOrbitalDie();
  beginOrbitalInput(die, 0);
  addOrbitalInput(die, 0, .7, .02);
  endOrbitalInput(die, 1, true);
  assert.ok(Math.hypot(die.velocity.pitch, die.velocity.yaw) < .001);
});
