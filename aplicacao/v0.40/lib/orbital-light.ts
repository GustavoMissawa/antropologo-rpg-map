import {orbitalPigment, originalOrbitalColors, type OrbitalColors} from './appearance-colors.ts';
import type { AppearanceMode } from './appearance.ts';

const TAU = Math.PI * 2;

type LightContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Tint = (color: string) => string;

function randomStream(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type Filament = {
  phase: number;
  drift: number;
  ripple: number;
};

function traceFilament(ctx: LightContext, strand: Filament, start: number, end: number) {
  const segments = Math.max(6, Math.ceil((end - start) * 90));
  ctx.beginPath();
  for (let step = 0; step <= segments; step++) {
    const progress = start + (end - start) * step / segments;
    const angle = strand.phase + progress * 8.7;
    const radialDrift = strand.drift * (0.52 + 0.48 * Math.sin(progress * 2.2));
    const radius = 0.278 + 0.66 * Math.pow(progress, 1.24)
      + radialDrift + strand.ripple * Math.sin(angle * 2.4 + strand.phase);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function paintAccretionGlow(ctx: LightContext, random: () => number, tint: Tint, exposure: number) {
  const hot = tint('#ffc66b');
  const whiteHot = tint('#fff5cb');
  // A hotter inner crescent gives the spiral a bright side and a shadowed side.
  for (let i = 0; i < 575; i++) {
    const radius = 0.311 + Math.pow(random(), 2.15) * 0.34;
    const turn = random();
    const angle = 1.60 + turn * 2.03;
    const length = 0.04 + Math.pow(random(), 2.30) * 0.52;
    const energy = Math.pow(Math.sin(turn * Math.PI), 1.10) * (1.24 - radius);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (0.88 + 0.09 * random()), -0.18, angle, angle + length);
    ctx.strokeStyle = i % 4 ? hot : whiteHot;
    ctx.lineWidth = 0.00065 + Math.pow(random(), 3) * 0.004;
    ctx.globalAlpha = Math.min(1, (0.25 + 0.69 * random()) * energy * exposure);
    ctx.stroke();
  }

  const flareColors = ['#ffedb2dc', '#ffe19fc3', '#faaa4473', '#f0953325', '#dc771700'].map(tint);
  for (const [angle, radius, size, strength] of [[1.96, 0.37, 0.11, 0.74], [2.52, 0.35, 0.14, 1], [2.82, 0.36, 0.16, 1], [3.19, 0.37, 0.13, 0.88], [3.57, 0.41, 0.10, 0.62], [5.45, 0.69, 0.064, 0.78]]) {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const flare = ctx.createRadialGradient(x, y, 0, x, y, size);
    [0, 0.14, 0.35, 0.64, 1].forEach((stop, i) => flare.addColorStop(stop, flareColors[i]));
    ctx.globalAlpha = Math.min(1, strength * exposure);
    ctx.fillStyle = flare;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
}

function paintStream(ctx: LightContext, random: () => number, tint: Tint, exposure: number) {
  const arms = [0.26, 2.64, 4.68];
  const filaments = ['#ffac4c', '#ffd078', '#ffe3a5', '#fff2cb'].map(tint);
  const base = tint('#f39238');
  const shadow = tint('#f09931');
  const bright = tint('#ffe5a6');
  const peak = tint('#fff8de');

  // The diffuse body and the hot strands are baked into the same rotating plane.
  for (const phase of arms) {
    const strand = {phase, drift: 0, ripple: 0.012};
    ctx.strokeStyle = base;
    ctx.globalAlpha = 0.085 * exposure;
    ctx.lineWidth = 0.029;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 28 * ctx.canvas.width / 1024;
    traceFilament(ctx, strand, 0.04, 0.84);
    ctx.shadowBlur = 0;
  }
  for (let i = 0; i < 960; i++) {
    const phase = arms[i % arms.length] + (random() - 0.5) * (i % 5 ? 0.49 : 1.8);
    const start = Math.pow(random(), 1.17) * 0.95;
    const end = Math.min(0.99, start + 0.025 + Math.pow(random(), 1.85) * 0.32);
    const distance = Math.pow(start, 1.6);
    const spread = 0.037 + distance * 0.075;
    const middleAngle = phase + (start + end) * 4.35;
    const warmth = (0.65 + 0.35 * Math.cos(middleAngle - 2.7)) * (1 - distance * 0.57);
    ctx.strokeStyle = filaments[Math.floor(random() * filaments.length)];
    ctx.globalAlpha = (0.075 + random() * 0.37) * warmth * exposure;
    ctx.lineWidth = 0.00055 + Math.pow(random(), 2.15) * 0.0021;
    traceFilament(ctx, {
      phase,
      drift: (random() - 0.5) * spread * 2,
      ripple: (random() - 0.5) * 0.034,
    }, start, end);
  }
  for (let i = 0; i < 64; i++) {
    const start = 0.025 + Math.pow(random(), 1.35) * 0.85;
    ctx.strokeStyle = i % 3 ? bright : peak;
    ctx.globalAlpha = Math.min(1, (0.28 + 0.42 * random()) * exposure);
    ctx.lineWidth = 0.0008 + random() * 0.0013;
    traceFilament(ctx, {
      phase: arms[i % arms.length] + (random() - 0.5) * 0.14,
      drift: (random() - 0.5) * 0.046,
      ripple: 0.012,
    }, start, Math.min(0.93, start + 0.013 + random() * 0.095));
  }

  const heat = ctx.createRadialGradient(0, 0, 0.24, 0, 0, 0.94);
  heat.addColorStop(0, 'transparent');
  heat.addColorStop(0.28, tint('#ec9a4022'));
  heat.addColorStop(0.69, tint('#c6792920'));
  heat.addColorStop(1, 'transparent');
  ctx.globalAlpha = 1;
  ctx.fillStyle = heat;
  ctx.fillRect(-1, -1, 2, 2);
  paintAccretionGlow(ctx, random, tint, exposure);
}

function paintDust(ctx: LightContext, random: () => number, primary: Tint, secondary: Tint) {
  const sweep = secondary('#f6b66d');
  const sweepAccent = primary('#75bcad');
  const particle = secondary('#ffcf8c');
  const particleAccent = primary('#91dacc');
  for (let i = 0; i < 226; i++) {
    const radius = 0.31 + random() * 0.68;
    const start = random() * TAU;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (0.95 + random() * 0.06),
      random() * 0.15, start, start + 0.05 + random() * 1.04);
    ctx.globalAlpha = (0.04 + random() * 0.30) * (1 - radius * 0.51);
    ctx.lineWidth = 0.0006 + random() * 0.0014;
    ctx.strokeStyle = i % 8 ? sweep : sweepAccent;
    ctx.stroke();
  }
  for (let i = 0; i < 1900; i++) {
    const angle = random() * TAU;
    const radius = 0.32 + Math.pow(random(), 0.7) * 0.68;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const point = 0.00085 + Math.pow(random(), 4) * 0.0046;
    ctx.globalAlpha = (0.16 + 0.73 * random()) * (1 - radius * 0.40);
    ctx.fillStyle = i % 3 ? particle : particleAccent;
    ctx.fillRect(x, y, point, point);
  }
}

/** Render bounded textures once. CSS rotates both planes without repainting their filaments. */
export function paintOrbitalLight(
  stream: HTMLCanvasElement | OffscreenCanvas,
  dust: HTMLCanvasElement | OffscreenCanvas,
  colors: OrbitalColors = originalOrbitalColors,
  mode: AppearanceMode = 'dark',
) {
  const light = stream.getContext('2d');
  const particles = dust.getContext('2d');
  if (!light || !particles) return false;

  const random = randomStream(401738);
  for (const ctx of [light, particles]) {
    const {width, height} = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const radius = Math.min(width, height) * 0.481;
    ctx.save();
    ctx.setTransform(radius, 0, 0, radius, width / 2, height / 2);
    ctx.globalCompositeOperation = mode === 'dark' ? 'lighter' : 'source-over';
    ctx.lineCap = 'round';
  }
  const primary = (value: string) => orbitalPigment(value, originalOrbitalColors.primary, colors.primary, mode);
  const secondary = (value: string) => orbitalPigment(value, originalOrbitalColors.secondary, colors.secondary, mode);
  paintStream(light, random, secondary, mode === 'light' ? 1.58 : 1);
  paintDust(particles, random, primary, secondary);
  light.restore();
  particles.restore();
  return true;
}

export type OrbitalBitmaps = [ImageBitmap, ImageBitmap];
export type OrbitalLightRequest = { size: number; colors: OrbitalColors; mode: AppearanceMode };

export function paintOrbitalBitmaps({size, colors, mode}: OrbitalLightRequest): OrbitalBitmaps | null {
  const light = new OffscreenCanvas(size, size);
  const dust = new OffscreenCanvas(size, size);
  if (!paintOrbitalLight(light, dust, colors, mode)) return null;
  return [light.transferToImageBitmap(), dust.transferToImageBitmap()];
}
