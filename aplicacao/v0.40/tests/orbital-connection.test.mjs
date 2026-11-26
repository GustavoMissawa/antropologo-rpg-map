import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOrbitalAnchor, orbitalAnchorAngle, orbitalConnection} from '../lib/orbital-connection.ts';
import {createOrbitalDisk, orbitalDensity} from '../lib/orbital-disk.ts';
import {ORBITAL_DISK_SCALE, orbitalFlowBand, orbitalFlowPose} from '../lib/orbital-flow.ts';

const center = {x: 435, y: 435};
const targets = [{x: 660, y: 162}, {x: 785, y: 330}, {x: 785, y: 535}, {x: 655, y: 705}];
const variants = ['spiral', 'twin-arms', 'rings', 'crescent'];

function coordinates(path) {
  return path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
}

test('A estrela e o fio compartilham uma origem real no anel externo e o destino exato', () => {
  for (const variant of variants) {
    const disk = createOrbitalDisk(variant, 34817592);
    for (const target of targets) {
      for (let activation = 1; activation <= 24; activation++) {
        const seconds = activation * 1.738;
        const anchor = chooseOrbitalAnchor(disk.anchors, center, target, 870, seconds, () => activation / 25);
        const {origin, path} = orbitalConnection(center, target, 870, activation, anchor, seconds);
        const numbers = coordinates(path);
        assert.ok(disk.anchors.includes(anchor));
        assert.equal(anchor.density, orbitalDensity(disk.density, anchor.radius, anchor.angle));
        assert.deepEqual(numbers.slice(0, 2), [origin.x, origin.y]);
        assert.deepEqual(numbers.slice(-2), [target.x, target.y]);
        const tilt = 37 * Math.PI / 180;
        const dx = origin.x - center.x, dy = origin.y - center.y;
        const localX = dx * Math.cos(tilt) + dy * Math.sin(tilt);
        const localY = (-dx * Math.sin(tilt) + dy * Math.cos(tilt)) / .74;
        const radius = Math.hypot(localX, localY) / (870 * ORBITAL_DISK_SCALE);
        assert.ok(Math.abs(radius - anchor.radius) < 1e-12);
        assert.ok(radius >= .68 && radius <= .81, 'estrela na faixa externa de filamentos');
        assert.ok(Math.hypot(origin.x - target.x, origin.y - target.y) > 40, 'origem e destino são pontos distintos');
        for (let i = 2; i < 6; i += 2) {
          assert.ok(numbers[i] >= Math.min(origin.x, target.x) && numbers[i] <= Math.max(origin.x, target.x));
          assert.ok(numbers[i + 1] >= Math.min(origin.y, target.y) - 18 && numbers[i + 1] <= Math.max(origin.y, target.y) + 18);
        }
      }
    }
  }
});

test('O peso é contínuo, favorece maior densidade e inclui regiões de densidade zero', () => {
  const tilt = 37 * Math.PI / 180;
  const target = {x: center.x + Math.cos(tilt) * 300, y: center.y + Math.sin(tilt) * 300};
  const anchors = [0, .18, .41, .73, 1].map((density, index) => ({
    angle: (index - 2) * .14, radius: orbitalFlowBand(7).radius, band: 7, density,
  }));
  const counts = new Map(anchors.map(anchor => [anchor, 0]));
  for (let draw = 0; draw < 4096; draw++) {
    const selected = chooseOrbitalAnchor(anchors, center, target, 0, 0, () => (draw + .5) / 4096);
    counts.set(selected, counts.get(selected) + 1);
  }
  const countsInOrder = [...counts.values()];
  assert.ok(countsInOrder[0] > 100);
  assert.ok(countsInOrder.every((count, i) => i === 0 || count > countsInOrder[i - 1]));
  assert.ok(countsInOrder.at(-1) < 4096 * .48);
});

test('Cada disco oferece vários pontos de partida por destino e por fase, sem recriar estrelas', () => {
  for (const variant of variants) {
    const {anchors} = createOrbitalDisk(variant, 11302728);
    for (const target of targets) {
      for (const time of [0, 5, 20, 150]) {
        const draws = Array.from({length: 64}, (_, i) =>
          chooseOrbitalAnchor(anchors, center, target, 870, time, () => (i + .5) / 64));
        assert.ok(draws.every(choice => anchors.includes(choice)));
        assert.ok(new Set(draws).size >= 9);
        const peak = Math.max(...anchors.map(anchor => draws.filter(choice => choice === anchor).length));
        assert.ok(peak < 64 * .33);
      }
    }
  }
});

test('A geometria compacta se conecta acima dos botões e aceita medidas transitórias nulas', () => {
  const compactCenter = {x: 179, y: 179};
  const disk = createOrbitalDisk('rings', 21987);
  for (const x of [40, 130, 220, 310]) {
    const target = {x, y: 375};
    const anchor = chooseOrbitalAnchor(disk.anchors, compactCenter, target, 358, 11, () => .5);
    const beam = orbitalConnection(compactCenter, target, 358, 3, anchor, 11);
    const values = coordinates(beam.path);
    assert.ok(values.every(Number.isFinite));
    assert.ok(values.filter((_, i) => i % 2 === 1).every(y => y <= target.y));
    assert.ok(Math.hypot(beam.origin.x - compactCenter.x, beam.origin.y - compactCenter.y) > 80);
  }
  const zero = {x: 0, y: 0};
  assert.ok(coordinates(orbitalConnection(zero, zero, 0, 1, disk.anchors[0], 0).path).every(Number.isFinite));
});

test('A estrela percorre toda a faixa do Canvas sem perder a ponta do fio', () => {
  const turn = 2 * Math.PI;
  const target = targets[3];
  for (const band of [6, 7]) {
    const diskSeconds = turn / orbitalFlowBand(band).velocity;
    const anchor = {angle: .7, radius: orbitalFlowBand(band).radius, band, density: .6};
    const quadrants = new Set();
    const first = orbitalConnection(center, target, 870, 4, anchor, 0);
    let previous = first.origin;
    for (let i = 1; i <= 360; i++) {
      const elapsed = diskSeconds * i / 360;
      const angle = orbitalAnchorAngle(anchor, elapsed);
      assert.equal(angle, anchor.angle + orbitalFlowPose(band, elapsed).angle);
      const {origin, path, depth} = orbitalConnection(center, target, 870, 4, anchor, elapsed);
      const points = coordinates(path);
      quadrants.add(Math.floor((angle % turn) / (turn / 4)));
      assert.equal(depth, Math.sin(angle));
      assert.deepEqual(points.slice(0, 2), [origin.x, origin.y]);
      assert.deepEqual(points.slice(-2), [target.x, target.y]);
      assert.ok(Math.hypot(origin.x - previous.x, origin.y - previous.y) < 6);
      previous = origin;
    }
    assert.equal(quadrants.size, 4);
    assert.ok(Math.hypot(previous.x - first.origin.x, previous.y - first.origin.y) < 1e-8);
    const changed = orbitalConnection(center, targets[0], 870, 5, anchor, 0);
    assert.deepEqual(changed.origin, first.origin);
    assert.notEqual(orbitalConnection(center, target, 870, 5, anchor, 0).path, first.path);
    assert.deepEqual(coordinates(changed.path).slice(-2), [targets[0].x, targets[0].y]);
  }
});
