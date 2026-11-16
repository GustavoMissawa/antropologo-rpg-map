import {decorativeDieParts} from './sheet-die-paths.ts';
import { DEFAULT_DESKTOP_ARENA,placeDesktopDie,reserveDesktopPositions,type DesktopDiceArena,type DesktopDiePlacement } from './desktop-dice-placement.ts';
import { DEFAULT_MOBILE_ARENA,placeMobileDie,reserveMobilePositions,type MobileDiceArena,type MobileDiePlacement } from './mobile-dice-placement.ts';
export const DESKTOP_PILE_LIMIT=60,MOBILE_PILE_LIMIT=54,MAX_QUEUED_DICE=200;
export const PILE_EXIT_MS=650,IMPACT_EXIT_MS=1100;
export type MotionOptions={mobile:boolean;reduced:boolean;desktop?:DesktopDiceArena;mobileArena?:MobileDiceArena};
export type VisualDie={id:string;faces:number;slot:number;persistent:boolean;impactId?:string;exitKind?:'impact';desktop?:DesktopDiePlacement;mobile?:MobileDiePlacement;departure?:{from:string;lift:string;to:string}};
export type DiceScene={resting:VisualDie[];falling:VisualDie[];waiting:VisualDie[];departing:VisualDie[];nextSlot:number};
export type VisualRoll={id:string;groups:{notation:string;results:number[]}[]};
export const emptyDiceScene=():DiceScene=>({resting:[],falling:[],waiting:[],departing:[],nextSlot:0});
export const pileLimit=(mobile:boolean)=>mobile?MOBILE_PILE_LIMIT:DESKTOP_PILE_LIMIT;
const flightLimit=(mobile:boolean)=>mobile?10:18;
function aimAtPile(scene:DiceScene,options:MotionOptions):DiceScene{
 const claimed=new Set<string>();
 const falling=scene.falling.map(d=>{
  if(d.persistent||!scene.resting.length)return d;
  const target=scene.resting.find(old=>old.id===d.impactId&&!claimed.has(old.id))||scene.resting.find(old=>!claimed.has(old.id));
  if(!target)return d;claimed.add(target.id);
  return {...d,impactId:target.id,...(options.mobile?{mobile:target.mobile}:{desktop:target.desktop})};
 });return {...scene,falling};
}
function positionScene(scene:DiceScene,options:MotionOptions):DiceScene{
 if(options.mobile){const dice=reserveMobilePositions([...scene.resting,...scene.falling],options.mobileArena||DEFAULT_MOBILE_ARENA,scene.departing.filter(d=>d.exitKind!=='impact').flatMap(d=>d.mobile?[d.mobile]:[])),positions=new Map(dice.map(d=>[d.id,d]));return aimAtPile({...scene,resting:scene.resting.map(d=>positions.get(d.id)!),falling:scene.falling.map(d=>positions.get(d.id)!)},options);}
 const dice=reserveDesktopPositions([...scene.resting,...scene.falling],options.desktop||DEFAULT_DESKTOP_ARENA,scene.departing.flatMap(d=>d.desktop?[d.desktop]:[])),positions=new Map(dice.map(d=>[d.id,d]));
 return aimAtPile({...scene,resting:scene.resting.map(d=>positions.get(d.id)!),falling:scene.falling.map(d=>positions.get(d.id)!)},options);
}
function pump(scene:DiceScene,options:MotionOptions):DiceScene{
 const limit=pileLimit(options.mobile),resting=scene.resting.slice(0,limit),falling=scene.falling.map(d=>({...d})),waiting=scene.waiting.map(d=>({...d}));
 let count=resting.length;for(const die of falling){die.persistent=count<limit;if(die.persistent)count++;}
 if(options.reduced){const available=[...resting,...falling,...waiting].slice(-limit);return positionScene({...scene,departing:[],resting:available.map(d=>({...d,persistent:true})),falling:[],waiting:[]},options);}
 while(waiting.length&&falling.length<flightLimit(options.mobile)){const die=waiting.shift()!;die.persistent=count<limit;if(die.persistent)count++;falling.push(die);}
 return positionScene({...scene,resting,falling,waiting},options);
}
export type DiceSceneAction={type:'roll';roll:VisualRoll;options:MotionOptions}|{type:'land';id:string;options:MotionOptions}|{type:'configure';options:MotionOptions}|{type:'clear';reduced:boolean;departure?:Record<string,VisualDie['departure']>}|{type:'remove-departing';ids:string[]};
export function diceSceneReducer(scene:DiceScene,action:DiceSceneAction):DiceScene{
 if(action.type==='roll'){
  const seen=new Set([...scene.resting,...scene.falling,...scene.waiting,...scene.departing].map(d=>d.id)),incoming:VisualDie[]=[];let slot=scene.nextSlot;
  for(let g=0;g<action.roll.groups.length;g++){const group=action.roll.groups[g],faces=Number(group.notation.split('d')[1]);for(let i=0;i<group.results.length;i++){const id=action.roll.id+':'+g+':'+i;for(const [part,shape] of decorativeDieParts(faces).entries()){const visualId=faces===100?id+':percentile-'+part:id;if(!seen.has(visualId))incoming.push({id:visualId,faces:shape,slot:slot++,persistent:false});}}}
  if(!incoming.length)return scene;
  // A burst is bounded independently from the real history and random results.
  return pump({...scene,waiting:[...scene.waiting,...incoming].slice(-MAX_QUEUED_DICE),nextSlot:slot},action.options);
 }
 if(action.type==='land'){
  const die=scene.falling.find(d=>d.id===action.id);if(!die)return scene;
  const full=scene.resting.length>=pileLimit(action.options.mobile),target=full?(scene.resting.find(d=>d.id===die.impactId)||scene.resting[0]):undefined;
  const resting=[...scene.resting.filter(d=>d.id!==target?.id),{...die,persistent:true}];
  const departing=target&&action.options.mobile&&!action.options.reduced?[...scene.departing,{...target,exitKind:'impact' as const}].slice(-MOBILE_PILE_LIMIT-10):scene.departing;
  return pump({...scene,resting,departing,falling:scene.falling.filter(d=>d.id!==action.id)},action.options);
 }
 if(action.type==='configure')return pump(scene,action.options);
 if(action.type==='clear'){
  if(action.reduced)return emptyDiceScene();
  return {...emptyDiceScene(),departing:[...scene.departing,...scene.resting,...scene.falling].map(d=>({...d,departure:action.departure?.[d.id]||d.departure})).slice(-(DESKTOP_PILE_LIMIT+18))};
 }
 const ids=new Set(action.ids);return {...scene,departing:scene.departing.filter(d=>!ids.has(d.id))};
}
export function diceMotionStyle(die:VisualDie,mobile:boolean){
 let hash=2166136261;for(const c of die.id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const position=mobile?(die.mobile||placeMobileDie(die,DEFAULT_MOBILE_ARENA,[])):(die.desktop||placeDesktopDie(die,DEFAULT_DESKTOP_ARENA,[]));
 return {left:position.x/position.arenaWidth*100,bottom:position.arenaHeight-position.y-position.size/2,size:position.size,angle:(hash%121)-60,opacity:mobile?.28+(hash%4)*.035:.11+(hash%5)*.012,duration:mobile?620+hash%250:950+hash%400,delay:(hash%6)*28,drift:mobile?(hash%61)-30:Math.max(-7,Math.min(7,(hash%61)-30)),turn:(hash%2?1:-1)*(140+hash%180)};
}
