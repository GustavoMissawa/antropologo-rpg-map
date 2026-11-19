import {createOrbitalMesh, HERO_MESH, type OrbitalMesh, type Point3} from './hero-die-geometry.ts';

export const ORBITAL_DICE = [4, 6, 8, 10, 12, 20] as const;
export type OrbitalDieKind = typeof ORBITAL_DICE[number];

const dot = ([a, b, c]: Point3, [x, y, z]: Point3) => a * x + b * y + c * z;
const cross = ([a, b, c]: Point3, [x, y, z]: Point3): Point3 =>
  [b * z - c * y, c * x - a * z, a * y - b * x];
const difference = ([a, b, c]: Point3, [x, y, z]: Point3): Point3 => [a - x, b - y, c - z];

/** The polar dual gives one vertex per plane and one face per original vertex. */
function polarDual(mesh: OrbitalMesh) {
  const vertices = mesh.faces.map(([a, b, c]): Point3 => {
    const p = mesh.vertices[a];
    const normal = cross(difference(mesh.vertices[b], p), difference(mesh.vertices[c], p));
    const distance = dot(normal, p);
    return [normal[0] / distance, normal[1] / distance, normal[2] / distance];
  });
  const faces = mesh.vertices.map((normal, vertex) => {
    const incident = mesh.faces.flatMap((face, index) => face.includes(vertex) ? [index] : []);
    const axis = difference(vertices[incident[0]], normal);
    const tangent = cross(normal, axis);
    const angle = (i: number) => Math.atan2(dot(vertices[i], tangent) / Math.hypot(...tangent), dot(vertices[i], axis) / Math.hypot(...axis));
    return incident.sort((a, b) => angle(a) - angle(b));
  });
  return createOrbitalMesh(vertices, faces);
}

const tetrahedron = createOrbitalMesh(
  [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
);
const cube = createOrbitalMesh(
  [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
  [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
);
const octahedron = createOrbitalMesh(
  [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  [4, 5].flatMap(pole => Array.from({length: 4}, (_, i) => [pole, i, (i + 1) % 4])),
);

// Two staggered pentagons join at ten triangles. Its dual has ten kite faces.
// This half-height puts the dual's widest diameter close to its tip-to-tip length.
const pentagon = [0, 1, 2, 3, 4];
const antiprismHalfHeight = .94;
const antiprism = createOrbitalMesh(
  [0, 1].flatMap(ring => pentagon.map((i): Point3 => {
    const angle = (2 * i + ring) * Math.PI / 5;
    return [Math.cos(angle), Math.sin(angle), ring === 0 ? antiprismHalfHeight : -antiprismHalfHeight];
  })),
  [pentagon, pentagon.map(i => i + 5), ...pentagon.flatMap(i => {
    const next = (i + 1) % 5;
    return [[i, next, i + 5], [i + 5, next, next + 5]];
  })],
);

export const orbitalDieMeshes: Record<OrbitalDieKind, OrbitalMesh> = {
  4: tetrahedron,
  6: cube,
  8: octahedron,
  10: polarDual(antiprism),
  12: polarDual(HERO_MESH),
  20: HERO_MESH,
};

export function chooseOrbitalDie(current: OrbitalDieKind, random = Math.random) {
  const choices = ORBITAL_DICE.filter(kind => kind !== current);
  return choices[Math.floor(random() * choices.length)];
}
