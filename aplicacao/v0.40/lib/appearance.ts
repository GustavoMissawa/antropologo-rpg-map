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
export type Appearance = { mode: 'light' | 'dark'; palette: PaletteId };
export const defaultAppearance: Appearance = { mode: 'light', palette: 'green' };
export const paletteCSS = palettes.map(p => `:root[data-palette="${p.id}"]{--palette-value:${p.swatch};--primary-light:${p.light};--primary-dark:${p.dark};--on-primary-light:${p.onLight};--on-primary-dark:${p.onDark};--brand-bg:${p.brand}}`).join('\n');
export function parseAppearance(input: unknown): Appearance {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return { mode: value.mode === 'dark' ? 'dark' : 'light', palette: palettes.some(p => p.id === value.palette) ? value.palette as PaletteId : 'green' };
}
export const paletteFaviconURL=(palette:PaletteId)=>`/favicons/${palette}.svg`;
// Keep the original 64 × 64 dice symbol and silhouette in all eight colors.
export function paletteFaviconSVG(palette:PaletteId):string{
 const p=palettes.find(value=>value.id===palette)||palettes[0];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${p.brand}"/><path d="M32 8 53 20v24L32 56 11 44V20Z M32 8 20 27h24L32 8M11 44l9-17 12 29 12-29 9 17" fill="none" stroke="${p.dark}" stroke-width="2"/></svg>`;
}
// Apply saved preferences before the page paints to avoid a white flash in dark mode.
// Create the icon outside React's hoisted link tree, with its final color only.
export const appearanceBootstrap = `(()=>{let p={};try{p=JSON.parse(localStorage.getItem('ab10-appearance')||'null')||{}}catch{}const r=document.documentElement;r.dataset.mode=p.mode==='dark'?'dark':'light';r.dataset.palette=${JSON.stringify(palettes.map(p=>p.id))}.includes(p.palette)?p.palette:'green';let icon=document.getElementById('platform-favicon');if(!icon){icon=document.createElement('link');icon.id='platform-favicon';icon.rel='icon';icon.type='image/svg+xml';icon.sizes='any';icon.setAttribute('href','/favicons/'+r.dataset.palette+'.svg');document.head.appendChild(icon)}else icon.setAttribute('href','/favicons/'+r.dataset.palette+'.svg')})()`;
