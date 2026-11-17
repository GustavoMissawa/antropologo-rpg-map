import { originalOrbitalColors, type OrbitalColors } from './appearance-colors.ts';

export const palettes = [
  { id: 'green', name: 'Floresta', swatch: '#43855a', light: '#2f6546', dark: '#92caa5', onLight: '#ffffff', onDark: '#16291e', brand: '#193e32' },
  { id: 'blue', name: 'Safira', swatch: '#397fc4', light: '#2b5f95', dark: '#8abcf0', onLight: '#ffffff', onDark: '#14283d', brand: '#1c334d' },
  { id: 'red', name: 'Rubi', swatch: '#b8605b', light: '#9c4542', dark: '#dc9a96', onLight: '#ffffff', onDark: '#3b1514', brand: '#813d3d' },
  { id: 'yellow', name: 'Ouro', swatch: '#dfbb42', light: '#e6c456', dark: '#e4c865', onLight: '#382e0c', onDark: '#31280b', brand: '#3e361f' },
  { id: 'purple', name: 'Ametista', swatch: '#8d66bb', light: '#745397', dark: '#c4a4e9', onLight: '#ffffff', onDark: '#2f203f', brand: '#352944' },
  { id: 'orange', name: 'Âmbar', swatch: '#c08a55', light: '#a06532', dark: '#d6ab80', onLight: '#ffffff', onDark: '#3a1e08', brand: '#955724' },
  { id: 'silver', name: 'Prata', swatch: '#bcc4ce', light: '#c2c9d2', dark: '#c9d1db', onLight: '#29333f', onDark: '#26303c', brand: '#3e4856' },
  { id: 'graphite', name: 'Grafite', swatch: '#555d66', light: '#515a64', dark: '#adb6c1', onLight: '#ffffff', onDark: '#242b33', brand: '#2d3239' },
] as const;
export type PaletteId = (typeof palettes)[number]['id'];
export type AppearanceMode = 'light' | 'dark';

export const secondaryPalettes = [
  { id: 'gold', name: 'Dourado', swatch: originalOrbitalColors.secondary },
  { id: 'violet', name: 'Violeta', swatch: '#b6a2ec' },
  { id: 'cyan', name: 'Ciano', swatch: '#67cdd9' },
  { id: 'rose', name: 'Rosa', swatch: '#da92c1' },
  { id: 'copper', name: 'Cobre', swatch: '#d49a6f' },
  { id: 'mint', name: 'Menta', swatch: '#9cdab9' },
  { id: 'pearl', name: 'Pérola', swatch: '#cfdae9' },
  { id: 'coral', name: 'Coral', swatch: '#e99691' },
] as const;
export type SecondaryPaletteId = (typeof secondaryPalettes)[number]['id'];
export type Appearance = { mode: AppearanceMode; palette: PaletteId; secondaryPalette?: SecondaryPaletteId; nebulae: boolean };
export const defaultAppearance: Appearance = { mode: 'light', palette: 'green', nebulae: true };
export const recommendedSecondary: Record<PaletteId, SecondaryPaletteId> = {
  green: 'gold',
  blue: 'violet',
  red: 'gold',
  yellow: 'copper',
  purple: 'rose',
  orange: 'mint',
  silver: 'cyan',
  graphite: 'pearl',
};

const orbitalPaletteColors = {
  primary: Object.fromEntries(palettes.map(p => [p.id, p.id === 'green' ? originalOrbitalColors.primary : p.dark])) as Record<PaletteId, string>,
  secondary: Object.fromEntries(secondaryPalettes.map(p => [p.id, p.swatch])) as Record<SecondaryPaletteId, string>,
};

export const paletteCSS = [
  `:root{--orbit-primary-default:${originalOrbitalColors.primary};--orbit-secondary-default:${originalOrbitalColors.secondary}}`,
  ...palettes.map(p => `:root[data-palette="${p.id}"]{--palette-value:${p.swatch};--primary-light:${p.light};--primary-dark:${p.dark};--on-primary-light:${p.onLight};--on-primary-dark:${p.onDark};--brand-bg:${p.brand}}`),
].join('\n');
// This parser is shared by the initial inline script and the hydrated controls.
function readAppearance(input: unknown, colors: typeof orbitalPaletteColors, fallback: Appearance): Appearance {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const appearance: Appearance = {
    mode: value.mode === 'light' || value.mode === 'dark' ? value.mode : fallback.mode,
    palette: typeof value.palette === 'string' && Object.hasOwn(colors.primary, value.palette)
      ? value.palette as PaletteId : fallback.palette,
    nebulae: typeof value.nebulae === 'boolean' ? value.nebulae : fallback.nebulae,
  };
  if (typeof value.secondaryPalette === 'string' && Object.hasOwn(colors.secondary, value.secondaryPalette)) {
    appearance.secondaryPalette = value.secondaryPalette as SecondaryPaletteId;
  } else if (value.secondaryPalette === undefined && typeof value.secondary === 'string') {
    // Preserve the intent of a saved free-form secondary by choosing the closest available swatch.
    const legacy = /^#?([0-9a-f]{6})$/i.exec(value.secondary.trim())?.[1];
    if (!legacy) return appearance;
    const requested = Number.parseInt(legacy, 16);
    let best = Infinity;
    for (const [id, swatch] of Object.entries(colors.secondary)) {
      const candidate = Number.parseInt(swatch.slice(1), 16);
      const dr = (requested >> 16) - (candidate >> 16);
      const dg = ((requested >> 8) & 255) - ((candidate >> 8) & 255);
      const db = (requested & 255) - (candidate & 255);
      const distance = 2 * dr ** 2 + 4 * dg ** 2 + 3 * db ** 2;
      if (distance < best) {
        best = distance;
        appearance.secondaryPalette = id as SecondaryPaletteId;
      }
    }
  }
  return appearance;
}

export function parseAppearance(input: unknown): Appearance {
  return readAppearance(input, orbitalPaletteColors, defaultAppearance);
}

// This also runs before hydration. Keep the function independent of module state.
function writeOrbitalColors(root: HTMLElement, value: Appearance, colors: typeof orbitalPaletteColors, recommended: typeof recommendedSecondary, original: OrbitalColors) {
  const active = {
    primary: colors.primary[value.palette],
    secondary: colors.secondary[value.secondaryPalette ?? recommended[value.palette]],
  };
  for (const role of ['primary', 'secondary'] as const) {
    const attribute = 'data-orbit-' + role;
    const property = '--orbit-' + role + '-choice';
    if (active[role] === original[role]) {
      root.removeAttribute(attribute);
      root.style.removeProperty(property);
    } else {
      root.setAttribute(attribute, active[role]);
      root.style.setProperty(property, active[role]);
    }
  }
}

export function applyOrbitalColors(root: HTMLElement, appearance: Appearance) {
  writeOrbitalColors(root, appearance, orbitalPaletteColors, recommendedSecondary, originalOrbitalColors);
}
export const paletteFaviconURL=(palette:PaletteId)=>`/favicons/${palette}.svg`;
// Keep the original 64 × 64 dice symbol and silhouette in all eight colors.
export function paletteFaviconSVG(palette:PaletteId):string{
 const p=palettes.find(value=>value.id===palette)||palettes[0];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${p.brand}"/><path d="M32 8 53 20v24L32 56 11 44V20Z M32 8 20 27h24L32 8M11 44l9-17 12 29 12-29 9 17" fill="none" stroke="${p.dark}" stroke-width="2"/></svg>`;
}
// Apply saved preferences before the page paints to avoid a white flash in dark mode.
// Create the icon outside React's hoisted link tree, with its final color only.
export const appearanceBootstrap = `(()=>{
  let p={};
  try{p=JSON.parse(localStorage.getItem('ab10-appearance')||'null')||{}}catch{}
  const r=document.documentElement;
  const colors=${JSON.stringify(orbitalPaletteColors)};
  const preferences=(${readAppearance.toString()})(p,colors,${JSON.stringify(defaultAppearance)});
  r.dataset.mode=preferences.mode;
  r.dataset.palette=preferences.palette;
  r.dataset.nebulae=String(preferences.nebulae);
  (${writeOrbitalColors.toString()})(r,preferences,colors,${JSON.stringify(recommendedSecondary)},${JSON.stringify(originalOrbitalColors)});
  let icon=document.getElementById('platform-favicon');
  if(!icon){
    icon=document.createElement('link');icon.id='platform-favicon';icon.rel='icon';icon.type='image/svg+xml';icon.sizes='any';
    icon.setAttribute('href','/favicons/'+r.dataset.palette+'.svg');document.head.appendChild(icon);
  }else icon.setAttribute('href','/favicons/'+r.dataset.palette+'.svg');
})()`;
