import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSheet, makeBlock, parseSheet, validRules } from '../lib/model.ts';
test('A ficha .ab10 preserva blocos, tipos, valores e ordem em um round-trip',()=>{
 const sheet=makeSheet('Astra','Guss');
 const block=makeBlock('custom');block.title='Atributos e história';block.description='Livre e modular';
 block.fields=[{id:'one',label:'Vigor',type:'number',value:-2.5},{id:'two',label:'Condição',type:'checkbox',value:true},{id:'three',label:'História',type:'longtext',value:'Linha 1\nLinha 2'},{id:'four',label:'Nome',type:'text',value:'Astra'}];
 sheet.blocks=[block,makeBlock('skills')];const loaded=parseSheet(JSON.parse(JSON.stringify(sheet)));
 assert.deepEqual(loaded.blocks.map(b=>b.title),sheet.blocks.map(b=>b.title));
 assert.deepEqual(loaded.blocks[0].fields.map(({label,type,value})=>({label,type,value})),block.fields.map(({label,type,value})=>({label,type,value})));
 assert.equal(loaded.blocks[0].description,block.description);assert.equal(loaded.updatedAt,sheet.updatedAt);
});
test('Arquivos inválidos, formatos futuros e campos incompatíveis são recusados',()=>{
 const sheet=makeSheet('Teste','');
 for(const value of [null,{}, {...sheet,version:14},{...sheet,blocks:Array(101).fill(makeBlock('custom'))},{...sheet,blocks:[{...makeBlock('custom'),fields:[{id:'x',label:'Número',type:'number',value:'texto'}]}]}]) assert.throws(()=>parseSheet(value));
});
test('A árvore de regras valida subseções e recusa IDs duplicados',()=>{
 const node={id:'one',title:'Capítulo',content:'Texto',status:'draft',children:[]};
 assert.equal(validRules([{...node,children:[{...node,id:'two'}]}]),true);
 assert.equal(validRules([{...node,children:[node]}]),false);
 assert.equal(validRules({}),false);
});
