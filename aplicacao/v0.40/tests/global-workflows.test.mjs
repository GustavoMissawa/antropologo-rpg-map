import test from 'node:test';import assert from 'node:assert/strict';
import {mountPlatform,clickButton,openOrbitalArea,waitFor,act} from './helpers/platform-dom.mjs';
import {makeSheet,makeRulebook} from '../lib/model.ts';

test('Verificar a mesma conta por foco não descarta uma sessão que estava sendo salva',async()=>{
 sessionStorage.clear();const native=globalThis.fetch,expiresAt=Date.now()+7200000;let ui,resolveSave;
 const stableFetch=(path,options)=>String(path)==='/api/auth/session'?Promise.resolve({ok:true,status:200,json:async()=>({user:{handle:'teste_simulado',expiresAt}})}):native(path,options);globalThis.fetch=stableFetch;
 try{
  ui=await mountPlatform();await openOrbitalArea(ui.host,'Agenda');await clickButton(ui.host,'Nova sessão');
  globalThis.fetch=async(path,options)=>String(path)==='/api/sessions'&&options?.method==='POST'?new Promise(resolve=>{resolveSave=resolve;}):stableFetch(path,options);
  const form=ui.host.querySelector('.player-dialog[open] form');form.querySelector('[name=title]').value='Sessão durante foco';
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await act(async()=>window.dispatchEvent(new Event('focus')));
  await act(async()=>{const now=new Date().toISOString();resolveSave({ok:true,status:201,json:async()=>({id:'qa-focus-save',title:'Sessão durante foco',kind:'one-shot',date:form.querySelector('[name=date]').value,startTime:'19:00',duration:180,location:'',description:'',createdAt:now,updatedAt:now})});});
  await waitFor(()=>!ui.host.querySelector('.player-dialog[open]'));assert([...ui.host.querySelectorAll('.session-card h3')].some(e=>e.textContent==='Sessão durante foco'));
 }finally{globalThis.fetch=native;if(ui)await ui.close();}
});

test('Uma resposta antiga da Agenda não entra na conta que foi trocada durante o salvamento',async()=>{
 sessionStorage.clear();const native=globalThis.fetch,expiresAt=Date.now()+7200000;let ui,resolveSave,handle='conta_inicial';
 globalThis.fetch=(path,options)=>String(path)==='/api/auth/session'?Promise.resolve({ok:true,status:200,json:async()=>({user:{handle,expiresAt}})}):String(path)==='/api/sessions'&&options?.method==='POST'?new Promise(resolve=>{resolveSave=resolve;}):native(path,options);
 try{
  ui=await mountPlatform();await openOrbitalArea(ui.host,'Agenda');await clickButton(ui.host,'Nova sessão');
  const form=ui.host.querySelector('.player-dialog[open] form'),date=form.querySelector('[name=date]').value;form.querySelector('[name=title]').value='Sessão da primeira conta';
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  handle='outra_conta';await act(async()=>window.dispatchEvent(new Event('focus')));
  await act(async()=>{const now=new Date().toISOString();resolveSave({ok:true,status:201,json:async()=>({id:'qa-old-account',title:'Sessão da primeira conta',kind:'one-shot',date,startTime:'19:00',duration:180,location:'',description:'',createdAt:now,updatedAt:now})});});
  await waitFor(()=>!ui.host.querySelector('.player-dialog[open]'));assert(![...ui.host.querySelectorAll('.session-card h3')].some(e=>e.textContent==='Sessão da primeira conta'));
 }finally{globalThis.fetch=native;if(ui)await ui.close();}
});

test('A última ficha escolhida permanece aberta quando uma importação anterior termina atrasada',async()=>{
 sessionStorage.clear();const nativeResize=globalThis.ResizeObserver;globalThis.ResizeObserver=class{observe(){}disconnect(){}};const ui=await mountPlatform();let resolveFirst;
 try{
  await openOrbitalArea(ui.host,'Ficha');const input=ui.host.querySelector('input[aria-label="Selecionar arquivo de ficha"]'),first=makeSheet('Primeira importação atrasada',''),last=makeSheet('Última ficha escolhida',''),bytes=new TextEncoder().encode(JSON.stringify(first));
  const slow={name:'primeira.json',size:bytes.length,arrayBuffer:()=>new Promise(resolve=>{resolveFirst=()=>resolve(bytes.buffer);})},fast=new File([JSON.stringify(last)],'ultima.json',{type:'application/json'});
  for(const file of [slow,fast]){Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
  await waitFor(()=>ui.host.textContent.includes(last.name));await act(async()=>resolveFirst());
  assert(ui.host.querySelector('.map-character-name')?.textContent.includes(last.name),'Uma leitura antiga não deve substituir a ficha escolhida mais recentemente.');
 }finally{await ui.close();globalThis.ResizeObserver=nativeResize;}
});

test('A última importação de regras prevalece e uma falha anterior não apaga seu resultado',async()=>{
 sessionStorage.clear();const ui=await mountPlatform();let rejectFirst;
 try{
  await openOrbitalArea(ui.host,'Sistema','Ver todos os sistemas');const input=ui.host.querySelector('input[aria-label="Arquivo de conjunto de regras"]'),last=makeRulebook('Sistema mais recente','');
  const slow={name:'antigo.json',size:100,arrayBuffer:()=>new Promise((_resolve,reject)=>{rejectFirst=reject;})},fast=new File([JSON.stringify(last)],'ultimo.json',{type:'application/json'});
  for(const file of [slow,fast]){Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
  await waitFor(()=>ui.host.querySelector('.orbital-workspace-heading h1')?.textContent.includes(last.name));await act(async()=>rejectFirst(new Error('Falha antiga controlada')));
  assert(ui.host.querySelector('.orbital-workspace-heading h1')?.textContent.includes(last.name));assert(!ui.host.querySelector('.ruleset-import-error'));assert(!ui.host.querySelector('.toast')?.textContent.includes('Falha antiga controlada'));
 }finally{await ui.close();}
});

test('Abrir uma ficha não depende da disponibilidade de ResizeObserver',async()=>{
 sessionStorage.clear();const nativeResize=globalThis.ResizeObserver;delete globalThis.ResizeObserver;const ui=await mountPlatform();
 try{
  await openOrbitalArea(ui.host,'Ficha');const input=ui.host.querySelector('input[aria-label="Selecionar arquivo de ficha"]'),sheet=makeSheet('Ficha sem observador','');
  Object.defineProperty(input,'files',{configurable:true,value:[new File([JSON.stringify(sheet)],'sem-observador.json',{type:'application/json'})]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));await waitFor(()=>ui.host.querySelector('.sheet-map'));
  assert(ui.host.querySelector('.map-character-name')?.textContent.includes(sheet.name));
 }finally{await ui.close();globalThis.ResizeObserver=nativeResize;}
});
