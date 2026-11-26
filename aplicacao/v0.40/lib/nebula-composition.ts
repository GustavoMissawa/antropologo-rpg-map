import {orbitalRandom, orbitalSeed} from './orbital-noise.ts';

const anchors = ['north', 'east', 'southwest', 'south', 'northeast'] as const;
const families = ['diffuse', 'filament', 'dark', 'pillars'] as const;
export type NebulaFamily = typeof families[number];
type NebulaAccent = Exclude<NebulaFamily, 'pillars'>;

const accents: Record<NebulaFamily, readonly NebulaAccent[]> = {
  diffuse: ['dark', 'filament'],
  filament: ['diffuse', 'dark'],
  dark: ['diffuse', 'filament'],
  pillars: ['diffuse', 'filament'],
};

export type NebulaComposition = {
  seed: number;
  family: NebulaFamily;
  accent: NebulaAccent | null;
  anchor: typeof anchors[number];
  x: number;
  y: number;
  tilt: number;
  scale: number;
  aspect: number;
  opacity: number;
};

export function createNebulaComposition(seed: number): NebulaComposition | null {
  const random = orbitalRandom(orbitalSeed(seed ^ 0xf966fb73));
  if (random() < 1 / 3) return null;

  const draw = random();
  const family = families[draw < .35 ? 0 : draw < .60 ? 1 : draw < .80 ? 2 : 3];
  const accent = random() < .18 ? accents[family][Math.floor(random() * 2)] : null;
  const variation = (range: number) => (2 * random() - 1) * range;
  const anchor = anchors[Math.floor(random() * anchors.length)];
  return {
    seed, family, accent, anchor,
    x: variation(6), y: variation(7), tilt: variation(family === 'pillars' ? 30 : 41),
    scale: (family === 'diffuse' ? 1.12 : 1) + variation(.20),
    aspect: (family === 'pillars' ? 1.20 : 1.46) + variation(.12),
    opacity: .89 + variation(.11),
  };
}

let pageComposition: NebulaComposition | null | undefined;

/** The empty result also persists when the Home is remounted. */
export function pageNebulaComposition() {
  if (pageComposition === undefined && typeof window !== 'undefined') {
    pageComposition = createNebulaComposition(crypto.getRandomValues(new Uint32Array(1))[0]);
  }
  return pageComposition ?? null;
}
