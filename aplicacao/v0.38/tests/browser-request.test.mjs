import test from 'node:test';import assert from 'node:assert/strict';
import {requestJson,ApiError} from '../lib/browser-request.ts';
import {playerResponse,sessionsResponse,pdfsResponse,mergePdfCatalog} from '../lib/api-responses.ts';
const json=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('Leitura pode repetir uma falha transitória uma vez; mutações nunca são reenviadas',async()=>{
 const native=globalThis.fetch;try{let count=0;globalThis.fetch=async()=>{if(!count++)throw new TypeError('Rede interrompida');return json({ok:true});};assert.deepEqual(await requestJson('/read'),{ok:true});assert.equal(count,2);
 for(const method of ['POST','PUT','DELETE']){count=0;globalThis.fetch=async()=>{count++;throw new TypeError('Rede interrompida');};await assert.rejects(requestJson('/write',{method,value:{title:'Uma vez'}}),e=>e instanceof ApiError&&e.reason==='network');assert.equal(count,1);}
 count=0;globalThis.fetch=async()=>{count++;return json({error:'Aguarde'},429);};await assert.rejects(requestJson('/limit'),e=>e.status===429);assert.equal(count,1);
 }finally{globalThis.fetch=native;}
});
test('Gateway HTML recebe mensagem clara, JSON inválido não vaza erro técnico e status 401 é preservado',async()=>{
 const native=globalThis.fetch;try{let count=0;globalThis.fetch=async()=>count++?json([1]):{ok:false,status:503,json:async()=>{throw new SyntaxError('HTML');}};assert.deepEqual(await requestJson('/read'),[1]);assert.equal(count,2);
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('Unexpected token <');}});await assert.rejects(requestJson('/invalid'),e=>e.reason==='invalid'&&!e.message.includes('Unexpected'));
 globalThis.fetch=async()=>json({error:'Entre para continuar.'},401);await assert.rejects(requestJson('/private'),e=>e.status===401&&e.message==='Entre para continuar.');
 }finally{globalThis.fetch=native;}
});
test('Pedido e leitura do corpo pendurados têm prazo total, mesmo se fetch ignorar o abort',async()=>{
 const native=globalThis.fetch;try{for(const body of [false,true]){let signal;globalThis.fetch=async(_path,options)=>{signal=options.signal;return body?{ok:true,status:200,json:()=>new Promise(()=>{})}:new Promise(()=>{});};await assert.rejects(requestJson('/slow',{timeoutMs:15}),e=>e.reason==='timeout');assert.equal(signal.aborted,true);}}finally{globalThis.fetch=native;}
});
test('Concluir o pedido cancela seu timer sem abortar uma resposta já entregue',async()=>{
 const native=globalThis.fetch;try{let signal;globalThis.fetch=async(_path,options)=>{signal=options.signal;return json({ok:true});};await requestJson('/fast',{timeoutMs:15});await new Promise(r=>setTimeout(r,30));assert.equal(signal.aborted,false);}finally{globalThis.fetch=native;}
});
test('Respostas inválidas de perfil, agenda e PDFs são recusadas antes de chegarem à interface',()=>{
 assert.deepEqual(playerResponse({user:null}),{user:null});assert.deepEqual(sessionsResponse([]),[]);assert.deepEqual(pdfsResponse([]),[]);
 for(const data of [{},null,{user:{handle:22,expiresAt:Infinity}}])assert.throws(()=>playerResponse(data));
 for(const data of [{},null,[{id:'x',createdAt:'agora'}]])assert.throws(()=>sessionsResponse(data));
 for(const data of [{},null,[{id:'x'}]])assert.throws(()=>pdfsResponse(data));
 const pdf={id:'x',title:'PDF',filename:'x.pdf',category:'Manuais',description:'',createdAt:new Date().toISOString(),size:200,url:'javascript:alert(1)'};assert.throws(()=>pdfsResponse([pdf]));assert.deepEqual(pdfsResponse([{...pdf,url:'blob:teste'}]),[{...pdf,url:'blob:teste'}]);
});
test('Resposta atrasada do catálogo não remove PDFs adicionados pelo usuário durante o carregamento',()=>{
 const local={id:'new',url:'blob:novo'},remote={id:'old',url:'/api/library/old'};assert.deepEqual(mergePdfCatalog([],[local]),[local]);assert.deepEqual(mergePdfCatalog([remote,{...local,url:'/server/new'}],[local]),[local,remote]);
});
test('Timeout de mutação alerta para possível conclusão no servidor e não repete a operação',async()=>{
 const native=globalThis.fetch;try{let count=0;globalThis.fetch=()=>{count++;return new Promise(()=>{});};await assert.rejects(requestJson('/create',{method:'POST',value:{title:'Temporário'},timeoutMs:15}),e=>e.reason==='timeout'&&e.message.includes('pode ter sido concluída'));assert.equal(count,1);}finally{globalThis.fetch=native;}
});
