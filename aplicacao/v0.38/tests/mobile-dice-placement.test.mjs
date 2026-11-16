import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diceSceneReducer as reduce,emptyDiceScene} from '../lib/sheet-dice-motion.ts';
import {fitsMobileArena,mobilePlacementsTouch} from '../lib/mobile-dice-placement.ts';
const arena={width:375,height:101},options={mobile:true,reduced:false,mobileArena:arena},roll=(id,n=1)=>({id,groups:[{notation:n+'d20',results:Array(n).fill(1)}]});
function complete(s,opt=options){while(s.falling.length)s=reduce(s,{type:'land',id:s.falling[0].id,options:opt});return s;}
function distinct(dice,space){const ps=dice.map(d=>d.mobile);for(const p of ps)assert(fitsMobileArena(p,space));for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(!mobilePlacementsTouch(ps[i],ps[j]),'destinos '+i+' e '+j+' se sobrepõem');}
test('54 dados ocupam toda a faixa mobile em posições distintas, sem fileiras ou colunas fixas',()=>{
 for(let seed=0;seed<8;seed++){const s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('seed'+seed,54),options}));assert.equal(s.resting.length,54);distinct(s.resting,arena);const ps=s.resting.map(d=>d.mobile),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);assert(Math.max(...xs)-Math.min(...xs)>arena.width*.75);assert(Math.max(...ys)-Math.min(...ys)>arena.height*.6);assert(new Set(ys.map(y=>y.toFixed(2))).size>45);assert(new Set(xs.map(x=>x.toFixed(2))).size>45);}
});
test('Os alvos em queda são reservados e novos lançamentos não movem os dados já acumulados',()=>{
 let s=reduce(emptyDiceScene(),{type:'roll',roll:roll('first',10),options}),before=s.falling.map(d=>({...d.mobile}));s=reduce(s,{type:'roll',roll:roll('second',10),options});distinct(s.falling,arena);assert.deepEqual(s.falling.slice(0,10).map(d=>d.mobile),before);s=complete(s);const ids=new Map(s.resting.map(d=>[d.id,d.mobile]));s=complete(reduce(s,{type:'roll',roll:roll('third',34),options}));distinct(s.resting,arena);for(const d of s.resting)if(ids.has(d.id))assert.deepEqual(d.mobile,ids.get(d.id));
});
test('Pilha mobile cheia recebe impacto, substitui o atingido e conserva os 54 dados',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('full',54),options}));
 s=reduce(s,{type:'roll',roll:roll('extra',3),options});assert.equal(s.falling.length,3);
 const incoming=s.falling[0],target=s.resting.find(d=>d.id===incoming.impactId);assert(target);assert.deepEqual(incoming.mobile,target.mobile);
 s=reduce(s,{type:'land',id:incoming.id,options});assert.equal(s.resting.length,54);assert(s.departing.some(d=>d.id===target.id&&d.exitKind==='impact'));assert(!s.resting.some(d=>d.id===target.id));
 s=complete(s);assert.equal(s.resting.length,54);assert(s.departing.length>=3);distinct(s.resting,arena);
});
test('Limpar mantém a saída dos 54 dados e reserva seu espaço enquanto novos dados caem',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('old',54),options}));s=reduce(s,{type:'clear',reduced:false});assert.equal(s.departing.length,54);assert.equal(s.resting.length,0);s=reduce(s,{type:'roll',roll:roll('new',10),options});distinct([...s.departing,...s.falling],arena);s=reduce(s,{type:'remove-departing',ids:s.departing.map(d=>d.id)});s=complete(s);assert.equal(s.resting.length,10);assert.equal(s.departing.length,0);
});
test('Celular estreito, paisagem e teclado conservam 54 destinos dentro da faixa disponível',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('resize',54),options}));for(const space of [{width:305,height:74},{width:744,height:112},{width:375,height:40}]){const opt={...options,mobileArena:space};s=reduce(s,{type:'configure',options:opt});assert.equal(s.resting.length,54);distinct(s.resting,space);}
});
