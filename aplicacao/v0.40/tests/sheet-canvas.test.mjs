import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampMapZoom, dragMapBlock, sameBlockLayout, touchPair, zoomMapAt} from '../lib/sheet-map-gestures.ts';
import {recordSheetEdit, stepSheetEdit} from '../lib/sheet-edit-history.ts';
import {fitMapView} from '../lib/model.ts';

test('A pinça mantém o mesmo ponto do mapa sob o centro dos dedos, inclusive com translação',()=>{
  const start=touchPair({x:100,y:80},{x:140,y:80});
  const fingers=touchPair({x:80,y:95},{x:160,y:105});
  const initial={zoom:.75,left:300,top:210};
  const view=zoomMapAt(initial,initial.zoom*fingers.distance/start.distance,start.midpoint,fingers.midpoint);
  assert(Math.abs((view.left+fingers.midpoint.x)/view.zoom-(initial.left+start.midpoint.x)/initial.zoom)<1e-8);
  assert(Math.abs((view.top+fingers.midpoint.y)/view.zoom-(initial.top+start.midpoint.y)/initial.zoom)<1e-8);
  assert.equal(clampMapZoom(8),1.75);
  assert.equal(clampMapZoom(.001),.01);
  assert.deepEqual(zoomMapAt({zoom:1,left:0,top:0},.2,{x:200,y:200}),{zoom:.2,left:0,top:0});
});

test('Enquadramento do canvas mostra até os blocos nos limites do mapa em tela curta',()=>{
  const width=390,height=260,bounds={left:32,top:48,right:16960,bottom:17200};
  const view=fitMapView(bounds,width,height,.01);
  assert(view.zoom<.1);
  assert(bounds.right*view.zoom-view.left<=width);
  assert(bounds.bottom*view.zoom-view.top<=height);
});

test('Arraste mantém limites e encaixe e preserva a altura automática no ajuste horizontal',()=>{
  const base={x:48,y:48,width:360};
  assert.deepEqual(dragMapBlock(base,'move',{x:32,y:-72},'grid',174),{x:72,y:0,width:360});
  assert.deepEqual(dragMapBlock(base,'resize',{x:-300,y:0},'free',174),{x:48,y:48,width:300});
  assert.deepEqual(dragMapBlock(base,'resize',{x:8,y:98},'free',174),{x:48,y:48,width:368,height:272});
  const fixed={...base,height:216};
  assert.deepEqual(dragMapBlock(fixed,'resize',{x:1000,y:-700},'grid',174),{x:48,y:48,width:960,height:120});
  assert(sameBlockLayout(dragMapBlock(base,'move',{x:4,y:3},'grid',174),base));
  assert(!sameBlockLayout(base,{...base,height:174}));
});

test('Histórico reúne digitação, preserva dados imutáveis e descarta refazer ao começar outra edição',()=>{
  const base={blocks:[]};
  const renamed={...base,name:'A'};
  const finished={...renamed,name:'Astral'};
  let state=recordSheetEdit({past:[],future:[]},base,'name',100);
  state=recordSheetEdit(state,renamed,'name',300);
  assert.deepEqual(state.past,[base]);
  const undo=stepSheetEdit(state,finished,'undo');
  assert.equal(undo.value,base);
  const redo=stepSheetEdit(undo.history,base,'redo');
  assert.equal(redo.value,finished);
  assert.equal(redo.value.blocks,base.blocks);
  assert.equal(stepSheetEdit(recordSheetEdit(undo.history,base),renamed,'redo'),null);
});

test('Histórico mantém uma janela limitada de edições',()=>{
  let state={past:[],future:[]};
  for(let i=0;i<300;i++)state=recordSheetEdit(state,i);
  assert.deepEqual(state.past,Array.from({length:40},(_,i)=>i+260));
});
