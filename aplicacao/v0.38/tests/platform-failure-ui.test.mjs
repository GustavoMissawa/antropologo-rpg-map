import test from 'node:test';import assert from 'node:assert/strict';
import {IDBObjectStore} from 'fake-indexeddb';
import {mountPlatform,act} from './helpers/platform-dom.mjs';
import {openPlatformSession} from '../lib/platform-session.ts';import {makeRulebook,makeAB10Rulebook} from '../lib/model.ts';
test('Falhar na leitura inicial não apaga o cache já existente',async()=>{
 sessionStorage.clear();const cache=await openPlatformSession(),book=makeRulebook('Cópia anterior preservada');await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});cache.close();const native=IDBObjectStore.prototype.get;let armed=true;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='contexts'&&armed){armed=false;throw new DOMException('Leitura temporariamente indisponível','UnknownError');}return native.apply(this,args);};let ui;
 try{ui=await mountPlatform();assert(ui.host.textContent.includes('não permitiu recuperar'));await act(async()=>{await new Promise(r=>setTimeout(r,40));});}finally{IDBObjectStore.prototype.get=native;if(ui)await ui.close();}
 const restoredCache=await openPlatformSession();try{assert((await restoredCache.load()).books.some(b=>b.id===book.id),'A falha de leitura deve preservar o conteúdo já salvo.');}finally{restoredCache.close();}
});
test('Leitura inicial sem resposta libera a interface sem sobrescrever o cache',async()=>{
 sessionStorage.clear();const cache=await openPlatformSession(),book=makeRulebook('Cópia antes da espera');await cache.save({books:[makeAB10Rulebook(),book],contextId:book.id,page:'rules'});cache.close();const nativeGet=IDBObjectStore.prototype.get,nativeTimeout=globalThis.setTimeout;let armed=true,reading=false,ui;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='contexts'&&armed){armed=false;reading=true;return {};}return nativeGet.apply(this,args);};globalThis.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===8000&&reading?15:ms,...args);
 try{ui=await mountPlatform();assert(ui.host.textContent.includes('cache existente foi preservado'));assert.equal(ui.host.querySelector('[data-session-ready]').getAttribute('data-session-ready'),'true');}finally{IDBObjectStore.prototype.get=nativeGet;globalThis.setTimeout=nativeTimeout;if(ui)await ui.close();}
 const reopened=await openPlatformSession();try{assert((await reopened.load()).books.some(b=>b.id===book.id));}finally{reopened.close();}
});
