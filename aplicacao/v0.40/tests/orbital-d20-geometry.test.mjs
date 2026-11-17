import assert from 'node:assert/strict';
import test from 'node:test';
import { HERO_EDGES, HERO_FACES, HERO_VERTICES, heroDieFrame, orbitalDieFrame, rotateHeroPoint } from '../lib/hero-die-geometry.ts';

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
