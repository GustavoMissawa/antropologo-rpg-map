import {orbitalPigment, originalOrbitalColors, type OrbitalColors} from './appearance-colors.ts';
import type {AppearanceMode} from './appearance.ts';
import type {OrbitalCriticalFrame} from './orbital-critical.ts';
import {ORBITAL_DISK_TILT_DEGREES} from './orbital-flow.ts';
import {clampUnit, createOrbitalNoise, orbitalRandom, smoothUnit} from './orbital-noise.ts';

type Palette = {gas: string; plasma: string; hot: string};
type Stops = ReadonlyArray<readonly [number, string]>;
const axis = ORBITAL_DISK_TILT_DEGREES * Math.PI / 180;

function jetPalette({primary, secondary}: OrbitalColors, mode: AppearanceMode): Palette {
  return {
    gas: orbitalPigment('#79c38e', originalOrbitalColors.primary, primary, mode),
    plasma: orbitalPigment('#f9d99e', originalOrbitalColors.secondary, secondary, mode),
    hot: orbitalPigment('#fff9ed', originalOrbitalColors.secondary, secondary, 'dark'),
  };
}

function sprite(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  return canvas;
}

function radialSprite(stops: Stops) {
  return sprite(128, 128, context => {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  });
}

function gaussian(x: number) {
  return Math.exp(-x * x);
}

function spine(t: number, bend: number) {
  return t * (.15 * Math.sin(t * 7 + bend) + .045 * Math.sin(t * 22 - bend));
}

function jetRadius(t: number) {
  return .10 + .24 * Math.sqrt(t) + .23 * t * t;
}

/** Bake the collimated plasma and turbulent sheath once, then reuse them for both poles. */
function plasmaSprite(seed: number, bend: number, colors: Palette, compact: boolean, mode: AppearanceMode) {
  const [width, height] = compact ? [96, 220] : [128, 320];
  const softGas = mode === 'light' ? .72 : .50;
  const radiance = mode === 'light' ? .98 : .78;
  const heat = mode === 'light' ? .86 : 1;
  const noise = createOrbitalNoise(seed ^ 0x1badb002);
  const rgb = [colors.gas, colors.plasma, colors.hot].map(hex =>
    [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16)));
  const [gas, plasma, hot] = rgb;

  return sprite(width, height, context => {
    const image = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const t = y / (height - 1);
      const fade = smoothUnit(t / .08) * (1 - smoothUnit((t - .60) / .40));
      const radius = jetRadius(t);
      const center = spine(t, bend);
      const fork = radius * (.38 + .27 * Math.sin(13 * t + bend));
      const spur = radius * (.38 + .28 * Math.cos(16 * t - bend));
      for (let x = 0; x < width; x++) {
        const cross = 2 * x / (width - 1) - 1;
        const current = cross - center - t * .24 * (noise(cross * 4 + 7, t * 11) - .5);
        const coarse = noise(cross * 9, t * 19 - 5);
        const detail = noise(cross * 24 - 7, t * 30 + 9);
        const gasDensity = gaussian(current / (radius * 1.32)) * (.28 + .42 * coarse + .30 * detail);
        const hotSpine = gaussian(current / (radius * (.19 + .21 * coarse))) * (.35 + .65 * detail);
        const branch = Math.max(gaussian((current - fork) / (.052 + .05 * t)),
          gaussian((current + spur) / (.043 + .047 * t))) * (.20 + .70 * coarse);
        const emission = clampUnit(.84 * hotSpine + .66 * branch);
        const highlight = clampUnit(.92 * hotSpine + .18 * branch * detail) * heat;
        const alpha = fade * smoothUnit((1 - Math.abs(cross)) * 5) * clampUnit(softGas * gasDensity + radiance * emission);
        const pixel = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const tinted = gas[channel] + (plasma[channel] - gas[channel]) * emission;
          image.data[pixel + channel] = tinted + (hot[channel] - tinted) * highlight;
        }
        image.data[pixel + 3] = alpha * 255;
      }
    }
    context.putImageData(image, 0, 0);
  });
}

export function createOrbitalJet(canvas: HTMLCanvasElement, seed: number) {
  const random = orbitalRandom(seed ^ 0xac7c147);
  const bend = random() * 2 * Math.PI;
  const trails = Array.from({length: 56}, (_, index) => ({
    side: index % 2 === 0 ? -1 : 1,
    phase: random(), speed: .43 + random() * .68,
    lane: 2 * random() - 1, extent: .016 + .084 * random(),
    strength: .25 + random() * .70,
  }));
  let context: CanvasRenderingContext2D | null | undefined;
  let visible = false;
  let resources: {key: string; colors: Palette; plume: HTMLCanvasElement; halo: HTMLCanvasElement; wave: HTMLCanvasElement} | undefined;

  return (frame: OrbitalCriticalFrame | null, colors: OrbitalColors, mode: AppearanceMode, compact: boolean) => {
    if (!frame) {
      if (visible && context) context.clearRect(0, 0, canvas.width, canvas.height);
      if (visible) delete canvas.dataset.painted;
      visible = false;
      return;
    }
    if (typeof window.CanvasRenderingContext2D === 'undefined') return;
    if (context === undefined) context = canvas.getContext('2d');
    if (!context) return;
    const size = compact ? 352 : 576;
    if (canvas.width !== size) canvas.width = canvas.height = size;
    const key = `${mode}/${colors.primary}/${colors.secondary}/${size}`;
    if (resources?.key !== key) {
      const palette = jetPalette(colors, mode);
      resources = {key, colors: palette, plume: plasmaSprite(seed, bend, palette, compact, mode),
        halo: radialSprite([[0, palette.hot], [.22, palette.plasma + 'dd'], [.54, palette.gas + '71'], [1, 'transparent']]),
        wave: radialSprite([[0, 'transparent'], [.72, 'transparent'], [.80, palette.gas + '44'],
          [.865, palette.plasma + 'b4'], [.89, palette.hot + 'c2'], [.95, palette.gas + '47'], [1, 'transparent']]),
      };
    }

    context.clearRect(0, 0, size, size);
    context.save();
    context.setTransform(size, 0, 0, size, size / 2, size / 2);

    // A circular wave grows toward the viewer in screen space.
    if (frame.shock > 0) {
      const radius = .10 + .44 * frame.wave;
      context.globalAlpha = frame.shock * (mode === 'dark' ? .45 : .43);
      context.drawImage(resources.wave, -radius, -radius, radius * 2, radius * 2);
    }
    context.rotate(axis);
    const halo = .242 - frame.compression * .63;
    if (frame.core > 0) {
      context.globalAlpha = frame.core * .58;
      context.drawImage(resources.halo, -halo, -halo * .55, 2 * halo, 1.1 * halo);
    }

    if (frame.jet > 0) {
      const span = .25;
      for (const side of [-1, 1]) {
        const forward = side < 0;
        const reach = frame.reach * (forward ? 1 : .88);
        const width = span * (forward ? 1 : .83);
        context.save();
        context.scale(side, side);
        context.globalAlpha = frame.jet * (forward ? .98 : .73);
        context.drawImage(resources.plume, -width / 2, 0, width, reach);
        context.restore();
      }

      context.lineCap = 'round';
      const count = compact ? 24 : trails.length;
      for (let i = 0; i < count; i++) {
        const trail = trails[i];
        const forward = trail.side < 0;
        const t = (trail.phase + trail.speed * frame.seconds) % 1;
        const end = Math.min(1, t + trail.extent);
        const fade = smoothUnit(t / .12) * (1 - smoothUnit((end - .68) / .32));
        const strength = fade * frame.jet * trail.strength;
        if (strength < .025) continue;
        const x = (spine(t, bend) + trail.lane * jetRadius(t)) * span * (forward ? .5 : .415);
        const endX = (spine(end, bend) + trail.lane * jetRadius(end)) * span * (forward ? .5 : .415);
        const reach = frame.reach * (forward ? 1 : .88);
        context.globalAlpha = strength * (forward ? .85 : .59);
        context.strokeStyle = i % 4 === 0 ? resources.colors.hot : i % 4 === 1 ? resources.colors.gas : resources.colors.plasma;
        context.lineWidth = .00065 + trail.strength * .0018;
        context.beginPath();
        context.moveTo(x * trail.side, t * reach * trail.side);
        context.lineTo(endX * trail.side, end * reach * trail.side);
        context.stroke();
      }
    }
    if (frame.core > 0) {
      const waist = .114 - frame.compression * .34;
      context.globalAlpha = frame.core * .88;
      context.drawImage(resources.halo, -waist, -waist * .61, 2 * waist, 1.22 * waist);
    }
    context.restore();
    if (!visible) canvas.dataset.painted = 'true';
    visible = true;
  };
}
