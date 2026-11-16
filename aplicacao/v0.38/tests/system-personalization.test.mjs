import test from 'node:test';import assert from 'node:assert/strict';
import {mountPlatform,clickButton,waitFor,preferences} from './helpers/platform-dom.mjs';
import {openPlatformSession} from '../lib/platform-session.ts';
import {makeAB10Rulebook,makeRulebook} from '../lib/model.ts';
import {assignThemeAsset,emptySystemVisuals} from '../lib/system-visuals.ts';
import {pngAsset} from './helpers/theme-fixtures.mjs';

test('Personalização tem Computador, Celular e Super PNG, com fundo compartilhado e controles de capa',async()=>{
 const visuals=assignThemeAsset(emptySystemVisuals(),'superPngCover',pngAsset()),book={...makeRulebook('Personalização temporária'),visuals};
 for(const narrow of [false,true]){
  sessionStorage.clear();const cache=await openPlatformSession();await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});cache.close();await preferences({narrow,motionReduced:false});const ui=await mountPlatform();
  try{
   await clickButton(ui.host,'Editar sistema');await clickButton(ui.host,'Personalizar');const editor=ui.host.querySelector('.system-visual-editor'),nav=editor.querySelector('.visual-area-nav');
   assert.deepEqual([...nav.querySelectorAll('h3>span:last-child')].map(n=>n.textContent),['Computador','Celular','Super PNG']);
   assert.equal(nav.querySelector('[aria-pressed=true]').getAttribute('aria-label'),'Logo no computador');
   const switcher=editor.querySelector('.visual-device-switcher');await clickButton(switcher,'Celular');assert(editor.querySelector('.visual-preview-scene.collapsed'));assert.equal(nav.querySelector('[data-active=true]').id,'visual-areas-mobile');
   await clickButton(nav,'Fundo do cabeçalho no celular');await clickButton(switcher,'Computador');assert.equal(nav.querySelector('[aria-pressed=true]').getAttribute('aria-label'),'Fundo do cabeçalho no computador');
   await clickButton(nav,'Fundo da página · Computador');await clickButton(switcher,'Celular');assert.equal(nav.querySelector('[aria-pressed=true]').getAttribute('aria-label'),'Fundo da página · Celular');
   await clickButton(switcher,'Super PNG');assert.equal(nav.querySelector('[data-active=true]').id,'visual-areas-export');assert.equal(nav.querySelector('[aria-pressed=true]').getAttribute('aria-label'),'Capa do Super PNG');
   await clickButton(nav,'Logo no celular');assert(editor.querySelector('.visual-preview-scene.collapsed'));assert.equal(nav.querySelectorAll('[aria-pressed=true]').length,1);
   for(const view of ['Computador','Celular']){await clickButton(nav,'Fundo da página · '+view);assert.equal(nav.querySelectorAll('[aria-pressed=true]').length,1);assert.match(editor.querySelector('.field-help').textContent,/computador e no celular/);}
   await clickButton(nav,'Capa do Super PNG');const file=editor.querySelector('input[type=file]');assert(!file.accept.includes('gif'));assert.match(file.accept,/image\/png/);assert.match(editor.querySelector('.field-help').textContent,/capa do sistema/);assert.equal(editor.querySelector('select').disabled,false);
   // Close before the delayed canvas preview; real canvas generation is tested separately.
   await clickButton(editor,'Salvar personalização');await waitFor(()=>!ui.host.querySelector('.system-visual-editor'));assert.equal(ui.host.querySelector('.header-system-name').textContent,book.name);
  }finally{await ui.close();}
  const saved=await openPlatformSession(),restored=await saved.load();assert.deepEqual(restored.books.find(b=>b.id===book.id).visuals,visuals);saved.close();
 }
 await preferences({narrow:false,motionReduced:false});
});

test('Fechar personalização com ajustes pendentes pede decisão e conserva o rascunho ao continuar',async()=>{
 sessionStorage.clear();const visuals=assignThemeAsset(emptySystemVisuals(),'expandedLogo',pngAsset()),book={...makeRulebook('Rascunho visual temporário'),visuals},cache=await openPlatformSession();await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});cache.close();await preferences({narrow:false,motionReduced:false});const ui=await mountPlatform();
 try{
  await clickButton(ui.host,'Editar sistema');await clickButton(ui.host,'Personalizar');const editor=ui.host.querySelector('.system-visual-editor'),select=editor.querySelector('select');
  const {act}=await import('./helpers/platform-dom.mjs');await act(async()=>{select.value='cover';select.dispatchEvent(new Event('change',{bubbles:true}));});
  await clickButton(editor,'Fechar personalização');assert(ui.host.querySelector('.system-visual-editor'),'O rascunho não deve sumir antes da decisão.');assert(editor.textContent.includes('não salvas'));
  await clickButton(editor,'Continuar editando');assert.equal(select.value,'cover');await clickButton(editor,'Salvar personalização');await waitFor(()=>!ui.host.querySelector('.system-visual-editor'));
 }finally{await ui.close();}
 const saved=await openPlatformSession();try{assert.equal((await saved.load()).books.find(b=>b.id===book.id).visuals.areas.expandedLogo.fit,'cover');}finally{saved.close();}
});
