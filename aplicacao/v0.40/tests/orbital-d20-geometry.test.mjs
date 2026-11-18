import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO_EDGES, HERO_FACES, HERO_VERTICES, heroDieFrame, orbitalDieFrame, projectOrbitalDie, rotateHeroPoint } from '../lib/hero-die-geometry.ts';
import { chooseOrbitalDie, ORBITAL_DICE, orbitalDieMeshes } from '../lib/orbital-die-geometry.ts';
import { advanceOrbitalDieShift, beginOrbitalDieShift, ORBITAL_DIE_SHIFT_SECONDS, orbitalDieShiftSpeed } from '../lib/orbital-die-shift.ts';

const edgeKey = (a, b) => [a, b].sort((x, y) => x - y).join(',');
const parsePoints = polygon => polygon.split(' ').map(point => point.split(',').map(Number));
const polygonArea = points => Math.abs(points.reduce((area, [x, y], i) => {
  const [xx, yy] = points[(i + 1) % points.length];
  return area + x * yy - xx * y;
}, 0)) / 2;

test('O D20 orbital é uma malha fechada de vinte triângulos', () => {
  assert.equal(HERO_VERTICES.length, 12);
  assert.equal(HERO_FACES.length, 20);
  assert.equal(new Set(HERO_FACES.map(face => [...face].sort((a, b) => a - b).join(','))).size, 20);
  const incidence = new Map();
  for (const [a, b, c] of HERO_FACES) {
    for (const [first, second] of [[a, b], [b, c], [c, a]]) {
      const edge = edgeKey(first, second);
      incidence.set(edge, (incidence.get(edge) ?? 0) + 1);
    }
  }
  assert.deepEqual([...incidence.keys()].sort(), HERO_EDGES.map(([a, b]) => edgeKey(a, b)).sort());
  assert.ok([...incidence.values()].every(count => count === 2));
});

test('Ao girar, só as faces voltadas à câmera cobrem a silhueta projetada', () => {
  for (let i = 0; i < 96; i++) {
    const angles = [i * .129, i * .217, i * .071];
    const vertices = HERO_VERTICES.map(p => rotateHeroPoint(p, angles));
    const {faces, edges} = orbitalDieFrame(angles);
    const expectedEdges = new Set();
    let filledArea = 0;
    for (const [index, [a, b, c]] of HERO_FACES.entries()) {
      const [x, y, z] = vertices[a];
      // On a regular icosahedron the outward normal is parallel to the face center.
      const normal = vertices[a].map((v, j) => v + vertices[b][j] + vertices[c][j]);
      const facesCamera = normal[0] * -x + normal[1] * -y + normal[2] * (1 / .13 - z) > 0;
      const face = faces[index];
      assert.equal(face.visible, facesCamera, `Face ${index}, quadro ${i}`);
      if (face.visible) {
        const points = parsePoints(face.points);
        const [first, second, third] = face.points.split(' ');
        for (const [from, to] of [[first, second], [second, third], [third, first]]) {
          expectedEdges.add([from, to].sort().join('|'));
        }
        assert.equal(points.length, 3);
        assert.ok(points.flat().every(value => Number.isFinite(value) && value >= 0 && value <= 200));
        assert.match(face.light, /^(?:[0-9]|[1-9][0-9])%$/);
        filledArea += polygonArea(points);
      } else {
        assert.equal(face.points, '');
      }
    }
    const drawnEdges = edges.slice(1).split('M').map(segment => segment.split('L').sort().join('|'));
    assert.equal(new Set(drawnEdges).size, drawnEdges.length, `Arestas únicas no quadro ${i}`);
    assert.deepEqual(new Set(drawnEdges), expectedEdges, `Arestas visíveis no quadro ${i}`);
    const outlineArea = polygonArea(parsePoints(heroDieFrame(angles).hull));
    assert.ok(Math.abs(outlineArea - filledArea) < 1e-5, `Cobertura da silhueta no quadro ${i}`);
  }
});

const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const subtract = (a, b) => a.map((x, i) => x - b[i]);
const normal = (a, b, c) => {
  const [x, y, z] = subtract(b, a), [u, v, w] = subtract(c, a);
  return [y * w - z * v, z * u - x * w, x * v - y * u];
};

test('Os seis sólidos têm faces planas, convexas e oclusão correta em várias orientações', () => {
  const expected = [[4, 4, 6, 3], [8, 6, 12, 4], [6, 8, 12, 3], [12, 10, 20, 4], [20, 12, 30, 5], [12, 20, 30, 3]];
  for (const [index, kind] of ORBITAL_DICE.entries()) {
    const mesh = orbitalDieMeshes[kind];
    const [vertices, faces, edges, sides] = expected[index];
    assert.deepEqual([mesh.vertices.length, mesh.faces.length, mesh.edges.length], [vertices, faces, edges]);
    assert.ok(mesh.edges.every(edge => edge.faces.length === 2));
    assert.ok(Math.abs(Math.max(...mesh.vertices.map(v => Math.hypot(...v))) - 1) < 1e-12);
    for (const face of mesh.faces) {
      assert.equal(face.length, sides);
      const vertices = face.map(i => mesh.vertices[i]);
      const n = normal(...vertices);
      assert.ok(vertices.every(p => Math.abs(dot(n, subtract(p, vertices[0]))) < 1e-12));
      assert.ok(mesh.vertices.every(p => dot(n, subtract(p, vertices[0])) < 1e-12));
      if (kind === 10) {
        const lengths = vertices.map((v, i) => Math.hypot(...subtract(v, vertices[(i + 1) % 4]))).sort((a, b) => a - b);
        assert.ok(Math.abs(lengths[0] - lengths[1]) < 1e-12 && Math.abs(lengths[2] - lengths[3]) < 1e-12);
        assert.ok(lengths[2] - lengths[1] > .05, 'cada face do D10 tem dois pares de lados distintos');
      }
    }
    for (let i = 0; i < 48; i++) {
      const rotate = p => rotateHeroPoint(p, [.475 + i * .133, -.361 + i * .231, i * .171]);
      const vertices = mesh.vertices.map(rotate);
      const view = projectOrbitalDie(rotate, mesh);
      const expectedEdges = new Set();
      for (const [index, face] of mesh.faces.entries()) {
        const [a, b, c] = face.map(i => vertices[i]);
        const visible = dot(normal(a, b, c), subtract([0, 0, 1 / .13], a)) > 0;
        assert.equal(view.faces[index].visible, visible, 'visibilidade D' + kind);
        if (!visible) continue;
        const corners = view.faces[index].points.split(' ');
        assert.equal(corners.length, sides);
        for (const [i, corner] of corners.entries()) expectedEdges.add([corner, corners[(i + 1) % sides]].sort().join('|'));
      }
      const drawn = view.edges.slice(1).split('M').map(edge => edge.split('L').sort().join('|'));
      assert.equal(drawn.length, expectedEdges.size);
      assert.deepEqual(new Set(drawn), expectedEdges);
    }
  }
});

test('O sorteio visual exclui o modelo atual e alcança todos os outros modelos', () => {
  for (const kind of ORBITAL_DICE) {
    const choices = Array.from({length: 5}, (_, i) => chooseOrbitalDie(kind, () => (i + .5) / 5));
    assert.deepEqual(choices, ORBITAL_DICE.filter(other => other !== kind));
  }
});

test('O impulso acelera e freia, troca uma única vez e preserva giro sob seleções rápidas', () => {
  const duration = ORBITAL_DIE_SHIFT_SECONDS;
  const shift = beginOrbitalDieShift(20, null, () => 0);
  assert.equal(orbitalDieShiftSpeed(shift), 0);
  assert.ok(orbitalDieShiftSpeed(shift, duration * .5) > orbitalDieShiftSpeed(shift, duration * .25));
  assert.ok(orbitalDieShiftSpeed(shift, duration * .75) > orbitalDieShiftSpeed(shift, duration));
  const opening = advanceOrbitalDieShift(shift, duration * .25);
  const redirected = beginOrbitalDieShift(20, shift, () => .4);
  assert.equal(redirected.next, 8);
  assert.equal(orbitalDieShiftSpeed(redirected), orbitalDieShiftSpeed(shift));
  assert.equal(opening.swap, false);
  const middle = advanceOrbitalDieShift(redirected, duration * .25);
  assert.equal(middle.swap, true);
  assert.equal(middle.charge, 1);
  const repeated = beginOrbitalDieShift(8, redirected, () => 0);
  assert.equal(orbitalDieShiftSpeed(repeated), orbitalDieShiftSpeed(redirected));
  assert.notEqual(repeated.next, 8);
  const closing = advanceOrbitalDieShift(redirected, duration * .50);
  assert.equal(closing.finished, true);
  assert.equal(closing.swap, false);
  assert.ok(Math.abs(opening.turn + middle.turn + closing.turn - duration * 13) < 1e-12);
});
