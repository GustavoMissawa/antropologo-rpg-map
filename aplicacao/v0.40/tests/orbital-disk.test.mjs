import assert from 'node:assert/strict';
import {test} from 'node:test';
import {pickOrbitalDisk} from '../lib/orbital-disk.ts';
import {paintOrbitalLight} from '../lib/orbital-light.ts';

const variants = ['spiral', 'twin-arms', 'rings', 'crescent'];

test('O sorteio permite as quatro formas e exclui apenas a anterior', () => {
  for (const previous of [null, 'desconhecido', ...variants]) {
    const candidates = variants.filter(variant => variant !== previous);
    const selected = candidates.map((_, index) => pickOrbitalDisk(previous, () => (index + .5) / candidates.length));
    assert.deepEqual(selected, candidates);
  }
});

test('O disco mantém a forma no mesmo documento e sorteia outra no recarregamento', async () => {
  const key = 'antropologo:orbital-disk';
  const values = new Map();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {sessionStorage: {
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
  }}});
  try {
    const firstPage = await import('../lib/orbital-disk.ts?first');
    const first = firstPage.pageOrbitalDisk();
    assert.equal(values.get(key), first);
    const reloaded = await import('../lib/orbital-disk.ts?reload');
    const next = reloaded.pageOrbitalDisk();
    assert.notEqual(next, first);
    assert.equal(values.get(key), next);
    assert.equal(firstPage.pageOrbitalDisk(), first);
    assert.equal(reloaded.pageOrbitalDisk(), next);
    assert.equal(values.get(key), next);

    Object.defineProperty(window, 'sessionStorage', {get() { throw Error('Armazenamento indisponível'); }});
    const restricted = await import('../lib/orbital-disk.ts?restricted');
    const fallback = restricted.pageOrbitalDisk();
    assert.ok(variants.includes(fallback));
    assert.equal(restricted.pageOrbitalDisk(), fallback);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});

function recordTexture() {
  const paths = [];
  const colors = new Set();
  const ctx = {
    canvas: {width: 640, height: 640},
    clearRect() {}, save() {}, restore() {}, setTransform() {}, beginPath() {}, stroke() {}, fillRect() {},
    moveTo(...point) { paths.push(point); },
    lineTo(...point) { paths.push(point); },
    ellipse(...arc) { paths.push(arc); },
    set strokeStyle(color) { colors.add(color); },
    createRadialGradient() { return {addColorStop() {}}; },
  };
  return {getContext: () => ctx, paths, colors};
}

test('As quatro geometrias são distintas e cada uma mantém os traços ao trocar o tema', () => {
  const signatures = [];
  for (const variant of variants) {
    const dark = recordTexture();
    const light = recordTexture();
    assert.equal(paintOrbitalLight(dark, recordTexture(), undefined, 'dark', variant), true);
    const custom = {primary: '#29afff', secondary: '#8e4ee8'};
    assert.equal(paintOrbitalLight(light, recordTexture(), custom, 'light', variant), true);
    assert.ok(dark.paths.length > 0);
    assert.notDeepEqual(dark.colors, light.colors);
    assert.deepEqual(dark.paths, light.paths);
    signatures.push(JSON.stringify(dark.paths));
  }
  assert.equal(new Set(signatures).size, variants.length);
});
