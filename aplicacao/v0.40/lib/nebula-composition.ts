import {orbitalRandom, orbitalSeed} from './orbital-noise.ts';

const west = ['north', 'southwest'] as const;
const east = ['east', 'south', 'northeast'] as const;
const anchors = [...west, ...east];
const families = [
  {family: 'diffuse', weight: 35}, {family: 'filament', weight: 25},
  {family: 'dark', weight: 20}, {family: 'pillars', weight: 20},
] as const;
export type NebulaFamily = typeof families[number]['family'];
type NebulaAccent = Exclude<NebulaFamily, 'pillars'>;

const accents: Record<NebulaFamily, readonly NebulaAccent[]> = {
  diffuse: ['dark', 'filament'],
  filament: ['diffuse', 'dark'],
  dark: ['diffuse', 'filament'],
  pillars: ['diffuse', 'filament'],
};

export type NebulaFormation = {
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

export function createNebulaComposition(seed: number): NebulaFormation[] {
  const random = orbitalRandom(orbitalSeed(seed ^ 0xf966fb73));
  if (random() < 1 / 3) return [];

  const abundance = random();
  const count = abundance < .50 ? 1 : abundance < .85 ? 2 : 3;
  const available = [...families];
  const occupied: NebulaFormation['anchor'][] = [];
  return Array.from({length: count}, (_, index) => {
    let draw = random() * available.reduce((sum, item) => sum + item.weight, 0);
    const [{family}] = available.splice(available.findIndex(item => (draw -= item.weight) < 0), 1);
    const accent = random() < .18 ? accents[family][Math.floor(random() * 2)] : null;
    const variation = (range: number) => (2 * random() - 1) * range;
    const options = index === 1
      ? west.some(anchor => anchor === occupied[0]) ? east : west
      : anchors.filter(anchor => !occupied.includes(anchor));
    const anchor = options[Math.floor(random() * options.length)];
    occupied.push(anchor);
    const size = count === 1 ? 1.65 : count === 2 ? .83 : .68;
    return {
      seed: orbitalSeed(seed ^ Math.imul(index + 1, 0x9e3779b9)), family, accent, anchor,
      x: variation(6), y: variation(7), tilt: variation(family === 'pillars' ? 30 : 41),
      scale: size * ((family === 'diffuse' ? 1.12 : 1) + variation(.20)),
      aspect: (family === 'pillars' ? 1.20 : 1.46) + variation(.12),
      opacity: .89 + variation(.11),
    };
  });
}

const emptyComposition: readonly NebulaFormation[] = [];
let pageComposition: readonly NebulaFormation[] | undefined;

/** The empty result also persists when the Home is remounted. */
export function pageNebulaComposition() {
  if (pageComposition === undefined && typeof window !== 'undefined') {
    pageComposition = createNebulaComposition(crypto.getRandomValues(new Uint32Array(1))[0]);
  }
  return pageComposition ?? emptyComposition;
}
