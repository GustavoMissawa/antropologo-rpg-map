import { clampUnit, orbitalRandom, orbitalSeed } from './orbital-noise.ts';
import { pointOnOrbit, type CelestialOrbit, type OrbitalMoon, type OrbitalPlanet, type OrbitalPrimary, type SpacePoint } from './orbital-system.ts';

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

export function starMapRadius(star: OrbitalPrimary) {
  return star.central.mapRadius;
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

/** Use the clear space in the rendered solar plane, keeping clear of complete planet silhouettes. */
export function asteroidBelt(star: OrbitalPrimary, planets: MapBody<OrbitalPlanet>[]) {
  const random = orbitalRandom(orbitalSeed(star.seed ^ 0x2f65a7dc));
  if (planets.length < 2 || random() >= .38) return null;
  const tracks = planets.map(({orbit,footprint}) => {
    const clearance = (footprint + 4) / solarOrbit.y;
    return {inner:orbit.radius-clearance,outer:orbit.radius+clearance};
  }).sort((a,b) => a.inner-b.inner);
  let best: {inner: number; outer: number} | null = null;
  let occupiedUntil = tracks[0].outer;
  for (const track of tracks.slice(1)) {
    const inner = occupiedUntil, outer = track.inner;
    if (outer-inner >= .040 && (!best || outer-inner > best.outer-best.inner)) best = {inner,outer};
    occupiedUntil = Math.max(occupiedUntil,track.outer);
  }
  if (!best) {
    // Crowded maps can have a dust lane inside the first orbit.
    const lightRadius = star.central.mapRadius * (star.central.archetype === 'black-hole' ? 1.93 : 1.54);
    const inner = Math.max(.24,(lightRadius+7)/solarOrbit.y);
    const outer = tracks[0].inner;
    if (outer-inner < .041) return null;
    best = {inner,outer};
  }
  const middle = (best.inner+best.outer)/2;
  const thickness = Math.min(.060,(best.outer-best.inner)*.77);
  const phase = random()*tau;
  const particles: Array<SpacePoint & {size: number; tone: number}> = [];
  for (let i=0;i<148;i++) {
    const angle = (i+random())*tau/148;
    const density = .50 + .24 * Math.cos(angle*3+phase) + .18 * Math.cos(angle*5-phase*.37);
    if (random() > density) continue;
    const radius = middle + ((random()+random())*.5-.5)*thickness;
    const size = .68 + 1.72*random()**2.1;
    const point = pointOnOrbit({radius,angle});
    particles.push({x:point.x*solarOrbit.x,y:point.y*solarOrbit.y,size,tone:Math.floor(random()*3)});
  }
  return {inner:best.inner,outer:best.outer,particles};
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
