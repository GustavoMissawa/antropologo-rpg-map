export type MobileDiceArena={width:number;height:number};
export type MobileDiePlacement={x:number;y:number;size:number;radius:number;arenaWidth:number;arenaHeight:number};
export const DEFAULT_MOBILE_ARENA:MobileDiceArena={width:375,height:104};
const hashOf=(id:string)=>{let n=2166136261;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export const mobilePlacementsTouch=(a:MobileDiePlacement,b:MobileDiePlacement)=>Math.hypot(a.x-b.x,a.y-b.y)<a.radius+b.radius-.001;
export function fitsMobileArena(p:MobileDiePlacement,a:MobileDiceArena){return p.x>=p.radius&&p.x<=a.width-p.radius&&p.y>=p.radius&&p.y<=a.height-p.radius;}
/** Seeded best-candidate sampling, with no rows or fixed columns. */
export function placeMobileDie(die:{id:string;slot:number},arena:MobileDiceArena,occupied:MobileDiePlacement[]):MobileDiePlacement{
 const width=Math.max(1,arena.width),height=Math.max(1,arena.height),hash=hashOf(die.id),base=Math.min(37,Math.sqrt(width*height/(54*1.9)),Math.min(width,height)*.7)*(.91+(hash%18)/100);
 let seed=hash||1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let fallback:MobileDiePlacement|null=null;
 for(const scale of [1,.88,.76,.64,.52,.4,.28,.16,.08,.04]){
  const size=base*scale,radius=size*.56;let best:MobileDiePlacement|null=null,clearance=-Infinity;
  for(let attempt=0;attempt<384;attempt++){
   const x=radius+random()*(width-radius*2),y=radius+random()*(height-radius*2),gap=occupied.length?Math.min(...occupied.map(p=>Math.hypot(x-p.x,y-p.y)-radius-p.radius)):1;
   if(gap>clearance){clearance=gap;best={x,y,size,radius,arenaWidth:width,arenaHeight:height};}
  }
  if(best&&clearance>=0)return best;fallback=best;
 }
 return fallback!;
}
/** Reserve falling destinations and preserve every valid settled position. */
export function reserveMobilePositions<T extends {id:string;slot:number;mobile?:MobileDiePlacement}>(dice:T[],arena:MobileDiceArena,departing:MobileDiePlacement[]=[]):T[]{
 const used=departing.filter(p=>fitsMobileArena(p,arena)),positions=new Map<string,MobileDiePlacement>(),reflow=dice.some(d=>d.mobile&&(d.mobile.arenaWidth!==arena.width||d.mobile.arenaHeight!==arena.height||!fitsMobileArena(d.mobile,arena)));
 for(const d of dice)if(!reflow&&d.mobile&&!used.some(p=>mobilePlacementsTouch(d.mobile!,p))){positions.set(d.id,d.mobile);used.push(d.mobile);}
 for(const d of [...dice].sort((a,b)=>a.slot-b.slot))if(!positions.has(d.id)){const p=placeMobileDie(d,arena,used);positions.set(d.id,p);used.push(p);}
 return dice.map(d=>({...d,mobile:positions.get(d.id)!}));
}
