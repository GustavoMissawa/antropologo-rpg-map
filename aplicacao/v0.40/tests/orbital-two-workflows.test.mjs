import assert from 'node:assert/strict';
import test from 'node:test';
import { bindSheetToRulebook, makeAB10Rulebook, makeRulebook, makeSheet } from '../lib/model.ts';
import { platformHref } from '../lib/platform-navigation.ts';
import { openPlatformSession } from '../lib/platform-session.ts';
import { act, clickButton, mountPlatform, preferences, waitFor } from './helpers/platform-dom.mjs';

const appearanceKey = 'ab10-appearance';
const topic = (id, title, children = [], document) => ({id,title,content:'',status:'draft',children, document});
const ruleRoute = (bookId, topicId, anchorId) => platformHref({page:'rules',bookId,topicId,anchorId});
const nav = host => host.querySelector('.global-top-nav');

async function start(hash, style = 'orbital') {
  window.localStorage.setItem(appearanceKey,JSON.stringify({interfaceStyle:style}));
  window.history.replaceState(null,'',hash);
  return mountPlatform();
}

async function prepareBook() {
  sessionStorage.clear();
  const document = {type:'doc',content:[{type:'heading',attrs:{id:'dados-finais',level:2},content:[{type:'text',text:'Dados finais'}]}]};
  const target = topic('neto', 'Subseção profunda', [], document);
  const links = {type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Ler dados finais',marks:[
    {type:'ruleLink',attrs:{kind:'internal',topicId:'neto',anchorId:'dados-finais'}},
  ]}]}]};
  const root = {...topic('primeiro', 'Planeta de regras', [topic('filho','Subseção intermediária',[target])], links), content:'Ler dados finais'};
  const book = {...makeRulebook('Universo de teste'),chapters:[root]};
  const cache=await openPlatformSession();
  await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});
  cache.close();
  return book;
}

test('Mapa do AB10, passeio e histórico mudam o tópico sem etapa intermediária', async () => {
  sessionStorage.clear();
  await preferences({motionReduced:true});
  const ui = await start('#regras/ab10');
  try {
    const map=ui.host.querySelector('.planetary-scene');
    assert.equal(map.dataset.planetCount,'5');
    assert.equal(map.dataset.moonCount,'3');
    assert.equal(map.querySelectorAll('.planetary-hit-map a').length,5);
    await act(async()=>map.querySelector('nav [href="#regras/ab10/topico/character"]').click());
    await act(async()=>map.querySelector('nav [href="#regras/ab10/topico/attributes"]').click());
    assert.equal(window.location.hash,'#regras/ab10/topico/attributes');
    assert.equal(ui.host.querySelector('.rule-article h2').textContent,'Atributos');
    assert.equal(map.querySelector('[aria-label="Luas"] [aria-current]').textContent,'Atributos');
    assert.equal(map.querySelector('.orbital-space').dataset.flight,undefined);
    assert.equal(map.querySelector('.orbital-space').getAttribute('aria-hidden'),'true');
    await act(async()=>window.history.back());
    await waitFor(()=>map.dataset.celestialBody==='character');
    await act(async()=>window.history.forward());
    await waitFor(()=>map.dataset.celestialBody==='attributes');
    await clickButton(map,'Ler tópico');
    assert.equal(document.activeElement,ui.host.querySelector('.rule-article'));
  } finally {await ui.close();await preferences({motionReduced:false});}
});

test('Âncoras profundas, links e índice hierárquico funcionam no modo Clássico', async () => {
  const book=await prepareBook();
  const ui=await start(ruleRoute(book.id,'primeiro'),'classic');
  try {
    const link=ui.host.querySelector('.rule-internal-link');
    assert.equal(link.getAttribute('href'),ruleRoute(book.id,'neto','dados-finais'));
    await act(async()=>link.click());
    assert.equal(window.location.hash,ruleRoute(book.id,'neto','dados-finais'));
    assert.equal(document.activeElement?.getAttribute('data-rule-anchor'),'dados-finais');
    assert.equal(ui.host.querySelectorAll('.ruleset-chapter-path button').length,3);
    assert.equal(ui.host.querySelector('.planetary-scene'),null);
  } finally {await ui.close();}
});

test('Trocar a preferência de movimento durante um salto limpa a câmera e mantém a rota', async () => {
  sessionStorage.clear();
  await preferences({motionReduced:false});
  const previous=HTMLElement.prototype.animate;
  const motions=[];
  HTMLElement.prototype.animate=function(){
    const animation={cancelled:false,cancel(){this.cancelled=true;}};
    motions.push(animation);
    return animation;
  };
  const ui=await start('#regras/ab10/topico/character');
  try {
    await act(async()=>ui.host.querySelector('nav a[href="#regras/ab10/topico/welcome"]').click());
    const scene=ui.host.querySelector('.planetary-sky');
    assert.equal(scene.dataset.flight,'jump');
    assert(motions.length>=2);
    await preferences({motionReduced:true});
    assert(motions.every(animation=>animation.cancelled));
    assert.equal(scene.querySelector('.orbital-space-departure'),null);
    assert.equal(scene.dataset.flight,undefined);
    assert.equal(window.location.hash,'#regras/ab10/topico/welcome');
    await preferences({motionReduced:false});
    assert.equal(scene.dataset.flight,undefined);
  } finally {
    await ui.close();
    if(previous)HTMLElement.prototype.animate=previous;
    else delete HTMLElement.prototype.animate;
  }
});

test('O botão Voltar protege o rascunho e conserva a entrada anterior do histórico', async () => {
  const book=await prepareBook();
  for(const key of ['Node','DOMParser'])Object.defineProperty(globalThis,key,{configurable:true,value:window[key]});
  const ui=await start(ruleRoute(book.id,'primeiro'));
  try {
    await clickButton(ui.host.querySelector('.ruleset-chapter-path'),'Planeta de regras');
    await clickButton(ui.host.querySelector('.rule-tree'),'Subseção intermediária');
    await clickButton(ui.host,'Editar tópico');
    const status=ui.host.querySelector('select[aria-label="Estado do conteúdo"]');
    await act(async()=>{status.value='test';status.dispatchEvent(new Event('change',{bubbles:true}));});
    await act(async()=>window.history.back());
    await waitFor(()=>ui.host.textContent.includes('Salve ou cancele a edição antes de sair de Sistema.'));
    await waitFor(()=>window.location.hash===ruleRoute(book.id,'filho'));
    assert.equal(status.value,'test');
    assert(ui.host.contains(status));
    const unload=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(unload);
    assert(unload.defaultPrevented);
    await clickButton(ui.host,'Cancelar');
    await act(async()=>window.history.back());
    await waitFor(()=>window.location.hash===ruleRoute(book.id,'primeiro'));
    assert.equal(ui.host.querySelector('.rule-article h2').textContent,'Planeta de regras');
  } finally {await ui.close();}
});

test('Catálogo técnico abre a ficha diretamente e PDFs e Agenda conservam os controles', async () => {
  sessionStorage.clear();
  const ui=await start('#inicio');
  const character=bindSheetToRulebook(makeSheet('Personagem de teste',''),makeAB10Rulebook());
  try {
    await clickButton(nav(ui.host),'Ficha');
    const input=ui.host.querySelector('input[aria-label="Selecionar arquivo de ficha"]');
    Object.defineProperty(input,'files',{configurable:true,value:[new File([JSON.stringify(character)],'orbital.json',{type:'application/json'})]});
    await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
    await waitFor(()=>ui.host.querySelector('.sheet-map'));
    await clickButton(nav(ui.host),'Ficha');
    const record=ui.host.querySelector('.orbital-character-record');
    assert(record.textContent.includes('AB10 — Absolute 10'));
    await clickButton(ui.host,'Abrir ficha de Personagem de teste');
    await waitFor(()=>ui.host.querySelector('.sheet-map'));
    assert.match(window.location.hash, /^#ficha\/personagem\//);

    await preferences({motionReduced:true});
    await clickButton(nav(ui.host),'PDFs');
    assert.equal(window.location.hash,'#pdfs');
    assert.equal(ui.host.querySelector('.comet-scene').getAttribute('aria-hidden'),'true');
    assert.equal(ui.host.querySelector('.comet-scene').dataset.running,'false');
    assert(ui.host.querySelector('[aria-label="Buscar PDFs"]'));
    await clickButton(nav(ui.host),'Início');
    await clickButton(ui.host.querySelector('.orbital-navigation'),'Agenda');
    assert.equal(window.location.hash,'#agenda');
    assert(ui.host.textContent.includes('Agenda de RPG'));
  } finally {await ui.close();await preferences({motionReduced:false});}
});
