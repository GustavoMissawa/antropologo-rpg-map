import test from 'node:test';import assert from 'node:assert/strict';
import {mountPlatform,clickButton,openOrbitalArea} from './helpers/platform-dom.mjs';
test('PDFs rejeitam resposta inválida sem derrubar a plataforma',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;globalThis.fetch=async(path,...args)=>String(path)==='/api/library'?{ok:true,status:200,json:async()=>({unexpected:'object'})}:native(path,...args);let ui;
 try{await assert.doesNotReject(async()=>{ui=await mountPlatform();await openOrbitalArea(ui.host,'PDFs','Abrir biblioteca de PDFs');assert(ui.host.textContent.includes('Não foi possível carregar a biblioteca'));assert(ui.host.querySelector('.topbar'));});}finally{globalThis.fetch=native;if(ui)await ui.close();}
});
test('Agenda rejeita lista inválida e oferece nova tentativa sem quebrar as outras páginas',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;globalThis.fetch=async(path,...args)=>String(path)==='/api/sessions'?{ok:true,status:200,json:async()=>({unexpected:true})}:native(path,...args);let ui;
 try{ui=await mountPlatform();await openOrbitalArea(ui.host,'Agenda','Abrir Agenda');assert(ui.host.textContent.includes('resposta inválida'));globalThis.fetch=native;await clickButton(ui.host,'Tentar novamente');assert(!ui.host.textContent.includes('resposta inválida'));await clickButton(ui.host,'Início');assert(ui.host.querySelector('.orbital-home'));}finally{globalThis.fetch=native;if(ui)await ui.close();}
});
test('Pedido de autenticação sem resposta libera a interface e permite verificar novamente',async()=>{
 sessionStorage.clear();const native=globalThis.fetch,nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===15000?15:ms,...args);globalThis.fetch=async(path,...args)=>String(path)==='/api/auth/session'?new Promise(()=>{}):native(path,...args);let ui;
 try{ui=await mountPlatform();await clickButton(ui.host,'Entrar ou criar conta');assert(ui.host.textContent.includes('demorou demais'));globalThis.fetch=native;await clickButton(ui.host,'Verificar novamente');assert(ui.host.textContent.includes('@teste_simulado'));}finally{globalThis.fetch=native;globalThis.setTimeout=nativeTimeout;if(ui)await ui.close();}
});
test('Focos repetidos compartilham a consulta de autenticação que já está em andamento',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;let ui,resolveAuth,count=0;
 try{ui=await mountPlatform();globalThis.fetch=async(path,...args)=>String(path)==='/api/auth/session'?(count++,new Promise(resolve=>{resolveAuth=resolve;})):native(path,...args);
  const {act}=await import('./helpers/platform-dom.mjs');await act(async()=>{for(let i=0;i<5;i++)window.dispatchEvent(new Event('focus'));});assert.equal(count,1);await act(async()=>resolveAuth({ok:true,status:200,json:async()=>({user:null})}));
 }finally{globalThis.fetch=native;if(resolveAuth)resolveAuth({ok:true,status:200,json:async()=>({user:null})});if(ui)await ui.close();}
});
test('Uma consulta antiga da agenda não remove a sessão criada enquanto ela estava em andamento',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;let ui,resolveList;
 try{ui=await mountPlatform();await openOrbitalArea(ui.host,'Agenda','Abrir Agenda');await clickButton(ui.host,'Nova sessão');
  globalThis.fetch=async(path,options)=>{if(String(path)==='/api/sessions'){if(options?.method==='POST'){const body=JSON.parse(options.body),now=new Date().toISOString();return {ok:true,status:201,json:async()=>({...body,id:'qa-session',createdAt:now,updatedAt:now})};}return new Promise(resolve=>{resolveList=resolve;});}return native(path,options);};
  const {act,waitFor}=await import('./helpers/platform-dom.mjs');await act(async()=>window.dispatchEvent(new Event('focus')));const form=ui.host.querySelector('.player-dialog[open] form');form.querySelector('[name=title]').value='Sessão criada durante a consulta';await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await waitFor(()=>!ui.host.querySelector('.player-dialog[open]'));
  await act(async()=>resolveList({ok:true,status:200,json:async()=>[]}));assert([...ui.host.querySelectorAll('.session-card h3')].some(h=>h.textContent==='Sessão criada durante a consulta'));
 }finally{globalThis.fetch=native;if(resolveList)resolveList({ok:true,status:200,json:async()=>[]});if(ui)await ui.close();}
});
test('PDF local continua acessível quando o catálogo remoto está indisponível',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;let ui;
 globalThis.fetch=async(path,...args)=>String(path)==='/api/library'?{ok:false,status:503,json:async()=>({error:'Serviço indisponível'})}:native(path,...args);
 try{ui=await mountPlatform();await openOrbitalArea(ui.host,'PDFs','Abrir biblioteca de PDFs');await clickButton(ui.host,'Adicionar PDF');const dialog=ui.host.querySelector('.modal[open]'),input=dialog.querySelector('input[type=file]');
  Object.defineProperty(input,'files',{configurable:true,value:[new File(['%PDF-1.4\nQA local'],'Referencia-local.pdf',{type:'application/pdf'})]});const {act,waitFor}=await import('./helpers/platform-dom.mjs');await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));await clickButton(dialog,'Adicionar PDF');await waitFor(()=>!ui.host.querySelector('.modal[open]'));assert(ui.host.querySelector('.pdf-card'),'O erro remoto não deve ocultar o PDF local.');assert(ui.host.textContent.includes('Referencia-local'));
 }finally{globalThis.fetch=native;if(ui)await ui.close();}
});
test('Resposta inicial atrasada não descarta PDF enviado durante o carregamento',async()=>{
 sessionStorage.clear();const native=globalThis.fetch;let ui,resolveCatalog;globalThis.fetch=async(path,...args)=>String(path)==='/api/library'?new Promise(resolve=>{resolveCatalog=resolve;}):native(path,...args);
 try{ui=await mountPlatform();await openOrbitalArea(ui.host,'PDFs','Abrir biblioteca de PDFs');await clickButton(ui.host,'Adicionar PDF');const dialog=ui.host.querySelector('.modal[open]'),input=dialog.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[new File(['%PDF-1.4\nQA'],'Arquivo-durante-espera.pdf',{type:'application/pdf'})]});const {act,waitFor}=await import('./helpers/platform-dom.mjs');await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));await clickButton(dialog,'Adicionar PDF');await waitFor(()=>!ui.host.querySelector('.modal[open]'));await act(async()=>resolveCatalog({ok:true,status:200,json:async()=>[]}));assert.equal(ui.host.querySelectorAll('.pdf-card').length,1);assert(ui.host.textContent.includes('Arquivo-durante-espera'));
 }finally{globalThis.fetch=native;if(resolveCatalog)resolveCatalog({ok:true,status:200,json:async()=>[]});if(ui)await ui.close();}
});
