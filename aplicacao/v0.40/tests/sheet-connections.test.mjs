import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,makeBlock,parseSheet,copyBlock,makeRulebook,withRulebookSheetTemplate,characterFromRulebook,serializeRulebook,parseRulebook} from '../lib/model.ts';
import {connectSheetBlocks,connectedBlockLayouts,refreshBlockConnections,pruneBlockConnections} from '../lib/sheet-connections.ts';
function fixture(){const s=makeSheet('Conexões','Guss');s.blocks=['A','B','C','Livre'].map(title=>({...makeBlock('custom'),title}));s.blocks[0].layout={x:100,y:100,width:400};s.blocks[1].layout={x:120,y:700,width:400};s.blocks[2].layout={x:650,y:720,width:300};s.blocks[3].layout={x:2000,y:1800,width:368};s.blocks[0].color='#7828c8';return s;}
test('Conexões verticais e laterais encostam as bordas, conservando offsets e conteúdo independente',()=>{
 let s=fixture();const [a,b,c,free]=s.blocks,before=JSON.stringify(s.blocks);s=connectSheetBlocks(s,a.id,b.id,{[a.id]:500,[b.id]:300});s=connectSheetBlocks(s,b.id,c.id,{[b.id]:300,[c.id]:250});
 assert.deepEqual(s.connections.map(e=>[e.side,e.offset]),[['below',20],['right',20]]);
 const view=connectedBlockLayouts(s.blocks,s.connections,{[a.id]:150.25,[b.id]:90.75,[c.id]:130});assert.equal(view[1].layout.y,view[0].layout.y+150.25);assert.equal(view[1].layout.x,view[0].layout.x+20);assert.equal(view[2].layout.x,view[1].layout.x+400);assert.equal(view[2].layout.y,view[1].layout.y+20);assert.equal(view[3],free);assert.equal(view[0].fields,a.fields);assert.equal(JSON.stringify(s.blocks),before);
 const taller=connectedBlockLayouts(s.blocks,s.connections,{[a.id]:300,[b.id]:200});assert.equal(taller[1].layout.y,taller[0].layout.y+300);assert.equal(taller[2].layout.y,taller[1].layout.y+20);
});
test('As quatro direções e ligações criadas na ordem inversa mantêm a relação escolhida',()=>{
 for(const side of ['above','below','left','right']){let s=fixture();s.blocks=s.blocks.slice(0,2);const [a,b]=s.blocks;a.layout={x:800,y:800,width:400};b.layout={x:800+(side==='left'?-600:side==='right'?600:0),y:800+(side==='above'?-600:side==='below'?600:0),width:400};s=connectSheetBlocks(s,a.id,b.id,{[a.id]:200,[b.id]:200});assert.equal(s.connections[0].side,side);const [av,bv]=connectedBlockLayouts(s.blocks,s.connections,{[a.id]:180,[b.id]:100});if(side==='above')assert.equal(bv.layout.y+100,av.layout.y);if(side==='below')assert.equal(av.layout.y+180,bv.layout.y);if(side==='left')assert.equal(bv.layout.x+400,av.layout.x);if(side==='right')assert.equal(av.layout.x+400,bv.layout.x);}
});
test('Conectar um bloco ao conjunto usa a borda próxima, sem sobrepor o bloco intermediário',()=>{
 let s=fixture();s.blocks=s.blocks.slice(0,3);for(const [i,b] of s.blocks.entries())b.layout={x:100+i*600,y:100,width:400};const [a,b,c]=s.blocks;s=connectSheetBlocks(s,a.id,b.id);s=connectSheetBlocks(s,a.id,c.id);assert.equal(s.connections[1].from,b.id);const view=connectedBlockLayouts(s.blocks,s.connections);assert.equal(view[1].layout.x,view[0].layout.x+400);assert.equal(view[2].layout.x,view[1].layout.x+400);assert.deepEqual(s.blocks.map(b=>b.layout.x),[100,700,1300]);
});
test('Mover um bloco redefine a relação; remover ou trocar de aba limpa apenas suas conexões',()=>{
 let s=fixture();const [a,b,c]=s.blocks;s=connectSheetBlocks(s,a.id,b.id);s=connectSheetBlocks(s,b.id,c.id);s.blocks=s.blocks.map(x=>x.id===a.id?{...x,layout:{x:650,y:700,width:400}}:x);s=refreshBlockConnections(s,a.id);assert.equal(s.connections[0].side,'left');
 const other={...s,blocks:s.blocks.map(x=>x.id===a.id?{...x,tabId:'other'}:x)};assert.equal(pruneBlockConnections(other).connections.length,1);const removed=pruneBlockConnections({...s,blocks:s.blocks.filter(x=>x.id!==b.id)});assert.equal(removed.connections,undefined);assert.equal(removed.blocks.length,3);
});
test('Salvar e carregar remapeia os IDs das conexões e mantém cores, valores, layout e independência do modelo',()=>{
 let s=fixture();s=connectSheetBlocks(s,s.blocks[0].id,s.blocks[1].id);s.blocks[0].fields=[{id:'f',label:'Força',type:'number',value:16}];const json=JSON.stringify(s),loaded=parseSheet(JSON.parse(json));assert.equal(loaded.version,13);assert.equal(loaded.connections[0].from,loaded.blocks[0].id);assert.equal(loaded.connections[0].to,loaded.blocks[1].id);assert.notEqual(loaded.connections[0].from,s.connections[0].from);assert.deepEqual(loaded.blocks.map(b=>b.layout),s.blocks.map(b=>b.layout));assert.equal(loaded.blocks[0].color,'#7828c8');assert.equal(loaded.blocks[0].fields[0].value,16);assert.equal(JSON.stringify(s),json);
 const book=withRulebookSheetTemplate(makeRulebook('Sistema conectado'),s),copy=parseRulebook(JSON.parse(serializeRulebook(book))),character=characterFromRulebook(copy,'Cópia');character.connections[0].offset=80;assert.equal(copy.sheetTemplate.connections[0].offset,20);const duplicated=copyBlock(loaded.blocks[0]);assert(!loaded.connections.some(c=>c.from===duplicated.id||c.to===duplicated.id));
});
test('Ligações inválidas, repetidas, ciclos e conexões entre abas são recusadas sem alterar a ficha',()=>{
 let s=fixture();s=connectSheetBlocks(s,s.blocks[0].id,s.blocks[1].id);const [a,b,c]=s.blocks;assert.throws(()=>connectSheetBlocks(s,b.id,a.id));assert.throws(()=>connectSheetBlocks(s,a.id,a.id));assert.throws(()=>connectSheetBlocks(s,a.id,'missing'));
 for(const connections of [null,{},[{...s.connections[0],to:'missing'}],[{...s.connections[0],offset:Infinity}],[{...s.connections[0],side:'diagonal'}],[s.connections[0],s.connections[0]],[s.connections[0],{from:b.id,to:c.id,side:'right',offset:0},{from:c.id,to:a.id,side:'above',offset:0}]])assert.throws(()=>parseSheet({...s,connections}));
 const raw={...s,blocks:s.blocks.map(x=>x.id===b.id?{...x,tabId:'other'}:x),tabs:[...s.tabs,{id:'other',title:'Outra'}]};assert.throws(()=>parseSheet(raw));assert.throws(()=>connectSheetBlocks(raw,a.id,b.id));assert.equal(s.connections.length,1);
});
test('Fichas v10 e anteriores continuam sem conexões e conservam o posicionamento existente',()=>{
 const s=fixture();const l=parseSheet({...s,version:10});assert.equal(l.connections,undefined);assert.deepEqual(l.blocks.map(b=>b.layout),s.blocks.map(b=>b.layout));assert.equal(connectedBlockLayouts(l.blocks),l.blocks);
});
