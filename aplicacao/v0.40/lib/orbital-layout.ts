import { clampUnit } from './orbital-noise.ts';
import { pointOnOrbit, type CelestialBody, type CelestialOrbit, type OrbitalMoon, type OrbitalPlanet, type SpacePoint } from './orbital-system.ts';

export const solarOrbit = { x: 450, y: 256 };
export const lunarOrbit = { x: 148, y: 106 };
export const planetMapLimit = 10;
export const moonMapLimit = 8;

export type MapBody<T extends OrbitalPlanet | OrbitalMoon = OrbitalPlanet | OrbitalMoon> = {
  body: T;
  orbit: CelestialOrbit;
  radius: number;
  footprint: number;
};

export function starMapRadius(star: CelestialBody) {
  return 50 + 8 * clampUnit((star.appearance.size - 1.2) / .6);
}

const tau = Math.PI * 2;

/** Space the displayed tracks while retaining each body's physical radius and seed separately. */
export function arrangeOrbitTracks<T extends OrbitalPlanet | OrbitalMoon>(
  bodies: T[], kind: 'solar' | 'lunar',
): MapBody<T>[] {
  const lunar = kind === 'lunar';
  const plane = lunar ? lunarOrbit : solarOrbit;
  const [sourceInner, sourceOuter, inner, outer] = lunar ? [.32, .96, .60, .96] : [.28, .94, .42, .94];
  const sorted = [...bodies].sort((a,b) => a.orbit.radius - b.orbit.radius || (a.id < b.id ? -1 : 1));
  const placed: MapBody<T>[] = [];
  for (const [i, body] of sorted.entries()) {
    const natural = clampUnit((body.orbit.radius - sourceInner) / (sourceOuter - sourceInner));
    const rank = sorted.length === 1 ? .47 : i / (sorted.length - 1);
    const radius = inner + (outer - inner) * (.36 * natural + .64 * rank);
    const size = lunar ? 4.5 + 3 * clampUnit((body.appearance.size - .20) / .16)
      : 12 + 11 * clampUnit((body.appearance.size - .54) / .50);
    const footprint = body.appearance.rings ? size * 1.84 : size;
    let angle = body.orbit.angle;
    let best = -Infinity;
    // Minimum separation over a turn is bounded by the minor axis of the ellipse.
    for (let step = 0; step < 60; step++) {
      const shift = Math.ceil(step / 2) * tau / 60 * (step % 2 ? 1 : -1);
      const candidate = body.orbit.angle + shift;
      const point = pointOnOrbit({radius, angle: candidate});
      let clearance = Infinity;
      for (const neighbor of placed) {
        const other = pointOnOrbit(neighbor.orbit);
        clearance = Math.min(clearance, Math.hypot(point.x - other.x, point.y - other.y) * plane.y
          - footprint - neighbor.footprint);
      }
      if (clearance > best) {
        angle = candidate;
        best = clearance;
      }
      if (clearance >= (lunar ? 9 : 13)) break;
    }
    placed.push({body, orbit: {radius, angle}, radius:size, footprint});
  }
  return placed;
}

export function orbitPosition(orbit: CelestialOrbit, plane: SpacePoint, seconds: number) {
  const point = pointOnOrbit({radius: orbit.radius, angle: orbit.angle + seconds * (plane === lunarOrbit ? .012 : .004)});
  return {x: point.x * plane.x, y: point.y * plane.y};
}

export function mapFrame(width: number, height: number, top: number, bottom: number) {
  const inset = Math.max(14, width * .04);
  const available = Math.max(1, height - top - bottom);
  return {
    center: {x: width / 2, y: top + available / 2},
    bounds: {left: inset, right: width - inset, top, bottom: height - bottom},
    scale: Math.min(Math.max(1,width - 2 * inset) / 954, available / 574),
  };
}

type Frame = ReturnType<typeof mapFrame>;
export type ProjectedBody = SpacePoint & {radius: number};

/** Pick a nearby anchor with room for the entire label at screen scale. */
export function placeMapLabel(body: ProjectedBody, width: number, bounds: Frame['bounds'],
  others: ProjectedBody[], labels: {x: number; y: number; width: number}[]) {
  if (width > bounds.right - bounds.left) return null;
  const x = Math.max(bounds.left + width / 2, Math.min(bounds.right - width / 2, body.x));
  for (const y of [body.y + body.radius + 8, body.y - body.radius - 23]) {
    if (y < bounds.top || y + 16 > bounds.bottom) continue;
    if (others.some(other =>
      Math.abs(x - other.x) < width / 2 + other.radius + 4 &&
      y < other.y + other.radius + 4 && y + 16 > other.y - other.radius - 4)) continue;
    if (labels.some(label => Math.abs(x - label.x) < (width + label.width) / 2 + 9 && Math.abs(y - label.y) < 18)) continue;
    return {x,y,width};
  }
  return null;
}
