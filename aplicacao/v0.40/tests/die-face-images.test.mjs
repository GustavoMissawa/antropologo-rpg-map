import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validDieFaceImage,MAX_DIE_FACE_IMAGE_BYTES} from '../lib/die-face-image.ts';
import {parseDiceSet,parseDieFace,dieFaceLabel} from '../lib/dice-set.ts';
import {rollDice} from '../lib/dice.ts';
import {makeRulebook,makeSheet,withRulebookSheetTemplate,characterFromRulebook,serializeRulebook,parseRulebook,parseSheet} from '../lib/model.ts';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const face={kind:'image',src:png,label:'Símbolo do destino'},catalog=()=>parseDiceSet({version:3,dice:[{id:'destino',kind:'numeric',name:'Destino',sides:6,faces:{1:face,5:{kind:'symbol',text:'☀'},6:{kind:'icon',icon:'skull',label:'Crítico'}}}]});
test('Uma imagem representa somente a face sorteada; índices, totais e símbolos existentes permanecem iguais',()=>{
 const set=catalog(),results=[1,2,5,6];let i=0;const r=rollDice('4d6+3',{},()=>results[i++],set);assert.deepEqual(r.groups[0].results,results);assert.equal(r.total,17);assert.deepEqual(r.groups[0].representations,[face,null,{kind:'symbol',text:'☀'},{kind:'icon',icon:'skull',label:'Crítico'}]);assert.equal(dieFaceLabel(r.groups[0].representations[0]),'Símbolo do destino');set.dice[0].faces[1].label='Outra';assert.equal(r.groups[0].representations[0].label,face.label);
});
test('Imagens viajam no sistema, modelo e personagem; importar mantém o vínculo sem compartilhar mudanças',()=>{
 const b=withRulebookSheetTemplate({...makeRulebook('Imagens'),dice:catalog()},makeSheet('Modelo','')),loaded=parseRulebook(JSON.parse(serializeRulebook(b))),c=characterFromRulebook(loaded,'Astra'),s=parseSheet(JSON.parse(JSON.stringify(c)));assert.deepEqual(s.system.dice.dice[0].faces[1],face);assert.equal(rollDice('d6',{},()=>1,s.system.dice).groups[0].representations[0].src,png);s.system.dice.dice[0].faces[1].label='Alterada';assert.equal(loaded.dice.dice[0].faces[1].label,face.label);assert.equal(loaded.sheetTemplate.system.dice.dice[0].faces[1].label,face.label);
});
test('Imagens ativas, remotas, arquivos falsos e faces acima de 150 KB são recusados',()=>{
 assert(validDieFaceImage(png));assert.deepEqual(parseDieFace(face),face);
 for(const src of ['https://example.com/image.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJjZA==',png+'!', 'data:image/png;base64,'+Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n','binary'),Buffer.alloc(MAX_DIE_FACE_IMAGE_BYTES)]).toString('base64')]){assert(!validDieFaceImage(src));assert.throws(()=>parseDieFace({...face,src}));}
 assert.throws(()=>parseDieFace({...face,label:''}));assert.throws(()=>parseDieFace({...face,label:'x'.repeat(81)}));
});
test('A cota total de 20 MiB considera as imagens e a cópia de dados da ficha-modelo',()=>{
 const src='data:image/png;base64,'+Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n','binary'),Buffer.alloc(100*1024)]).toString('base64'),dice=parseDiceSet({version:3,dice:[{id:'d80',kind:'numeric',name:'Ilustrado',sides:80,faces:Object.fromEntries(Array.from({length:80},(_,i)=>[i+1,{...face,src}]))}]}),book={...makeRulebook('Cota'),dice};assert.doesNotThrow(()=>serializeRulebook(book));const before=JSON.stringify(book);assert.throws(()=>withRulebookSheetTemplate(book,makeSheet('Modelo','')),/cota de 20 MiB/);assert.equal(JSON.stringify(book),before);
});
test('Catálogos anteriores com números, texto e emoji continuam compatíveis sem imagens obrigatórias',()=>{
 for(const version of [1,2]){const set=parseDiceSet({version,dice:[{id:'d6',kind:'numeric',name:'d6',sides:6,faces:{6:{kind:'symbol',text:'🎲'}}}]});assert.equal(set.version,5);assert.equal(set.dice[0].faces[6].text,'🎲');assert.equal(rollDice('d6',{},()=>6,set).total,6);}
});
