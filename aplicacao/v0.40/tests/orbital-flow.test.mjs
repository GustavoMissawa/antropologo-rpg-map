import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitalFlowBand, orbitalFlowPose, prepareOrbitalFlow} from '../lib/orbital-flow.ts';
import {startOrbitalFlow} from '../app/orbital-flow.ts';

function canvas(size = 1024) {
  const calls = [];
  const gradients = [];
  const context = {
    clearRect: (...a) => calls.push(['clear', ...a]),
    save: () => {}, restore: () => {},
    translate: (...a) => calls.push(['center', ...a]),
    rotate: angle => calls.push(['rotate', angle]),
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
    assert.ok(orbitalFlowPose(i, 1).angle > orbitalFlowPose(i, .5).angle);
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
  const clock = {seconds: 4};
  const runFrame = time => {const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time);};
  try {
    const stop = startOrbitalFlow(art, canvas(), canvas(), canvas(), clock);
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
    document.hidden = true; callbacks.get('visibilitychange')();
    assert.equal(frames.size, 0);
    stop();
    assert.equal(art.dataset.flowReady, undefined);
    assert.equal(callbacks.size, 0);
    assert.ok(disconnected);
  } finally {
    Object.assign(globalThis, original);
  }
});
