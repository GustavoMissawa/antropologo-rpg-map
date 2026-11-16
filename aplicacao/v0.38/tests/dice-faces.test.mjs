import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDiceSet,parseDieFace,dieFaceLabel} from '../lib/dice-set.ts';
import {rollDice} from '../lib/dice.ts';
import {makeSheet,makeRulebook,makeBlock,withRulebookSheetTemplate,characterFromRulebook,serializeRulebook,parseRulebook,parseSheet} from '../lib/model.ts';
const catalog=()=>parseDiceSet({version:2,dice:[{id:'d6',kind:'numeric',name:'Destino',sides:6,faces:{1:{kind:'text',text:'Falha'},5:{kind:'symbol',text:'✦'},6:{kind:'icon',icon:'skull',label:'Crítico'}}}]});
test('Cada face muda só sua representação, mantendo índice, soma, variáveis e probabilidade do dado',()=>{
 const dice=catalog(),results=[1,2,3,4,5,6];let i=0;const r=rollDice('6d6 + @bonus',{bonus:3},()=>results[i++],dice);
 assert.deepEqual(r.groups[0].results,results);assert.equal(r.groups[0].total,21);assert.equal(r.total,24);assert.deepEqual(r.groups[0].representations,[{kind:'text',text:'Falha'},null,null,null,{kind:'symbol',text:'✦'},{kind:'icon',icon:'skull',label:'Crítico'}]);assert.equal(dieFaceLabel(r.groups[0].representations[5]),'Crítico');
 assert.equal(rollDice('d6',{},()=>6).groups[0].representations,undefined);
});
test('O histórico guarda uma cópia da representação sorteada e não muda quando as regras são editadas',()=>{
 const dice=catalog(),r=rollDice('d6',{},()=>6,dice);dice.dice[0].faces[6].label='Mudança posterior';assert.equal(r.groups[0].representations[0].label,'Crítico');
});
test('Faces viajam nos pacotes e fichas sem compartilhar o modelo ou outros sistemas',()=>{
 const sheet=makeSheet('Modelo','');sheet.blocks=[makeBlock('custom')];sheet.blocks[0].color='#7828c8';sheet.blocks[0].layout={x:100,y:80,width:576};
 const book=withRulebookSheetTemplate({...makeRulebook('Dado próprio'),dice:catalog()},sheet),copy=parseRulebook(JSON.parse(serializeRulebook(book))),character=characterFromRulebook(copy,'Astra'),saved=parseSheet(JSON.parse(JSON.stringify(character)));
 assert.equal(saved.version,13);assert.deepEqual(saved.system.dice.dice[0].faces,book.dice.dice[0].faces);assert.deepEqual(saved.blocks[0].layout,sheet.blocks[0].layout);assert.equal(saved.blocks[0].color,'#7828c8');
 saved.system.dice.dice[0].faces[6].icon='heart';assert.equal(copy.dice.dice[0].faces[6].icon,'skull');assert.equal(copy.sheetTemplate.system.dice.dice[0].faces[6].icon,'skull');
});
test('Catálogos v1 e fichas v9 permanecem válidos sem exigir uma face por índice',()=>{
 const dice=parseDiceSet({version:1,dice:[{id:'d6',name:'d6',kind:'numeric',sides:6}]}),sheet=makeSheet('Legado','');sheet.version=9;sheet.system={id:'old',name:'Legado',dice:{...dice,version:1}};const copy=parseSheet(sheet);assert.equal(copy.version,13);assert.equal(copy.system.dice.version,5);assert.equal(copy.system.dice.dice[0].faces,undefined);assert.equal(rollDice('d6',{},()=>6,copy.system.dice).groups[0].results[0],6);
});
test('Faces inválidas, índices fora do dado e conteúdo ativo são rejeitados ou tratados como texto',()=>{
 for(const raw of [null,{}, {kind:'text',text:''},{kind:'symbol',text:'a'.repeat(33)},{kind:'text',text:'a'.repeat(81)},{kind:'icon',icon:'javascript',label:'X'},{kind:'icon',icon:'skull',label:''},{kind:'html',text:'<script>'}])assert.throws(()=>parseDieFace(raw));
 assert.deepEqual(parseDieFace({kind:'text',text:'<img src=x onerror=alert(1)>'}),{kind:'text',text:'<img src=x onerror=alert(1)>'});
 for(const faces of [null,[],{'0':{kind:'text',text:'Zero'}},{'7':{kind:'text',text:'Fora'}},{'01':{kind:'text',text:'Alias'}}]){const dice=catalog();dice.dice[0].faces=faces;assert.throws(()=>parseDiceSet(dice));}
 const raw=catalog(),before=JSON.stringify(raw);assert.deepEqual(parseDiceSet(raw),raw);assert.equal(JSON.stringify(raw),before);
});
