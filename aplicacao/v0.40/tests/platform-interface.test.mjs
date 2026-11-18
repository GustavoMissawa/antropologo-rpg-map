import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAB10Rulebook, makeRulebook, makeSheet} from '../lib/model.ts';
import {parsePlatformHash, platformHref, routeForStyle, sectionRoute} from '../lib/platform-navigation.ts';
import {openPlatformSession} from '../lib/platform-session.ts';
import {act, clickButton, mountPlatform, preferences, waitFor} from './helpers/platform-dom.mjs';

test('Rotas de conteúdo independem do estilo e os atalhos apontam à apresentação correta', () => {
  const routes=[
    {page:'home',destination:'systems'},
    {page:'home'},
    {page:'rules',bookId:'Um sistema / de teste'},
    {page:'sheet',editor:{kind:'character',id:'ficha abc'}},
    {page:'sheet',editor:{kind:'character',id:''}},
    {page:'sheet',editor:{kind:'character',id:'\uD800'}},
    {page:'sheet',editor:{kind:'character',id:'~identificador'}},
    {page:'sheet',editor:{kind:'template',id:'universo'}},
    {page:'agenda'},
    {page:'pdfs'},
  ];
  for(const route of routes)assert.deepEqual(parsePlatformHash(platformHref(route)),route);
  assert.equal(platformHref(sectionRoute('rules','orbital')),'#inicio/sistemas');
  assert.equal(platformHref(sectionRoute('rules','classic')),'#regras');
  assert.deepEqual(routeForStyle(routes[0],'classic'),{page:'rules'});
  assert.equal(routeForStyle(routes[2],'classic'),routes[2]);
  assert.equal(parsePlatformHash('#main'),null);
  assert.deepEqual(parsePlatformHash('#regras/%ZZ'),{page:'rules'});
});

const key='ab10-appearance';

async function selectStyle(host,style) {
  await clickButton(host,'Configurações');
  const dialog=host.querySelector('.appearance-dialog');
  await act(async()=>dialog.querySelector(`input[name="appearance-interface"][value="${style}"]`).click());
  await clickButton(dialog,'Pronto');
}

test('A preferência conserva aparência e seção em ambos os estilos e após remontar', async () => {
  sessionStorage.clear();
  window.localStorage.setItem(key,JSON.stringify({mode:'dark',palette:'red',secondaryPalette:'cyan',nebulae:false}));
  window.history.replaceState(null,'','#inicio');
  await preferences({motionReduced:true});
  let ui=await mountPlatform();
  try {
    assert.equal(ui.host.querySelector('.app-shell').dataset.interface,'orbital');
    const nav=ui.host.querySelector('.global-top-nav');
    await clickButton(nav,'Sistema');
    await waitFor(()=>ui.host.querySelector('.orbital-home[data-phase="destination"]'));
    assert.equal(window.location.hash,'#inicio/sistemas');
    assert.equal(nav.querySelector('[aria-current="page"]').textContent,'Sistema');
    await selectStyle(ui.host,'classic');
    assert.equal(window.location.hash,'#regras');
    assert(ui.host.querySelector('.ruleset-grid'));
    assert.equal(ui.host.querySelector('.orbital-home'),null);
    assert.deepEqual(JSON.parse(window.localStorage.getItem(key)),{mode:'dark',palette:'red',secondaryPalette:'cyan',nebulae:false,interfaceStyle:'classic'});
    await clickButton(nav,'PDFs');
    assert.equal(window.location.hash,'#pdfs');
    await ui.close();
    ui=await mountPlatform();
    assert.equal(ui.host.querySelector('.app-shell').dataset.interface,'classic');
    assert.equal(ui.host.querySelector('main').dataset.workspace,'pdfs');
    await selectStyle(ui.host,'orbital');
    assert.equal(window.location.hash,'#pdfs');
    assert(ui.host.querySelector('.orbital-pdf-layout'));
    assert.equal(document.documentElement.dataset.nebulae,'false');
    assert.equal(document.documentElement.dataset.orbitSecondary,'#67cdd9');
  } finally {
    await ui.close();
    window.localStorage.removeItem(key);
    window.history.replaceState(null,'','#inicio');
    await preferences({motionReduced:false});
  }
});

test('Alternar o estilo mantém a instância e o rascunho do editor de regras', async () => {
  for(const name of ['Node','DOMParser'])Object.defineProperty(globalThis,name,{configurable:true,value:window[name]});
  sessionStorage.clear();
  const book=makeRulebook('Sistema com rascunho');
  const cache=await openPlatformSession();
  await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});
  cache.close();
  const hash=platformHref({page:'rules',bookId:book.id});
  window.history.replaceState(null,'',hash);
  const ui=await mountPlatform();
  try {
    await clickButton(ui.host,'Novo capítulo');
    const editor=ui.host.querySelector('.rule-topic-editor');
    const status=editor.querySelector('select[aria-label="Estado do conteúdo"]');
    await act(async()=>{status.value='test';status.dispatchEvent(new Event('change',{bubbles:true}));});
    for(const style of ['classic','orbital']){
      await selectStyle(ui.host,style);
      assert.equal(ui.host.querySelector('.rule-topic-editor'),editor);
      assert.equal(status.value,'test');
      assert.equal(window.location.hash,hash);
    }
    await clickButton(ui.host.querySelector('.global-top-nav'),'Agenda');
    assert.equal(window.location.hash,hash);
    assert.match(ui.host.querySelector('.toast').textContent,/Há alterações no tópico/);
  } finally {
    await ui.close();
    window.localStorage.removeItem(key);
    window.history.replaceState(null,'','#inicio');
  }
});

test('A ficha importada mantém o editor, geometria e os dados ao alternar o estilo', async () => {
  sessionStorage.clear();
  window.history.replaceState(null,'','#ficha');
  const ui=await mountPlatform();
  try {
    const sheet=makeSheet('Personagem de teste','Jogadora');
    const input=ui.host.querySelector('input[aria-label="Selecionar arquivo de ficha"]');
    Object.defineProperty(input,'files',{configurable:true,value:[new File([JSON.stringify(sheet)],'ficha.json',{type:'application/json'})]});
    await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
    await waitFor(()=>ui.host.querySelector('.sheet-map'));
    const editor=ui.host.querySelector('.sheet-map');
    const hash=window.location.hash;
    await act(async()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await clickButton(editor,'Aumentar zoom');
    for(const style of ['classic','orbital']){
      await selectStyle(ui.host,style);
      assert.equal(window.location.hash,hash);
      assert.equal(ui.host.querySelector('.sheet-map'),editor);
      assert.equal(editor.querySelector('.map-character-name h2').textContent,sheet.name);
      assert.equal(editor.querySelector('.map-zoom-value').textContent,'110%');
    }
  } finally {
    await ui.close();
    window.localStorage.removeItem(key);
    window.history.replaceState(null,'','#inicio');
  }
});
