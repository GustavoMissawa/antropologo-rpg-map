import assert from 'node:assert/strict';
import test from 'node:test';
import {act, clickButton, mountPlatform, preferences, waitFor} from './helpers/platform-dom.mjs';
import {faceNormal, projectOrbitalDie} from '../lib/hero-die-geometry.ts';
import {ORBITAL_DICE, orbitalDieMeshes} from '../lib/orbital-die-geometry.ts';
import {createOrbitalRoll} from '../lib/orbital-die-roll.ts';
import {alignOrbitalFace, createOrbitalDie, interpolateOrbitalOrientation, rotateOrbitalPoint} from '../lib/orbital-rotation.ts';

test('Cada face dos seis dados Orbital pode ser sorteada, alinhada e receber um número legível', () => {
  const orientation = createOrbitalDie().orientation;
  for (const kind of ORBITAL_DICE) {
    const mesh = orbitalDieMeshes[kind];
    for (const [index, face] of mesh.faces.entries()) {
      const result = createOrbitalRoll(kind, orientation, () => (index + .5) / kind);
      assert.equal(result.value, index + 1);
      const [x, y, z] = rotateOrbitalPoint(faceNormal(face, mesh.vertices), result.target);
      assert.ok(Math.abs(x) + Math.abs(y) < 1e-10 && z > 0);
      const frame = projectOrbitalDie(point => rotateOrbitalPoint(point, result.target), mesh);
      assert.ok(frame.faces[index].visible, `D${kind} face ${result.value}`);
      const points = frame.faces[index].points.split(' ').map(point => point.split(',').map(Number));
      for (const [i, [ax, ay]] of points.entries()) {
        const [bx, by] = points[(i + 1) % points.length];
        const distance = ((bx - ax) * (result.y - ay) - (by - ay) * (result.x - ax)) / Math.hypot(bx - ax, by - ay);
        assert.ok(distance > result.fontSize / 2, 'o resultado fica dentro do polígono');
      }
      assert.ok(result.fontSize > 20);
    }
  }
});

test('O alinhamento resolve a face oposta à câmera e a interpolação conserva a escala', () => {
  const start = [0, 0, 0, 1];
  const target = alignOrbitalFace(start, [0, 0, -1]);
  assert.equal(rotateOrbitalPoint([0, 0, -1], target)[2], 1);
  for (const progress of [0, .2, .5, .9, 1]) {
    const pose = interpolateOrbitalOrientation(start, target, progress);
    assert.ok(Math.abs(Math.hypot(...pose) - 1) < 1e-10);
  }
  assert.deepEqual(interpolateOrbitalOrientation(start, target, 0), start);
  assert.deepEqual(interpolateOrbitalOrientation(start, target, 1), target);
});

async function setup(t) {
  sessionStorage.clear();
  window.history.replaceState(null, '', '#inicio');
  await preferences({motionReduced: true});
  const ui = await mountPlatform();
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await ui.close();
  }
  t.after(async () => {
    await close();
    await preferences({motionReduced: false});
  });

  const model = ui.host.querySelector('.orbital-d20');
  const surface = ui.host.querySelector('.orbital-d20-control');
  const number = model.querySelector('.orbital-die-result');
  let now = 0;
  let timer = 0;
  const timers = new Map();
  t.mock.method(performance, 'now', () => now);
  t.mock.method(window, 'setTimeout', (callback, delay) => {
    timers.set(++timer, {at: now + delay, callback});
    return timer;
  });
  t.mock.method(window, 'clearTimeout', id => timers.delete(id));

  const animations = [];
  number.animate = (frames, options) => {
    const animation = {
      frames, options, onfinish: null, cancelled: false,
      cancel() { this.cancelled = true; },
      finish() { this.onfinish?.(); },
    };
    animations.push(animation);
    return animation;
  };

  function advance(milliseconds) {
    const end = now + milliseconds;
    for (;;) {
      const upcoming = [...timers].sort(([, a], [, b]) => a.at - b.at)[0];
      if (!upcoming || upcoming[1].at > end) break;
      const [id, scheduled] = upcoming;
      timers.delete(id);
      now = scheduled.at;
      scheduled.callback();
    }
    now = end;
  }

  function pointer(type, x = 50, pointerType = 'mouse') {
    const event = new MouseEvent(type, {clientX: x, clientY: 70, button: 0});
    Object.defineProperties(event, {
      pointerId: {value: pointerType === 'mouse' ? 1 : 2},
      pointerType: {value: pointerType}, isPrimary: {value: true},
    });
    surface.dispatchEvent(event);
  }

  function moveFor(milliseconds, pointerType = 'mouse') {
    pointer('pointermove', 55, pointerType);
    for (let step = 100; step <= milliseconds; step += 100) {
      advance(100);
      pointer('pointermove', step % 200 ? 68 : 54, pointerType);
    }
  }

  return {
    ...ui, close, model, number, surface, advance, pointer, moveFor, timers, animations,
    phase: () => model.dataset.rollPhase,
    path: () => model.querySelector('.orbital-d20-edges').getAttribute('d'),
  };
}

test('O resultado exige dois segundos de movimento contínuo e a parada, fica visível por 5 s e libera só no fim dos 400 ms', async t => {
  const ui = await setup(t);
  ui.pointer('pointerenter');
  ui.advance(4000);
  assert.equal(ui.phase(), 'idle', 'o tempo parado sobre o dado não conta');
  ui.moveFor(1200);
  ui.advance(300);
  ui.moveFor(1200);
  ui.advance(300);
  assert.equal(ui.phase(), 'idle', 'intervalos de movimento separados não se acumulam');
  ui.moveFor(2000);
  assert.equal(ui.phase(), 'idle', 'os dois segundos qualificam a rolagem, que espera a parada');
  ui.advance(249);
  assert.equal(ui.number.textContent, '');
  ui.advance(1);
  assert.equal(ui.phase(), 'visible');
  assert.match(ui.host.querySelector('.orbital-art [role="status"]').textContent, /^Resultado do D20: (?:[1-9]|1\d|20)$/);
  const face = ui.path();
  assert.equal(ui.timers.size, 1);
  ui.advance(4999);
  assert.equal(ui.phase(), 'visible');
  assert.equal(ui.path(), face);
  ui.advance(1);
  assert.equal(ui.phase(), 'fading');
  assert.equal(ui.animations[0].options.duration, 400);
  ui.pointer('pointermove', 97);
  ui.advance(399);
  assert.equal(ui.phase(), 'fading');
  assert.equal(ui.path(), face);
  assert.equal(ui.animations.length, 1);
  ui.animations[0].finish();
  assert.equal(ui.phase(), 'idle');
  assert.equal(ui.number.textContent, '');
  assert.equal(ui.path(), face);
});

test('O primeiro movimento dispensa o resultado em 200 ms, descarta os deslocamentos e permite uma segunda rolagem', async t => {
  const ui = await setup(t);
  ui.pointer('pointerenter');
  ui.moveFor(2100);
  ui.advance(250);
  assert.equal(ui.phase(), 'visible');
  const face = ui.path();
  ui.advance(100);
  ui.pointer('pointermove', 96);
  const fade = ui.animations[0];
  const finish = fade.onfinish;
  assert.equal(ui.phase(), 'fading');
  assert.equal(fade.options.duration, 200);
  assert.equal(ui.timers.size, 0);
  for (const x of [45, 100, 48, 90, 51]) {
    ui.advance(35);
    ui.pointer('pointermove', x);
    assert.equal(ui.path(), face);
  }
  assert.equal(ui.animations.length, 1);
  fade.finish();
  await act(async () => new Promise(resolve => requestAnimationFrame(resolve)));
  assert.equal(ui.path(), face, 'o desbloqueio não consome o movimento anterior');
  ui.pointer('pointermove', 67);
  await waitFor(() => ui.path() !== face);
  ui.moveFor(2100);
  ui.advance(250);
  assert.equal(ui.phase(), 'visible');
  finish();
  ui.advance(2700);
  assert.equal(ui.phase(), 'visible', 'o timer e o fade antigos não atingem o novo resultado');
  assert.equal(ui.timers.size, 1);
  await ui.close();
  assert.equal(ui.timers.size, 0);
});

test('Um clique inicia a rolagem e um segundo clique dispensa o resultado', async t => {
  const ui = await setup(t);
  const click = () => ui.surface.dispatchEvent(new MouseEvent('click', {detail: 1}));
  ui.pointer('pointerdown', 50, 'mouse');
  click();
  assert.equal(ui.phase(), 'visible', 'o movimento reduzido revela a face imediatamente');
  assert.match(ui.number.textContent, /^(?:[1-9]|1\d|20)$/);
  const face = ui.path();
  click();
  click();
  assert.equal(ui.phase(), 'fading');
  assert.equal(ui.animations.length, 1);
  assert.equal(ui.path(), face);
  ui.animations[0].finish();
  assert.equal(ui.phase(), 'idle');
});

test('O toque exige um segundo de arraste e a seleção orbital cancela o efeito em curso', async t => {
  const ui = await setup(t);
  let capture = null;
  ui.surface.setPointerCapture = id => {capture = id;};
  ui.surface.hasPointerCapture = id => capture === id;
  ui.surface.releasePointerCapture = () => {capture = null;};
  ui.pointer('pointerdown', 50, 'touch');
  ui.pointer('pointerup', 50, 'touch');
  ui.surface.dispatchEvent(new MouseEvent('click', {detail: 1}));
  assert.equal(ui.phase(), 'idle', 'um toque sem arrastar não lança o dado');
  ui.pointer('pointerdown', 50, 'touch');
  ui.moveFor(900, 'touch');
  ui.pointer('pointerup', 54, 'touch');
  ui.advance(250);
  assert.equal(ui.phase(), 'idle');
  ui.pointer('pointerdown', 50, 'touch');
  ui.moveFor(1000, 'touch');
  ui.pointer('pointerup', 55, 'touch');
  ui.advance(250);
  assert.equal(ui.phase(), 'visible');
  const face = ui.path();
  ui.pointer('pointerdown', 42, 'touch');
  assert.equal(ui.phase(), 'visible', 'só tocar sem arrastar conserva o resultado');
  ui.pointer('pointermove', 64, 'touch');
  const fade = ui.animations[0];
  const finish = fade.onfinish;
  assert.equal(ui.phase(), 'fading');
  assert.equal(ui.path(), face);
  await clickButton(ui.host.querySelector('.orbital-navigation'), 'Sistemas');
  assert.notEqual(ui.model.dataset.die, '20');
  assert.equal(ui.phase(), 'idle');
  assert.equal(fade.cancelled, true);
  assert.equal(capture, null);
  finish();
  ui.advance(6000);
  const modelPath = ui.path();
  ui.surface.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true}));
  await waitFor(() => ui.path() !== modelPath);
});

test('A revelação pulsa um vértice frontal, recorta o brilho e respeita movimento reduzido', async t => {
  const ui = await setup(t);
  const glow = ui.model.querySelector('.orbital-vertex-glow');
  const clip = ui.model.querySelector('.orbital-vertex-clip');
  const frames = new Map();
  let frameId = 0;
  for (const [name, callback] of [
    ['requestAnimationFrame', draw => { frames.set(++frameId, draw); return frameId; }],
    ['cancelAnimationFrame', id => frames.delete(id)],
  ]) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {configurable: true, value: callback});
    t.after(() => Object.defineProperty(globalThis, name, original));
  }
  let now = 0;
  function drawFrame(elapsed = 32) {
    now += elapsed;
    ui.advance(elapsed);
    const queued = [...frames.values()];
    frames.clear();
    for (const draw of queued) draw(now);
  }
  let pulse;
  glow.animate = (frames, options) => {
    pulse = {frames, options, onfinish: null, cancel() {}};
    return pulse;
  };
  assert.equal(glow.getAttribute('visibility'), 'hidden');
  await preferences({motionReduced: false});
  drawFrame(60000);
  drawFrame();
  assert.equal(glow.getAttribute('visibility'), 'visible');
  assert.equal(pulse.frames[1].opacity, .46);
  assert.ok(pulse.options.duration >= 200 && pulse.options.duration <= 450);
  pulse.onfinish();
  drawFrame();
  assert.equal(glow.getAttribute('visibility'), 'hidden', 'os vértices ficam apagados entre pulsos');

  ui.pointer('pointerenter');
  for (let i = 0; i < 32 && glow.getAttribute('visibility') === 'hidden'; i++) {
    ui.pointer('pointermove', i % 2 ? 60 : 50);
    drawFrame();
  }
  assert.equal(glow.getAttribute('visibility'), 'visible');
  assert.equal(pulse.frames[1].opacity, .58);
  pulse.onfinish();

  ui.surface.click();
  for (let i = 0; i < 35; i++) drawFrame();
  assert.equal(ui.phase(), 'visible');
  assert.equal(ui.timers.size, 1, 'o pulso não cria um temporizador de rolagem extra');
  assert.equal(glow.getAttribute('visibility'), 'visible');
  assert.equal(pulse.options.duration, 360);
  assert.equal(pulse.frames.at(0).opacity, 0);
  assert.equal(pulse.frames.at(-1).opacity, 0);
  const front = [...ui.model.querySelectorAll('polygon[visibility="visible"]')];
  const vertex = glow.getAttribute('cx') + ',' + glow.getAttribute('cy');
  assert.ok(front.some(face => face.getAttribute('points').split(' ').includes(vertex)));
  assert.equal(clip.getAttribute('d'), front.map(face => 'M' + face.getAttribute('points') + 'Z').join(''));
  pulse.onfinish();
  assert.equal(glow.getAttribute('visibility'), 'hidden');
  assert.equal(ui.phase(), 'visible');

  ui.surface.click();
  ui.animations[0].finish();
  await preferences({motionReduced: true});
  ui.surface.click();
  assert.equal(ui.phase(), 'visible');
  assert.equal(glow.getAttribute('visibility'), 'hidden');
});

test('O máximo ativa o crítico e a saída antecipada limpa o efeito', async t => {
  const ui = await setup(t);
  const art = ui.host.querySelector('.orbital-art');
  const random = t.mock.method(Math, 'random', () => .999);
  ui.surface.click();
  assert.equal(ui.number.textContent, '20');
  assert.equal(ui.model.dataset.critical, 'true');
  assert.equal(art.dataset.cosmicPhase, 'still');
  assert.equal(ui.model.querySelector('.orbital-critical-edge, .orbital-critical-number'), null);
  assert.equal(ui.timers.size, 1);
  ui.surface.click();
  assert.equal(ui.model.dataset.critical, undefined);
  assert.equal(art.dataset.cosmicPhase, undefined);
  assert.equal(ui.phase(), 'fading');
  ui.animations[0].finish();
  ui.surface.click();
  ui.advance(4999);
  assert.equal(ui.model.dataset.critical, 'true');
  assert.equal(art.dataset.cosmicPhase, 'still');
  assert.equal(ui.phase(), 'visible');
  ui.advance(1);
  assert.equal(ui.model.dataset.critical, undefined);
  assert.equal(art.dataset.cosmicPhase, undefined);
  assert.equal(ui.phase(), 'fading');
  ui.animations[1].finish();
  random.mock.mockImplementation(() => .2);
  ui.surface.click();
  assert.equal(ui.number.textContent, '5');
  assert.equal(ui.model.dataset.critical, undefined);
  assert.equal(art.dataset.cosmicPhase, undefined);
});

test('Cada um dos seis dados dispara o evento somente na face máxima', async t => {
  const ui = await setup(t);
  const art = ui.host.querySelector('.orbital-art');
  const destinations = ['sistemas', 'fichas', 'pdfs'];
  const random = t.mock.method(Math, 'random', () => .99);
  for (const [i, kind] of [20, 4, 6, 8, 10, 12].entries()) {
    const previous = Number(ui.model.dataset.die);
    if (previous !== kind) {
      const choices = ORBITAL_DICE.filter(value => value !== previous);
      random.mock.mockImplementation(() => (choices.indexOf(kind) + .5) / choices.length);
      const destination=destinations[(i - 1) % destinations.length];
      const link=ui.host.querySelector(`.orbital-destination-switcher a[href="#inicio/${destination}"]`);
      if (link) await act(async () => link.click());
      else await clickButton(ui.host.querySelector('.orbital-navigation'), 'Sistemas');
      await waitFor(() => art.dataset.cameraMoving === 'false' && ui.model.dataset.die === String(kind));
    }
    random.mock.mockImplementation(() => .999);
    ui.surface.click();
    assert.equal(ui.number.textContent, String(kind));
    assert.equal(art.dataset.cosmicPhase, 'still');
    ui.surface.click();
    ui.animations.at(-1).finish();
    random.mock.mockImplementation(() => (kind - 1.5) / kind);
    ui.surface.click();
    assert.equal(ui.number.textContent, String(kind - 1));
    assert.equal(art.dataset.cosmicPhase, undefined);
    ui.surface.click();
    ui.animations.at(-1).finish();
  }
});
