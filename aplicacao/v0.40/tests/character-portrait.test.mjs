import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSheet,makeBlock,parseSheet,copySheet,makeRulebook,withRulebookSheetTemplate,characterFromRulebook} from '../lib/model.ts';
import {serializeExportContent,readContentFile} from '../lib/content-file.ts';
import {embedSuperPng} from '../lib/super-png.ts';
const cover=readFileSync(new URL('./fixtures/system-logo.png',import.meta.url));
const portrait='data:image/png;base64,'+cover.toString('base64');
test('Retrato oficial sobrevive ao JSON e ao Super PNG sem virar bloco',async()=>{
 const sheet={...makeSheet('Retrato oficial',''),portrait};
 for(const file of [new File([serializeExportContent(sheet)],'ficha.json'),new File([embedSuperPng(cover,'character',sheet.name,sheet)],'ficha.png')]){
  const {content}=await readContentFile(file);assert.equal(content.portrait,portrait);assert.deepEqual(content.blocks,[]);
 }
});
test('Substituir/remover retrato preserva blocos de imagem e fichas antigas',()=>{
 const sheet=makeSheet('Sem retrato',''),block=makeBlock('image');block.image={src:portrait,fit:'contain'};sheet.blocks=[block];
 assert.equal(parseSheet(sheet).portrait,undefined);
 const copy=copySheet({...sheet,portrait});copy.blocks=[];assert.equal(copy.portrait,portrait);assert.equal(sheet.blocks.length,1);
 const {portrait:removed,...without}=copy;assert.equal(parseSheet(without).portrait,undefined);assert.equal(removed,portrait);
});
test('Retrato recusa imagens remotas, SVG, conteúdo inválido e tamanho excessivo',()=>{
 for(const invalid of ['https://example.com/retrato.png','data:image/svg+xml;base64,PHN2Zz4=',portrait+'!',42,'data:image/png;base64,'+Buffer.concat([cover,Buffer.alloc(768*1024)]).toString('base64')]){
  const sheet={...makeSheet('Inválida',''),portrait:invalid},before=JSON.stringify(sheet);assert.throws(()=>parseSheet(sheet));assert.equal(JSON.stringify(sheet),before);
 }
});
test('Retrato da ficha-modelo viaja com o sistema e cópias continuam independentes',async()=>{
 const book=withRulebookSheetTemplate(makeRulebook('Sistema'),{...makeSheet('Modelo',''),portrait});
 const {content}=await readContentFile(new File([serializeExportContent(book)],'sistema.regras'));
 const character=characterFromRulebook(content,'Personagem');assert.equal(character.portrait,portrait);delete character.portrait;assert.equal(content.sheetTemplate.portrait,portrait);
});
