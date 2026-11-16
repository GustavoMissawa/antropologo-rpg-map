import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diceSceneReducer as reduce,emptyDiceScene,diceMotionStyle,pileLimit,MAX_QUEUED_DICE} from '../lib/sheet-dice-motion.ts';
const desktop={mobile:false,reduced:false},mobile={mobile:true,reduced:false},roll=(id,count=1,sides=20)=>({id,groups:[{notation:count+'d'+sides,results:Array(count).fill(1)}]});
function landAll(state,options){let n=0;while(state.falling.length){assert(++n<500);state=reduce(state,{type:'land',id:state.falling[0].id,options});}return state;}
test('Cada dado físico inicia uma queda correspondente; o histórico e seus valores não são alterados',()=>{
 const entry={id:'pool',groups:[{notation:'2d6',results:[2,4]},{notation:'1d12',results:[8]}]},before=JSON.stringify(entry);let s=reduce(emptyDiceScene(),{type:'roll',roll:entry,options:desktop});assert.equal(s.falling.length,3);assert.deepEqual(s.falling.map(d=>d.faces),[6,6,12]);assert.equal(s.resting.length,0);s=landAll(s,desktop);assert.equal(s.resting.length,3);assert.equal(JSON.stringify(entry),before);
});
test('Desktop acumula 60 e renova a pilha ao receber novos dados',()=>{
 let s=landAll(reduce(emptyDiceScene(),{type:'roll',roll:roll('initial',100),options:desktop}),desktop);assert.equal(s.resting.length,60);assert.equal(s.waiting.length,0);
 s=reduce(s,{type:'roll',roll:roll('after',3,10),options:desktop});assert.equal(s.falling.length,3);assert(s.falling.every(d=>!d.persistent));s=landAll(s,desktop);assert.equal(s.resting.length,60);assert.equal(new Set(s.resting.map(d=>d.id)).size,60);
});
test('Mobile limita o acúmulo a 54 e mantém quedas após o limite',()=>{
 let s=landAll(reduce(emptyDiceScene(),{type:'roll',roll:roll('initial',100),options:mobile}),mobile);assert.equal(s.resting.length,54);s=reduce(s,{type:'roll',roll:roll('after',2),options:mobile});assert.equal(s.falling.length,2);assert(s.falling.every(d=>!d.persistent));assert.equal(landAll(s,mobile).resting.length,54);
});
test('Rajadas respeitam limite simultâneo e fila finita sem bloquear a rolagem real',()=>{
 let s=emptyDiceScene();for(let i=0;i<10;i++)s=reduce(s,{type:'roll',roll:roll('burst'+i,100),options:desktop});assert(s.falling.length<=18);assert(s.waiting.length<=MAX_QUEUED_DICE);assert.equal(landAll(s,desktop).resting.length,60);
});
test('Limpeza anima os dados visíveis, cancela a fila e não restaura rolagens antigas',()=>{
 let s=reduce(emptyDiceScene(),{type:'roll',roll:roll('first',40),options:desktop});s=reduce(s,{type:'clear',reduced:false});assert.equal(s.falling.length,0);assert.equal(s.waiting.length,0);assert.equal(s.resting.length,0);assert(s.departing.length>0);
 const ids=s.departing.map(d=>d.id);s=reduce(s,{type:'roll',roll:roll('new',1),options:desktop});s=reduce(s,{type:'remove-departing',ids});s=landAll(s,desktop);assert.equal(s.resting.length,1);assert(s.resting[0].id.startsWith('new:'));assert.equal(s.departing.length,0);
});
test('Mudar entre desktop/mobile e reduzir movimentos conserva limites e remove animações pendentes',()=>{
 let s=landAll(reduce(emptyDiceScene(),{type:'roll',roll:roll('first',60),options:desktop}),desktop);s=reduce(s,{type:'configure',options:mobile});assert.equal(s.resting.length,pileLimit(true));
 s=reduce(s,{type:'roll',roll:roll('next',40),options:desktop});s=reduce(s,{type:'configure',options:{...mobile,reduced:true}});assert.equal(s.resting.length,54);assert.equal(s.falling.length,0);assert.equal(s.waiting.length,0);assert.deepEqual(reduce(s,{type:'clear',reduced:true}),emptyDiceScene());
});
test('A nova distribuição mobile preserva ângulos, opacidade e tempos das animações',()=>{
 const expected=[{angle:-9,opacity:.31500000000000006,duration:777,delay:84,drift:-28,turn:197},{angle:-12,opacity:.28,duration:670,delay:0,drift:-16,turn:-200},{angle:-11,opacity:.385,duration:789,delay:140,drift:-20,turn:199}];
 for(const [i,id] of ['mobile-a','mobile-b','mobile-c'].entries()){const {left,bottom,size,...motion}=diceMotionStyle({id,slot:7,faces:6,persistent:true},true);assert.deepEqual(motion,expected[i]);assert(left>0&&left<100&&bottom>=0&&size>0);}
});

test('Transições da cena não modificam estados anteriores, nem enquanto consomem a fila',()=>{
 const first=reduce(emptyDiceScene(),{type:'roll',roll:roll('queued',40),options:desktop}),before=JSON.stringify(first);reduce(first,{type:'land',id:first.falling[0].id,options:desktop});assert.equal(JSON.stringify(first),before);reduce(first,{type:'configure',options:mobile});assert.equal(JSON.stringify(first),before);
});
