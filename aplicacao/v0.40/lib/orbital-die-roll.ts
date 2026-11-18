import {faceNormal, projectHeroPoint} from './hero-die-geometry.ts';
import {orbitalDieMeshes, type OrbitalDieKind} from './orbital-die-geometry.ts';
import {alignOrbitalFace, rotateOrbitalPoint, type Quaternion} from './orbital-rotation.ts';

export const ORBITAL_RESULT_DISPLAY_MS = 5000;
export const ORBITAL_RESULT_AUTO_FADE_MS = 400;
export const ORBITAL_RESULT_INPUT_FADE_MS = 200;
export const ORBITAL_ROLL_ALIGN_SECONDS = .45;

export function createOrbitalRoll(kind: OrbitalDieKind, orientation: Quaternion, random = Math.random) {
  const mesh = orbitalDieMeshes[kind];
  const index = Math.floor(random() * mesh.faces.length);
  const face = mesh.faces[index];
  const target = alignOrbitalFace(orientation, faceNormal(face, mesh.vertices));
  const points = face.map(vertex => projectHeroPoint(rotateOrbitalPoint(mesh.vertices[vertex], target)));
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const clearance = Math.min(...points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.abs(dx * (y - a.y) - dy * (x - a.x)) / Math.hypot(dx, dy);
  }));
  const value = index + 1;
  const fontSize = Math.min(52, clearance * (value >= 10 ? 1.32 : 1.62));
  return {value, target, x, y, fontSize};
}
