import test from 'node:test';import assert from 'node:assert/strict';
import {mountPlatform,clickButton,waitFor,calls,preferences,act} from './helpers/platform-dom.mjs';
import {openPlatformSession} from '../lib/platform-session.ts';import {makeRulebook,makeAB10Rulebook} from '../lib/model.ts';
import {emptySystemVisuals,assignThemeAsset} from '../lib/system-visuals.ts';import {gifAsset,pngAsset} from './helpers/theme-fixtures.mjs';
const locationHash=page=>({home:'#inicio',rules:'#regras',sheet:'#ficha',pdfs:'#pdfs',agenda:'#agenda'})[page];
test.afterEach(()=>window.localStorage.removeItem('ab10-appearance'));
async function seed(book,contextId=book.id,page='home'){sessionStorage.clear();window.localStorage.setItem('ab10-appearance',JSON.stringify({interfaceStyle:'classic'}));window.history.replaceState(null,'',locationHash(page));const cache=await openPlatformSession();await cache.save({books:[makeAB10Rulebook(),book],contextId,page});cache.close();}
test('Cache real da aplicação, com IndexedDB simulado, restaura tema e contexto ao remontar nas cinco páginas',async()=>{const book=makeRulebook('Universo temporário');book.visuals=assignThemeAsset(emptySystemVisuals(),'mainBackground',gifAsset());await seed(book);let ui=await mountPlatform();await waitFor(()=>ui.host.dataset.ready||ui.host.querySelector('[data-system-id]')?.dataset.systemId===book.id);for(const label of ['Sistema','Ficha','PDFs','Agenda','Início']){await clickButton(ui.host,label);assert.equal(ui.host.querySelector('.app-shell').dataset.systemId,book.id);assert(ui.host.querySelector('.system-main-ambient img'));}await ui.close();ui=await mountPlatform();await waitFor(()=>ui.host.querySelector('.app-shell').dataset.systemId===book.id);assert(ui.host.textContent.includes('Universo temporário'));await ui.close();});
test('Perfil usa identidade global temporariamente; fechar restaura contexto e voltar pela logo não chama logout',async()=>{const book=makeRulebook('Contexto do perfil');await seed(book);const ui=await mountPlatform();await waitFor(()=>ui.host.querySelector('[data-system-id]'));await clickButton(ui.host,'Abrir perfil de @teste_simulado');await waitFor(()=>ui.host.querySelector('.app-shell').dataset.context==='global');assert(ui.host.querySelector('.player-dialog[open]'));await clickButton(ui.host,'Fechar janela');await waitFor(()=>ui.host.querySelector('.app-shell').dataset.systemId===book.id);await clickButton(ui.host,'Voltar ao ANTROPOLOGO');assert.equal(ui.host.querySelector('.app-shell').dataset.context,'global');assert(!calls.some(url=>url.includes('logout')));await ui.close();const cache=await openPlatformSession();const restored=await cache.load();assert.equal(restored.contextId,null);assert(restored.books.some(b=>b.id===book.id));cache.close();});
test('Movimento reduzido e navegação direta móvel preservam o contexto, sem emular layout',async()=>{let visuals=emptySystemVisuals();for(const area of ['collapsedLogo','expandedLogo','collapsedBackground','expandedBackground','mainBackground'])visuals=assignThemeAsset(visuals,area,gifAsset());const book={...makeRulebook('GIFs controlados'),visuals};await seed(book);await preferences({motionReduced:true,narrow:false});const ui=await mountPlatform();await waitFor(()=>ui.host.querySelector('.system-main-ambient img'));assert.equal(ui.host.querySelectorAll('.system-main-ambient img[src^="data:image/gif;"]').length,0);await preferences({narrow:true});await waitFor(()=>ui.host.querySelector('.header-system-identity img'));assert.equal(ui.host.querySelector('button[aria-label="Abrir menu"]'),null);const nav=ui.host.querySelector('.global-top-nav');assert.equal(nav.querySelectorAll('button').length,5);await clickButton(nav,'PDFs');assert.equal(nav.querySelector('[aria-current=page]').textContent,'PDFs');assert.equal(ui.host.querySelector('.app-shell').dataset.systemId,book.id);assert(!ui.host.querySelector('.sidebar.is-open'));assert(ui.host.querySelector('.system-main-ambient img'));assert.equal(ui.host.querySelectorAll('.system-header-ambient img[src^="data:image/gif;"]').length,0);assert(ui.host.querySelector('.system-header-ambient img'));assert.equal(ui.host.querySelector('.sidebar'),null);await ui.close();await preferences({narrow:false,motionReduced:false});});
test('Armazenamento bloqueado não prende a interface: global e aviso seguro continuam acessíveis',async()=>{const original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get(){throw Error('Bloqueado no teste');}});const ui=await mountPlatform();assert.equal(ui.host.querySelector('.app-shell').dataset.context,'global');assert(ui.host.textContent.includes('O navegador não permitiu recuperar o contexto'));assert.equal(ui.host.querySelector('.app-shell').hasAttribute('inert'),false);await ui.close();Object.defineProperty(globalThis,'sessionStorage',original);});

test('Cabeçalho único mantém nome, separador e destinos nos modos desktop e móvel, incluindo troca e saída',async()=>{
 const book=makeRulebook('Um sistema com um nome muito extenso para testar o cabeçalho');
 for(const narrow of [false,true]){
  await preferences({narrow,motionReduced:false});await seed(book);const ui=await mountPlatform();
  try{
   const header=ui.host.querySelector('.topbar'),nav=header.querySelector('.global-top-nav');
   assert.equal(ui.host.querySelector('.sidebar'),null);assert.equal(ui.host.querySelector('.nav-backdrop'),null);
   assert.equal(header.querySelector('.header-context-separator').textContent,'×');assert.equal(header.querySelector('.header-system-name').textContent,book.name);assert(header.querySelector('.header-system-identity').title.includes(book.name));
   for(const label of ['Sistema','Ficha','PDFs','Agenda','Início']){await clickButton(nav,label);assert.equal(nav.querySelectorAll('[aria-current=page]').length,1);assert.equal(nav.querySelector('[aria-current=page]').textContent,label);assert.equal(header.querySelector('.header-system-name').textContent,book.name);}
   await clickButton(header,'Trocar sistema');await clickButton(ui.host,'Abrir regras de AB10 — Absolute 10');assert.equal(header.querySelector('.header-system-name').textContent,'AB10 — Absolute 10');assert.equal(ui.host.querySelectorAll('nav[aria-label="Áreas da plataforma"]').length,1);
   await clickButton(header,'Voltar ao ANTROPOLOGO');assert.equal(header.querySelector('.header-system-name'),null);assert.equal(header.querySelector('.header-context-separator'),null);assert.equal(ui.host.querySelector('.app-shell').dataset.context,'global');assert.equal(nav.querySelector('[aria-current=page]').textContent,'Início');
  }finally{await ui.close();}
 }
 await preferences({narrow:false,motionReduced:false});
});
test('Cabeçalho reutiliza áreas compactas e completas sem converter ou perder os temas salvos',async()=>{
 let visuals=emptySystemVisuals();for(const [area,bytes,seed] of [['collapsedLogo',1000,65],['expandedLogo',1000,66],['collapsedBackground',1000,67],['expandedBackground',1000,68],['mainBackground',1000,69]])visuals=assignThemeAsset(visuals,area,gifAsset(bytes,seed));
 const book={...makeRulebook('Tema no cabeçalho'),visuals};await seed(book);await preferences({narrow:false,motionReduced:false});const ui=await mountPlatform();
 try{
  const header=ui.host.querySelector('.topbar');assert.equal(header.querySelector('.header-system-identity img').src,visuals.assets[visuals.areas.expandedLogo.assetId].src);assert.equal(header.querySelector('.system-header-ambient img').src,visuals.assets[visuals.areas.expandedBackground.assetId].src);
  await preferences({narrow:true});assert.equal(header.querySelector('.header-system-identity img').src,visuals.assets[visuals.areas.collapsedLogo.assetId].src);assert.equal(header.querySelector('.system-header-ambient img').src,visuals.assets[visuals.areas.collapsedBackground.assetId].src);
  await preferences({motionReduced:true});assert(!header.querySelector('img[src^="data:image/gif;"]'));await clickButton(ui.host,'Abrir perfil de @teste_simulado');assert.equal(header.querySelector('.header-system-name'),null);assert.equal(header.querySelector('.system-header-ambient'),null);assert.equal(ui.host.querySelector('.system-main-ambient'),null);
  await clickButton(ui.host,'Fechar janela');assert.equal(header.querySelector('.header-system-name').textContent,book.name);assert(ui.host.querySelector('.system-main-ambient img'));
 }finally{await ui.close();await preferences({narrow:false,motionReduced:false});}
 const cache=await openPlatformSession(),restored=await cache.load();assert.deepEqual(restored.books.find(b=>b.id===book.id).visuals,visuals);cache.close();
});

test('Logo do sistema substitui visualmente o nome e uma falha da imagem recupera o nome sem alterar dados',async()=>{
 const book={...makeRulebook('Identidade com logo'),logo:pngAsset().src};let visuals=assignThemeAsset(emptySystemVisuals(),'expandedLogo',gifAsset(1000,65));visuals=assignThemeAsset(visuals,'collapsedLogo',gifAsset(1000,66));
 for(const initial of [book,{...book,visuals}]){
  await seed(initial);await preferences({narrow:false,motionReduced:false});const ui=await mountPlatform();
  try{
   const header=ui.host.querySelector('.header-system-identity');assert(header.classList.contains('has-logo'));assert.equal(header.querySelector('#active-system-name').textContent,book.name);assert.equal(header.getAttribute('aria-describedby'),'active-system-name');
   const img=header.querySelector('img');await act(async()=>img.dispatchEvent(new Event('error')));assert.equal(header.querySelector('img'),null);assert(!header.classList.contains('has-logo'));assert.equal(header.querySelector('.header-system-name').textContent,book.name);
   if(initial.visuals){await preferences({narrow:true});assert(header.querySelector('img'));assert(header.classList.contains('has-logo'));}
  }finally{await ui.close();}
  const cache=await openPlatformSession();try{const saved=(await cache.load()).books.find(b=>b.id===book.id);assert.equal(saved.logo,initial.logo);assert.deepEqual(saved.visuals,initial.visuals);}finally{cache.close();}
 }
 await preferences({narrow:false,motionReduced:false});
});
