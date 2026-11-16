import test from 'node:test';import assert from 'node:assert/strict';
import {decorativeDieSurface,decorativeDieParts} from '../lib/sheet-die-paths.ts';
import {diceSceneReducer as reduce,emptyDiceScene} from '../lib/sheet-dice-motion.ts';
const mobile={mobile:true,reduced:false},desktop={mobile:false,reduced:false};
const roll=(id,sides,n=1)=>({id,groups:[{notation:n+'d'+sides,results:Array(n).fill(1)}]});
function landed(s,options){while(s.falling.length)s=reduce(s,{type:'land',id:s.falling[0].id,options});return s;}
test('Superfícies são fechadas e formatos personalizados não se passam por d20',()=>{
 for(const faces of [4,6,8,10,12,20,3,7,30,1000])assert.match(decorativeDieSurface(faces),/^M.*Z$/);assert.notEqual(decorativeDieSurface(7),decorativeDieSurface(20));
});
test('Somente d100 decorativo vira um par de d10, preservando resultados e d20 reais',()=>{
 assert.deepEqual(decorativeDieParts(100),[10,10]);assert.deepEqual(decorativeDieParts(20),[20]);const entry=roll('percentile',100,2),before=JSON.stringify(entry),scene=reduce(emptyDiceScene(),{type:'roll',roll:entry,options:desktop});assert.equal(scene.falling.length,4);assert(scene.falling.every(d=>d.faces===10));assert.equal(new Set(scene.falling.map(d=>d.id)).size,4);assert.equal(JSON.stringify(entry),before);
});
test('Impacto mobile funciona com cada formato e a limpeza não ressuscita o atingido',()=>{
 for(const sides of [4,6,8,10,12,20,7]){let scene=landed(reduce(emptyDiceScene(),{type:'roll',roll:roll('initial',sides,54),options:mobile}),mobile);scene=reduce(scene,{type:'roll',roll:roll('hit',sides),options:mobile});const incoming=scene.falling[0],victim=incoming.impactId;scene=reduce(scene,{type:'land',id:incoming.id,options:mobile});assert(scene.departing.some(d=>d.id===victim&&d.exitKind==='impact'));scene=reduce(scene,{type:'remove-departing',ids:[victim]});assert.equal(scene.resting.length,54);assert(!scene.departing.length);assert(!scene.resting.some(d=>d.id===victim));}
});
test('Movimento reduzido não agenda quedas, impulsos ou animações de saída',()=>{
 let scene=reduce(emptyDiceScene(),{type:'roll',roll:roll('many',12,100),options:{...mobile,reduced:true}});assert.equal(scene.resting.length,54);assert.equal(scene.falling.length,0);assert.equal(scene.departing.length,0);scene=reduce(scene,{type:'clear',reduced:true});assert.deepEqual(scene,emptyDiceScene());
});
