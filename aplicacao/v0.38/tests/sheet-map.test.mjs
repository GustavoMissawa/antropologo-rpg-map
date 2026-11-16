import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSheet,makeBlock,parseSheet,layoutForIndex,limitLayout,mapBounds,fitMapView,MAP_LIMIT } from '../lib/model.ts';
test('Fichas novas têm uma aba ativa e blocos com posição e largura',()=>{
 const sheet=makeSheet('Astra','Guss');const block=makeBlock('attributes',sheet.activeTabId);assert.equal(sheet.version,13);assert.equal(sheet.tabs[0].title,'Principal');assert.equal(block.tabId,sheet.tabs[0].id);assert.deepEqual(block.layout,{x:48,y:48,width:368});
});
test('Exportar e carregar conserva abas, aba ativa, posições e larguras',()=>{
 const sheet=makeSheet('Astra','Guss');sheet.tabs.push({id:'combat',title:'Combate'});sheet.activeTabId='combat';const first=makeBlock('attributes','main'),second=makeBlock('resources','combat');first.layout={x:135,y:2700,width:421};second.layout={x:4500,y:44,width:700};second.fields=[{id:'hp',label:'Vida',type:'number',value:17}];sheet.blocks=[first,second];const loaded=parseSheet(JSON.parse(JSON.stringify(sheet)));
 assert.deepEqual(loaded.tabs.map(t=>t.title),['Principal','Combate']);assert.equal(loaded.activeTabId,loaded.tabs[1].id);assert.deepEqual(loaded.blocks.map(b=>b.layout),[first.layout,second.layout]);assert.equal(loaded.blocks[0].tabId,loaded.tabs[0].id);assert.equal(loaded.blocks[1].tabId,loaded.tabs[1].id);assert.equal(loaded.blocks[1].fields[0].value,17);assert.notEqual(loaded.blocks[0].id,first.id);
});
test('Fichas antigas v1 migram integralmente para uma aba e posições distintas',()=>{
 const base=makeSheet('Legado','');const blocks=Array.from({length:100},(_,i)=>({...makeBlock('custom'),title:'Bloco '+i,fields:[{id:'field',label:'Valor',type:'text',value:'Conteúdo '+i}]}));const legacy={...base,version:1,blocks};delete legacy.tabs;delete legacy.activeTabId;const loaded=parseSheet(legacy);assert.equal(loaded.version,13);assert.equal(loaded.blocks.length,100);assert.equal(new Set(loaded.blocks.map(b=>b.layout.x+':'+b.layout.y)).size,100);assert.equal(loaded.blocks[99].fields[0].value,'Conteúdo 99');assert(loaded.blocks.every(b=>b.tabId===loaded.tabs[0].id&&b.layout.x<=MAP_LIMIT&&b.layout.y<=MAP_LIMIT));
});
test('Dados de mapa corrompidos não passam pela importação',()=>{
 const base=makeSheet('Inválida','');base.blocks=[makeBlock('custom')];
 for(const layout of [{x:NaN,y:0,width:368},{x:0,y:Infinity,width:368},{x:-1,y:0,width:368},{x:MAP_LIMIT+1,y:0,width:368},{x:0,y:0,width:299},{x:0,y:0,width:961}])assert.throws(()=>parseSheet({...base,blocks:[{...base.blocks[0],layout}]}));
 for(const value of [{...base,tabs:[]},{...base,tabs:[...base.tabs,...base.tabs]},{...base,activeTabId:'missing'},{...base,blocks:[{...base.blocks[0],tabId:'missing'}]},{...base,tabs:[{id:'main',title:''}]}])assert.throws(()=>parseSheet(value));
});
test('Limites mantêm blocos no mapa e evitam larguras ilegíveis',()=>{
 assert.deepEqual(limitLayout({x:-20,y:MAP_LIMIT+30,width:20}),{x:0,y:MAP_LIMIT,width:300});assert.deepEqual(limitLayout({x:12.5,y:7.2,width:1500}),{x:13,y:7,width:960});assert.notDeepEqual(layoutForIndex(0),layoutForIndex(1));
});
test('Enquadramento inclui blocos afastados e considera suas alturas medidas',()=>{
 const blocks=[{id:'one',layout:{x:100,y:70,width:368}},{id:'two',layout:{x:2200,y:1800,width:600}}];const bounds=mapBounds(blocks,{one:400,two:700});assert.deepEqual(bounds,{left:100,top:70,right:2800,bottom:2500});const view=fitMapView(bounds,900,650);assert(view.zoom>=.1&&view.zoom<=1);assert(bounds.left*view.zoom-view.left>=0);assert(bounds.top*view.zoom-view.top>=0);assert(bounds.right*view.zoom-view.left<=900);assert(bounds.bottom*view.zoom-view.top<=650);
});
test('Carregar não altera o objeto original e isola campos e coordenadas',()=>{
 const sheet=makeSheet('Original','');sheet.blocks=[makeBlock('notes')];const original=JSON.stringify(sheet);const loaded=parseSheet(sheet);loaded.blocks[0].layout.x=500;loaded.blocks[0].fields[0].value='Alterado';loaded.tabs[0].title='Outra';assert.equal(JSON.stringify(sheet),original);
});
