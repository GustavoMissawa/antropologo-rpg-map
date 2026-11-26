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

function selectBody(scene,id){
  const link=scene.querySelector('[data-world-body="'+id+'"]');
  assert(link,'Corpo esperado na cena: '+id);
  return act(async()=>link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
}

test('Exploração, foco e leitura do AB10 conservam a cena e o histórico', async () => {
  sessionStorage.clear();
  await preferences({motionReduced:true});
  const ui = await start('#regras/ab10');
  try {
    const map=ui.host.querySelector('.orbital-system-scene');
    const world=map.querySelector('.orbital-world-svg');
    const article=ui.host.querySelector('.rule-article');
    assert.equal(map.dataset.sceneMode,'exploration');
    assert.equal(map.dataset.planetCount,'5');
    assert.equal(map.dataset.moonCount,'3');
    assert.equal(world.querySelectorAll('[data-body-kind="planet"]').length,5);
    assert(ui.host.querySelector('.rules-layout > .rule-index'));
    assert(article.hasAttribute('inert'));
    await selectBody(map,'character');
    const planet=map.querySelector('[data-world-body="character"]');
    await selectBody(map,'attributes');
    assert.equal(window.location.hash,'#regras/ab10/topico/attributes/orbita');
    assert.equal(map.dataset.sceneMode,'focus');
    assert.equal(planet,map.querySelector('[data-world-body="character"]'));
    assert.equal(world,map.querySelector('.orbital-world-svg'));
    assert.equal(map.querySelector('[data-body-kind="moon"][aria-current]').dataset.worldBody,'attributes');
    assert.equal(map.querySelector('.orbital-system-viewport').dataset.cameraMotion,undefined);
    assert.equal(ui.host.querySelector('.rule-tree [aria-current="page"]').textContent,'Atributos');
    await clickButton(map,'Ler tópico');
    assert.equal(window.location.hash,'#regras/ab10/topico/attributes');
    assert.equal(article.querySelector('h2').textContent,'Atributos');
    assert(!article.hasAttribute('inert'));
    assert(map.hasAttribute('inert'));
    await waitFor(()=>document.activeElement===article);

    await act(async()=>window.history.back());
    await waitFor(()=>map.dataset.sceneMode==='focus');
    assert.equal(map.dataset.celestialBody,'attributes');
    await act(async()=>window.history.forward());
    await waitFor(()=>map.dataset.sceneMode==='reading');
    await clickButton(article,'Voltar à órbita');
    assert.equal(map.dataset.sceneMode,'focus');
    assert.equal(map.dataset.celestialBody,'attributes');
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
    assert.equal(ui.host.querySelector('.orbital-system-scene'),null);
  } finally {await ui.close();}
});

test('Movimento reduzido ou aba oculta encerram o percurso sem alterar a rota', async () => {
  sessionStorage.clear();
  await preferences({motionReduced:false});
  const descriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'clientWidth');
  const visibility=Object.getOwnPropertyDescriptor(document,'hidden');
  Object.defineProperty(HTMLElement.prototype,'clientWidth',{configurable:true,get(){
    return this.classList.contains('orbital-system-viewport')?900:0;
  }});
  const ui=await start('#regras/ab10/topico/character/orbita');
  try {
    const map=ui.host.querySelector('.orbital-system-scene');
    await selectBody(map,'welcome');
    const viewport=map.querySelector('.orbital-system-viewport');
    assert.equal(viewport.dataset.cameraMotion,'jump');
    await preferences({motionReduced:true});
    assert.equal(viewport.dataset.cameraMotion,undefined);
    assert.equal(map.dataset.celestialBody,'welcome');
    assert.equal(window.location.hash,'#regras/ab10/topico/welcome/orbita');
    await preferences({motionReduced:false});
    assert.equal(viewport.dataset.cameraMotion,undefined);
    await selectBody(map,'character');
    assert.equal(viewport.dataset.cameraMotion,'jump');
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(viewport.dataset.cameraMotion,undefined);
    assert.equal(map.dataset.celestialBody,'character');
    assert.equal(window.location.hash,'#regras/ab10/topico/character/orbita');
  } finally {
    await ui.close();
    if(visibility)Object.defineProperty(document,'hidden',visibility);
    else delete document.hidden;
    if(descriptor)Object.defineProperty(HTMLElement.prototype,'clientWidth',descriptor);
    else delete HTMLElement.prototype.clientWidth;
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

test('O fundo retorna do planeta e da lua pela rota do mapa, sem confundir gestos ou controles', async () => {
  sessionStorage.clear();
  await preferences({motionReduced:true});
  const ui=await start('#regras/ab10');
  const pointer=(target,type,{id=1,x=100,y=100,pointerType='mouse',primary=true}={})=>{
    const event=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});
    Object.defineProperties(event,{pointerId:{value:id},pointerType:{value:pointerType},isPrimary:{value:primary}});
    target.dispatchEvent(event);
  };
  try {
    const scene=ui.host.querySelector('.orbital-system-scene');
    const sky=scene.querySelector('.orbital-world-svg');
    const body=id=>scene.querySelector('[data-world-body="'+id+'"] .orbital-body-hit');
    const press=(start=sky,end=start,opts={})=>act(async()=>{
      pointer(start,'pointerdown',opts);
      pointer(end,'pointerup',opts);
    });

    await press();
    assert.equal(window.location.hash,'#regras/ab10');
    await selectBody(scene,'character');
    const planetHash=window.location.hash;
    for(const target of [body('character'),body('attributes'),scene.querySelector('.orbital-map-star circle'),
      scene.querySelector('.orbital-system-caption h2'),scene.querySelector('.orbital-map-actions button'),
      ui.host.querySelector('.rule-index button')]){
      assert(target);
      await press(target);
      assert.equal(window.location.hash,planetHash);
    }
    await press(sky,body('attributes'));
    await press(body('character'),sky);
    await act(async()=>{
      pointer(sky,'pointerdown');
      pointer(sky,'pointermove',{x:140});
      pointer(sky,'pointerup');
    });
    assert.equal(window.location.hash,planetHash);
    await act(async()=>{
      pointer(sky,'pointerdown',{pointerType:'touch'});
      pointer(sky,'pointerdown',{id:2,pointerType:'touch',primary:false});
      pointer(sky,'pointerup',{id:2,pointerType:'touch',primary:false});
      pointer(sky,'pointerup',{pointerType:'touch'});
    });
    assert.equal(window.location.hash,planetHash);
    await act(async()=>{
      pointer(sky,'pointerdown',{pointerType:'touch'});
      pointer(sky,'pointercancel',{pointerType:'touch'});
      pointer(sky,'pointerup',{pointerType:'touch'});
    });
    assert.equal(window.location.hash,planetHash);

    await press();
    assert.equal(scene.dataset.sceneMode,'exploration');
    assert.equal(window.location.hash,'#regras/ab10');
    await act(async()=>window.history.back());
    await waitFor(()=>window.location.hash===planetHash);
    await waitFor(()=>scene.dataset.celestialBody==='character');
    await selectBody(scene,'attributes');
    await press(sky,sky,{pointerType:'touch'});
    assert.equal(window.location.hash,'#regras/ab10');
    assert.equal(scene.dataset.sceneMode,'exploration');
    assert.equal(scene.querySelector('.orbital-system-viewport').dataset.cameraMotion,undefined);
    await waitFor(()=>document.activeElement===scene.querySelector('h2'));
  } finally {await ui.close();await preferences({motionReduced:false});}
});
