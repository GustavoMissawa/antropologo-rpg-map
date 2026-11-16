import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBDatabase,IDBObjectStore} from 'fake-indexeddb';
import {openPlatformSession} from '../lib/platform-session.ts';
import {makeRulebook,makeAB10Rulebook} from '../lib/model.ts';
function setup(){const storage=new Map(),previous={indexedDB:globalThis.indexedDB,sessionStorage:globalThis.sessionStorage};globalThis.indexedDB=new IDBFactory();globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};return()=>Object.assign(globalThis,previous);}
const workspace=book=>({books:[makeAB10Rulebook(),book],contextId:book.id,page:'home'});
test('Falha de uma transação não faz o salvamento seguinte omitir o conteúdo dos sistemas',async()=>{
 const restore=setup(),cache=await openPlatformSession(),native=IDBDatabase.prototype.transaction,book=makeRulebook('Cache temporário');let armed=true;
 IDBDatabase.prototype.transaction=function(...args){const tx=native.apply(this,args);if(args[1]==='readwrite'&&armed){armed=false;queueMicrotask(()=>tx.abort());}return tx;};
 try{const first=cache.save(workspace(book)),second=cache.save({...workspace(book),page:'rules'});await assert.rejects(first);await second;const recovered=await cache.load();assert(recovered.books.some(b=>b.id===book.id),'O salvamento posterior deve incluir o sistema que não chegou a ser gravado.');assert.equal(recovered.page,'rules');}finally{IDBDatabase.prototype.transaction=native;cache.close();restore();}
});
test('Falha síncrona de escrita vira rejeição tratável e permite tentar salvar novamente',async()=>{
 const restore=setup(),cache=await openPlatformSession(),native=IDBObjectStore.prototype.put,book=makeRulebook('Cota temporária');let armed=true;
 IDBObjectStore.prototype.put=function(...args){if(this.name==='books'&&armed){armed=false;throw new DOMException('Cota simulada','QuotaExceededError');}return native.apply(this,args);};
 try{let pending;assert.doesNotThrow(()=>{pending=cache.save(workspace(book));});await assert.rejects(pending);await cache.save(workspace(book));assert((await cache.load()).books.some(b=>b.id===book.id));}finally{IDBObjectStore.prototype.put=native;cache.close();restore();}
});
test('Abertura sem resposta termina com erro e fecha uma conexão que chegar atrasada',async()=>{
 const restore=setup();let opening={},closed=false;globalThis.indexedDB={open:()=>opening};try{await assert.rejects(openPlatformSession({timeoutMs:15}),/não respondeu a tempo/);opening.result={close:()=>{closed=true;}};opening.onsuccess();assert.equal(closed,true);}finally{restore();}
});
test('Leitura sem resposta encerra a espera e não altera a cópia já armazenada',async()=>{
 const restore=setup(),cache=await openPlatformSession(),book=makeRulebook('Leitura interrompida'),native=IDBObjectStore.prototype.get;await cache.save(workspace(book));let armed=true;
 IDBObjectStore.prototype.get=function(...args){if(this.name==='contexts'&&armed){armed=false;return {};}return native.apply(this,args);};
 try{await assert.rejects(cache.load({timeoutMs:15}),/não respondeu a tempo/);assert((await cache.load()).books.some(b=>b.id===book.id));}finally{IDBObjectStore.prototype.get=native;cache.close();restore();}
});
test('Fechar e reabrir logo após duas gravações conserva o último estado aceito',async()=>{
 const restore=setup(),cache=await openPlatformSession(),a=makeRulebook('Primeiro'),b=makeRulebook('Segundo');
 try{const first=cache.save(workspace(a)),second=cache.save({books:[makeAB10Rulebook(),a,b],contextId:b.id,page:'pdfs'});cache.close();const reopened=await openPlatformSession();try{const loaded=await reopened.load();await Promise.all([first,second]);assert(loaded.books.some(book=>book.id===b.id));assert.equal(loaded.page,'pdfs');}finally{reopened.close();}}finally{cache.close();restore();}
});
test('Remover e recolocar um sistema em gravações sobrepostas não deixa referências sem conteúdo',async()=>{
 const restore=setup(),cache=await openPlatformSession(),book=makeRulebook('Volta segura');try{await cache.save(workspace(book));const removing=cache.save({books:[makeAB10Rulebook()],contextId:null,page:'home'}),restoring=cache.save(workspace(book));await Promise.all([removing,restoring]);assert((await cache.load()).books.some(b=>b.id===book.id));}finally{cache.close();restore();}
});
