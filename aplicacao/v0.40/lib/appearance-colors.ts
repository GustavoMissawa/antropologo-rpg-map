import type { AppearanceMode } from './appearance.ts';

export type OrbitalColors = { primary: string; secondary: string };

// The primary accent and navigation light from the original Orbital Home.
export const originalOrbitalColors: OrbitalColors = { primary: '#9fefaf', secondary: '#f2c780' };
export function parseHexColor(value: unknown): string | undefined {
  const match = typeof value === 'string' ? /^#([0-9a-f]{6})$/i.exec(value) : null;
  return match ? '#' + match[1].toLowerCase() : undefined;
}

type RGB = [number, number, number];
const white: RGB = [255, 255, 255];
const black: RGB = [0, 0, 0];
const daylightInk: RGB = [25, 23, 38];

function rgb(hex: string): RGB {
  return [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16)) as RGB;
}

function hex(channels: RGB) {
  return '#' + channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('');
}

function mix(from: RGB, to: RGB, progress: number): RGB {
  return from.map((channel, i) => channel + (to[i] - channel) * progress) as RGB;
}

function lightness(channels: RGB) {
  return (Math.max(...channels) + Math.min(...channels)) / 510;
}

/** Map the authored shadows and highlights onto the selected accent, keeping opacity. */
export function orbitalPigment(value: string, original: string, selected: string, mode: AppearanceMode) {
  if (mode === 'dark' && original === selected) return value;
  const pigment = lightness(rgb(value));
  const selectedRgb = rgb(selected);
  if (mode === 'light') {
    // Keep color in the strands and push only the hottest accents toward white.
    const base = mix(daylightInk, selectedRgb, .63);
    const highlight = mix(selectedRgb, white, .30);
    const energy = Math.pow(Math.max(0, (pigment - .58) / .42), 1.8);
    return hex(mix(base, highlight, energy)) + value.slice(7);
  }
  const reference = lightness(rgb(original));
  const selectedLightness = lightness(selectedRgb);
  const accent = selectedLightness < .48
    ? mix(selectedRgb, white, (.48 - selectedLightness) / (1 - selectedLightness))
    : selectedRgb;
  const colored = pigment > reference
    ? mix(accent, white, (pigment - reference) / (1 - reference))
    : mix(black, accent, pigment / reference);
  return hex(colored) + value.slice(7);
}
