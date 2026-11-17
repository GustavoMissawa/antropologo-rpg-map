import test from 'node:test';
import assert from 'node:assert/strict';
import {orbitalNavigationReducer as reduce, initialOrbitalNavigation, orbitalDestinationFromHash, orbitalHref} from '../lib/orbital-navigation.ts';
import {act, clickButton, mountPlatform, preferences, waitFor} from './helpers/platform-dom.mjs';

test('Máquina orbital aceita reversão, troca e eventos repetidos sem perder o destino', () => {
  let state = reduce(initialOrbitalNavigation, {type:'select', destination:'systems'});
  assert.equal(state.phase,'entering');
  assert.equal(reduce(state,{type:'select',destination:'systems'}),state);
  state=reduce(state,{type:'select',destination:'sheets'});
  assert.equal(state.phase,'switching');
  state=reduce(state,{type:'settle'});
  assert.equal(state.phase,'destination');
  state=reduce(state,{type:'select',destination:null});
  assert.equal(state.phase,'returning');
  assert.equal(reduce(state,{type:'select',destination:null}),state);
  assert.deepEqual(reduce(state,{type:'select',destination:'pdfs'}),{phase:'switching',destination:'pdfs'});
  assert.equal(reduce(state,{type:'settle'}),initialOrbitalNavigation);
  for(const id of ['systems','sheets','pdfs','agenda']) assert.equal(orbitalDestinationFromHash(orbitalHref(id)),id);
  for(const hash of ['#inicio','javascript:alert(1)','#inicio/unknown','#pdfs']) assert.equal(orbitalDestinationFromHash(hash),null);
});

async function start(hash='#inicio') {
  sessionStorage.clear();
  window.history.replaceState(null,'',hash);
  return mountPlatform();
}

test('Zoom, troca e Escape preservam os mesmos nós do cenário e restauram foco', async () => {
  const ui=await start();
  try {
    const home=ui.host.querySelector('.orbital-home');
    const art=home.querySelector('.orbital-art'), stars=home.querySelector('.orbital-starfield');
    const nebulae=[...home.querySelectorAll('.cosmic-nebula')];
    const composition=nebulae.map(e=>e.dataset.composition);
    await clickButton(home.querySelector('.orbital-navigation'),'Sistemas');
    assert.equal(home.dataset.phase,'entering');
    assert.equal(home.querySelector('.orbital-destination-content').getAttribute('aria-hidden'),'true');
    assert(home.querySelector('.orbital-workspace').hasAttribute('inert'));
    await act(async()=>home.querySelector('.orbital-destination-switcher a[href="#inicio/fichas"]').click());
    assert.equal(home.dataset.phase,'switching');
    await waitFor(()=>home.dataset.phase==='destination');
    assert.equal(document.activeElement.id,'orbital-destination-title');
    assert.equal(home.querySelectorAll('.orbital-node[aria-hidden="true"][tabindex="-1"]').length,3);
    assert.equal(home.querySelector('.orbital-art'),art);
    assert.equal(home.querySelector('.orbital-starfield'),stars);
    assert.deepEqual([...home.querySelectorAll('.cosmic-nebula')],nebulae);
    assert.deepEqual(nebulae.map(e=>e.dataset.composition),composition);
    await act(async()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    assert.equal(home.dataset.phase,'returning');
    assert(home.querySelector('.orbital-destination-panel').hasAttribute('inert'));
    await waitFor(()=>home.dataset.phase==='exploration');
    assert.equal(window.location.hash,'#inicio');
    assert.equal(document.activeElement.querySelector('[data-orbital-anchor]')?.dataset.orbitalAnchor,'sheets');
    assert(!home.querySelector('.orbital-workspace').hasAttribute('inert'));
    assert.equal(home.querySelector('.orbital-destination-panel'),null);
    assert.equal(home.querySelector('.orbital-starfield'),stars);
  } finally {await ui.close();}
});

test('Links diretos e histórico retornam ao destino; movimento reduzido e aba oculta encerram transições', async () => {
  await preferences({motionReduced:true});
  let ui=await start('#inicio/pdfs');
  try {
    let home=ui.host.querySelector('.orbital-home');
    await waitFor(()=>home.dataset.phase==='destination');
    assert.equal(home.dataset.destination,'pdfs');
    assert.equal(window.location.hash,'#inicio/pdfs','restauração do cache não sobrescreve link orbital');
    await ui.close();ui=await mountPlatform();
    home=ui.host.querySelector('.orbital-home');
    await waitFor(()=>home.dataset.phase==='destination');
    assert.equal(home.dataset.destination,'pdfs');
    await act(async()=>{window.location.hash='#inicio/agenda';});
    await waitFor(()=>home.dataset.destination==='agenda'&&home.dataset.phase==='destination');
    await act(async()=>window.history.back());
    await waitFor(()=>home.dataset.destination==='pdfs'&&home.dataset.phase==='destination');
    await act(async()=>window.history.forward());
    await waitFor(()=>home.dataset.destination==='agenda'&&home.dataset.phase==='destination');
    await preferences({motionReduced:false});
    await act(async()=>home.querySelector('a[href="#inicio/sistemas"]').click());
    assert.equal(home.dataset.phase,'switching');
    await preferences({motionReduced:true});
    assert.equal(home.dataset.phase,'destination');
    await preferences({motionReduced:false});
    await act(async()=>home.querySelector('a[href="#inicio/fichas"]').click());
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden');
    try {
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(home.dataset.phase,'destination');
    } finally {
      if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;
    }
  } finally {await ui.close();await preferences({motionReduced:false});window.history.replaceState(null,'','#inicio');}
});

test('Painel usa PDFs carregados e abre os fluxos reais de criação de ficha e biblioteca', async () => {
  const native=globalThis.fetch;
  globalThis.fetch=async(url,...args)=>String(url)==='/api/library'?{ok:true,json:async()=>[{id:'manual-teste',title:'Manual da sessão',filename:'manual.pdf',category:'Manuais',description:'',createdAt:new Date().toISOString(),size:1024,url:'https://example.org/manual.pdf'}]}:native(url,...args);
  await preferences({motionReduced:true});
  const ui=await start();
  try {
    await clickButton(ui.host.querySelector('.orbital-navigation'),'PDFs');
    await waitFor(()=>ui.host.querySelector('.orbital-home').dataset.phase==='destination');
    let panel=ui.host.querySelector('.orbital-destination-panel');
    const pdf=panel.querySelector('.orbital-context-item');
    assert.equal(pdf.textContent,'Manual da sessãoManuais');
    assert.equal(pdf.getAttribute('href'),'https://example.org/manual.pdf');
    assert.equal(pdf.getAttribute('target'),'_blank');
    await clickButton(panel,'Adicionar PDF');
    assert(ui.host.querySelector('dialog[open][aria-label="Adicionar à biblioteca"]'));
    await clickButton(ui.host,'Fechar janela');
    await act(async()=>panel.querySelector('a[href="#inicio/fichas"]').click());
    await waitFor(()=>ui.host.querySelector('.orbital-home').dataset.phase==='destination');
    await clickButton(panel,'Criar personagem');
    assert(ui.host.querySelector('dialog[open][aria-label="Criar nova ficha"]'));
    await clickButton(ui.host,'Fechar janela');
    await clickButton(panel,'Ver todas as fichas');
    assert.equal(window.location.hash,'#ficha');
    assert(ui.host.querySelector('.character-library'));
  } finally {await ui.close();globalThis.fetch=native;await preferences({motionReduced:false});window.history.replaceState(null,'','#inicio');}
});


test('Concluir a câmera não retira o foco de uma configuração aberta durante a viagem', async () => {
  const ui=await start();
  try {
    await clickButton(ui.host.querySelector('.orbital-navigation'),'Sistemas');
    await clickButton(ui.host,'Configurações');
    const close=ui.host.querySelector('.appearance-dialog button');
    await act(async()=>close.focus());
    await waitFor(()=>ui.host.querySelector('.orbital-home').dataset.phase==='destination');
    assert.equal(document.activeElement,close);
  } finally {await ui.close();window.history.replaceState(null,'','#inicio');}
});


test('Manipular o D20 durante a aproximação mantém o controle manual focado', async () => {
  const ui=await start();
  try {
    await clickButton(ui.host.querySelector('.orbital-navigation'),'Sistemas');
    const control=ui.host.querySelector('.orbital-d20-control');
    await act(async()=>{control.focus();control.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));});
    await waitFor(()=>ui.host.querySelector('.orbital-home').dataset.phase==='destination');
    assert.equal(document.activeElement,control);
    assert.equal(ui.host.querySelector('.orbital-art').dataset.diskSelected,'true');
  } finally {await ui.close();window.history.replaceState(null,'','#inicio');}
});
