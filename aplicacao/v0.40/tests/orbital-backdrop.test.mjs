import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {appearanceBootstrap, parseAppearance} from '../lib/appearance.ts';
import {createOrbitalStars} from '../lib/orbital-sky.ts';
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
    assert.equal(ui.host.querySelectorAll('.cosmic-nebula').length,4);
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
    await ui.close();ui=await mountPlatform();
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
    assert.equal(window.location.hash,'#agenda');
    assert.equal(ui.host.querySelector('.orbital-backdrop'),null,'efeitos encerrados ao sair da Home');
  } finally {
    await ui.close();localStorage.clear();sessionStorage.clear();
    await preferences({motionReduced:false});
    if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;
  }
});
