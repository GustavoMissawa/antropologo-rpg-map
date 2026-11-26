import type {OrbitalColors} from './appearance-colors.ts';
import type {AppearanceMode} from './appearance.ts';
import type {NebulaComposition} from './nebula-composition.ts';
import {clampUnit, createOrbitalNoise, orbitalRandom, smoothUnit} from './orbital-noise.ts';

type Random = () => number;
type Field = (x: number, y: number) => number;
type RGB = [number, number, number];

export type NebulaMaterial = {width: number; height: number; channels: Uint8Array};

export const COMPACT_NEBULA_WIDTH = 192;
export const WIDE_NEBULA_WIDTH = 288;

function volume(x: number, y: number, width: number, height: number) {
  const support = Math.max(0, 1 - (x / width) ** 2 - (y / height) ** 2);
  return support * support;
}

function diffuseField(random: Random): Field {
  const lobes = [-.53, -.16, .19, .53].map((x, index) => ({
    x: x + random() * .22 - .11,
    y: (index % 2 ? -.12 : .13) + random() * .37 - .15,
    width: .40 + random() * .31,
    height: .38 + random() * .32,
    strength: .61 + random() * .43,
  }));
  const hollow = random() * .40 - .20;
  return (x, y) => {
    let gas = 0;
    for (const lobe of lobes) gas += lobe.strength * volume(x - lobe.x, y - lobe.y, lobe.width, lobe.height);
    return Math.max(0, gas - .74 * volume(x - hollow, y + .16, .34, .30)
      - .55 * volume(x + hollow + .25, y - .24, .20, .20));
  };
}

function filamentField(random: Random): Field {
  const phase = random() * Math.PI * 2;
  const amplitude = .19 + random() * .13;
  const strands = Array.from({length: 6}, (_, index) => ({
    side: index % 2 ? -1 : 1,
    offset: .039 + index * .048 + random() * .031,
    phase: phase + random() * 2.7,
    spread: .024 + random() * .062,
    start: -.95 + random() * .45,
    end: .49 + random() * .48,
  }));
  return (x, y) => {
    const spine = amplitude * Math.sin(3.1 * x + phase) + .27 * x * x - .09;
    let light = 0;
    for (const strand of strands) {
      if (x < strand.start || x > strand.end) continue;
      const bend = strand.side * strand.offset * (.40 + .60 * Math.cos(3.9 * x + strand.phase));
      const lane = Math.max(0, 1 - Math.abs(y - spine - bend) / strand.spread);
      const taper = Math.min(1, (x - strand.start) * 5.5, (strand.end - x) * 5.5);
      light = Math.max(light, lane * taper);
    }
    return light;
  };
}

function darkField(random: Random): Field {
  const phase = random() * Math.PI * 2;
  const amplitude = .14 + random() * .17;
  const tip = .15 + random() * .18;
  const root = -.42 + random() * .34;
  return (x, y) => {
    const spine = amplitude * Math.sin(2.8 * x + phase) + .18 * x + .04;
    const width = .19 + .095 * Math.sin(x * 3.6 + phase);
    const lane = Math.max(0, 1 - Math.abs(y - spine) / width) * smoothUnit((.94 - Math.abs(x)) * 3.5);
    const spur = volume(x - tip, y - spine + .13, .22, .29);
    const shelf = .82 * volume(x - root, y - spine - .12, .29, .37);
    const opening = .58 * volume(x + .32, y - spine - .06, .19, .13);
    return Math.max(0, Math.max(lane * .83, spur, shelf) - opening);
  };
}

function pillarField(random: Random): Field {
  const columns = [-.45, -.06, .36].map(x => ({
    x: x + random() * .18 - .09,
    top: -.21 - random() * .46,
    width: .13 + random() * .11,
    lean: random() * .46 - .23,
    phase: random() * 6.3,
  }));
  return (x, y) => {
    let dust = .66 * volume(x - .02, y - .62, .79, .39);
    for (const column of columns) {
      const progress = (y - column.top) / (.78 - column.top);
      const taper = smoothUnit(progress * 8) * smoothUnit((1.19 - progress) * 4);
      if (taper <= 0) continue;
      const spine = column.x + column.lean * (1 - progress) + .048 * Math.sin(progress * 5 + column.phase);
      const radius = column.width * (.40 + .60 * clampUnit(progress));
      const body = Math.max(0, 1 - Math.abs(x - spine) / radius);
      const fork = .63 * volume(x - spine - column.width * .63, y - column.top - .43, radius * .84, .31);
      dust = Math.max(dust, (body + fork) * taper);
    }
    return dust;
  };
}

const fields = {
  diffuse: diffuseField,
  filament: filamentField,
  dark: darkField,
  pillars: pillarField,
};

function ridge(value: number, center: number, width: number) {
  return smoothUnit(1 - Math.abs(value - center) / width);
}

/** Stores emission, extinction and color balance for the same geometry in both themes. */
export function createNebulaMaterial(composition: NebulaComposition, width: number): NebulaMaterial {
  const {family, accent, seed} = composition;
  const height = Math.round(width * .75);
  const channels = new Uint8Array(width * height * 3);
  const noise = createOrbitalNoise(seed ^ 0xf1c09df5);
  const field = fields[family](orbitalRandom(seed ^ 0xab1762ce));
  const shadePhase = (seed & 255) / 255;
  const lightSide = (seed & 512) ? .05 : -.05;
  for (let row = 1; row < height - 1; row++) {
    const y = row * 2 / (height - 1) - 1;
    const fadeY = smoothUnit((1 - Math.abs(y)) * 4.4);
    for (let col = 1; col < width - 1; col++) {
      const x = col * 2 / (width - 1) - 1;
      const edge = fadeY * smoothUnit((1 - Math.abs(x)) * 4.4);
      const warpX = x + .27 * (noise(x * 2.6 + 2, y * 2.6 + 6) - .5);
      const warpY = y + .37 * (noise(x * 2.6 - 8, y * 2.6) - .5);
      const fold = noise(warpX * 9 + 6, warpY * 8 - 4) - .5;
      const fray = noise(warpX * 24 - 7, warpY * 23 + 9) - .5;
      const wx = warpX + .12 * fold + .048 * fray;
      const wy = warpY + .16 * fold - .058 * fray;
      const coarse = noise(wx * 5.7 + 5, wy * 5.7);
      const detail = noise(wx * 13, wy * 13 - 14);
      const grain = noise(wx * 26 - 3, wy * 26 + 7);
      const texture = .45 * coarse + .33 * detail + .22 * grain;
      const body = field(wx, wy);
      const relief = Math.max(0, body + (.59 * texture - .27) * smoothUnit(body * 6));
      const opticalDepth = relief / (.42 + relief);
      const envelope = volume(wx * .84, wy * .96 - .02, 1, .88);
      const rim = ridge(relief, .35 + .065 * detail, .24);
      let emission: number;
      let extinction: number;

      switch (family) {
        case 'diffuse':
          emission = .12 * envelope + (.38 + .58 * texture) * opticalDepth + .17 * rim * detail;
          extinction = .43 * opticalDepth * smoothUnit((.66 - detail) * 1.7) * (.49 + .65 * grain);
          break;
        case 'filament':
          emission = .11 * envelope + relief * (.23 + .82 * texture) * (.46 + .68 * smoothUnit(coarse * 1.55));
          extinction = .10 * smoothUnit((relief - .48) * 2);
          break;
        case 'dark':
        case 'pillars': {
          const pillars = family === 'pillars';
          const facing = smoothUnit((body - field(wx + lightSide, wy - .045)) * 4);
          const scatter = (.14 + .63 * facing) * (.33 + .73 * detail);
          emission = envelope * (pillars ? .10 + .33 * texture : .29 + .46 * texture)
            + rim * scatter + .23 * opticalDepth * grain;
          extinction = (pillars ? .89 : 1.07) * opticalDepth * (.46 + .75 * texture);
          break;
        }
      }

      // The accent follows the existing rim or volume and shares its fade.
      if (accent === 'filament') emission += .21 * ridge(relief + .16 * coarse, .38, .086) * (texture + .24);
      if (accent === 'diffuse') emission += .19 * envelope * smoothUnit((relief + texture) * .85);
      if (accent === 'dark') extinction += .28 * ridge(relief * detail, .24, .14) * texture;
      const balance = clampUnit(.52 + .40 * (coarse - .5) + .54 * wx - .26 * wy + .22 * (shadePhase - .5));
      const index = (row * width + col) * 3;
      channels[index] = Math.round(255 * clampUnit(emission) * edge);
      channels[index + 1] = Math.round(255 * clampUnit(extinction) * edge);
      channels[index + 2] = Math.round(255 * balance);
    }
  }

  return {width, height, channels};
}

function rgb(hex: string): RGB {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function blend(from: RGB, to: RGB, amount: number): RGB {
  return [0, 1, 2].map(i => from[i] + (to[i] - from[i]) * amount) as RGB;
}

/** Front dust absorbs light from the emissive layer and the SVG stars behind it. */
export function tintNebulaPixels(material: NebulaMaterial, colors: OrbitalColors, mode: AppearanceMode, pixels: Uint8ClampedArray) {
  const day = mode === 'light';
  const primary = rgb(colors.primary), secondary = rgb(colors.secondary);
  const low = blend(primary, day ? [55, 66, 92] : [12, 16, 30], day ? .35 : .32);
  const high = blend(secondary, [230, 240, 252], day ? .14 : .28);
  const dust = blend(primary, day ? [31, 33, 50] : [3, 5, 11], day ? .78 : .94);
  const emission = (day ? .65 : .83) / 255;
  const absorption = (day ? .54 : .88) / 255;
  const {channels} = material;
  for (let offset = 0, i = 0; offset < channels.length; offset += 3, i += 4) {
    const shade = channels[offset + 1] * absorption;
    const light = channels[offset] * emission * (1 - shade);
    const alpha = shade + light;
    pixels[i + 3] = alpha * 255;
    if (alpha <= 0) continue;
    const tint = channels[offset + 2] / 255;
    const gasWeight = light / alpha;
    for (let c = 0; c < 3; c++) {
      const gas = low[c] + (high[c] - low[c]) * tint;
      pixels[i + c] = dust[c] + (gas - dust[c]) * gasWeight;
    }
  }
}

export function paintNebula(canvas: HTMLCanvasElement, material: NebulaMaterial, colors: OrbitalColors, mode: AppearanceMode) {
  const context = canvas.getContext('2d');
  if (!context) return false;
  if (canvas.width !== material.width) canvas.width = material.width;
  if (canvas.height !== material.height) canvas.height = material.height;
  const image = context.createImageData(material.width, material.height);
  tintNebulaPixels(material, colors, mode, image.data);
  context.putImageData(image, 0, 0);
  return true;
}
