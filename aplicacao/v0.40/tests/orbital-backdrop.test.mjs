import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {appearanceBootstrap, parseAppearance} from '../lib/appearance.ts';
import {createOrbitalStars} from '../lib/orbital-sky.ts';
import {createNebulaComposition, pageNebulaComposition} from '../lib/nebula-composition.ts';
import {createNebulaMaterial, tintNebulaPixels} from '../lib/nebula-material.ts';
import {act, clickButton, mountPlatform, preferences} from './helpers/platform-dom.mjs';

test('Preferências antigas ativam as nebulosas; desligar é independente da migração de cores', () => {
  for (const value of [null, {}, {nebulae:'false'}, {nebulae:0}, {secondary:'#47D5D8'}]) assert.equal(parseAppearance(value).nebulae, true);
  assert.equal(parseAppearance({nebulae:false, secondary:'#47D5D8'}).nebulae, false);
  const html = {dataset:{}, setAttribute(){}, removeAttribute(){}, style:{setProperty(){}, removeProperty(){}}};
  runInNewContext(appearanceBootstrap, {
    document:{documentElement:html,getElementById:()=>({setAttribute(){}})},
    localStorage:{getItem:()=>JSON.stringify({nebulae:false, mode:'dark', palette:'purple'})},
  });
  assert.equal(html.dataset.nebulae, 'false', 'preferência aplicada antes da hidratação');
  assert.equal(html.dataset.mode, 'dark');
});

test('O céu tem distribuição estável, aglomerados, poucos astros grandes e centro discreto', () => {
  const stars = createOrbitalStars();
  assert.deepEqual(stars, createOrbitalStars());
  assert.equal(stars.length, 290);
  assert.equal(new Set(stars.map(s=>`${s.x},${s.y}`)).size, stars.length);
  assert.ok(stars.every(s=>s.x>=0 && s.x<=1440 && s.y>=0 && s.y<=900 && s.opacity>0 && s.opacity<=1));
  assert.equal(stars.filter(s=>s.radius>1.5).length, 3);
  assert.ok(stars.filter(s=>s.twinkle).length < 8);
  const quadrants = [0,0,0,0];
  for (const s of stars) quadrants[(s.x>720?1:0)+(s.y>450?2:0)]++;
  assert.ok(Math.max(...quadrants)-Math.min(...quadrants)>25, 'concentração não uniforme');
  assert.ok(stars.filter(s=>((s.x/1440-.53)/.23)**2+((s.y/900-.50)/.31)**2<1).every(s=>s.opacity<.2));
});

test('A ambientação pausa fora da tela ou em aba oculta e libera os observadores ao sair', async () => {
  const originalObserver=globalThis.IntersectionObserver;
  const hidden=Object.getOwnPropertyDescriptor(document,'hidden');
  const callbacks=new Map(),disconnected=new Set();
  globalThis.IntersectionObserver=class {
    constructor(callback){this.callback=callback;this.targets=[];}
    observe(target){this.targets.push(target);callbacks.set(target,this.callback);}
    disconnect(){for(const target of this.targets)disconnected.add(target);}
  };
  sessionStorage.clear();
  const ui=await mountPlatform();
  try {
    const backdrop=ui.host.querySelector('.orbital-backdrop');
    assert.equal(backdrop.dataset.motion,'running');
    await act(async()=>callbacks.get(backdrop)([{isIntersecting:false}]));
    assert.equal(backdrop.dataset.motion,'paused');
    await act(async()=>callbacks.get(backdrop)([{isIntersecting:true}]));
    assert.equal(backdrop.dataset.motion,'running');
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(backdrop.dataset.motion,'paused');
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(backdrop.dataset.motion,'running');
    await ui.close();
    assert.ok(disconnected.has(backdrop));
  } finally {
    await ui.close();
    globalThis.IntersectionObserver=originalObserver;
    if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;
  }
});

test('O interruptor persiste sem recriar estrelas, dado ou disco e sobrevive a cores, remontagem e sincronização', async () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:window.localStorage});
  localStorage.clear();sessionStorage.clear();
  await preferences({motionReduced:true});
  let ui=await mountPlatform();
  try {
    const sky=ui.host.querySelector('.orbital-starfield'), art=ui.host.querySelector('.orbital-art');
    const composition=()=>({
      count: Number(ui.host.querySelector('.orbital-backdrop').dataset.nebulaCount),
      fields: [...ui.host.querySelectorAll('.cosmic-nebula')].map(n=>[n.dataset.seed, n.dataset.family, n.dataset.accent, n.getAttribute('style')]),
    });
    const initialComposition=composition();
    assert.ok([0, 1, 2, 3].includes(initialComposition.count));
    assert.equal(initialComposition.fields.length, initialComposition.count);
    if (initialComposition.count) assert.equal(sky.previousElementSibling.className, 'orbital-nebulae');
    assert.equal(sky.querySelectorAll('circle').length,290);
    assert.equal(ui.host.querySelector('.orbital-backdrop').getAttribute('aria-hidden'),'true');
    await clickButton(ui.host,'Configurações');
    let dialog=ui.host.querySelector('.appearance-dialog');
    const toggle=dialog.querySelector('input[role="switch"]');
    assert.equal(toggle.checked,true);
    await act(async()=>toggle.click());
    assert.equal(document.documentElement.dataset.nebulae,'false');
    assert.equal(JSON.parse(localStorage.getItem('ab10-appearance')).nebulae,false);
    const choose=(name,value)=>act(async()=>dialog.querySelector(`input[name="appearance-${name}"][value="${value}"]`).click());
    await choose('palette','purple');await choose('secondary','cyan');await choose('mode','dark');
    assert.equal(toggle.checked,false);
    assert.equal(document.documentElement.dataset.nebulae,'false');
    assert.equal(ui.host.querySelector('.orbital-starfield'),sky);
    assert.equal(ui.host.querySelector('.orbital-art'),art);
    assert.deepEqual(composition(),initialComposition,'cores e interruptor não redistribuem');
    await ui.close();ui=await mountPlatform();
    assert.deepEqual(composition(),initialComposition,'remontagem conserva a composição deste documento');
    assert.equal(document.documentElement.dataset.nebulae,'false');
    await clickButton(ui.host,'Configurações');dialog=ui.host.querySelector('.appearance-dialog');
    assert.equal(dialog.querySelector('input[role="switch"]').checked,false);
    const updated=JSON.stringify({mode:'dark',palette:'blue',nebulae:true});
    await act(async()=>window.dispatchEvent(new window.StorageEvent('storage',{key:'ab10-appearance',newValue:updated})));
    assert.equal(dialog.querySelector('input[role="switch"]').checked,true);
    assert.equal(document.documentElement.dataset.nebulae,'true');
    await clickButton(dialog,'Restaurar aparência padrão');
    assert.equal(dialog.querySelector('input[role="switch"]').checked,true);
    await clickButton(dialog,'Pronto');
    await clickButton(ui.host.querySelector('.orbital-navigation'),'Agenda');
    await clickButton(ui.host.querySelector('.orbital-destination-panel'),'Abrir Agenda');
    assert.equal(window.location.hash,'#agenda');
    assert.equal(ui.host.querySelector('.orbital-backdrop'),null,'efeitos encerrados ao sair da Home');
  } finally {
    await ui.close();localStorage.clear();sessionStorage.clear();
    await preferences({motionReduced:false});
    if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;
  }
});

test('O sorteio mantém céus vazios e permite de uma a três famílias distintas por vez', () => {
  const sample = 60000;
  const families = {diffuse: 0, filament: 0, dark: 0, pillars: 0};
  const corridors = new Set();
  const counts = [0, 0, 0, 0];
  let total = 0;
  let hybrids = 0;
  let smallestSingle = Infinity;
  let largestGrouped = 0;
  for (let seed = 0; seed < sample; seed++) {
    const composition = createNebulaComposition(seed);
    const count = composition.length;
    counts[count]++;
    if (!count) continue;
    families[composition[0].family]++;
    for (const field of ['family', 'anchor', 'seed']) {
      assert.equal(new Set(composition.map(nebula => nebula[field])).size, count);
    }
    if (count > 1) {
      const onWest = nebula => ['north', 'southwest'].includes(nebula.anchor);
      assert.notEqual(onWest(composition[0]), onWest(composition[1]));
    }
    for (const nebula of composition) {
      total++;
      corridors.add(nebula.anchor);
      if (nebula.accent) {
        hybrids++;
        assert.notEqual(nebula.accent, nebula.family);
      }
      if (count === 1) smallestSingle = Math.min(smallestSingle, nebula.scale);
      else largestGrouped = Math.max(largestGrouped, nebula.scale);
      assert.ok(Math.abs(nebula.x) <= 6 && Math.abs(nebula.y) <= 7);
    }
  }
  const present = sample - counts[0];
  assert.ok(Math.abs(counts[0] / sample - 1 / 3) < .008);
  [.50, .35, .15].forEach((expected, index) => assert.ok(Math.abs(counts[index + 1] / present - expected) < .012));
  assert.equal(corridors.size, 5);
  for (const [family, expected] of Object.entries({diffuse: .35, filament: .25, dark: .20, pillars: .20})) {
    assert.ok(Math.abs(families[family] / present - expected) < .012, family);
  }
  assert.ok(Math.abs(hybrids / total - .18) < .01);
  assert.ok(smallestSingle > 1.2 * largestGrouped);
  assert.strictEqual(pageNebulaComposition(), pageNebulaComposition());
});

test('As famílias têm estruturas reproduzíveis e a cor conserva a cobertura e as bordas suaves', () => {
  const samples = new Map();
  for (let seed = 0; samples.size < 4 && seed < 1000; seed++) {
    const composition = createNebulaComposition(seed);
    for (const nebula of composition) {
      if (!nebula.accent && !samples.has(nebula.family)) samples.set(nebula.family, nebula);
    }
    assert.deepEqual(composition, createNebulaComposition(seed));
  }
  const signatures = [];
  for (const nebula of samples.values()) {
    const material = createNebulaMaterial(nebula, 96);
    assert.deepEqual(material, createNebulaMaterial(nebula, 96));
    const {width, height, channels} = material;
    let opaque = 0;
    let dusty = 0;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const offset = (row * width + col) * 3;
        if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
          assert.equal(channels[offset], 0);
          assert.equal(channels[offset + 1], 0);
        }
        if (channels[offset] > 34) opaque++;
        if (channels[offset + 1] > 70) dusty++;
      }
    }
    assert.ok(opaque > 140, nebula.family);
    assert.ok(opaque < width * height * .66);
    if (nebula.family === 'dark' || nebula.family === 'pillars') assert.ok(dusty > 95);
    if (nebula.family === 'filament') assert.equal(dusty, 0);
    signatures.push([opaque, dusty].join('/'));

    const cool = new Uint8ClampedArray(width * height * 4);
    const warm = new Uint8ClampedArray(cool.length);
    const day = new Uint8ClampedArray(cool.length);
    const colors = {primary: '#94baf7', secondary: '#8fd2cb'};
    tintNebulaPixels(material, colors, 'dark', cool);
    tintNebulaPixels(material, {primary:'#d59a97', secondary:'#f0cd83'}, 'dark', warm);
    tintNebulaPixels(material, colors, 'light', day);
    assert.notDeepEqual(cool, warm);
    assert.notDeepEqual(cool, day);
    for (let i = 3; i < cool.length; i += 4) {
      assert.equal(cool[i], warm[i], 'paletas conservam a máscara');
      assert.ok(day[i] <= cool[i], 'a composição clara preserva contraste');
    }
  }
  assert.equal(new Set(signatures).size, 4);
});

test('O híbrido modifica uma fração do material da família predominante', () => {
  const checked = new Set();
  for (let seed = 0; checked.size < 4 && seed < 1000; seed++) {
    const nebula = createNebulaComposition(seed).find(formation => formation.accent && !checked.has(formation.family));
    if (!nebula?.accent || checked.has(nebula.family)) continue;
    checked.add(nebula.family);
    const {channels: full} = createNebulaMaterial(nebula, 96);
    const {channels: lead} = createNebulaMaterial({...nebula, accent: null}, 96);
    assert.notDeepEqual(full, lead);
    assert.deepEqual(full, createNebulaMaterial(nebula, 96).channels);
    const delta = full.reduce((total, value, i) => total + Math.abs(value - lead[i]), 0);
    assert.ok(delta / full.length < 12);
  }
  assert.equal(checked.size, 4);
});
