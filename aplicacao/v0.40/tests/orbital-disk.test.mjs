import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createOrbitalDisk, orbitalDensity, orbitalArmAngle, orbitalArmRadius, pickOrbitalDisk} from '../lib/orbital-disk.ts';
import {paintOrbitalLight} from '../lib/orbital-light.ts';

const variants = ['spiral', 'twin-arms', 'rings', 'crescent'];

test('O sorteio mantém os quatro arquétipos e exclui apenas o anterior', () => {
  for (const previous of [null, 'desconhecido', ...variants]) {
    const candidates = variants.filter(variant => variant !== previous);
    const selected = candidates.map((_, index) => pickOrbitalDisk(previous, () => (index + .5) / candidates.length));
    assert.deepEqual(selected, candidates);
  }
});

test('Identidade e relógio persistem no mesmo documento e outra instância nasce ao recarregar', async () => {
  const key = 'antropologo:orbital-disk';
  const values = new Map();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {sessionStorage: {
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
  }}});
  try {
    const firstPage = await import('../lib/orbital-disk.ts?first');
    const first = firstPage.pageOrbitalScene();
    first.clock.seconds = 3;
    assert.equal(values.get(key), first.disk.profile.variant);
    const reloaded = await import('../lib/orbital-disk.ts?reload');
    const next = reloaded.pageOrbitalScene();
    assert.notEqual(next.disk.profile.variant, first.disk.profile.variant);
    assert.equal(values.get(key), next.disk.profile.variant);
    assert.strictEqual(firstPage.pageOrbitalScene(), first);
    assert.equal(firstPage.pageOrbitalScene().clock.seconds, 3);
    assert.strictEqual(reloaded.pageOrbitalScene(), next);
    assert.equal(next.clock.seconds, 0);

    Object.defineProperty(window, 'sessionStorage', {get() { throw Error('Armazenamento indisponível'); }});
    const restricted = await import('../lib/orbital-disk.ts?restricted');
    const fallback = restricted.pageOrbitalScene();
    assert.ok(variants.includes(fallback.disk.profile.variant));
    assert.strictEqual(restricted.pageOrbitalScene(), fallback);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});

test('Uma mesma semente recria o mapa e as estrelas, e outra semente altera a matéria', () => {
  for (const variant of variants) {
    const first = createOrbitalDisk(variant, 401738);
    const regenerated = createOrbitalDisk(variant, 401738);
    const different = createOrbitalDisk(variant, 25819421);
    assert.deepEqual(first, regenerated);
    assert.notDeepEqual(first.density, different.density);
    assert.notDeepEqual(first.stars, different.stars);
    assert.notDeepEqual(first.anchors, different.anchors);
    assert.ok(first.density.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.equal(orbitalDensity(first.density, .2, 0), 0, 'núcleo livre');
    assert.ok(Math.abs(orbitalDensity(first.density, .56, -1e-7) - orbitalDensity(first.density, .56, 1e-7)) < 1e-5);
  }
});

const mean = values => values.reduce((a, b) => a + b, 0) / values.length;

test('O mapa acompanha os braços, os três anéis e a face iluminada do crescente', () => {
  const angles = Array.from({length: 72}, (_, i) => i * Math.PI / 36);
  for (const seed of [401738, 581127, 25819421, 3741784932]) {
    for (const [variant, count] of [['spiral', 3], ['twin-arms', 2]]) {
      const {profile, density} = createOrbitalDisk(variant, seed);
      const radius = orbitalArmRadius(.53);
      assert.equal(profile.arms.length, count);
      const baseline = mean(angles.map(angle => orbitalDensity(density, radius, angle)));
      assert.ok(profile.arms.every(arm =>
        orbitalDensity(density, radius, orbitalArmAngle(arm, .53)) > baseline * 1.25), variant);
      if (count === 2) {
        const [first, second] = profile.arms;
        assert.ok(Math.abs((second.angle - first.angle) - Math.PI) <= .62);
        assert.notEqual(first.winding, second.winding);
      }
    }

    const rings = createOrbitalDisk('rings', seed);
    const [inner, middle, outer] = rings.profile.rings;
    const ringAverage = radius => mean(angles.map(angle => orbitalDensity(rings.density, radius, angle)));
    assert.equal(rings.profile.rings.length, 3);
    for (const [a, b] of [[inner, middle], [middle, outer]]) {
      assert.ok(ringAverage((a.radius + b.radius) / 2) < .65 * Math.min(ringAverage(a.radius), ringAverage(b.radius)));
    }
    assert.ok(orbitalDensity(rings.density, outer.radius, outer.angle) >
      orbitalDensity(rings.density, outer.radius, outer.angle + Math.PI) * 1.5);

    const crescent = createOrbitalDisk('crescent', seed);
    const {glow} = crescent.profile;
    const hotRadius = glow.inner + .14 * glow.width;
    assert.ok(orbitalDensity(crescent.density, hotRadius, glow.angle) >
      orbitalDensity(crescent.density, hotRadius, glow.angle + Math.PI) * 1.7);
  }
});

test('Amostragem das estrelas enriquece as áreas densas e preserva estrelas tênues nas vazias', () => {
  for (const variant of variants) {
    const {density, stars} = createOrbitalDisk(variant, 16528773);
    const sampled = stars.map(star => orbitalDensity(density, Math.hypot(star.x, star.y), Math.atan2(star.y, star.x)));
    const area = Array.from({length: 1200}, (_, i) => {
      const radius = Math.sqrt(.30 ** 2 + (1 - .30 ** 2) * (i + .5) / 1200);
      return orbitalDensity(density, radius, i * 2.399963);
    });
    assert.ok(stars.length >= 1240 && stars.length <= 1600);
    assert.ok(mean(sampled) > mean(area) * 1.24, variant);
    assert.ok(sampled.some(value => value < .04), variant);
    assert.ok(sampled.some(value => value > .36), variant);
  }
});

function recordTexture() {
  const paths = [];
  const colors = new Set();
  const points = [];
  const ctx = {
    canvas: {width: 640, height: 640},
    clearRect() {}, save() {}, restore() {}, setTransform() {}, beginPath() {}, stroke() {},
    moveTo(...point) { paths.push(point); },
    lineTo(...point) { paths.push(point); },
    ellipse(...arc) { paths.push(arc); },
    fillRect(...rect) { points.push(rect); },
    set strokeStyle(color) { colors.add(color); },
    createRadialGradient() { return {addColorStop() {}}; },
  };
  return {getContext: () => ctx, paths, colors, points};
}

test('O Canvas desenha cada estrela de ancoragem e mantém todos os traços ao recolorir', () => {
  for (const variant of variants) {
    const disk = createOrbitalDisk(variant, 401738);
    const dark = recordTexture();
    const darkDust = recordTexture();
    const light = recordTexture();
    const lightDust = recordTexture();
    assert.equal(paintOrbitalLight(dark, darkDust, disk), true);
    const custom = {primary: '#29afff', secondary: '#8e4ee8'};
    assert.equal(paintOrbitalLight(light, lightDust, disk, custom, 'light'), true);
    assert.ok(dark.paths.length > 0);
    assert.notDeepEqual(dark.colors, light.colors);
    assert.deepEqual(dark.paths, light.paths);
    assert.deepEqual(darkDust.points, lightDust.points);
    assert.equal(darkDust.points.length, disk.stars.length + disk.anchors.length);
    for (const [index, anchor] of disk.anchors.entries()) {
      const [x, y, width, height] = darkDust.points[disk.stars.length + index];
      assert.ok(Math.abs(x + width / 2 - Math.cos(anchor.angle) * anchor.radius) < 1e-12);
      assert.ok(Math.abs(y + height / 2 - Math.sin(anchor.angle) * anchor.radius) < 1e-12);
    }
    const next = recordTexture();
    paintOrbitalLight(next, recordTexture(), createOrbitalDisk(variant, 25819421));
    assert.notDeepEqual(dark.paths, next.paths);
  }
});
