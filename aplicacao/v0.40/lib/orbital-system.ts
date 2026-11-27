import type { Rule, Rulebook } from './model.ts';
import { orbitalRandom, orbitalSeed } from './orbital-noise.ts';
import { centralProfiles, describeCentralObject, type CentralObject } from './orbital-astronomy.ts';
import {
  createMassProfile, estimateMoon, estimatePlanet, estimateStar, planetOrbitBounds,
  type Atmosphere, type LunarProperties, type PlanetaryArchitecture, type PlanetaryProperties,
  type Rings, type StellarProperties, type Surface,
} from './planetary-architecture.ts';

const fullTurn = Math.PI * 2;
const appearanceVersion = 'orbital-system-1';

export type SpacePoint = { x: number; y: number };
export type CelestialOrbit = { radius: number; angle: number };
export type CelestialAppearance<T extends 'star' | Surface = 'star' | Surface> = {
  type: T;
  light: string;
  base: string;
  shade: string;
  size: number;
  tilt: number;
  rings: Rings;
  atmosphere: Atmosphere;
  cratering: number;
  storm: boolean;
};

export type CelestialBody<T extends 'star' | Surface = 'star' | Surface> = {
  id: string;
  title: string;
  seed: number;
  appearance: CelestialAppearance<T>;
};
export type OrbitalMoon = CelestialBody<Surface> & { planetId: string; orbit: CelestialOrbit; physics: LunarProperties };
export type OrbitalPlanet = CelestialBody<Surface> & { orbit: CelestialOrbit; moons: OrbitalMoon[]; physics: PlanetaryProperties };
export type OrbitalPrimary = CelestialBody<'star'> & { physics: StellarProperties; central: CentralObject };
export type OrbitalTopic = { planet: OrbitalPlanet; moon?: OrbitalMoon };
export type PlanetarySystem = {
  id: string;
  architecture: PlanetaryArchitecture;
  star: OrbitalPrimary;
  planets: OrbitalPlanet[];
  topics: ReadonlyMap<string, OrbitalTopic>;
};

const surfaceColors = {
  rocky: [
    ['#efcaaa', '#ab684c', '#382727'],
    ['#ddd9dc', '#847e8e', '#2d2a34'],
    ['#d5dad1', '#7c897b', '#303d3c'],
  ],
  desert: [
    ['#f8dfae', '#c49658', '#5d4335'],
    ['#eec1a0', '#bd7556', '#5c3231'],
  ],
  oceanic: [
    ['#a3ece0', '#407d97', '#1d334f'],
    ['#9cd4e7', '#4e739d', '#22355b'],
    ['#cbddea', '#567f94', '#253759'],
  ],
  volcanic: [
    ['#ffbd8b', '#9f4d42', '#331c26'],
    ['#ffd3a8', '#b76137', '#402228'],
  ],
  icy: [
    ['#e8f5fa', '#81a6c0', '#314361'],
    ['#e3f2ea', '#9abbbf', '#324957'],
    ['#efdde8', '#9a93b6', '#403c61'],
  ],
  'gas-giant': [
    ['#f5dbc1', '#c69265', '#51414f'],
    ['#ffddc5', '#bd7b64', '#5e3b4b'],
    ['#eddfec', '#b494b9', '#463b64'],
  ],
  'ice-giant': [
    ['#d2f0f0', '#66a9b3', '#26446a'],
    ['#c8dfeb', '#738ebc', '#293d70'],
    ['#c6e8dc', '#68a993', '#254d54'],
  ],
} as const;

export function celestialSeed(...ids: string[]): number {
  const key = JSON.stringify([appearanceVersion, ...ids]);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return orbitalSeed(hash);
}

function describeGlobe(physics: PlanetaryProperties | LunarProperties, seed: number): CelestialAppearance<Surface> {
  const random = orbitalRandom(seed);
  const {surface, radiusEarth, atmosphere, cratering} = physics;
  const colors = surfaceColors[surface];
  const [light, base, shade] = colors[Math.floor(random() * colors.length)];
  const isPlanet = 'rings' in physics;
  // Compress physical sizes to keep small destinations readable and giant planets in view.
  const size = isPlanet ? .46 + .24 * Math.log1p(radiusEarth) : .19 + .31 * Math.sqrt(radiusEarth);
  return {
    type: surface, light, base, shade, size, atmosphere, cratering,
    tilt: 58 * random() - 29, rings: isPlanet ? physics.rings : null, storm: isPlanet && physics.storm,
  };
}

function makeOrbit(seed: number, inner: number, outer: number): CelestialOrbit {
  const random = orbitalRandom(orbitalSeed(seed));
  const angle = fullTurn * (orbitalSeed(seed ^ 0x43823fed) / 4294967296);
  return { radius: inner + (outer - inner) * random(), angle };
}

export function pointOnOrbit(orbit: CelestialOrbit): SpacePoint {
  return { x: orbit.radius * Math.cos(orbit.angle), y: orbit.radius * Math.sin(orbit.angle) };
}

/** Mass is a function of the body's own orbital distance and seed, with no rank across chapters. */
export function createPlanetarySystem(book: Pick<Rulebook, 'id' | 'name' | 'chapters'>): PlanetarySystem {
  const massProfile = createMassProfile(celestialSeed(book.id, 'architecture-1'));
  const starSeed = celestialSeed(book.id, 'star');
  const stellar = estimateStar(celestialSeed(book.id, 'stellar-physics'));
  const central = describeCentralObject(starSeed);
  const [light, base, shade] = centralProfiles[central.archetype].colors;
  const star: OrbitalPrimary = {
    id: book.id, title: book.name, seed: starSeed, physics: stellar, central,
    appearance: {
      type: 'star', light, base, shade, size: 1.02 + .43 * stellar.massSolar, tilt: -12,
      rings: null, atmosphere: 'none', cratering: 0, storm: false,
    },
  };
  const topics = new Map<string, OrbitalTopic>();
  const planets = book.chapters.map(chapter => {
    const seed = celestialSeed(book.id, 'planet', chapter.id);
    const orbit = makeOrbit(seed, planetOrbitBounds.inner, planetOrbitBounds.outer);
    const physics = estimatePlanet(massProfile, stellar, orbit.radius, celestialSeed(book.id, 'planet-physics', chapter.id));
    const planet: OrbitalPlanet = {
      id: chapter.id, title: chapter.title, seed, orbit, physics, moons: [],
      appearance: describeGlobe(physics, seed),
    };
    topics.set(planet.id, { planet });

    function collectMoons(children: Rule[]) {
      for (const child of children) {
        const seed = celestialSeed(book.id, 'moon', child.id);
        const orbit = makeOrbit(seed, .32, .96);
        const lunar = estimateMoon(physics, stellar, orbit.radius, celestialSeed(book.id, 'moon-physics', child.id));
        const moon: OrbitalMoon = {
          id: child.id, title: child.title, seed, planetId: planet.id, orbit, physics: lunar,
          appearance: describeGlobe(lunar, seed),
        };
        planet.moons.push(moon);
        topics.set(child.id, { planet, moon });
        collectMoons(child.children);
      }
    }
    collectMoons(chapter.children);
    return planet;
  });
  return { id: book.id, architecture: massProfile.kind, star, planets, topics };
}

/** Sample evenly through the orbits while keeping the active link available at any system size. */
export function visibleOrbitalBodies<T extends OrbitalPlanet | OrbitalMoon>(all: T[], limit: number, selected?: T) {
  if (all.length <= limit) return all;
  const orbits = [...all].sort((a,b) => a.orbit.radius - b.orbit.radius);
  const visible = Array.from({length: limit}, (_, i) => orbits[Math.floor((i + .5) * orbits.length / limit)]);
  if (selected && !visible.includes(selected)) {
    let nearest = 0;
    for (let i = 1; i < limit; i++) {
      if (Math.abs(visible[i].orbit.radius - selected.orbit.radius) < Math.abs(visible[nearest].orbit.radius - selected.orbit.radius)) nearest = i;
    }
    visible[nearest] = selected;
  }
  return visible;
}

export type SpaceLocation = {
  scene: string;
  point: SpacePoint;
  target?: string;
  planet?: string;
  moonOrbit?: CelestialOrbit;
};

export const spaceOrigin: SpacePoint = { x: 0, y: 0 };

export function planetaryLocation(system: PlanetarySystem, topicId?: string): SpaceLocation {
  const topic = topicId === undefined ? undefined : system.topics.get(topicId);
  const scene = 'system:' + system.id;
  if (!topic) return { scene, point: spaceOrigin };
  const { planet, moon } = topic;
  const point = pointOnOrbit(planet.orbit);
  if (moon) {
    const localPoint = pointOnOrbit(moon.orbit);
    return {
      scene, point: {x: point.x + .13 * localPoint.x, y: point.y + .13 * localPoint.y},
      target: moon.id, planet: planet.id, moonOrbit: moon.orbit,
    };
  }
  return { scene, point, target: planet.id, planet: planet.id };
}

export type OrbitalFlight = {
  kind: 'orbit' | 'lateral' | 'jump';
  frames: SpacePoint[];
  direction: number;
};

/** Camera offsets are normalized. An animation always ends at the destination. */
export function planOrbitalFlight(from: SpaceLocation, to: SpaceLocation): OrbitalFlight | null {
  if (from.scene === to.scene && from.target === to.target) return null;
  const x = from.point.x - to.point.x;
  const y = from.point.y - to.point.y;
  const direction = x > 0 ? 1 : -1;
  if (from.scene !== to.scene) return { kind: 'jump', frames: [], direction };

  if (from.planet === to.planet && from.moonOrbit && to.moonOrbit) {
    const source = from.moonOrbit, target = to.moonOrbit;
    const finalPoint = pointOnOrbit(target);
    const turn = Math.atan2(Math.sin(target.angle - source.angle), Math.cos(target.angle - source.angle));
    const frames = Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      const point = pointOnOrbit({ angle: source.angle + turn * t, radius: source.radius + (target.radius - source.radius) * t });
      return { x: point.x - finalPoint.x, y: point.y - finalPoint.y };
    });
    frames[frames.length - 1] = spaceOrigin;
    return { kind: 'orbit', frames, direction };
  }
  if (Math.hypot(x, y) <= .72) return { kind: 'lateral', frames: [{ x, y }, spaceOrigin], direction };
  return { kind: 'jump', frames: [], direction };
}
