import {orbitalPigment, originalOrbitalColors, type OrbitalColors} from './appearance-colors.ts';
import type { AppearanceMode } from './appearance.ts';
import {orbitalArmAngle, orbitalArmRadius, orbitalDensity, orbitalForkOffset, orbitalGlowInner, orbitalRingLight, orbitalRingRadius, type OrbitalDisk} from './orbital-disk.ts';
import {ORBITAL_DISK_SCALE} from './orbital-flow.ts';
import {orbitalRandom} from './orbital-noise.ts';

const TAU = Math.PI * 2;
type LightContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Tint = (color: string) => string;
type Spiral = Exclude<OrbitalDisk['profile'], {variant: 'rings'}>;
type Arm = Spiral['arms'][number];
type Fork = Spiral['forks'][number];

type Filament = {phase: number; drift: number; ripple: number};

function traceFilament(ctx: LightContext, arm: Arm, strand: Filament, start: number, end: number, fork?: Fork) {
  const segments = Math.max(6, Math.ceil((end - start) * 84));
  ctx.beginPath();
  for (let step = 0; step <= segments; step++) {
    const progress = start + (end - start) * step / segments;
    const angle = orbitalArmAngle(arm, progress) + strand.phase + (fork ? orbitalForkOffset(fork, progress) : 0);
    const radialDrift = strand.drift * (0.52 + 0.48 * Math.sin(progress * 2.2));
    const radius = orbitalArmRadius(progress) + radialDrift + strand.ripple * Math.sin(angle * 2.4 + arm.angle);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function paintAccretionGlow(ctx: LightContext, random: () => number, tint: Tint, exposure: number, glow: Spiral['glow'], density: Float32Array) {
  const hot = tint('#ffc66b');
  const whiteHot = tint('#fff5cb');
  for (let i = 0; i < 540; i++) {
    const spread = Math.pow(random(), 2.15) * glow.width;
    const turn = random();
    const angle = glow.angle + (turn - .5) * glow.span;
    const radius = orbitalGlowInner(glow, angle) + spread;
    const length = 0.04 + Math.pow(random(), 2.30) * 0.52;
    const energy = Math.pow(Math.sin(turn * Math.PI), 1.10) * (1.24 - radius);
    const local = orbitalDensity(density, radius, angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (.94 + .05 * random()), -.08, angle, angle + length);
    ctx.strokeStyle = i % 4 ? hot : whiteHot;
    ctx.lineWidth = 0.00065 + Math.pow(random(), 3) * 0.004 * (glow.width / .34);
    ctx.globalAlpha = Math.min(1, (.25 + .69 * random()) * energy * exposure * (.54 + .62 * local));
    ctx.stroke();
  }

  const flareColors = ['#ffedb2dc', '#ffe19fc3', '#faaa4473', '#f0953325', '#dc771700'].map(tint);
  for (const offset of [-.36, -.19, -.03, .15, .33]) {
    const angle = glow.angle + (offset + .025 * (random() - .5)) * glow.span;
    const radius = orbitalGlowInner(glow, angle) + (.12 + random() * .13) * glow.width;
    const size = .047 + .074 * random();
    const local = orbitalDensity(density, radius, angle);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const flare = ctx.createRadialGradient(x, y, 0, x, y, size);
    [0, .14, .35, .64, 1].forEach((stop, i) => flare.addColorStop(stop, flareColors[i]));
    ctx.globalAlpha = Math.min(1, (.23 + .72 * local) * exposure);
    ctx.fillStyle = flare;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
}

function paintStream(ctx: LightContext, random: () => number, tint: Tint, exposure: number, profile: Spiral, density: Float32Array) {
  const {arms, forks, outerLight, glow} = profile;
  const streamExposure = exposure * outerLight;
  const filaments = ['#ffac4c', '#ffd078', '#ffe3a5', '#fff2cb'].map(tint);
  const base = tint('#f39238');
  const shadow = tint('#f09931');
  const bright = tint('#ffe5a6');
  const peak = tint('#fff8de');

  for (const arm of arms) {
    ctx.strokeStyle = base;
    ctx.globalAlpha = .085 * streamExposure * arm.strength;
    ctx.lineWidth = .025 + .012 * arm.width;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 28 * ctx.canvas.width / 1024;
    traceFilament(ctx, arm, {phase: 0, drift: 0, ripple: .012}, .04, arm.reach - .10);
    ctx.shadowBlur = 0;
  }
  for (let i = 0; i < 920; i++) {
    const index = i % arms.length;
    const arm = arms[index];
    const fork = Math.floor(i / arms.length) % 6 === 0 ? forks[index] : undefined;
    const phase = (random() - .5) * arm.width * (fork ? .8 : i % 5 ? 1.33 : 4.5);
    const limit = fork?.end ?? arm.reach;
    const origin = fork?.start ?? 0;
    const start = origin + Math.pow(random(), 1.17) * (limit - origin - .02);
    const end = Math.min(limit, start + .024 + Math.pow(random(), 1.85) * .28);
    const distance = Math.pow(start, 1.6);
    const spread = (.037 + distance * .075) * (.76 + arm.width * .63);
    const mid = (start + end) / 2;
    const angle = orbitalArmAngle(arm, mid) + phase + (fork ? orbitalForkOffset(fork, mid) : 0);
    const local = orbitalDensity(density, orbitalArmRadius(mid), angle);
    const light = (.34 + .98 * local) * (1 - distance * .49);
    ctx.strokeStyle = filaments[Math.floor(random() * filaments.length)];
    ctx.globalAlpha = Math.min(1, (.090 + random() * .47) * light * streamExposure * (fork?.strength ?? arm.strength));
    ctx.lineWidth = .00055 + Math.pow(random(), 2.15) * .0021;
    traceFilament(ctx, arm, {
      phase,
      drift: (random() - .5) * spread * (fork ? 1.2 : 2),
      ripple: (random() - .5) * .034,
    }, start, end, fork);
  }
  for (let i = 0; i < 64; i++) {
    const arm = arms[i % arms.length];
    const start = .025 + Math.pow(random(), 1.35) * (arm.reach - .10);
    const local = orbitalDensity(density, orbitalArmRadius(start), orbitalArmAngle(arm, start));
    ctx.strokeStyle = i % 3 ? bright : peak;
    ctx.globalAlpha = Math.min(1, (.23 + .45 * random()) * streamExposure * arm.strength * (.45 + .85 * local));
    ctx.lineWidth = .0008 + random() * .0013;
    traceFilament(ctx, arm, {
      phase: (random() - .5) * .14,
      drift: (random() - .5) * .046,
      ripple: .012,
    }, start, Math.min(arm.reach, start + .013 + random() * .095));
  }

  const heat = ctx.createRadialGradient(0, 0, .24, 0, 0, .94);
  heat.addColorStop(0, 'transparent');
  heat.addColorStop(.28, tint('#ec9a4022'));
  heat.addColorStop(.69, tint('#c6792920'));
  heat.addColorStop(1, 'transparent');
  ctx.globalAlpha = 1;
  ctx.fillStyle = heat;
  ctx.fillRect(-1, -1, 2, 2);
  paintAccretionGlow(ctx, random, tint, exposure * glow.strength, glow, density);
}

function paintRings(ctx: LightContext, random: () => number, tint: Tint, exposure: number, rings: Extract<OrbitalDisk['profile'], {variant: 'rings'}>['rings'], density: Float32Array) {
  const filament = tint('#ffc16c');
  const spark = tint('#fff2cb');
  const vapor = tint('#f0a04826');
  for (const ring of rings) {
    const {width, strength} = ring;
    ctx.strokeStyle = vapor;
    ctx.lineWidth = width * .65;
    for (let i = 0; i < 18; i++) {
      const angle = (i + random() * .5) * TAU / 18;
      const radius = orbitalRingRadius(ring, angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius, 0, angle - .21, angle + .22);
      ctx.globalAlpha = .52 * orbitalDensity(density, radius, angle);
      ctx.stroke();
    }
    const traces = Math.round(190 + 170 * strength);
    for (let i = 0; i < traces; i++) {
      const drift = (random() + random() - 1) * width;
      const angle = random() * TAU;
      const length = .04 + Math.pow(random(), 1.7) * .82;
      const mid = angle + length / 2;
      const radius = orbitalRingRadius(ring, mid) + drift;
      const local = orbitalDensity(density, radius, mid);
      const energy = orbitalRingLight(ring, mid) * (.54 + 1.15 * local);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * (.988 + random() * .018), 0, angle, angle + length);
      ctx.strokeStyle = i % 5 ? filament : spark;
      ctx.lineWidth = .0006 + Math.pow(random(), 2.3) * .0022;
      ctx.globalAlpha = Math.min(1, strength * energy * (.10 + random() * .39) * exposure);
      ctx.stroke();
    }
  }
}

function paintDust(ctx: LightContext, random: () => number, primary: Tint, secondary: Tint, disk: OrbitalDisk) {
  const sweep = secondary('#f6b66d');
  const sweepAccent = primary('#75bcad');
  const starPigments = {
    secondary: secondary('#ffcf8c'),
    primary: primary('#91dacc'),
    highlight: secondary('#ffebbc'),
  };
  for (let i = 0; i < 192; i++) {
    const radius = .31 + random() * .68;
    const angle = random() * TAU;
    const local = orbitalDensity(disk.density, radius, angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (.95 + random() * .06),
      random() * .15, angle, angle + .05 + random() * 1.04);
    ctx.globalAlpha = (.04 + random() * .30) * (1 - radius * .51) * (.63 + .67 * local);
    ctx.lineWidth = .0006 + random() * .0014;
    ctx.strokeStyle = i % 8 ? sweep : sweepAccent;
    ctx.stroke();
  }
  for (const star of disk.stars) {
    ctx.globalAlpha = star.opacity;
    ctx.fillStyle = starPigments[star.tint];
    ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
  }

  ctx.fillStyle = secondary('#ffedb2');
  for (const {angle, radius, density} of disk.anchors) {
    const size = .0024 + .0016 * density;
    ctx.globalAlpha = .37 + .48 * density;
    ctx.fillRect(radius * Math.cos(angle) - size / 2, radius * Math.sin(angle) - size / 2, size, size);
  }
}

/** Paint the cached composition once for the existing differential flow. */
export function paintOrbitalLight(
  stream: HTMLCanvasElement | OffscreenCanvas,
  dust: HTMLCanvasElement | OffscreenCanvas,
  disk: OrbitalDisk,
  colors: OrbitalColors = originalOrbitalColors,
  mode: AppearanceMode = 'dark',
) {
  const light = stream.getContext('2d');
  const particles = dust.getContext('2d');
  if (!light || !particles) return false;

  for (const ctx of [light, particles]) {
    const {width, height} = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const radius = Math.min(width, height) * ORBITAL_DISK_SCALE;
    ctx.save();
    ctx.setTransform(radius, 0, 0, radius, width / 2, height / 2);
    ctx.globalCompositeOperation = mode === 'dark' ? 'lighter' : 'source-over';
    ctx.lineCap = 'round';
  }
  const primary = (value: string) => orbitalPigment(value, originalOrbitalColors.primary, colors.primary, mode);
  const secondary = (value: string) => orbitalPigment(value, originalOrbitalColors.secondary, colors.secondary, mode);
  const exposure = mode === 'light' ? 1.58 : 1;
  const {profile, density, seed} = disk;
  const random = orbitalRandom(seed ^ 0x84be3fa7);
  if (profile.variant === 'rings') paintRings(light, random, secondary, exposure, profile.rings, density);
  else paintStream(light, random, secondary, exposure, profile, density);
  paintDust(particles, orbitalRandom(seed ^ 0x2f243c29), primary, secondary, disk);
  light.restore();
  particles.restore();
  return true;
}

export type OrbitalBitmaps = [ImageBitmap, ImageBitmap];
export type OrbitalLightRequest = {size: number; colors: OrbitalColors; mode: AppearanceMode; disk: OrbitalDisk};

export function paintOrbitalBitmaps({size, colors, mode, disk}: OrbitalLightRequest): OrbitalBitmaps | null {
  const light = new OffscreenCanvas(size, size);
  const dust = new OffscreenCanvas(size, size);
  if (!paintOrbitalLight(light, dust, disk, colors, mode)) return null;
  return [light.transferToImageBitmap(), dust.transferToImageBitmap()];
}
