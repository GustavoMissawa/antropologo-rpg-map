import { clampUnit, orbitalRandom } from './orbital-noise.ts';

export const planetOrbitBounds = { inner: .28, outer: .94 } as const;
export const planetaryArchitectures = ['ordered', 'anti-ordered', 'mixed', 'similar'] as const;
export type PlanetaryArchitecture = typeof planetaryArchitectures[number];
export type Surface = 'rocky' | 'desert' | 'oceanic' | 'volcanic' | 'icy' | 'gas-giant' | 'ice-giant';
type SolidSurface = Exclude<Surface, 'gas-giant' | 'ice-giant'>;
export type Atmosphere = 'none' | 'thin' | 'dense';
export type Rings = 'ice' | 'dust' | null;

export type StellarProperties = {
  massSolar: number;
  luminositySolar: number;
  temperatureK: number;
  spectrum: 'cool' | 'temperate' | 'hot';
};

type SurfaceProperties<T extends Surface> = {
  massEarth: number;
  radiusEarth: number;
  densityGcm3: number;
  temperatureK: number;
  albedo: number;
  surface: T;
  atmosphere: Atmosphere;
  cratering: number;
};

export type PlanetaryProperties = SurfaceProperties<Surface> & {
  distanceAU: number;
  rings: Rings;
  storm: boolean;
};

export type LunarProperties = SurfaceProperties<SolidSurface> & { distanceKm: number };

type MassProfile = {
  kind: PlanetaryArchitecture;
  baseline: number;
  span: number;
  waves: number;
  direction: number;
};

export function createMassProfile(seed: number): MassProfile {
  const random = orbitalRandom(seed);
  return {
    kind: planetaryArchitectures[Math.floor(random() * planetaryArchitectures.length)],
    baseline: random(),
    span: random(),
    waves: 2 + Math.floor(random() * 2),
    direction: random() < .5 ? -1 : 1,
  };
}

export function estimateStar(seed: number): StellarProperties {
  const massSolar = .49 + orbitalRandom(seed)() ** 1.25 * 1.19;
  const temperatureK = 5772 * massSolar ** .53;
  return {
    massSolar, temperatureK, luminositySolar: massSolar ** 3.6,
    spectrum: temperatureK < 5050 ? 'cool' : temperatureK > 6650 ? 'hot' : 'temperate',
  };
}

function planetMass(profile: MassProfile, position: number, variation: number) {
  const baseline = profile.baseline;
  if (profile.kind === 'similar') return 10 ** (-.28 + 1.08 * baseline + .083 * variation);
  if (profile.kind === 'mixed') {
    const wave = Math.cos(2 * Math.PI * profile.waves * (position - .5));
    return 10 ** (.68 + .52 * baseline + profile.direction * wave * (1.05 + .39 * profile.span) + .48 * variation);
  }
  const direction = profile.kind === 'ordered' ? position : 1 - position;
  return 10 ** (-.72 + .27 * baseline + (3.2 + .47 * profile.span) * direction + .32 * variation);
}

function equilibriumTemperature(star: StellarProperties, distanceAU: number, albedo: number) {
  return 278.3 * (star.luminositySolar * (1 - albedo)) ** .25 / Math.sqrt(distanceAU);
}

function planetSurface(mass: number, irradiation: number, volatile: number, geology: number): Surface {
  if (mass >= 70) return 'gas-giant';
  if (mass >= 9 && (irradiation < 540 || volatile > .47)) return irradiation > 430 && mass > 25 ? 'gas-giant' : 'ice-giant';
  if (irradiation > 505 && (irradiation > 770 || geology > .48)) return 'volcanic';
  if (irradiation < 218 && volatile > .18) return 'icy';
  if (irradiation >= 250 && irradiation <= 395 && volatile > .46 && mass > .41) return 'oceanic';
  if (irradiation > 275 && (volatile < .56 || irradiation > 430) && geology > .19) return 'desert';
  return 'rocky';
}

const material = {
  rocky: { density: 3.8, spread: 2.4, albedo: .10, reflectance: .22 },
  desert: { density: 3.35, spread: 2.1, albedo: .23, reflectance: .22 },
  oceanic: { density: 2.65, spread: 1.55, albedo: .18, reflectance: .16 },
  volcanic: { density: 3.45, spread: 1.85, albedo: .07, reflectance: .17 },
  icy: { density: 1.4, spread: 1.95, albedo: .34, reflectance: .32 },
  'gas-giant': { density: .53, spread: .51, albedo: .19, reflectance: .35 },
  'ice-giant': { density: 1.24, spread: 1.08, albedo: .24, reflectance: .28 },
} satisfies Record<Surface, {density: number; spread: number; albedo: number; reflectance: number}>;

function describeSurface<T extends Surface>(surface: T, massEarth: number, geology: number, frost: number,
  air: Atmosphere, star: StellarProperties, distanceAU: number): SurfaceProperties<T> {
  const gas = surface === 'gas-giant';
  const ground = material[surface];
  const compression = gas ? Math.min(3.5, massEarth * .0025) : 1 + Math.max(0, Math.log10(massEarth)) * .25;
  const densityGcm3 = (ground.density + ground.spread * geology) * (gas ? 1 : compression) + (gas ? compression : 0);
  const radiusEarth = Math.cbrt(massEarth * 5.514 / densityGcm3);
  const albedo = ground.albedo + ground.reflectance * frost;
  return {
    massEarth, radiusEarth, densityGcm3, albedo, surface, atmosphere: air,
    temperatureK: equilibriumTemperature(star, distanceAU, albedo),
    cratering: air === 'none' || (air === 'thin' && surface !== 'oceanic')
      ? (surface === 'volcanic' ? .38 : .56) + frost * .35 : 0,
  };
}

export function estimatePlanet(profile: MassProfile, star: StellarProperties, orbitRadius: number, seed: number): PlanetaryProperties {
  const random = orbitalRandom(seed);
  const position = clampUnit((orbitRadius - planetOrbitBounds.inner) / (planetOrbitBounds.outer - planetOrbitBounds.inner));
  const distanceAU = .12 * (22 / .12) ** position;
  const massEarth = planetMass(profile, position, 2 * random() - 1);
  const volatile = random(), geology = random(), frost = random();
  const irradiation = equilibriumTemperature(star, distanceAU, .24);
  const surface = planetSurface(massEarth, irradiation, volatile, geology);
  const giant = surface === 'gas-giant' || surface === 'ice-giant';
  const retention = massEarth / (irradiation / 300) ** .65;
  const atmosphere = giant || (retention > .85 && volatile > .43) ? 'dense'
    : retention > .28 && volatile > .18 ? 'thin' : 'none';
  const rings = random() < (giant ? .53 : .045) ? (irradiation < 175 ? 'ice' : 'dust') : null;
  return {
    ...describeSurface(surface, massEarth, geology, frost, atmosphere, star, distanceAU),
    distanceAU, rings, storm: giant && random() < .65,
  };
}

export function estimateMoon(planet: PlanetaryProperties, star: StellarProperties, orbitRadius: number,
  seed: number): LunarProperties {
  const random = orbitalRandom(seed);
  const rock = random(), geology = random(), frost = random();
  const massEarth = Math.min(.046, planet.massEarth * .022) * (.012 + .988 * random() ** 2.8);
  const distanceKm = 6371 * planet.radiusEarth * (3 + 24 * clampUnit((orbitRadius - .32) / .64));
  const surface: SolidSurface = planet.temperatureK > 560 && geology > .62 ? 'volcanic'
    : planet.temperatureK < 244 && rock < .61 ? 'icy' : 'rocky';
  return {
    ...describeSurface(surface, massEarth, geology, frost, 'none', star, planet.distanceAU),
    distanceKm,
  };
}
