import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DESKTOP_ARENA,placementsTouch,fitsDesktopArena,DESKTOP_DICE_VISUAL_SCALE} from '../lib/desktop-dice-placement.ts';
import {diceSceneReducer as reduce,emptyDiceScene,diceMotionStyle} from '../lib/sheet-dice-motion.ts';
const arena=DEFAULT_DESKTOP_ARENA,options={mobile:false,reduced:false,desktop:arena},roll=(id,n=1)=>({id,groups:[{notation:n+'d20',results:Array(n).fill(1)}]});
function complete(s,opt=options){while(s.falling.length)s=reduce(s,{type:'land',id:s.falling[0].id,options:opt});return s;}
function distinct(dice,space){const positions=dice.map(d=>d.desktop);for(const p of positions)assert(fitsDesktopArena(p,space));for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert(!placementsTouch(positions[i],positions[j]),'dados '+i+' e '+j+' ocupam a mesma região');}
test('Sessenta posições distintas preenchem as laterais da ficha, com alcance vertical e sem faixa no rodapé',()=>{
 for(let seed=0;seed<12;seed++){
  const s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('seed'+seed,60),options}));assert.equal(s.resting.length,60);distinct(s.resting,arena);
  const left=s.resting.filter(d=>d.desktop.x<arena.sheet.left),right=s.resting.filter(d=>d.desktop.x>arena.sheet.right);assert(left.length>20&&right.length>20);
  const ys=s.resting.map(d=>d.desktop.y);assert(Math.max(...ys)-Math.min(...ys)>arena.sheet.bottom*.5);assert(new Set(ys.map(Math.round)).size>45);
 }
});
test('A escala visual do desktop cresce 50% sem aumentar a área reservada nem mudar a distribuição',()=>{
 const s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('scale',60),options}));assert.equal(DESKTOP_DICE_VISUAL_SCALE,1.5);for(const die of s.resting){assert(Math.abs(die.desktop.size/(die.desktop.radius/.58)-1.5)<1e-10);assert.equal(diceMotionStyle(die,false).size,die.desktop.size);}distinct(s.resting,arena);
});
test('Destinos são reservados durante a queda e não são reutilizados por outra rolagem',()=>{
 let s=reduce(emptyDiceScene(),{type:'roll',roll:roll('one',12),options}),before=s.falling.map(d=>({...d.desktop}));distinct(s.falling,arena);
 s=reduce(s,{type:'roll',roll:roll('two',6),options});distinct(s.falling,arena);assert.deepEqual(s.falling.slice(0,12).map(d=>d.desktop),before);
 s=complete(s);const positions=s.resting.map(d=>({...d.desktop}));s=complete(reduce(s,{type:'roll',roll:roll('three',20),options}));distinct(s.resting,arena);assert.deepEqual(s.resting.slice(0,18).map(d=>d.desktop),positions);
});
test('Uma lateral maior recebe proporcionalmente mais dados sem cobrir a área central',()=>{
 const space={width:1600,height:1800,sheet:{left:180,right:1550,top:240,bottom:1600}},opt={...options,desktop:space};const s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('wide',60),options:opt}),opt);distinct(s.resting,space);assert(s.resting.filter(d=>d.desktop.x<180).length>s.resting.filter(d=>d.desktop.x>1550).length);
});
test('Expandir altura conserva posições; redimensionar mantém as laterais livres de colisões',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('size',60),options}));const original=s.resting.map(d=>({...d.desktop}));
 const larger={...arena,height:1900,sheet:{...arena.sheet,bottom:1800}},expanded={...options,desktop:larger};s=reduce(s,{type:'configure',options:expanded});distinct(s.resting,larger);for(let i=0;i<60;i++){assert.equal(s.resting[i].desktop.x,original[i].x);assert.equal(s.resting[i].desktop.y,original[i].y);}
 const narrow={width:711,height:1250,sheet:{left:29,right:682,top:200,bottom:1200}},opt={...options,desktop:narrow};s=reduce(s,{type:'configure',options:opt});assert.equal(s.resting.length,60);distinct(s.resting,narrow);
});
test('Após o limite, novos dados cobrem posições antigas e permanecem na pilha sem invadir o centro',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('full',60),options}));
 s=reduce(s,{type:'roll',roll:roll('extra',100),options});assert.equal(s.falling.length,18);
 while(s.falling.length){for(const d of s.falling){assert(fitsDesktopArena(d.desktop,arena));if(d.impactId)assert(s.resting.some(old=>old.id===d.impactId));}s=reduce(s,{type:'land',id:s.falling[0].id,options});}
 assert.equal(s.resting.length,60);assert(s.resting.some(d=>d.id.startsWith('extra:')));distinct(s.resting,arena);
});
test('Dados novos não reutilizam as posições dos que ainda estão saindo na limpeza',()=>{
 let s=complete(reduce(emptyDiceScene(),{type:'roll',roll:roll('old',30),options}));s=reduce(s,{type:'clear',reduced:false});s=reduce(s,{type:'roll',roll:roll('new',10),options});distinct([...s.departing,...s.falling],arena);s=reduce(s,{type:'remove-departing',ids:s.departing.map(d=>d.id)});s=complete(s);assert.equal(s.resting.length,10);
});
