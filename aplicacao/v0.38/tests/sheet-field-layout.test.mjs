import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,makeBlock,parseSheet,copyBlock,makeRulebook,withRulebookSheetTemplate,characterFromRulebook,serializeRulebook,parseRulebook} from '../lib/model.ts';
import {fieldRows,insertBlockField,moveBlockField,canAddBeside,fieldSpanOptions} from '../lib/sheet-field-layout.ts';
import {createFieldResolver} from '../lib/sheet-engine.ts';
const field=(id,value=10)=>({id,label:id,type:'number',value});
const labels=block=>fieldRows(block).map(row=>row.fields.map(f=>f.label));

test('Adicionar ao lado de um campo mantém todas as outras linhas verticais',()=>{
 const b=makeBlock('custom');b.fields=[field('A'),field('B'),field('C')];const before=JSON.stringify(b);
 const result=insertBlockField(b,field('X'),'B');assert.deepEqual(labels(result),[['A'],['B','X'],['C']]);
 assert.equal(result.layout.x,b.layout.x);assert.equal(result.layout.y,b.layout.y);assert(result.layout.width>=384);assert.equal(JSON.stringify(b),before);
 assert.deepEqual(labels(insertBlockField(result,field('D'))),[['A'],['B','X'],['C'],['D']]);
});
test('Inserir depois de Teste ou Teste 2 respeita o ponto escolhido e o limite existente de quatro campos',()=>{
 let b=makeBlock('custom');b=insertBlockField(b,field('Teste'));b=insertBlockField(b,field('Teste 2'),'Teste');b=insertBlockField(b,field('Entre'),'Teste');
 assert.deepEqual(labels(b),[['Teste','Entre','Teste 2']]);assert.equal(b.layout.width,576);
 b=insertBlockField(b,field('Último'),'Teste 2');assert.deepEqual(labels(b),[['Teste','Entre','Teste 2','Último']]);assert.equal(b.layout.width,768);
 assert.equal(canAddBeside(b,b.fields[0].id),false);assert.throws(()=>insertBlockField(b,field('Extra'),'Teste'),/quatro/);assert.throws(()=>insertBlockField(b,field('Extra'),'removido'),/removido/);
});
test('Grades v7 com linhas largas e espaços vazios conservam as outras linhas ao ganhar um vizinho',()=>{
 const b=makeBlock('attributes');b.columns=3;b.layout.width=600;b.fields=[field('A'),field('B'),field('C'),{...field('Largo'),columnSpan:3},field('Parcial')];
 assert.deepEqual(labels(b),[['A','B','C'],['Largo'],['Parcial']]);
 const r=insertBlockField(b,field('Ao lado'),'Largo'),rows=fieldRows(r);assert.deepEqual(labels(r),[['A','B','C'],['Largo','Ao lado'],['Parcial']]);
 assert.equal(rows[0].tracks,3);assert.equal(rows[2].tracks,3);assert.equal(rows[2].fields[0].columnSpan,1);assert.equal(rows[1].tracks,2);
});
test('Mover e remover campos conserva fronteiras, dados, detalhes e rolagens',()=>{
 let b=makeBlock('custom');b=insertBlockField(b,{...field('A'),details:'Detalhes',roll:{formula:'1d20 + @valor',variables:[]}});b=insertBlockField(b,field('B'),'A');b=insertBlockField(b,field('C'));
 const moved=moveBlockField(b,'B',1);assert.deepEqual(labels(moved),[['A','C'],['B']]);assert.equal(moved.fields[0].details,'Detalhes');assert.equal(moved.fields[0].roll.formula,'1d20 + @valor');assert.deepEqual(labels(b),[['A','B'],['C']]);
 const removed={...moved,fields:moved.fields.filter(f=>f.id!=='C')};assert.deepEqual(labels(insertBlockField(removed,field('D'),'A')),[['A','D'],['B']]);
 assert.equal(moveBlockField(b,'A',-1),b);assert.equal(fieldSpanOptions(b,'A'),3);
});
test('Salvar/carregar v8 e copiar modelo preserva linhas, cores, vínculos e personagens independentes',()=>{
 const s=makeSheet('Linhas',''),b=makeBlock('attributes');b.color='#8d66bb';
 let rows=insertBlockField(b,{...field('Destreza',16),type:'composite',composite:{mode:'ability',modifier:0}});
 rows=insertBlockField(rows,{id:'Furtividade',label:'Furtividade',type:'calculated',value:'',dependency:{sourceId:'Destreza',part:'modifier',offset:2}},'Destreza');rows=insertBlockField(rows,field('Vida',20));s.blocks=[rows];
 const loaded=parseSheet(JSON.parse(JSON.stringify(s)));assert.equal(loaded.version,13);assert.deepEqual(labels(loaded.blocks[0]),[['Destreza','Furtividade'],['Vida']]);assert.equal(createFieldResolver(loaded)(loaded.blocks[0].fields[1].id).value,5);
 const copy=copyBlock(loaded.blocks[0]);assert.deepEqual(labels(copy),labels(loaded.blocks[0]));assert.equal(copy.fields[1].dependency.sourceId,copy.fields[0].id);
 const book=withRulebookSheetTemplate(makeRulebook('Sistema'),s),restored=parseRulebook(JSON.parse(serializeRulebook(book))),character=characterFromRulebook(restored,'Astra');
 character.blocks[0]=insertBlockField(character.blocks[0],field('Novo'),character.blocks[0].fields.find(f=>f.label==='Vida').id);assert.deepEqual(labels(restored.sheetTemplate.blocks[0]),[['Destreza','Furtividade'],['Vida']]);assert.equal(character.blocks[0].color,'#8d66bb');
});
test('Metadados de linha inválidos são recusados sem alterar a ficha original',()=>{
 const s=makeSheet('Inválida','');s.blocks=[insertBlockField(makeBlock('custom'),field('A'))];const before=JSON.stringify(s);
 for(const value of [-1,200,.5,'0',null]){const input=structuredClone(s);input.blocks[0].fields[0].row=value;assert.throws(()=>parseSheet(input));}
 for(const value of [0,5,.5,'2',null]){const input=structuredClone(s);input.blocks[0].fields[0].rowSize=value;assert.throws(()=>parseSheet(input));}
 const crowded=structuredClone(s);crowded.blocks[0].fields=Array.from({length:5},(_,i)=>({...field('f'+i),row:0}));assert.throws(()=>parseSheet(crowded));assert.equal(JSON.stringify(s),before);
});
