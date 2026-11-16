import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileDice,displayRollFormula,rollDice } from '../lib/dice.ts';
import { resolveRollVariables } from '../lib/sheet-engine.ts';
import { copyBlock,makeSheet,makeBlock,parseSheet } from '../lib/model.ts';
function fixture(){const sheet=makeSheet('Astra','');const block=makeBlock('attributes');block.fields=[{id:'skill',label:'Furtividade',type:'number',value:3,roll:{formula:'1d20 + @valor',variables:[]}},{id:'dice',label:'Rajada',type:'calculated',value:'',dependency:{sourceId:'skill',part:'value',offset:0},roll:{formula:'(@valor)d20',variables:[]}},{id:'dex',label:'Destreza',type:'composite',value:16,composite:{mode:'ability',modifier:0},roll:{formula:'1d20 + @modificador + @skill',variables:[{name:'skill',fieldId:'skill',part:'value'}]}}];sheet.blocks=[block];return sheet;}
function launch(sheet,id,die=()=>10){const f=sheet.blocks.flatMap(b=>b.fields).find(f=>f.id===id),names=compileDice(f.roll.formula).variables,values=resolveRollVariables(sheet,names,f.roll.variables,f.id);return {...rollDice(f.roll.formula,values,die),resolved:displayRollFormula(f.roll.formula,values)};}
test('O mesmo valor 3 pode somar a um d20 ou definir três d20, conforme programado',()=>{
 const s=fixture(),bonus=launch(s,'skill'),pool=launch(s,'dice');assert.equal(bonus.total,13);assert.equal(bonus.resolved,'1d20 + 3');assert.deepEqual(pool.groups,[{notation:'3d20',results:[10,10,10],total:30}]);assert.equal(pool.resolved,'3d20');s.blocks[0].fields[0].value=5;assert.equal(launch(s,'skill').total,15);assert.equal(launch(s,'dice').groups[0].results.length,5);
});
test('Campos compostos usam o modificador e combinam outros valores atualizados',()=>{
 const s=fixture();assert.equal(launch(s,'dex').total,16);s.blocks[0].fields[2].value=18;s.blocks[0].fields[0].value=7;assert.equal(launch(s,'dex').total,21);assert.equal(launch(s,'dex').resolved,'1d20 + 4 + 7');
});
test('Quantidades variáveis são limitadas em tempo de lançamento e nunca excedem 100 dados',()=>{
 for(const n of [0,-1,1.5,101,Infinity])assert.throws(()=>rollDice('(@n)d20',{n},()=>1));assert.equal(rollDice('(@n + 1)d6',{n:2},()=>6).total,18);assert.equal(rollDice('@n d20',{n:3},()=>1).total,3);let count=0;assert.throws(()=>rollDice('60d6 + (@n)d8',{n:41},()=>{count++;return 1;}),/100 dados/);assert.equal(count,60);assert.equal(rollDice('(@n)d2',{n:100},()=>2).total,200);
});
test('Cada grupo preserva os resultados individuais e o total da expressão inteira',()=>{
 const results=[2,4,7];let i=0;const r=rollDice('(@n)d6 + 1d8 + 3',{n:2},()=>results[i++]);assert.equal(r.total,16);assert.deepEqual(r.groups.map(g=>g.results),[[2,4],[7]]);assert.deepEqual(r.groups.map(g=>g.total),[6,7]);
});
test('Salvar e carregar v4 conserva rolagens de campos, vínculos e fórmulas de quantidade',()=>{
 const s={...fixture(),version:4},before=JSON.stringify(s),loaded=parseSheet(JSON.parse(before)),all=loaded.blocks[0].fields;assert.equal(loaded.version,13);assert.notEqual(all[0].id,'skill');assert.equal(all[1].dependency.sourceId,all[0].id);assert.equal(all[2].roll.variables[0].fieldId,all[0].id);assert.equal(launch(loaded,all[1].id).total,30);assert.equal(launch(loaded,all[2].id).total,16);assert.equal(JSON.stringify(s),before);const twice=parseSheet(JSON.parse(JSON.stringify(loaded)));assert.equal(launch(twice,twice.blocks[0].fields[1].id).total,30);
});
test('Duplicar um bloco isola configurações e remapeia os campos das suas rolagens',()=>{
 const s=fixture(),b=s.blocks[0],copy=copyBlock(b);s.blocks.push(copy);assert.equal(copy.fields[2].roll.variables[0].fieldId,copy.fields[0].id);copy.fields[0].value=8;assert.equal(launch(s,copy.fields[2].id).total,21);assert.equal(launch(s,'dex').total,16);copy.fields[2].roll.variables[0].name='other';assert.equal(b.fields[2].roll.variables[0].name,'skill');
});
test('Fichas v3 continuam com valores compostos, dependências e rolagens extras',()=>{
 const raw=JSON.parse(readFileSync(new URL('./fixtures/mechanics-v3.ab10',import.meta.url),'utf8')),loaded=parseSheet(raw);assert.equal(loaded.version,13);assert.equal(loaded.rolls.length,3);assert(loaded.blocks.flatMap(b=>b.fields).some(f=>f.composite?.mode==='ability'));assert(loaded.blocks.flatMap(b=>b.fields).some(f=>f.dependency));assert(loaded.blocks.every(b=>b.fields.every(f=>!f.roll)));
});
test('Configurações inválidas são recusadas e origens removidas aparecem ao lançar',()=>{
 const s=fixture();for(const roll of [null,{}, {formula:'',variables:[]},{formula:'1'.repeat(501),variables:[]},{formula:'1d20',variables:'invalid'},{formula:'1d20',variables:[{name:'bad.name',fieldId:'skill',part:'value'}]}]){const next=structuredClone(s);next.blocks[0].fields[0].roll=roll;assert.throws(()=>parseSheet(next));}s.blocks[0].fields.shift();assert.throws(()=>launch(s,'dex'),/removido/);assert.throws(()=>resolveRollVariables(s,['valor'],[]),/origem/);
});
