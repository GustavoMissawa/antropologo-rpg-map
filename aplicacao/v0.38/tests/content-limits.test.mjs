import {sixMiBTheme} from './helpers/theme-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONTENT_QUOTAS} from '../lib/content-limits.ts';
import {makeRulebook,serializeRulebook,parseRulebook,makeSheet} from '../lib/model.ts';
import {readContentFile,serializeExportContent} from '../lib/content-file.ts';
import {embedSuperPng,extractSuperPng,MAX_SUPER_PNG_BYTES} from '../lib/super-png.ts';
import {MAX_RULE_DOCUMENT_BYTES} from '../lib/rule-document.ts';
import {MAX_SHEET_IMAGE_BYTES} from '../lib/sheet-visual.ts';
const cover=readFileSync(new URL('./fixtures/system-logo.png',import.meta.url)),bytes=s=>new TextEncoder().encode(s).length;
function nearBook(target,character='x'){
 const b={...makeRulebook('Limite — teste temporário'),visuals:sixMiBTheme()};b.chapters=Array.from({length:300},()=>({id:crypto.randomUUID(),title:'Capítulo',content:'',status:'draft',children:[]}));
 let remaining=target-bytes(serializeRulebook(b));const cost=bytes(JSON.stringify(character))-2;
 for(const chapter of b.chapters){const count=Math.min(50000,Math.floor(remaining/cost));chapter.content=character.repeat(count);remaining-=count*cost;if(remaining&&remaining<cost&&chapter.content.length<50000){chapter.content+='x'.repeat(remaining);remaining=0;}}
 assert.equal(remaining,0);assert.equal(bytes(serializeRulebook(b)),target);return b;
}
test('Sistemas aceitam JSON próximo de 20 MiB, incluindo texto UTF-8 e reexportação',async()=>{
 for(const char of ['x','á']){const b=nearBook(CONTENT_QUOTAS.ruleset-128,char),json=serializeExportContent(b),r=await readContentFile(new File([json],'limite.regras'));assert.equal(r.content.chapters.map(c=>c.content).join(''),b.chapters.map(c=>c.content).join(''));assert.doesNotThrow(()=>serializeExportContent(r.content));}
});
test('Acima de 20 MiB há rejeição sem alterar o sistema ou relaxar limites independentes',async()=>{
 const b=nearBook(CONTENT_QUOTAS.ruleset-128);b.description+='x'.repeat(129);const original=JSON.stringify(b);assert.throws(()=>serializeRulebook(b),/20 MiB/);assert.throws(()=>parseRulebook(b),/20 MiB/);assert.equal(JSON.stringify(b),original);
 await assert.rejects(readContentFile(new File([' '.repeat(CONTENT_QUOTAS.ruleset+1)],'grande.json')),/20 MiB/);
 assert.equal(CONTENT_QUOTAS.character,5*1024*1024);assert.equal(MAX_SHEET_IMAGE_BYTES,768*1024);assert.equal(MAX_RULE_DOCUMENT_BYTES,250000);
});
test('Super PNG aceita sistema próximo da cota com escape duplo e mantém integridade',async()=>{
 const b=nearBook(CONTENT_QUOTAS.ruleset-128,'"'),png=embedSuperPng(cover,'ruleset',b.name,b);assert(png.length<30*1024*1024);assert(png.length<MAX_SUPER_PNG_BYTES);assert.equal(extractSuperPng(png).integrity,'valid');const r=await readContentFile(new File([png],'limite.png'));assert.deepEqual(r.content.chapters.map(c=>c.content),b.chapters.map(c=>c.content));
 const damaged=png.slice();damaged[damaged.length-25]^=1;assert.throws(()=>extractSuperPng(damaged),/corrompido/);
});
test('Ficha avulsa continua em 5 MiB e a leitura recusa arquivos gigantes antes de alocar',async()=>{
 const s=makeSheet('Ficha',''),json=JSON.stringify(s);await assert.rejects(readContentFile(new File([json,' '.repeat(CONTENT_QUOTAS.character)],'ficha.json')),/5 MiB/);
 await assert.rejects(readContentFile({size:MAX_SUPER_PNG_BYTES+1,name:'gigante.png',arrayBuffer(){throw Error('Não deve ler');}}),/30 MiB/);
});
