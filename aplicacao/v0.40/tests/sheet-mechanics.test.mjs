import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDice,rollDice,randomDie } from '../lib/dice.ts';
import { createFieldResolver,numericOptions } from '../lib/sheet-engine.ts';
import { makeSheet,makeBlock,parseSheet,copyBlock } from '../lib/model.ts';

function fixture(){const sheet=makeSheet('Astra','Guss');const a=makeBlock('attributes'),b=makeBlock('skills');sheet.tabs.push({id:'combat',title:'Combate'});b.tabId='combat';a.fields=[{id:'dex',label:'Destreza',type:'composite',value:16,composite:{mode:'ability',modifier:0}},{id:'focus',label:'Foco',type:'number',value:10}];b.fields=[{id:'stealth',label:'Furtividade',type:'calculated',value:'',dependency:{sourceId:'focus',part:'value',offset:0}},{id:'initiative',label:'Iniciativa',type:'calculated',value:'',dependency:{sourceId:'dex',part:'modifier',offset:2}},{id:'chain',label:'Cadeia',type:'calculated',value:'',dependency:{sourceId:'initiative',part:'value',offset:-1}}];sheet.blocks=[a,b];sheet.rolls=[{id:'roll',name:'Teste',formula:'1d20 + @furtividade + @dex_mod',variables:[{name:'furtividade',fieldId:'stealth',part:'value'},{name:'dex_mod',fieldId:'dex',part:'modifier'}]}];return sheet;}
test('Dados respeitam precedência, parênteses, sinais e todos os valores individuais',()=>{
 const values=[2,5,7];let i=0;const result=rollDice('(2d6 + @bonus) * 2 - d8 / 2',{bonus:3},()=>values[i++]);assert.equal(result.total,16.5);assert.deepEqual(result.groups,[{notation:'2d6',results:[2,5],total:7},{notation:'1d8',results:[7],total:7}]);assert.deepEqual(result.variables,[{name:'bonus',value:3}]);assert.equal(rollDice('-d20 + +2.5',{},()=>1).total,1.5);assert.equal(rollDice('D100',{},s=>s).total,100);
});
test('Fórmulas recusam código, dados excessivos, referências ausentes e cálculos inválidos',()=>{
 for(const f of ['', 'alert(1)','1;2','Math.random()','@campo.x','1d1','0d6','101d6','1d1001','60d6 + 41d8','('.repeat(30)+'1'+')'.repeat(30),'1d6 +','2d6 2','1'.repeat(501)])assert.throws(()=>compileDice(f),f);
 for(const f of ['1/0','1/(2-2)','1000000000000*2','1d6 + @missing'])assert.throws(()=>rollDice(f,{},()=>1));
 assert.throws(()=>rollDice('1d6',{},()=>0));assert.throws(()=>rollDice('1d6',{},()=>7));assert.throws(()=>rollDice('@constructor'));assert.throws(()=>rollDice('@x',{x:Infinity}));
});
test('Aleatoriedade respeita limites e a notação aceita quantidades arbitrárias permitidas',()=>{
 assert.equal(rollDice('100d2',{},()=>1).total,100);assert.equal(rollDice('100d2',{},s=>s).total,200);for(const sides of [2,4,6,20,100,1000])for(let i=0;i<30;i++){const n=randomDie(sides);assert(Number.isInteger(n)&&n>=1&&n<=sides);}
});
test('Campos por fórmula são limitados e subtração aceita o sinal usado na interface',()=>{
 assert.equal(rollDice(' 1d20 − 2 ',{},()=>10).total,8);assert.throws(()=>compileDice(Array.from({length:21},(_,i)=>'@campo'+i).join(' + ')),/20 campos/);for(const sides of [0,1,1001,NaN,Infinity,2.5])assert.throws(()=>randomDie(sides));
});
test('Campos dependentes copiam, somam, subtraem e propagam mudanças entre abas',()=>{
 const s=fixture();let r=createFieldResolver(s);assert.equal(r('stealth').value,10);assert.equal(r('initiative').value,5);assert.equal(r('chain').value,4);s.blocks[0].fields[0].value=18;s.blocks[0].fields[1].value=12;r=createFieldResolver(s);assert.equal(r('stealth').value,12);assert.equal(r('initiative').value,6);assert.equal(r('chain').value,5);
});
test('Compostos têm modificador manual ou automático e arredondam negativos para baixo',()=>{
 const s=fixture(),f=s.blocks[0].fields[0];assert.equal(createFieldResolver(s)('dex','modifier').value,3);f.value=9;assert.equal(createFieldResolver(s)('dex','modifier').value,-1);f.value=1;assert.equal(createFieldResolver(s)('dex','modifier').value,-5);f.composite={mode:'manual',modifier:7};assert.equal(createFieldResolver(s)('dex','modifier').value,7);assert(numericOptions(s).some(o=>o.fieldId==='dex'&&o.part==='modifier'));
});
test('Ciclos, origens removidas, valores vazios e tipos incompatíveis são erros explícitos',()=>{
 let s=fixture();s.blocks[1].fields[0].dependency.sourceId='stealth';assert.match(createFieldResolver(s)('stealth').error,/circular/);s=fixture();s.blocks[1].fields[1].dependency.sourceId='chain';s.blocks[1].fields[1].dependency.part='value';assert.match(createFieldResolver(s)('chain').error,/circular/);s=fixture();s.blocks[0].fields.pop();assert.match(createFieldResolver(s)('stealth').error,/removido/);s=fixture();s.blocks[0].fields[1].value='';assert.match(createFieldResolver(s)('stealth').error,/Preencha/);s.blocks[0].fields[1].type='text';assert.match(createFieldResolver(s)('stealth').error,/numérico/);assert.match(createFieldResolver(s)('focus','modifier').error,/numérico/);
});
test('Exportação e importação remapeiam IDs sem quebrar dependências e rolagens',()=>{
 const s=fixture(),json=JSON.stringify(s),loaded=parseSheet(JSON.parse(json)),all=loaded.blocks.flatMap(b=>b.fields),dex=all.find(f=>f.label==='Destreza'),stealth=all.find(f=>f.label==='Furtividade'),initiative=all.find(f=>f.label==='Iniciativa');assert.notEqual(dex.id,'dex');assert.equal(initiative.dependency.sourceId,dex.id);assert.equal(loaded.rolls[0].variables[0].fieldId,stealth.id);assert.equal(loaded.rolls[0].variables[1].fieldId,dex.id);const resolve=createFieldResolver(loaded),vars=Object.fromEntries(loaded.rolls[0].variables.map(v=>[v.name,resolve(v.fieldId,v.part).value]));assert.equal(rollDice(loaded.rolls[0].formula,vars,()=>20).total,33);assert.equal(JSON.stringify(s),json);
 const twice=parseSheet(JSON.parse(JSON.stringify(loaded)));assert.equal(createFieldResolver(twice)(twice.blocks[1].fields[2].id).value,4);
});
test('Rascunhos com vínculos removidos continuam exportáveis e sinalizam o erro ao carregar',()=>{
 const s=fixture();s.blocks[0].fields.pop();const loaded=parseSheet(JSON.parse(JSON.stringify(s)));assert.match(createFieldResolver(loaded)(loaded.blocks[1].fields[0].id).error,/removido/);
});
test('Duplicação remapeia vínculos internos e preserva referências externas sem compartilhar configuração',()=>{
 const s=fixture(),b=s.blocks[1],copy=copyBlock(b);assert.equal(copy.fields[2].dependency.sourceId,copy.fields[1].id);assert.equal(copy.fields[1].dependency.sourceId,'dex');s.blocks.push(copy);assert.equal(createFieldResolver(s)(copy.fields[2].id).value,4);copy.fields[1].dependency.offset=9;assert.equal(b.fields[1].dependency.offset,2);
});
test('v1 e v2 migram sem perder os campos e ganham a coleção de rolagens',()=>{
 for(const version of [1,2]){const s=makeSheet('Legado','');s.blocks=[makeBlock('notes')];const loaded=parseSheet({...s,version});assert.equal(loaded.version,13);assert.deepEqual(loaded.rolls,[]);assert.equal(loaded.blocks[0].fields[0].type,'longtext');}
});
test('Configurações malformadas e IDs ambíguos são recusados sem executar fórmulas importadas',()=>{
 const s=fixture();for(const transform of [s=>{s.blocks[0].fields[0].composite.mode='eval';},s=>{s.blocks[1].fields[0].dependency.offset=Infinity;},s=>{s.blocks[0].fields[1].id='dex';},s=>{s.rolls[0].variables[0].part='script';},s=>{s.rolls[0].variables.push(s.rolls[0].variables[0]);},s=>{s.rolls=Array(51).fill(s.rolls[0]);}]){const next=structuredClone(s);transform(next);assert.throws(()=>parseSheet(next));}
 const imported=parseSheet({...s,rolls:[{...s.rolls[0],formula:'alert(1)'}]});assert.throws(()=>rollDice(imported.rolls[0].formula));
});
