import {orbitalFlowBand, type OrbitalFlowClock} from './orbital-flow.ts';
import {clampUnit, createOrbitalNoise, orbitalRandom, smoothUnit} from './orbital-noise.ts';

const diskVariants = ['spiral', 'twin-arms', 'rings', 'crescent'] as const;
const storageKey = 'antropologo:orbital-disk';
const TAU = Math.PI * 2;
const radialSteps = 36;
const angularSteps = 80;
const innerRadius = .30;
const radialStep = (1 - innerRadius) / radialSteps;
const angularStep = TAU / angularSteps;
const armInner = .278;
const armRange = .66;
const armExponent = 1.24;

export type OrbitalDiskVariant = typeof diskVariants[number];

type SpiralVariant = Exclude<OrbitalDiskVariant, 'rings'>;
type OrbitalArm = {angle: number; winding: number; bend: number; width: number; strength: number; reach: number; ripple: number};
type OrbitalRing = {radius: number; width: number; angle: number; strength: number; ripple: number; gap: number};
type OrbitalGlow = {angle: number; span: number; inner: number; width: number; strength: number; ripple: number};
type OrbitalFork = {arm: number; start: number; end: number; spread: number; strength: number};
type DiskShape =
  | {variant: 'rings'; rings: OrbitalRing[]}
  | {variant: SpiralVariant; arms: OrbitalArm[]; forks: OrbitalFork[]; glow: OrbitalGlow; outerLight: number};
type DiskProfile = DiskShape & {starCount: number};
type Random = () => number;

export type OrbitalAnchor = {angle: number; radius: number; band: number; density: number};
type DiskStar = {x: number; y: number; size: number; opacity: number; tint: 'primary' | 'secondary' | 'highlight'};

export type OrbitalDisk = {
  seed: number;
  profile: DiskProfile;
  density: Float32Array;
  stars: DiskStar[];
  anchors: OrbitalAnchor[];
};

export function pickOrbitalDisk(previous: string | null, random = Math.random): OrbitalDiskVariant {
  const options = diskVariants.filter(variant => variant !== previous);
  return options[Math.floor(random() * options.length)];
}

const spiralProfiles = {
  spiral: {arms: [.26, 2.64, 4.68], winding: 8.7, width: .40, outer: 1, inner: 1, glow: 2.65},
  'twin-arms': {arms: [.61, .61 + Math.PI], winding: 4.7, width: .31, outer: 1.32, inner: .58, glow: 3.28},
  crescent: {arms: [1.18], winding: 5.8, width: .48, outer: .54, inner: 1.12, glow: 1.93},
};

function createProfile(variant: OrbitalDiskVariant, random: Random): DiskProfile {
  const variation = (amount: number) => (2 * random() - 1) * amount;
  const offset = random() * TAU;
  const starCount = 1240 + Math.floor(random() * 361);
  if (variant === 'rings') {
    const rings = [.35, .55, .76].map((radius, index) => ({
      radius: radius + variation(.017 + index * .007),
      width: .052 + index * .009 + variation(.016),
      angle: offset + (index * 2.31) + variation(.43),
      strength: [1, .80, .68][index] + variation(.14),
      ripple: .014 + random() * .017,
      gap: offset + index * 1.7 + variation(1.5),
    }));
    return {variant, rings, starCount};
  }

  const base = spiralProfiles[variant];
  const winding = base.winding + variation(.85);
  const arms = base.arms.map((angle, index) => ({
    angle: angle + offset + variation(.31),
    winding: winding + variation(.72),
    bend: variation(1.65),
    width: base.width * (1 + variation(.25)),
    strength: 1 - index * .075 + variation(.15),
    reach: .96 - index * .038 + variation(.03),
    ripple: .055 + random() * .10,
  }));
  const forks = arms.map((arm, index) => {
    const start = .27 + random() * .25;
    return {
      arm: index, start, end: Math.min(arm.reach, start + .27 + random() * .22),
      spread: (index % 2 ? -1 : 1) * (.53 + random() * .55),
      strength: (variant === 'crescent' ? .31 : .47) + random() * .21,
    };
  });
  const glow = {
    angle: base.glow + offset + variation(.45),
    span: 2.03 + variation(variant === 'crescent' ? .51 : .28),
    inner: .309 + variation(.013),
    width: .34 + variation(.065),
    strength: base.inner * (1 + variation(.16)),
    ripple: .014 + random() * .023,
  };
  return {variant, arms, forks, glow, outerLight: base.outer * (1 + variation(.16)), starCount};
}

export function orbitalArmAngle(arm: OrbitalArm, progress: number) {
  return arm.angle + arm.winding * progress + arm.bend * progress * (1 - progress)
    + arm.ripple * Math.sin(progress * 13 + arm.angle);
}

export function orbitalArmRadius(progress: number) {
  return armInner + armRange * Math.pow(progress, armExponent);
}

export function orbitalRingLight(ring: OrbitalRing, angle: number) {
  const sector = .5 + .5 * Math.cos(angle - ring.angle);
  const gap = smoothUnit((1 - orbitalAngleDistance(angle, ring.gap) / .54));
  return (.32 + .68 * sector * sector) * (1 - .65 * gap);
}

export function orbitalRingRadius(ring: OrbitalRing, angle: number) {
  return ring.radius + ring.ripple * (.74 * Math.sin(3 * angle + ring.angle) + .26 * Math.sin(7 * angle - ring.angle));
}

export function orbitalForkOffset(fork: OrbitalFork, progress: number) {
  const along = clampUnit((progress - fork.start) / (fork.end - fork.start));
  return fork.spread * along * (.48 + .52 * along);
}

export function orbitalGlowInner(glow: OrbitalGlow, angle: number) {
  const offset = angle - glow.angle;
  return glow.inner + glow.ripple * (.70 * Math.sin(4 * offset) + .30 * Math.sin(9 * offset + glow.angle));
}

export function orbitalAngleDistance(first: number, second: number) {
  return Math.abs(((first - second + Math.PI) % TAU + TAU) % TAU - Math.PI);
}

function gaussian(offset: number) {
  return Math.exp(-.5 * offset * offset);
}

function buildDensity(profile: DiskProfile, seed: number) {
  const density = new Float32Array((radialSteps + 1) * angularSteps);
  const noise = createOrbitalNoise(seed ^ 0xe490ca57);
  const directions = Array.from({length: angularSteps}, (_, column) => {
    const angle = angularStep * column;
    const rings = profile.variant === 'rings'
      ? profile.rings.map(ring => ({radius: orbitalRingRadius(ring, angle), light: ring.strength * orbitalRingLight(ring, angle)})) : [];
    const glowInner = profile.variant === 'rings' ? 0 : orbitalGlowInner(profile.glow, angle);
    const arc = profile.variant === 'rings' ? 0 : Math.sqrt(Math.max(0, 1 - 2 * orbitalAngleDistance(angle, profile.glow.angle) / profile.glow.span));
    return {angle, x: Math.cos(angle), y: Math.sin(angle), rings, glowInner, arc};
  });
  for (let row = 0; row <= radialSteps; row++) {
    const radius = innerRadius + row * radialStep;
    const edge = Math.min(1, row / 2, (radialSteps - row) / 3);
    const progress = Math.pow((radius - armInner) / armRange, 1 / armExponent);
    const arms = profile.variant === 'rings' ? [] : profile.arms.map((arm, index) => {
      const fork = profile.forks[index];
      const angle = orbitalArmAngle(arm, progress);
      return {
        angle, width: arm.width * (.89 + .18 * Math.sin(8 * progress + arm.angle)),
        body: arm.strength * clampUnit((arm.reach - progress) / .14),
        forkAngle: angle + orbitalForkOffset(fork, progress),
        forkLight: fork.strength * smoothUnit((progress - fork.start) / .11) * smoothUnit((fork.end - progress) / .10),
      };
    });
    for (let column = 0; column < angularSteps; column++) {
      const {angle, x, y, rings, glowInner, arc} = directions[column];
      const coarse = noise(x * radius * 4.3, y * radius * 4.3);
      const detail = noise(x * radius * 13.5 + 9, y * radius * 13.5 - 7);
      let structure = 0;
      let dust = 0;
      if (profile.variant === 'rings') {
        for (let i = 0; i < profile.rings.length; i++) {
          const lane = (radius - rings[i].radius) / profile.rings[i].width;
          structure = Math.max(structure, gaussian(lane / .49) * rings[i].light);
          dust = Math.max(dust, gaussian((lane + .33) / .16));
        }
      } else {
        const {glow, outerLight} = profile;
        const innerLight = glow.strength * arc * gaussian((radius - glowInner - glow.width * .14) / (glow.width * .30));
        for (const arm of arms) {
          const angular = orbitalAngleDistance(angle, arm.angle) / arm.width;
          const fork = orbitalAngleDistance(angle, arm.forkAngle) / (arm.width * .61);
          structure = Math.max(structure, gaussian(angular) * arm.body, gaussian(fork) * arm.forkLight);
          dust = Math.max(dust, gaussian((angular - .52) / .22) * clampUnit(arm.body));
        }
        structure = Math.max(innerLight, structure * outerLight * (.88 - .19 * progress));
        dust = Math.max(dust, .55 * arc * gaussian((radius - glowInner - .05) / .021));
      }
      const knots = .61 + .42 * coarse + .22 * detail;
      const cavities = 1 - .44 * smoothUnit((.40 - coarse) * 3.4);
      const transmission = 1 - dust * (.14 + .42 * detail);
      density[row * angularSteps + column] = clampUnit(structure * edge * knots * cavities * transmission);
    }
  }
  return density;
}

/** Continuous sampling in unit-disk polar coordinates, before differential rotation. */
export function orbitalDensity(density: Float32Array, radius: number, angle: number) {
  if (radius < innerRadius || radius > 1) return 0;
  const radial = (radius - innerRadius) / radialStep;
  const angular = ((angle % TAU + TAU) % TAU) / angularStep;
  const row = Math.min(Math.floor(radial), radialSteps - 1);
  const col = Math.floor(angular) % angularSteps;
  const next = (col + 1) % angularSteps;
  const t = angular - Math.floor(angular);
  const low = density[row * angularSteps + col] * (1 - t) + density[row * angularSteps + next] * t;
  const high = density[(row + 1) * angularSteps + col] * (1 - t) + density[(row + 1) * angularSteps + next] * t;
  return low + (high - low) * (radial - row);
}

function createStars(density: Float32Array, count: number, random: Random): DiskStar[] {
  const weights = new Float64Array(radialSteps * angularSteps);
  let total = 0;
  for (let index = 0; index < weights.length; index++) {
    const radius = innerRadius + (Math.floor(index / angularSteps) + .5) * radialStep;
    const angle = (index % angularSteps + .5) * angularStep;
    const local = orbitalDensity(density, radius, angle);
    // Radius accounts for each polar cell's area. Even dark cells have mass.
    total += radius * (.065 + .935 * local * local);
    weights[index] = total;
  }

  return Array.from({length: count}, (_, index) => {
    const draw = total * random();
    let low = 0;
    let high = weights.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (draw < weights[mid]) high = mid;
      else low = mid + 1;
    }
    const radius = innerRadius + (Math.floor(low / angularSteps) + random()) * radialStep;
    const angle = (low % angularSteps + random()) * angularStep;
    const local = orbitalDensity(density, radius, angle);
    const grain = Math.pow(random(), 4);
    const brightness = random();
    const highlight = brightness > .96 - .085 * local;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      size: (highlight ? .0028 : .0008) + grain * .0039 * (.83 + .35 * local),
      opacity: highlight ? .49 + .46 * local : (.22 + .62 * brightness) * (.39 + .61 * local),
      tint: highlight ? 'highlight' : index % 3 === 0 ? 'primary' : 'secondary',
    };
  });
}

function createAnchors(density: Float32Array, random: Random): OrbitalAnchor[] {
  const perBand = 40;
  return [6, 7].flatMap(band => {
    const mid = orbitalFlowBand(band).radius;
    const phase = random() * TAU;
    return Array.from({length: perBand}, (_, index) => {
      // Stay inside the unfeathered part of one texture so the dot does not split across bands.
      const radius = mid + (random() - .5) * .012;
      const angle = (phase + (index + .65 * random()) * TAU / perBand) % TAU;
      return {angle, radius, band, density: orbitalDensity(density, radius, angle)};
    });
  });
}

export function createOrbitalDisk(variant: OrbitalDiskVariant, seed: number): OrbitalDisk {
  const profile = createProfile(variant, orbitalRandom(seed));
  const density = buildDensity(profile, seed);
  const stars = createStars(density, profile.starCount, orbitalRandom(seed ^ 0x4b208f97));
  const anchors = createAnchors(density, orbitalRandom(seed ^ 0x37abd6e3));
  return {seed, profile, density, stars, anchors};
}

let pageScene: {disk: OrbitalDisk; clock: OrbitalFlowClock} | undefined;

/** Called from client effects. Preferences and Home remounts reuse the same geometry and clock. */
export function pageOrbitalScene() {
  if (pageScene) return pageScene;
  let previous: string | null = null;
  try {
    previous = window.sessionStorage.getItem(storageKey);
  } catch {
    // Storage can be disabled while the canvas remains available.
  }
  const variant = pickOrbitalDisk(previous);
  const seed = Math.floor(Math.random() * 4294967296);
  pageScene = {disk: createOrbitalDisk(variant, seed), clock: {seconds: 0, speed: 1}};
  try {
    window.sessionStorage.setItem(storageKey, variant);
  } catch {
    // Keep the selection in memory for the lifetime of the document.
  }
  return pageScene;
}
