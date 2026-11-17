import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitalConnection} from '../lib/orbital-connection.ts';

const center = {x: 435, y: 435};
const targets = [{x: 660, y: 162}, {x: 785, y: 330}, {x: 785, y: 535}, {x: 655, y: 705}];

function coordinates(path) {
  return path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
}

test('A estrela e o fio compartilham a origem na borda projetada e o destino exato', () => {
  for (const target of targets) {
    for (let activation = 1; activation <= 24; activation++) {
      const {origin, path} = orbitalConnection(center, target, 870, activation);
      const numbers = coordinates(path);
      assert.deepEqual(numbers.slice(0, 2), [origin.x, origin.y]);
      assert.deepEqual(numbers.slice(-2), [target.x, target.y]);
      const tilt = 37 * Math.PI / 180;
      const dx = origin.x - center.x, dy = origin.y - center.y;
      const localX = dx * Math.cos(tilt) + dy * Math.sin(tilt);
      const localY = (-dx * Math.sin(tilt) + dy * Math.cos(tilt)) / .74;
      const radius = Math.hypot(localX, localY) / (870 * .481);
      assert.ok(radius >= .68 && radius <= .81, 'estrela na faixa externa de filamentos');
      assert.ok(Math.hypot(origin.x - target.x, origin.y - target.y) > 40, 'origem e destino são pontos distintos');
      for (let i = 2; i < 6; i += 2) {
        assert.ok(numbers[i] >= Math.min(origin.x, target.x) && numbers[i] <= Math.max(origin.x, target.x));
        assert.ok(numbers[i + 1] >= Math.min(origin.y, target.y) - 18 && numbers[i + 1] <= Math.max(origin.y, target.y) + 18);
      }
    }
  }
});

test('A curva varia entre ativações e se mantém estável durante a mesma ativação', () => {
  const first = orbitalConnection(center, targets[1], 870, 1);
  assert.deepEqual(orbitalConnection(center, targets[1], 870, 1), first);
  assert.notEqual(orbitalConnection(center, targets[1], 870, 2).path, first.path);
  assert.notEqual(orbitalConnection(center, targets[1], 870, 3).path, first.path);
});

test('A geometria compacta se conecta acima dos botões e aceita medidas transitórias nulas', () => {
  const compactCenter = {x: 179, y: 179};
  for (const x of [40, 130, 220, 310]) {
    const target = {x, y: 375};
    const beam = orbitalConnection(compactCenter, target, 358, 3);
    const values = coordinates(beam.path);
    assert.ok(values.every(Number.isFinite));
    assert.ok(values.filter((_, i) => i % 2 === 1).every(y => y <= target.y));
    assert.ok(Math.hypot(beam.origin.x - compactCenter.x, beam.origin.y - compactCenter.y) > 80);
  }
  assert.ok(coordinates(orbitalConnection({x: 0, y: 0}, {x: 0, y: 0}, 0, 1).path).every(Number.isFinite));
});
