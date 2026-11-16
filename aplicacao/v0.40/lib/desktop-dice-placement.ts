export type DesktopDiceArena={width:number;height:number;sheet:{left:number;right:number;top:number;bottom:number}};
export type DesktopDiePlacement={x:number;y:number;size:number;radius:number;arenaWidth:number;arenaHeight:number};
export const DEFAULT_DESKTOP_ARENA:DesktopDiceArena={width:1240,height:1350,sheet:{left:43,right:1197,top:240,bottom:1310}};
export const DESKTOP_DICE_SEPARATION=.74;
export const DESKTOP_DICE_VISUAL_SCALE=1.5;
const hashOf=(id:string)=>{let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;return hash;};
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export function sideRegions(arena:DesktopDiceArena){
 const top=clamp(arena.sheet.top,80,Math.max(80,arena.height-160)),bottom=clamp(arena.sheet.bottom,top+100,arena.height-8);
 return [{left:0,right:clamp(arena.sheet.left,0,arena.width),top,bottom},{left:clamp(arena.sheet.right,0,arena.width),right:arena.width,top,bottom}].filter(r=>r.right-r.left>=8);
}
export function placementsTouch(a:DesktopDiePlacement,b:DesktopDiePlacement){return Math.hypot(a.x-b.x,a.y-b.y)<(a.radius+b.radius)*DESKTOP_DICE_SEPARATION-.01;}
export function fitsDesktopArena(p:DesktopDiePlacement,arena:DesktopDiceArena){const footprint=p.radius/.58;return sideRegions(arena).some(r=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top+footprint*.3&&p.y<=r.bottom&&footprint<=Math.max(34,(r.right-r.left)*1.5));}
/** A lightweight gravity search. Each candidate rests above occupied nearby circles. */
export function placeDesktopDie(die:{id:string;slot:number},arena:DesktopDiceArena,occupied:DesktopDiePlacement[]):DesktopDiePlacement{
 const hash=hashOf(die.id),regions=sideRegions(arena),height=Math.max(100,regions[0]?.bottom-regions[0]?.top||100),area=regions.reduce((n,r)=>n+(r.right-r.left)*height,0);
 const base=Math.min(88,Math.max(26,Math.sqrt(area/(60*.64))))*(.88+(hash%17)/100),stack=[...occupied].sort((a,b)=>b.y-a.y);
 for(const scale of [1,.86,.72,.58,.44,.3,.2]){
  const targetSize=Math.max(10,base*scale);let best:{x:number;y:number;size:number;radius:number;score:number}|null=null;
  for(let side=0;side<regions.length;side++){
   const r=regions[side],size=Math.min(targetSize,Math.max(10,(r.right-r.left)*1.4)),radius=size*.58,pad=Math.min(size*.18,(r.right-r.left)*.3),minX=r.left+pad,maxX=r.right-pad;
   for(let attempt=0;attempt<34;attempt++){
    const fraction=((hash%997)/997+attempt*.618034+side*.371)%1,x=minX+(maxX-minX)*fraction;
    let y=r.bottom-size*.32-((hash+attempt*13)%11)/11*size*.06;
    for(const other of stack){const distance=(radius+other.radius)*DESKTOP_DICE_SEPARATION,dx=Math.abs(x-other.x);if(dx<distance){const rise=Math.sqrt(distance*distance-dx*dx);if(Math.abs(y-other.y)<rise)y=other.y-rise;}}
    if(y<r.top+size*.35)continue;
    const score=y+size*.32+((hash+attempt*19)%17)/17*size*.035;
    if(!best||score>best.score)best={x,y,size,radius,score};
   }
  }
  if(best)return {x:best.x,y:best.y,size:best.size*DESKTOP_DICE_VISUAL_SCALE,radius:best.radius,arenaWidth:arena.width,arenaHeight:arena.height};
 }
 // Extremely constrained layouts still get distinct, small positions, never a shared anchor.
 const r=regions[die.slot%Math.max(1,regions.length)]||{left:0,right:arena.width,top:80,bottom:arena.height-8},size=8;
 return {x:r.left+(r.right-r.left)*(.2+(die.slot%3)*.3),y:r.bottom-8-Math.floor(die.slot/2)*9,size:size*DESKTOP_DICE_VISUAL_SCALE,radius:size*.58,arenaWidth:arena.width,arenaHeight:arena.height};
}
/** Keep existing positions when valid; reserve in-flight targets as well as settled dice. */
export function reserveDesktopPositions<T extends {id:string;slot:number;desktop?:DesktopDiePlacement}>(dice:T[],arena:DesktopDiceArena,departing:DesktopDiePlacement[]=[]):T[]{
 const used=departing.filter(p=>fitsDesktopArena(p,arena)),positions=new Map<string,DesktopDiePlacement>(),reflow=dice.some(d=>d.desktop&&(d.desktop.arenaWidth!==arena.width||!fitsDesktopArena(d.desktop,arena)));
 for(const die of dice)if(!reflow&&die.desktop&&fitsDesktopArena(die.desktop,arena)&&!used.some(p=>placementsTouch(die.desktop!,p))){const p={...die.desktop,arenaWidth:arena.width,arenaHeight:arena.height};positions.set(die.id,p);used.push(p);}
 for(const die of [...dice].sort((a,b)=>a.slot-b.slot))if(!positions.has(die.id)){const p=placeDesktopDie(die,arena,used);positions.set(die.id,p);used.push(p);}
 return dice.map(die=>({...die,desktop:positions.get(die.id)!}));
}
