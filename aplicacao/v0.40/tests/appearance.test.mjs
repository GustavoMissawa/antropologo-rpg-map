import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { appearanceBootstrap, applyOrbitalColors, defaultAppearance, palettes, parseAppearance, recommendedSecondary, secondaryPalettes } from '../lib/appearance.ts';
import { paintOrbitalLight } from '../lib/orbital-light.ts';
import { createOrbitalDisk } from '../lib/orbital-disk.ts';
import { SITE_RELEASE } from '../lib/site-version.ts';
const luminance = hex => {
 const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
};

test('As paletas antigas mantêm modo, primária e recomendação de uma secundária disponível', () => {
 assert.deepEqual(recommendedSecondary, {
  green:'gold', blue:'violet', red:'gold', yellow:'copper',
  purple:'rose', orange:'mint', silver:'cyan', graphite:'pearl',
 });
 for (const palette of palettes) {
  const old = {mode:'dark', palette:palette.id};
  assert.deepEqual(parseAppearance(old), {...old, nebulae:true, interfaceStyle:'orbital'});
  assert.ok(secondaryPalettes.some(secondary => secondary.id === recommendedSecondary[palette.id]));
 }
 assert.equal(secondaryPalettes.find(p => p.id === 'gold').swatch, '#f2c780');
 assert.deepEqual(parseAppearance(null), defaultAppearance);
});

test('A leitura migra a secundária antiga para um cartão e descarta valores inválidos', () => {
 const raw = {mode:'dark', palette:'blue', primary:' #EC689E ', secondary:'#47D5D8'};
 assert.deepEqual(parseAppearance(raw), {mode:'dark', palette:'blue', secondaryPalette:'cyan', nebulae:true, interfaceStyle:'orbital'});
 assert.deepEqual(parseAppearance({...raw, secondaryPalette:'coral', interfaceStyle:'classic'}), {mode:'dark', palette:'blue', secondaryPalette:'coral', nebulae:true, interfaceStyle:'classic'});
 assert.deepEqual(parseAppearance({...raw, secondaryPalette:'__proto__'}), {mode:'dark', palette:'blue', nebulae:true, interfaceStyle:'orbital'});
 assert.deepEqual(parseAppearance({palette:'purple', secondary:'</script><style>', interfaceStyle:'other'}), {mode:'light', palette:'purple', nebulae:true, interfaceStyle:'orbital'});
 assert.deepEqual(parseAppearance({mode:'other', palette:'constructor'}), defaultAppearance);
});

test('Carga inicial e atualização em tempo real aplicam a mesma aparência orbital', () => {
 const raw = {mode:'dark', palette:'red', secondary:'#47D5D8', interfaceStyle:'classic'};
 function root() {
  const attrs = new Map();
  const properties = new Map();
  return {
   dataset:{}, attrs, properties,
   setAttribute:(key, value) => attrs.set(key, value),
   removeAttribute:key => attrs.delete(key),
   style:{setProperty:(key, value) => properties.set(key, value), removeProperty:key => properties.delete(key)},
  };
 }
 const initial = root();
 runInNewContext(appearanceBootstrap, {
  document:{documentElement:initial, getElementById:() => ({setAttribute(){}})},
  localStorage:{getItem:() => JSON.stringify(raw)},
 });
 const updated = root();
 applyOrbitalColors(updated, parseAppearance(raw));
 assert.equal(initial.dataset.mode, 'dark');
 assert.equal(initial.dataset.palette, 'red');
 assert.equal(initial.dataset.interface, 'classic');
 assert.deepEqual(initial.attrs, updated.attrs);
 assert.deepEqual(initial.properties, updated.properties);
 assert.equal(updated.attrs.get('data-orbit-primary'), '#dc9a96');
 assert.equal(updated.attrs.get('data-orbit-secondary'), '#67cdd9');
 applyOrbitalColors(updated, parseAppearance(null));
 assert.equal(updated.attrs.size, 0);
 assert.equal(updated.properties.size, 0);
});

test('As cores e o modo recolorem os filamentos preservando sua geometria', () => {
 function texture() {
  const pigments = new Set();
  const strokes = [];
  const exposures = [];
  const ctx = {
   canvas:{width:640, height:640},
   clearRect(){}, save(){}, restore(){}, setTransform(){}, beginPath(){}, ellipse(){},
   moveTo(...point){strokes.push(point);}, lineTo(...point){strokes.push(point);},
   stroke(){ exposures.push(this.globalAlpha); }, fillRect(){},
   set strokeStyle(color){pigments.add(color);},
   set fillStyle(color){if (typeof color === 'string') pigments.add(color);},
   createRadialGradient(){return {addColorStop(_stop, color){pigments.add(color);}};},
  };
  return {getContext:() => ctx, ctx, pigments, strokes, exposures};
 }
 const originalStream = texture(), originalDust = texture();
 const changedStream = texture(), changedDust = texture();
 const disk = createOrbitalDisk('spiral', 401738);
 paintOrbitalLight(originalStream, originalDust, disk);
 paintOrbitalLight(changedStream, changedDust, disk, {primary:'#29afff', secondary:'#f2c780'});
 assert.ok(originalStream.pigments.has('#ffc66b'));
 assert.deepEqual(originalStream.pigments, changedStream.pigments);
 assert.notDeepEqual(originalDust.pigments, changedDust.pigments);
 const recolored = texture();
 paintOrbitalLight(recolored, texture(), disk, {primary:'#29afff', secondary:'#8e4ee8'});
 assert.notDeepEqual(originalStream.pigments, recolored.pigments);
 assert.deepEqual(recolored.strokes, originalStream.strokes);
 const daylight = texture();
 paintOrbitalLight(daylight, texture(), disk, {primary:'#29afff', secondary:'#8e4ee8'}, 'light');
 assert.notDeepEqual(daylight.pigments, recolored.pigments);
 assert.deepEqual(daylight.strokes, recolored.strokes);
 assert.deepEqual(originalStream.exposures, recolored.exposures);
 assert.equal(daylight.exposures.length, recolored.exposures.length);
 assert.ok(daylight.exposures.every((alpha, index) => alpha <= 1 && alpha >= recolored.exposures[index]));
 assert.ok(daylight.exposures.some((alpha, index) => alpha > recolored.exposures[index]));
 assert.equal(daylight.ctx.globalCompositeOperation, 'source-over');
 assert.equal(recolored.ctx.globalCompositeOperation, 'lighter');
});
test('As oito paletas mantêm contraste legível nos botões dos dois modos',()=>{
 for(const p of palettes)for(const mode of ['light','dark']){
  const a=luminance(p[mode]),b=luminance(p[mode==='light'?'onLight':'onDark']);
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${p.name} / ${mode}`);
 }
});

test('Rubi e Âmbar mantêm texto legível nas superfícies dos dois modos',async()=>{
 const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../app/appearance.css',import.meta.url),'utf8');
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 for(const id of ['red','orange'])for(const mode of ['light','dark']){
  const selector=mode==='dark'?`:root[data-mode="dark"][data-palette="${id}"]`:`:root[data-palette="${id}"]`,start=css.lastIndexOf(selector+'{');assert(start>=0);const block=css.slice(start+selector.length+1,css.indexOf('}',start));const vars=Object.fromEntries([...block.matchAll(/--([\w-]+):([^;]+)/g)].map(m=>[m[1],m[2]]));
  for(const surface of ['bg','paper','surface-soft','accent-soft'])for(const text of ['ink','muted'])assert(contrast(vars[text],vars[surface])>=4.5,`${id} ${mode}: ${text}/${surface}`);
  assert(contrast(vars['accent-ink'],vars.paper)>=4.5,`${id} ${mode}: destaque`);
 }
});

test('As configurações da Home Orbital exibem a versão e preservam as preferências de aparência', async () => {
 const {act, clickButton, mountPlatform} = await import('./helpers/platform-dom.mjs');
 const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:window.localStorage});
 const platform = await mountPlatform();
 try {
  const {host} = platform;
  assert.ok(host.querySelector('.orbital-home-mode'));
  await clickButton(host, 'Configurações');
  const dialog = host.querySelector('.appearance-dialog[open]');
  assert.ok(dialog);
  const [appearance, about] = dialog.querySelectorAll('[role="tab"]');
  const aboutPanel = document.getElementById(about.getAttribute('aria-controls'));
  assert.equal(appearance.getAttribute('aria-selected'), 'true');
  assert.equal(aboutPanel.hidden, true);
  await act(async () => appearance.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true})));
  assert.equal(document.activeElement, about);
  assert.equal(about.getAttribute('aria-selected'), 'true');
  assert.equal(aboutPanel.hidden, false);
  assert.equal(aboutPanel.querySelector('h3').textContent, 'Sobre o ANTROPOLOGO RPG');
  assert.deepEqual([...aboutPanel.querySelectorAll('dd')].map(item => item.textContent), [
   SITE_RELEASE.version, SITE_RELEASE.stage, SITE_RELEASE.name,
  ]);
  assert.equal(aboutPanel.querySelector('h4').textContent, 'Histórico de atualizações');
  assert.ok(!dialog.textContent.includes('Restaurar aparência padrão'));
  await act(async () => about.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowLeft', bubbles:true})));
  assert.equal(document.activeElement, appearance);
  assert.equal(aboutPanel.hidden, true);
  await act(async () => dialog.querySelector('input[name="appearance-mode"][value="dark"]').click());
  assert.equal(document.documentElement.dataset.mode, 'dark');
  assert.equal(JSON.parse(localStorage.getItem('ab10-appearance')).mode, 'dark');
  await clickButton(dialog, 'Pronto');
  assert.equal(host.querySelector('.appearance-dialog'), null);
 } finally {
  await platform.close();
  window.localStorage.clear();
  if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
  else delete globalThis.localStorage;
 }
});

test('Os cartões orbitais mantêm a secundária ao trocar de modo e a redefinem com a primária', async () => {
 const {act, clickButton, mountPlatform} = await import('./helpers/platform-dom.mjs');
 const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:window.localStorage});
 const key = 'ab10-appearance';
 localStorage.setItem(key, JSON.stringify({palette:'blue', mode:'dark'}));
 const platform = await mountPlatform();
 try {
  const art = platform.host.querySelector('.orbital-art');
  const html = document.documentElement;
  await clickButton(platform.host, 'Configurações');
  const dialog = platform.host.querySelector('.appearance-dialog');
  const select = (group, value) => act(async () => dialog.querySelector(`input[name="appearance-${group}"][value="${value}"]`).click());
  const active = group => dialog.querySelector(`input[name="appearance-${group}"]:checked`).value;
  assert.equal(dialog.querySelectorAll('input[role="switch"]').length, 1);
  assert.equal(active('secondary'), 'violet');
  for (const palette of palettes) {
   await select('palette', palette.id);
   assert.equal(active('palette'), palette.id);
   assert.equal(active('secondary'), recommendedSecondary[palette.id]);
  }
  await select('secondary', 'cyan');
  assert.equal(html.dataset.orbitSecondary, '#67cdd9');
  assert.equal(html.dataset.orbitPrimary, '#adb6c1');
  await select('mode', 'light');
  assert.equal(active('secondary'), 'cyan');
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), {mode:'light', palette:'graphite', secondaryPalette:'cyan', nebulae:true, interfaceStyle:'orbital'});
  assert.equal(platform.host.querySelector('.orbital-art'), art);
  await select('palette', 'blue');
  assert.equal(active('secondary'), 'violet');
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), {mode:'light', palette:'blue', nebulae:true, interfaceStyle:'orbital'});
  await select('mode', 'dark');
  await clickButton(dialog, 'Restaurar aparência padrão');
  assert.deepEqual(JSON.parse(localStorage.getItem(key)), defaultAppearance);
  assert.equal(active('secondary'), 'gold');
  assert.equal(html.getAttribute('data-orbit-primary'), null);
  assert.equal(html.getAttribute('data-orbit-secondary'), null);
 } finally {
  await platform.close();
  window.localStorage.clear();
  if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
  else delete globalThis.localStorage;
 }
});
