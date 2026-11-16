import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSheet,makeBlock,parseSheet,positionLayout,setPositionMode,GRID_SIZE,MAP_LIMIT,MAX_FIELD_DETAILS,copyBlock} from '../lib/model.ts';
import {compileDice,validateDice,rollDice,displayRollFormula} from '../lib/dice.ts';
import {insertRollField} from '../lib/roll-editor.ts';
import {resolveRollVariables} from '../lib/sheet-engine.ts';

test('Grade encaixa posição e largura, inclusive bordas e mínimo legível',()=>{
 assert.deepEqual(positionLayout({x:59,y:85,width:368},'grid'),{x:48,y:96,width:360});
 assert.deepEqual(positionLayout({x:59,y:85,width:368},'free'),{x:59,y:85,width:368});
 for(const l of [{x:-200,y:MAP_LIMIT+100,width:1},{x:MAP_LIMIT,y:0,width:1000},{x:0,y:1,width:300}]){const p=positionLayout(l,'grid');assert(Object.values(p).every(n=>n%GRID_SIZE===0));assert(p.x>=0&&p.y>=0&&p.x<=MAP_LIMIT&&p.y<=MAP_LIMIT);assert(p.width>=300&&p.width<=960);}
});
test('Alternar posicionamento alinha todas as abas sem perder dados e mantém posições ao voltar para Livre',()=>{
 const s=makeSheet('Astra','');s.tabs.push({id:'combat',title:'Combate'});s.blocks=[makeBlock('notes'),makeBlock('skills','combat')];s.blocks[1].layout={x:423,y:89,width:477};const json=JSON.stringify(s),grid=setPositionMode(s,'grid');assert.equal(JSON.stringify(s),json);assert.equal(grid.positionMode,'grid');assert(grid.blocks.every(b=>Object.values(b.layout).every(n=>n%24===0)));assert.deepEqual(grid.blocks[0].fields,s.blocks[0].fields);assert.deepEqual(setPositionMode(grid,'free').blocks,grid.blocks);
});
test('v5 preserva grade, detalhes e vínculos ao salvar/carregar e duplicar um bloco',()=>{
 const s=makeSheet('Astra','Guss'),b=makeBlock('attributes');s.blocks=[b];b.fields=[{id:'dex',label:'Destreza',type:'number',value:3,details:'Mover-se em silêncio.\nCusta 1 ação.',roll:{formula:'1d20 + @valor',variables:[]}},{id:'skill',label:'Furtividade',type:'calculated',value:'',details:'Usa Destreza.',dependency:{sourceId:'dex',part:'value',offset:2}}];const source=setPositionMode(s,'grid'),loaded=parseSheet(JSON.parse(JSON.stringify({...source,version:5})));assert.equal(loaded.version,13);assert.equal(loaded.positionMode,'grid');assert.deepEqual(loaded.blocks[0].layout,source.blocks[0].layout);assert.equal(loaded.blocks[0].fields[0].details,b.fields[0].details);assert.equal(loaded.blocks[0].fields[1].dependency.sourceId,loaded.blocks[0].fields[0].id);assert.equal(copyBlock(loaded.blocks[0]).fields[0].details,b.fields[0].details);assert.equal(loaded.blocks[0].fields[0].roll.formula,'1d20 + @valor');
});
test('v1 a v4 continuam legíveis sem exigir detalhes nem modo novo',()=>{
 for(const version of [1,2,3,4]){const s=makeSheet('Legado','');s.blocks=[makeBlock('notes')];delete s.positionMode;s.version=version;const loaded=parseSheet(s);assert.equal(loaded.positionMode,'free');assert.equal(loaded.version,13);assert.equal(loaded.blocks[0].fields[0].details,undefined);}
 const raw=JSON.parse(readFileSync(new URL('./fixtures/play-v4.ab10',import.meta.url),'utf8')),loaded=parseSheet(raw);assert(loaded.blocks.some(b=>b.fields.some(f=>f.roll)));assert.equal(loaded.positionMode,'free');
});
test('Importação recusa metadados incompatíveis e detalhes excessivos sem alterar a entrada',()=>{
 const s=makeSheet('Astra','');s.blocks=[makeBlock('notes')];for(const positionMode of [undefined,'auto',null,{}])assert.throws(()=>parseSheet({...s,positionMode}));
 for(const details of [null,42,{},'a'.repeat(MAX_FIELD_DETAILS+1)]){const input=structuredClone(s);input.blocks[0].fields[0].details=details;assert.throws(()=>parseSheet(input));}
 s.blocks[0].fields[0].details='a'.repeat(MAX_FIELD_DETAILS);assert.equal(parseSheet(s).blocks[0].fields[0].details.length,MAX_FIELD_DETAILS);
});
test('Validação não inventa resultados e aceita divisores aleatórios, mantendo proteção real contra zero',()=>{
 assert.doesNotThrow(()=>validateDice('1d20 / (1d6 - 1)'));
 const results=[10,3];let at=0;assert.equal(rollDice('1d20 / (1d6 - 1)',{},()=>results[at++]).total,5);
 assert.throws(()=>rollDice('1d20 / (1d6 - 1)',{},()=>1),/zero/);
 for(const formula of ['1d20 / (2-2)','1d20 / @zero','(@count)d6 + 60d6'])assert.throws(()=>validateDice(formula,{zero:0,count:41}));
 assert.doesNotThrow(()=>validateDice('(@count)d6 + 60d6',{count:40}));
});
test('Dados avulsos e campos aceitam operadores de teclado, símbolos e vírgula decimal igualmente',()=>{
 for(const formula of ['2 d 6 × 2 + 1,5','2d6 * 2 + 1.5'])assert.equal(rollDice(formula,{},()=>3).total,13.5);
 assert.equal(rollDice('(1D 20 − 3) ÷ 2',{},()=>13).total,5);
 assert.equal(rollDice('1d20 + @x',{x:3},()=>10).total,13);
 assert.equal(displayRollFormula('1d20 - @valor',{valor:-3}),'1d20 - (-3)');
 assert.equal(displayRollFormula('(@valor)d6 × 2',{valor:3}),'3d6 * 2');
 assert.throws(()=>compileDice('2,5d6'));assert.throws(()=>compileDice('1,2,3 + 1d20'));
});
test('Inserir campo respeita o cursor, substitui seleção e completa depois de operadores',()=>{
 const source={fieldId:'dex',part:'value',label:'Destreza'},empty={formula:'',variables:[]};
 assert.equal(insertRollField(empty,source).formula,'@destreza');
 assert.equal(insertRollField({...empty,formula:'1d20 + '},source).formula,'1d20 + @destreza');
 assert.equal(insertRollField({...empty,formula:'1d20 + 2'},source,7,8).formula,'1d20 + @destreza');
 const pool=insertRollField({...empty,formula:'()d6 + 2'},source,1,1);assert.equal(pool.formula,'(@destreza)d6 + 2');assert.deepEqual(pool.variables,[{name:'destreza',fieldId:'dex',part:'value'}]);assert.equal(pool.caret,10);
});
test('Inserções reutilizam vínculo, evitam colisões e usam os aliases do próprio campo',()=>{
 const source={fieldId:'dex',part:'value',label:'Destreza'},first=insertRollField({formula:'1d20',variables:[]},source),second=insertRollField(first,source);assert.equal(second.formula,'1d20 + @destreza + @destreza');assert.equal(second.variables.length,1);
 const other=insertRollField(first,{...source,fieldId:'other'});assert.match(other.formula,/@destreza_2/);assert.equal(other.variables.length,2);
 const self=insertRollField({formula:'1d20 + ',variables:[]},{fieldId:'dex',part:'modifier',label:'Destreza'},7,7,'dex');assert.equal(self.formula,'1d20 + @modificador');assert.deepEqual(self.variables,[]);
 const stale=insertRollField({formula:'1d20',variables:Array.from({length:20},(_,i)=>({name:'old'+i,fieldId:'old'+i,part:'value'}))},source);assert.equal(stale.variables.length,1);
});
test('Fórmulas de campo e extras usam valores atuais, incluindo vínculos depois de inserir ou importar',()=>{
 const sheet=makeSheet('Astra',''),b=makeBlock('attributes');b.fields=[{id:'dex',label:'Destreza',type:'composite',value:16,composite:{mode:'ability',modifier:0}}];sheet.blocks=[b];const roll=insertRollField({formula:'2d6 + ',variables:[]},{fieldId:'dex',part:'modifier',label:'Destreza'}),names=compileDice(roll.formula).variables;
 let values=resolveRollVariables(sheet,names,roll.variables);validateDice(roll.formula,values);assert.equal(rollDice(roll.formula,values,()=>3).total,9);b.fields[0].value=18;values=resolveRollVariables(sheet,names,roll.variables);assert.equal(rollDice(roll.formula,values,()=>3).total,10);
 sheet.rolls=[{...roll,id:'roll',name:'Ataque'}];const loaded=parseSheet(JSON.parse(JSON.stringify(sheet))),again=loaded.rolls[0],resolved=resolveRollVariables(loaded,compileDice(again.formula).variables,again.variables);assert.equal(rollDice(again.formula,resolved,()=>3).total,10);
});
