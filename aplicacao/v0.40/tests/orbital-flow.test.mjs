import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceOrbitalFlow, EXPANDED_ORBITAL_SPEED, orbitalFlowBand, orbitalFlowPose, prepareOrbitalFlow} from '../lib/orbital-flow.ts';
import {startOrbitalFlow} from '../app/orbital-flow.ts';

function canvas(size = 1024) {
  const calls = [];
  const gradients = [];
  const context = {
    clearRect: (...a) => calls.push(['clear', ...a]),
    save: () => {}, restore: () => {},
    translate: (...a) => calls.push(['center', ...a]),
    rotate: angle => calls.push(['rotate', angle]),
    scale: (...a) => calls.push(['scale', ...a]),
    drawImage: (...a) => calls.push(['draw', ...a]),
    createRadialGradient: () => {
      const stops = [];
      gradients.push(stops);
      return {addColorStop: (...a) => stops.push(a)};
    },
    fillRect: () => {},
  };
  return {width: size, height: size, calls, gradients, getContext: () => context};
}

test('O fluxo tem velocidades ordenadas por raio, fase contínua e variação sutil de brilho', () => {
  let previous = Infinity;
  for (let i = 0; i < 11; i++) {
    const {inner, radius, outer, velocity} = orbitalFlowBand(i);
    assert.ok(inner < radius && radius < outer);
    assert.ok(velocity < previous && velocity > 0);
    assert.equal(orbitalFlowPose(i, 0).angle, 0);
    assert.ok(orbitalFlowPose(i, 1).angle < orbitalFlowPose(i, .5).angle);
    for (let second = 0; second < 90; second++) {
      const {angle, intensity} = orbitalFlowPose(i, second);
      assert.ok(angle >= 0 && angle < Math.PI * 2);
      assert.ok(intensity >= .92 && intensity <= 1);
    }
    previous = velocity;
  }
  assert.ok(orbitalFlowBand(0).velocity > orbitalFlowBand(10).velocity * 3);
});

test('As texturas reutilizadas são mascaradas por raio e compõem onze faixas no mesmo centro', () => {
  const original = globalThis.document;
  const textures = [];
  globalThis.document = {createElement: () => {const layer = canvas(); textures.push(layer); return layer;}};
  try {
    const stream = canvas(), dust = canvas(), output = canvas();
    const flow = prepareOrbitalFlow(stream, dust, output);
    assert.equal(output.width, 768);
    flow.paint(0);
    assert.equal(textures.length, 11);
    assert.ok(textures.every(t => t.calls.filter(x => x[0] === 'draw').length === 2));
    assert.ok(textures.every(t => t.gradients[0][0][1] === 'transparent'));
    assert.equal(output.calls.filter(x => x[0] === 'draw').length, 11);
    assert.deepEqual(output.calls.find(x => x[0] === 'center'), ['center', 384, 384]);
    output.calls.length = 0;
    flow.paint(3);
    const angles = output.calls.filter(x => x[0] === 'rotate').map(x => x[1]);
    assert.equal(new Set(angles).size, 11);
    assert.equal(textures.length, 11, 'texturas não são recriadas por quadro');
    output.calls.length = 0;
    flow.paint(3, .07);
    assert.deepEqual(output.calls.filter(x => x[0] === 'rotate').map(x => x[1]), angles);
    assert.equal(output.calls.filter(x => x[0] === 'scale').length, 5, 'as faixas das âncoras mantêm a projeção');
    flow.dispose();
    assert.ok(textures.every(t => t.width === 0 && t.height === 0));
    textures.length = 0;
    document.createElement = () => {
      const layer = canvas();
      if (textures.length === 2) layer.getContext = () => null;
      textures.push(layer);
      return layer;
    };
    assert.equal(prepareOrbitalFlow(stream, dust, output), null);
    assert.ok(textures.every(t => t.width === 0 && t.height === 0), 'falha parcial libera as texturas');
  } finally {
    globalThis.document = original;
  }
});

test('O compositor pausa sem apagar a fase, retoma e libera frames e observadores', () => {
  const original = Object.fromEntries(['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame','matchMedia'].map(k => [k,globalThis[k]]));
  const frames = new Map(), callbacks = new Map();
  let frameId = 0, notify, disconnected = false;
  globalThis.document = {
    hidden: false, createElement: () => canvas(),
    addEventListener: (k,v) => callbacks.set(k,v), removeEventListener: k => callbacks.delete(k),
  };
  globalThis.matchMedia = () => ({matches: false});
  globalThis.MutationObserver = class {constructor(fn) {notify = fn;} observe() {} disconnect() {disconnected = true;}};
  globalThis.requestAnimationFrame = fn => {frames.set(++frameId, fn); return frameId;};
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const art = {dataset: {motion: 'paused'}};
  const clock = {seconds: 4, speed: 1};
  const observed = [];
  const phases = new Set();
  let painted = null;
  const critical = {
    event: {current: null},
    paint: sample => {
      painted = sample;
      if (sample) phases.add(sample.phase);
    },
  };
  const runFrame = time => {const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time);};
  try {
    const stop = startOrbitalFlow(art, canvas(), canvas(), canvas(), clock, seconds => observed.push(seconds), critical);
    assert.equal(art.dataset.flowReady, 'true');
    assert.equal(frames.size, 0);
    art.dataset.motion = 'running'; notify();
    runFrame(100); runFrame(130);
    assert.equal(clock.seconds, 4.03);
    art.dataset.motion = 'paused'; notify();
    assert.equal(frames.size, 0);
    art.dataset.motion = 'running'; notify();
    runFrame(9000); runFrame(9030);
    assert.ok(Math.abs(clock.seconds - 4.06) < 1e-9);
    art.dataset.diskSelected = 'true'; notify();
    for (let time = 9060; frames.size && time < 11000; time += 30) runFrame(time);
    assert.equal(art.dataset.motion, 'running', 'o D20 continua ativo');
    assert.equal(art.dataset.diskMotion, 'stopped');
    assert.equal(clock.speed, 0);
    assert.equal(frames.size, 0, 'o disco parado não mantém um loop ocioso');
    const frozen = clock.seconds;
    art.dataset.diskCruising = 'true'; notify();
    for (let time = 12000; frames.size && time <= 13500; time += 30) runFrame(time);
    assert.equal(art.dataset.diskMotion, 'cruising');
    assert.equal(clock.speed, EXPANDED_ORBITAL_SPEED);
    assert.ok(clock.seconds > frozen && clock.seconds - frozen < 1.5 * EXPANDED_ORBITAL_SPEED);
    assert.equal(observed.at(-1), clock.seconds, 'o marcador usa a mesma fase do Canvas');
    assert.equal(frames.size, 1);
    const beforeBoost = clock.seconds;
    art.dataset.diskBoost = 'true'; notify();
    runFrame(13530);
    assert.equal(art.dataset.diskMotion, 'resuming');
    assert.ok(clock.speed > EXPANDED_ORBITAL_SPEED && clock.speed < EXPANDED_ORBITAL_SPEED * 2);
    assert.ok(clock.seconds > beforeBoost && clock.seconds - beforeBoost < .03);
    for (let time = 13560; time <= 15000; time += 30) runFrame(time);
    assert.equal(clock.speed, EXPANDED_ORBITAL_SPEED * 2);
    art.dataset.diskBoost = 'false'; notify();
    runFrame(15030);
    assert.equal(art.dataset.diskMotion, 'stopping');
    for (let time = 15060; time <= 16500; time += 30) runFrame(time);
    assert.equal(clock.speed, EXPANDED_ORBITAL_SPEED);
    const beforeReturn = clock.seconds;
    art.dataset.diskCruising = 'false';
    art.dataset.diskSelected = 'false'; notify();
    runFrame(16530);
    assert.equal(art.dataset.diskMotion, 'resuming');
    assert.ok(clock.seconds > beforeReturn && clock.seconds - beforeReturn < .03);
    art.dataset.diskSelected = 'true'; notify();
    for (let time = 16560; frames.size && time <= 18000; time += 30) runFrame(time);
    assert.equal(clock.speed, 0);
    assert.equal(frames.size, 0);
    const beforeCritical = clock.seconds;
    critical.event.current = {startedAt: 18030};
    art.dataset.cosmicPhase = 'overload';
    notify();
    for (let time = 18030; time <= 20100; time += 30) runFrame(time);
    assert.ok(clock.speed > 2.7);
    assert.equal(art.dataset.cosmicPhase, 'shock');
    assert.ok(painted.jet > .95);
    for (let time = 20130; frames.size && time <= 24000; time += 30) runFrame(time);
    assert.equal(clock.speed, 0);
    assert.ok(clock.seconds > beforeCritical);
    assert.equal(observed.at(-1), clock.seconds);
    assert.equal(critical.event.current, null);
    assert.equal(painted, null);
    assert.equal(art.dataset.cosmicPhase, undefined);
    assert.deepEqual([...phases], ['overload', 'focus', 'jet', 'shock', 'dissipating']);
    document.hidden = true; callbacks.get('visibilitychange')();
    assert.equal(frames.size, 0);
    assert.equal(art.dataset.diskMotion, 'paused');
    assert.ok(observed.every((value, i) => !i || value >= observed[i - 1]));
    stop();
    assert.equal(art.dataset.flowReady, undefined);
    assert.equal(callbacks.size, 0);
    assert.ok(disconnected);
  } finally {
    Object.assign(globalThis, original);
  }
});


test('A seleção freia até zero e a retomada preserva a fase mesmo com inversões rápidas', () => {
  const clock = {seconds: 9, speed: 1};
  advanceOrbitalFlow(clock, .03, 0);
  assert.ok(clock.speed > 0 && clock.speed < 1);
  assert.ok(clock.seconds > 9 && clock.seconds < 9.03);
  const slowed = clock.speed;
  advanceOrbitalFlow(clock, .03, 1);
  assert.ok(clock.speed > slowed && clock.speed < 1);
  for (let i = 0; i < 60; i++) advanceOrbitalFlow(clock, 1 / 60, 0);
  assert.equal(clock.speed, 0);
  const frozen = clock.seconds;
  advanceOrbitalFlow(clock, .5, 0);
  assert.equal(clock.seconds, frozen);
  advanceOrbitalFlow(clock, .03, 1);
  assert.ok(clock.seconds > frozen && clock.seconds < frozen + .03);
  assert.ok(clock.speed > 0 && clock.speed < 1);
  for (let i = 0; i < 60; i++) advanceOrbitalFlow(clock, 1 / 60, 1);
  assert.equal(clock.speed, 1);
});
