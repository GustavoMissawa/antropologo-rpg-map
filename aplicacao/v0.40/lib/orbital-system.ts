import type { Rule, Rulebook } from './model.ts';
import { orbitalRandom, orbitalSeed } from './orbital-noise.ts';

const fullTurn = Math.PI * 2;
const appearanceVersion = 'orbital-system-1';

export type SpacePoint = { x: number; y: number };
export type CelestialOrbit = { radius: number; angle: number };
export type CelestialAppearance = {
  type: 'star' | 'rock' | 'gas' | 'ice';
  light: string;
  base: string;
  shade: string;
  size: number;
  tilt: number;
  rings: boolean;
};

export type CelestialBody = {
  id: string;
  title: string;
  seed: number;
  appearance: CelestialAppearance;
};
export type OrbitalMoon = CelestialBody & { planetId: string; orbit: CelestialOrbit };
export type OrbitalPlanet = CelestialBody & { orbit: CelestialOrbit; moons: OrbitalMoon[] };
export type OrbitalTopic = { planet: OrbitalPlanet; moon?: OrbitalMoon };
export type PlanetarySystem = {
  id: string;
  star: CelestialBody;
  planets: OrbitalPlanet[];
  topics: ReadonlyMap<string, OrbitalTopic>;
};

const starColors = [
  ['#fff0cd', '#ffb16a', '#912f21'],
  ['#fff9e4', '#ffdb89', '#9b5728'],
  ['#edf7ff', '#a2c9ef', '#304b91'],
] as const;
const rockColors = [
  ['#efcaaa', '#ab684c', '#382727'],
  ['#e5d9ae', '#9e8461', '#383137'],
  ['#cbd8cd', '#5e8c88', '#203641'],
  ['#ded9da', '#807985', '#2d2a34'],
] as const;
const gasColors = [
  ['#f5dbc1', '#c69265', '#51414f'],
  ['#c6edee', '#6fa8b0', '#253d60'],
  ['#eddfec', '#b494b9', '#463b64'],
] as const;
const iceColors = [
  ['#e8f5fa', '#81a6c0', '#314361'],
  ['#e3f2ea', '#9abbbf', '#324957'],
  ['#efdde8', '#9a93b6', '#403c61'],
] as const;

export function celestialSeed(...ids: string[]): number {
  const key = JSON.stringify([appearanceVersion, ...ids]);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return orbitalSeed(hash);
}

function makeBody(id: string, title: string, kind: 'star' | 'planet' | 'moon', seed: number): CelestialBody {
  const random = orbitalRandom(seed);
  const type = kind === 'star' ? 'star' : kind === 'moon'
    ? random() < .78 ? 'rock' : 'ice'
    : (['rock', 'gas', 'ice'] as const)[Math.floor(random() * 3)];
  const colors = {star: starColors, rock: rockColors, gas: gasColors, ice: iceColors}[type];
  const [light, base, shade] = colors[Math.floor(random() * colors.length)];
  const size = (kind === 'star' ? 1.45 : kind === 'moon' ? .3 : type === 'gas' ? .95 : .68) * (.88 + random() * .3);
  return { id, title, seed, appearance: { type, light, base, shade, size, tilt: random() * 48 - 24, rings: type === 'gas' && random() < .58 } };
}

function makeOrbit(seed: number, inner: number, outer: number): CelestialOrbit {
  const random = orbitalRandom(orbitalSeed(seed));
  const angle = fullTurn * (orbitalSeed(seed ^ 0x43823fed) / 4294967296);
  return { radius: inner + (outer - inner) * random(), angle };
}

export function pointOnOrbit(orbit: CelestialOrbit): SpacePoint {
  return { x: orbit.radius * Math.cos(orbit.angle), y: orbit.radius * Math.sin(orbit.angle) };
}

/** Body identity comes from the saved IDs. Chapter order and visual preferences are absent. */
export function createPlanetarySystem(book: Pick<Rulebook, 'id' | 'name' | 'chapters'>): PlanetarySystem {
  const topics = new Map<string, OrbitalTopic>();
  const planets = book.chapters.map(chapter => {
    const body = makeBody(chapter.id, chapter.title, 'planet', celestialSeed(book.id, 'planet', chapter.id));
    const planet: OrbitalPlanet = { ...body, orbit: makeOrbit(body.seed, .28, .94), moons: [] };
    topics.set(planet.id, { planet });

    function collectMoons(children: Rule[]) {
      for (const child of children) {
        const body = makeBody(child.id, child.title, 'moon', celestialSeed(book.id, 'moon', child.id));
        const moon = { ...body, planetId: planet.id, orbit: makeOrbit(body.seed, .32, .96) };
        planet.moons.push(moon);
        topics.set(child.id, { planet, moon });
        collectMoons(child.children);
      }
    }
    collectMoons(chapter.children);
    return planet;
  });
  return { id: book.id, star: makeBody(book.id, book.name, 'star', celestialSeed(book.id, 'star')), planets, topics };
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
