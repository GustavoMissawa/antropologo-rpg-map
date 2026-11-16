import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDiceSet,parseSheetSystem,availableDice,defaultDieSides} from '../lib/dice-set.ts';
import {compileDice,validateDice,rollDice} from '../lib/dice.ts';
import {makeRulebook,makeSheet,makeBlock,bindSheetToRulebook,syncSheetSystem,withRulebookSheetTemplate,characterFromRulebook,parseSheet,serializeRulebook,parseRulebook} from '../lib/model.ts';
import {presetFormula,identifyRollPreset,insertRollDie} from '../lib/roll-editor.ts';
const config=(sides=[6,14])=>parseDiceSet({version:1,dice:sides.map(n=>({id:'d'+n,kind:'numeric',name:n===14?'Destino':'d'+n,sides:n}))});

test('Catálogos são individuais, extensíveis e clonados sem compartilhar dados entre sistemas',()=>{
 const a={...makeRulebook('Um'),dice:config()},b={...makeRulebook('Outro'),dice:config([3,10])};
 const sheet=bindSheetToRulebook(makeSheet('Astra',''),a);sheet.system.dice.dice[0].name='Mudança local';
 assert.equal(a.dice.dice[0].name,'d6');assert.deepEqual(availableDice(b.dice).map(d=>d.sides),[3,10]);
 assert.equal(defaultDieSides(a.dice),6);assert.equal(defaultDieSides(config([14,20])),20);assert.equal(defaultDieSides(),20);
});
test('Todas as rolagens validam os tipos antes de gerar resultados, inclusive grupos e quantidades dependentes',()=>{
 const set=config();assert.deepEqual(compileDice('(@pool)d14 + 2d6').diceSides,[14,6]);
 let calls=0;assert.throws(()=>rollDice('2d6 + 1d20',{},()=>{calls++;return 1;},set),/d20 não está disponível/);assert.equal(calls,0);
 assert.throws(()=>validateDice('(@pool)d20',{pool:3},set),/d20/);
 assert.doesNotThrow(()=>validateDice('(@pool)d14 + 1d6',{pool:3},set));
 const result=rollDice('(@pool)d14 + 2d6 + @bonus',{pool:3,bonus:4},s=>s,set);assert.equal(result.total,58);assert.deepEqual(result.groups.map(g=>[g.label,g.results.length]),[['Destino',3],['d6',2]]);
 assert.equal(rollDice('d14',{},()=>14).total,14);assert.doesNotThrow(()=>validateDice('1d999'));
});
test('Presets e inserção no cursor usam os dados disponíveis sem reescrever fórmulas existentes',()=>{
 const formula=presetFormula('modifier',14);assert.equal(formula,'1d14 + @modificador');assert.equal(identifyRollPreset(formula,'composite',14),'modifier');assert.equal(identifyRollPreset('1d20 + @valor','number',14),'custom');
 assert.deepEqual(insertRollDie('1d6 + ',14),{formula:'1d6 + 1d14',caret:10});assert.equal(insertRollDie('1d6 + 3',14,0,3).formula,'1d14 + 3');
});
test('Fichas v9 levam o catálogo consigo e continuam rolando sem o conjunto aberto',()=>{
 const book={...makeRulebook('Destino'),dice:config()},sheet=bindSheetToRulebook(makeSheet('Astra','Guss'),book),b=makeBlock('attributes');
 b.fields=[{id:'f',label:'Força',type:'number',value:3,row:0,rowSize:1,roll:{formula:'1d14 + @valor',variables:[]}}];b.color='#7828c8';sheet.blocks=[b];sheet.rolls=[{id:'r',name:'Extra',formula:'2d6',variables:[]}];
 const before=JSON.stringify(sheet),loaded=parseSheet(JSON.parse(before));assert.equal(loaded.version,13);assert.deepEqual(loaded.system,sheet.system);assert.equal(loaded.blocks[0].color,'#7828c8');assert.equal(loaded.blocks[0].fields[0].row,0);assert.equal(loaded.blocks[0].fields[0].roll.formula,'1d14 + @valor');
 assert.equal(rollDice('d14',{},()=>14,loaded.system.dice).groups[0].label,'Destino');assert.equal(syncSheetSystem(loaded,[]),loaded);assert.equal(JSON.stringify(sheet),before);
});
test('O pacote .regras restaura o catálogo e religa o modelo ao novo ID sem compartilhar personagens',()=>{
 const book=withRulebookSheetTemplate({...makeRulebook('Sistema'),dice:config()},makeSheet('Modelo',''));
 const loaded=parseRulebook(JSON.parse(serializeRulebook(book))),character=characterFromRulebook(loaded,'Astra');assert.deepEqual(loaded.dice,book.dice);assert.notEqual(loaded.id,book.id);assert.equal(loaded.sheetTemplate.system.id,loaded.id);assert.equal(character.system.id,loaded.id);
 character.system.dice.dice[0].name='Alterado';assert.equal(loaded.dice.dice[0].name,'d6');assert.equal(loaded.sheetTemplate.system.dice.dice[0].name,'d6');
 const modified={...loaded,dice:config([3])},updated=syncSheetSystem(character,[modified]);assert.deepEqual(updated.system.dice,modified.dice);assert.equal(updated.blocks,character.blocks);assert.equal(character.system.dice.dice[0].sides,6);
});
test('Sistemas e fichas antigos não exigem catálogo nem perdem fórmulas',()=>{
 const book=makeRulebook('Legado'),sheet=makeSheet('Legado','');sheet.version=8;sheet.rolls=[{id:'r',name:'Teste antigo',formula:'d14',variables:[]}];
 const loaded=parseSheet(sheet),rules=parseRulebook(JSON.parse(serializeRulebook(book)));assert.equal(loaded.system,undefined);assert.equal(rules.dice,undefined);assert.equal(loaded.rolls[0].formula,'d14');assert.equal(availableDice().length,7);
});
test('Importações recusam catálogos inválidos e tipos futuros sem destruir o conteúdo anterior',()=>{
 const valid=config(),before=JSON.stringify(valid);
 for(const raw of [null,{}, {...valid,version:6},{...valid,dice:[]},{...valid,dice:Array(25).fill(valid.dice[0])}])assert.throws(()=>parseDiceSet(raw));
 for(const mutate of [d=>d.sides=1,d=>d.sides=1001,d=>d.sides=3.5,d=>d.name='',d=>d.kind='symbols',d=>d.id='bad id']){const raw=structuredClone(valid);mutate(raw.dice[0]);assert.throws(()=>parseDiceSet(raw));}
 assert.throws(()=>parseDiceSet({...valid,dice:[valid.dice[0],{...valid.dice[1],sides:6}]}));assert.throws(()=>parseSheetSystem({id:'x',name:'Sistema',dice:{}}));assert.throws(()=>parseRulebook({...makeRulebook('Inválido'),dice:{}}));assert.throws(()=>parseSheet({...makeSheet('Inválido',''),system:{id:'x',name:'Teste',dice:{}}}));assert.equal(JSON.stringify(valid),before);
});
